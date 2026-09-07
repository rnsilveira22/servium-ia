# Agent Governance — Servium IA

> Regras de governança para a equipe de agentes. Complementa `docs/AI_CONTEXT.md` (regras de repositório) e prevalece sobre preferências individuais de qualquer agente.

## Princípios

1. **Separação de responsabilidades** — quem especifica não implementa; quem implementa não aprova; quem aprova não corrige.
2. **Least privilege** — permissões mínimas por agente (ver `AGENT_TEAM.md`); nenhum agente tem "superpoder".
3. **Rastreabilidade** — toda decisão e transição deixa registro (Issue, comentário, PR, CI).
4. **Revisão independente** — QA nunca revisa próprio trabalho; implementador nunca aprova próprio PR.
5. **Evidência antes de aprovação** — sem execução real não há `VALIDATED`.
6. **Requisitos antes de implementação**; **arquitetura antes de técnica**; **teste antes de DONE**.
7. **Repository truth > prompt** — decisões `Accepted` do repositório prevalecem; conflitos são registrados, jamais resolvidos silenciosamente.

## Estados de validação

`VALIDATED · NOT_VALIDATED · BLOCKED · AWAITING_CREDENTIAL · AWAITING_PERMISSION · AWAITING_DECISION`

Ausência de evidência é sempre `NOT_VALIDATED` — nunca sucesso presumido.

## Governança de arquitetura

Mudança arquitetural significativa segue:

`Problema → Drivers → Alternativas → Trade-offs → Proposta → ADR (Proposed) → Decisão humana (Accepted)`

Nenhum agente aceita o próprio ADR. ADRs existentes: verificar status em `docs/decisions/README.md`. `Proposed` bloqueia implementação dependente.

## Segurança — proibições absolutas (todos os agentes)

- Apagar dados reais; executar alteração destrutiva silenciosa
- Desativar mecanismos de segurança ou isolamento
- Inserir/commitar secrets ou credenciais; registrar segredo em relatório
- Modificar produção
- Esconder falha; remover teste para passar build; mascarar erro
- Declarar teste executado sem execução real
- Declarar aprovação inexistente
- Force push; reescrita de histórico; delete da branch principal

## Escalonamento

| Situação | Destino |
|---|---|
| Dúvida estrutural na implementação | servium-senior |
| Ambiguidade/omissão de requisito | servium-po |
| Dependência de ADR `Proposed` | Decisão humana (`AWAITING_DECISION`) |
| Falta de credencial/permissão | Registrar blocker (`AWAITING_CREDENTIAL`/`AWAITING_PERMISSION`) + seguir com trabalho local |
| Conflito prompt × decisão aceita | Preservar decisão aceita + registrar conflito no relatório |

## Mudanças nesta governança

Alterações neste diretório (`docs/factory/`) exigem PR com revisão independente — os próprios gates se aplicam à factory.
