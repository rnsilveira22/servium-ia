# GitHub Workflow — Servium IA

> Como o GitHub sustenta gestão, rastreabilidade e governança. Pré-requisitos de ferramenta: `git` (SSH) + `gh` CLI autenticado para operações administrativas.

## Repositório

- `origin`: `git@github.com:rnsilveira22/servium-ia.git`
- Branch principal: `main`
- Fonte da verdade operacional: Issues deste repositório.

## Branches

A convenção vigente de `CONTRIBUTING.md` é preservada (`feat/ fix/ docs/ chore/ refactor/ test/`). A Software Factory adiciona apenas o vínculo com a Issue:

```text
<prefixo>/<issue>-descricao
```

Exemplos:

```text
feat/23-company-registration
fix/31-duplicate-charges
docs/07-architecture-review
chore/02-ci-bootstrap
```

Regras mantidas: `main` sempre estável; merge só após revisão; **nunca force push em `main`**; alteração de histórico proibida.

## Commits

Conventional Commits em pt-BR (padrão do repositório), referenciando a Issue quando aplicável:

```text
feat: implementa registro de empresa (#23)
```

Commits artificiais só para cumprir formato são proibidos.

## Pull Requests

- Todo PR referencia a Issue (`Closes #N`) e usa `.github/PULL_REQUEST_TEMPLATE.md`.
- PR sem Issue, sem evidências ou com CI vermelho não entra em QA.
- O PR **não pode ser aprovado apenas pelo autor** — revisão independente obrigatória (reviewer-qa).

### Identidade dos agentes no GitHub

Os agentes OpenCode não possuem identidades GitHub próprias. Consequências:

1. Approvals de PR feitas por agentes aparecem sob a conta humana operadora — **não fingir aprovação de usuário inexistente**.
2. A independência de QA é representada pelo relatório formal (`QA_REVIEW_TEMPLATE.md`) + label/estado `QA_APPROVED`, não por approval de conta.
3. Quando houver contas de serviço dedicadas, este documento deve ser atualizado e o mapeamento registrado.

## Issues

Fonte única das histórias — sem backlog paralelo. Templates disponíveis: História (story), Bug, Dívida Técnica. Labels abaixo classificam issues e itens do Project.

| Grupo | Labels |
|---|---|
| Tipo | `type:epic`, `type:story`, `type:task`, `type:bug`, `type:security`, `type:tech-debt` |
| Prioridade | `priority:p0`, `priority:p1`, `priority:p2`, `priority:p3` |
| Agente | `agent:po`, `agent:orchestrator`, `agent:senior`, `agent:pleno`, `agent:qa` |
| Processo | `status:blocked`, `needs:adr`, `needs:decision` |

## Project `Servium IA Development`

Campos: `Status`, `Priority`, `Type`, `Epic`, `Responsible Role`, `QA Status`, `PO Acceptance`, `Risk`.

Status (campo único, 14 estados — máquina canônica V2, aprovada via **HG-F2-02**; nomes compatíveis com GitHub Projects):

`OPEN · PO_APPROVED · TECH_READY · IMPLEMENTING · QA_REVIEW · QA_FAILED · QA_APPROVED · HUMAN_REVIEW · PO_ACCEPTED · DONE · BLOCKED · AWAITING_DECISION · REJECTED · ESCALATED_TECHNICAL_FAILURE`

> **Migração do campo Status (pendente, exige `gh` admin ou web):** atualizar as opções do campo `Status` do Project para o conjunto V2 acima (fundir `Tech Analysis`+`Ready for Development`→`TECH_READY`, `Ready for QA`+`QA Review`→`QA_REVIEW`, renomear `Changes Requested`→`QA_FAILED`, `Backlog`→`OPEN`, `Ready`→`PO_APPROVED`, `In Development`→`IMPLEMENTING`, adicionar `HUMAN_REVIEW`/`AWAITING_DECISION`/`REJECTED`/`ESCALATED_TECHNICAL_FAILURE`, manter `Done`→`DONE`, `Blocked`→`BLOCKED`, `QA Approved`→`QA_APPROVED`, `PO Acceptance`→`PO_ACCEPTED`). **Nunca criar um segundo campo/estado paralelo.**

Views: **Board** (kanban por Status), **Table** (visão geral), **Roadmap** (opcional, por épico).

## CI

`.github/workflows/docs-ci.yml` valida Markdown (lint) em PRs e pushes afetando documentação — adequado ao estágio atual (repositório documental). Quando a stack for definida (ADRs `Accepted`), o pipeline evolui conforme `QUALITY_GATES.md` Gate 4 — **sem duplicar workflows**.

## Branch protection / rulesets (planejado)

Quando habilitável (requer `gh` autenticado com permissão admin): exigir PR + check `docs-lint` verde na `main`; bloquear force push. Não ativar antes de validar o fluxo completo para não travar a operação.

## Status de configuração remota

Configuração efetivada (ver `GITHUB_INTEGRATION_REPORT.md`):

- **Project**: [`Servium IA Development`](https://github.com/users/rnsilveira22/projects/2) criado e vinculado ao repositório — campo `Status` com os 12 estados legados do workflow (migração para os **14 estados V2** pendente — ver "Status" acima), campos `Priority`, `Item Type` (`Type` é nome reservado do GitHub Projects), `Responsible Role`, `QA Status`, `PO Acceptance` e `Risk`; views `Board` e `Table`.
- **Labels**: taxonomia completa aplicada (`type:*`, `priority:*`, `agent:*`, `status:blocked`, `needs:adr`, `needs:decision`). Labels padrão legadas mantidas sem uso.
- **PR template e Issue templates**: versionados nesta branch; tornam-se ativos no GitHub após o merge em `main` (o GitHub lê templates da branch padrão).
- **Rulesets/proteção da `main`**: `BLOCKED_BY_GITHUB_PLAN` — repositório privado no plano Free não suporta rulesets nem branch protection. Não configurar required checks enquanto o CI for acionado por filtro de paths.

Automações deliberadamente NÃO habilitadas: fechar Issue ou mergear PR não pode implicar `Done` — a regra `DONE = QA_APPROVED AND PO_ACCEPTED AND MERGED` é controlada pelos campos `QA Status` e `PO Acceptance` e pelo registro do merge.
