# FACTORY V2 — Reconciliação do estado real do GitHub (setembro/2026)

> **Agente:** big-pickle (`opencode/big-pickle`)
> **Plataforma:** OpenCode (CLI)
> **Repositório:** `rnsilveira22/servium-ia`
> **Data da auditoria:** 2026-09-12
> **HEAD auditado (`main`):** `dfb75c0` (13/09/2026 local: 12/09) — merge da PR #98
> **Branch de trabalho:** `chore/factory-v2-reconciliation-2026-09` (docs, base `origin/main`)
> **Tipo:** auditoria **somente-leitura** — nenhum código de produto foi alterado; documentação atualizada apenas factualmente (`FACTORY_STATUS.md`, `HUMAN_DECISIONS_LOG.md`, este relatório).

---

## 1. Método

- Evidência coletada via `gh` (CLI autenticado como `rnsilveira22`, scopes `repo`) e `git` (fetch --prune; diffs/`ls-tree`/blobs).
- Objetivo: comparar a documentação de governança (Factory V2, último snapshot 2026-09-08) com o estado **real** de PRs, Issues, branches e código em `origin/main`.
- Regras respeitadas: **não** implementar código, **não** aprovar/reprovar Human Gates, **não** fechar Issue por conveniência, **não** inferir estado inventado — decisões não determináveis por evidência ficam `AWAITING_DECISION`.

## 2. Baseline do git

| Item | Valor |
|---|---|
| `origin/main` | `dfb75c0` — `feat(api): M1 Wave B1 — configurações do tenant, email obrigatório e evidências do motor (#98)` |
| Parente direto | `95c8160` — M0 UX (`feat(web): implement UX foundation M0 (#96)`) |
| Worktree principal | branch `feat/m1-frente-a-pleno` (`20af34f`, **3 commits à frente de `main`**, limpo) |
| Trabalhos | `/tmp/opencode/servium-m1-frente-a` (Frente A), `/tmp/opencode/servium-m1-frente-b` (Frente B) |
| Move rejeitado | `fetch` removeu `origin/feat/94-ux-correcoes-p0p1` (branch já mergeada via PR #95) |

## 3. Auditoria de PRs

| PR | Título/Conteúdo | Estado em 2026-09-12 | Merge commit | Data do merge | Observação |
|---|---|---|---|---|---|
| #90 | ASVS 4.0.3 nível 1 (P0.3-D, `Closes #57`) | **MERGED** | `a8c057a` (rebase) | 08/09 | L3 humano |
| #92 | Blueprint UX/UI Fase 2 | **MERGED** | `731c009` (squash) | 08/09 | L3 humano |
| #95 | Correções P0/P1 UX/UI auditoria (`Closes #94`) | **MERGED** | `30744fa` (squash) | 07/09 | L2 |
| #96 | M0 UX — Fundação Visual (`feat/web-ux-m0-foundation`) | **MERGED** | `95c8160` (squash) | **09/09** | merge humano `rnsilveira22`; **sem reviews registrados** |
| #97 | Dependabot (devDeps) `build(deps-dev)` | **OPEN** | — | — | única PR aberta no repo |
| #98 | M1 Wave B1 backend (OPS-01/03/04A/05/07) | **MERGED** | `dfb75c0` (squash) | **10/09** | merge humano `rnsilveira22`; **sem reviews** |
| #91 | Fix #73 (cancelar ciclo) | CLOSED sem merge | — | — | commit do fix `6c15781` já estava na `main` |

**Conclusões PR:**

1. O snapshot da Factory (08/09) registrava "M0 `AWAITING_HUMAN_DECISION` · sem merge antes da decisão" — **falso a partir de 09/09** (PR #96 merged).
2. A Factory V2 não registra o merge da PR #98 (Wave B1) em lugar algum.
3. Existe **código M1 UX implementado e sem PR**: branch `feat/m1-frente-a-pleno` (`3f6ebdb` M1-UI-01 · `a45f830` M1-UI-05 · `20af34f`) — 3 commits à frente de `main`.
4. PR #98 foi mergeada com **1 conferência L3 do próprio PR em branco** ("Revisar diffs de `auditoria.controller.ts` e `cadastro.controller.ts`") — recomendação de merge para revisão pendente registrada.
5. Fila L2/L3 **não está zerada** (#97 aberta), contrariando o texto anterior "nenhum PR aberto".

## 4. Auditoria de Issues (abertas em 2026-09-12)

| Issue | Título | Prioridade | Estado GitHub | Factory V2 (snapshot) | Diferença |
|---|---|---|---|---|---|
| #8 | Framework de jobs persistidos (SKIP LOCKED/retry/backoff/idempotency) | P1 | OPEN | OPEN | ok |
| #9 | Trilha de auditoria append-only (epic P0) | P0 | OPEN | OPEN (DONE no board) | ok (drift de board já registrado) |
| #58 | `[PRM-M-17]` Exceções abertas por tenant | P2 | OPEN | OPEN | ok |
| #59 | `[PRM-M-08]` Métrica profundidade da fila | P2 | OPEN | OPEN | ok |
| #72 | Obrigação não editável pela interface (bug/gap P1) | P1 | OPEN | OPEN | ok |
| #20 | Auth mínima (slice ADR-009) | P0 | **CLOSED (24/08)** | OPEN | **DRIFT — corrigido** (linha atualizada) |
| #57 | ASVS P0.3-D | P0 | CLOSED (via PR #90) | MERGED | ok |

## 5. Validação do Wave B1 (PR #98) no código de `origin/main`

| Deliverable | O que entrega | Evidência em `origin/main` |
|---|---|---|
| M1-OPS-05 | `GET/POST/PUT /configuracoes` (e-mail escritório + janela), `ConfiguracoesModule`, migração | `apps/api/src/cadastro/configuracoes.controller.ts` (50 ln), `apps/api/src/cadastro/cadastro.module.ts`, `packages/db/migrations/0011_emails.sql` (`tenants.email_escritorio`), `apps/api/test/configuracoes.test.ts` (121 ln) |
| M1-OPS-04A | E-mail obrigatório e validado em `POST /clientes` (DD-08, anti-CRLF) | `apps/api/src/cadastro/cadastro.controller.ts:49-57`, `apps/api/src/common/email-validation.ts` (37 ln) |
| M1-OPS-01 | `template_id` aceito em `POST /obrigacoes` (retrocompatível) | `apps/api/src/cadastro/cadastro.controller.ts`, `apps/api/test/cadastro.test.ts` (103 ln) |
| M1-OPS-03 | Evidências de sucesso/erro do motor + correção de retry na fila | `apps/api/test/motor-erro.test.ts` (441 ln), ajustes em `motor.test.ts` |
| M1-OPS-07 | `actor_nome` na trilha de auditoria (corretiva DA-02) | `apps/api/src/auditoria/auditoria.controller.ts` (30 ln diff), `packages/db/src/audit.ts` |

- `npm run verify` (declarado na PR): **exit 0** — API 138 passed/2 skipped · Web 43 · Runtime E2E 2 · lint/build/typecheck verdes. Migração `0011_emails.sql` aplicada em DB limpo `servium_m1_b`.
- **M1-OPS-04B** (legados sem e-mail): **NÃO executado** — `AWAITING_DECISION` (confirmado pela PR e pelo código: apenas novos clientes exigem e-mail).
- E2E Selenium realinhado em `f0ca3f7` (`ciclo-activation.test.ts` agora envia e-mail no `POST /clientes`) — no histórico da PR #98.

## 6. Validação do M0 (PR #96) em `origin/main`

| Área | Arquivos presentes |
|---|---|
| Design System | `apps/web/src/styles/brand-tokens.css` (tokens navy/teal/mint) |
| Componentes base | `apps/web/src/components/{Button,Card,Field,Modal,Skeleton,Table,Toast,Badge}.tsx` (+ testes) |
| a11y estrutural | `Field.tsx` com `label > span + input` (fix `6312ea1`) |
| CI | `.github/workflows/{ci,docs-ci,e2e}.yml` |

Pré-merge (validação 08/09): Selenium local 31/31 · CI 4/4 · Visual QA 18/18 · `npm run verify` 178 testes.

## 7. Tabela de Human Gates (evidência vs documentação)

| Gate | Estado da decisão | Evidência no GitHub | Registro formal | Lacuna |
|---|---|---|---|---|
| HG-F2-01/02/03, HG-REC-01, HG-PR-SEC | APROVADO | — | `HUMAN_DECISIONS_LOG.md` | nenhuma |
| HG-UX-M0 (fundação visual, implementação M0) | APROVADO (08/09) | PR #96 criada/autorizada | log OK | nenhuma |
| **HG-UX-M0_ACCEPTANCE** (autorização do merge do M0) | **Não registrado** | PR #96 MERGED 09/09 (`95c8160`) | **ausente** | decisão de aceite implícita no merge; falta registro formal |
| **HG-UX-M1** (plano M1 PARALELO) | Aprovação do plano citada (09/09) **apenas** no backlog executável não commitado | — | **ausente** | documento-fonte perdido/não commitado |
| **Merge Wave B1 (PR #98)** | Executado pelo owner 10/09 | PR #98 MERGED (`dfb75c0`) | **ausente** | decisão de merge não registrada no log |
| **M1 UX (Frente A)** | Não há decisão/revisão | branch `feat/m1-frente-a-pleno` (sem PR) | **ausente** | implementação sem PR/gate |

## 8. Classificação do drift documental

| Severidade | Item |
|---|---|
| **CRITICAL** | `FACTORY_STATUS.md` (08/09): "M0 `AWAITING_HUMAN_DECISION`" e "sem merge antes da decisão" ≠ PR #96 mergeada (09/09); "nenhum PR aberto" ≠ #97 open; HG-UX-M0_ACCEPTANCE executado sem registro |
| **CRITICAL** | Decisões/gates não registrados: aceite do M0, aprovação do plano M1 (09/09), merge do Wave B1 — sem rastro em `HUMAN_DECISIONS_LOG.md` |
| **HIGH** | Artefatos de análise **não commitados e hoje ausentes do worktree**: `docs/ux/FACTORY_V2_UX_UI_EVOLUTION_BACKLOG.md`, `docs/ux/FACTORY_V2_UX_UI_REFERENCE_COMPARISON.md`, `docs/factory/FACTORY_V2_M1_EXECUTABLE_BACKLOG.md` (Revisão 2) — recuperáveis apenas como blobs/checkpoints efêmeros (`refs/codex/...`) |
| **HIGH** | M1 UX (Frente A) implementada e publicada em `origin` sem PR e sem gate — código invisível interativamente, risco de desalinhamento com a `main` |
| **MEDIUM** | Fila efetiva: linha da Issue #20 listava OPEN (GitHub: CLOSED 24/08) — **corrigido** neste commit |
| **MEDIUM** | `HUMAN_DECISIONS_LOG.md` "Pendências": HG-UX-M1 "aguardando conclusão do M0" — M0 mergeado desde 09/09 |
| **MEDIUM** | PR #98 mergeada com conferência L3 própria ("revisar diffs") não marcada |
| **LOW** | Reports de validação M0 (`M0_UX_FOUNDATION_VALIDATION_REPORT.md`, `HUMAN_GATE_UX_M0_ACCEPTANCE_REQUEST.md`) descrevem estado pré-merge |

## 9. `AWAITING_DECISION` (não decidido nesta auditoria)

| Item | O que o humano precisa decidir |
|---|---|
| Formalizar retroativamente o registro do `HG-UX-M0_ACCEPTANCE` (merge M0 ocorreu 09/09) | Registrar APPROVE/data ou o que for factual |
| Registrar a aprovação do plano M1 PARALELO (09/09) | Confirmar existência + registrar |
| Registrar a decisão de merge do Wave B1 (PR #98) | Registrar no `HUMAN_DECISIONS_LOG.md` |
| M1 UX Frente A (`feat/m1-frente-a-pleno`) | Criar PR + submeter a gate? Rebase? |
| M1-OPS-04B (legados sem e-mail) | Definir tratamento (bloqueada desde B1) |
| Recuperar/commitar os docs perdidos (`docs/ux/*`, `FACTORY_V2_M1_EXECUTABLE_BACKLOG.md`) | Sim/não (blobs disponíveis para `git cat-file -p`) |
| Issue #20 (já CLOSED) e novos itens de fila | Reconfirmar prioridade P0 → ajustar board |
| CA-D-3 (revisão de segurança do ASVS) | Pendência pré-existente (condição para `PILOT_READY`) |

## 10. Recomendações

1. **Decidir e registrar** os gates ausentes (§9 acima) — sem isso `FACTORY_STATUS.md` volta a divergir.
2. **Abrir PR da Frente A** (M1-UI) sobre a `main` atual para manter a implementação visível/revisável.
3. **Recuperar os artefatos de análise** a partir dos blobs (comandos `git cat-file -p <blob> > docs/...`) e commitar sob decisão expressa.
4. Acompanhar/revisar a PR **#97** (dependabot) na próxima onda L2.
5. Manter a **linha HG-UX-M1** do log atualizada depois da formalização do plano.
6. `M1-OPS-04B` e priorização de #72/#58/#59 ficam condicionados às decisões acima.

---

## Anexo — evidências de auditoria

- `gh pr list --state all` (a partir de #90: #90/#92/#95/#96/#97/#98 mais antigas).
- `gh issue list --state open` → #8/#9/#58/#59/#72; `gh issue view 20` → CLOSED 24/08.
- `git log --all` / `git ls-tree origin/main` — trechos de código das §5–6.
- `git diff dfb75c0^ dfb75c0` — 15 arquivos, **+910/−32**.
- `git rev-list --all --objects` + `git cat-file -p a72fcc2…` (backlog executável M1 Rev 2); blobs `6b35471a…`/`cdde5518…`/tree `9336df4…` (`docs/ux`) — todos fora de branches.
