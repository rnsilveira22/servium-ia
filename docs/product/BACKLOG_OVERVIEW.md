# Backlog Macro — Servium IA

> **Fase 002 — Discovery do MVP**
> Backlog macro por **épicos conceituais**. Não são tarefas técnicas nem histórias detalhadas — a decomposição ocorrerá após a definição arquitetural (Fase 003). Ordem indica sequenciamento preliminar, não compromisso de prazo.
>
> **ATUALIZAÇÃO (2026-08-30):** Fase 003 concluída (ADRs Accepted via HG-002) e **Onda 0–1 do MVP-01 materializada e mergeada**. Backlog canônico operacional: [`INITIAL_BACKLOG.md`](INITIAL_BACKLOG.md). Estado real das histórias e do MVP-01 (`PRE_PILOT_REMEDIATION_REQUIRED`): [`FACTORY_STATUS.md`](../factory/FACTORY_STATUS.md) e [`reports/POST_MVP_BACKLOG_RECONCILIATION.md`](../reports/POST_MVP_BACKLOG_RECONCILIATION.md). EPIC-013/Demo Factory permanece **BLOCKED**. Este macro é histórico.

## Épicos

| ID | Épico | Descrição | Fase relacionada | Status |
|---|---|---|---|---|
| EPIC-001 | Fundação | Documentação, governança, licença, políticas do repositório | Fase 0 | Concluído |
| EPIC-002 | Discovery do MVP | Problema, escopo, requisitos, métricas, riscos e plano de validação | Fase 1 (atual) | Em andamento |
| EPIC-003 | Validação com mercado | Entrevistas conforme `[VALIDATION_PLAN.md`](VALIDATION_PLAN.md); confirmação/refutação de hipóteses críticas | Fase 1 | Pendente |
| EPIC-004 | Arquitetura e stack | ADRs: stack, canais, infraestrutura, segurança; endereçar NFRs | Fase 2 | Pendente |
| EPIC-005 | Identidade e Acesso | Autenticação, usuários do tenant, papéis mínimos do piloto | Fase 2/3 | Pendente |
| EPIC-006 | Core de Execução | Ciclos, itens de pendência, estados, retries idempotentes, agendamento | Fase 3 | Pendente |
| EPIC-007 | Funcionário Digital — Pendências Documentais | Implementação do primeiro papel conforme `[FIRST_DIGITAL_EMPLOYEE.md`](FIRST_DIGITAL_EMPLOYEE.md) | Fase 4 | Pendente |
| EPIC-008 | Supervisão Humana | Painel de status, fila de exceções, aprovações, limites configuráveis | Fase 3/4 | Pendente |
| EPIC-009 | Auditoria e Observabilidade | Trilha imutável, evidências, logs/métricas/rastreamento | Fase 3/4 | Pendente |
| EPIC-010 | Comunicação com Cliente Final | Canal inicial (e-mail), templates, limites de envio, recebimento de documentos | Fase 3/4 | Pendente |
| EPIC-011 | Piloto | Onboarding do escritório piloto, baseline, operação assistida por 2–3 ciclos | Fase 5 | Pendente |
| EPIC-012 | Validação e Decisão | Coleta das métricas (`[SUCCESS_METRICS.md`](SUCCESS_METRICS.md)), decisão continuar/ajustar/pivotar | Fase 6 | Pendente |
| EPIC-013 | Demo Factory | Geração automática de vídeos de apresentação do MVP (`[DEMO_FACTORY_STORY.md`](DEMO_FACTORY_STORY.md)) — **BLOCKED** aguardando estabilidade + gate humano | pós-MVP-01 | `BLOCKED — AWAITING_MVP_STABILITY_AND_HUMAN_GATE` |

## Notas

- EPIC-003 (validação) pode avançar **em paralelo** à EPIC-004 (arquitetura), desde que hipóteses críticas não sejam refutadas;
- Nenhum épico de "plataforma completa" (multi-tenant self-service, marketplace, múltiplos funcionários digitais) existe neste backlog deliberadamente — ver `[MVP_SCOPE.md`](MVP_SCOPE.md) (Out of Scope);
- Decomposição em histórias/tarefas técnicas só após ADRs aceitos.
