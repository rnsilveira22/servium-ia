# Factory Status — Servium IA

> Snapshot vivo do estado da factory. Atualizado ao fim de cada sessão (`FACTORY_RUNBOOK.md` §5). Histórico completo vive no git/Issues — este arquivo é o ponto de partida da próxima sessão.

## Última atualização

2026-09-08 · **P0.3-D (#57 ASVS) MERGED (PR #90, rebase L3, `a8c057a`, `Closes #57`)** · **Blueprint UX/UI Fase 2 MERGED (PR #92, squash L3, `731c009`)** · **P0.3-C (#56) e #73 merged via L2** · PRM-P0.3-A (#54 política de senha, PR #80 `6313cab`), PRM-P0.3-B (#55 rate-limit, PR #81 `69e0950`) DONE+MERGED · **PRM-P0.3-C (#56 Identidade de serviço do FD, `actor_type='servico'`) merged L2 squash (PR #89, `Closes #56`)** · **#73 (bug P0 — cancelar ciclo ativado) merged L2 squash (PR #91, `Closes #73`)** · regressão P0 `nodemailer@10` (Issue #83) detectada e corrigida (PR #84 `7b96fd6`, merge L2 squash) · Especificação oficial do MVP v1.0 registrada (PR #82 docs, **merged**) · **#93 (dívida de lint MD037 da main) merged via L2 (`dd48cf0`)** · **#94 (correções P0/P1 de UX/UI) IMPLEMENTADA + QA completo → MERGED via PR #95 (`30744fa`, `Closes #94`)** · Factory V2 operacional (Orchestrator + estados V2)

### Reconciliado nesta sessão

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
| Estado do MVP-01 | **P0.1 resolvido** (PRs #61–#66) + **P0.2 resolvido** (PRs #76/#77/#78) + **P0.3-A/B resolvido** (#54/#55, PRs #80/#81) + **P0.3-C (#56) MERGED (PR #89)** + **Bug P0 #73 MERGED (PR #91)** + **UX/UI #94 MERGED (PR #95)** + **P0.3-D (#57/ASVS) MERGED (PR #90, L3) + Blueprint Fase 2 (PR #92, L3) MERGED** — P0.3 restante: 0 · **UX Fase 2: M0 APROVADO (HG-UX-M0, 08/09)** — M1..M5 NÃO autorizados |
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

> **L2 merges**: #76/#77/#78, #84, #81, #89, #91, #93, #95. **Merges L3 humanos (2026-09-08)**: PR #90 (ASVS #57, rebase `a8c057a`) e PR #92 (Blueprint Fase 2, squash `731c009`). **Nenhum PR aberto** — fila L2/L3 zerada; próxima atividade fica condicionada a novos gates.

## Fila efetiva (Project `Servium IA Development`)

> **PRE-PUSH VALIDATION GATE: ACTIVE** — docs → `npm run lint:docs`; código → `npm ci` + `npm run db:up` + `npm run verify`. Falha local ⇒ sem push.

| Issue | Item | Prioridade | Status real | Observação |
|---|---|---|---|---|
| [#9](https://github.com/rnsilveira22/servium/issues/9) | Auditoria append-only (**P0.2**) | P0 | **DONE no board** / Issue OPEN (aguarda fechamento formal) | CA-01/02 (reconciliação §5), CA-03 (#52), CA-04 (#51), CA-05 (#53) todos entregues; PR #79 merged humanamente; drift do board (Done/P1 vs OPEN/P0) registrado |
| [#20](https://github.com/rnsilveira22/servium/issues/20) | N5 Auth mínima (**P0.3** hardening) | P0 | OPEN | HG-PR-SEC aprovado (06/09); **#54, #55, #56, #73, #57 entregues e CLOSED** (PRs #80/#81/#89/#91/#90) — P0.3 DONE |
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
| **PR #92** (Blueprint Fase 2 UX/UI) | L3 humano | **MERGED** (`731c009`, squash, 08/09) — proposta registrada; **implementação Fase 2: M0 APROVADO (HG-UX-M0)** |
| **Implementação UX Fase 2** (E-01..E-08) | L3 humano | **M0 autorizado** (08/09, HG-UX-M0); **M1..M5, novos endpoints e regras de domínio NÃO autorizados** — cada milestone sujeito a Human Gate próprio |
| **P0.3-D** (#57) | Implementação | **MERGED** (PR #90 `a8c057a`) — Issue #57 CLOSED; CA-D-3 pendente |
| Deploy/piloto no cliente real | Gate próprio | Após `PILOT_READY` |

## Próximos passos

1. **Fechar Issue #9** (comentário rastreável + decisão do Owner); corrigir drift do board;
2. **Definir HG-RETENÇÃO** (política de retenção numérica);
3. **Registrar CA-D-3** (revisão de segurança do ASVS pela pessoa responsável) no `HUMAN_DECISIONS_LOG` — condição para `PILOT_READY`;
4. **Implementar M0 — Fundação Visual** (autorizado por HG-UX-M0): E-01 Design System, E-02 Componentes Base, Menu Mobile, Acessibilidade — PR próprio `feat(web): implement UX foundation M0`, escopo restrito a `apps/web`; **M1..M5 permanecem NÃO autorizados**;
5. Priorizar #72/#58/#59 na próxima onda;
6. Avaliar desativação da V1 após 2+ ciclos V2 com gates verdes (nunca automática).
