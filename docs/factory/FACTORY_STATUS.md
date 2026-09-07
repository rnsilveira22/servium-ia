# Factory Status — ServiumAI

> Snapshot vivo do estado da factory. Atualizado ao fim de cada sessão (`FACTORY_RUNBOOK.md` §5). Histórico completo vive no git/Issues — este arquivo é o ponto de partida da próxima sessão.

## Última atualização

2026-09-06 · **P0.2 AUDITORIA CONCLUÍDA + HG-PR-SEC APROVADO** · HEAD `7efd68a` · PRM-P0.2-A (#51, PR #76 `150188f`), PRM-P0.2-B (#52, PR #77 `8617afd`), PRM-P0.2-C (#53, PR #78 `7efd68a`) todos DONE+MERGED · Issues #51/#52/#53 CLOSED · **P0.3 liberada** (HG-PR-SEC aprovado em 06/09: senha min 12; rate-limit 5/15min conta, 30/5min IP) · Factory V2 operacional (Orchestrator + estados V2)

### Reconciliado nesta sessão

- **P0.2 AUDITORIA resolvida**: CA-03 (atomicidade), CA-04 (leitura consultável), CA-05 (documento `EVENTOS_AUDITORIA.md`) — três PRs squash mergeados na main, gates 1–5 (4.5 N/A) aprovados em cada item.
- **Issues #45–#49** fechadas (HG-REC-01, sessão anterior). #50 fechada (PR #66).
- **HG-RETENÇÃO** registrada como `DEFERRED` no HUMAN_DECISIONS_LOG (política numérica pendente).
- **HG-PR-SEC** registrada como `NEEDS:DECISION` no HUMAN_DECISIONS_LOG (P0.3 bloqueada).
- **L2 merges registrados**: #76 (`150188f`), #77 (`8617afd`), #78 (`7efd68a`).

## Estado geral

| Dimensão | Estado |
|---|---|
| Branch de trabalho | `main` sincronizada (`7efd68a`) |
| Estado do MVP-01 | **P0.1 resolvido** (PRs #61–#66) + **P0.2 resolvido** (PRs #76/#77/#78) — restam P0.3 (#54/#55, BLOQUEADA HG-PR-SEC) antes de `PILOT_READY` |
| Software Factory | **V2 OPERACIONAL** — Orchestrator + estados V2 aprovados (HG-F2-01/02/03) |
| Meta canônica | [`../product/MVP_01_VERTICAL_SLICE.md`](../product/MVP_01_VERTICAL_SLICE.md) — primeiro Funcionário Digital em operação assistida no piloto |
| ADRs 001..011 | `Accepted` (HG-002); ADR-008 `CommunicationChannel` preservado (HG-008) |
| Backlog | Canônico em [`../product/INITIAL_BACKLOG.md`](../product/INITIAL_BACKLOG.md) |
| Relatório da reconciliação | [`../reports/POST_MVP_BACKLOG_RECONCILIATION.md`](../reports/POST_MVP_BACKLOG_RECONCILIATION.md) |
| Relatório de encerramento P0.2 | [`../reports/P0_2_REMEDIATION_CLOSURE_REPORT.md`](../reports/P0_2_REMEDIATION_CLOSURE_REPORT.md) |

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

## Fila efetiva (Project `ServiumAI Development`)

> **PRE-PUSH VALIDATION GATE: ACTIVE** — docs → `npm run lint:docs`; código → `npm ci` + `npm run db:up` + `npm run verify`. Falha local ⇒ sem push.

| Issue | Item | Prioridade | Status real | Observação |
|---|---|---|---|---|
| [#9](https://github.com/rnsilveira22/servium/issues/9) | Auditoria append-only (**P0.2**) | P0 | **DONE no board** / Issue OPEN (aguarda fechamento formal) | CA-01/02 (reconciliação §5), CA-03 (#52), CA-04 (#51), CA-05 (#53) todos entregues; drift do board (Done/P1 vs OPEN/P0) registrado |
| [#20](https://github.com/rnsilveira22/servium/issues/20) | N5 Auth mínima (**P0.3** hardening) | P0 | OPEN / **LIBERADA** | HG-PR-SEC aprovado (06/09); #54 (senha, min 12) e #55 (rate-limit 5/15min conta, 30/5min IP) desbloqueadas — A∥B, agente: pleno |
| [#73](https://github.com/rnsilveira22/servium/issues/73) | Bug P0 (funcional) | P0 | OPEN | aguarda próxima onda |
| [#72](https://github.com/rnsilveira22/servium/issues/72) | Gap P1 | P1 | OPEN | aguarda próxima onda |
| [#58](https://github.com/rnsilveira22/servium/issues/58) | Backlog P2 | P2 | OPEN | aguarda próxima onda |
| [#59](https://github.com/rnsilveira22/servium/issues/59) | Backlog P2 | P2 | OPEN | aguarda próxima onda |
| [#75](https://github.com/rnsilveira22/servium/pull/75) | dependabot: bump nodemailer/qs | — | PR OPEN (base main) | decisão humana: manter ou fechar |

Issues fechadas nesta sessão: #51 (PR #76), #52 (PR #77), #53 (PR #78). Issues fechadas sessão anterior: #45–#49 (HG-REC-01), #50 (PR #66).

## Bloqueios / aguardando humano

| Item | Tipo | Ação necessária |
|---|---|---|
| **HG-RETENÇÃO** | Decisão de produto | Definir política numérica de retenção (prazo/volume) para habilitar purge futuro; durante piloto mantém preservação integral |
| **HG-PR-SEC** | P0.3 (#54/#55) | ✅ RESOLVIDO (2026-09-06) — valores aprovados; A∥B liberadas |
| **Fechar Issue #9** | Encerramento formal | Comentar cobertura CA-01→CA-05 + fechar (decisão do Owner) |
| **Drift do board #9** | Governança | Corrigir Status/Priority no board (Done/P1 vs realidade); migrar campo Status p/ estados V2 (web/admin) |
| **PR #75** (dependabot) | Externo | Decidir manter (deps em 3 dirs) ou fechar antes do piloto |
| Deploy/piloto no cliente real | Gate próprio | Após `PILOT_READY` |

## Próximos passos

1. Implementar P0.3: **#54 ∥ #55** (senha + rate-limit, agente: pleno) → #56 (identidade serviço) → #57 (ASVS docs);
2. Fechar Issue #9 (comentário rastreável + decisão do Owner);
3. Definir HG-RETENÇÃO (política de retenção);
4. Avaliar PR #79 (docs de encerramento, L3 humano) e PR #75 (dependabot — MERGED 06/09);
5. Priorizar #73/#72/#58/#59 na próxima onda;
6. Avaliar desativação da V1 após 2+ ciclos V2 com gates verdes (nunca automática).
