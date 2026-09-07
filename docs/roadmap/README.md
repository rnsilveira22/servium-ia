# Roadmap — Servium IA

> Roadmap por **fases e objetivos**, sem datas arbitrárias. Fases avançam por critérios de prontidão, não por calendário.

## Fase 0 — Fundação *(concluída)*

Documentação, governança e definição do produto.

- [x] Visão, princípios e glossário documentados
- [x] Contexto para agentes de IA
- [x] Processo de ADRs estabelecido
- [x] Licenciamento proprietário definido
- [ ] Hipóteses do produto priorizadas com stakeholders *(transferido para a Fase 1 — validação)*

## Fase 1 — Discovery do MVP *(atual)*

Definir:

- primeiro problema a resolver;
- primeiro cliente (perfil e contexto real);
- primeiro funcionário digital;
- fluxo operacional do caso de uso;
- métricas de sucesso.

Especificação preliminar concluída (ver [`../product/MVP_DISCOVERY.md`](../product/MVP_DISCOVERY.md)); validação com escritórios reais pendente ([`../product/VALIDATION_PLAN.md`](../product/VALIDATION_PLAN.md)).

## Fase 2 — Arquitetura *(concluída — ADRs aceitos)*

- [x] Arquitetura funcional, fluxos/boundaries e drivers arquiteturais definidos antes da stack
- [x] Stack e decisões registradas via ADRs ([`../decisions/README.md`](../decisions/README.md))
- [x] Revisão humana dos ADRs (`Proposed` → `Accepted`, HG-002 · 2026-08-22; condições em [`../factory/HUMAN_DECISIONS_LOG.md`](../factory/HUMAN_DECISIONS_LOG.md))
- Sequência detalhada em [`../architecture/README.md`](../architecture/README.md); proposta resumida em [`../architecture/ARCHITECTURE_REVIEW.md`](../architecture/ARCHITECTURE_REVIEW.md).

## Fase 3 — Core Platform

Construir capacidades fundamentais da plataforma (autenticação, multi-tenancy, execução auditável — escopo definido na Fase 2).

## Fase 4 — Primeiro Funcionário Digital

Implementar o primeiro caso de uso real, dentro dos limites e mecanismos de escalonamento definidos.

## Fase 5 — Piloto

Executar em ambiente controlado, com cliente inicial e supervisão humana intensiva.

## Fase 6 — Validação

Medir resultados contra as métricas definidas na Fase 1; decidir continuar, ajustar ou pivotar.

## Fase 7 — Produto

Preparar a evolução comercial: onboarding, suporte, operação contínua.

## Fase 8 — Demo Factory *(planejada, BLOCKED)*

Geração automática de vídeos de apresentação do MVP (estagiário digital). Registrada em [`../product/DEMO_FACTORY_STORY.md`](../product/DEMO_FACTORY_STORY.md). **BLOCKED** até: testes manuais + E2E aprovados, fluxo estável, dados fictícios definidos, identidade visual disponível e autorização humana de Rodrigo.
