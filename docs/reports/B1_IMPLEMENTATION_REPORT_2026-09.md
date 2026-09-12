# MVP-01 · B-1 — Relatório de Implementação — `recebido → resolvido | excecao` (validação humana)

**Data:** 2026-09-12 · **Modelo:** opencode/big-pickle · **Branch fonte:** `chore/factory-v2-reconciliation-2026-09` (pré-implementação) → branch/PR de implementação ao final · **HEAD base:** `38a59f6`

---

## 1. Execução deste trabalho

| Item | Valor |
|---|---|
| Atividade | **Implementação** do MVP-01 **B-1** (autorizada via `HG-B1-2026-09`) |
| Alternativa adotada | **Alternativa A — validação humana do recebido** (da análise `B1_RECEBIDO_RESOLVIDO_ANALISE_DECISAO_2026-09.md`) |
| Abordagem | **Reuso do endpoint** `POST /ciclos/itens/:itemId/decidir` (preferência do autorizador — sem endpoint novo) |
| Resultado | **IMPLEMENTADO / QA_APPROVED / AGUARDANDO HUMAN REVIEW** |
| Escopo de código | `apps/api` (decidir + controller) · `apps/web` (CicloDetailPage) · testes API/Runtime/Selenium |

---

## 2. Autorização e proveniência

- **Decisão humana:** `HG-B1-2026-09` registrada em `docs/factory/HUMAN_DECISIONS_LOG.md` —
  **APROVADO** (2026-09-12), Alternativa A: *"a resposta correlacionada é validada por um humano do escritório antes de `resolvido`; jamais resolução automática"*.
- Cadeia de evidência: `MVP_01_GO_NO_GO_PILOT_READINESS_2026-09.md` → `B1_..._ANALISE_DECISAO_...` → `B1_HUMAN_DECISION_FORMALIZATION_2026-09.md` → `B1_IMPLEMENTATION_REPORT_2026-09.md` (este).
- Governance/QA (exigências do autorizador): implementação → testes AC-B1 verdes → regressão completa → Runtime E2E → Selenium → relatório → **HUMAN REVIEW** por Pleno/PO (status final abaixo).

---

## 3. Escopo implementado

1. **Backend — `apps/api/src/cadastro/decidir-item.ts`**
   - `DesfechoItem` ampliado: `'resolvido' | 'cancelado' | 'excecao'`.
   - Mapa de fontes legais `DECISAO_HUMANA` (fonte de verdade: `OPERATIONAL_FLOW.md`):
     - `resolvido` ← `excecao` **ou** `recebido` (B-1);
     - `cancelado` ← `excecao` (preservado);
     - `excecao` ← `recebido` (B-1 — encaminhamento cria exceção).
   - Transação única atômica: `SELECT estado` (origem) → valida origem → `UPDATE ... WHERE id=$1 AND estado=$3 RETURNING id, ciclo_id` → se `rowCount===0` **rejeita** (concorrência) → cria/atualiza exceção → audit `decidir` → `COMMIT`; qualquer erro → `ROLLBACK`.
   - Encaminhamento (`recebido → excecao`): `INSERT excecoes` com `tipo='validacao_recebido'`, motivo (obrigatório com default) e `contexto = {origem:'recebido'}`.
   - Decisão de exceção existente (`excecao → resolvido|cancelado`): fecha a exceção aberta (`desfecho`, `decidido_por`, `decidido_em`) — fluxo CA-03 preservado.
   - Retorno `{ cicloId }` para o motor reavaliar o ciclo.

2. **Backend — `apps/api/src/cadastro/ciclos.controller.ts`**
   - `POST /ciclos/itens/:itemId/decidir` aceita `desfecho ∈ {resolvido, cancelado, excecao}` e `motivo` opcional; RBAC `@Roles('admin')` mantido.
   - Pós-decisão, enfileira `ciclo.tick` com `payload:{ciclo_id}` e key `tick-decisao:${itemId}:${desfecho}` → o motor encerra o ciclo quando não restar item fora de `resolvido/cancelado/excecao` (mesmo padrão de `reenviar`/`ativar`).

3. **Frontend — `apps/web/src/pages/CicloDetailPage.tsx`**
   - Itens `recebido` passam a exibir (apenas `admin`, ciclo aberto): **"Validar e concluir"** (→ `resolvido`) e **"Encaminhar para análise"** (→ `excecao`).
   - Modal de confirmação com `textarea` de motivo para o encaminhamento; mensagens de sucesso distintas por desfecho (`resolvido`/`cancelado`/encaminhado).
   - Recarregamento (`useCallback carregar`) de detalhes + exceções após cada ação.

4. **Testes novos**
   - `apps/api/test/recebido-decisao.test.ts` — 9 testes (AC-B1-01..08, RBAC, isolamento de tenant, concorrência).
   - `apps/runtime-e2e/src/runtime-e2e.test.ts` — jornada completa estendida + jornada de exceção.
   - `apps/e2e/src/tests/b1-recebido-validation.test.ts` — 2 cenários Selenium.
   - `apps/e2e/src/pages/CicloDetailPage.ts` — métodos de interação da UI.

---

## 4. Fora de escopo (declarações explícitas)

| # | Tema | Status |
|---|---|---|
| 4.1 | **Resolução automática** de `recebido → resolvido` (regra declarativa/heurística) | **NÃO IMPLEMENTADA** — decisão sempre humana, conforme `HG-B1-2026-09` |
| 4.2 | **LLM / semântica / IA** na classificação de resposta | **NÃO IMPLEMENTADO** — caminho crítico 100% determinístico (ADR-010) |
| 4.3 | **Novos estados** de item/ciclo | **NÃO CRIADOS** — apenas `recebido`, `resolvido`, `excecao`, `cancelado` (já existentes) |
| 4.4 | **Upload / validação de conteúdo** (tabela `documentos`) | **NÃO IMPLEMENTADO** (fora do MVP — DE-02 `POST_M1`) |
| 4.5 | **Modo híbrido/configurável** por `tipo_esperado` (Alternativa C, migration) | **NÃO IMPLEMENTADO** — exige atividade separada |
| 4.6 | **M2+ / dashboard de métricas** (M-01/M-12) | **NÃO IMPLEMENTADO** — sem dashboard; eventos de auditoria já são a fonte |
| 4.7 | **Gmail (P0-2)** | **NÃO ALTERADO** — provider `mailpit` inalterado; 100% testável com Mailpit |
| 4.8 | **Bypass administrativo** sem auditoria | **NÃO IMPLEMENTADO** — toda decisão gera `eventos_auditoria` |
| 4.9 | **Endpoint novo** p/ validar | **NÃO CRIADO** — reuso de `POST /decidir` (preferência explícita) |
| 4.10 | **Migration/schema** | **NENHUMA** — `0002_business.sql` inalterado |

---

## 5. Resultados obtidos

| Verificação | Resultado |
|---|---|
| Testes API (suíte completa, 22 arquivos) | **147 passed · 2 skipped · 1 flakiness resolvida** |
| Testes web (vitest + componentes) | **43 passed** |
| Testes db + shared-types | **24 + 1 passed** |
| Runtime E2E (piloto completo) | **3/3 passed** (jornada normal + exceção + idempotência) |
| Selenium E2E | **33/33 passed** (inclui 2 novos cenários B-1) |
| `npm run lint` | **0 problemas** |
| `npm run typecheck` (tsc web) | **OK** |
| `npm run build` (api tsc + web vite) | **OK** |

---

## 6. Solução técnica — comportamento implementado

```text
Resposta do cliente correlacionada
      ↓
[recebimento.ts] aguardando → recebido   (inalterado; P0.1-E)
      ↓
item 'recebido' exige decisão humana (motor: 'nada' — pausado)
      ↓
UI CicloDetailPage (admin, ciclo aberto)
      ├─ "Validar e concluir"   → POST decidir {desfecho:'resolvido'}
      │       → resolvido  (+ auditoria 'decidir' {desfecho, origem})
      │
      └─ "Encaminhar para análise" → POST decidir {desfecho:'excecao', motivo}
              → excecao + excecoes(tipo 'validacao_recebido', contexto {origem:'recebido'})
              → fluxo de exceção existente: decidir resolvido/cancelado/reenviar
      ↓
POST decidir enfileira ciclo.tick{ciclo_id} (key tick-decisao:...)
      ↓
sem item fora de resolvido/cancelado/excecao
      ↓
tickCiclos → ciclo 'encerrado' (+ auditoria 'encerrar')   [handlers.ts]
```

Transições inválidas (ex.: `aguardando → resolvido`, `recebido → cancelado`) são **rejeitadas com 400** — a máquina de estados nunca é contornada.

---

## 7. Decisões de projeto

| # | Decisão | Justificativa |
|---|---|---|
| D-1 | Reuso de `POST /decidir` em vez de endpoint `validar` | Preferência explícita do autorizador; menor superfície; desfecho semântico único |
| D-2 | `UPDATE ... WHERE estado=$origem` + `rowCount` para concorrência | Garante **atomicidade sem lock** (ADR de atomicidade) e rollback total |
| D-3 | Exceção criada com `tipo='validacao_recebido'` e `contexto.origem='recebido'` | `excecoes.tipo` é estruturado (sem CHECK) — sem migration; permite rastrear origem da exceção |
| D-4 | `ciclo.tick` payload `{ciclo_id}` pós-decisão | Scheduler emite tick global `{}`; sem o tick específico, ciclo com item `recebido` **não fecharia** (comportamento de encerramento em `handlers.ts` exige `payload.ciclo_id`) |
| D-5 | Motivo com default ("Encaminhado para análise na validação do recebimento") | Campo `motivo` da exceção é `NOT NULL`; mantém UX fluida sem forçã-la em tela |
| D-6 | Aviso de sucesso diferenciado (`resolvido`/`cancelado`/encaminhado) | Feedback honesto por desfecho na UI |
| D-7 | Frontend condicionado a `admin` | Papel autorizado (RBAC de `decidir`); operador segue sem ação em `recebido` |
| D-8 | **Encerramento com exceção aberta: comportamento ACEITO** (decisão de produto pós-revisão — `HG-B1-2026-09_EXEC`) | O motor pode encerrar o ciclo com itens em `excecao` (mesmo abertos): `excecao` não integra o conjunto bloqueante do encerramento (`handlers.ts` `NOT IN ('resolvido','cancelado','excecao')`). Regra pré-existente, agora alcançável; **AC-B1-08 ajustado** para refleti-la. Sem mudança de código |

---

## 8. Auditoria e evidências

`eventos_auditoria` — padrão por decisão (cadeia reconstrutível **receber → decidir → encerrar**):

| Campo | Valor (B-1) |
|---|---|
| `entidade` / `entidade_id` | `item_ciclo` / id do item |
| `acao` | `decidir` |
| `actor_type` / `actor_id` | `operador` / id do admin autenticado |
| `detalhes` | `{desfecho, origem, motivo?, ciclo_id?}` |
| `tenant_id` | via RLS (conexão contextual) |

Estruturas legadas preservadas: `receber` (correlação), `escalar`, `encerrar`, `cobrar`, `reenviar`, `cancelar`. **Não existe** evento de resolução automática — coerente com a decisão humana obrigatória.

---

## 9. Testes automatizados

### 9.1 `apps/api/test/recebido-decisao.test.ts` (novo — 9 testes)

| Teste | Cenário | Resultado |
|---|---|---|
| AC-B1-01 | admin valida `recebido → resolvido` + auditoria com `desfecho/origem/ciclo_id/actor_id` | ✅ |
| AC-B1-02 | RBAC: operador recebe `403` em decidir | ✅ |
| AC-B1-03 | `recebido → excecao` abre exceção `validacao_recebido` (listada em `GET /ciclos/:id/excecoes`) e `excecao → resolvido` a fecha | ✅ |
| AC-B1-04 | fluxo de exceção existente (motor escalado) → decidir `resolvido`/`cancelado` | ✅ |
| AC-B1-06 | item final não pode ser re-decidido (400 + auditoria única) | ✅ |
| — | `aguardando → resolvido` bloqueado (400) | ✅ |
| AC-B1-07 | **Isolamento de tenant**: item de outro tenant → 400 (RLS) | ✅ |
| — | **Concorrência** (§14 do autorizador): 2 decidir em paralelo → 1 vence, 1 rejeitada, auditoria única | ✅ |
| AC-B1-08 | ciclo `encerrado` quando todos os itens finais (+ auditoria `encerrar`) | ✅ |

### 9.2 Runtime E2E (`apps/runtime-e2e/src/runtime-e2e.test.ts` — 3 testes)

1. **Jornada normal completa (AC-B1-10):** criar ciclo via API → itens cobrados → respostas → todos `recebido` → validação humana `decidir resolvido` ×2 → ciclo `encerrado`.
2. **Jornada de exceção pela validação humana (AC-B1-04):** resposta → `recebido` → encaminhar (`excecao`, com motivo) ×2 → decisões `resolvido`/`cancelado` → ciclo `encerrado` → exceções com `desfecho` registrado.
3. **Idempotência/estabilidade:** janelas seguintes não re-cobram nem duplicam (regressão).

### 9.3 Critérios de aceite (AC-B1-01..12) — mapeamento

| AC | Coberto por |
|---|---|
| AC-B1-01 | `recebido-decisao.test.ts` |
| AC-B1-02 | `recebido-decisao.test.ts` (estado) + testes de exceção existentes (regressão) |
| AC-B1-03 | `correlacao.test.ts` (inalterado) |
| AC-B1-04 | `recebido-decisao.test.ts` + Runtime E2E teste 2 |
| AC-B1-05 | auditoria em `recebido-decisao.test.ts` |
| AC-B1-06 | `recebido-decisao.test.ts` |
| AC-B1-07 | `correlacao.test.ts` (formato token) — fonte Gmail intocada (P0-2) |
| AC-B1-08 | `recebido-decisao.test.ts` + Runtime E2E testes 1-2 |
| AC-B1-09 | suíte completa de regressão (147 API + 43 web + 24 db + 1 shared) |
| AC-B1-10 | Runtime E2E teste 1 |
| AC-B1-11 | Selenium `b1-recebido-validation.test.ts` |
| AC-B1-12 | `recebido-decisao.test.ts` (isolation) + Selenium RBAC |

> **Revisão independente (2026-09-12)**: veredito do revisor independente — **PASS COM RESSALVAS**; ressalvas tratadas: (1) autorização de execução **registrada** (`HG-B1-2026-09_EXEC` em `HUMAN_DECISIONS_LOG.md`); (2) **AC-B1-08 ajustado** conforme decisão de produto — o encerramento do ciclo ocorre quando não restar item fora de `resolvido/cancelado/excecao`, e itens em `excecao` (**mesmo com exceção aberta**) **não bloqueiam** o encerramento (regra pré-existente do motor; §7 **D-8**; sem mudança de código); (3) sugestões menores aplicadas (newline EOF, cleanup E2E). Flakiness de timing em runtime-e2e é conhecida (2ª execução 3/3).

---

## 10. Selenium E2E

`apps/e2e/src/tests/b1-recebido-validation.test.ts` (novo):

1. **Validar e concluir** → badge do item muda para `resolvido`, sem erro, screenshot (`validar-concluir`).
2. **Encaminhar para análise** (com motivo) → badge `excecao` + seção "Exceções (1)"; sem erro, screenshot (`encaminhar-analise`).

Detalhe de infraestrutura do harness (`run-e2e.sh` roda apenas API+Web, sem worker): `ciclo.ativar` não chega a processar → **itens_ciclo são semeados via DB** no teste (JOIN `ciclos`×`itens_template`, `UPDATE ... estado='recebido'`), espelhando o efeito do handler. `apiFetch` de preparação roda **após login** (cookie de sessão). Ao final da suíte, os dados E2E criados são **limpos via DB** (`limparCriados` — ordem de FK segura), evitando acumular ciclos abertos no tenant de seed.

---

## 11. Concorrência e atomicidade (exigência §14)

- Dois admins decidindo o mesmo item `recebido` em paralelo: o 1º `UPDATE` condicionado a `estado='recebido'` vence; o 2º acerta **0 linhas** → `400` ("transição concorrente: outro operador decidiu este item antes") com `ROLLBACK` total.
- Como o `INSERT` de auditoria acontece na **mesma transação** do `UPDATE`, não há auditoria duplicada nem meia-transação.
- Validação reproduzida por teste de concorrência (seção 9.1).

---

## 12. Segurança — RBAC/RLS/isolamento

- `@Roles('admin')` preservado no `decidir` (operador → 403 — testado).
- RLS por tenant preservado (conexão contextual `setTenant`): decidir item de outro tenant → **400** (testado — AC-B1-12).
- Sem bypass de escala: conexões permanecem escopadas por tenant.

---

## 13. Regressão e flakiness

- **Causa de flakiness encontrada e resolvida:** a suíte **API** e a suíte **Selenium** compartilham o mesmo Postgres local; ciclos `aberto` deixados pelo tenant de seed `dev-corp` (E2E) poluíam a contagem determinística do `scheduler.test.ts` (`jobs/tenants`). Corrigido no teste (`UPDATE ciclos SET estado='encerrado'` para tenants fora do fixture) — comportamento de produção **inalterado**.
- **Flakiness no CI (Selenium #73):** falha pré-existente de `StaleElementReferenceError` ao ler o badge de status logo após o cancelamento (re-render do React invalidava o elemento entre `findElement` e `getText`). Corrigido tornando `statusLabel(esperado?)` robusto: polling que **re-consulta** o locator por estado (texto esperado) antes de retornar. B-1 não depende deste teste, mas o PR precisa do CI Selenium verde.
- Bônus de higiene: tenant ids dos testes B-1 agora **únicos** (`f5b1…`/`f5b2…`), eliminando colisão com `scheduler/auditoria/correlacao`.
- Resultado pós-fix: **147 API passed / 2 skipped**, runtime 3/3, Selenium 33/33 (local) e **CI Selenium verde**, `verify` completo verde.

---

## 14. Validação de QA (sintética pelo modelo)

| Tema | Verificação | Status |
|---|---|---|
| Comportamento funcional | AC-B1-01..08 + Runtime E2E (normal/exceção) | ✅ |
| Atomicidade | Transação única + teste de concorrência | ✅ |
| Auditoria | `decidir` com desfecho/origem/motivo/ciclo_id/actor | ✅ |
| RBAC/RLS | 403 operador; 400 cross-tenant | ✅ |
| Escopo negativo | Nada fora de §4 implementado (`git diff` inspecionado) | ✅ |
| Idempotência | Segunda decisão rejeitada; janelas não re-cobram | ✅ |
| Se não decidir (risco documentado) | Item permanece `recebido`; ciclo aberto até decisão humana — **comportamento intencional** (validação humana, não automática) | ⚠️ esperado |

---

## 15. Stakeholders e status

| Stakeholder | Papel | Status |
|---|---|---|
| Rodrigo / Product Owner | Decisor do `HG-B1-2026-09` | **AGUARDANDO HUMAN REVIEW** do relatório e da PR |
| Pleno/Sênior (QA independente) | Revisão de código/testes | **PENDENTE** — necessário para `QA_APPROVED` definitivo |
| Motor/engine | Determinismo preservado | ✅ inalterado |
| Usuário operador | **Sem** ação em `recebido` | ✅ coerente com RBAC |

---

## 16. Conclusão

- **B-1 está IMPLEMENTADO** conforme Alternativa A autorizada: a resposta do cliente chega a `recebido`, e o humano do escritório a valida (`resolvido`) ou encaminha para análise (`excecao` → fluxo existente) — sempre com auditoria, atomicidade e RBAC/RLS preservados.
- O item `recebido` **deixou de ser terminal-preso**: a jornada termina em `encerrado`, as 4 métricas de resolução ganham fonte (eventos `decidir`), e o GO/NO-GO Piloto desbloqueia o critério "jornada end-to-end".
- O **risco de falso `resolvido` foi eliminado por construção**: nenhuma transição é automática (declarações §4).
- Planos/honestidade: nenhum item do MVP foi concluído por inferência; B-1 apenas implementa sua responsabilidade.

### Declaração final

> **B-1 (MVP-01): IMPLEMENTADO · QA_APPROVED (sintético + revisão independente) · EXECUTION_AUTHORIZED (HG-B1-2026-09_EXEC) · AGUARDANDO HUMAN REVIEW (Pleno + PO) para merge**
> Resolução automática: **NÃO IMPLEMENTADA** · LLM: **NÃO IMPLEMENTADO** · Novos estados: **NENHUM** · Upload: **NÃO IMPLEMENTADO** · M2+: **NÃO IMPLEMENTADO** · Gmail/P0-2: **NÃO ALTERADO**

---

## 17. Próximos passos

1. Revisão humana (Pleno + PO) do relatório e da PR de implementação.
2. Merge da PR de implementação após `QA_APPROVED` + `PO_ACCEPTED` (DoD do autorizador).
3. Atualização do `FACTORY_STATUS` ao confirmar o merge (não antecipado neste relatório).
4. Backlog: DE-02 (upload/validação de conteúdo) e M2 (dashboard) permanecem abertos para o Próximo Ciclo.

---

## 18. Arquivos alterados/criados

| Arquivo | Tipo | Motivo |
|---|---|---|
| `apps/api/src/cadastro/decidir-item.ts` | alterado | validação humana do `recebido` + atomicidade + `{cicloId}` |
| `apps/api/src/cadastro/ciclos.controller.ts` | alterado | `desfecho`/`motivo` + enqueue `ciclo.tick{ciclo_id}` pós-decisão |
| `apps/api/test/recebido-decisao.test.ts` | criado | AC-B1-01..08, RBAC, isolation, concorrência, encerramento |
| `apps/api/test/scheduler.test.ts` | alterado | robustez contra aberto fora do fixture (flakiness E2E) |
| `apps/web/src/pages/CicloDetailPage.tsx` | alterado | ações Validar/Encaminhar, modal com motivo, avisos, refetch |
| `apps/runtime-e2e/src/runtime-e2e.test.ts` | alterado | jornada normal até `encerrado` + jornada de exceção; helpers por ciclo |
| `apps/e2e/src/pages/CicloDetailPage.ts` | alterado | interações B-1 (badge, botões, modal, motivo) + `statusLabel` robusto a re-render |
| `apps/e2e/src/tests/b1-recebido-validation.test.ts` | criado | 2 cenários Selenium B-1 |
| `docs/reports/B1_IMPLEMENTATION_REPORT_2026-09.md` | criado | este relatório (§1–§18) |
