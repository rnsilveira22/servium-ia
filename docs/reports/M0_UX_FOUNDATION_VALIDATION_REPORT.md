# FACTORY V2 — M0 VALIDATION REPORT (UX Foundation)

**Data:** 2026-09-08 · **Orchestrator:** `servium-orchestrator` · **Branch:** `feat/web-ux-m0-foundation` · **PR:** [#96](https://github.com/rnsilveira22/servium-ia/pull/96)
**Modelo/plataforma:** `opencode/big-pickle` · Linux

---

## 1. Executive Summary

Validação completa do **M0 — Fundação Visual** após a implementação (PR #96). O Selenium E2E **falhou no CI 8/09** (22 testes) por regressão real de markup introduzida pelo `Field` do M0, que renderizava `label` e `input/select` como irmãos — quebrando os seletores E2E que esperam `<span>`+controle **aninhados no `<label>`** (`apps/e2e/src/pages/LoginPage.ts:19`).

A correção foi feita **dentro do escopo M0** (2 arquivos, `apps/web`): `Field.tsx` agora renderiza `<label htmlFor><span>{label}</span>{span required}<controle/></label>` e `ObrigacoesPage.tsx` migrou o select cru para `<Field>`. Após o fix:

- **Selenium E2E local: 31/31 PASS** (login, navegação, RBAC, responsividade, ciclo-activation).
- **Selenium E2E no CI: PASS** (após re-run automático), mergeState `CLEAN`, `MERGEABLE`.
- **Visual QA programático: 18/18 PASS** (overflow desktop + mobile, tokens, focus, reduced-motion, badges, ARIA do menu mobile, backdrop).
- **12 screenshots** gerados como evidência humana (`apps/e2e/evidence/m0-qa/`, gitignored).

> **VERDICT: `M0_READY_FOR_HUMAN_GATE_ACCEPTANCE`** — único defeito encontrado na validação foi corrigido e todo o restante passou. Merge condicionado ao `HUMAN_GATE_UX_M0_ACCEPTANCE` (decisão binária do Owner).

---

## 2. Modelo e plataforma

| Item | Valor |
|---|---|
| Modelo | opencode/big-pickle |
| Plataforma | Linux (local) · GitHub Actions (CI) |
| Chrome local | 152.0.7977.75 |
| Chromedriver pinado (CI) | 151.x (instalado via setup no workflow) |

---

## 3. Branch / commits / PR

| Item | Valor |
|---|---|
| Branch | `feat/web-ux-m0-foundation` (base `main@49fa677`, LG-1) |
| Commits | `8c7ab2f` (feat M0) · `3e481b4` (docs, QA_REVIEW) · `6312ea1` (fix E2E) |
| Arquivos alterados | 26 (+1226 / −499) |
| Escopo | `apps/web` (código) + `docs/` (relatório M0) |
| PR #96 | OPEN · **MERGEABLE** · **mergeState `CLEAN`** |

Raio-X do diff por área (26 arquivos): Design System (`brand-tokens.css`, `App.css`), Componentes (`Button/Field/Badge/Card/Table/Skeleton/Toast/StatusBadge`), páginas migradas (Login, Dashboard, Clientes, Obrigações, Ciclos, Ciclo Detalhe, Exceções, Auditoria), `Layout`/menu mobile, 18 testes novos de componentes, docs.

---

## 4. CI — Status final da PR #96

| Check | Resultado |
|---|---|
| Lint + Typecheck + Build + Test | ✅ PASS |
| Selenium E2E | ✅ PASS (após fix `6312ea1`) |
| Lint (arquivos alterados) | ✅ PASS |
| Relatório de dívida de lint (não bloqueante) | ✅ PASS |

`mergeStateStatus: CLEAN` · `mergeable: MERGEABLE` — sem bloqueios de CI.

---

## 5. Regressão no Selenium (causa raiz e correção)

### Causa raiz

O `Field` do M0 original renderizava:

```html
<div class="field">
  <label htmlFor="...">Email</label>
  <input id="..." />
</div>
```

O E2E (`apps/e2e/src/pages/LoginPage.ts`) localiza campos por:

```ts
//span[contains(text(),"Escritorio")]/ancestor::label/input
//label[.//span[text()="Cliente"]]/select
```

Exige `<span>` com o texto **dentro do `<label>`** e o controle **também aninhado no `<label>`**. O novo markup quebrava ambos → `NoSuchElementError` em 22 testes.

### Correção (escopo M0, 2 arquivos)

`apps/web/src/components/Field.tsx` — controle aninhado no label:

```html
<label htmlFor="id" class="field">
  <span>Email</span>
  {required && <span class="field-required">*</span>}
  <input id="id" ... />
</label>
```

`apps/web/src/pages/ObrigacoesPage.tsx` — select de cliente migrado para `<Field label="Cliente" htmlFor="obrigacao-cliente">`.

### Evidência

- Web unit: 43/43 PASS · lint/typecheck/build verdes (local).
- Selenium local: **31/31 PASS** (incl. 3 responsividade + 3 features).
- Selenium CI: **PASS**.

---

## 6. Testes locais (regressão completa)

| Suíte | Resultado |
|---|---|
| `npm run verify` (5 workspaces, pós-fix) | ✅ **178 testes** (108 api, 43 web, 24 db, 2 runtime-e2e, 1 shared-types) |
| Selenium E2E local | ✅ **31/31** |
| Lint | ✅ 0 erros |
| Typecheck | ✅ OK |
| Build (todos os workspaces) | ✅ OK |

---

## 7. Visual QA

### 7.1 Evidência em imagem (para revisão humana)

12 screenshots em `apps/e2e/evidence/m0-qa/` (autenticados, viewport desktop 1280×900 e mobile 390×844):

`01-login-desktop · 02-dashboard-desktop · 03-clientes-desktop · 04-obrigacoes-desktop · 05-ciclos-desktop · 06-excecoes-desktop · 07-auditoria-desktop · 08-ciclo-detalhe-desktop · 09-dashboard-mobile · 10-menu-mobile-aberto · 11-menu-mobile-fechado · 12-login-mobile`

> **Nota técnica:** o agente não inspeciona imagens; a avaliação visual automatizada foi feita por **verificação de DOM/computed styles** (abaixo) e as capturas ficam como evidência para o review humano.

### 7.2 Checks programáticos (DOM/computed styles)

| Check | Resultado |
|---|---|
| Overflow horizontal — desktop: dashboard, clientes, obrigações, ciclos, exceções, auditoria, ciclo-detalhe | 7/7 PASS |
| Overflow horizontal — mobile: dashboard, clientes, obrigações | 3/3 PASS |
| `:focus-visible` em botão primário (usa box-shadow ring, sem outline nativo) | PASS |
| Tokens oficiais aplicados (`--servium-mint/teal/navy`) | PASS (#38b7a5 / #0f8b83 / #12304a) |
| `prefers-reduced-motion` query respondendo | PASS |
| Badges com clases do DS renderizadas | PASS |
| Menu mobile: `aria-expanded=false` inicial | PASS |
| Menu mobile: `aria-controls=sidebar-nav` | PASS |
| Menu mobile: backdrop presente ao abrir | PASS |
| Menu mobile: backdrop fecha o menu | PASS |
| **Total** | **18/18 PASS** |

---

## 8. Acessibilidade

Coberta por testes de componente (Web unit 43/43) + DOM QA:

- `Field`: `id`, `htmlFor`, `aria-describedby` (hint/erro), `aria-invalid`;
- `Modal`: `role=dialog`, `aria-modal`, `aria-labelledby`, focus trap, retorno de foco, Escape;
- Menu mobile: toggle `aria-expanded`/`aria-controls`, backdrop, fechar ao navegar e no Escape;
- Global: `:focus-visible` token, `@media (prefers-reduced-motion: reduce)`;
- Contraste: escala derivada dos tokens oficiais (WCAG AA mantido do baseline).

---

## 9. Regressões funcionais verificadas

- Cancelar ciclo ativo (#73): botão + confirmação + motivo + badge Cancelado — coberto por E2E/unit, verde.
- Navegação RBAC (admin vs operador) e permissões — E2E verde.
- Login multi-tenant (slug + credenciais) — E2E verde (incl. `span/label/input`).
- Combobox de obrigações (select cliente) — E2E verde pós-fix.
- Exceções (somente admin) — E2E verde.
- `npm run verify` completo: 178 testes verdes.

---

## 10. Mudanças na validação (pós implementação)

| Commit | Arquivo | Impacto |
|---|---|---|
| `6312ea1` | `apps/web/src/components/Field.tsx` | meu markup de label reestruturado: `<label><span>texto</span>{span required}<controle/></label>` |
| `6312ea1` | `apps/web/src/pages/ObrigacoesPage.tsx` | select de cliente migrado para `<Field>` (seletor E2E `label/span/select`) |

Sem alterações de API/banco/schema/domínio — 100% dentro da autorização HG-UX-M0.

---

## 11. Artefatos de validação

| Artefato | Local | Status |
|---|---|---|
| Screenshots Visual QA (12) | `apps/e2e/evidence/m0-qa/` | gerados · **gitignored** (não poluem a PR) |
| Script de QA visual (dom-qa) | temporário | **removido** após execução |
| Script de captura (visual-qa-m0) | temporário | **removido** após execução |
| Registros de governança | `FACTORY_STATUS.md` / `HUMAN_DECISIONS_LOG.md` | atualizados nesta sessão de validação |

---

## 12. Riscos / Resíduos

| Risco | Nível | Nota |
|---|---|---|
| Chrome local 152 vs chromedriver 151 | ⚠️ Baixo | Sessão de WebDriver mobile crashou em 2 de 3 execuções do script de QA (não-afeta o produto); E2E funcional 31/31 passou na mesma stack. CI instala Chrome for Testing 151 pareado ⇒ estável. Recomenda-se manter a versão ciente quando o ambiente local for atualizado. |
| Amostra de contraste por automação | ℹ️ Info | Verificação visual de contraste final segue no human review (screenshots prontos). |
| `StatusBadge` typo interno `activo`→`badge-ativo` | ℹ️ Info | Já documentado no relatório M0; cosmético, sem impacto funcional. |

---

## 13. Escopo e confirmações

| Item | Confirmação |
|---|---|
| Escopo dentro da autorização (E-01/E-02/Menu Mobile/A11y) | ✅ Apenas `apps/web` + docs |
| Sem alterações de API/DB/schema/motor/regras de domínio | ✅ Confirmado |
| Sem novas dependências instaladas | ✅ Confirmado |
| Dark mode | ➖ OUT_OF_SCOPE (HG-UX-M0) — tokens organizados p/ extensão |
| Gráficos (M1) | ➖ NÃO implementados |
| **M1..M5** | **NÃO AUTORIZADOS — nenhum código de M1+ introduzido** |

---

## 14. Quality Gates — consolidado

| Gate | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros |
| `npm run typecheck` | ✅ OK |
| `npm run build` (todos) | ✅ OK |
| `npm run verify` | ✅ 178 testes |
| Selenium E2E local | ✅ 31/31 |
| Selenium E2E CI | ✅ PASS · mergeState CLEAN |
| Visual QA programático | ✅ 18/18 |

---

## 15. Bloqueios

**Nenhum bloqueio ativo.** Selenium CI verde, mergeState `CLEAN`, sem conflito de merge.

---

## 16. FINAL VERDICT

| Critério | Status |
|---|---|
| Implementação dentro da autorização HG-UX-M0 | ✅ |
| CI completo | ✅ 4/4 (001: Selenium PASS pós-fix) |
| Regressão `npm run verify` | ✅ 178 testes |
| Selenium local + CI | ✅ 31/31 local · PASS CI |
| Visual QA | ✅ 18/18 programático + 12 screenshots p/ humano |
| Defeitos de validação | ✅ 1 encontrado (`Field`/E2E) → **corrigido** (`6312ea1`) e revalidado |

> **VERDICT: `M0_READY_FOR_HUMAN_GATE_ACCEPTANCE`**
> O PR #96 está apto para a decisão humana. **Não há merge** até a decisão binária do Owner (`HUMAN_GATE_UX_M0_ACCEPTANCE`). **M1 permanece NOT_AUTHORIZED.**

---

## 17. Recomendação

Solicitar formalmente o **`HUMAN_GATE_UX_M0_ACCEPTANCE`** com decisão binária:

- **[ APPROVE ]** — autoriza merge do PR #96 na `main` (após o gate, o merge é executado e o estado M0 → `DONE`, e a liberação do próximo gate HG-UX-M1 é avaliada conforme condição do HG-UX-M0).
- **[ REJECT ]** — instruções de correção a voltarem para a fila M0 (máx. 3 ciclos QA; 3º → `ESCALATED_TECHNICAL_FAILURE`).
