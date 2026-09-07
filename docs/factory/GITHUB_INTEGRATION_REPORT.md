# GitHub Integration Report — Software Factory V1

> Execução de finalização da integração remota. Nenhum agente recriado, nenhum ADR alterado, nenhuma feature de produto implementada.
>
> **ATUALIZAÇÃO (2026-08-30):** relatório **histórico** (integração inicial da factory). Estado real (ADRs `Accepted`, merges até `e04d1e6`): [`FACTORY_STATUS.md`](FACTORY_STATUS.md) e [`reports/POST_MVP_BACKLOG_RECONCILIATION.md`](../reports/POST_MVP_BACKLOG_RECONCILIATION.md). Histórico preservado.

---

## A. EXECUTIVE SUMMARY

Integração remota finalizada: PR #2 da Software Factory aberto e com CI verde; Project `Servium IA Development` criado, vinculado ao repositório e configurado com os 12 estados do workflow + 6 campos customizados + views Board/Table; taxonomia completa de labels aplicada (18 labels); templates de Issue/PR validados (ativam após merge); rulesets bloqueados pelo plano GitHub (Free/privado) — registrado sem contorno. Item de teste do Project criado, validado e removido. Qualidade: um bug real de workflow foi detectado pela execução no GitHub e corrigido durante esta execução.

## B. GITHUB AUTHENTICATION

- Usuário ativo: `rnsilveira22` ✅
- Scopes detectados: `gist`, `project`, `read:org`, `repo`, `workflow` ✅
- Protocolo Git: https (token no keyring — nunca impresso/armazenado)
- Status: autenticação válida

## C. REPOSITORY

| Item | Valor |
|---|---|
| Owner / repo | `rnsilveira22/servium-ia` |
| URL | <https://github.com/rnsilveira22/servium-ia> |
| Branch padrão | `main` |
| Branch da Factory | `chore/software-factory-v1` |
| Visibilidade | privado |
| Permissões da conta | admin, maintain, push, pull, triage |

## D. PULL REQUEST

| Item | Valor |
|---|---|
| Número | **#2** |
| Título | `chore: establish Servium IA Software Factory V1` |
| URL | <https://github.com/rnsilveira22/servium-ia/pull/2> |
| Base ← head | `main` ← `chore/software-factory-v1` |
| Estado | OPEN — **não mergeado** (fora do escopo) |
| Checks | `Lint (arquivos alterados)` ✅ pass · `Relatório de dívida de lint` ✅ pass |

Commits adicionais desta execução: normalização de formatação markdown legada (`7e363bc`) e correção de bug do workflow (`2a7a135`) — detalhes em §L.

## E. GITHUB PROJECT

| Item | Valor |
|---|---|
| Nome | **Servium IA Development** |
| Número / ID | #2 / `PVT_kwHOAiychM4BhKaU` |
| URL | <https://github.com/users/rnsilveira22/projects/2> |
| Repositório vinculado | `rnsilveira22/servium-ia` ✅ |
| Itens | 0 (teste controlado removido) |

Pré-existente avaliado e preservado sem alteração: Project #1 (`@rnsilveira22's untitled project`, vazio, campos padrão genéricos) — incompatível com a governança; não duplicado nem destruído.

**Campos**

| Campo | Tipo | Valores |
|---|---|---|
| Status | single-select | Backlog · Ready · Tech Analysis · Ready for Development · In Development · Ready for QA · QA Review · Changes Requested · QA Approved · PO Acceptance · Done · Blocked |
| Priority | single-select | P0 - Critical · P1 - High · P2 - Medium · P3 - Low |
| Item Type | single-select | Epic · Story · Task · Bug · Spike · Technical Debt · Security |
| Responsible Role | single-select | PO · Senior · Pleno · Reviewer/QA |
| QA Status | single-select | Pending · In Review · Changes Requested · Approved · Blocked |
| PO Acceptance | single-select | Pending · Accepted · Rejected |
| Risk | single-select | Low · Medium · High · Critical |

Nota: o nome `Type` é reservado no GitHub Projects → adotado `Item Type` (adaptação prevista na missão).

**Views**

| View | Layout | Status |
|---|---|---|
| Board | BOARD_LAYOUT | OK (kanban agrupado por Status, comportamento nativo) |
| Table | TABLE_LAYOUT | OK (view padrão renomeada; campos visíveis configurados: Title, Status, Priority, Item Type, Responsible Role, QA Status, PO Acceptance, Risk) |
| Roadmap | ROADMAP_LAYOUT | NOT_APPLICABLE nesta fase — requer campos de data/iteration; projeto ainda sem cronograma |

Limitação da API: agrupamento/filtragem fina das views não são expostos via GraphQL (apenas layout, nome e campos visíveis).

## F. LABELS

**Criadas (18)**

- Type: `type:epic`, `type:story`, `type:task`, `type:bug`, `type:security`, `type:tech-debt`, `type:spike`
- Priority: `priority:p0`, `priority:p1`, `priority:p2`, `priority:p3`
- Agent: `agent:po`, `agent:senior`, `agent:pleno`, `agent:qa`
- Workflow/Governança: `status:blocked`, `needs:adr`, `needs:decision`

**Reutilizadas**: nenhuma equivalente existia (apenas defaults do GitHub).
**Mantidas sem uso** (defaults legados, não removidas por segurança): `bug`, `enhancement`, `documentation`, `question`, `duplicate`, `invalid`, `wontfix`, `good first issue`, `help wanted`, `accessibility`.

## G. ISSUE TEMPLATES

| Template | Status |
|---|---|
| `.github/ISSUE_TEMPLATE/story.md` | OK — versionado na branch; ativa no GitHub após merge (GitHub lê templates da branch padrão) |
| `.github/ISSUE_TEMPLATE/bug.md` | OK — idem |
| `.github/ISSUE_TEMPLATE/tech_debt.md` | OK — idem |
| `.github/ISSUE_TEMPLATE/config.yml` | OK — issues em branco desabilitadas |
| Campos exigidos vs missão | conferidos: story (contexto, user story, problema, objetivo, RNs, CA, cenários, dependências, restrições, DoR, DoD, evidências), bug (todos os campos pedidos), debt (todos) — nenhum ajuste necessário |

## H. PR TEMPLATE

OK — `.github/PULL_REQUEST_TEMPLATE.md` cobre todos os itens pedidos (Issue relacionada, objetivo, implementação, módulos, testes, segurança, migrations, breaking changes, evidências, checklist completo). Ativa após merge. Utilizado de fato no corpo do PR #2.

## I. GITHUB ACTIONS

| Workflow | Finalidade | Estado |
|---|---|---|
| `docs-ci.yml` → job `changed-docs-lint` | Lint markdown dos arquivos alterados no PR (bloqueante) | Executou no PR #2 — **pass** (execução real) |
| `docs-ci.yml` → job `full-repo-report` | Inventário não-bloqueante da dívida de lint | Executou no PR #2 — **pass** |

Nenhum workflow duplicado; nenhum workflow pré-existente sobrescrito (não havia outros). Stack inexistente ⇒ nenhum comando inventado (§13).

## J. RULESETS / BRANCH PROTECTION

`BLOCKED_BY_GITHUB_PLAN` — a API retorna 403:

> "Upgrade to GitHub Pro or make this repository public to enable this feature."

Repositório privado no plano Free não suporta rulesets nem branch protection. Conta tem permissão admin — a limitação é de plano, não de permissão. Não contornado (§29).

Plano pronto para quando o plano permitir (em `GITHUB_WORKFLOW.md`): ruleset na `main` exigindo PR, bloqueando force push/deleção. Required status checks ficam condicionados à evolução do CI (hoje acionado por filtro de paths — exigir check que não roda em todo PR criaria regra insatisfazível, proibido pelo §16).

## K. QUALITY GATES NO GITHUB

| Gate | Representação |
|---|---|
| Ready | Campo `Status = Ready` (DoR checklist dentro da Issue) |
| Development | `Status ∈ {Tech Analysis, Ready for Development, In Development}` + `Responsible Role` |
| QA | Campo `QA Status` (Pending → In Review → Approved/Changes Requested/Blocked) + review formal no PR |
| PO Acceptance | Campo `PO Acceptance` (Pending/Accepted/Rejected) |
| Done | `Status = Done` somente com `QA Status = Approved` **E** `PO Acceptance = Accepted` |

Automações nativas deliberadamente **não habilitadas**: fechamento de Issue ou merge de PR não implicam `Done` (§21–22). O gate é governado pelos campos + processo; automação frágil foi evitada de propósito.

## L. VALIDATION

| Verificação | Comando/método | Resultado |
|---|---|---|
| Autenticação | `gh auth status` | válida, rnsilveira22 ✅ |
| PR inexistente → criação | `gh pr list` → `gh pr create` | PR #2 aberto ✅ |
| Project duplicado? | `gh project list` | apenas #1 (vazio/genérico) → criado #2 ✅ |
| Campos do Project | `gh api graphql` (update/create) + leitura de volta | 12 status + 6 campos confirmados ✅ |
| Views | GraphQL create/update view | Board + Table confirmados ✅ |
| Repo vinculado | `linkProjectV2ToRepository` | confirmado ✅ |
| Labels | `gh label list` antes/depois | 18 criadas, 0 duplicatas ✅ |
| Templates | comparação campo a campo com a missão | completos, sem alteração ✅ |
| Rulesets | `GET /repos/.../rulesets` | 403 plano → BLOCKED_BY_GITHUB_PLAN ❌ documentado |
| Teste controlado | draft `[TEST] ...` → setar 5 campos → ler de volta → delete | funcionou; 0 itens restantes (confirmado via GraphQL) ✅ |
| CI real no GitHub | `gh pr checks 2` | 2/2 pass ✅ |
| ADRs | `grep` nos arquivos | 001–011 todos `Proposed` ✅ |

**Problema real encontrado e corrigido**: o job bloqueante falhou nas duas primeiras execuções no GitHub — (1) dívida legada de lint incluída no diff base→head (corrigida com autofix markdownlint, mudanças exclusivamente de formatação: 16 arquivos, marcadores de lista/espaços); (2) bug de interpolação multilinha no passo do lint (lista virava comandos de shell) — corrigido via env var (`2a7a135`). Evidência de que executar CI real importa: nada disso apareceu na validação local.

Divulgação: o autofix também normalizou formatação do arquivo local não-versionado `RELATORIO_FASE_002.md` (sem baseline para restaurar; mudança apenas cosmética, alinhada ao padrão de lint).

Commit desta execução pendente de push: relatório + atualização do `GITHUB_WORKFLOW.md` (seção de status remoto desatualizada).

## M. ADR STATUS

ADR-001 a ADR-011: **todos permanecem `Proposed`** — verificados arquivo a arquivo nesta execução. Nenhum promovido, rejeitado ou editado.

## N. BLOCKERS

1. **Rulesets/branch protection** — `BLOCKED_BY_GITHUB_PLAN` (privado + Free). Desbloqueio: GitHub Pro, ou tornar o repo público.
2. **Required status checks** — diferido por design até o CI rodar em todos os PRs (evitar regra insatisfazível).

Nenhum bloqueio de governança: QA gate e PO Acceptance estão representados e preservados.

## O. RECOMMENDATIONS (futuro, não implementar)

1. Migrar repo para plano com rulesets e aplicar proteção da `main` conforme plano já documentado.
2. Após merge do PR #2, validar templates ativos via "New issue" na UI.
3. Saneamento/remoção das labels padrão legadas quando conveniente.
4. Quando a stack for definida (ADRs `Accepted`), estender CI e então habilitar required checks.
5. Considerar conta de serviço para o reviewer-qa quando houver custo/infra aprovados.
6. Roadmap view quando existirem épicos com datas/iterations.

---

## MATRIZ FINAL

| Componente | Status |
|---|---|
| GitHub CLI auth | OK |
| Repository access | OK |
| Software Factory PR | OK (#2, checks verdes, não mergeado) |
| GitHub Project | OK |
| Project fields | OK |
| Project views | PARTIAL (Board+Table OK; Roadmap N/A; groupBy fino limitado pela API) |
| Labels | OK |
| Issue templates | PARTIAL (prontos; ativam pós-merge) |
| PR template | PARTIAL (idem) |
| GitHub Actions | OK (execução real verificada) |
| Ruleset / branch protection | BLOCKED (plano Free/privado) |
| QA gate representation | OK |
| PO acceptance representation | OK |
| ADRs unchanged | OK |

## GATE FINAL

**GITHUB INTEGRATION: READY**
**SOFTWARE FACTORY PR: READY**
**READY TO START PRODUCT BACKLOG: YES**
