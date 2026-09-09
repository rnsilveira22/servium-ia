# FACTORY V2 — M0 IMPLEMENTATION REPORT (UX Foundation)

**Data:** 2026-09-08 · **Orchestrator:** `servium-orchestrator` · **Branch:** `feat/web-ux-m0-foundation@8c7ab2f` · **PR:** [#96](https://github.com/rnsilveira22/servium-ia/pull/96)

---

## 1. Executive Summary

M0 — **Fundação Visual** implementado conforme autorização `HUMAN_GATE_UX_M0` e blueprint Fase 2 (PR #92). Escopo estritamente **`apps/web`**, incremental, sem nova dependência instalada, sem mudanças de API/banco/schema/motor/regras de domínio. `npm run verify` completo verde (**178 testes**, 5 workspaces). PR #96 aberto aguardando **Selenium CI + visual QA + `HUMAN_GATE_UX_M0_ACCEPTANCE`**.

| Pilar | Estado | Evidência |
|---|---|---|
| E-01 Design System | **DONE** | `brand-tokens.css` + `App.css` tokenizado |
| E-02 Componentes Base | **DONE** | Button, Field, Badge/StatusBadge, Card, Table, Skeleton, Toast |
| Menu Mobile | **DONE** | toggle/a11y + backdrop + Escape + fecha ao navegar |
| Acessibilidade | **DONE** | focus-visible token, reduced-motion, Field (id/aria-describedby/aria-invalid), Modal (aria-modal/labelledby/focus trap) |
| Testes | **DONE** | +18 testes de componentes; regressão 25/25 web preservada |

---

## 2. Escopo entregue

### 2.1 E-01 — Design System

`apps/web/src/styles/brand-tokens.css`:

- Paleta derivada da marca: famílias `--navy-*`, `--teal-*`, `--mint-*`, `--ink-*`;
- Estados semânticos: `--color-success/warning/error/info` + variantes `-bg`/`-border`;
- Tipografia `--font-size-*` / `--font-weight-*`, espaçamento `--space-*`, `--radius-sm/radius/radius-lg`, `--focus-ring-*`.

`apps/web/src/App.css`: migrado para aliases de tokens (sem auto-referências circulares), badges tokenizados, `:focus-visible` via `--focus-ring-*` e `@media (prefers-reduced-motion: reduce)` global.

### 2.2 E-02 — Componentes Base

`apps/web/src/components/`:

- `Button.tsx` — variantes `primary/secondary/ghost/danger`, tamanhos `sm/md`, estado `loading` (`aria-busy` + spinner, desabilita);
- `Field.tsx` — `cloneElement` injeta `id`, `aria-describedby` (hint/erro) e `aria-invalid`; label com `htmlFor`; suporte `required`;
- `Badge.tsx` — `Badge` (tones) + `StatusBadge` (mapa de estado→tone);
- `Card.tsx` — title/value/label + variante `alert`;
- `Table.tsx` — wrapper responsivo + `TableHead` (children colspan) + `Td`/`Th` com `scope`;
- `Skeleton.tsx` — placeholder de carregamento;
- `Toast.tsx` — `ToastProvider`/`useToast` (auto-dismiss 5s, `role` status/alert), integrado em `App.tsx`;

`Modal.tsx` (existente) **reutilizado** — sem duplicação.

### 2.3 Menu Mobile + Páginas migradas

- `Layout.tsx`: toggle consolidado (`aria-expanded`/`aria-controls="sidebar-nav"`, texto "Abrir/Fechar menu"), backdrop, fechar no `Escape` e ao navegar; botão "Sair" via componente.
- Páginas: Login, Dashboard, Clientes, Obrigações, Ciclos, Ciclo Detalhe, Exceções, Auditoria — sem alteração de textos/roles cobertos por teste.
- Corrigido interativo aninhado (botão dentro de link) no empty state do Dashboard.

---

## 3. Fora de escopo (preservados)

| Item | Status |
|---|---|
| M1..M5 | NÃO autorizados (HG-UX-M0) |
| Gráficos/Recharts/shadcn · libs pesadas | Não utilizadas |
| Novos endpoints / API / DB / schema / motor / domínio | Nenhuma alteração |
| Dark mode | OUT_OF_SCOPE (HG-UX-M0) |

---

## 4. Quality Gates

| Gate | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros |
| `npm run typecheck` | ✅ OK |
| `npm run build` (todos os workspaces) | ✅ OK |
| `npm run test` (5 workspaces) | ✅ **178 testes** (108 api, 43 web, 24 db, 2 runtime-e2e, 1 shared-types) |
| `npm run verify` completo | ✅ verde |
| Selenium E2E (`.github/workflows/e2e.yml`) | ⏳ CI (requer postgres + web + api) |

### Novos testes

`Button.test.tsx`, `Field.test.tsx`, `Badge.test.tsx`, `Modal.test.tsx` — **18 testes** cobrindo variantes, loading/disabled, label/htmlFor, hint/erro/aria-*, tones de status, dialog/aria-modal/focus trap/Escape/backdrop/restauração de foco.

### Regressão

Os **25 testes web pré-existentes** permanecem verdes, incluindo restrições de nomes/roles: menu mobile #94, botões de ciclo (#73, #80/#81), combobox de obrigações, exceções admin.

---

## 5. Risks / Notas

| Item | Nota |
|---|---|
| `StatusBadge` tone `activo` → classe `badge-ativo` | funcionando; typo interno documentado |
| CicloDetalhe badges | mantém `ESTADO_LABEL` capitalizado (cobertura #73 exige "Cancelado") |
| `Field` via `cloneElement` | requer elemento host (`input/select/textarea`); não injeta em componentes custom |
| Selenium | executado apenas no CI (infra docker local indisponível para a sessão) |

---

## 6. FINAL VERDICT

| Critério | Status |
|---|---|
| Escopo dentro da autorização HG-UX-M0 | ✅ Sim (só `apps/web`) |
| Sem mudanças fora de escopo | ✅ Confirmado |
| Quality gates locais | ✅ Verdes (lint, typecheck, build, 178 testes) |
| Selenium CI | ⏳ Em execução na PR #96 |
| Visual QA | ⏳ Pendente (humano/CI) |

> **VERDICT: QA_REVIEW** — implementação M0 concluída e elegível a review; merge **condicionado** ao Selenium verde e ao `HUMAN_GATE_UX_M0_ACCEPTANCE`. **M1 permanece NOT_AUTHORIZED.**
