# Handoff Contracts — Servium IA (V2)

> Contratos de troca entre agentes, intermediados pelo **Orchestrator** (hub). Um handoff incompleto devolve a história ao estado anterior. A V1 (`FACTORY_RUNBOOK.md`) permanece como fallback; estados V2 por `DEVELOPMENT_WORKFLOW.md`.

## Fluxo V2 (hub Orchestrator)

```text
PO ──(Gate 1)──▶ Orchestrator ──▶ Senior ──(Gate 2)──▶ Orchestrator ──▶ Pleno
   ◀── evidência ◀────────────        ◀── evidência ◀─────────────
Pleno ──(Gate 3)──▶ Orchestrator ──▶ QA ──(Gate 4)──▶ Orchestrator ──▶ [Human Review] ──▶ PO
   ◀── evidência ◀────────────        ◀── evidência ◀─────────────        (Gate 5)
```

O Orchestrator transmite o pacote completo de contexto e valida a saída obrigatória + evidências antes de mover estado (`ORCHESTRATOR.md` §6).

## PO → Orchestrator → Senior (entrada: `PO_APPROVED`)

| Campo | Obrigatório |
|---|---|
| Issue (`#N`) | ✅ |
| Objetivo | ✅ |
| Critérios de aceite | ✅ |
| Regras de negócio | ✅ quando aplicável |
| Prioridade (P0–P3) | ✅ |
| Dependências | ✅ |
| Restrições | ✅ |
| Dúvidas conhecidas | ✅ (ou "nenhuma") |

Verificação: Gate 1 — Definition of Ready (`QUALITY_GATES.md`).

## Orchestrator → Senior → Orchestrator → Pleno (entrada: `TECH_READY`)

| Campo | Obrigatório |
|---|---|
| Issue | ✅ |
| Technical Analysis (link/comentário) | ✅ |
| Tarefas decompostas com responsável | ✅ |
| Módulos afetados | ✅ |
| Restrições técnicas | ✅ |
| Contratos afetados (APIs/eventos/schemas) | ✅ (ou "nenhum") |
| Testes esperados | ✅ |
| Riscos | ✅ |

## Orchestrator → Dev → Orchestrator → QA (entrada: `QA_REVIEW`, via PR)

| Campo | Obrigatório |
|---|---|
| Issue + PR (`Closes #N`) | ✅ |
| Resumo da implementação | ✅ |
| Arquivos/módulos alterados | ✅ |
| Testes criados + execução real | ✅ |
| Status do CI | ✅ |
| Critérios cobertos | ✅ |
| Limitações e riscos residuais | ✅ (ou "nenhuma") |
| Decisões técnicas tomadas | ✅ (ou "nenhuma") |
| Migration (quando houver) | condicional |

## QA → Dev (saída: `QA_FAILED`)

Cada achado deve conter:

1. Achado (descrição)
2. Severidade (`CRITICAL/HIGH/MEDIUM/LOW/INFO`)
3. Arquivo/componente
4. Evidência
5. Comportamento esperado
6. Critério violado
7. Recomendação

Destino: Sênior ou Pleno, conforme atribuição da análise técnica. Loop máximo 3 → `ESCALATED_TECHNICAL_FAILURE`.

## QA → PO (saída: `APPROVED`)

Registrar: QA Status · testes executados · regressão avaliada · segurança avaliada · arquitetura verificada · pendências não bloqueantes · confirmação técnica explícita.

## Orchestrator → Humano (Gate 4.5)

Quando o item entra em `HUMAN_REVIEW`: entregar ao humano o pacote de evidências (PR, QA, análise) e a `HUMAN_DECISION_REQUIRED` no formato canônico (`HUMAN_GATES.md`). Sem decisão registrada, o item permanece parado — silêncio ≠ aprovação.

## PO → DONE

PO registra `ACCEPTED` com evidência ou justificativa. Somente então, **com merge concluído**, a história vai a `DONE`.

Regra formal invariável: **`DONE = QA_APPROVED AND PO_ACCEPTED AND MERGED`**.
