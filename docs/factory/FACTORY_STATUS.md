# Factory Status — Servium IA

> Snapshot vivo do estado da factory. Atualizado ao fim de cada sessão (`FACTORY_RUNBOOK.md` §5). Histórico completo vive no git/Issues — este arquivo é o ponto de partida da próxima sessão.

## Última atualização

2026-09-12 · **RECONCILIAÇÃO OFICIAL** do estado real do GitHub (ver `docs/reports/FACTORY_V2_GITHUB_RECONCILIATION_2026-09.md`). Snapshots anteriores: 2026-09-08 · P0.3-D (#57 ASVS) MERGED (PR #90, rebase L3, `a8c057a`, `Closes #57`) · Blueprint UX/UI Fase 2 MERGED (PR #92, squash L3, `731c009`) · P0.3-C (#56) e #73 merged via L2 · PRM-P0.3-A (#54, PR #80 `6313cab`) e PRM-P0.3-B (#55, PR #81 `69e0950`) DONE+MERGED · **M0 UX IMPLEMENTADO + VALIDADO (PR #96)** · Factory V2 operacional (Orchestrator + estados V2).

Mudanças desde o último snapshot (evidência objetiva em GitHub/git):

- **PR #96 (M0 UX — Fundação Visual) MERGED (09-09, commit `95c8160`, squash, branch `feat/web-ux-m0-foundation`)** — a `main` local/remota contém o M0. O documento anterior registrava `AWAITING_HUMAN_DECISION` e "sem merge antes da decisão"; o merge foi executado por `rnsilveira22`, mas **sem registro formal do `HUMAN_GATE_UX_M0_ACCEPTANCE` no `HUMAN_DECISIONS_LOG`** → `AWAITING_DECISION` (formalizar; a única evidência é o próprio merge).
- **PR #98 (M1 Wave B1 backend) MERGED (09-10, commit `dfb75c0`, squash, merge humano `rnsilveira22`)** — entrega **M1-OPS-01** (`template_id` em `POST /obrigacoes`), **M1-OPS-03** (`motor-erro.test.ts`, evidências + retry), **M1-OPS-04A** (e-mail obrigatório/validado em `POST /clientes` — DD-08, `email-validation.ts`), **M1-OPS-05** (`GET/PUT /configuracoes`, `ConfiguracoesController`, migração `0011_emails.sql`), **M1-OPS-07** (`actor_nome` na auditoria — DA-02). **M1-OPS-04B** segue `AWAITING_DECISION` (legados sem e-mail intocados). Verificações do PR: `npm run verify` exit 0 (API 138/2, Web 43, Runtime E2E 2, lint/build/typecheck verdes).
- **M1 UX (Frente A) IMPLEMENTED na branch `feat/m1-frente-a-pleno` — 3 commits à frente de `main` (`3f6ebdb` M1-UI-01 templates, `a45f830` M1-UI-05 exceções explicadas, `20af34f` revisão)** — branch publicada em `origin`, **sem PR aberto** e **sem autorização de merge registrada** → `AWAITING_DECISION` (crear PR + gate de aprovação).
- **E2E Selenium**: `f0ca3f7` realinhou `POST /clientes` (envio de e-mail no teste `ciclo-activation`) — suíte 31/31 ok (já em `origin/main` via PR #98).
- **Documentos de análise M1/UX NÃO commitados** (perdidos do worktree; existem apenas como blobs/checkpoints efêmeros): `docs/ux/FACTORY_V2_UX_UI_EVOLUTION_BACKLOG.md`, `docs/ux/FACTORY_V2_UX_UI_REFERENCE_COMPARISON.md` e `docs/factory/FACTORY_V2_M1_EXECUTABLE_BACKLOG.md` → `AWAITING_DECISION` (recuperar/commitar).
- **PR #97 (dependabot, devDeps) está OPEN** — fila L2/L3 não está zerada.

### Reconciliado nesta sessão

- **M0 UX (PR #96) VALIDADO — `M0_READY_FOR_HUMAN_GATE_ACCEPTANCE`**: Selenium CI falhou na 1ª execução (22 testes) por regressão real do `Field` (markup label/irmão quebrando seletores `span/label/input` e `span/label/select` do E2E). Corrigido em `6312ea1` (escopo M0, `apps/web`). Pós-fix: Selenium local 31/31 + CI PASS, CI 4/4 verde, mergeState CLEAN, `verify` 178 testes, Visual QA 18/18 + 12 screenshots. Relatório: [`docs/reports/M0_UX_FOUNDATION_VALIDATION_REPORT.md`](../reports/M0_UX_FOUNDATION_VALIDATION_REPORT.md). **No aguardo do `HUMAN_GATE_UX_M0_ACCEPTANCE`** (decisão binária; sem merge antes; M1..M5 NOT_AUTHORIZED). Risco residual: Chrome local 152 vs chromedriver 151 (sessão WebDriver não-funcional crashou; CI estável pareado 151).
- **PR #90 (P0.3-D, ASVS #57) MERGED via L3 humano (rebase, `a8c057a`)**: autorização explícita do Owner (2026-09-08). Rebase sobre `main@b265762` + correção F-01 (contagem ASVS → 40 requisitos: 31/5/3/1, validado por script) + F-02 (conflito FACTORY_STATUS). CI 2/2 verde pós-rebase. `Closes #57` — Issue #57 CLOSED.
- **PR #92 (Blueprint UX/UI Fase 2) MERGED via L3 humano (squash, `731c009`)**: autorização explícita do Owner (2026-09-08). Escopo validado: 1 arquivo novo (`docs/reports/UI_EXPERIENCE_BLUEPRINT_PROPOSAL.md`, +343), sem código/API/schema/dependências. `gh pr update-branch` aplicado para resolução de retardo (main → branch); diff pós-atualização inalterado (só o blueprint). **Implementação da Fase 2: M0 autorizado via HUMAN_GATE_UX_M0 (2026-09-08)** — M0 (E-01/E-02, Menu Mobile, Acessibilidade) permitido; **M1..M5 e novos endpoints backend NÃO autorizados**.
- **#93 (dívida de lint da main) merged via L2 (squash, `dd48cf0`)**: fix MD037 (trailing spaces) em `FACTORY_STATUS.md`; restaura `npm run lint:docs` verde na main.
- **#94 (Issue P1: correções de UX/UI da auditoria) IMPLEMENTADA na branch `feat/94-ux-correcoes-p0p1`** (base `dd48cf0`): modal acessível (`Modal.tsx` — `role=dialog`, `aria-modal`, `aria-labelledby`, trap de foco, `data-autofocus`, retorno de foco), menu mobile real (topbar com hambúrguer `aria-expanded/aria-controls`, backdrop, Escape), tokens de marca navy/teal no lugar de `#2563eb`, coluna **Contexto** legível em ciclos/exceções, tabelas em `.table-responsive`, `aria-live`/`role` em alertas, `:focus-visible` global, `badge-aberto`/`badge-expirado`. **QA completo: web unit 25/25, API 108(+2 skip), E2E Selenium 31/31, lint/typecheck/build verdes + Visual QA programático 10/11. → MERGED via PR #95 (squash L2, `30744fa`, `Closes #94`)**.

- **P0.3-C (#56) implementada e merged via L2 (PR #89)**: QA APROVADO (ciclo 2) → squash merge L2 do PR `feat/56-identidade-servico` na main. Correções pós-QA aplicadas: (i) MAJOR — entry point canônico `apps/api/src/runtime/main.ts` injeta `serviceId: requireServiceId()` (CA-C-1/CA-C-3 no caminho de produção); (ii) MINOR-1 — `RecebedorPeriodico` propaga `serviceId` (evento `receber` com `actor_type='servico'`, default `sistema` retrocompatível); (iii) MINOR-2 — teste CA-C-2 refinado com request HTTP real.
- **#73 (bug P0) cancelamento de ciclo implementado e merged via L2 (PR #91)**: QA APROVADO → squash merge L2 do PR `fix/73-cancelar-ciclo` na main. Entregue: endpoint `POST /ciclos/:cicloId/cancelar` (idempotente, RLS), guarda `c.estado='aberto'` em `cobrarItem`/`reenviarItem`, UI (botão Cancelar + confirmação + motivo + badge Cancelado + ações desabilitadas), testes API (8) + web + E2E Selenium verdes.
- **P0.2 docs encerrados**: PR #79 (`53ed958`) merged pelo humano (Owner) — encerramento formal da auditoria (#9).
- **P0.3 entregue**: HG-PR-SEC aprovado (06/09) desbloqueou #54/#55 (∥, agente: pleno). #54 → PR #80 (`6313cab`, merged pelo humano 06/09, Issue CLOSED nesta sessão com evidência). #55 → PR #81 (`69e0950`, merge L2 squash nesta sessão, Issue CLOSED via `Closes #55`).
- **P0.3-D (#57, ASVS)**: doc vivo `docs/security/ASVS_PILOTO.md` criado (V2/V3/V4/V5 nível 1, 40 requisitos mapeados: 31 implementados, 5 parciais, 3 lacunas, 1 n/d) com evidências automatizadas reais e lacunas rastreadas (G-01..G-08). Checklist de revisão de segurança adicionado ao `QUALITY_GATES.md` (Gate 4.6, condição para `PILOT_READY`). Estado da #57: IMPLEMENTING → **QA_REVIEW**. Aguardando QA + revisão de segurança (CA-D-3) — sem aprovação registrada.
- **Regressão P0 `nodemailer@10` (#83)**: bump do dependabot (#75) removeu o namespace de tipos `nodemailer.Transporter` → build `@servium/api` falhava (TS2503) e `main` vermelha desde `6313cab`. Causa mascarada por `node_modules` local desatualizado (6.10.1 vs lockfile 10.0.0). Corrigido no PR #84 (`7b96fd6`, 1 arquivo), merge L2 squash.
- **Spec oficial do MVP v1.0** (experiência visual/UX) registrada em `docs/product/MVP_EXPERIENCE_SPEC_v1.md` via PR #82 (docs, L3 humano).
- **HG-RETENÇÃO** permanece `DEFERRED` (política numérica pendente).
- **L2 merges registrados**: #76 (`150188f`), #77 (`8617afd`), #78 (`7efd68a`); sessões anteriores #84 (`7b96fd6`), #81 (`69e0950`); **esta sessão #89 (P0.3-C #56) e #91 (bug #73)**.

## Estado geral

| Dimensão | Estado |
|---|---|
| Branch de trabalho | `main` sincronizada (`49fa677`) |
| Estado do MVP-01 | **P0.1–P0.3 resolvido** (PRs #61–#66, #76/#77/#78, #80/#81, #89, #90, #91, #95) + **P0.3 restante: 0** · **M0 UX MERGED (PR #96, `95c8160`, 09/09)** — atualizado → M0 `DONE` · **M1 Backend Wave B1 MERGED (PR #98, `dfb75c0`, 09/10 — OPS-01/03/04A/05/07; OPS-04B `AWAITING_DECISION`)** · **M1 UX (Frente A, M1-UI-01/05) IMPLEMENTED em branch, SEM PR** (`feat/m1-frente-a-pleno`, 3 commits) · M0/M1 UX formalização de gates: `AWAITING_DECISION` |
| Software Factory | **V2 OPERACIONAL** — Orchestrator + estados V2 aprovados (HG-F2-01/02/03) |
| Meta canônica | [`../product/MVP_01_VERTICAL_SLICE.md`](../product/MVP_01_VERTICAL_SLICE.md) — primeiro Funcionário Digital em operação assistida no piloto |
| ADRs 001..011 | `Accepted` (HG-002); ADR-008 `CommunicationChannel` preservado (HG-008) |
| Backlog | Canônico em [`../product/INITIAL_BACKLOG.md`](../product/INITIAL_BACKLOG.md) |
| Relatório da reconciliação | [`../reports/POST_MVP_BACKLOG_RECONCILIATION.md`](../reports/POST_MVP_BACKLOG_RECONCILIATION.md) |
| Relatório de encerramento P0.2 | [`../reports/P0_2_REMEDIATION_CLOSURE_REPORT.md`](../reports/P0_2_REMEDIATION_CLOSURE_REPORT.md) |
| Especificação oficial do MVP v1.0 | [`../product/MVP_EXPERIENCE_SPEC_v1.md`](../product/MVP_EXPERIENCE_SPEC_v1.md) — **MERGED** (PR #82, L3) |

## Decisões humanas

| ID | Assunto | Estado |
|---|---|---|
| HG-001 | Merge PR #2 | ✅ RESOLVIDO |
| HG-002 | Pacote ADRs | ✅ RESOLVIDO (condições ativas) |
| HG-003 | Backlog inicial | ✅ RESOLVED — APPROVED WITH ADJUSTMENTS |
| HG-004 | Merge PRs #11/#12 | ✅ RESOLVIDO (`2ed0965`, `26b0db5`) |
| HG-005 | Reprioridade MVP-01 | ✅ RESOLVED — TIME-TO-PILOT |
| HG-006 | Comunicação com provedor/custo | event-driven — **não acionado** (HG-008: canal decidido sem custo recorrente) |
| HG-008 | Canal real do piloto = Gmail API + OAuth | ✅ RESOLVIDO (2026-08-30) |
| HG-F2-01 | Criar Orchestrator + governança V2 | ✅ APROVADO (2026-09-04) |
| HG-F2-02 | Estados canônicos V2 (14) | ✅ APROVADO (2026-09-04) |
| HG-F2-03 | Política de merge por classe | ✅ APROVADO (2026-09-04) |
| HG-REC-01 | Reconciliação (fechamento #45–#49 + docs) | ✅ APROVADO (2026-09-04) |
| **HG-RETENÇÃO** | **Retenção de eventos de auditoria** | ⏳ DEFERRED — prazo numérico a definir antes de PILOT_READY |
| **HG-PR-SEC** | **Hardening de segurança P0.3 (senha + rate-limit)** | ✅ APROVADO (2026-09-06) — valores propostos; P0.3-A/B liberadas |

Registro formal: [`HUMAN_DECISIONS_LOG.md`](HUMAN_DECISIONS_LOG.md).

## Registro de autonomia (L2)

| Data | Ação | Item | Evidência | Resultado |
|---|---|---|---|---|
| 05/09/2026 | merge PR normal squash | #51 | [PR #76](https://github.com/rnsilveira22/servium/pull/76) `150188f` | ok |
| 05/09/2026 | merge PR normal squash | #52 | [PR #77](https://github.com/rnsilveira22/servium/pull/77) `8617afd` | ok |
| 05/09/2026 | merge PR normal squash (docs) | #53 | [PR #78](https://github.com/rnsilveira22/servium/pull/78) `7efd68a` | ok |
| 06/09/2026 | merge PR (humano `rnsilveira22`) | #9 / #54 | [PR #79](https://github.com/rnsilveira22/servium/pull/79) `53ed958`; [PR #80](https://github.com/rnsilveira22/servium/pull/80) `6313cab` | ok |
| 06/09/2026 | merge PR normal squash | #83 (P0-regressão `nodemailer@10`) | [PR #84](https://github.com/rnsilveira22/servium/pull/84) `7b96fd6` | ok |
| 06/09/2026 | merge PR normal squash | #55 | [PR #81](https://github.com/rnsilveira22/servium/pull/81) `69e0950` | ok |
| 07/09/2026 | merge PR normal squash | #56 (P0.3-C) | [PR #89](https://github.com/rnsilveira22/servium/pull/89) `Closes #56` | ok |
| 07/09/2026 | merge PR normal squash | #73 (bug P0) | [PR #91](https://github.com/rnsilveira22/servium/pull/91) `Closes #73` | ok |
| 07/09/2026 | merge PR normal squash (docs) | #93 (dívida lint MD037) | [PR #93](https://github.com/rnsilveira22/servium/pull/93) `dd48cf0` | ok |
| 07/09/2026 | merge PR normal squash | #94 (P1 — correções UX/UI auditoria) | [PR #95](https://github.com/rnsilveira22/servium/pull/95) `30744fa` | ok |
| 09/09/2026 | merge PR (humano `rnsilveira22`) | #96 (M0 UX — Fundação Visual) | [PR #96](https://github.com/rnsilveira22/servium/pull/96) `95c8160` — **sem registro formal de `HUMAN_GATE_UX_M0_ACCEPTANCE` no `HUMAN_DECISIONS_LOG`** (única evidência: o merge) | ok (evidência = merge) |
| 10/09/2026 | merge PR (humano `rnsilveira22`) | PR #98 (M1 Wave B1 — OPS-01/03/04A/05/07) | [PR #98](https://github.com/rnsilveira22/servium/pull/98) `dfb75c0` — commits `e6a2a1f` + `f0ca3f7`; **sem reviews registrados**; sem registro no `HUMAN_DECISIONS_LOG` | ok (evidência = merge + CI) |

> **L2 merges**: #76/#77/#78, #84, #81, #89, #91, #93, #95. **Merges L3 humanos (2026-09-08)**: PR #90 (ASVS #57, rebase `a8c057a`) e PR #92 (Blueprint Fase 2, squash `731c009`). **Merges humanos (09/09–10/09)**: PR #96 (`95c8160`) e PR #98 (`dfb75c0`). **PRs abertos (09/12)**: **#97 (dependabot/development) — fila NÃO zerada**; **sem PR para `feat/m1-frente-a-pleno`** (M1 UX implementada, aguarda decisão).

## Fila efetiva (Project `Servium IA Development`)

> **PRE-PUSH VALIDATION GATE: ACTIVE** — docs → `npm run lint:docs`; código → `npm ci` + `npm run db:up` + `npm run verify`. Falha local ⇒ sem push.

| Issue | Item | Prioridade | Status real | Observação |
|---|---|---|---|---|
| [#9](https://github.com/rnsilveira22/servium/issues/9) | Auditoria append-only (**P0.2**) | P0 | **DONE no board** / Issue OPEN (aguarda fechamento formal) | CA-01/02 (reconciliação §5), CA-03 (#52), CA-04 (#51), CA-05 (#53) todos entregues; PR #79 merged humanamente; drift do board (Done/P1 vs OPEN/P0) registrado |
| [#20](https://github.com/rnsilveira22/servium/issues/20) | N5 Auth mínima (**P0.3** hardening) | P0 | **CLOSED no GitHub (24/08) — linha corrigida nesta reconciliação** | Issue #20 (slice ADR-009) fechada em 24/08; a linha anterior listava como OPEN (drift); hardening P0.3 entregue via #54/#55/#56/#73/#57 (PRs #80/#81/#89/#91/#90) — P0.3 DONE |
| [#56](https://github.com/rnsilveira22/servium/issues/56) | **PRM-P0.3-C · Identidade de serviço do FD (`actor_type='servico'`)** | P0 | **MERGED** (PR #89, squash L2) | CA-C-1/2/3 implementados e testados: runtime canônico (`main.ts`) injeta `serviceId: requireServiceId()`; recebimento propaga `serviceId` (evento `receber` com `actor_type='servico'`); CA-C-2 refinado com request HTTP real (`login_sucesso` ⇒ `actor_type='operador'`); evidência em `apps/api/test/identidade-servico.test.ts` · **QA APROVADO (ciclo 2) → merge L2** + `Closes #56` |
| [#57](https://github.com/rnsilveira22/servium/issues/57) | **PRM-P0.3-D · Mapeamento ASVS 4.0.3 nível 1** | P0 | **MERGED** (PR #90, rebase L3) | `docs/security/ASVS_PILOTO.md` (40 requisitos mapeados: 31 implementados, 5 parciais, 3 lacunas, 1 n/d; lacunas G-01..G-08) + Gate 4.6 no QUALITY_GATES. Merge L3 humano (08/09) `a8c057a` + `Closes #57` — **CA-D-3 pendente** |
| [#73](https://github.com/rnsilveira22/servium/issues/73) | Bug P0 (funcional) | P0 | **MERGED** (PR #91, squash L2) | Cancelar ciclo ativo (#73): endpoint `POST /ciclos/:cicloId/cancelar` (+ `cancelar-ciclo.ts`), guarda `c.estado='aberto'` em `cobrarItem`, bloqueia `reenviarItem` em ciclo não aberto, UI (botão Cancelar + confirmação + motivo + badge Cancelado + ações desabilitadas). Testes API (8), web e E2E Selenium verdes (CI) · **QA APROVADO → merge L2** + `Closes #73` |
| [#72](https://github.com/rnsilveira22/servium/issues/72) | Gap P1 | P1 | OPEN | aguarda próxima onda |
| [#94](https://github.com/rnsilveira22/servium/issues/94) | **Correções P0/P1 UX/UI (auditoria Fase 1)** | P1 | **MERGED** (PR #95, squash L2) | A11y (modais, menu mobile, `aria-live`, `:focus-visible`), marca navy/teal, contexto de exceção, tabelas responsivas, badges. Unit/E2E/Visual QA verdes + CI 4/4 · `Closes #94` |
| [#58](https://github.com/rnsilveira22/servium/issues/58) | Backlog P2 | P2 | OPEN | aguarda próxima onda |
| [#59](https://github.com/rnsilveira22/servium/issues/59) | Backlog P2 | P2 | OPEN | aguarda próxima onda |
| [#83](https://github.com/rnsilveira22/servium/issues/83) | **P0-regressão `nodemailer@10`** | P0 | **CLOSED** (PR #84 `7b96fd6`) | detectada nesta sessão; causava CI vermelho na main |

Issues fechadas nesta sessão: **#94 (PR #95), #93 (PR #93)** e, via L3 humano (08/09), **#57 (PR #90)** — além de #56 (PR #89), #73 (PR #91) na mesma data em sessão anterior; #54 (PR #80), #55 (PR #81), #83 (PR #84) em sessões anteriores. Issues fechadas sessão anterior: #51 (PR #76), #52 (PR #77), #53 (PR #78), #45–#49 (HG-REC-01), #50 (PR #66).

## Bloqueios / aguardando humano

| Item | Tipo | Ação necessária |
|---|---|---|
| **HG-RETENÇÃO** | Decisão de produto | Definir política numérica de retenção (prazo/volume) para habilitar purge futuro; durante piloto mantém preservação integral |
| **Fechar Issue #9** | Encerramento formal | Comentar cobertura CA-01→CA-05 + fechar (decisão do Owner); corrigir drift do board (Done/P1 vs OPEN/P0) |
| **Drift do board #9** | Governança | Corrigir Status/Priority no board; migrar campo Status p/ estados V2 (web/admin) |
| **PR #82** (spec MVP v1.0) | L3 humano | **MERGED** (`c35e672`) — Especificação Oficial do MVP v1.0 registrada |
| **PR #90** (ASVS P0.3-D, #57) | L3 humano | **MERGED** (`a8c057a`, rebase, 08/09) — Gate 4.6 ativo; CA-D-3 (revisão de segurança) **pendente** no HUMAN_DECISIONS_LOG |
| **PR #92** (Blueprint Fase 2 UX/UI) | L3 humano | **MERGED** (`731c009`, squash, 08/09) — proposta registrada; **M0 MERGED (PR #96)** |
| **Implementação UX Fase 2** M0 | L3 humano | **M0 MERGED (PR #96, `95c8160`, 09/09, merge humano)** — CI verde, Selenium 31/31, Visual QA 18/18; **NOTA da reconciliação: `HUMAN_GATE_UX_M0_ACCEPTANCE` NÃO registrado formalmente** (docs `HUMAN_DECISIONS_LOG`/reports ainda dizem `AWAITING`); evidência de autorização = próprio merge — **decisão pendente: formalizar registro (AWAITING_DECISION)** |
| **M1 Backend Wave B1** (OPS-01/03/04A/05/07) | L3 humano | **MERGED (PR #98, `dfb75c0`, 10/09, merge humano `rnsilveira22`)** — verificações exit 0; **sem registro formal no `HUMAN_DECISIONS_LOG`** → formalizar (AWAITING_DECISION) |
| **M1 UX (Frente A)** (M1-UI-01/05) | L3 humano | **IMPLEMENTED na branch `feat/m1-frente-a-pleno`** (`3f6ebdb`, `a45f830`, `20af34f`), publicada em `origin` — **sem PR aberto e sem gate de aprovação registrado** → criar PR + Human Gate (AWAITING_DECISION) |
| **M1-OPS-04B** (legados sem e-mail) | `AWAITING_DECISION` | Definir tratamento de clientes legados sem e-mail (bloqueada; não autorizada) |
| **Docs perdidos (não commitados)** (`docs/ux/FACTORY_V2_UX_UI_*`, `docs/factory/FACTORY_V2_M1_EXECUTABLE_BACKLOG.md`) | Recuperação | Artefatos criados em sessões (08–10/09) existem apenas como blobs efêmeros/checkpoints; ausentes do worktree e de todas as branches → decidir recuperar/commitar (AWAITING_DECISION) |
| **P0.3-D** (#57) | Implementação | **MERGED** (PR #90 `a8c057a`) — Issue #57 CLOSED; CA-D-3 pendente |
| Deploy/piloto no cliente real | Gate próprio | Após `PILOT_READY` |

## Próximos passos

1. **Formalizar registros faltantes** (decisão do Owner): `HUMAN_GATE_UX_M0_ACCEPTANCE` (merged via PR #96 em 09/09), aprovação do plano M1 PARALELO (citada como 09/09 apenas no backlog executável não commitado) e merge do Wave B1 (PR #98, 10/09) — sem registro formal em `HUMAN_DECISIONS_LOG.md`;
2. **M1 UX (Frente A)**: decidir criar PR para `feat/m1-frente-a-pleno` + aprovar gate de implementação (AWAITING_DECISION);
3. **Recuperar/commitar docs perdidos** (`docs/ux/*` e `FACTORY_V2_M1_EXECUTABLE_BACKLOG.md`) — AWAITING_DECISION;
4. **Fechar Issue #9** (comentário rastreável + decisão do Owner); corrigir drift do board;
5. **Definir HG-RETENÇÃO** (política de retenção numérica);
6. **Registrar CA-D-3** (revisão de segurança do ASVS pela pessoa responsável) no `HUMAN_DECISIONS_LOG` — condição para `PILOT_READY`;
7. Priorizar #72/#58/#59 na próxima onda (Issue #17/classificação e abordagem de dívida);
8. Avaliar desativação da V1 após 2+ ciclos V2 com gates verdes (nunca automática).
