# Relatório — Suíte E2E Básica com Selenium (Servium IA MVP)

**Data:** 2026-08-30 (seção CI adicionada na entrega da Issue #42)
**Escopo:** Retomar/recuperar o WIP de `apps/e2e`, entregar uma suíte E2E básica determinística para o MVP e levá-la ao CI (GitHub Actions).
**Pré-requisitos:** Docker, Node 22+, Chrome 151+ (chromedriver 151.x), banco via `docker compose` (local) ou service container (CI).

## 1. Recuperação do WIP (Fase 1)

- Branch criada: `feat/selenium-e2e-basics` (a partir de `main` em `17e838a`).
- WIP anterior encontrado INTEGRO e reaproveitado:
  - `apps/e2e/` (não commitado) com page objects, driver, env e 3 arquivos de teste.
  - `package-lock.json` com as dependências `@servium/e2e`, `selenium-webdriver` e `chromedriver` (workspace já registrado).
- Nenhuma perda de trabalho: sem `git reset --hard`, sem `checkout --`, sem `git clean`, sem force push.

## 2. Correções aplicadas no WIP

### 2.1 Bug determinístico: `driver.wait(promise)` falhava imediatamente

Os page objects usavam `driver.wait(finder.isDisplayed(), ms)`. Quando o elemento ainda não existia, o `findElement` rejeitava e o `wait` NÃO fazia polling — falhava em milissegundos em vez de aguardar. Corrigido com condições `until.elementLocated(...)` (idiomática do Selenium).

### 2.2 Flakiness: login intermitente (posições tardias do arquivo)

As duas últimas tentativas de login de `permissions.test.ts` falhavam de forma intermitente (~50%). Diagnóstico via dump de estado (module `evidence.ts`): a página era recarregada (`deleteAllCookies` dispara reload no ChromeDriver) e o ciclo de preenchimento/submit era engolido. Correção:

- `loginAsAuthed()` com retry (até 3 tentativas) navegando para `about:blank` entre tentativas;
- `pollOutcome()` com waits `until` sequenciais (sidebar → alert-error → timeout);
- screenshots e dump de estado como evidência em `apps/e2e/evidence/` (gitignored).

Resultado: 2 execuções completas consecutivas **29/29 testes verdes**, 0 evidências de falha.

## 3. Achados reais corrigidos no app (bugfix mínimo)

### 3.1 Label de papel em CAIXA ALTA

`apps/web/src/App.css:128` aplica `text-transform: uppercase` em `.sidebar-role`. As afirmações E2E passaram a comparar o texto renderizado (case-insensitive) — `ADMINISTRADOR` / `OPERADOR`.

### 3.2 Overflow horizontal no mobile (login)

`apps/web/src/styles/brand-tokens.css`, media query `max-width: 480px`: `width: min(88vw, 390px)` não considerava o padding interno do `.login-card`, estourando o viewport em 390px. Correção: `max-width: 100%; height: auto;`. Verificado por `responsiveness.test.ts` (sem overflow no mobile).

## 4. Suíte entregue (apps/e2e)

| Área | Arquivo | Testes |
|---|---|---|
| Login (inicialização/authentication) | `src/tests/login.test.ts` | 6 |
| Navegação | `src/tests/navigation.test.ts` | 7 |
| Proteção de rotas / sessão | `src/tests/auth.test.ts` | 5 |
| Permissões (RBAC FE↔API) | `src/tests/permissions.test.ts` | 4 |
| Responsividade básica | `src/tests/responsiveness.test.ts` | 4 |
| Saúde / comunicação FE/API | `src/tests/health.test.ts` | 3 |
| **Total** | | **29** |

Suportes: `src/pages/{LoginPage,LayoutPage}.ts` (page objects), `src/support/{driver,evidence}.ts`, `src/config/env.ts`, `vitest.config.ts` (pool forks singleFork), `run-e2e.sh`.

Seed estendido (`scripts/seed.mjs`): usuário **operador** `oper@dev.local`/`oper123` (papel `operador`) para validar RBAC, idempotente e com envs opcionais `SEED_OPERATOR_EMAIL`/`SEED_OPERATOR_PASSWORD`.

## 5. Execução determinística

```bash
bash apps/e2e/run-e2e.sh        # DB + seed + API + Web + vitest headless
# ou, com servidores já ativos:
cd apps/e2e && HEADLESS=1 npx vitest run
```

Pipeline do runner: Postgres (`docker compose up -d --wait`) → migrations (`npm run migrate`, idempotente) → seed (admin+operador) → build API → API `:3000` + Web Vite `:5173` (`--strictPort --host 127.0.0.1`, background, log em mktemp) → wait `/health` (db:true) e `/login` → `vitest run`. Cleanup via `trap` encerra o group set de cada processo (`setsid` + `kill -- -PID`).

## 6. Gates de qualidade

| Gate | Resultado |
|---|---|
| `npm run lint` | 0 erros |
| `npm run typecheck` | ok |
| `npm run build` | ok |
| `npm run test` (unit) | 7 arquivos / 40 testes ok + web 2 |
| `npm run lint:docs` | 0 erros nos arquivos alterados |
| E2E completo | 29/29 (banco limpo + migrations; validação local pré-CI) |

## 7. CI — pipeline E2E no GitHub Actions (Issue #42)

Workflow: `.github/workflows/e2e.yml` (nome exibido **`E2E`**). Gate automatizado e reproduzível da mesma suíte validada localmente — **nenhuma segunda suíte, nenhuma alteração de produto para "passar no CI"**: o pipeline reproduz o ambiente exigido pelos 29 testes (paridade com `apps/e2e/run-e2e.sh`).

### Fluxo

```text
Checkout → Setup Node 22 (cache npm) → Chrome for Testing 151 (fixo)
→ npm ci → npm run migrate → npm run seed → npm run build
→ API :3000 (node apps/api/dist/main.js) + Web :5173 (Vite dev --strictPort --host 127.0.0.1)
→ Readiness /health (db:true) e /login (sem sleep cego)
→ Selenium E2E (npx vitest run --reporter=verbose)
→ Diagnosticar falha + Upload de artifacts (logs + evidências)
```

### Triggers e concorrência

- **pull_request** e **push em main**, com `paths` restrito ao produto (`apps/**`, `packages/**`, `scripts/**`, `package.json`, `package-lock.json`, `tsconfig.base.json`, `eslint.config.mjs`, `.gitignore`, `e2e.yml`).
- `concurrency` por `ref` com cancelamento da execução anterior (evita pipeline antigo correndo após novo push; não afeta execuções de `main` de outros refs).

### Ambiente

| Dependência | Como funciona no CI |
|---|---|
| PostgreSQL | service container `postgres:16-alpine` (`servium`/`servium`/`servium`, porta `5432`, health `pg_isready`) |
| migrations | comandos reais do produto (`npm run migrate` — runner `packages/db/scripts/migrate.mjs`, idempotente) |
| seed | `npm run seed` → tenant `dev-corp`, admin `admin@dev.local`, operador `oper@dev.local` |
| API | `npm run build` + `node apps/api/dist/main.js` (`PORT=3000`) |
| frontend | Vite dev server (`:5173`, `--strictPort` — conflito de porta falha com erro claro, sem migrar para 5174) |
| Chrome | Chrome for Testing **151.0.7922.108** (download oficial `storage.googleapis.com/chrome-for-testing-public`, pinned), `google-chrome` no PATH |
| ChromeDriver | npm `chromedriver` (151.x) instalado via `npm ci` |
| Selenium | `selenium-webdriver` 4.27 com `--headless=new`, `--no-sandbox`, `--disable-dev-shm-usage` |
| usuário/tenant | E2E via `dev-corp` / `admin@dev.local` / `admin123` (admin) e `oper@dev.local` / `oper123` (operador) |
| portas | API `3000`, Frontend `5173` — previsíveis e verificadas por readiness |
| vars de ambiente | `DATABASE_URL`, `E2E_WEB_URL`, `E2E_API_URL`, `HEADLESS=1` (job-level); nenhum secret |

### Readiness e timeout

- `GET /health` é dependência do DB (retorna `db:true` só com `SELECT 1` ok); frontend validado por `GET /login`.
- Loop de espera com retry limitado (90×1s) e **diagnóstico de falha** (log da API/frontend impresso e disponível como artifact). Nada usa `sleep` cego como readiness principal.
- `timeout-minutes: 30` no job.

### Artifacts

- `actions/upload-artifact` (`if: always()`, `if-no-files-found: ignore`, retenção 7 dias): `/tmp/api.log`, `/tmp/web.log`, `/tmp/e2e-vitest.log` e `apps/e2e/evidence/**` (screenshots/dumps de falha Selenium).
- **Nada de tokens, passwords, cookies ou conteúdo pessoal** é armazenado.

### Segurança

- `permissions: { contents: read }` (mínimas).
- **Sem secrets**: o E2E não usa Gmail real, OAuth Google ou conta pessoal. O único endpoint Gmail atingido pela suíte é `GET /auth/gmail/tokens` (somente leitura no banco; tabela vazia no seed → `200 []`). Nenhum `|| true` em etapas críticas.

### Check para required check

O nome exato do check para configurar como **required check** humano no futuro: **`Selenium E2E`**. Não foi alterada branch protection/ruleset automaticamente (repositório no plano Free não suporta rulesets, e a ativação é decisão humana futura).

### Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| PostgreSQL não ficou healthy | serviço não subiu / porta 5432 ocupada | ver etapas `services.postgres`; health `pg_isready`; timeout 30 min |
| migration falhou | `DATABASE_URL` errado; arquivo SQL quebrou | conferir log do passo; migrations são transacionais/idempotentes |
| seed falhou | banco sem migrations | confirmar pipe `npm run migrate` antes de `npm run seed` |
| API health timeout | porta 3000 ocupada; DB não acessível | ler artifact `api.log`; verificar `db:true` no `/health` |
| frontend timeout | porta 5173 ocupada sem `--strictPort`; build quebrou | `--strictPort` garante erro claro; ler `web.log` |
| Chrome/driver incompatível | Chrome do runner ≠ 151 | o workflow fixa CfT 151 (compatível com chromedriver 151.x); conferir versões impressas |
| teste flaky | readiness incorreto / race | reproduzir local com `run-e2e.sh`; evidências em `apps/e2e/evidence/` |
| porta ocupada localmente | processo residual do Vite | `pkill -f '[v]ite'`; o runner agora usa group set (`setsid`) no cleanup |

## 8. Fora de escopo / observações

- O CI principal (`ci.yml`) segue sendo build/lint/test; o E2E roda em workflow dedicado **`E2E`** (requer Chrome + Postgres) — sem duplicar a suíte.
- Nenhuma funcionalidade da Demo Factory foi tocada (EPIC-013 permanece `BLOCKED`, `HUMAN_GATE_DEMO_FACTORY` não liberado).
- 403 para operador em rota admin é comportamento esperado do guard RBAC (ASVS V2.x); o teste valida a negação.
