# Índice da Documentação — Servium IA

> Mapa de toda a documentação do projeto. **Este arquivo deve ser atualizado sempre que documentação estrutural for adicionada.**

```text
README.md
│
├── Visão ..................... docs/PROJECT_VISION.md
├── Princípios ................ docs/PRODUCT_PRINCIPLES.md
├── Glossário ................. docs/GLOSSARY.md
├── Contexto para IA .......... docs/AI_CONTEXT.md
│
├── Arquitetura ............... docs/architecture/README.md
│   ├── Arquitetura funcional .. docs/architecture/FUNCTIONAL_ARCHITECTURE.md
│   ├── Boundaries de domínio .. docs/architecture/DOMAIN_BOUNDARIES.md
│   ├── Drivers arquiteturais .. docs/architecture/ARCHITECTURE_DRIVERS.md
│   ├── Contexto (C4) .......... docs/architecture/SYSTEM_CONTEXT.md
│   ├── Containers (C4) ........ docs/architecture/CONTAINER_ARCHITECTURE.md
│   ├── Avaliação de stack ..... docs/architecture/STACK_EVALUATION.md
│   ├── Limites de IA .......... docs/architecture/AI_USAGE_BOUNDARIES.md
│   ├── Segurança .............. docs/architecture/SECURITY_ARCHITECTURE.md
│   ├── Revisão arquitetural ... docs/architecture/ARCHITECTURE_REVIEW.md
│   └── Revisão dos ADRs ....... docs/architecture/ADR_REVIEW_REPORT.md
├── Decisões (ADRs) ........... docs/decisions/README.md
│   ├── ADR-001 Estilo arquitetural ... docs/decisions/ADR-001-architecture-style.md
│   ├── ADR-002 Backend ............... docs/decisions/ADR-002-backend-stack.md
│   ├── ADR-003 Frontend .............. docs/decisions/ADR-003-frontend-stack.md
│   ├── ADR-004 Persistência .......... docs/decisions/ADR-004-persistence.md
│   ├── ADR-005 Tenant ................ docs/decisions/ADR-005-tenant-strategy.md
│   ├── ADR-006 Assíncrono ............ docs/decisions/ADR-006-async-processing.md
│   ├── ADR-007 Documentos ............ docs/decisions/ADR-007-document-storage.md
│   ├── ADR-008 Comunicação ........... docs/decisions/ADR-008-communication-abstraction.md
│   ├── ADR-009 Autenticação .......... docs/decisions/ADR-009-authentication-strategy.md
│   ├── ADR-010 IA .................... docs/decisions/ADR-010-ai-usage-strategy.md
│   └── ADR-011 Deployment ............ docs/decisions/ADR-011-deployment-strategy.md
│
├── Software Factory ............ docs/factory/SOFTWARE_FACTORY_REPORT.md
│   ├── Orchestrator ............ docs/factory/ORCHESTRATOR.md
│   ├── Equipe de agentes ....... docs/factory/AGENT_TEAM.md
│   ├── Workflow de desenvolvimento docs/factory/DEVELOPMENT_WORKFLOW.md
│   ├── Workflow GitHub ......... docs/factory/GITHUB_WORKFLOW.md
│   ├── Quality gates ........... docs/factory/QUALITY_GATES.md
│   ├── Contratos de handoff .... docs/factory/HANDOFF_CONTRACTS.md
│   ├── Governança de agentes ... docs/factory/AGENT_GOVERNANCE.md
│   ├── Orquestração ............ docs/factory/AGENT_ORCHESTRATION.md
│   ├── Política de autonomia ... docs/factory/AUTONOMY_POLICY.md
│   ├── Decisões humanas ........ docs/factory/HUMAN_GATES.md
│   ├── Log de decisões humanas . docs/factory/HUMAN_DECISIONS_LOG.md
│   ├── Runbook operacional ..... docs/factory/FACTORY_RUNBOOK.md
│   ├── Status vivo ............. docs/factory/FACTORY_STATUS.md
│   ├── Templates de processo ... docs/factory/templates/
│   ├── Dry runs ................ docs/factory/dry-run/
│   └── Relatórios (Fases 0/1) .. docs/reports/FACTORY_V2_FASE{0,1}_*.md
│
├── Produto ................... docs/product/README.md
│   ├── Discovery do MVP ...... docs/product/MVP_DISCOVERY.md
│   ├── Escopo do MVP ......... docs/product/MVP_SCOPE.md
│   ├── Personas .............. docs/product/PERSONAS.md
│   ├── Rotinas candidatas .... docs/product/CANDIDATE_ROUTINES.md
│   ├── 1º Funcionário Digital  docs/product/FIRST_DIGITAL_EMPLOYEE.md
│   ├── Fluxo operacional ..... docs/product/OPERATIONAL_FLOW.md
│   ├── Requisitos funcionais . docs/product/FUNCTIONAL_REQUIREMENTS.md
│   ├── Requisitos não func. .. docs/product/NON_FUNCTIONAL_REQUIREMENTS.md
│   ├── Métricas de sucesso ... docs/product/SUCCESS_METRICS.md
│   ├── Riscos e hipóteses .... docs/product/RISKS_AND_HYPOTHESES.md
│   ├── Plano de validação .... docs/product/VALIDATION_PLAN.md
│   ├── Backlog macro ......... docs/product/BACKLOG_OVERVIEW.md
│   ├── Backlog inicial (canônico) docs/product/INITIAL_BACKLOG.md
│   └── Demo Factory .......... docs/product/DEMO_FACTORY_STORY.md
│
└── Roadmap ................... docs/roadmap/README.md
```

## Descrição dos documentos

| Documento | Finalidade |
|---|---|
| [`README.md`](../README.md) | Porta de entrada oficial do projeto: o que é o Servium IA, problema, solução, princípios, status e roadmap. |
| [`PROJECT_VISION.md`](PROJECT_VISION.md) | Por que o Servium IA existe: visão, problema, proposta de valor, personas, limites e hipóteses a validar. |
| [`PRODUCT_PRINCIPLES.md`](PRODUCT_PRINCIPLES.md) | Princípios de produto e engenharia que restringem e orientam todas as decisões. |
| [`GLOSSARY.md`](GLOSSARY.md) | Vocabulário oficial do domínio, com definições preliminares. |
| [`AI_CONTEXT.md`](AI_CONTEXT.md) | Contexto, regras e restrições para agentes de IA que trabalhem no repositório. |
| [`architecture/README.md`](architecture/README.md) | Hub da arquitetura: proposta do MVP (monólito modular), índice de documentos e método. |
| [`architecture/FUNCTIONAL_ARCHITECTURE.md`](architecture/FUNCTIONAL_ARCHITECTURE.md) | Capacidades do MVP (C1–C12), dependências e portas de integração. |
| [`architecture/DOMAIN_BOUNDARIES.md`](architecture/DOMAIN_BOUNDARIES.md) | Módulos de domínio (B1–B7), ownership de dados, eventos e fronteiras. |
| [`architecture/ARCHITECTURE_DRIVERS.md`](architecture/ARCHITECTURE_DRIVERS.md) | Drivers arquiteturais (ADRV-001..014) com origem nos requisitos. |
| [`architecture/SYSTEM_CONTEXT.md`](architecture/SYSTEM_CONTEXT.md) | Visão C4 de contexto: usuários e sistemas externos. |
| [`architecture/CONTAINER_ARCHITECTURE.md`](architecture/CONTAINER_ARCHITECTURE.md) | Visão C4 de containers: SPA, backend monolítico modular, PostgreSQL, object storage. |
| [`architecture/STACK_EVALUATION.md`](architecture/STACK_EVALUATION.md) | Comparação fundamentada de stacks (backend, frontend, banco, async, tenant, deploy). |
| [`architecture/AI_USAGE_BOUNDARIES.md`](architecture/AI_USAGE_BOUNDARIES.md) | Classificação determinístico/IA/LLM/humano por função; regras para uso assistivo de LLM. |
| [`architecture/SECURITY_ARCHITECTURE.md`](architecture/SECURITY_ARCHITECTURE.md) | Ativos, fronteiras de confiança, ameaças principais e controles. |
| [`architecture/ARCHITECTURE_REVIEW.md`](architecture/ARCHITECTURE_REVIEW.md) | Red Team da proposta: pontos fortes, trade-offs, dívidas deliberadas, gatilhos de revisão. |
| [`architecture/ADR_REVIEW_REPORT.md`](architecture/ADR_REVIEW_REPORT.md) | Revisão formal dos ADR-001..011: análise por decisão, matriz, recomendações e condições. |
| [`decisions/README.md`](decisions/README.md) | Processo de Architecture Decision Records (ADRs): estados, convenção e template. |
| [`decisions/ADR-001-architecture-style.md`](decisions/ADR-001-architecture-style.md) | Estilo arquitetural: monólito modular (`Accepted`). |
| [`decisions/ADR-002-backend-stack.md`](decisions/ADR-002-backend-stack.md) | Backend: TypeScript + Node.js/NestJS (`Accepted`). |
| [`decisions/ADR-003-frontend-stack.md`](decisions/ADR-003-frontend-stack.md) | Frontend: React + TypeScript SPA (`Accepted`). |
| [`decisions/ADR-004-persistence.md`](decisions/ADR-004-persistence.md) | Persistência: PostgreSQL (`Accepted`). |
| [`decisions/ADR-005-tenant-strategy.md`](decisions/ADR-005-tenant-strategy.md) | Tenant: shared schema + `tenant_id` + RLS (`Accepted`). |
| [`decisions/ADR-006-async-processing.md`](decisions/ADR-006-async-processing.md) | Assíncrono: jobs persistidos no PostgreSQL (`Accepted`). |
| [`decisions/ADR-007-document-storage.md`](decisions/ADR-007-document-storage.md) | Documentos: object storage S3-compatível + metadados no banco (`Accepted`). |
| [`decisions/ADR-008-communication-abstraction.md`](decisions/ADR-008-communication-abstraction.md) | Comunicação: porta `CommunicationChannel` + adaptadores (`Accepted`). |
| [`decisions/ADR-009-authentication-strategy.md`](decisions/ADR-009-authentication-strategy.md) | Autenticação: first-party + RBAC mínimo, OIDC-ready (`Accepted`). |
| [`decisions/ADR-010-ai-usage-strategy.md`](decisions/ADR-010-ai-usage-strategy.md) | IA: determinístico-first, LLM assistivo isolado (`Accepted`). |
| [`decisions/ADR-011-deployment-strategy.md`](decisions/ADR-011-deployment-strategy.md) | Deployment: PaaS de entrada, sem Kubernetes (`Accepted`). |
| [`factory/SOFTWARE_FACTORY_REPORT.md`](factory/SOFTWARE_FACTORY_REPORT.md) | Relatório de configuração da Software Factory (agentes, workflow, gates, GitHub). |
| [`factory/ORCHESTRATOR.md`](factory/ORCHESTRATOR.md) | Orchestrator da Factory V2: papel, autoridade, estados, handoffs, STOP conditions e log. |
| [`factory/AGENT_TEAM.md`](factory/AGENT_TEAM.md) | Equipe de agentes (Orchestrator, PO, Senior, Pleno, Reviewer/QA), permissões e independência do QA. |
| [`factory/DEVELOPMENT_WORKFLOW.md`](factory/DEVELOPMENT_WORKFLOW.md) | Máquina de estados canônica V2 (14 estados), regra de DONE e rastreabilidade. |
| [`factory/GITHUB_WORKFLOW.md`](factory/GITHUB_WORKFLOW.md) | Convenções GitHub: branches, commits, PRs, issues, labels, Project, CI. |
| [`factory/QUALITY_GATES.md`](factory/QUALITY_GATES.md) | Os cinco quality gates, bloqueadores automáticos de QA e severidades. |
| [`factory/HANDOFF_CONTRACTS.md`](factory/HANDOFF_CONTRACTS.md) | Contratos obrigatórios de troca entre agentes em cada transição de estado. |
| [`factory/AGENT_GOVERNANCE.md`](factory/AGENT_GOVERNANCE.md) | Princípios de governança, segurança, escalonamento e validação para agentes. |
| [`factory/GITHUB_INTEGRATION_REPORT.md`](factory/GITHUB_INTEGRATION_REPORT.md) | Relatório da integração remota: Project, labels, templates, bloqueios do plano Free. |
| [`factory/AGENT_ORCHESTRATION.md`](factory/AGENT_ORCHESTRATION.md) | Orquestração da equipe: ordem, filas, WIP, retry, escalonamento, paradas, merge. |
| [`factory/AUTONOMY_POLICY.md`](factory/AUTONOMY_POLICY.md) | Níveis de autonomia (1/2/3) e regras NEVER para operação autônoma. |
| [`factory/HUMAN_GATES.md`](factory/HUMAN_GATES.md) | Catálogo de decisões humanas, formato canônico e política de default. |
| [`factory/HUMAN_DECISIONS_LOG.md`](factory/HUMAN_DECISIONS_LOG.md) | Registro formal e imutável das decisões humanas (autorização, execução, condições). |
| [`factory/FACTORY_RUNBOOK.md`](factory/FACTORY_RUNBOOK.md) | Manual de sessão autônoma: verificação, execução por papel, falhas, encerramento. |
| [`factory/FACTORY_STATUS.md`](factory/FACTORY_STATUS.md) | Snapshot vivo do estado da factory, decisões pendentes e fila efetiva. |
| [`factory/templates/`](factory/templates/) | Templates de processo: análise técnica, implementação, QA review, aceite PO, blocker, ADR, orquestração. |
| [`factory/dry-run/`](factory/dry-run/) | Simulações sem side effects: R1 (máquina de estados) e R2 (loop autônomo SRV-D002). |
| [`reports/FACTORY_V2_FASE0_AUDITORIA_DESIGN.md`](reports/FACTORY_V2_FASE0_AUDITORIA_DESIGN.md) | Auditoria da Factory V1 + design da Factory V2 (achados P0–P3). |
| [`reports/FACTORY_V2_FASE1_IMPLEMENTATION_PLAN.md`](reports/FACTORY_V2_FASE1_IMPLEMENTATION_PLAN.md) | Plano executável da Factory V2: arquitetura, states, gates, reconciliação, PoC, roadmap UX. |
| [`reports/POST_MVP_BACKLOG_RECONCILIATION.md`](reports/POST_MVP_BACKLOG_RECONCILIATION.md) | Reconciliação pós-MVP: remediações P0.1/P0.2/P0.3 e decisões Q1–Q4 (2026-08-30). |
| [`product/README.md`](product/README.md) | Hub da documentação de produto. |
| [`product/MVP_DISCOVERY.md`](product/MVP_DISCOVERY.md) | Documento central do discovery: problema do MVP, cliente, dores, hipótese de solução e critérios para avançar. |
| [`product/MVP_SCOPE.md`](product/MVP_SCOPE.md) | Definição rígida de escopo: In Scope, Out of Scope, critérios de entrada/conclusão. |
| [`product/PERSONAS.md`](product/PERSONAS.md) | Personas operacionais preliminares relevantes para o MVP. |
| [`product/CANDIDATE_ROUTINES.md`](product/CANDIDATE_ROUTINES.md) | Catálogo e ranking preliminar das rotinas candidatas à automação. |
| [`product/FIRST_DIGITAL_EMPLOYEE.md`](product/FIRST_DIGITAL_EMPLOYEE.md) | Especificação hipotética do primeiro Funcionário Digital: missão, limites, permissões, exceções. |
| [`product/OPERATIONAL_FLOW.md`](product/OPERATIONAL_FLOW.md) | Fluxo operacional e estados do primeiro Funcionário Digital, com human-in-the-loop. |
| [`product/FUNCTIONAL_REQUIREMENTS.md`](product/FUNCTIONAL_REQUIREMENTS.md) | Requisitos funcionais do MVP (FR-xxx, MoSCoW). |
| [`product/NON_FUNCTIONAL_REQUIREMENTS.md`](product/NON_FUNCTIONAL_REQUIREMENTS.md) | Requisitos não funcionais preliminares (NFR-xxx). |
| [`product/SUCCESS_METRICS.md`](product/SUCCESS_METRICS.md) | Métricas de sucesso do piloto (baselines a medir, sem metas arbitrárias). |
| [`product/RISKS_AND_HYPOTHESES.md`](product/RISKS_AND_HYPOTHESES.md) | Registro formal de hipóteses (HYP-xxx) e riscos (RSK-xxx). |
| [`product/VALIDATION_PLAN.md`](product/VALIDATION_PLAN.md) | Plano de validação com escritórios contábeis: roteiro, evidências, critérios. |
| [`product/BACKLOG_OVERVIEW.md`](product/BACKLOG_OVERVIEW.md) | Backlog macro por épicos conceituais. |
| [`product/DEMO_FACTORY_STORY.md`](product/DEMO_FACTORY_STORY.md) | Épico Demo Factory: automação de vídeos demonstrativos do MVP (**BLOCKED** — aguarda estabilidade + gate humano). |
| [`product/INITIAL_BACKLOG.md`](product/INITIAL_BACKLOG.md) | Backlog canônico — HG-003; reordenado por MVP-01 (HG-005). |
| [`product/MVP_01_VERTICAL_SLICE.md`](product/MVP_01_VERTICAL_SLICE.md) | Meta canônica MVP-01: primeiro Funcionário Digital no piloto (slices, dados mínimos, PILOT_READY). |
| [`product/MVP_01_REPLAN_REPORT.md`](product/MVP_01_REPLAN_REPORT.md) | Relatório A–M do replanejamento time-to-pilot (HG-005). |
| [`roadmap/README.md`](roadmap/README.md) | Roadmap por fases, sem datas arbitrárias. |

## Convenções

- Documentação em português brasileiro, em Markdown.
- Marca escrita consistentemente como **Servium IA**; nome técnico/repositório como **servium**.
- Links relativos entre documentos.
- Fatos e hipóteses devem estar claramente separados.
