# Monorepo — Visão Técnica

> Estrutura executável do Servium IA (conforme ADR-001, ADR-002, ADR-003 — `Accepted`).

## Layout

```text
apps/api             → API NestJS (backend monolítico modular)
apps/web             → SPA React (painel operacional)
packages/shared-types→ Tipos TypeScript compartilhados (contratos)
packages/db         → schema Postgres: migrations SQL versionadas + runner + testes (RLS)
```

## Comandos (na raiz)

| Comando | Efeito |
|---|---|
| `npm install` | instala workspaces |
| `npm run build` | compila os pacotes em ordem de dependência (shared-types → api → web → db) |
| `npm run test` | roda os testes de fumaça (vitest, 1 por workspace) |
| `npm run lint` | ESLint (flat config) em todo o monorepo |
| `npm run typecheck` | verificação de tipos do workspace web (`tsc --noEmit`) |
| `npm run verify` | cadeia completa pré-push: lint → build → typecheck → test (idêntica à CI) |
| `npm run lint:docs` | markdownlint em `docs/**` + raiz (`.markdownlint.jsonc`) |

## Convenções

- TypeScript estrito (`tsconfig.base.json`); configs por workspace estendem a base.
- Contratos compartilhados nascem em `packages/shared-types` e nunca são duplicados.
- Nenhum secret no repositório; ambiente local usa `.env` ignorado pelo git (ver `.gitignore`).
- Testes de fumaça: 1 por workspace, executados via vitest.

## Pré-push

Toda PR exige validação local prévia conforme `docs/factory/FACTORY_RUNBOOK.md` §7 (PRE-PUSH VALIDATION GATE).

## Decisões registradas

- Testes de fumaça da API instanciam controllers diretamente (sem container DI) — `emitDecoratorMetadata` não é suportado pelo toolchain de teste escolhido nesta fundação; revisitar quando injeção de dependência for exigida em testes (história futura de CI/testes).
