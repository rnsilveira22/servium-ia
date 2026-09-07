# Software Factory V1 — Relatório de Configuração

> Execução: estruturação da Software Factory orientada por agentes do Servium IA (OpenCode + GitHub). Branch: `chore/software-factory-v1` (a partir de `phase/003-mvp-architecture`). Nenhuma feature de produto foi desenvolvida.
>
> **ATUALIZAÇÃO (2026-08-30):** relatório **histórico** (pré-HG-002). Desde então o repositório evoluiu para **monorepo executável** com produto implementado (Onda 0–1 do MVP-01: SRV-6..18, UI, E2E Selenium). Estado real e pendências: [`FACTORY_STATUS.md`](FACTORY_STATUS.md) e [`reports/POST_MVP_BACKLOG_RECONCILIATION.md`](../reports/POST_MVP_BACKLOG_RECONCILIATION.md). O histórico desta fase foi preservado.

---

## A. EXECUTIVE SUMMARY

Foi estabelecida a fundação de engenharia por agentes: quatro agentes OpenCode com permissões segregadas (`servium-po`, `servium-senior`, `servium-pleno`, `servium-reviewer-qa`), workflow oficial de 11 estados com regra formal `DONE = QA_APPROVED AND PO_ACCEPTED`, cinco quality gates, contratos de handoff, templates de issue/PR/ADRs, governança e segurança documentadas, CI mínimo de documentação (lint de arquivos alterados em PR) e dry run ponta a ponta validando os contratos. A configuração remota do GitHub (Project, labels, rulesets) está pronta em definição local, porém **bloqueada para execução** por ausência do GitHub CLI autenticado (`BLOCKED_GITHUB_AUTH`) — o desbloqueio exige um comando único do titular.

---

## B. REPOSITORY ASSESSMENT

| Item | Estado encontrado |
|---|---|
| Stack | **Nenhuma** — repositório exclusivamente documental (fase de discovery/arquitetura) |
| Arquitetura | Proposta Fase 003: monólito modular TS/NestJS + React, PostgreSQL+RLS — **todos os ADR-001..011 em `Proposed`**, aguardando aprovação humana |
| Documentação | Extensa e organizada: visão, princípios, produto (MVP), arquitetura (C4, boundaries, drivers, segurança, limites de IA), 11 ADRs Proposed, roadmap, glossário |
| CI | Inexistente antes desta execução |
| Branch atual na inspeção | `phase/003-mvp-architecture`; principal: `main`; working tree limpo exceto `RELATORIO_FASE_002.md` não versionado |
| GitHub | `git@github.com:rnsilveira22/servium-ia.git`; acesso SSH funcional; sem Project/labels/templates/rulesets |
| Principais restrições | Regra crítica do repositório: ADRs `Proposed` não autorizam implementação; escopo MVP rígido (`MVP_SCOPE.md`); Conventional Commits pt-BR; convenção própria de branches (`feat/ fix/ docs/ chore/ refactor/ test/`) |

---

## C. OPENCODE ASSESSMENT

| Item | Resultado |
|---|---|
| Versão | `1.18.21` |
| Custom agents | Suportados via Markdown com frontmatter em `.opencode/agent/<nome>.md` (projeto) — mecanismo usado |
| Comandos verificados | `opencode agent list`, `opencode agent create`, `opencode github install/run` existem nesta versão |
| Permissões | Bloco `permission` com allow/ask/deny e padrões glob por ferramenta (`edit`, `bash`, etc.) — aplicado nos 4 agentes e verificado via `opencode agent list` |
| Integração GitHub | `opencode github install` disponível, porém requer segredos no GitHub Actions (chave do provedor do modelo) e CLI/token → registrado como pendência, **não executado** |

---

## D. AGENTS CREATED

### servium-po

- **Arquivo**: `.opencode/agent/servium-po.md`
- **Função**: Product Owner oficial — backlog, histórias, priorização, aceite funcional
- **Permissões**: leitura total; escrita restrita a `docs/product/**`, `docs/roadmap/**`, `docs/PROJECT_VISION.md`, dry-run; bash somente leitura/git-read/gh-read; resto `ask`
- **Autoridade**: criar/alterar/priorizar histórias; aceitar/rejeitar funcionalmente
- **Proibições**: implementar código; alterar ADR/arquitetura; DONE sem QA+aceite; reduzir qualidade
- **Inputs**: necessidade de produto; histórico `QA_APPROVED` · **Outputs**: Issues formatadas; `ACCEPTED`/`REJECTED`

### servium-senior

- **Arquivo**: `.opencode/agent/servium-senior.md`
- **Função**: direção técnica — análise técnica, decomposição, partes críticas
- **Permissões**: edição ampla; bash amplo com denials (`push --force`, `reset --hard`, `rm -rf /`)
- **Autoridade**: bloquear tecnicamente; propor ADR (`Proposed`); atribuir tarefas; implementar críticos
- **Proibições**: alterar requisito; auto-aceitar ADR; QA do próprio trabalho; escopo silencioso
- **Inputs**: história `READY` · **Outputs**: análise técnica (Gate 2); tarefas; código crítico

### servium-pleno

- **Arquivo**: `.opencode/agent/servium-pleno.md`
- **Função**: implementação disciplinada das tarefas atribuídas
- **Permissões**: idênticas ao Senior (denials destrutivos mantidos)
- **Autoridade**: implementar escopo; abrir PR; responder QA
- **Proibições**: redefinir arquitetura/regra; dependência estrutural sem aprovação; remover teste/mascarar falha; DONE
- **Inputs**: `READY_FOR_DEVELOPMENT` + análise técnica · **Outputs**: código+testes+PR com evidências

### servium-reviewer-qa

- **Arquivo**: `.opencode/agent/servium-reviewer-qa.md`
- **Função**: gate técnico final independente (review, QA, segurança, regressão)
- **Permissões**: leitura total; **edição negada exceto `docs/factory/qa/**`**; push/commit/rebase/rm negados; demais comandos `ask` (permite executar testes/build)
- **Autoridade**: veredito único `APPROVED | CHANGES_REQUESTED | BLOCKED`; bloqueadores automáticos
- **Proibições**: corrigir silenciosamente; declarar execução/aprovação inexistente
- **Inputs**: PR + relatório de implementação · **Outputs**: relatório QA estruturado; handoff QA→PO/QA→Dev

Validação de reconhecimento: `opencode agent list` lista os quatro agentes como `(primary)` com as permissões corretas (verificado).

---

## E. FILES CREATED

```text
.opencode/agent/servium-po.md
.opencode/agent/servium-senior.md
.opencode/agent/servium-pleno.md
.opencode/agent/servium-reviewer-qa.md
.github/ISSUE_TEMPLATE/story.md
.github/ISSUE_TEMPLATE/bug.md
.github/ISSUE_TEMPLATE/tech_debt.md
.github/ISSUE_TEMPLATE/config.yml
.github/PULL_REQUEST_TEMPLATE.md
.github/workflows/docs-ci.yml
.markdownlint.jsonc
docs/factory/AGENT_TEAM.md
docs/factory/AGENT_GOVERNANCE.md
docs/factory/DEVELOPMENT_WORKFLOW.md
docs/factory/GITHUB_WORKFLOW.md
docs/factory/QUALITY_GATES.md
docs/factory/HANDOFF_CONTRACTS.md
docs/factory/SOFTWARE_FACTORY_REPORT.md   (este arquivo)
docs/factory/templates/STORY_TEMPLATE.md
docs/factory/templates/TECHNICAL_ANALYSIS_TEMPLATE.md
docs/factory/templates/IMPLEMENTATION_REPORT_TEMPLATE.md
docs/factory/templates/QA_REVIEW_TEMPLATE.md
docs/factory/templates/PO_ACCEPTANCE_TEMPLATE.md
docs/factory/templates/BLOCKER_TEMPLATE.md
docs/factory/templates/ADR_PROPOSAL_TEMPLATE.md
docs/factory/dry-run/DRY_RUN_REPORT.md
docs/factory/dry-run/SRV-D001-story.md
docs/factory/dry-run/SRV-D001-technical-analysis.md
docs/factory/dry-run/SRV-D001-qa-review-r1.md
docs/factory/qa/.gitkeep                  (destino dos reviews de QA)
```

## F. FILES MODIFIED

| Arquivo | Justificativa |
|---|---|
| `docs/PROJECT_INDEX.md` | Exigência do CONTRIBUTING: registrar documentação estrutural adicionada |
| `docs/AI_CONTEXT.md` | Adicionados referências à factory e seção "Software Factory" para descoberta pelos agentes — conteúdo existente preservado integralmente |
| `.gitignore` | Ignorar `node_modules/`, `.opencode/node_modules/`, lockfiles locais de ferramenta (nada existente removido) |

---

## G. GITHUB CONFIGURATION

| Item | Status | Detalhe |
|---|---|---|
| Autenticação git (SSH) | CONFIGURED (pré-existente) | push/pull funcionais |
| GitHub CLI (`gh`) | **BLOCKED_GITHUB_AUTH** | não instalado; nenhum token disponível |
| Repo | ALREADY_EXISTED | `rnsilveira22/servium-ia` |
| Templates de Issue (story/bug/debt) | CONFIGURED (local) | efetivos ao merge em `main` |
| Pull Request template | CONFIGURED (local) | idem |
| Labels | BLOCKED_GITHUB_AUTH | taxonomy definida em `GITHUB_WORKFLOW.md`; aplicar via `gh label create` |
| Project `Servium IA Development` | BLOCKED_GITHUB_AUTH | campos/views definidos em documento; criar via `gh project create` após `gh auth login` |
| GitHub Actions (docs-ci.yml) | CONFIGURED (local) | sintaxe validada; execução real só ocorrerá no primeiro PR no GitHub |
| Branch protection/rulesets | BLOCKED_GITHUB_PERMISSION | requer admin; plano documentado (PR + check obrigatório, sem travar operação inicial) |
| `opencode github install` | AWAITING_CREDENTIAL | exige segredo de provedor no Actions; inspecionado, não executado |

**Desbloqueio exato** (titular):

```bash
# instalar GitHub CLI e autenticar (escopos mínimos repo,project)
sudo apt install gh || brew install gh
gh auth login --scopes repo,project
gh auth status
```

Com isso: criar labels + Project conforme `docs/factory/GITHUB_WORKFLOW.md` e rulesets da `main`.

---

## H. WORKFLOW

```text
BACKLOG ──(Gate 1 DoR)──► READY ──► TECH_ANALYSIS ──(Gate 2)──► READY_FOR_DEVELOPMENT
      ──► IN_DEVELOPMENT ──(Gate 3)──► READY_FOR_QA ──► QA_REVIEW (Gate 4)
            ├─ CHANGES_REQUESTED ──► IN_DEVELOPMENT ──► READY_FOR_QA
            └─ QA_APPROVED ──(Gate 5 PO)──► PO_ACCEPTANCE ──ACCEPTED──► DONE
Estados auxiliares: BLOCKED · REJECTED · AWAITING_DECISION
DONE = QA_APPROVED AND PO_ACCEPTED   (sem exceção)
```

Rastreabilidade canônica: `Epic → Issue (#N) → Tech Analysis → Branch <prefixo>/N-* → Commits → PR → CI → QA Review → PO Acceptance → DONE`.

---

## I. QUALITY GATES

1. **Gate 1 — Definition of Ready** (PO→Senior): objetivo, ator, critérios testáveis, dependências, contexto.
2. **Gate 2 — TECH READY** (Senior): análise completa, arquitetura vs ADRs, riscos, tarefas, testes.
3. **Gate 3 — READY FOR QA** (Dev): implementação, testes executados, build/lint, docs, PR, evidências.
4. **Gate 4 — QA Review** (Reviewer independente): CI verde + revisão formal; 11 bloqueadores automáticos; severidades CRITICAL..INFO; resultado único.
5. **Gate 5 — PO Acceptance**: validação funcional com evidência; `ACCEPTED`/`REJECTED`.

## J. SECURITY

- Least privilege técnico por agente (verificado nas configs carregadas); QA sem edição de implementação.
- Denials duros contra destruição (`push --force`, `reset --hard`, `rm -rf /`); QA impedido de push/commit.
- Proibição absoluta de secrets/credenciais em código, commits ou relatórios; `.gitignore` já cobre `.env*`, chaves; nada de fictício adicionado ao CI (workflow usa apenas ações públicas padrão).
- Independência de QA garantida tecnicamente (permissões + prompts), sem fingir identidade GitHub inexistente.
- Isolamento por tenant e autorização listados como dimensões obrigatórias de review (herdadas dos NFRs/ADR-005).

## K. DRY RUN

Executado e documentado (`dry-run/DRY_RUN_REPORT.md`): fluxo PO→Análise→Plano→QA (com devolução `CHANGES_REQUESTED` real na simulação)→Aceite→DONE. Contratos validados ponta a ponta; um gap encontrado (campo CI quando não há workflow aplicável) resolvido com regra explícita `CI: NOT_APPLICABLE`. **Status: VALIDATED**. Nenhum item real foi poluído.

## L. VALIDATION

| Verificação | Comando | Resultado |
|---|---|---|
| Agentes reconhecidos | `opencode agent list` | 4 agentes listados como primary ✅ |
| Permissões aplicadas | `opencode agent list` (inspeção) | denials/allows corretos (PO e QA confirmados) ✅ |
| Lint dos arquivos novos | `npx markdownlint-cli2 docs/factory/**/*.md .github/**/*.md .opencode/agent/*.md` | 0 issues ✅ |
| Sintaxe do workflow | parse YAML via Node | válido, 2 jobs ✅ |
| Lógica de diff do CI | `git diff --name-only ... ':!**/node_modules/**'` | funciona ✅ |
| Lint completo do repo | markdownlint full | legado tem dívida (~300 issues) — coberta por job não-bloqueante ⚠️ |
| CI no GitHub | execução real | **NÃO executável desta máquina** — só ocorrerá no primeiro PR; nunca declarado aprovado sem execução ❌ (pendente honesta) |

## M. BLOCKERS

1. **GitHub remoto administrativo** — `BLOCKED_GITHUB_AUTH`: `gh` não instalado/autenticado. Desbloqueio: `gh auth login --scopes repo,project` (ver §G).
2. **Rulesets/proteção de branch** — `BLOCKED_GITHUB_PERMISSION`: requer permissão admin no repo.
3. **`opencode github install`** — `AWAITING_CREDENTIAL`: exige secret de provedor no GitHub Actions.

## N. OPEN DECISIONS (humanas)

1. Aprovar (ou não) os ADR-001..011 — permanecem `Proposed`; nada foi promovido.
2. Executar `gh auth login` e autorizar criação de Project/labels/rulesets.
3. `docs/decisions/README.md` contém tabela desatualizada ("nenhum ADR registrado") enquanto existem 11 ADRs Proposed — inconsistência pré-existente registrada aqui, **não corrigida silenciosamente**.
4. Definir quando criar identidades GitHub de serviço para os agentes (hoje: independência é técnica/processual).
5. Futuro: avaliar quinto mecanismo de orquestração (proibido nesta versão).

## O. RECOMMENDATIONS (não implementar agora)

- Migrar lint de docs para bloqueante em todos os arquivos após sanear a dívida legada.
- Adicionar link-checker de documentação quando o volume crescer.
- Configurar rulesets assim que credencial admin existir; então exigir check `changed-docs-lint`.
- Quando a stack for definida (ADRs Accepted), estender o pipeline (install→lint→tests→build) sem duplicar workflows.
- Avaliar `opencode github install` com segredos gerenciados quando houver conta de serviço.

---

## MATRIZ FINAL

| Componente | Status |
|---|---|
| servium-po | OK |
| servium-senior | OK |
| servium-pleno | OK |
| servium-reviewer-qa | OK |
| Agent governance | OK |
| Workflow | OK |
| GitHub authentication | BLOCKED (gh ausente) |
| GitHub Project | BLOCKED (depende de auth) |
| GitHub Issues | PARTIAL (templates prontos; labels/criação remotas bloqueadas) |
| GitHub templates | OK (locais; efetivos pós-merge) |
| Pull Request template | OK |
| GitHub Actions | PARTIAL (definido e validado localmente; execução real pendente de PR) |
| Quality Gates | OK |
| Dry Run | OK |

## GATE FINAL

- Quatro agentes existem e são reconhecidos ✅
- Responsabilidades segregadas tecnicamente ✅
- Workflow e gates definidos ✅
- Templates existem ✅
- Configuração local validada ✅

**SERVIUM SOFTWARE FACTORY: READY**
**READY FOR AGENT-DRIVEN DEVELOPMENT: YES**
**GITHUB INTEGRATION: PARTIAL** — pendência exclusivamente de credencial externa (`gh auth login`); tudo mais definido e validado localmente.
