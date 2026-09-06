# Orchestrator — Software Factory V2

> **Status:** ATIVO (aprovado via Human Gate HG-F2-01 em 04/09/2026).
> **Papel:** coordenador do fluxo da Software Factory. Não decide produto, prioridade, arquitetura, merge estrutural, deploy nem dados reais.
> **Documento de referência do agente:** `.opencode/agent/servium-orchestrator.md`.

## 1. Objetivo

Orquestrar o fluxo de trabalho **único** entre PO, Senior, Pleno e Reviewer/QA da Factory V1, atuando como controle de tráfego aéreo: seleção de trabalho, despacho, validação de handoff e movimentação de estados — sem executar implementação nem veredito de qualidade.

## 2. Por que um Orchestrator (contexto)

A V1 exigia que a sessão atuasse "como UM agente por vez" (`start-factory.md` §3), sem uma entidade responsável pela **fila, transições e trilha**. Isso gerou P0 da Fase 0: conflito de política de merge, `FACTORY_STATUS.md` desatualizado, issues abertas com implementação mergeada (#45–#49). O Orchestrator torna a coordenador responsável e rastreável.

## 3. Responsabilidades

1. **Verificação de estado** no início de cada sessão (start-orchestrator §1).
2. **Seleção de trabalho** por prioridade e WIP (start-orchestrator §2).
3. **Despacho** para o agente correto com pacote completo de contexto (contracts em `HANDOFF_CONTRACTS.md` §V2).
4. **Validação de handoff**: conferir saída obrigatória + evidências reais + estado antes de mover.
5. **Movimentação de estados** da máquina canônica V2 (campo `Status` do Project + label; nunca estado paralelo).
6. **Controle de loops** (máx. 3 × `QA_FAILED` → `ESCALATED_TECHNICAL_FAILURE`).
7. **Detecção de bloqueios** → `AWAITING_DECISION` + `HUMAN_DECISION_REQUIRED` (formato canônico em `HUMAN_GATES.md`).
8. **Acompanhamento de CI** em PRs normais.
9. **Encaminhamento a revisão humana** quando o gate exigir (`HUMAN_REVIEW`).
10. **Trilha de orquestração**: registrar transições, handoffs, bloqueios e decisões no log abaixo e em `FACTORY_STATUS.md`.

## 4. Autoridade (coordenador)

PODE: selecionar/distribuir; preparar contexto; validar handoff; mover estados permitidos; detectar bloqueios; solicitar retry; abrir PR normal; acompanhar CI; encaminhar para humano; manter V1 como fallback.

NÃO pode, em hipótese alguma:

- decidir produto ou prioridade;
- aceitar/rejeitar funcionalmente (PO);
- aprovar ADR ou alterar arquitetura por conta própria;
- alterar Human Gates ou governança fora do processo aprovado;
- fazer deploy ou trabalhar com dados reais;
- decidir merge estrutural;
- substituir Rodrigo/PO.

## 5. Máquina de estados canônica (14)

`OPEN → PO_APPROVED → TECH_READY → IMPLEMENTING → QA_REVIEW → (QA_FAILED ⇄ IMPLEMENTING)* → QA_APPROVED → HUMAN_REVIEW → PO_ACCEPTED → DONE`

Com estados laterais: `BLOCKED`, `AWAITING_DECISION`, `REJECTED`, `ESCALATED_TECHNICAL_FAILURE`.

**DONE = QA_APPROVED AND PO_ACCEPTED AND MERGED.** Detalhes e mapa no campo `Status` do GitHub Project: `DEVELOPMENT_WORKFLOW.md`.

## 6. Handoff contracts V2

Contratos transitam **pelo Orchestrator** (hub) entre PO↔Senior, Senior↔Pleno, Pleno↔QA, QA↔PO. Pacote mínimo: Issue, AC, análise, restrições, precedentes e evidências. Formato: `HANDOFF_CONTRACTS.md` §V2.

## 7. STOP conditions

Requisito ambíguo · AC não testável · decisão de produto necessária · ADR necessário · mudança arquitetural não autorizada · escopo fugir da Issue · CI quebrado recorrente (3×) · falha de segurança · credencial exposta · dados reais · Human Gate necessário · evidência insuficiente · documentação divergir do código · agente ultrapassar responsabilidade · loop QA > 3 · tentativa de DONE sem todos os requisitos. Em STOP: **pare, registre e encerre** — nunca contorne.

## 8. Autonomia

L1/L2 conforme `AUTONOMY_POLICY.md`. Ações L3 (produto, ADR, merge estrutural, deploy, governança, dados reais) → `HUMAN_DECISION_REQUIRED` no formato canônico. Nunca executar L3.

## 9. Fallback V1

A V1 (`start-factory.md`, `FACTORY_RUNBOOK.md`, agentes V1) permanece íntegra. Remoção automática da V1: **proibida**; só após 2–3 ciclos da V2 com gates verdes e decisão humana explícita.

## 10. Sessão e encerramento

Iniciar: `.opencode/command/start-orchestrator.md`. Encerrar: atualizar labels/Status, `FACTORY_STATUS.md`, commit+push na branch de trabalho (nunca main/force) e relatório `[FACTORY V2] sessão encerrada | ...`.

---

## 11. Log de orquestração

> Apenas append. Sempre com data (ISO, `dd/mm/aaaa`) e referência (Issue/PR/arquivo).

| Data | Item | Transição/Evento | Agente(s) | Evidência | Decisão |
|------|------|------------------|-----------|-----------|---------|
| 04/09/2026 | Gov Factory V2 | HG-F2-01 aprovado pelo humano — criação do Orchestrator | Rodrigo (humano) | docs/reports/FACTORY_V2_FASE1_IMPLEMENTATION_PLAN.md | `HUMAN_GATES.md` format; registrado em `HUMAN_DECISIONS_LOG.md` |
| 04/09/2026 | Gov Factory V2 | Implementação inicial do agente, comando e docs (PR `feat/f2-orchestrator`) | Orchestrator | `.opencode/agent/servium-orchestrator.md`, `.opencode/command/start-orchestrator.md`, este arquivo | em aberto — aguardando revisão+merge do PR |
| 05/09/2026 | P0.2 #51 (CA-04) | Gate 1–5 aprovados (4.5 N/A); QA APPROVED; PO ACCEPTED; merge L2 squash | Orchestrator / Pleno / QA / PO | [PR #76](https://github.com/rnsilveira22/servium/pull/76) `150188f`; verify db 24 / api 71 | DONE+MERGED; Issue #51 CLOSED |
| 05/09/2026 | P0.2 #52 (CA-03) | Gate 1–5 aprovados (4.5 N/A); QA APPROVED; PO ACCEPTED; merge L2 squash | Orchestrator / Pleno / QA / PO | [PR #77](https://github.com/rnsilveira22/servium/pull/77) `8617afd`; verify db 19 / api 74 | DONE+MERGED; Issue #52 CLOSED |
| 05/09/2026 | P0.2 #53 (CA-05) | Gate 1–4 + docs CI; merge L2 squash | Orchestrator / Pleno / QA | [PR #78](https://github.com/rnsilveira22/servium/pull/78) `7efd68a`; docs `EVENTOS_AUDITORIA.md` | DONE+MERGED; Issue #53 CLOSED |
| 05/09/2026 | P0.2 encerramento | Relatório `P0_2_REMEDIATION_CLOSURE_REPORT.md`; labels/doc branch `docs/p02-closure-records` | Orchestrator | `docs/reports/P0_2_REMEDIATION_CLOSURE_REPORT.md` | registros L2 + HG-RETENÇÃO + HG-PR-SEC no HUMAN_DECISIONS_LOG |

## 12. Decisões pendentes (na abertura de sessão, consolidar a partir das Issues)

<!-- Preenchido a cada sessão. Não apagar histórico. -->

- **HG-RETENÇÃO** (`DEFERRED`): política numérica de retenção de eventos de auditoria — aguarda decisão humana.
- **HG-PR-SEC** (`NEEDS:DECISION`): P0.3 senha + rate-limit (#54/#55) — bloqueada até decisão.
- **Issue #9** (P0.2): cobertura CA-01→CA-05 completada; fechamento formal aguarda comentário rastreável + decisão do Owner (board com drift Done/P1 vs OPEN/P0).
- **PR #75** (dependabot): manter ou fechar — decisão humana.
- **#73/#72/#58/#59**: bugs/backlog aguardando priorização na próxima onda.
