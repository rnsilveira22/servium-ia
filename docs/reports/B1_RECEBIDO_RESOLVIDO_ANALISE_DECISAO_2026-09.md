# B-1 — Análise e Preparação de Decisão

> **Atividade read-only**: apenas investigação, análise, comparação, recomendação, impactos e preparação da decisão humana.
> **Nenhum arquivo foi alterado.** Nenhum commit criado. `HUMAN_DECISIONS_LOG.md`, código, migrations, testes, documentação canônica e estados do GitHub permanecem intactos.

## 1. Identificação

| Campo | Valor |
|---|---|
| Modelo | opencode/big-pickle (auditoria read-only) |
| Plataforma | OpenCode (CLI) |
| Data | 2026-09-12 |
| Branch | `chore/factory-v2-reconciliation-2026-09` (docs; base `origin/main`) |
| HEAD | `38a59f6` (worktree atual); código auditado em `origin/main` = `dfb75c0` |

---

## 2. Estado atual

### 2.1 Onde a resposta do cliente é recebida

A resposta é coletada por polling e correlacionada em `apps/api/src/runtime/recebimento.ts`:

- **Fonte Mailpit (dev/CI/E2E)**: `buscarMensagensDoMailpit` (`recebimento.ts:66-91`) lê o REST local de `$MAILPIT_API_URL`, filtra a caixa do agente e extrai o token de correlação do **corpo** da mensagem.
- **Fonte Gmail (piloto, não wireada)**: o adapter `GmailAdapter.receber` (`apps/api/src/email/gmail-adapter.ts:154-161`) existe e usa cabeçalho `X-Correlation-Token` (`gmail-adapter.ts:167`), gravando em `mensagens_gmail` com `ON CONFLICT DO NOTHING` (`gmail-adapter.ts:173-176`) **sem vincular ao item** (não preenche `item_ciclo_id`). Apenas o provider `mailpit` é registrado (`runtime/main.ts:16`, `runtime/worker-main.ts:12`).
- **Poller**: `RecebedorPeriodico.rodada()` (`recebimento.ts:253-261`) → `correlacionarRecebidas()` (`recebimento.ts:175-211`), que resolve o tenant do item (admin), abre conexão contextual por tenant e chama `vincularResposta`.

### 2.2 Onde o item passa para `recebido`

`vincularResposta` (`recebimento.ts:139-147`):

```sql
UPDATE itens_ciclo SET estado='recebido', atualizado_em=now()
WHERE id=$1 AND tenant_id=$2 AND estado='aguardando'
```

- Idempotência por `gmail_message_id` (`recebimento.ts:130-137`).
- Se o item **não estiver** `aguardando`, a resposta é ignorada sem efeito (`recebimento.ts:144-147`).
- Na mesma transação grava `mensagens_comunicacao` + `mensagens_gmail` + evento de auditoria `receber` (`recebimento.ts:149-165`).
- **Nenhuma transição subsequente é executada**: o item fica `recebido` e o motor para de considerá-lo.

### 2.3 Como o sistema atualmente decide uma pendência

Duas vias, ambas restritas:

1. **Decisão automática no motor** (`decidirAcao`, `apps/api/src/motor/engine.ts:68-87`) — atua apenas em `pendente`/`aguardando`, decide `cobrar`/`escalar`/`nada`. Para `recebido`, `excecao`, `resolvido`, `cancelado` retorna `nada` com motivo `estado terminal/parado` (`engine.ts:73-75`).
2. **Decisão humana em exceção** — `POST /ciclos/itens/:itemId/decidir` (`apps/api/src/cadastro/ciclos.controller.ts:180-193`) → `decidirItem` (`apps/api/src/cadastro/decidir-item.ts:16-45`), que executa:

```sql
UPDATE itens_ciclo SET estado=$2 WHERE id=$1 AND estado='excecao'   -- decidir-item.ts:25-26
```

Se o item não está `excecao`, retorna erro `item não está em exceção` (`decidir-item.ts:29`). O `reenviar` também exige `estado='excecao'` (`ciclos.controller.ts:203`).

### 2.4 Por que `decidir` trabalha com `excecao`

O desenho (SRV-17 / CA-03) concentrou a intervenção humana **no item escalado**: o motor escala (`aguardando → excecao`) quando esgota tentativas ou quebra regra, e o humano resolve/cancela/reenvia. A máquina de estados prevê `recebido → resolvido | excecao` (`engine.ts:25`), **mas nenhum código produz essas transições** — o único executor jurídico de `resolvido`/`cancelado` é o bloco `WHERE estado='excecao'`.

### 2.5 Como uma pendência chega ao estado final hoje

- `resolvido`/`cancelado`: **somente** via decisão humana em item `excecao`.
- Não existe nenhum caminho de `recebido` para `resolvido`/`excecao` no código (`grep` de `estado='recebido'` só encontra o `UPDATE ... SET estado='recebido'` em `recebimento.ts:140`).
- A transição legal `recebido → excecao` (`engine.ts:25`) não é executada por handler algum.

### 2.6 Como o ciclo é considerado encerrado

Dois mecanismos, ambos excluem `recebido` da contabilização:

- `tickCiclos` (`apps/api/src/motor/handlers.ts:257-274`): encerra quando não há item com estado `NOT IN ('resolvido','cancelado','excecao')`. **Item em `recebido` bloqueia o encerramento para sempre.**
- `encerrarCiclo` (`handlers.ts:278-301`): idem via `count(*) FILTER (WHERE estado NOT IN ('resolvido','cancelado','excecao'))` (`handlers.ts:283`).

> Detalhe: item em `excecao` **não** bloqueia o encerramento; item em `recebido` bloqueia. Ou seja, um `recebido` preso trava o ciclo sem que o humano sequer seja notificado via fluxo de exceção.

### 2.7 Como o motor determinístico participa

O motor é puro (`engine.ts`), com transições legais (`TRANSICOES`, `engine.ts:21-29`) e decisão por `decidirAcao`. As ações são executadas por handlers da fila (`handlers.ts`): `ciclo.ativar`, `item.cobrar`, `ciclo.tick`, `ciclo.encerrar`. Para `recebido`, o motor **decide `nada`** — participa apenas não agindo. `tickCiclos` varre somente `pendente`,`aguardando` (`handlers.ts:237`), então itens `recebido` nem são avaliados.

### 2.8 Evidências registradas em auditoria hoje

| Evento | Onde | Detalhes |
|---|---|---|
| `ativar` | `handlers.ts:86` / `ciclos.controller.ts:40-44` | operador |
| `cobrar` | `handlers.ts:223` | rodada |
| `receber` | `recebimento.ts:161-165` | rodada, token, message_id (actor `servico` quando `serviceId`) |
| `escalar` | `handlers.ts:160` | motivo |
| `decidir` | `decidir-item.ts:35-39` | desfecho (operador) |
| `reenviar` | `ciclos.controller.ts:221-225` | — |
| `cancelar` | `cancelar-ciclo.ts` | motivo |
| `encerrar` | `handlers.ts:268,295` | — |

**Não existe** evento `validar`/`classificar`/`resolver` automático — coerente com a ausência de caminho `recebido→resolvido`. Também não há persistência do corpo da resposta no banco (só `subject`/remetente em `mensagens_gmail`); o corpo é usado apenas transitoriamente para extrair o token.

### 2.9 Testes que cobrem o fluxo

| Teste | Cobre |
|---|---|
| `apps/api/test/correlacao.test.ts:90-124` | `aguardando → recebido` + registros + auditoria `receber` |
| `apps/api/test/correlacao.test.ts:126-148` | idempotência por message_id |
| `apps/api/test/motor-erro.test.ts:380-388` | token válido ⇒ `recebido` |
| `apps/api/test/atomicidade.test.ts:211-256` | rollback em `decidir` de item `excecao` |
| `apps/api/test/motor.test.ts` | decisões `cobrar`/`escalar`/`nada` |
| `apps/runtime-e2e/src/runtime-e2e.test.ts:96-151` | ciclo evolui sozinho até todos os itens `recebido` (**pára aí**; não há passo de encerramento) |

**Nenhum teste** cobre `recebido → resolvido`. A jornada E2E declara explicitamente o comportamento atual: "itens recebidos após respostas" (`runtime-e2e.test.ts:132-138`).

### 2.10 Onde o frontend depende do comportamento

- `apps/web/src/pages/CicloDetailPage.tsx:251` — exibe apenas o badge do `estado` do item; **não há ação para item `recebido`** (sem botão validar/decidir/reencaminhar).
- `apps/web/src/pages/ExcecoesPage.tsx:75,89` — só decide/reenvia itens de exceção.
- `apps/web/src/pages/CiclosPage.tsx` — agrega `resolvidos`/`excecoes`.
- Logo, um item `recebido` fica visível na UI mas não é acionável.

---

## 3. Gap identificado

**Transição `recebido → resolvido` (e `recebido → excecao`) declarada legal mas jamais executada.** A resposta do cliente chega a `recebido` e o sistema fica sem próximo passo:

- o motor retorna `nada` para `recebido` (`engine.ts:73-75`);
- `tickCiclos` não varre `recebido` (`handlers.ts:237`);
- `decidir` só aceita `excecao` (`decidir-item.ts:26`);
- o encerramento exige que não exista item `recebido` (`handlers.ts:261-267,283`).

Isso fere o fluxo canônico documentado:

- `docs/product/OPERATIONAL_FLOW.md:39-40` — `EmValidacao → Resolvido: documento válido` / `EmValidacao → Escalado: inválido ou dúvida`; e `:95` — "resultado de validação (critério + veredito)" deve ser evidenciado.
- `docs/product/MVP_01_VERTICAL_SLICE.md:29-30` — "recebimento/resposta (registro + verificação básica) → classificação básica no item correto".

---

## 4. Fluxo atual

### 4.1 Fluxo atual (comportamento real do código)

```text
Cliente responde com Identificador
      ↓
[correlação] mensagem tokenizada → aguardando → recebido   (recebimento.ts:139-147)
      ↓
motor: decidirAcao(recebido) → 'nada' / tick não varre recebido
      ↓
???  (sem handler, sem endpoint, sem UI para recebido)
      ↓
item preso em 'recebido' ⇒ ciclo aberto indefinidamente
      (encerrarCiclo exige zero itens fora de resolvido/cancelado/excecao)
```

**Ponto exato da quebra:** após `recebimento.ts:139-147`, não existe nenhum código que transicione o item a partir de `recebido`. Falha de fechamento do fluxo normal.

### 4.2 Fluxo esperado (sem assumir regra de negócio ainda)

```text
Cliente responde com Identificador
      ↓
[correlação] aguardando → recebido (registro + verificação básica)
      ↓
classificação do recebimento            ← etapa ausente hoje
      ├─ ✓ critérios do item/obrigação satisfeitos → resolvido
      └─ ✗ não satisfeitos / ambíguo     → excecao → humano decide
      ↓
todos os itens em resolvido/cancelado (ou excecao com decisão)
      ↓
ciclo encerrado
```

A definição explícita de **"critérios satisfeitos"** é exatamente o objeto da decisão humana desta análise (§5 desempenha as alternativas; §8 avalia a opção automática).

---

## 5. Alternativas

### Alternativa A — Validação humana do recebido (supervisão assistida)

**Descrição**

Uma resposta correlacionada marca o item `recebido` (como hoje) e **o sistema passa a exigir uma decisão humana explícita** para avançar. O responsável do escritório valida o recebimento e decide `resolvido` ou encaminha para tratamento (exceção). Implementação mínima: estender a decisão existente para aceitar `recebido` (ou criar `POST /ciclos/itens/:itemId/validar`).

**Exemplo de fluxo**

```text
resposta com token → aguardando → recebido  [motor: 'nada' — estado pausado]
      ↓
UI "Itens do ciclo": item recebido → botão "Validar e concluir" / "Encaminhar p/ análise"
      ↓
operador: resolver  → resolvido → ciclo pode encerrar
operador: encaminhar → excecao (nova exceções com tipo 'validacao_recebido') → decide/cancela/reenvia
```

**Regra de negócio**

Pendência é considerada **resolvida** quando o responsável humano do escritório registra o veredito de que a resposta atende ao item (`tipo_esperado` — `documento|informacao|assinatura`, `0002_business.sql:47-49`), frequentemente conferindo o conteúdo recebido.

**Responsabilidade**

Humana (com auxílio do motor apenas para não agir após `recebido`).

**Determinismo**

100% preservado (ADR-010 / `engine.ts:2`): o motor continua puro; nenhuma transição automática de `recebido`; toda mudança decorre de ação humana registrada.

**Auditoria**

- evento `decidir`/`validar` com `operador_id`, veredito, motivo (satisfaz "critério + veredito" de `OPERATIONAL_FLOW.md:95`);
- reutiliza `receber` já existente.

**Impacto backend**

- `decidir-item.ts:26` — ampliar `WHERE estado IN ('excecao','recebido')` (ou novo handler `validarRecebido`);
- `ciclos.controller.ts:180-193` — liberar o endpoint para itens `recebido` (papel `admin`);
- novo tipo de exceção quando o humano encaminha: `tipo='validacao_recebido'` (`excecoes.tipo` é livre — sem CHECK restritivo, ver `0002_business.sql:92-100`);
- sem mudança de schema.

**Impacto frontend**

- `CicloDetailPage.tsx` — ação "Validar" para itens `recebido` (apenas `admin`), com modal de confirmação ("ação sensível", padrão M1.8);
- `ExcecoesPage.tsx` — sem mudança (a exceção criada aparece no fluxo normal).

**Impacto testes**

- integration: `decidir` para item `recebido` (resolvido e encaminhar→excecao);
- atomicidade: concorrência de dois admins no mesmo item `recebido` (garantia do `WHERE estado` + `ROW_COUNT`);
- idempotência: decidir duplo sobre o mesmo item não pode re-aplicar;
- regressão dos testes de exceção existentes.

**Impacto E2E**

- `runtime-e2e.test.ts:96-151` — estender: após todos `recebido`, `POST /ciclos/itens/:id/decidir` → todos `resolvido` → `GET /ciclos/:id` → `estado=encerrado`;
- Selenium — jornada completa com clique em "Validar".

**Riscos**

- exige intervenção manual contínua (para piloto supervisionado é aceitável; para escala, torna-se gargalo);
- risco de **esquecimento**: item mantido em `recebido` sem decisão → mitigar com contador de "recebidos sem decisão" no dashboard (métrica básica, item P0-5 já planejado);
- se o volume de respostas for alto, o operador é o limite de throughput.

**Complexidade**

Baixa.

---

### Alternativa B — Resolução automática determinística (regra declarativa)

**Descrição**

Ao receber resposta correlacionada, o sistema avalia **critério determinístico declarado** e aplica a transição imediatamente na mesma transação:

```text
critério satisfeito ⇒ recebido → resolvido  (automático)
critério não satisfeito ⇒ recebido → excecao  (escalada p/ humano)
```

Para o MVP, o único critério verificável por máquina hoje é a **presença de resposta correlacionada válida** — não há upload/validação de conteúdo (tabela `documentos`, `0002_business.sql:101-111`, sem endpoint; upload declarado `POST_M1` em `M1_IMPLEMENTATION_PLAN.md`). A regra poderia ser: *resposta com token válido and atendendo `tipo_esperado` de forma verificável ⇒ resolvido; senão ⇒ excecao*.

**Exemplo de fluxo**

```text
resposta com token → aguardando → recebido (transação P0.1-E)
      → classificarRecebido(item, msg)  [função pura no motor]
           ├─ ok   → resolvido (mesma transação, auditoria 'resolver')
           └─ não  → excecao (motivo 'resposta_invalida'/'tipo_ausente')
      ↓ ciclo fecha automaticamente quando todos encerrados
```

**Regra de negócio**

Pendência considerada **resolvida** quando a resposta correlacionada satisfaz o critério declarado no item/obrigação. Critério daquilo que hoje é verificável: presença de resposta + token (e, quando futuro upload existir, validação de arquivo). Qualquer outra situação gera exceção.

**Responsabilidade**

Automática para o caminho válido; humana apenas quando escalada.

**Determinismo**

Total: a classificação é função pura da entrada (regras, sem LLM) — aplicável dentro do `engine.ts` ou próximo dele.

**Auditoria**

- evento `resolver` (actor `servico` quando `serviceId`) com `criterio` e `veredito`;
- mantém `receber` existente; escala com `escalar`/exceção quando inválido.

**Impacto backend**

- nova função pura `classificarRecebido(item, msg): {veredito, motivo}` no motor;
- aplicação da transição após `vincularResposta` (`recebimento.ts:167`), no mesmo `COMMIT`, ou job dedicado `item.classificar`;
- quando veredito `excecao`: `UPDATE estado='excecao'` + `INSERT excecoes` + audit `escalar`.

**Impacto frontend**

Nenhuma ação obrigatória para o fluxo normal; item já aparece `resolvido`. Exceções aparecem no fluxo padrão. Opcional: botão "reabrir" (fora do escopo).

**Impacto testes**

- unit: `classificarRecebido` por `tipo_esperado`/critério (incl. formato inválido, token ausente);
- integration: `aguardando → recebido → resolvido` atômico; e `→ excecao` quando critério falha;
- idempotência: segunda resposta após `resolvido` ignorada sem efeito (já garantido por `WHERE estado='aguardando'`, `recebimento.ts:141`);
- E2E runtime: ciclo encerra sozinho.

**Impacto E2E**

Jornada completa automática: resposta → ciclo `encerrado` sem intervenção; Selenium apenas verifica estados e não precisa de clique novo (ou usa o fluxo de exceção quando inválido).

**Riscos**

- **falso positivo**: com critério "resposta presente", uma resposta insatisfatória pode virar `resolvido` sem conferência de conteúdo — o veredito é registrado com base em critério fraco; a auditoria documenta, mas não corrige o engano;
- divergência futura: quando upload/validação real existir (DE-02), a regra muda e casos hoje "resolvidos por presença" deixariam de sê-lo (mudança de comportamento — precisa re-decisão);
- risco de o escritório perder a "sensação de controle" na verificação de documentos críticos.

**Complexidade**

Baixa (regra mínima) — o risco não está na complexidade, e sim na **validade da regra** (decisão de produto).

---

### Alternativa C — Híbrida por `tipo_esperado` com modo configurável

**Descrição**

Combina A e B semânticamente por tipo de item. Para `informacao`/`assinatura` (critério objetivo = resposta presente) aplica-se resolução automática; para `documento` (exige evidência/anexo, hoje sem upload) aplica-se validação humana. O modo fica **configurável por template** (`modo_validacao: 'auto'|'humano'`), com padrão derivado do `tipo_esperado`.

**Exemplo de fluxo**

```text
resposta com token → aguardando → recebido
   → modo do item (template)
        ├─ auto    → critério → resolver / excecao
        └─ humano  → permanece recebido → operador valida e decide
```

**Regra de negócio**

Resolução automática quando o modo do item é `auto` **e** o critério é atendido; validação humana quando modo `humano` (default para `documento`); exceção em qualquer caso duvidoso.

**Responsabilidade**

Híbrida — automática nos itens de critério objetivo; humana nos itens que exigem evidência.

**Determinismo**

Sim, por configuração estática (sem LLM); a decisão independe de conteúdo livre.

**Auditoria**

`resolver` (auto, com critério+veredito+modo) ou `decidir`/`validar` (humano), ambos com `modo` registrado.

**Impacto backend**

- coluna `modo_validacao` em `itens_template` ou `checklist_templates` (migration — **exige atividade separada**);
- função de classificação + endpoint de validação para o modo humano;
- validação do modo no `cadastro.controller.ts`.

**Impacto frontend**

Ação "Validar" aparece **condicionalmente** para itens `recebido` cujo template está em modo `humano`; badges mostram o modo.

**Impacto testes**

Cada modo (auto/humano), combinação por `tipo_esperado`, transição de modo, E2E de ambos os caminhos.

**Impacto E2E**

Dois cenários principais: item `informacao` → ciclo fecha automaticamente; item `documento` → operador valida manualmente.

**Riscos**

- maior superfície conceitual e de teste (2 modos × 3 tipos);
- decisão de default por tipo é embutida na configuração (pode tensionar ordens futuras);
- mais estado explícito (configuração) para o operador entender.

**Complexidade**

Média.

---

## 6. Comparativo

| Critério | A (humana) | B (automática) | C (híbrida) |
|---|---|---|---|
| Simplicidade p/ MVP | Alta | Alta | Média |
| Determinismo (ADR-010) | Total | Total | Total |
| Segurança (evita falso "resolvido") | Alta | **Baixa com critério fraco** | Média (depende do modo) |
| Auditabilidade | Alta (veredito humano) | Alta (veredito registrado) | Alta |
| Previsibilidade operacional | Depende do operador | Alta (sistema fecha) | Média |
| Experiência do escritório | Requer intervenção por item | Mínima intervenção | Intervenção só p/ `documento` |
| Facilidade de teste | Alta | Alta | Média |
| Evolução futura (upload/validação) | Migra p/ B/C naturalmente | Mudança de regra precisa re-decisão | Já modulariza por tipo |
| Aderência à arquitetura atual | Alta (reuso do decidir) | Alta (função pura no motor) | Média (migration + configuração) |
| Sem LLM no caminho crítico | ✅ | ✅ | ✅ |
| Risco de falso positivo | Baixo | **Alto no MVP** (sem validação de conteúdo) | Médio |
| Esforço estimado | Baixo | Baixo | Médio |

---

## 7. Recomendação

**Eu recomendo a Alternativa A (validação humana do recebido) para o MVP-01**, porque:

1. **É a única que não inventa validação**: não existe hoje verificador de conteúdo (upload/`documentos` sem endpoint; conteúdo de resposta não persiste). Marcar `resolvido` automaticamente seria afirmar um veredito sem evidência, contrariando "resultado de validação (critério + veredito)" (`OPERATIONAL_FLOW.md:95`) e a regra de *Explicit Failure*.
2. **Menor mudança e menor risco**: estender `decidir-item.ts:26` para aceitar `recebido` + uma ação de UI e testes. Nada de migration, nada de novo estado, nada de nova máquina.
3. **Alinha com o piloto "operação assistida"**: o piloto é explicitamente supervisionado por humano; a validação por item é o custo correto para um helper small de escritório.
4. **É a base evolutiva das demais**: quando o upload/validação real (DE-02) existir, a transição passa a ser classificável por função pura (caminho B) ou por modo por tipo (caminho C), sem reescrita — a decisão humana continua sendo a exceção garantida.

**Ressalva honesta**: se o Owner valorizar menos trabalho manual e aceitar o critério "resposta correlacionada = atendimento presumido" (com veredito fraco registrado), a Alternativa B é viável e operacionalmente mais fluida; o veredito fica documentado, mas o risco de falso `resolvido` é real no MVP. **Esta é uma decisão de domínio — a recomendação técnica não a substitui.**

---

## 8. Avaliação da opção automática

**Proposta avaliada:** *"Uma resposta válida e corretamente correlacionada do cliente pode fazer com que a pendência seja automaticamente considerada resolvida, desde que os critérios determinísticos da obrigação/checklist estejam satisfeitos."*

### Vantagens

- Alinha com `MVP_01_VERTICAL_SLICE.md:30` ("classificação básica") e `OPERATIONAL_FLOW.md:39` ("EmValidacao → Resolvido: documento válido");
- ciclo fecha sem intervenção (criterio 1 do GO/NO-GO desbloqueia mais rápido);
- menos trabalho manual por item; throughput independe do operador;
- mantém ADR-010 (regras puras).

### Riscos

- **falso positivo**: no MVP não há verificação de conteúdo — "válida" se reduz a "tem token correto". Respostas indesejadas/poluição seriam marcadas `resolvido`;
- **odes de re-abrir**: sem caminho de "reabrir resolvido", um engano de regra exigiria implementação extra;
- **mudança de regra no futuro** (upload): re-decisão de produto necessária.

### Casos em que não seria suficiente

- resposta vazia ou apenas "ok" sem o documento para item `tipo_esperado='documento'`;
- resposta fora de contexto (não atende o item solicitado);
- resposta com anexo (o anexo não é passível de validação sem upload em escopo);
- múltiplas respostas ao mesmo item (a segunda é ignorada hoje — `recebimento.ts:144-147`).

### Necessidade de exceção

Sim — item em `recebido` cujo critério falhe precisa ir a `excecao` com motivo explícito (tipo `resposta_invalida`), e o ser humano decide (mantendo o gate de intervenção).

### Necessidade de revisão humana

Depende da regra adotada: critério mínimo "presença de resposta" dispensa revisão automática mas **carrega o risco de falso `resolvido`**; critério com validação de conteúdo **exigiria** infraestrutura fora do MVP. A revisão humana continua sendo a salvaguarda do caminho de exceção.

### Impacto na auditoria

Aproveita o padrão existente: `receber` (origem/conteúdo) + novo `resolver` (`actor_type='servico'`, veredito + critério + `row_id`). Evidência clara e reconstrutível, desde que persistido o veredito e o critério aplicado.

### Impacto no motor

`engine.ts` ganha função pura de classificação e a transição `recebido → resolvido|excecao` passa a ser exercida por handler — a máquina de estados já a declara (`engine.ts:25`); o motor permanece sem IO e determinístico.

### Impacto no ciclo

Ciclo encerra automaticamente ao não restar item fora de `resolvido/cancelado/excecao` — comportamento já implementado em `handlers.ts:257-301`, hoje inalcançado por causa do `recebido` preso.

### Veredito técnico da avaliação

**Tecnicamente factível e determinístico**, mas no estado atual do MVP o único critério verificável é a presença de resposta correlacionada — o que **não valida o atendimento do item**. Seguro apenas se o Owner aceitar explicitamente "resposta presente = pendência atendida" como regra do piloto (com auditoria do critério fraco). Caso contrário, aplicar a **Alternativa A** (validação humana), evoluindo para a automática quando existir validação de conteúdo.

---

## 9. Tratamento de exceções

Comportamento-alvo (independente da alternativa escolhida):

```text
RESPOSTA RECEBIDA
       │
       ├── (A/humano) operador valida e marcata resolvido
       │      → RESOLVIDO → ciclo pode encerrar
       │
       ├── (B ou C) critérios satisfeitos
       │      → RESOLVIDO → ciclo pode encerrar
       │
       └── critérios não satisfeitos / ambíguo / humano opta por análise
              → EXCEÇÃO (tipo 'validacao_recebido'/'resposta_invalida')
              → revisão/decisão humana (decidir/cancelar/reenviar) — fluxo atual mantido
```

**Diferenças em relação ao código atual:**

1. Hoje não há nenhum caminho que crie exceção a partir de `recebido` (a escalada automática ocorre só de `aguardando` via `tentativas_max`, `handlers.ts:141-166`). É preciso: `UPDATE itens_ciclo SET estado='excecao'` + `INSERT excecoes(...)` para o caso "recebido → análise", com auditoria `escalar`/`validar`.
2. O `decidir` atual aceita apenas `estado='excecao'` para concluir (`decidir-item.ts:26`). Na Alternativa A ele passa a aceitar também `estado='recebido'` (ou ganha um endpoint `validar` dedicado).
3. `excecoes.tipo` é campo livre (sem CHECK) — novos tipos `validacao_recebido`/`resposta_invalida` não exigem migration (ver `0002_business.sql:92-100`).
4. A conclusão/prescrição de comportamento não muda: resolver/cancelar permanecem decisões humanas; o motor nunca autoconclui um item que foi escalado.

---

## 10. Impactos no MVP-01

| Item do GO/NO-GO | Efeito após B-1 (Alternativa A) | Status declarado |
|---|---|---|
| **B-1 (P0-1)** | Resolvido — há caminho `recebido → resolvido` e `recebido → excecao` | **desbloqueado** (após implementação + testes) |
| Criterio 1 — jornada end-to-end demonstrável | Ciclo passa a encerrar no fluxo normal | **desbloqueado** |
| Fechamento do ciclo (`handlers.ts:257-301`) | Torna-se alcançável | **desbloqueado** |
| Testes E2E (`runtime-e2e.test.ts`) | Ganha passo de decisão + encerramento | **desbloqueado** |
| P0-5 — métricas mínimas | Habilita M-01/M-12 (tempo de resolução, pendências por cliente) pois passa a existir evento `resolver`/`decidir` de `recebido` | **desbloqueado parcialmente** (agregação ainda não implementada) |
| UX (M1.5/M1.6) | `CicloDetailPage` ganha ação para `recebido`; badges de estado | **desbloqueado** |
| Gmail (P0-2) | **Não depende** — ver §11 | sem efeito |
| Auditoria | Passa a registrar veredito humano (`decidir`) para recebidos; base para "resultado de validação" | **desbloqueado** |
| Operação assistida | Operador passa a ter ponto de intervenção explícito em `recebido` | **desbloqueado** |

> Regra de honestidade: B-1 desbloqueia itens, mas **não conclui** nada por si só — cada item requer sua própria implementação/teste/validação. Nenhum item foi marcado concluído por inferência.

---

## 11. Dependência com Gmail

| Fronteira | O que é | Dependência de B-1? |
|---|---|---|
| **Independente de Gmail (100% testável com Mailpit)** | regra de classificação/validação de `recebido`, extensão do `decidir`, UI, testes de estado e E2E | **Não depende** — B-1 opera sobre o item já correlacionado, qualquer que seja a fonte (`recebimento.ts` recebe `MensagemRecebida` genérica) |
| **Depende da integração Gmail** | próprio recebimento via Gmail (provider registrado, `gmail-adapter.ts:154-176` wireado ao poller e à correlação) e persistência de conteúdo | Fica a cargo do P0-2 (separado); B-1 não atrasa nem é atrasado |
| **Validável com Mailpit** | todo o comportamento de B-1: resposta → recebido → decidir/validar → resolvido → ciclo encerrado; idempotência; auditoria | **Sim — complete** |

Observação de acoplamento futuro: se o canal Gmail passar a publicar token por cabeçalho `X-Correlation-Token` (`gmail-adapter.ts:167`) em vez do token no corpo, a classificação de B-1 precisa aceitar ambos os formatos (função `extrairToken/parseToken`, `recebimento.ts:25-33` — hoje só corpo). Recomenda-se critério de aceite cobrindo a fonte do token.

---

## 12. Critérios de aceite propostos

Para a **Alternativa A** (recomendada). Formato pronto para Senior/Pleno/QA implementar.

```text
AC-B1-01 (happy path):
  Dado um item em 'aguardando' com resposta correlacionada válida (Mailpit ou
  FakeChannel), quando o POST /ciclos/itens/:itemId/decidir for chamado com
  desfecho='resolvido' por admin, então o item transiciona para 'resolvido'
  e o evento de auditoria 'decidir' é gravado com o operador autenticado.

AC-B1-02 (decisão em item recebido):
  O endpoint /ciclos/itens/{id}/decidir aceita item com estado='recebido'
  (além de 'excecao'), sem quebra de regressão do fluxo de exceção.
  Estado inválido (ex.: 'aguardando') continua rejeitado com 400.

AC-B1-03 (resposta inválida):
  (a) sem token ⇒ ignorada (semToken conta em RecebimentoResultado, sem efeito);
  (b) com token mas item não está 'aguardando' ⇒ ignorada sem mudança de estado.

AC-B1-04 (exceção a partir de recebido):
  Admin opta por encaminhar ⇒ item recebido→excecao + excecoes( tipo
  'validacao_recebido', motivo explícito ) + auditoria 'escalar'/'validar'.
  Decidir exceção existente continua funcionando (resolver/cancelar/reenviar).

AC-B1-05 (auditoria):
  Toda decisão sobre item 'recebido' gera evento 'decidir' com detalhes
  {desfecho} e actor = operador; a cadeia item-ciclo é reconstrutível via
  eventos receber → decidir.

AC-B1-06 (idempotência):
  Segunda chamada ao decidir sobre o mesmo item já em 'resolvido'/
  'cancelado' retorna erro (sem re-aplicar) e não gera segundo evento.

AC-B1-07 (correlação):
  Funções extrairToken/parseToken continuam cobrindo o formato t:<item>:r<n>;
  aceitam token oriundo de corpo (Mailpit) e (caso B-1 toque o fonte Gmail)
  oriundo de cabeçalho X-Correlation-Token.

AC-B1-08 (fechamento do ciclo):
  Com todos os itens do ciclo em 'resolvido'/'cancelado' (ou 'excecao' com
  decisão registrada) após as decisões, o ciclo transiciona para 'encerrado'
  e gera auditoria 'encerrar'.

AC-B1-09 (regressão):
  Todos os testes de motor/exceções/auditoria existentes permanecem verdes
  (tick, escalada por limite, decidir de excecao, rollback atômico).

AC-B1-10 (E2E runtime):
  runtime-e2e: POST /ciclos → cobranças → respostas → itens recebidos →
  decidir todos resolvido → GET /ciclos/{id} retorna estado=encerrado.

AC-B1-11 (E2E UI):
  Selenium: no CicloDetailPage um item 'recebido' exibe ação "Validar"/
  "Resolver" (apenas admin); clicar gera confirmação; após decidir o badge
  muda para resolvido/cancelado e a listagem de ciclos reflete resolvidos.

AC-B1-12 (segurança de acesso):
  Decidir/validar item de outro tenant retorna 403/404 (RLS e escopo por
  tenant preservados) — sem bypass de isolation.
```

---

## 13. HUMAN_DECISION_REQUIRED

```text
HUMAN_DECISION_REQUIRED

ID: HG-B1-2026-09 (sugestão — aguarda registro oficial em HUMAN_DECISIONS_LOG.md, que NÃO foi alterado)

Tema:
MVP-01 — B-1 — Fluxo recebido → resolvido

Decisão necessária:
Qual regra rege a transição de um item 'recebido' para 'resolvido' no piloto?
(A) a resposta correlacionada é validada por um humano do escritório (validação assistida);
(B) a resposta correlacionada é considerada automaticamente resolvida (critério: presença de resposta/token), com exceção quando critério não satisfeito;
(C) híbrida por tipo de item (automática para 'informacao'/'assinatura'; humana para 'documento').

Contexto:
O motor envia cobranças com Identificador; resposta com token marca o item
'recebido' (recebimento.ts:139-147) e o fluxo para — não há handler, endpoint
ou UI capaz de levar 'recebido' a 'resolvido' ou 'excecao' (decidir exige
'estado=excecao', decidir-item.ts:26). O ciclo fica aberto indefinidamente.
Não existe hoje validação de conteúdo (upload/DE-02 é POST_M1) — o único
critério verificável por máquina é a presença de resposta correlacionada.

Alternativas:
A. Validação/Decisão humana do recebido (estender decidir/validar p/ estado 'recebido' + ação de UI).
B. Resolução automática determinística (regra declarativa: resposta presente ⇒ resolvido; senão ⇒ excecao).
C. Híbrida por tipo_esperado com modo configurável por template (migration + estado de configuração).

Recomendação técnica:
A — menor risco, sem falso 'resolvido', sem migration, base evolutiva p/ B/C quando existir validação de conteúdo (DE-02). B é aceitável se o Owner aceitar explicitamente o critério fraco e sua auditoria.

Impacto:
Código: extensão do decidir (+UI, +testes) [A] vs. função de classificação no motor [B/C].
MVP-01: desbloqueia jornada completa, fechamento do ciclo, métricas de resolução e E2E.
Risco de falso 'resolvido': baixo (A/C-modo humano), alto (B no MVP sem validação de conteúdo).

Risco de não decidir:
Item permanece 'recebido' para sempre; ciclo nunca encerra no fluxo normal;
MVP-01 permanece NO-GO; as 4 métricas de resolução ficam sem fonte.

Decisor:
Rodrigo / Product Owner

Status:
AWAITING_DECISION
```

---

## 14. Conclusão

- O culpado do B-1 é **uma transição declarada mas não implementada** (`engine.ts:25` ↔ ausência de handler/endpoint para ela) — não é problema de arquitetura nem de banco.
- A correção mínima é trivial (Alternativa A: permitir decidir em `recebido` + ação de UI + testes), e o impacto de cada alternativa foi mapeado de forma fática (arquivos/linhas).
- A **decisão de negócio** (validação humana vs automática vs híbrida) permanece **exclusivamente humana**; este documento apenas prepara a informação.
- Nenhum item do MVP foi declarado concluído por inferência; B-1 apenas desbloqueia dependências.

### Finalização

- **Modelo utilizado:** opencode/big-pickle
- **Plataforma:** OpenCode (CLI)
- **HEAD analisado:** `38a59f6` (worktree), código em `origin/main` = `dfb75c0`
- **Nenhum arquivo foi alterado**
- **Nenhum commit foi criado**
- **Nenhuma decisão humana foi registrada**

---

## 15. Arquivos analisados

| Arquivo | Trecho-chave |
|---|---|
| `apps/api/src/motor/engine.ts` | `TRANSICOES` 21-29; `decidirAcao` 68-87; `chaveCobranca` 90-92 |
| `apps/api/src/motor/handlers.ts` | `tickCiclos` 232-275 (encerra 261-267); `encerrarCiclo` 278-301; `cobrarItem` 101-229 |
| `apps/api/src/runtime/recebimento.ts` | `buscarMensagensDoMailpit` 66-91; `vincularResposta` 121-173 (139-147); `correlacionarRecebidas` 175-211; `RecebedorPeriodico` 227-278 |
| `apps/api/src/runtime/main.ts` / `worker-main.ts` | registro do provider `mailpit` apenas (16 / 12) |
| `apps/api/src/email/gmail-adapter.ts` | `receber` 154-177; cabeçalho `X-Correlation-Token` 167; `ON CONFLICT DO NOTHING` 176 |
| `apps/api/src/cadastro/decidir-item.ts` | `decidirItem` 16-45 (`WHERE estado='excecao'` 26) |
| `apps/api/src/cadastro/ciclos.controller.ts` | `decidir` 180-193; `reenviar` 196-238 (exige excecao 203); `cancelar` 160-177 |
| `apps/api/src/cadastro/cadastro.controller.ts` | `TIPOS` 16; validações de template 140, 168-179 |
| `packages/db/migrations/0002_business.sql` | `itens_template` 42-50; `itens_ciclo` estado CHECK 65-70; `mensagens_comunicacao` 74-90; `documentos` 101-111; `excecoes` 92-100; `eventos_auditoria` 113-121; `jobs_fila` 123-140 |
| `docs/product/OPERATIONAL_FLOW.md` | fluxograma 18-27; máquina de estados 31-45; definições 53-65; retries/cancelamento/intervenção/evidências 67-99 |
| `docs/product/MVP_01_VERTICAL_SLICE.md` | fluxo 24-35; entradas/saídas 40-51; exceções 53-56; intervenção humana 57-64 |
| `docs/reports/M1_IMPLEMENTATION_PLAN.md` | núcleo M1 30-111; interpretação dos estados 196-201, 250-252, 256; `POST_M1` 72-80, 387-393 (DE-02 upload fora) |
| `apps/api/test/correlacao.test.ts` | 90-124; 126-148; 150-154; 184-207 |
| `apps/api/test/motor-erro.test.ts` | 265-287 (escalada); 380-388 (recebido) |
| `apps/api/test/atomicidade.test.ts` | 211-256 (decidir atômico/rollback) |
| `apps/runtime-e2e/src/runtime-e2e.test.ts` | 96-151 (ciclo até `recebido`; sem encerramento) |
| `apps/web/src/pages/CicloDetailPage.tsx` | `ESTADO_LABEL` 82-88; badge ítem 251; ações de exceção 283-350 |
| `apps/web/src/pages/ExcecoesPage.tsx` | decidir 75-76; reenviar 89-90 |
