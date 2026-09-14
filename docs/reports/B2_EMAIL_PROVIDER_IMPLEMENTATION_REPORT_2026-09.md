# MVP-01 · B-2 — Relatório de Implementação — Proveedor de E-mail por Tenant (desacoplar RECEIVE do Mailpit)

**Data:** 2026-09-13 · **Branch:** `feat/mvp01-b2-email-provider` · **Base:** `origin/main` (`458b8ef`) · **Status:** **IMPLEMENTADO / QA_VERDE / E2E_RUNTIME_APROVADO / AGUARDANDO HUMAN REVIEW**

---

## 1. Execução deste trabalho

| Item | Valor |
|---|---|
| Atividade | **Implementação** do MVP-01 **B-2** (pillar: e-mail por tenant, desacoplar o recebimento do Mailpit) |
| Decisões aplicadas | **G2** — resolução do canal **por tenant** via `EmailProviderResolver` (provider resolvido no handler de cada job); **G4** — token de correlação aceito no **corpo E no cabeçalho `X-Correlation-Token`** |
| Resultado | **IMPLEMENTADO / suíte API verde / Runtime E2E verde** |
| Escopo de código | `apps/api` (motor/channel, runtime, email gmail-adapter, configurações) · `packages/db` (migração) · `packages/shared-types` (DTOs) · testes API + E2E runtime |
| Gates humanos pendentes | **HG-007 (credenciais reais Gmail)** — `AWAITING_DECISION` (não bloqueia o código, bloqueia execução real) |

---

## 2. Decisões técnicas aplicadas (resolução das pendências G2/G4)

| Decisão | Enunciado | Evidência |
|---|---|---|
| **G2** | Canal **por tenant**, não global: `ProviderResolver.resolverCanal(tenantId, ctx)` e `resolverRecebedor(...)` resolvem a fonte no handler de cada job; envio continua com fallback global (Mailpit) quando o tenant não tem integração | `apps/api/src/runtime/provider-resolver.ts`; `apps/api/src/motor/handlers.ts` (`MotorDeps.resolver`) |
| **G4** | Formato de token: **ambos** — `X-Correlation-Token` (header) **ou** token no corpo (`Identificador: t:<item>:r<n>`) | `apps/api/src/email/gmail-adapter.ts:199-203` (`extrairTokenCorrelacao`); `apps/api/src/runtime/recebimento.ts:23-32` (`TOKEN_RE`/`parseToken`) |
| **R1** | Contrato de recebimento **provider-agnóstico**: `Recebedor.receber(context): Promise<MensagemRecebida[]>` com `correlationToken`, `providerMessageId`, `from`, `to`, `attachments?`, `metadata?` | `apps/api/src/motor/channel.ts` |
| **Ledger/idiom** | Adapter **NÃO persiste** no `receber`; persistência/correlação/duplicidade residem em `correlacionarRecebidas` + `UNIQUE(tenant_id, gmail_message_id)` | `apps/api/src/runtime/recebimento.ts` |
| **R3** | Integração de e-mail por tenant persistida em `tenant_email_integration` (RLS FORCE) e gerida via `GET/PUT /configuracoes/integracao-email` (admin) | `packages/db/migrations/0012_email_integration.sql`; `apps/api/src/cadastro/configuracoes.controller.ts` |
| **Operação** | PollWorker **único por processo**: o `claimJobs` não filtra tipo, então handler `email.receber` registrado no mesmo worker do motor (2 POs = roubo cruzado de jobs, corrigido) | `apps/api/src/runtime/main.ts`; `apps/api/src/runtime/worker-main.ts` |

---

## 3. Escopo implementado

### 3.1 Contrato genérico (`apps/api/src/motor/channel.ts`)

- `MensagemRecebida`, `AnexoRecebido`, `ReceiveContext`, `Recebedor`, `EmailIntegration`, `EmailProvider`, `CanalResolvido`, `ProviderResolver`; `FakeChannel` com `receberRespostas`.

### 3.2 Resolução por tenant e RECEIVE (`apps/api/src/runtime/`)

- `provider-resolver.ts` (novo): `EmailProviderResolver.obterIntegracao` / `resolverCanal` / `resolverRecebedor` — integração `receive_enabled` → adapter Gmail (auto-detect para credenciais) ou Mailpit; fallback dev/CI = Mailpit (`MAILPIT_API_URL` + ciclo aberto); `tentarAdapterGmail`, `mailpitRecebedor`.
- `receive-handler.ts` (novo): handler `email.receber` — resolve fonte por tenant, não toca provider direto, correlaciona; sem fonte ⇒ conclui sem efeito (sem retry).
- `receive-scheduler.ts` (novo): `ReceiveScheduler` — varredura por janela, chave idempotente `recv:<tenant>:<provider>:<windowKey>`, alvos = integrações `receive_enabled` + fallback dev, `reapStuck`.
- `recebimento.ts`: `MailpitRecebedor` + `buscarMensagensDoMailpit(apiUrl, caixa)` normalizado (filtro por caixa); `correlacionarRecebidas` no novo contrato (persistência/correlação **só aqui**); `RecebedorPeriodico` removido.
- `main.ts` / `worker-main.ts`: wiring — resolver + **PollWorker único** (motor + `email.receber`) + scheduler de recebimento; cadência `RECEBER_INTERVAL_MS ?? SCHEDULER_RECEIVER_INTERVAL_MS ?? 30_000`, janela `RECEIVER_WINDOW_MS ?? RECEBER_INTERVAL_MS ?? 30_000` (legado E2E preservado).
- `worker.ts` / `motor/handlers.ts`: `MotorDeps.resolver` opcional — `cobrarItem` resolve canal/remetente por tenant com fallback global; auditoria/`mensagens_comunicacao` mantidas.

### 3.3 GmailAdapter (`apps/api/src/email/gmail-adapter.ts`)

- `buildGmailConfigFromEnv` + `GetGmailClient` injetável; `GmailAdapter implements CommunicationChannel + Recebedor`.
- `receber(context, query)` normaliza → `MensagemRecebida` (NÃO persiste); `from` via `parseAddresses`; `correlationToken` = header `X-Correlation-Token` **ou** corpo (`TOKEN_RE`).
- Retry 429/5xx com backoff + timeout de rede; refresh de access token expirado; `enviar` persiste `message_id` (`ON CONFLICT DO NOTHING`) antes do retorno.

### 3.4 Persistência e API

- `packages/db/migrations/0012_email_integration.sql` (aplicada): `tenant_email_integration` — `provider`, `auth_type`, `emails[]`, `sender_email`, `receive_enabled`, `credential_reference`, RLS `tenant_isolation` FORCE, `UNIQUE(tenant_id, provider)`.
- `packages/shared-types/src/index.ts`: `EMAIL_PROVIDERS`, `EmailProvider`, `EMAIL_AUTH_TYPES`, `EmailAuthType`, `TenantEmailIntegrationDTO`.
- `apps/api/src/cadastro/configuracoes.controller.ts`: `GET/PUT /configuracoes/integracao-email` (admin-only, validação, upsert ON CONFLICT; resposta `{ integracao: DTO|null }` — Nest 11 não serializa `null`).

---

## 4. Testes

### 4.1 Novos (24 testes)

| Arquivo | Prova |
|---|---|
| `test/provider-resolver.test.ts` | Gmail→adapter, Mailpit→integração, fallback/`receive_enabled`, tenant sem alvo |
| `test/receive-handler.test.ts` | handler resolve por tenant, correlaciona, conclui sem fonte |
| `test/receive-scheduler.test.ts` | chaves `recv:…`, idempotência de janela, fallback dev, start/stop |
| `test/gmail-receber.test.ts` | `receber` normaliza sem persistir, token header/corpo, erro de API capturado |
| `test/integracao-email.test.ts` | endpoints GET/PUT, validação, RBAC, wrapper `{integracao}` |
| `test/correlacao.test.ts`, `test/motor-erro.test.ts` | atualizados para o novo contrato |

### 4.2 Resultados

| Verificação | Resultado |
|---|---|
| `npm run build -w @servium-ia/api` | OK |
| Suíte API (`npm run test -w @servium-ia/api`, 27 arquivos) | **26 passed · 1 skipped · 171+ passed/173** — única flakiness = `rate-limit.test.ts` (429 vs 200, **pré-existente**, passa isolado e em execuções limpas) |
| Runtime E2E (`apps/runtime-e2e`, jornada completa) | **3/3 green** — ciclo evolui com respostas, jornada de exceção, idempotência de janelas |
| ESLint (arquivos alterados) | 0 erros |

> **Achado operacional E2E:** dois `PollWorker` por processo (motor + recebimento) roubam jobs **um do outro** (`claimJobs` não filtra tipo; `sem handler para tipo=…` → falha). Corrigido registrando `email.receber` no **mesmo** worker do motor (`main.ts`/`worker-main.ts`). `worker-runtime.test.ts` segue validando a lista **exata** dos 4 handlers do motor (registro acontece após `createMotorWorker`).

---

## 5. Fora de escopo (declarações explícitas)

| Item | Status |
|---|---|
| **Credenciais reais Gmail** (project Google Cloud + OAuth client + redirect publicado + conta autorizada) | **NÃO PROVISIONADO** — dependência humana **HG-007** `AWAITING_DECISION` |
| **Envio Gmail real** em CI/ambiente protegido | **NÃO EXECUTADO** — política "Gmail nunca em CI" preservada (`channel.ts`) |
| **Validação do `state` do OAuth** no callback | **NÃO ALTERADO** — risco documentado na readiness (§8) |
| **Criptografia de tokens em repouso** | **NÃO ALTERADO** — fora do nível 1 do ASVS |
| **UI de consentimento** ("Integrar e-mail" no web) | **NÃO IMPLEMENTADO** — escopo menor adiado (G7) |
| Marcar mensagens como lidas no poller Gmail; observabilidade de quota | **FOLLOW-UP**, não blocker |
| Outlook como provider em runtime | **NÃO** — piloto = Gmail; Outlook apenas como **cliente** |

---

## 6. Gaps remanescentes após esta implementação

| # | Gap | Estado |
|---|---|---|
| G5 | Credenciais reais ausentes (HG-007) | **AWAITING_DECISION** (único bloqueio para execução real) |
| G7 | UX de consentimento OAuth | adiado (menor) |
| G8 | Observabilidade de refresh/quota | follow-up |
| — | `state` OAuth / criptografia de tokens | não alterado (documentado) |

---

## 7. Rito recomendado de aceite REAL (fora de CI)

1. Owner resolve **HG-007** e provisiona project OAuth (client id/secret + redirect).
2. Preencher `GMAIL_CLIENT_ID/SECRET/REDIRECT_URI` em **ambiente protegido** (`GMAIL_*` fora do repositório; nunca em `main`/CI).
3. `PUT /configuracoes/integracao-email` do tenant piloto (provider `gmail`, `receive_enabled: true`) + fluxo `/auth/gmail/authorize`→callback (consentimento).
4. Ciclo piloto: envio via Gmail + resposta real → `recebido` → validação humana B-1 → registar evidência (message id + eventos de auditoria) no log do piloto.
5. Em `GMAIL_*` ausentes, o runtime segue 100% funcional com **Mailpit** (fallback dev) e **`none`** (sem comunicação) — sem regressão.

---

## 8. AC-B2 — status

| AC | Descrição | Status |
|---|---|---|
| AC-B2-01 | Provider `gmail` registrável fora de CI; proibido em CI (regressão `channel-provider`) | ✅ mantido |
| AC-B2-03 | Envio por tenant idempotente + auditoria `cobrar` (resolver por tenant, fallback global) | ✅ |
| AC-B2-04 | Poller periódico por tenant → `MensagemRecebida.correlationToken` | ✅ |
| AC-B2-05 | Correlação → `aguardando→recebido` + `mensagens_comunicacao` + audit `receber` (B-1 preservado) | ✅ |
| AC-B2-06 | Idempotência `gmail_message_id` (ledger em `correlacionarRecebidas`) | ✅ |
| AC-B2-07 | Retry 429/5xx (envio); erro de rede não para o poller | ✅ |
| AC-B2-08 | Auditoria com `actor_type='servico'` no caminho de recebimento | ✅ |
| AC-B2-09 | RLS FORCE (tokens, mensagens, `tenant_email_integration`) | ✅ |
| AC-B2-11 | Regressão Mailpit/none 100% verde | ✅ |
| AC-B2-12 | Sem credencial em CI; build/lint/typecheck verdes | ✅ |
| AC-B2-10 | Observabilidade refresh/quota | ⏳ follow-up |
| AC-B2-02 | Margens `state` validado | ⏳ suggestão securitária (documentada) |
| AC-B2-13 | Rito manual REAL | 🔒 aguarda **HG-007** |

---

## 9. Identification

```text
Agent: opencode (big-pickle)
Model: opencode/big-pickle
Platform: OpenCode
Date: 2026-09-13
Repository: rnsilveira22/servium-ia
Base: origin/main (458b8ef)
Branch de trabalho: feat/mvp01-b2-email-provider
```

- **Estado B-2:** `IMPLEMENTADO / QA_VERDE / E2E_RUNTIME_APROVADO / AGUARDANDO_HUMAN_REVIEW`.
- Execução real de Gmail permanece **AWAITING_DECISION (HG-007)** — sem credencial, sem execução real; infra completa, testada com mocks/fake/Mailpit.
