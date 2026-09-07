# Development Workflow — Servium IA

> Fluxo oficial e máquina de estados canônica da Factory V2 (aprovada via **HG-F2-02**). Fonte operacional: GitHub Issues + Project `Servium IA Development` (campo `Status`). Uma única máquina de estados; nunca criar estado paralelo.

## Máquina de estados canônica (14 estados)

```text
OPEN
  ↓ (Gate 1 — Definition of Ready, PO)
PO_APPROVED
  ↓ (servium-senior — Gate 2 Technical Ready)
TECH_READY
  ↓ (servium-pleno — Gate 3 DEV checklist)
IMPLEMENTING
  ↓ (handoff Dev→QA)
QA_REVIEW
  ├─ reprovado → QA_FAILED → IMPLEMENTING → QA_REVIEW   (loop máx. 3)
  └─ aprovado → QA_APPROVED
                  ↓ (Gate 4.5 — Human Review, quando aplicável)
              HUMAN_REVIEW
                  ↓ (servium-po — Gate 5 Acceptance)
              PO_ACCEPTED
                  ↓ (merge concluído)
              DONE
```

Estados laterais: `BLOCKED`, `AWAITING_DECISION`, `REJECTED`, `ESCALATED_TECHNICAL_FAILURE`.

Toda transição é validada/executada pelo **Orchestrator** a partir do retorno do agente responsável (ver `AGENT_ORCHESTRATION.md` §1/§4 e `ORCHESTRATOR.md`).

## Regra de DONE

`DONE = QA_APPROVED AND PO_ACCEPTED AND MERGED`

Não existe exceção automática. Nenhum agente pode marcar `DONE` sozinho. `PO_ACCEPTED` sem merge concluído não é `DONE`.

## Responsabilidade por estado

| Estado | Responsável | Ação que habilita a transição |
|---|---|---|
| OPEN | servium-po | Completar DoR (Gate 1) |
| PO_APPROVED | servium-po → senior | Handoff PO→Senior / início da análise |
| TECH_READY | servium-senior | Análise técnica completa (Gate 2) |
| IMPLEMENTING | servium-pleno/senior | Implementação + evidências (Gate 3) |
| QA_REVIEW | servium-reviewer-qa | Veredito formal único (Gate 4) |
| QA_FAILED | qa → dev | Achados estruturados (loop máx. 3) |
| QA_APPROVED | reviewer-qa → orchestrator | Handoff QA→(Human Review/PO) |
| HUMAN_REVIEW | humano | Decisão humana formal (quando exigida) |
| PO_ACCEPTED | servium-po | ACCEPTED/REJECTED com evidência (Gate 5) |
| DONE | — | Merge concluído + Issue fechada |
| BLOCKED | orchestrator | Impedimento com condição de desbloqueio |
| AWAITING_DECISION | orchestrator | `HUMAN_DECISION_REQUIRED` emitido |
| REJECTED | servium-po | Rejeição com justificativa + destino |
| ESCALATED_TECHNICAL_FAILURE | orchestrator | 3× reprovação ou falha técnica recorrente |

## Mapa para o campo `Status` do GitHub Project

| V1 (antigo) | V2 (novo) |
|---|---|
| Backlog | OPEN |
| Ready | PO_APPROVED |
| Tech Analysis | TECH_READY (funde com Ready for Development) |
| Ready for Development | TECH_READY |
| In Development / In Review | IMPLEMENTING |
| Ready for QA / QA Review | QA_REVIEW (funde os dois) |
| Changes Requested | QA_FAILED |
| QA Approved | QA_APPROVED |
| (novo) | HUMAN_REVIEW |
| PO Acceptance | PO_ACCEPTED |
| Done | DONE |
| Blocked / Needs Decision / Rejected / Escalated Technical Failure | BLOCKED / AWAITING_DECISION / REJECTED / ESCALATED_TECHNICAL_FAILURE |

## Rastreabilidade obrigatória

Toda história deve permitir reconstruir:

`Epic → Issue (#N) → Technical Analysis → Branch (<prefixo>/N-...) → Commits → Pull Request → CI → QA Review → Human Review (se aplicável) → PO Acceptance → Merge → DONE`

O número da Issue é o ID canônico (`#23` / `SRV-23`). Não existe sistema paralelo de IDs.

## Regras transversais

1. Nenhuma alteração silenciosa de escopo: expansão vira Issue nova ou decisão documentada.
2. Nenhuma aprovação sem evidência registrada.
3. ADRs `Proposed` bloqueiam desenvolvimento dependente até decisão humana.
4. Histórias fictícias/dry runs vivem em `docs/factory/dry-run/` ou Issues marcadas e fechadas ao final.
