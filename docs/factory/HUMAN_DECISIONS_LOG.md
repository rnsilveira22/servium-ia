# Human Decisions Log — Servium IA

> Registro formal e imutável das decisões humanas (human gates). Cada entrada preserva a autorização, a evidência da execução e as condições vinculadas. Formato das solicitações: `HUMAN_GATES.md`. Fonte viva de pendências: `FACTORY_STATUS.md`.

---

## HG-001 — Merge da PR #2 (Software Factory V1)

```text
[AUTONOMY] L3 | decisão requerida: merge da PR #2 | solicitada em: PHASE2_REPORT.md / HUMAN_GATES.md §HG-001
```

- **Decisão**: **APROVADO — Opção A** ("Autorizo o merge da PR #2 (Software Factory V1) na main.")
- **Decisor**: Rodrigo (owner) · **Data**: 2026-08-22
- **Autorização registrada**:

> HG-001: APROVADO — Opção A. Autorizo o merge da PR #2 (Software Factory V1) na main.

- **Execução**: revalidação pré-merge (`state=OPEN`, `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`, ambos os checks do docs-ci verdes); merge via GitHub (`gh pr merge --merge`), sem force merge; `main` local atualizada após o merge.
- **Evidência**: PR [#2](https://github.com/rnsilveira22/servium-ia/pull/2) · commit de conteúdo `af1ab64` · SHA do merge registrado no repositório.
- **Resultado**: factory passa a operar sobre `main`.

## HG-002 — Pacote de ADRs estruturais (001..011)

```text
[AUTONOMY] L3 | decisão requerida: aceitar/rejeitar ADR-001..011 | solicitada em: ADR_REVIEW_REPORT.md / HUMAN_GATES.md §HG-002
```

- **Decisão**: **APROVADO — Opção A** ("Autorizo a aceitação do pacote ADR-001 até ADR-011, conforme as recomendações do ADR_REVIEW_REPORT.md.")
- **Decisor**: Rodrigo (owner) · **Data**: 2026-08-22
- **Autorização registrada**:

> HG-002: APROVADO — Opção A. Autorizo a aceitação do pacote ADR-001 até ADR-011, conforme as recomendações do ADR_REVIEW_REPORT.md.

- **Condições vinculantes confirmadas pelo decisor**:
  1. **ADR-005** — suíte de testes de isolamento multi-tenant obrigatória;
  2. **ADR-009** — checklist OWASP ASVS e testes de segurança obrigatórios;
  3. **ADR-011** — escolha concreta de provedor e qualquer custo recorrente permanecem sujeitos ao human gate correspondente (**HG-004**) e **não estão autorizados** por esta aprovação.
- **Execução**: status dos 11 arquivos alterado de `Proposed` para `Accepted (HG-002 · 2026-08-22)` — exatamente 1 linha por arquivo (`git diff`: 11 inserções, 11 remoções), sem alteração material do conteúdo técnico; índices atualizados (`decisions/README.md`, `PROJECT_INDEX.md`, `AI_CONTEXT.md`, `architecture/README.md`, `roadmap/README.md`, nota em `STACK_EVALUATION.md`, resolução no `ADR_REVIEW_REPORT.md`).
- **Evidência**: commit desta fase na branch integrada à PR #2 → `main`.
- **Resultado**: Gate 2 desbloqueado para histórias que dependem destas decisões.

---

## HG-003 — Proposta inicial de backlog

```text
[AUTONOMY] L3 | decisão requerida: aprovar/ajustar proposta de backlog | solicitada em: PROPOSED_INITIAL_BACKLOG.md / HUMAN_GATES.md §HG-003
```

- **Decisão**: **APROVADO COM AJUSTES — Opção B**
- **Decisor**: Rodrigo (owner) · **Data**: 2026-08-22
- **Autorização registrada**:

> HG-003: APROVADO — Opção B (aprovação com ajustes). A proposta inicial de backlog do Servium IA está aprovada como direção de produto, com as seguintes determinações: […] Ondas 0–7 aprovadas como roadmap inicial, não como autorização irrestrita; PO autorizado a materializar somente as histórias das Ondas 0 e 1; Ondas 2–7 permanecem backlog planejado.

- **Determinações vinculantes** (íntegra na Issue/comunicação da decisão):
  1. Ondas 0–7 = roadmap inicial, **não** autorização irrestrita;
  2. Materialização imediata restrita às Ondas **0 e 1**;
  3. Ondas 2–7: refinamento/materialização progressiva;
  4. **História 1.3**: transactional outbox só com necessidade concreta demonstrada pela análise técnica; jobs/SKIP LOCKED/retry/backoff/idempotency keys permanecem requisitos; conflito material com ADR-006 → `needs:adr` + `HUMAN_DECISION_REQUIRED`, nunca contradição silenciosa;
  5. **PO + Senior avaliam** antecipação de vertical slice mínimo da C3.1 para validação realista de tenant_id/RLS/isolamento (sem antecipar toda a Onda 3);
  6. História 1.4 permanece na Onda 1;
  7. Ondas 5–7 condicionadas aos gates de `MVP_SCOPE.md`/`HUMAN_GATES.md`;
  8. Aprovação NÃO autoriza: contratação de serviços, escolha de provedor pago, deploy em produção, mudança arquitetural, mudança de visibilidade PRIVATE, expansão de escopo, bypass de Human Gates;
  9. Onda 5: canal concreto condicionado à validação (e-mail não é definitivo sem evidência);
  10. História 6.3: LLM opcional, fora do caminho crítico, deterministic-first (ADR-010).
- **Execução**: proposta transformada em backlog canônico (`docs/product/INITIAL_BACKLOG.md`) com ajustes incorporados; Issues reais criadas apenas para as Ondas 0–1 (**#3–#10**, 8 itens) no Project `Servium IA Development`, com campos Epic/Priority/Item Type/Responsible Role/Status, labels, dependências, critérios de aceite, DoR e DoD; campo `Epic` adicionado ao Project.
- **Resultado**: fila da factory populada; implementação só inicia após validação das Issues contra a governança e o DoR.

---

## HG-004 — Autorização de merge (PRs #11 e #12)

```text
[AUTONOMY] L3 | decisão requerida: merge das PRs documental e de implementação | solicitada em: relatório da sessão /start-factory
```

- **Decisão**: **AUTORIZADO** — `PR #11 MERGE: AUTHORIZED` · `PR #12 MERGE: AUTHORIZED`, nesta ordem.
- **Decisor**: Rodrigo (owner) · **Data**: 2026-08-22
- **Gates pré-merge exigidos**: state=OPEN, MERGEABLE, CLEAN, checks verdes, diff sem alterações inesperadas, base=main, sem force push/bypass/rebase destrutivo; falha em qualquer gate ⇒ não mesclar e registrar bloqueio.
- **Execução e evidências**:

| Gate | PR #11 | PR #12 |
|---|---|---|
| state/base | OPEN / main ✔ | OPEN / main ✔ |
| mergeable/status | MERGEABLE/CLEAN ✔ | MERGEABLE/CLEAN ✔ (aguardou recomputação pós-#11) |
| checks | 2/2 pass ✔ | 2/2 pass ✔ |
| diff revisado | 6 arquivos esperados ✔ | 26 arquivos do skeleton ✔ |
| merge commit | `2ed0965` | `26b0db5` |

- **Pós-merge verificado**: main local atualizada; `INITIAL_BACKLOG.md`, `HUMAN_DECISIONS_LOG.md` e HG-003 RESOLVED confirmados; skeleton presente na main com revalidação real (`npm ci`, lint, build, testes 3/3).

---

## HG-005 — Reprioridade de produto para MVP-01

```text
[AUTONOMY] L3 | decisão de produto | comunicada em: "SERVIUMAI — REPRIORIDADE DE PRODUTO PARA MVP-01" (2026-08-22)
```

- **Decisão**: `PRODUCT PRIORITY: MVP-01 TIME-TO-PILOT`
- **Decisor**: Rodrigo (owner) · **Data**: 2026-08-22
- **Meta canônica registrada**: `MVP-01 — Primeiro Funcionário Digital em operação assistida no cliente piloto` (fluxo end-to-end demonstrável com supervisão humana, rastreabilidade e segurança suficientes).
- **Determinações principais** (íntegra na comunicação da decisão):
  1. Otimizar por time-to-pilot sem violar segurança, multi-tenancy, auditoria, CAs, QA independente, ADRs Accepted e Human Gates;
  2. REPLANEJAR, não recomeçar — backlog/arquitetura/ADRs/histórico preservados;
  3. #4 e #5 seguem fundação imediata mínima; #6 modela só o necessário ao slice; #7 obrigatório (condição ADR-005 vinculante); #8 essencial-subconjunto (outbox segue condicional); #9 obrigatório pré-piloto;
  4. #10 muda de foco: definir o vertical slice técnico mínimo do MVP-01 (não só multi-tenancy);
  5. Antecipação controlada de capacidades das Ondas 3–7 somente quando necessárias ao MVP-01 (PO + Senior);
  6. Não antecipar: 2º Funcionário Digital, framework genérico de agentes, múltiplos canais, WhatsApp não validado, ERPs, LLM no caminho crítico, infra distribuída, microsserviços, K8s, dashboards sofisticados;
  7. LLM: DETERMINISTIC-FIRST (ADR-010) — só se regras não bastarem;
  8. Canal: não assumir definitivo; mínimo proposto pelo PO; se envolver serviço pago/provedor/custo → acionar HG-006; nada contratado automaticamente;
  9. Piloto passa a ser o alvo organizador (slices), não a última onda; plano rastreável até PILOT_READY;
  10. Novas Issues apenas as indispensáveis (progressive materialization); WIP mantido; qualidade inegociável; PILOT_READY ≠ deploy automático.
- **Renumbering do catálogo**: para evitar colisão com esta numeração cronológica do log, os eventos reservados do catálogo passam a **HG-006** (PaaS/storage pagos) e **HG-007** (credenciais/permissões ausentes). Nenhum desses eventos foi acionado ainda.
- **Execução**: replanejamento documentado em `docs/product/MVP_01_VERTICAL_SLICE.md`, `docs/product/MVP_01_REPLAN_REPORT.md` e atualizações do backlog/Project.

---

## HG-008 — Canal real do piloto: adotada a recomendação ajustada (Gmail API + OAuth 2.0)

```text
[AUTONOMY] L3 | human gate de produto/arquitetura | aprovada na reconciliação pós-MVP (HUMAN GATE · 2026-08-30) — decisões Q1–Q4
```

- **Decisão**: **APROVADO — Gmail API + OAuth 2.0 como canal real do piloto**, substituindo para implementação a recomendação anterior **A (SMTP+IMAP próprio)** da [SRV-10](../factory/spikes/SRV-10-mvp01-slice.md), preservando a porta `CommunicationChannel` (ADR-008).
- **Decisor**: Rodrigo (owner) · **Data**: 2026-08-30
- **Divergência explicada**: a SRV-10 recomendou A (infraestrutura própria, custo zero, HG-006 evitado) por critérios de comparativo; a implementação já mergeada (PR #34, SRV-18) usou Gmail API + OAuth 2.0. O decisor **confirma a adoção do Gmail API/OAuth como decisão humana**, sanitizando o ajuste realizado no PR #34. **HG-006 não é acionado**: decisão sem custo recorrente (quota gratuita do Gmail; quotas Google registradas como dependência externa).
- **Arquitetura de testes (decidida, NÃO implementada ainda)**:
  - piloto/produção → **Gmail API + OAuth 2.0**;
  - local/CI/E2E → **Fake SMTP via Mailpit**;
  - ambos atrás da porta `CommunicationChannel` (ADR-008);
  - Mailpit será tratado após o **runtime operacional** (P0.1) estar corretamente wireado.
- **Referência formal**: [`POST_MVP_BACKLOG_RECONCILIATION.md`](../reports/POST_MVP_BACKLOG_RECONCILIATION.md) §0 (decisão Q2) e §4 (matriz SRV-10); Issue #18 / PR [#34](https://github.com/rnsilveira22/servium-ia/pull/34).
- **Resultado**: o plano de comunicação do piloto fica rastreado; ausência de registro anterior no log fica corrigida preservando o histórico.

---

## HG-F2-01 — Criação do Orchestrator + governança da Factory V2

```text
[AUTONOMY] L3 | governance da Factory V2 | solicitada em: docs/reports/FACTORY_V2_FASE1_IMPLEMENTATION_PLAN.md §C (HG-F2-01)
```

- **Decisão**: **APROVADO** — autoriza criar `servium-orchestrator`; comandos de start da V2; documentação do Orchestrator; atualização da governança; formalização dos handoff contracts; integração com os agentes V1; manutenção da V1 como fallback.
- **Decisor**: Rodrigo (owner) · **Data**: 2026-09-04 · **Fase**: `FACTORY_V2_PHASE1_DESIGN_READY`
- **Limites impostos pelo decisor**: Orchestrator é coordenador; **sem** autoridade de produto, prioridade, aceite, ADR, arquitetura, Human Gates, governança fora do processo, deploy, dados reais, merge estrutural, nem substituição de Rodrigo/PO.
- **Condição de implementação**: branch própria + PR específico da Factory V2; sem alterações silenciosas em `main`.
- **Evidência**: `.opencode/agent/servium-orchestrator.md` · `.opencode/command/start-orchestrator.md` · `docs/factory/ORCHESTRATOR.md` (branch `feat/f2-orchestrator`).

---

## HG-F2-02 — Estados canônicos da Factory V2

```text
[AUTONOMY] L3 | governance da Factory V2 | solicitada em: docs/reports/FACTORY_V2_FASE1_IMPLEMENTATION_PLAN.md §C (HG-F2-02)
```

- **Decisão**: **APROVADO** — adotar a máquina de estados canônica V2 (14 estados): `OPEN · PO_APPROVED · TECH_READY · IMPLEMENTING · QA_REVIEW · QA_FAILED · QA_APPROVED · HUMAN_REVIEW · PO_ACCEPTED · DONE · BLOCKED · AWAITING_DECISION · REJECTED · ESCALATED_TECHNICAL_FAILURE`. **DONE = QA_APPROVED AND PO_ACCEPTED AND MERGED.**
- **Decisor**: Rodrigo (owner) · **Data**: 2026-09-04
- **Evidência**: `docs/factory/DEVELOPMENT_WORKFLOW.md` (estados V2) · `docs/factory/GITHUB_WORKFLOW.md` (mapa do campo Status; migração do Project pendente de execução admin).

---

## HG-F2-03 — Política de merge única (por classe)

```text
[AUTONOMY] L3 | governance da Factory V2 | solicitada em: docs/reports/FACTORY_V2_FASE1_IMPLEMENTATION_PLAN.md §C (HG-F2-03)
```

- **Decisão**: **APROVADO — Opção A (merge por classe)** — resolve o conflito P0-1 entre `AUTONOMY_POLICY.md` (todo merge L3) e `FACTORY_RUNBOOK.md` §9 (merge autônomo de PR normal):
  - **PR normal** (código/doc com cobertura, CI verde, QA `APPROVED`, PO `ACCEPTED`, sem ADR `Proposed` dependente): **autônomo (L2)** com notificação;
  - **PR estrutural** (arquitetura, banco, produto, dependência removível, governança, Human Gates): **L3 — sempre humano**.
- **Decisor**: Rodrigo (owner) · **Data**: 2026-09-04
- **Evidência**: `docs/factory/AUTONOMY_POLICY.md` · `docs/factory/AGENT_ORCHESTRATION.md` §10 · `docs/factory/FACTORY_RUNBOOK.md` §9 (harmonizado).

---

## HG-REC-01 — Reconciliação do estado (#45–#49 + documentos)

```text
[AUTONOMY] L3 | governance da Factory V2 | solicitada em: docs/reports/FACTORY_V2_FASE1_IMPLEMENTATION_PLAN.md §D (HG-REC-01)
```

- **Decisão**: **APROVADO** — autoriza a reconciliação: fechamento das issues **#45–#49** com evidência de implementação mergeada (PRs #61–#65) e correção do `FACTORY_STATUS.md`/`README`/`CHANGELOG`/referências Playwright/ADR headings, com registro rastreável (sem alteração silenciosa).
- **Decisor**: Rodrigo (owner) · **Data**: 2026-09-04
- **Fora do escopo desta autorização** (explicitado pelo decisor): implementar #51, implementar #58, nova UX/UI, alterar API/banco/regras de produto, deploy, dados reais.
- **Evidência**: `docs/factory/FACTORY_STATUS.md` e docs reconciliados no branch `feat/f2-orchestrator`; fechamento das issues requer `gh`/web (pendente).

---

## Confirmação integral das aprovações HG-F2 (registro de retificação)

A mensagem original de aprovação (04/09/2026) chegou truncada após o texto do **HG-F2-02**. O decisor (Rodrigo) confirmou em 04/09/2026 que os quatro gates — **HG-F2-01**, **HG-F2-02**, **HG-F2-03** e **HG-REC-01** — foram **aprovados na íntegra, sem ressalvas**, valendo as opções recomendadas no plano aprovado (`docs/reports/FACTORY_V2_FASE1_IMPLEMENTATION_PLAN.md` §C/§D): HG-F2-03 → **merge por classe (Opção A)**; HG-REC-01 → **lote completo de reconciliação**. Este registro sanitiza o artefato sem apagar o histórico.

---

## HG-PR-SEC — Valores da política de senha (P0.3-A)

> Detalhamento da implementação da **Issue #54** (PRM-P0.3-A) sobre o registro geral HG-PR-SEC (P0.3) abaixo.

```text
[AUTONOMY] L3 | human gate de segurança | deferida em 2026-08-30, reaberta e aprovada em 2026-09-06
```

- **Decisão**: **APROVADO** — valores vinculantes da política de senha da [Issue #54](https://github.com/rnsilveira22/servium-ia/issues/54) (PRM-P0.3-A):
  1. comprimento mínimo **12** (NIST SP 800-63B A2.1, postura B2B), máximo **64**;
  2. **sem** exigência de composição obrigatória (maiúscula/símbolo) — NIST desaconselha;
  3. **sem truncamento**; **espaços permitidos**;
  4. rejeitar blocklist de senhas comuns (top-1000) — **opcional v1**, implementada lista mínima incorporada ao código;
  5. enforcement: `POST /auth/trocar-senha` (verifica senha atual, aplica política, rehash argon2, revoga demais sessões, audita) + validação no seed (dev).
- **Decisor**: Rodrigo (owner) · **Data**: 2026-09-06
- **Estado anterior**: DEFERRED (2026-08-30, plano §14) — desbloqueado para implementação da Issue #54.
- **Evidência**: `docs/security/PASSWORD_POLICY.md` (justificativa + referências ASVS/NIST) · Issue #54 · PR associado.

---

## HG-RETENÇÃO — Retenção de eventos de auditoria (DEFERRED)

```text
[AWAITING_DECISION] | retenção de dados de auditoria | registrado em: PRE_PILOT_REMEDIATION_PLAN.md §13/§24 e Issue #53 (CA-05-2)
```

- **Decisão**: **DEFERRED** — o decisor (Rodrigo) determinou em 2026-08-30 que a política numérica de retenção (prazo, volume, purge automático) seria definida posteriormente; durante o MVP/piloto, todos os eventos de auditoria são preservados sem limite.
- **Decisor**: Rodrigo (owner) · **Data da determinação**: 2026-08-30
- **Condição**: purge futuro fica **condicionado a esta decisão** — nenhum evento pode ser removido antes da aprovação de política numérica (conforme `PRE_PILOT_REMEDIATION_PLAN.md` §21 HG-RETENÇÃO e §24.3).
- **Registrado em**: `docs/audit/EVENTOS_AUDITORIA.md` §6; Issue #53 (PRM-P0.2-C); `POST_MVP_BACKLOG_RECONCILIATION.md`.
- **Estado**: OPEN — aguardando definição de política antes de `PILOT_READY`.

---

## HG-PR-SEC — Hardening de segurança: senha e rate-limit (P0.3, BLOQUEADA)

```text
[AWAITYING_DECISION] | hardening de segurança P0.3 (#54/#55) | solicitada em: PRE_PILOT_REMEDIATION_PLAN.md §14 (P0.3)
```

- **Decisão**: **APROVADO (2026-09-06)** — valores propostos adotados na íntegra por Rodrigo (owner): política de senha min **12** (max 64, sem composição obrigatória, sem truncamento, espaços ok, rejeitar reuso + blocklist top-1000 opcional v1, enforcement `POST /auth/trocar-senha` + seed) e rate-limit no `POST /auth/login` (**5 falhas/15min por conta** → `429`+backoff; **30/5min por IP**; resposta `401`/`429` genérica anti-enumeração; env `LOGIN_RATE_LIMIT_*`; evento `login_block`).
- **Justificativa aprovada**: ASVS V2.1/V2.2/V2.5 + NIST SP 800-63B §5 — conforme `PRE_PILOT_REMEDIATION_PLAN.md` §14/§15/§21 HG-PR-SEC.
- **Estado**: `status:blocked`/`needs:decision` **removidos** das Issues #54/#55 → **IMPLEMENTING autorizado** (P0.3-A ∥ B, agente: pleno).
- **Referências**: `PRE_PILOT_REMEDIATION_PLAN.md` §14/§15/§21; Issues #54/#55; `AUTONOMY_POLICY.md` L3.
- **Estado**: OPEN — aguardando `HUMAN_DECISION_REQUIRED` (decisão humana antes de qualquer implementação).

---

## HG-L3-0809 — Merges L3: PR #90 (ASVS #57) e PR #92 (Blueprint UX Fase 2)

```text
[AUTONOMY] L3 | decisão requerida: merge PR #90 (mapeamento ASVS) e PR #92 (Blueprint Fase 2 UX/UI) | solicitada em: docs/reports/FACTORY_V2_HUMAN_REVIEW_L3_REPORT.md
```

- **Decisão**: **APROVADO — 2026-09-08** pelo decisor (Rodrigo, owner) para os dois merges, em execuções distintas:
  - **PR #90** (`docs/security/ASVS_PILOTO.md` + Gate 4.6 no `QUALITY_GATES.md`) → **merge via rebase** (`a8c057a`, `Closes #57`).
  - **PR #92** (`docs/reports/UI_EXPERIENCE_BLUEPRINT_PROPOSAL.md`, proposta Fase 2 UX/UI) → **merge via squash** (`731c009`).
- **Escopo da autorização**: apenas o registro dos documentos na `main`. **NÃO autoriza a implementação da UX/UI Fase 2** (E-01..E-08) — permanece `NOT_STARTED`, sujeita a novo Human Gate.
- **Condições/observações**:
  1. PR #90: conflito resolvido via rebase + correção F-01 (contagem ASVS → 40 requisitos: 31 implementados, 5 parciais, 3 lacunas, 1 n/d); CI 2/2 verde.
  2. **CA-D-3** — revisão de segurança do mapeamento ASVS por pessoa responsável **NÃO registrada** (condição de `PILOT_READY`; sem aprovação inventada).
  3. PR #92: `gh pr update-branch` aplicado para resolver retardo (conflito zerado); diff inalterado (1 arquivo, +343).
- **Evidência**: PRs [#90](https://github.com/rnsilveira22/servium-ia/pull/90) e [#92](https://github.com/rnsilveira22/servium-ia/pull/92); commits `a8c057a` e `731c009`; `main@731c009`.
- **Estado**: **RESOLVIDO** — merges executados e registrados.

---

## HG-UX-M0 — Fundação Visual (Fundação Visual M0 — HUMAN_GATE_UX_M0)

```text
[AUTONOMY] L3 | decisão requerida: aprovar fundação visual M0 (Fase 2 UX/UI) | solicitada em: fluxo Human Gate 1 — HUMAN_GATE_UX_M0
```

- **Decisão**: **APROVADO — 2026-09-08** pelo decisor (Rodrigo, owner). Autoriza **exclusivamente o M0 — Fundação Visual**:
  - **E-01 — Design System + Identidade** (tokens oficiais `--servium-navy/teal/mint/ink-muted/surface/white` em `apps/web/src/styles/brand-tokens.css`);
  - **E-02 — Biblioteca de Componentes Base** (`apps/web/src/components`: Button, Input/Field, Table, Badge/StatusBadge, Card, Modal, Skeleton, Toast);
  - **Correção/finalização do Menu Mobile** (AppShell/Layout — consolidação do comportamento já corrigido em #94/#95);
  - **Acessibilidade como requisito transversal** (labels, focus-visible, teclado, semântica, contraste WCAG AA, `prefers-reduced-motion` preparado).
- **Decisões registradas do gate**:
  1. **Escala de cores** derivada dos tokens oficiais (hover/active/disabled/focus/success/warning/error/info) — sem nova identidade;
  2. **Tipografia** — stack moderna/consistente sem dependência externa; fonte proprietária deferida;
  3. **Componentes próprios leves** (sem lib de componentes pesada neste momento);
  4. **Gráficos** (Recharts/equivalente leve) — **deferido para M1**; não instalar no M0;
  5. **Dark Mode** — **FORA DO ESCOPO** do MVP/piloto (tokens organizados p/ extensão futura).
- **Limitações explícitas** (obrigatórias durante M0):
  - **NÃO autorizado**: M1 (Dashboard), M2 (Agent Experience), M3 (Decision Cards), M4 (Auditoria visual), M5 (gráficos de negócio);
  - **NÃO criar**: novos endpoints backend (métricas/global/jobs/upload/etc.), alterações de schema/API/motor/filas/auth/RBAC/domínio — escopo restrito a `apps/web`; qualquer necessidade → `AWAITING_DECISION`;
  - M0 entregue em **PR separado** (`feat(web): implement UX foundation M0`) — não misturar com M1.
- **Condição de liberação do Próximo Gate (HG-UX-M1)**: QA aprovado + Visual QA aprovado + `npm run verify` verde + Selenium verde + PR mergeado + Factory V2 reconciliado.
- **Controles**: PR deve incluir descrição/escopo/CA/testes/evidências visuais/impacto/riscos. Máximo **3 ciclos QA** → `ESCALATED_TECHNICAL_FAILURE` no 3º.
- **Evidência**: baseline `main@49fa677`; tokens oficiais existentes (`brand-tokens.css:1-8`); Modal acessível já em `apps/web/src/components/Modal.tsx`; `#2563eb`/`#1e40af`/`#dbeafe` restantes = **0**.
- **Estado**: **RESOLVIDO** — gate aprovado; M0 = `PO_APPROVED` → pronto para `IMPLEMENTING` sob autonomia autorizada.
- **Implementação (2026-09-08)**: M0 entregue na PR #96 (`8c7ab2f`, branch `feat/web-ux-m0-foundation`). E-01 tokens + App.css tokenizado; E-02 Button/Field/Badge/StatusBadge/Card/Table/Skeleton/Toast (Modal reutilizado); menu mobile consolidado; acessibilidade (focus-visible token, reduced-motion, Field id/aria-describedby/aria-invalid). `npm run verify` verde — **178 testes** (incl. 18 novos de componentes). Estado: **QA_REVIEW** — merge condicionado a Selenium CI verde + Visual QA + `HG-UX-M0_ACCEPTANCE`.
- **Validação (2026-09-08) — `M0_READY_FOR_HUMAN_GATE_ACCEPTANCE`** (ver [`M0_UX_FOUNDATION_VALIDATION_REPORT.md`](../reports/M0_UX_FOUNDATION_VALIDATION_REPORT.md)):
  - **Defeito encontrado e corrigido**: Selenium CI falhou (22 testes) — o `Field` do M0 renderizava label/controle como irmãos, quebrando os seletores E2E (`span/label/input`, `span/label/select`). Corrigido em `6312ea1` (2 arquivos, `apps/web` dentro do escopo M0): `Field.tsx` aninha `<label><span>{label}</span><controle/></label>`; `ObrigacoesPage.tsx` migra o select para `<Field>`.
  - **Evidências pós-fix**: Selenium local **31/31** · Selenium CI **PASS** · CI 4/4 verde · mergeState `CLEAN` · `npm run verify` **178 testes** · Visual QA programático **18/18** · 12 screenshots em `apps/e2e/evidence/m0-qa/` (gitignored) p/ review humano.
  - **Risco residual registrado**: Chrome local 152 vs chromedriver 151 (crash de sessão de WebDriver não-funcional) — CI estável (usa Chrome for Testing 151 pareado).
  - **Próximo passo**: solicitação formal de decisão binária **`HUMAN_GATE_UX_M0_ACCEPTANCE`** (APPROVE → autoriza merge da PR #96; REJECT → retorna à fila M0). **Sem merge antes da decisão humana. M1..M5 permanecem NOT_AUTHORIZED.**

---

## HG-B1-2026-09 — MVP-01 · B-1 — Fluxo `recebido → resolvido` (Alternativa A)

```text
[AUTONOMY] L3 | decisão de produto/domínio | detalhada em: docs/reports/B1_RECEBIDO_RESOLVIDO_ANALISE_DECISAO_2026-09.md (2026-09-12)
```

- **Tema**: `MVP-01 — B-1 — Fluxo recebido → resolvido`.
- **Decisão**: **APROVADO — 2026-09-12** pelo decisor (Rodrigo, owner) — **Alternativa A: validação humana do item `recebido`** no MVP-01. A resposta correlacionada **não** deve ser considerada automaticamente como resolução da pendência.
- **Decisor**: Rodrigo — Product Owner · **Data**: 2026-09-12
- **Regra de negócio aprovada**:

```text
Cliente responde
      ↓
Resposta correlacionada
      ↓
AGUARDANDO → RECEBIDO
      ↓
Validação humana
      ├── atende ao solicitado → RESOLVIDO
      │
      └── não atende / dúvida → EXCEÇÃO
                                  ↓
                            decisão humana
```

- **Regra 1**: uma resposta correlacionada válida leva o item a `recebido`;
- **Regra 2**: um usuário autorizado valida o item;
- **Regra 3**: o usuário pode concluir como `resolvido` (quando atende ao solicitado) ou encaminhar para `excecao` (não atende / dúvida);
- **Regra 4**: a Estagiária Digital registra o recebimento e disponibiliza o item para validação humana.
- **Justificativa**: o MVP ainda não possui validação objetiva do conteúdo recebido (upload/validação de conteúdo é `POST_M1`, `DE-02`); resolução automática no estado atual poderia produzir falso positivo (`resolvido` sem evidência). A validação humana preserva determinismo (ADR-010), auditabilidade ("resultado de validação: critério + veredito" — `OPERATIONAL_FLOW.md`) e a operação assistida do piloto.
- **Escopo**: válido para o **MVP-01 / piloto assistido**. Autoriza **somente** a regra de negócio acima. NÃO autoriza: resolução automática; uso de LLM para decidir documento; validação automática de conteúdo; upload de documentos fora do escopo aprovado; alteração de arquitetura; novo framework de agentes; M2–M5; alterações de Gmail além das necessárias a posteriori para P0-2; dark mode; recursos de produto não relacionados ao B-1.
- **Evolução futura**: resolução automática poderá ser reavaliada posteriormente quando existirem critérios determinísticos de validação de conteúdo (ex.: entrega de DE-02/upload).
- **Status**: **APPROVED** — decisão de produto aprovada; **implementação NÃO autorizada nesta atividade** (aguarda nova autorização de execução; ver bloco `NEXT_ACTIVITY_AUTHORIZATION` em `B1_RECEBIDO_RESOLVIDO_ANALISE_DECISAO_2026-09.md` e no relatório `B1_HUMAN_DECISION_FORMALIZATION_2026-09.md`).
- **Referências**: análise técnica [`docs/reports/B1_RECEBIDO_RESOLVIDO_ANALISE_DECISAO_2026-09.md`](../reports/B1_RECEBIDO_RESOLVIDO_ANALISE_DECISAO_2026-09.md); critérios de aceite AC-B1-01..11 do relatório de decisão.

### HG-B1-2026-09_EXEC — Autorização de execução (2026-09-12)

```text
[AUTONOMY] L3 | autorização de execução | detalhada em: docs/reports/B1_IMPLEMENTATION_REPORT_2026-09.md (2026-09-12)
```

- **Decisão**: **AUTORIZADO — 2026-09-12** pelo decisor (Rodrigo, owner): executar a **Alternativa A** do `HG-B1-2026-09` no MVP-01 — implementar a validação humana do item `recebido` (transições `recebido → resolvido` e `recebido → excecao`), reaproveitando `POST /ciclos/itens/:itemId/decidir`, conforme escopo, testes (AC-B1-01..12), Runtime E2E, Selenium, regressão e relatório final.
- **Decisor**: Rodrigo — Product Owner · **Data**: 2026-09-12
- **Decisão de produto anexa (pós-revisão independente)** : **comportamento de encerramento aceito** — o motor pode encerrar o ciclo enquanto houver itens em `excecao` (até com exceção aberta), pois `excecao` **não** integra o conjunto bloqueante de encerramento em `handlers.ts` (`NOT IN ('resolvido','cancelado','excecao')`). AC-B1-08 foi ajustado para refletir essa regra (ver implementação report §7). Nenhuma mudança de código decorrente desta decisão.
- **Escopo de execução autorizado**: exatamente o contido no PR #99 (branch `feat/mvp01-b1-recebido-resolvido`): `decidir-item.ts`, `ciclos.controller.ts`, `CicloDetailPage.tsx`, testes API/Runtime/Selenium B-1 + robustez de testes E2E. NÃO autoriza qualquer alteração a mais.
- **Status**: **EXECUTION_AUTHORIZED** — implementação registrada como autorizada para merge após revisão humana (Pleno + PO).

---

## Pendências

| ID | Assunto | Estado |
|---|---|---|
| HG-006 | PaaS/storage pagos (event-driven) | aguardando momento — **não acionado** em 2026-08-30 (HG-008: canal decidido sem custo recorrente) |
| HG-007 | Credenciais/permissões ausentes (event-driven) | aguardando momento |
| HG-RETENÇÃO | Retenção de eventos de auditoria | **DEFERRED** — prazo numérico a definir antes de PILOT_READY |
| HG-PR-SEC | Hardening de segurança P0.3 (senha + rate-limit) | **APROVADO (2026-09-06)** — P0.3-A/B liberadas |
| HG-UX-M0 | Fundação Visual M0 (Fase 2 UX/UI) | **APROVADO (2026-09-08)** — M0 autorizado; M1..M5 NÃO |
| HG-UX-M1 | Dashboard / M1 (Fase 2 UX/UI) | aguardando conclusão do M0 (QA + Visual QA + verify + Selenium + merge) |
| **HG-B1-2026-09** | **MVP-01 — B-1 — fluxo `recebido → resolvido`** | **APROVADO (2026-09-12)** — Alternativa A (validação humana); **execução AUTORIZADA (HG-B1-2026-09_EXEC)** — ver merge em PR #99 |

## Reconciliação do estado real do GitHub (2026-09-12)

> Adendo factual da auditoria `FACTORY_V2_GITHUB_RECONCILIATION_2026-09` — NÃO cria/alterar decisões; registra **ausência de registros** e aponta evidências objetivas. Relatório completo: [`docs/reports/FACTORY_V2_GITHUB_RECONCILIATION_2026-09.md`](../reports/FACTORY_V2_GITHUB_RECONCILIATION_2026-09.md).

Evidência objetiva (GitHub/git, `rnsilveira22/servium-ia`):

| ID | Situação detectada | Evidência no GitHub/git | Linha acima (data da sessão) | Ação necessária |
|---|---|---|---|---|
| HG-UX-M0_ACCEPTANCE | **Não registrado formalmente**; M0 foi mergeado | PR #96 MERGED `95c8160` (09/09), `mergedBy: rnsilveira22`, sem reviews | "**Sem merge antes da decisão humana**" (08/09) + estado `AWAITING_HUMAN_DECISION` | Registrar decisão de aceite (APROVADO/outra) retroativamente — `AWAITING_DECISION` |
| HG-UX-M1 (plano) | Aprovação do plano M1 PARALELO (09/09) citada como existente **apenas** no backlog executável não commitado (`FACTORY_V2_M1_EXECUTABLE_BACKLOG.md`, blob efêmero) | Sem commit; sem entrada no log | "aguardando conclusão do M0" | Registrar aprovação do plano (Data/contexto) ou marcar decisão como ausente — `AWAITING_DECISION` |
| Merge Wave B1 (PR #98) | Merge executado pelo owner (10/09) **sem registro de decisão no log** | PR #98 MERGED `dfb75c0` (10/09), `mergedBy: rnsilveira22`; commits `e6a2a1f`+`f0ca3f7`; CI exit 0 | — | Não inventar nota; a decisão de merge é fato registrado no GitHub; falta registrar no log — `AWAITING_DECISION` |

Decisões deste adendo:

- Nenhuma decisão foi **criada** nesta auditoria (nenhum gate foi aprovado/rejeitado).
- Estado de todas as lacunas acima: **`AWAITING_DECISION`** — formalização depende do Owner/`rnsilveira22`.
