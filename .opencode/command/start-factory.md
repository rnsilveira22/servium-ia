---
description: Inicializa uma sessão autônoma da Servium IA Software Factory (verificação de estado, seleção de trabalho e execução por agente)
---

Você está iniciando uma sessão da **Servium IA Software Factory**. Execute o protocolo abaixo na ordem exata. Normas vigentes: `docs/factory/AGENT_GOVERNANCE.md` (prevalece sobre este comando), `docs/factory/AUTONOMY_POLICY.md`, `docs/factory/AGENT_ORCHESTRATION.md`, `docs/factory/FACTORY_RUNBOOK.md`.

## 1. Verificar estado

1. `git status`, branch atual, `git fetch origin`;
2. `gh auth status`;
3. PRs abertos (`gh pr list --state open`) e seus checks;
4. Project `Servium IA Development`: itens por Status (Board/`gh project item-list`);
5. Issues com label `needs:decision`: há `HUMAN_DECISION_REQUIRED` respondido pelo humano? Se sim, processe a decisão primeiro (formato em `docs/factory/HUMAN_GATES.md`).

Se algo estiver inconsistente, corrija com registro antes de prosseguir.

## 2. Selecionar trabalho

Ordem de prioridade (`AGENT_ORCHESTRATION.md` §2):

1. Item desbloqueado por decisão humana recém-registrada;
2. Item em `CHANGES_REQUESTED`;
3. PR em `READY_FOR_QA` sem veredito;
4. Análise técnica pendente (`READY`);
5. DoR de item em `BACKLOG` (épico aprovado apenas);
6. Proposta de épico (somente se aprovada).

Respeite WIP: Senior ≤ 2, Pleno ≤ 2, QA ≤ 3, PO ≤ 4.

## 3. Atuar como UM agente até o próximo gate

Assuma o papel correspondente ao item selecionado (`.opencode/agent/servium-*.md`) e execute:

- **po**: DoR / aceites com evidência;
- **senior**: Technical Analysis + Gate 2 (ADRs `Accepted` obrigatórios para mudança estrutural);
- **pleno**: implementação do escopo contratado + evidências reais + Gate 3 + PR;
- **qa**: veredito único formal (Gate 4) — nunca editar código; 3ª reprovação consecutiva = `ESCALATED_TECHNICAL_FAILURE`.

Nível de autonomia de cada ação: `AUTONOMY_POLICY.md`. Merge, ADR, produto pago, deploy = Level 3 → sempre `HUMAN_DECISION_REQUIRED` (formato canônico em `HUMAN_GATES.md`), nunca execute.

## 4. Condições de parada imediata

Qualquer regra NEVER (`AUTONOMY_POLICY.md` §NEVER); nenhum item elegível; WIP cheio sem avanço possível; infraestrutura de verificação indisponível; dúvida honesta sobre segurança/escopo/verdade. Não contorne — registre e encerre.

## 5. Encerrar

1. Atualize labels/campos do Project de tudo que tocou;
2. Atualize `docs/factory/FACTORY_STATUS.md`;
3. Commit + push na branch de trabalho vigente (nunca direto na `main`, nunca force);
4. Relatório final: `[FACTORY] sessão encerrada | itens: <lista> | transições: <lista> | bloqueios: <lista> | decisões humanas pendentes: <IDs>`.
