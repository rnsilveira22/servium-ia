# Fase 2 — Proposta de Blueprint UX/UI (L3 · para decisão de Rodrigo)

**Produto:** ServiumAI · **Fase:** 2 — Blueprint (Especificação Oficial do MVP v1.0 §28)
**Base:** `docs/reports/UI_EXPERIENCE_PHASE1_AUDIT.md` + `docs/reports/UI_EXPERIENCE_PHASE2_PROPOSAL.md` + `MVP_EXPERIENCE_SPEC_v1.md`
**Tipo de documento:** **PROPOSTA (L3)** — a decisão permanece com **Rodrigo**. Nada aqui é implementação.
**Status:** aguarda **Fase 3** (aprovação humana) — nenhuma implementação visual significativa antes disso (§28 da spec).

---

## 0. Resumo executivo

O MVP atual é **funcional, testado e estável** (UI_GATE `UI_PILOT_READY`, E2E verde — Fase 1 §1), mas sua **experiência** está ~10–30% da Especificação MVP v1.0: marca não aplicada (`#2563eb` diverge da teal/navy oficial), zero gráficos/timeline/estados de agente/cartões de decisão, acessibilidade crítica e menu mobile inoperante.

Este Blueprint propõe elevar a experiência de "funcional" para "**ambiente onde uma Funcionária Digital trabalha de forma visível, supervisionável e auditável**" (§2 da spec), **sem tocar em regras de domínio** — reutilizando dados que **já existem** na API (ciclos, itens, comunicações, exceções, auditoria) e marcando como **premissa a validar** tudo o que exige novo endpoint.

A estrutura do documento:

1. **Arquitetura de informação e navegação** — hierarquia de telas, menu, rotas.
2. **Digital Employee visível** — painel de status do agente, estados vivos, timeline, cartões de decisão.
3. **Indicadores e gráficos** — fonte de dado real apontada (arquivo:linha) para cada métrica; **fonte pendente** quando não existir.
4. **Mapa de conhecimento/contexto** e camadas de explicação.
5. **Padrão visual** — marca, tokens, acessibilidade, componentes, responsividade.
6. **Faseamento** em milestones alinhados às ondas E-01..E-08, com dependências e gates humanos.
7. **Riscos / complexidade / priorização** para o piloto.

---

## 1. Arquitetura de informação e navegação

### 1.1 Princípio

Nada de hierarquia profunda. Uma **experiência plana e orientada ao trabalho do usuário**, como prescrito na spec §18 ("evitar complexidade desnecessária"). O usuário (operador/admin da Innove) precisa responder rapidamente: *o que está acontecendo, o que ela fez, o que precisa de mim*.

### 1.2 Estrutura de telas (mapa navegável)

```
App
├── /login                                    (pública · marca, foco único)
└── AppShell autenticado (Layout)
    ├── /                        Dashboard operacional          ← TELA CENTRAL
    ├── /clientes                Clientes
    ├── /obrigacoes              Obrigações
    ├── /ciclos                  Ciclos
    ├── /ciclos/:id              Detalhe do ciclo
    ├── /pendencias/*            Pendências (novo agregador)     ← NOVA
    ├── /excecoes                Exceções / Aprovações           ← refatorado em cartões
    ├── /agente                  Atividades da Estagiária        ← NOVO (Agent Experience)
    └── /auditoria               Auditoria (trilha de eventos)   ← corrigido
```

### 1.3 Menu (nav principal — atualizado de `apps/web/src/layout/Layout.tsx:4-11`)

| Ordem | Item | Rota | Justificativa (§18) |
|---|---|---|---|
| 1 | Dashboard | `/` | Percepção central do trabalho do agente (§5) |
| 2 | Clientes | `/clientes` | Base cadastral |
| 3 | Obrigações | `/obrigacoes` | Obrigações/limites de autonomia (FR-003) |
| 4 | Ciclos | `/ciclos` | Trabalho por ciclo |
| 5 | Pendências | `/pendencias/*` | Novo agregador de pendências por cliente/obrigação |
| 6 | Exceções | `/excecoes` | Fila de decisão humana (cartões) |
| 7 | Atividades do agente | `/agente` | Timeline + mapa de contexto (§12) |
| 8 | Auditoria | `/auditoria` | Rastreabilidade (§17) |

> **Nota de nomenclatura:** corrigir labels sem acento ("Obrigacoes", "Excecoes" — Fase 1 §5) para a grafia pt-BR correta.

### 1.4 Topbar global (novo componente de AppShell)

Hoje cada página tem o próprio `<h1>` (`Layout.tsx:45-46` não há header global). O Blueprint propõe um **Topbar** fixo no AppShell com:

- **Badge de identidade do agente** (persistente, colapsável em mobile) — vínculo direto com o §2.
- Título da rota atual + breadcrumb simples (`Ciclos › Ciclo X`).
- Menu mobile (hambúrguer que de fato abre/fecha a sidebar — corrige o gap da Fase 1 §7).

### 1.5 Hierarquia de leitura dentro de cada tela

`Topbar (agente + rota) → Header da página (título + ações primárias) → Indicadores (cards) → Conteúdo principal (tabelas/cartões/timeline) → Sidebar contextual`.

---

## 2. Digital Employee visível (Agent Experience)

### 2.1 Identidade persistente do agente

Componente reutilizável **`AgentStatusBar`** (presente no Topbar de todas as telas autenticadas):

- **Identidade:** avatar (marca) + "Estagiária Digital" + rótulo "Assistente de Pendências Documentais" (§5.1).
- **Estado vivo** com **comportamento visual próprio** (§10) — mapeamento abaixo.
- **Atividade atual** em linguagem operacional (ex.: "Analisando pendências dos clientes…").

### 2.2 Estados vivos do agente → fonte de dado

A spec §10 lista estados (*Trabalhando, Analisando, Processando, Aguardando resposta, Aguardando aprovação, Atenção necessária, Concluído, Erro, Operação normal*). **Nem todos derivam de dados hoje existentes** — proponho um mapeamento honesto:

| Estado proposto (spec §10) | Derivável de dado real hoje? | Fonte / premissa |
|---|---|---|
| ● Trabalhando normalmente | ✅ | `GET /auditoria` com eventos **recentes** (`acaos` do motor) — se houver atividade na janela |
| ● Processando / Analisando | ⚠️ **premissa** | não há estado de "em execução agora"; derivável de `jobs_fila` `estado='processando'` (novo endpoint) |
| ● Aguardando resposta de clientes | ✅ | `itens_ciclo.estado='aguardando'` (via `GET /ciclos/:id`) |
| ● Aguardando aprovação | ✅ | `excecoes.desfecho IS NULL` (via `GET /ciclos/:id/excecoes`) |
| ● Atenção necessária | ✅ | agregado de exceções abertas |
| ● Erro | ⚠️ **premissa** | derivável de `jobs_fila` `estado='falha'` (novo endpoint) |
| ● Concluído / Operação normal | ✅ | `ciclos.estado='encerrado'` + taxa de resolução |
| ● Parado (fora de horário) | ⚠️ **premissa** | derivável de `LimitesConfig.horario_inicio/fim` (`motor/engine.ts:42-47`) |

> **Regra de ouro:** o estado do agente nunca é "inventado"; quando a fonte não existir, o item fica **explicitamente marcado como premissa** (§8) — mesmo que visualmente previsto, será exibido apenas com fonte confirmada (ou com label neutro "verificando…").

### 2.3 Timeline de atividades

Componente **`AgentActivityTimeline`** (`/agente` e variante compacta no Dashboard, §9 da spec):

- Cada entrada: `horário ✓/→ ICONE · ação em pt-BR · entidade relacionada (cliente/obrigação/item)`.
- Exemplo conforme spec §9: `09:42 ✓ Documento recebido · 09:41 ✓ Cliente identificado · 09:41 ✓ Documento associado à obrigação · 09:40 ✓ Pendência atualizada · 09:38 → Nova resposta recebida`.
- **Fonte de dado:** `GET /auditoria` já implementado (`apps/api/src/auditoria/auditoria.controller.ts:22-41`; `packages/db/src/audit.ts:54-100`) — traz `{ eventos[], tem_mais }` com `criado_em`, `acao`, `entidade`, `entidade_id`, `detalhes`. O Blueprint propõe um **"humanizer"** que traduz as 17 ações do inventário `docs/audit/EVENTOS_AUDITORIA.md:92-112` em frases legíveis (ex.: `cobrar` → "Cobrança enviada (rodada N)").
- **Nota de ator:** hoje quase tudo é `actor_type='sistema'`; o `actor_type='servico'` (Funcionário Digital explícito) é **premissa** (PRM-P0.3-C, `EVENTOS_AUDITORIA.md:86`). A timeline funciona com `sistema`, mas a rotulagem "Estagiária Digital" fica mais fiel quando `servico` existir.

### 2.4 Cartões de decisão (exceções / aprovações)

Refatorar a linha de exceção (`CicloDetailPage.tsx:236-294` e `ExcecoesPage.tsx:98-152`) para o **formato de cartão** descrito na spec §13: **situação · evidências · recomendação · consequência · ação disponível ao humano** (`Aprovar / Ver detalhes / Não realizar`).

| Campo do cartão | Fonte de dado real |
|---|---|
| Situação (resumo do motivo) | `excecoes.motivo` / `excecoes.tipo` (`GET :id/excecoes`) |
| Cliente / Obligação / Item | `cliente_nome`, `item_descricao` (já no DTO `Excecao`) |
| Evidências (documento, período, tentativas, histórico) | `excecoes.contexto` (jsonb) + `tentativas` + `mensagens_comunicacao` |
| Recomendação | **premissa** — sugestão textual do agente (derivável de `excecoes.tipo/contexto`, mas exige campo/motivo orientado a decisão; validar com Rodrigo) |
| Ação disponível | `decidir` (`resolvido`/`cancelado`) + `reenviar` (`apps/api/src/cadastro/ciclos.controller.ts:159-215`) |
| Consequência | **premissa** — texto explicativo; hoje não há campo, a UI deve explicitar (ex.: "cancelar encerra o item do ciclo") |

---

## 3. Indicadores e gráficos para o piloto (fonte de dado real)

### 3.1 Princípio (§8)

Gráficos e métricas **orientados à decisão**, simples, legíveis, responsivos — **sem preencher espaço**. Toda métrica aponta a fonte real; sem fonte, fica como **premissa pendente**.

### 3.2 Indicadores (cards) — mapear fonte real

| Indicador | Fórmula / origem | Fonte de dado hoje | Status |
|---|---|---|---|
| Clientes acompanhados | `count(clientes)` | `GET /clientes` (`cadastro.controller.ts:64-70`) | ✅ |
| Obrigações ativas | `count(obrigacoes)` | `GET /obrigacoes` (`cadastro.controller.ts:96-102`) | ✅ |
| Ciclos ativos | `count(ciclos.estado='aberto')` | `GET /ciclos` (`ciclos.controller.ts:47-64`) | ✅ |
| Itens pendentes | `sum(itens pendentes)` sobre ciclos | `GET /ciclos` (coluna `itens`/`resolvidos`) | ✅ |
| Pendências resolvidas | `sum(resolvidos)` | `GET /ciclos` | ✅ |
| Exceções abertas (aguardando humano) | `count(excecoes.desfecho IS NULL)` | **novo endpoint global** (hoje via N+1, Fase 1 §8) | ⚠️ **premissa** (PRM-M-17) |
| Cobranças realizadas | `count(mensagens_comunicacao.direcao='envio')` | **novo endpoint** (tabela existe, sem rota) | ⚠️ **premissa** |
| Documentos recebidos / processados | `count(documentos)` / `count(itens='recebido')` | **novo endpoint** (tabela `documentos` existe `0002_business.sql:93-105`) | ⚠️ **premissa** |
| Taxa de resolução de ciclo | `resolvidos / itens` | `GET /ciclos` | ✅ |

> O Dashboard atual (`DashboardPage.tsx:28-31`) já computa `ciclos ativos / itens pendentes / concluídos / exceções` a partir de `GET /ciclos`. O Blueprint **expande** esses cards e classifica o que depende de rota nova.

### 3.3 Barras de progresso (§7)

| Barra | Cálculo | Fonte |
|---|---|---|
| Progresso do ciclo mensal | `resolvidos / itens` por ciclo ("Ciclo mensal — 37 de 45 clientes processados, 82%") | `GET /ciclos` ✅ |
| Resolução de pendências | `resolvidos / total de itens` agregado | `GET /ciclos` ✅ |
| Avanço global do piloto | `ciclos encerrados / ciclos ativados` | `GET /ciclos` ✅ |

### 3.4 Gráficos (§8) — com fonte e status

| Gráfico | Fonte de dado real | Status |
|---|---|---|
| Evolução das pendências (abertas × resolvidas ao longo do tempo) | série temporal de `itens_ciclo.atualizado_em` / `eventos_auditoria` (`criado_em`) | ⚠️ **premissa** (requer agregador temporal novo ou leitura da trilha de auditoria como série) |
| Evolução dos documentos recebidos | `documentos.criado_em` (tabela existe) | ⚠️ **premissa** (requer endpoint de contagem por período) |
| Volume de atividades (cobranças × respostas) | `mensagens_comunicacao` por `direcao` + período | ⚠️ **premissa** |
| Clientes processados (por ciclo) | `GET /ciclos` (clientes com ciclo) | ✅ |
| Taxa de resolução por ciclo | `resolvidos/itens` por ciclo | ✅ (barras/gráfico de barras) |
| Evolução do ciclo (aberto → encerrado) | `ciclos.estado/criado_em/encerrado_em` | ✅ |

> **Decisão honesta de escopo:** para o **piloto**, priorizo os gráficos **derivados de dados que já existem** (`GET /ciclos`): progresso de ciclo, taxa de resolução, ciclos por cliente e volume de atividades por ciclo. Os gráficos **temporais** (evolução ao longo do tempo) dependem de **novo backend de série/agregação** — listados como premissa e podem ser **pós-piloto**.

---

## 4. Mapa de conhecimento / contexto e camadas de explicação

### 4.1 Mapa de contexto (spec §14)

Componente **`KnowledgeContextMap`**, que apresenta visualmente **como uma decisão foi fundamentada** — seguindo a estrutura da spec §14:

```
ESTAGIÁRIA DIGITAL
   └─ CLIENTE ‖ OBRIGAÇÃO
        │   "segunda solicitação enviada há 3 dias sem resposta"
        ├─ regras aplicadas → (ex.: "limite de tentativas sociais atingido")
        ├─ conclusão        → (ex.: "escalar para humano")
        └─ ação sugerida    → (ex.: Aprovar / Ver detalhes / Não realizar)
```

**Fonte de dado real:**

- `excecoes.contexto` (jsonb) — já existe e hoje **não é renderizado** (`CicloDetailPage.tsx:25`, Fase 1 §8).
- `excecoes.tipo`, `excecoes.motivo`, `itens_ciclo.tentativas`.
- `mensagens_comunicacao` para o histórico de comunicação (evidência).

### 4.2 Camadas de explicação (spec §15)

Três níveis navegáveis (resultado → evidências → regras/contexto), **sem expor cadeia de pensamento privada**:

| Nível | Conteúdo | Fonte real |
|---|---|---|
| **N1 · Resultado** | "Pendência identificada / Exceção escalada" | `excecoes.tipo` / `motivo` ✅ |
| **N2 · Evidências** | documento não localizado, obrigação, período, histórico, prazo | `excecoes.contexto` + `mensagens_comunicacao` + `itens_ciclo` ✅ |
| **N3 · Regras/contexto** | regra aplicada, condição, resultado | `excecoes.contexto`; regras do motor documentadas em `apps/api/src/motor/engine.ts:68-87` ✅ |

---

## 5. Padrão visual, tema, acessibilidade, componentes e responsividade

### 5.1 Marca e tokens (resolve Fase 1 §5)

Aplicar os **tokens oficiais já definidos** (`apps/web/src/styles/brand-tokens.css:1-8`) em toda a UI, eliminando a divergência `#2563eb` (`App.css:3`):

| Token | Valor |
|---|---|
| `--servium-navy` | `#12304a` |
| `--servium-teal` | `#0f8b83` |
| `--servium-mint` | `#38b7a5` |
| `--servium-ink-muted` | `#557080` |
| `--servium-surface` | `#f4f8f8` |
| `--servium-white` | `#ffffff` |

**Extensões de design system (proposta, à confirmar por Rodrigo):**

- **Escala de tons** derivada dos tokens (10 passos de primária/neutra) para atender contraste WCAG.
- **Tipografia:** fonte de marca (ex.: Inter / fonte da diretriz da marca) — ainda **premissa** (não há fonte especificada hoje; `App.css:27-28` usa stack de sistema).
- **Elevação/sombras** em cards (Fase 1 §4 — hoje sem sombra).
- **Dark mode:** manter **fora do escopo do MVP** (recomendação; decisão final de Rodrigo — pergunta aberta da Fase 2 proposta §4).

### 5.2 Biblioteca de componentes (resolve Fase 1 §4 / ADR-003:13)

Criar `apps/web/src/components` com módulo base reutilizável, eliminando a duplicação atual:

- `Button`, `Input/Field` (com `label htmlFor`/`id`), `Table`, `Badge/StatusBadge`, `Card`, `Modal` (foco trap + `role="dialog"` + ESC), `Skeleton`, `Toast`.
- **Stack de gráficos:** decisão **L3/ADR** (pergunta aberta Fase 2 §4). Recomendo **componentes próprios leves + lib simples** (ex.: shadcn-ui-style + Recharts) — **a decidir por Rodrigo antes do milestone de gráficos**.
- Ícones e motion: biblioteca leve ou SVG próprio; manter hand-rolled onde viável (performance §22).

### 5.3 Acessibilidade (resolve Fase 1 §6 — crítico)

Transversal a todo o Blueprint (spec §21):

- `aria-*`/`role`/`tabIndex` em toda a UI (hoje zero — `Fase 1 §6`).
- `<label htmlFor>` + `<input id>` em todos os formulários.
- Modais com foco trap, `aria-modal`, ESC.
- `:focus-visible` consistente (hoje só inputs).
- **`prefers-reduced-motion`** para o motion design (§5.4) e redução de animações.
- Contraste adequado WCAG (AA) usando a escala de tons.
- **Nunca só visual:** informação também por texto/ícone/label/estado (spec §21).

### 5.4 Motion design (spec §11)

Animação **comunica informação, não decora**; suave, rápida, com propósito, respeitando `prefers-reduced-motion`, sem distração nem impacto de performance:

| Situação | Animação proposta |
|---|---|
| Agente trabalhando | movimento contínuo sutil (pulso/brilho no avatar/estado) |
| Processamento | micro-spinner/ondulação local |
| Documento recebido | entrada visual discreta |
| Pendência resolvida | transição de card→concluído |
| Nova exceção / atenção | destaque controlado (não alarmista) |
| Aprovação humana | mudança clara de estado |
| Conclusão | feedback positivo discreto |
| Timeline nova atividade | transição suave de inserção |

### 5.5 Responsividade (resolve Fase 1 §7 — menu mobile inoperante)

- **Fixar o toggle mobile:** o CSS `.sidebar.open` existe (`App.css:608-610`) mas nenhum JS aplica — o Blueprint exige o estado controlado (React `useState`) para abrir/fechar a sidebar off-canvas (gap crítico da Fase 1 §7).
- Otimizado para desktop/escritório (spec §20); tablet/mobile com menu hambúrguer e grid responsivo.
- Gráficos responsivos.

---

## 6. Faseamento (milestones implementáveis otimizados às ondas E-01..E-08)

> Alinhado à Fase 2 proposta (§2) e à estratégia de implementação da spec §28. Cada milestone termina com **`npm run verify` verde + E2E Selenium verde** (GA-7 da proposta Fase 2) e um **gate humano** explícito.

| Milestone | Entregas (é picos E-x) | Dependências | Estimativa relativa | Gate humano associado |
|---|---|---|---|---|
| **M0 — Fundação visual** | E-01 Sistema de design + identidade aplicada; E-02 biblioteca de componentes base; fix menu mobile | — | S | **Gate 1: aprovar design system + stack de componentes/gráficos (L3/ADR)** |
| **M1 — Percepção (Dashboard)** | E-03 Dashboard visual: cards expandidos, barras de progresso, gráficos derivados de `GET /ciclos` | M0; decisão de stack gráfico | M | **Gate 2: aprovar Dashboard + indicadores** |
| **M2 — Agent Experience** | E-04 identidade da Estagiária + estados vivos (fontes ✅) + timeline de atividades (`GET /auditoria` humanizado) | M0; M1 | M | **Gate 3: aprovar estados/timeline do agente** |
| **M3 — Transparência** | E-05 cartões de decisão + mapa de contexto + camadas de explicação (usando `excecoes.contexto` existente) | M0; M2 | M | **Gate 4: aprovar fluxo de aprovação/exceção** |
| **M4 — Auditoria visível** | E-08 página de auditoria com trilha de eventos compreensível (consome `GET /auditoria` que **já existe**) | M0 | S–M | **Gate 5: aprovar auditoria** |
| **M5 — Polimento** | E-06 acessibilidade transversal; E-07 motion + refinamento premium + responsividade completa | atravessa todos | M | **Gate 6: **LOCAL_ACCEPTANCE** + validação visual → `HUMAN_GATE_DEMO_FACTORY`** (§27) |

### 6.1 Ordem sugerida de ondas (Fase 2 proposta §2)

**Onda 1** = M0 (fundação) → **Onda 2** = M1+M2 (percepção) → **Onda 3** = M3+M4 (transparência) → **Onda 4** = M5 (polimento).

### 6.2 Fase 3 — aprovação humana (pré-código)

Conforme spec §28: **nenhuma implementação visual significativa é aprovada antes da Fase 3.** Este documento é o artefato da Fase 2; a Fase 3 é Rodrigo aprovar/ajustar este Blueprint. A ordem executável é:

```
M0 → [Gate 1] → M1 → [Gate 2] → M2 → [Gate 3] → M3 → [Gate 4] → M4 → [Gate 5] → M5 → [Gate 6: LOCAL_ACCEPTANCE + HUMAN_GATE_DEMO_FACTORY]
```

---

## 7. Riscos / complexidade por item e priorização para o piloto

| # | Item do Blueprint | Risco / complexidade | Mitigação | Prioridade piloto |
|---|---|---|---|---|
| R1 | **Menu mobile inoperante** | Alta (bloqueia mobile; Fase 1 §7) | Estado React para toggle; baixo esforço | **1 — crítica** |
| R2 | **Identidade/marca não aplicada** (`#2563eb`) | Média (percepção premium §19; Fase 1 §5) | Aplicar tokens existentes globalmente | **1 — crítica** |
| R3 | **Acessibilidade crítica** (zero ARIA/foco) | Alta (spec §21; risco comercial/legal) | Componentes base já com acessibilidade embutida | **2 — alta** |
| R4 | **Estados/timeline do agente dependentes de novos endpoints** | Média (partes são premissa) | Implementar só com fonte ✔; demais como premissa | **2 — alta** |
| R5 | **Gráficos temporais exigem backend de série agregada** | Média–Alta (não existe) | Adiar para pós-piloto; piloto usa só `GET /ciclos` | **3 — média** |
| R6 | **Exceções globais N+1** (`ExcecoesPage.tsx:38-53`) | Média (performance §22) | Novo endpoint global (premissa) ou resolver no M3 | **3 — média** |
| R7 | **`contexto` (jsonb) não renderizado** | Baixa (dado existe) | Renderizar no mapa de contexto (M3) | **2 — alta** |
| R8 | **Actor `servico` não emitido** (identidade fiel do FD) | Baixa (PRM-P0.3-C backend) | Timeline funciona com `sistema`; refinar label após backend | **4 — baixa** |
| R9 | **Stack de componentes/gráficos não decidida** | Alta (bloqueia M0/M1) | **Decisão L3 de Rodrigo antes de M1** | **0 — pré-requisito (Gate 1)** |

### 7.1 Priorização resumida para o piloto

> **O que gera percepção imediata:** menu mobile + marca (R2/R1) e Dashboard visual com barras/gráficos de `GET /ciclos` (R5 mitigado). **O que gera transparência e controle:** cartões de decisão e auditoria (usam dados já existentes — alto ROI). **O que fica pós-piloto:** gráficos temporais e refinamento de `actor servico`.

---

## 8. Premissas a validar por Rodrigo

1. **Stack de componentes e gráficos (L3/ADR)** — componentes próprios vs. lib (ex.: shadcn-ui + Recharts). **Pré-requisito (Gate 1)** antes de M1.
2. **Dark mode** — dentro do escopo do MVP ou pós-piloto? (recomendo pós-piloto).
3. **Fontes de dado de estado do agente** ("Processando", "Erro", "Parado", "Aguardando aprovação" como dado real) — exige novos endpoints (`jobs_fila`, contagem de mensagens, documentos) ou permanece visualmente estático/label neutro.
4. **Endpoint global de exceções** (PRM-M-17) para eliminar N+1 e alimentar fila de aprovação sem agregação client-side.
5. **Endpoints de série temporal** para gráficos de evolução (pendências/documentos/atividades ao longo do tempo) — recomendo adiá-los; validar se entram no piloto.
6. **Texto de "recomendação" e "consequência"** nos cartões de decisão (§13) — hoje não existem como campos; validar origem/redação (pode exigir dado novo ou regra textual) ou manter texto genérico explicativo.
7. **Tipografia de marca** — definir fonte oficial para o design system (sem fonte hoje especificada).
8. **Dados de "documentos" e "cobranças de envio"** como indicadores — requerem novas consultas em `documentos` e `mensagens_comunicacao` (tabelas existem).
9. **Fonte de marca/tokens de estado de cor** — confirmar escala de tons expandida e comportamento de foco (checklist WCAG AA) antes de congelar o design system.

---

## 9. Relação com Gates e critério de pronto

- Todos os milestones M0–M5 seguem o fluxo **V2 (gates 1–5, QA, PO)** com PR e merge L2/L3 por classe (Fase 2 proposta §5).
- Após todas as ondas → **`LOCAL_ACCEPTANCE`** → validação visual → **`HUMAN_GATE_DEMO_FACTORY`** (§27 da spec), independente do CI.
- **Definição de pronto** (spec §30): a Estagiária Digital funcionalmente operacional e sua experiência transmitir profissionalismo, inteligência, automação, segurança e controle humano de forma clara, intuitiva e consistente.

---

**Status:** PROPOSTA — aguarda **Fase 3 (aprovação humana de Rodrigo)**. Nenhuma implementação visual significativa antes disso.
