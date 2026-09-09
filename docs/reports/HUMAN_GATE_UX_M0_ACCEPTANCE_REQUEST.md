# FACTORY V2 — HUMAN_GATE_UX_M0_ACCEPTANCE (SOLICITAÇÃO FORMAL)

**Modelo/plataforma:** `opencode/big-pickle` · Linux (local) + GitHub Actions (CI)
**Data da solicitação:** 2026-09-08 · **Orchestrator:** `servium-orchestrator`

---

## HUMAN_GATE_UX_M0_ACCEPTANCE

| Campo | Valor |
|---|---|
| **PR** | [#96](https://github.com/rnsilveira22/servium-ia/pull/96) |
| **Branch** | `feat/web-ux-m0-foundation` |
| **HEAD** | `b00da07` (o prompt de gate referencia `baef22b`; o commit `b00da07` — docs do relatório — foi adicionado na revalidação e é o HEAD real; CI re-executado nele: 4/4 verde) |
| **Base** | `main@49fa677` (LG-1) |
| **Estado** | `M0_READY_FOR_HUMAN_GATE_ACCEPTANCE` → **`AWAITING_HUMAN_DECISION`** |

### Evidências

| Critério | Resultado |
|---|---|
| Design System (E-01) | PASS |
| Componentes Base (E-02) | PASS |
| Menu Mobile | PASS |
| Acessibilidade | PASS |
| `npm run verify` | **178 PASS** (108 api · 43 web · 24 db · 2 runtime-e2e · 1 shared-types) |
| Selenium local | **31/31 PASS** |
| Selenium CI | **PASS** |
| Visual QA programático | **18/18 PASS** (overflow desktop+mobile, tokens, focus-visible, reduced-motion, badges, ARIA/backdrop menu mobile) |
| Evidência visual para humano | **12 screenshots** (`apps/e2e/evidence/m0-qa/`, gitignored) |
| Lint + Typecheck + Build (CI) | PASS |
| Mergeability | **CLEAN / MERGEABLE** |
| Alterações fora do escopo | Nenhuma (escopo estrito `apps/web` + docs) |

### Defeito encontrado durante QA

O componente `Field` inicialmente produzia markup incompatível com os seletores E2E (`span`+controle aninhados no `<label>`), causando falha do Selenium (22 testes).

**Correção:** `6312ea1` (escopo M0, 2 arquivos: `Field.tsx` + `ObrigacoesPage.tsx`).

**Resultado após correção:** `31/31 Selenium PASS` · Selenium CI PASS · `verify` 178 PASS · Visual QA 18/18 PASS · mergeState CLEAN.

### Riscos residuais

| Risco | Nível | Nota |
|---|---|---|
| Chrome local 152 vs chromedriver 151 | ⚠️ Baixo | Sessão não-funcional de WebDriver crashou localmente em capturas; CI estável (Chrome for Testing 151 pareado). Não afeta o produto. |
| Revisão visual final | ℹ️ Autoridade humana | Screenshots disponíveis; a aparência final permanece sob julgamento do Owner/review. |
| `StatusBadge` typo interno | ℹ️ Cosmético | `activo` → classe `badge-ativo` documentado; sem impacto funcional. |

### Escopo

| Item | Estado |
|---|---|
| **M0** | **READY** |
| **M1..M5** | **NOT_AUTHORIZED** (nenhum código de M1+ introduzido; sem gráficos/Recharts/endpoints/API/DB/schema/motor/regras/dark mode) |

---

## Pergunta ao Owner

> **HUMAN_GATE_UX_M0_ACCEPTANCE**
>
> A implementação M0 está tecnicamente validada e a PR #96 está pronta para merge.
>
> **Decisão do Owner:**
>
> `[ APPROVE ]` — aceitar M0 e autorizar merge da PR #96.
>
> `[ REJECT ]` — rejeitar M0 e retornar para correções.

**Timestamp da decisão:** ⏳ pendente
**Ação executada após a decisão:** — (a executar conforme resposta)
**Estado final:** `AWAITING_HUMAN_DECISION`

---

## NOTA DE GOVERNANÇA

- O merge **não será executado** sem decisão explícita do Owner.
- Silêncio, CI verde, `MERGEABLE` e recomendação técnica **não** equivalem a aprovação.
- `DONE` requer `QA_APPROVED + PO_ACCEPTED + MERGED` — não declarar antes.
- Após `APPROVE`: registrar decisão no `HUMAN_DECISIONS_LOG`, atualizar `FACTORY_STATUS`, executar merge, confirmar commit em `main` e PR merged, atualizar estado do M0, manter M1 NOT_AUTHORIZED.
- Após `REJECT`: não mergear; registrar decisão e motivos; retornar a fila (respeitando limite de ciclos QA da Factory V2); manter M1 NOT_AUTHORIZED.
