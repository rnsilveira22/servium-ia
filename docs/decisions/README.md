# Decisões de Arquitetura (ADRs) — Servium IA

Este diretório registra as **Architecture Decision Records** do projeto: decisões arquiteturais relevantes, seu contexto e suas consequências.

## Princípios

- Toda decisão arquitetural relevante deve ser registrada em um ADR.
- ADRs são imutáveis na prática: mudanças de rumo geram novos ADRs que substituem os anteriores (`Superseded`).
- Nenhuma tecnologia deve ser adotada sem ADR correspondente aceito.

## Estados possíveis

| Estado | Significado |
|---|---|
| `Proposed` | Proposta em discussão; não autoriza implementação. |
| `Accepted` | Decisão aceita e vigente. |
| `Superseded` | Substituída por outro ADR (indicar qual). |
| `Rejected` | Recusada; mantida como registro histórico. |
| `Deprecated` | Sem mais aplicabilidade, sem substituta direta. |

## Convenção de nomes

```text
ADR-001-titulo-da-decisao.md
ADR-002-titulo-da-decisao.md
```

Numeração sequencial, sem reutilização de números.

## Template mínimo

```markdown
# ADR-XXX — Título

## Status

Proposed

## Context

## Decision

## Alternatives Considered

## Consequences

## Risks
```

## ADRs existentes

| ADR | Título | Status |
|---|---|---|
| [ADR-001](ADR-001-architecture-style.md) | Estilo arquitetural: monólito modular | `Accepted` |
| [ADR-002](ADR-002-backend-stack.md) | Backend: TypeScript + Node.js (NestJS) | `Accepted` |
| [ADR-003](ADR-003-frontend-stack.md) | Frontend: React + TypeScript (SPA) | `Accepted` |
| [ADR-004](ADR-004-persistence.md) | Persistência: PostgreSQL | `Accepted` |
| [ADR-005](ADR-005-tenant-strategy.md) | Tenant: shared schema + tenant_id (+ RLS) | `Accepted` |
| [ADR-006](ADR-006-async-processing.md) | Processamento assíncrono: jobs no PostgreSQL | `Accepted` |
| [ADR-007](ADR-007-document-storage.md) | Armazenamento documental: object storage + metadados | `Accepted` |
| [ADR-008](ADR-008-communication-abstraction.md) | Comunicação: abstração de canal (`CommunicationChannel`) | `Accepted` |
| [ADR-009](ADR-009-authentication-strategy.md) | Autenticação e autorização: first-party + RBAC mínimo | `Accepted` |
| [ADR-010](ADR-010-ai-usage-strategy.md) | Estratégia de IA: determinístico-first, LLM assistivo | `Accepted` |
| [ADR-011](ADR-011-deployment-strategy.md) | Deployment: PaaS de entrada, sem Kubernetes | `Accepted` |

> **Decisão humana (HG-002 · 2026-08-22):** pacote ADR-001..011 **aceito** por Rodrigo com base na revisão [`../architecture/ADR_REVIEW_REPORT.md`](../architecture/ADR_REVIEW_REPORT.md). Condições obrigatórias preservadas: ADR-005 (suíte de testes de isolamento multi-tenant), ADR-009 (checklist OWASP ASVS + testes de segurança), ADR-011 (provedor concreto e custo recorrente permanecem sujeitos a human gate — HG-004). Registro formal: [`../factory/HUMAN_DECISIONS_LOG.md`](../factory/HUMAN_DECISIONS_LOG.md).
>
> Mudar um ADR `Accepted` exige novo ciclo de decisão (novo ADR que o substitua ou revisão formal registrada).
