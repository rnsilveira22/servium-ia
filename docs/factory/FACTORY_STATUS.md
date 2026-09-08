# Factory Status — Servium IA

> Snapshot vivo do estado da factory. Atualizado ao fim de cada sessão (`FACTORY_RUNBOOK.md` §5). Histórico completo vive no git/Issues — este arquivo é o ponto de partida da próxima sessão.

## Última atualização

2026-09-07 · **P0.3-C (#56) e #73 merged via L2** · PRM-P0.3-A (#54 política de senha, PR #80 `6313cab`), PRM-P0.3-B (#55 rate-limit, PR #81 `69e0950`) DONE+MERGED · **PRM-P0.3-C (#56 Identidade de serviço do FD, `actor_type='servico'`) QA APROVADO (ciclo 2) → merge L2 squash (PR #89, `Closes #56`)** · **#73 (bug P0 — cancelar ciclo ativado) QA APROVADO → merge L2 squash (PR #91, `Closes #73`)** · regressão P0 `nodemailer@10` (Issue #83) detectada e corrigida (PR #84 `7b96fd6`, merge L2 squash) · Especificação oficial do MVP v1.0 registrada (PR #82 docs, L3 humano) · **#93 (dívida de lint MD037 da main) merged via L2 (`dd48cf0`)** · **#94 (correções P0/P1 de UX/UI) implementada + QA completo na main base `dd48cf0`** · Factory V2 operacional (Orchestrator + estados V2)

### Reconciliado nesta sessão

- **#93 (dívida de lint da main) merged via L2 (squash, `dd48cf0`)**: fix MD037 (trailing spaces) em `FACTORY_STATUS.md`; restaura `npm run lint:docs` verde na main.
- **#94 (Issue P1: correções de UX/UI da auditoria) IMPLEMENTADA na branch `feat/94-ux-correcoes-p0p1`** (base `dd48cf0`): modal acessível (`Modal.tsx` — `role=dialog`, `aria-modal`, `aria-labelledby`, trap de foco, `data-autofocus`, retorno de foco), menu mobile real (topbar com hambúrguer `aria-expanded/aria-controls`, backdrop, Escape), tokens de marca navy/teal no lugar de `#2563eb`, coluna **Contexto** legível em ciclos/exceções, tabelas em `.table-responsive`, `aria-live`/`role` em alertas, `:focus-visible` global, `badge-aberto`/`badge-expirado`. **QA completo: web unit 25/25, API 108(+2 skip), E2E Selenium 31/31, lint/typecheck/build verdes + Visual QA programático 10/11.**

- **P0.3-C (#56) implementada e merged via L2 (PR #89)**: QA APROVADO (ciclo 2) → squash merge L2 do PR `feat/56-identidade-servico` na main. Correções pós-QA aplicadas: (i) MAJOR — entry point canônico `apps/api/src/runtime/main.ts` injeta `serviceId: requireServiceId()` (CA-C-1/CA-C-3 no caminho de produção); (ii) MINOR-1 — `RecebedorPeriodico` propaga `serviceId` (evento `receber` com `actor_type='servico'`, default `sistema` retrocompatível); (iii) MINOR-2 — teste CA-C-2 refinado com request HTTP real.
- **#73 (bug P0) cancelamento de ciclo implementado e merged via L2 (PR #91)**: QA APROVADO → squash merge L2 do PR `fix/73-cancelar-ciclo` na main. Entregue: endpoint `POST /ciclos/:cicloId/cancelar` (idempotente, RLS), guarda `c.estado='aberto'` em `cobrarItem`/`reenviarItem`, UI (botão Cancelar + confirmação + motivo + badge Cancelado + ações desabilitadas), testes API (8) + web + E2E Selenium verdes.
- **P0.2 docs encerrados**: PR #79 (`53ed958`) merged pelo humano (Owner) — encerramento formal da auditoria (#9).
- **P0.3 entregue**: HG-PR-SEC aprovado (06/09) desbloqueou #54/#55 (∥, agente: pleno). #54 → PR #80 (`6313cab`, merged pelo humano 06/09, Issue CLOSED nesta sessão com evidência). #55 → PR #81 (`69e0950`, merge L2 squash nesta sessão, Issue CLOSED via `Closes #55`).
- **Regressão P0 `nodemailer@10` (#83)**: bump do dependabot (#75) removeu o namespace de tipos `nodemailer.Transporter` → build `@servium/api` falhava (TS2503) e `main` vermelha desde `6313cab`. Causa mascarada por `node_modules` local desatualizado (6.10.1 vs lockfile 10.0.0). Corrigido no PR #84 (`7b96fd6`, 1 arquivo), merge L2 squash.
- **Spec oficial do MVP v1.0** (experiência visual/UX) registrada em `docs/product/MVP_EXPERIENCE_SPEC_v1.md` via PR #82 (docs, L3 humano).
- **HG-RETENÇÃO** permanece `DEFERRED` (política numérica pendente).
- **L2 merges registrados**: #76 (`150188f`), #77 (`8617afd`), #78 (`7efd68a`); sessões anteriores #84 (`7b96fd6`), #81 (`69e0950`); **esta sessão #89 (P0.3-C #56) e #91 (bug #73)**.

## Estado geral

| Dimensão | Estado |
|---|---|
| Branch de trabalho | `main` sincronizada (`dd48cf0`) — branch ativa: `feat/94-ux-correcoes-p0p1` |
| Estado do MVP-01 | **P0.1 resolvido** (PRs #61–#66) + **P0.2 resolvido** (PRs #76/#77/#78) + **P0.3-A/B resolvido** (#54/#55, PRs #80/#81) + **P0.3-C (#56) MERGED (PR #89)** + **Bug P0 #73 MERGED (PR #91)** — resta P0.3-D (#57) |
| Software Factory | **V2 OPERACIONAL** — Orchestrator + estados V2 aprovados (HG-F2-01/02/03) |
| Meta canônica | [`../product/MVP_01_VERTICAL_SLICE.md`](../product/MVP_01_VERTICAL_SLICE.md) — primeiro Funcionário Digital em operação assistida no piloto |
| ADRs 001..011 | `Accepted` (HG-002); ADR-008 `CommunicationChannel` preservado (HG-008) |
| Backlog | Canônico em [`../product/INITIAL_BACKLOG.md`](../product/INITIAL_BACKLOG.md) |
| Relatório da reconciliação | [`../reports/POST_MVP_BACKLOG_RECONCILIATION.md`](../reports/POST_MVP_BACKLOG_RECONCILIATION.md) |
| Relatório de encerramento P0.2 | [`../reports/P0_2_REMEDIATION_CLOSURE_REPORT.md`](../reports/P0_2_REMEDIATION_CLOSURE_REPORT.md) |
| Especificação oficial do MVP v1.0 | [`../product/MVP_EXPERIENCE_SPEC_v1.md`](../product/MVP_EXPERIENCE_SPEC_v1.md) — *aguardando aprovação humana* (PR #82, L3) |

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

> PRs **#90** (mapeamento ASVS 4.0.3, P0.3-D #57) e **#92** (Blueprint Fase 2, épico de experiência) permanecem **`HUMAN_REVIEW` (L3)** — fora da autonomia L2 desta sessão.

## Fila efetiva (Project `Servium IA Development`)

> **PRE-PUSH VALIDATION GATE: ACTIVE** — docs → `npm run lint:docs`; código → `npm ci` + `npm run db:up` + `npm run verify`. Falha local ⇒ sem push.

| Issue | Item | Prioridade | Status real | Observação |
|---|---|---|---|---|
| [#9](https://github.com/rnsilveira22/servium/issues/9) | Auditoria append-only (**P0.2**) | P0 | **DONE no board** / Issue OPEN (aguarda fechamento formal) | CA-01/02 (reconciliação §5), CA-03 (#52), CA-04 (#51), CA-05 (#53) todos entregues; PR #79 merged humanamente; drift do board (Done/P1 vs OPEN/P0) registrado |
| [#20](https://github.com/rnsilveira22/servium/issues/20) | N5 Auth mínima (**P0.3** hardening) | P0 | OPEN | HG-PR-SEC aprovado (06/09); **#54 (senha) e #55 (rate-limit) entregues e CLOSED** (PRs #80/#81); **#56 (identidade serviço, P0.3-C) merged via L2 (PR #89)** — resta #57 (ASVS docs, P0.3-D) |
| [#56](https://github.com/rnsilveira22/servium/issues/56) | **PRM-P0.3-C · Identidade de serviço do FD (`actor_type='servico'`)** | P0 | **MERGED** (PR #89, squash L2) | CA-C-1/2/3 implementados e testados: runtime canônico (`main.ts`) injeta `serviceId: requireServiceId()`; recebimento propaga `serviceId` (evento `receber` com `actor_type='servico'`); CA-C-2 refinado com request HTTP real (`login_sucesso` ⇒ `actor_type='operador'`); evidência em `apps/api/test/identidade-servico.test.ts` · **QA APROVADO (ciclo 2) → merge L2** + `Closes #56` |
| [#73](https://github.com/rnsilveira22/servium/issues/73) | Bug P0 (funcional) | P0 | **MERGED** (PR #91, squash L2) | Cancelar ciclo ativo (#73): endpoint `POST /ciclos/:cicloId/cancelar` (+ `cancelar-ciclo.ts`), guarda `c.estado='aberto'` em `cobrarItem`, bloqueia `reenviarItem` em ciclo não aberto, UI (botão Cancelar + confirmação + motivo + badge Cancelado + ações desabilitadas). Testes API (8), web e E2E Selenium verdes (CI) · **QA APROVADO → merge L2** + `Closes #73` |
| [#72](https://github.com/rnsilveira22/servium/issues/72) | Gap P1 | P1 | OPEN | aguarda próxima onda |
| [#94](https://github.com/rnsilveira22/servium/issues/94) | **Correções P0/P1 UX/UI (auditoria Fase 1)** | P1 | IMPLEMENTED — PR em análise | Branch `feat/94-ux-correcoes-p0p1`: a11y (modais, menu mobile, `aria-live`, `:focus-visible`), marca navy/teal, contexto de exceção, tabelas responsivas, badges. Unit/E2E/Visual QA verdes — pendente PR/merge |
| [#58](https://github.com/rnsilveira22/servium/issues/58) | Backlog P2 | P2 | OPEN | aguarda próxima onda |
| [#59](https://github.com/rnsilveira22/servium/issues/59) | Backlog P2 | P2 | OPEN | aguarda próxima onda |
| [#83](https://github.com/rnsilveira22/servium/issues/83) | **P0-regressão `nodemailer@10`** | P0 | **CLOSED** (PR #84 `7b96fd6`) | detectada nesta sessão; causava CI vermelho na main |

Issues fechadas nesta sessão: **#56 (PR #89), #73 (PR #91)** — além de #54 (PR #80), #55 (PR #81), #83 (PR #84) em sessões anteriores. Issues fechadas sessão anterior: #51 (PR #76), #52 (PR #77), #53 (PR #78), #45–#49 (HG-REC-01), #50 (PR #66).

## Bloqueios / aguardando humano

| Item | Tipo | Ação necessária |
|---|---|---|
| **HG-RETENÇÃO** | Decisão de produto | Definir política numérica de retenção (prazo/volume) para habilitar purge futuro; durante piloto mantém preservação integral |
| **Fechar Issue #9** | Encerramento formal | Comentar cobertura CA-01→CA-05 + fechar (decisão do Owner); corrigir drift do board (Done/P1 vs OPEN/P0) |
| **Drift do board #9** | Governança | Corrigir Status/Priority no board; migrar campo Status p/ estados V2 (web/admin) |
| **PR #82** (spec MVP v1.0) | L3 humano | Merge/ajustes da Especificação Oficial do MVP v1.0 (`docs/product/MVP_EXPERIENCE_SPEC_v1.md`) |
| **PR #90** (ASVS P0.3-D, #57) | L3 humano | Gate 4.6 (segurança docs); merge humano pendente |
| **PR #92** (Blueprint Fase 2 UX/UI) | L3 humano | Proposta de produto; merge/ajustes humano pendente |
| **PR #94** (#94 UX/UI) | L2 | Após CI verde + QA + PO — merge squash normal (classe docs/código com cobertura) |
| **P0.3-D** (#57) | Implementação | Mapeamento ASVS 4.0.3 (docs) — PR #90 aguarda L3 humano |
| Deploy/piloto no cliente real | Gate próprio | Após `PILOT_READY` |

## Próximos passos

1. **PR #94 (#94 UX/UI)**: push branch `feat/94-ux-correcoes-p0p1` + PR `Closes #94`; após CI verde (lint/build/typecheck/tests + e2e), avaliar merge L2;
2. **P0.3 restante**: #57 (mapeamento ASVS docs, P0.3-D — PR #90 aguarda L3 humano);
3. **Especificação MVP v1.0 (PR #82) e Blueprint Fase 2 (PR #92)**: merge humano (L3);
4. Fechar Issue #9 (comentário rastreável + decisão do Owner); corrigir drift do board;
5. Definir HG-RETENÇÃO (política de retenção);
6. Priorizar #72/#58/#59 na próxima onda;
7. Avaliar desativação da V1 após 2+ ciclos V2 com gates verdes (nunca automática).
