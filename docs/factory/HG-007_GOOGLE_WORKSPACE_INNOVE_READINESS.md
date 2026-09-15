# HG-007 — Google Workspace/Gmail Innove — Technical Readiness Report

**Data:** 2026-09-14 · **Estado da auditoria:** `PARTIALLY_READY` · **Real Gmail:** `NOT_TESTED`
**Objetivo:** auditória técnica + preparação operacional + plano de validação da integração real Google Workspace/Gmail da Innove, sem comprometer credenciais reais.

---

## 1. Executive Summary

A implementação do B-2 (`0266322`, PR #103, `B2_MERGED_AND_RECONCILIED`) está **tecnicamente pronta para receber credenciais reais de OAuth Gmail**: existem adapter Gmail, resolução de provider por tenant, fluxo OAuth web (3-legged), envio e recebimento, correlação por token, RLS/FORCE e testes mockados.

**Porém, o HG-007 NÃO pode ser declarado `APPROVED` e ainda não é possível executar o primeiro teste real**, porque faltam itens **externos/decisão** (não código):

1. Identificação da mailbox da Innove (endereço `servium@<dominio>`, confirmação Workspace, admin).
2. Projeto Google Cloud + OAuth Client + Consent Screen (existir e ser configurado).
3. Provisionamento de `GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REDIRECT_URI` em ambiente protegido (API + worker).
4. Definição da **redirect URI de homologação/piloto** (não localhost) — `AWAITING_DECISION`.
5. Decisão do modo do consent screen (usuários de teste vs interno no Workspace) e validação da política Google para scopes Gmail.

**Classificação desta auditoria:** `PARTIALLY_READY` — código `READY`; integração real `NOT_TESTED`.

---

## 2. Current B-2 State

| Campo | Valor |
|---|---|
| Estado canônico | `B2_MERGED_AND_RECONCILIED` · `DONE` |
| PR | #103 (merged 14/09, squash) |
| Merge commit | `0266322` |
| GH-007 | `AWAITING_DECISION` (este relatório é a preparação) |
| Pilot | `NOT GO` |
| Base auditada | `main` = `origin/main` = `c0675f8` (contém `0266322`); working tree sem alterações (apenas `demo/` untracked, fora de escopo) |

### 2.1 Mapa de componentes auditados

| Componente | Arquivo | Responsabilidade | Estado | Observação |
|---|---|---|---|---|
| Contrato provider-agnóstico | `apps/api/src/motor/channel.ts` | `MensagemSaida/Recebida`, `CommunicationChannel`, `Recebedor`, `EmailIntegration`, `ProviderResolver` | ✅ Implementado | Core não conhece Gmail/Mailpit |
| `EmailProviderResolver` | `apps/api/src/runtime/provider-resolver.ts` | Resolve canal/envio e recebedor por tenant | ✅ Implementado | `ORDER BY provider LIMIT 1` (R-3); Gmail exige integração + token |
| `GmailAdapter` | `apps/api/src/email/gmail-adapter.ts` | OAuth2 + envio (`users.messages.send`) + recebimento (`list`/`get`) | ✅ Implementado | Sem watch/history/paginação; retry 429/5xx; timeout 15s |
| Fluxo OAuth | `apps/api/src/email/email.controller.ts` | `authorize`, `callback`, `tokens` | ✅ Implementado (lacunas F-2) | state `tenantId:operadorId` sem validação; callback grava só `gmail_tokens` |
| Config por tenant | `apps/api/src/cadastro/configuracoes.controller.ts` | `GET/PUT /configuracoes/integracao-email` | ✅ Implementado | admin-only, RLS FORCE, upsert |
| Integração (schema) | `packages/db/migrations/0012_email_integration.sql` | `tenant_email_integration` | ✅ Implementado | sem `config`; `UNIQUE(tenant_id, provider)` |
| Tokens (schema) | `packages/db/migrations/0006_gmail.sql` | `gmail_tokens` | ✅ Implementado | **texto plano (R-1)**; RLS FORCE |
| Mensagens (schema) | `0006_gmail.sql` + `0010_correlacao.sql` | `mensagens_gmail` + `token_correlacao` | ✅ Implementado | `UNIQUE(tenant_id, gmail_message_id)` |
| Recebimento | `apps/api/src/runtime/receive-handler.ts` + `apps/api/src/runtime/recebimento.ts` | Job `email.receber`; correlação/idempotência | ✅ Implementado | transação; dedupe por `providerMessageId` |
| Scheduler recebimento | `apps/api/src/runtime/receive-scheduler.ts` | Varredura → enfileira `email.receber` por tenant | ✅ Implementado | alvos = `receive_enabled=true`; janela por `windowKey` |
| Mailpit adpter | `apps/api/src/runtime/mailpit.ts` + `recebimento.ts` | Envio/recebimento dev/CI/E2E | ✅ Implementado | Nunca Gmail real |
| PollWorker/fila | `packages/db/src/worker.ts` + `packages/db/src/queue.ts` | Claim SKIP LOCKED, retry backoff, reap | ✅ Implementado | `max_tentativas` 3; `disponivel_em = now()+2^n*5s` |
| Correlação envio | `apps/api/src/motor/handlers.ts:181` | Token `t:<item>:r<n>` no corpo + `tokenCorrelacao` | ✅ Implementado | — |
| RBAC | `apps/api/src/auth/auth.guard.ts` | Deny-by-default; `admin`/`operador` | ✅ Implementado | `authorize`/`tokens`/`integracao-email` = admin; `callback` = sessão |

---

## 3. Existing Gmail Implementation

Fatos confirmados por leitura direta dos arquivos (localização exata):

- **Scopes (hardcoded):** `apps/api/src/email/gmail-adapter.ts:23`

  ```text
  https://www.googleapis.com/auth/gmail.send
  https://www.googleapis.com/auth/gmail.readonly
  ```

- **Identidade de envio = conta OAuth ("me"):** o MIME monta `From` manualmente (`gmail-adapter.ts:231-238`), mas `users.messages.send({ userId: 'me' })` envia como a **conta autenticada**. O `.env.example` registra que "não há from configurável". → A mailbox do Servium **é** a conta Google que realizar o consentimento.
- **Idempotência envio:** `message_id` (do Gmail) persistido em `mensagens_gmail` com `ON CONFLICT DO NOTHING` antes do return (`gmail-adapter.ts:249-257`); `UNIQUE(tenant_id, gmail_message_id)`.
- **Idempotência recebimento:** resolvida na correlação (`recebimento.ts`), dedupe por `providerMessageId` dentro de transação + `UNIQUE`.
- **OAuth2:** biblioteca `googleapis` (`google.auth.OAuth2`), `access_type=offline` + `prompt=consent` ⇒ **refresh token persistido**. Refresh automático quando `expires_at < now + 60s` (`gmail-adapter.ts:106-115`).
- **Retry/timeout:** `MAX_RETRIES=3`, backoff exponencial base 1s para 429/5xx; `DEFAULT_TIMEOUT_MS=15_000` por chamada.
- **Recebimento sem watch/history/paginação:** `messages.list({ q: 'is:unread newer_than:1d', maxResults: 20 })` + `get` por item (`gmail-adapter.ts:266-279`); nenhuma mensagem é marcada como lida.

---

## 4. OAuth Flow

Mapeamento do fluxo implementado (3-legged OAuth):

```text
Operador (admin, logado na app)
  ↓ GET /auth/gmail/authorize        (RequireAuth + Roles(admin))
  ↓ state = "<tenantId>:<operadorId>" (não criptográfico)
  ↓ GMAIL_CLIENT_ID/SECRET + redirect
Google consent screen                (access_type=offline, prompt=consent)
  ↓ redirect → GET /auth/gmail/callback?code&state   (RequireAuth, sem Roles)
  ↓ usa state.split(':')[0] = tenantId; não valida operadorId/anti-CSRF
  ↓ abre conexão ADMIN_URL, set_config('app.tenant_id', tenantId)
  ↓ exchangeCode → getToken + verifyIdToken (e-mail da conta)
  ↓ INSERT/UPDATE gmail_tokens (texto plano — R-1)
ProviderResolver (por tenant)
  ↓ tenant_email_integration (provider=gmail, send/receive_enabled)
  ↓ gmail_tokens (token OAuth) + GMAIL_CLIENT_* no ambiente
  ↓ GmailAdapter (envio/recebimento)
```

| Item | Situação atual | Local |
|---|---|---|
| Client ID | `GMAIL_CLIENT_ID` (process.env) | `gmail-adapter.ts:38` · `email.controller.ts:8` |
| Client secret | `GMAIL_CLIENT_SECRET` (process.env) | `gmail-adapter.ts:39` · `email.controller.ts:9` |
| Redirect URI | `GMAIL_REDIRECT_URI` (default `http://localhost:3000/auth/gmail/callback`) | `gmail-adapter.ts:44` · `email.controller.ts:10` |
| Scopes | fixos (`gmail.send`, `gmail.readonly`) | `gmail-adapter.ts:23` |
| State | `tenantId:operadorId`, sem secret aleatório/PKCE | `email.controller.ts:26`, `:34` |
| Associação tenant | via `state` → `set_config('app.tenant_id')` → RLS grava no tenant certo | `email.controller.ts:34-43` |
| Associação mailbox | determinada pelo **e-mail da conta que consentir** (verifyIdToken) → `gmail_tokens.user_email` | `gmail-adapter.ts:73-74` |
| Persistência tokens | `gmail_tokens` (access + refresh) **sem criptografia** (R-1) | `0006_gmail.sql:7-8` |
| Refresh | automático no adpater quando expira em <60s | `gmail-adapter.ts:106-115` |
| Revogação | **não existe endpoint de revogação** (manual: deletar linha + revalidar credencial no Google) | — |

> **Gap operacional importante:** o callback grava **apenas** `gmail_tokens`. Ele **não** cria/atualiza a linha em `tenant_email_integration`. Assim, para o resolver ativar Gmail em um tenant é necessário **também** registrar a integração via `PUT /configuracoes/integracao-email` (`provider='gmail'`, `auth_type='oauth2'`, `sender_email`, `mailbox_email`, flags). Item incluído no procedimento de setup (Seção 10).

---

## 5. Google Cloud Requirements

Cadeia necessária (exige **projeto Google Cloud** — não existe hoje; AWAITING_DECISION):

```text
Google Cloud Project
  ↓ Gmail API                     (habilitar)
  ↓ OAuth consent screen          (configurar: app name, e-mail de suporte, escopo)
  ↓ OAuth Client (Web application)
  ↓ Redirect URI  →  ServiumAI  /auth/gmail/callback
  ↓ Usuário de teste (ou domínio interno do Workspace)
```

| Item | Necessário | Tipo |
|---|---|---|
| Projeto Google Cloud | **Sim — não existe ainda** | criação externa (Rodrigo ou admin google) |
| Gmail API habilitada | Sim, no projeto | habilitar |
| Consent screen | Sim — External (com test users) **ou** Internal (se domínio Workspace fechado) | configurar |
| OAuth Client | **Tipo: Web application** (o fluxo é redirect-based `generateAuthUrl`/`getToken`) | criar |
| Redirect URI(s) | dev (`http://localhost:3000/auth/gmail/callback`) + homologação/piloto (seção 9) | cadastrar exatos |
| Domain Authorized | domínio da app (piloto) | configurar |
| Usuário de teste | conta `servium@<dominio>` (se consent external em testing) | adicionar |
| Verificação Google | scopes Gmail são sensíveis/restritas; produção externa costuma exigir verificação + security assessment | validar |
| Restrições do Workspace | acesso a aplicativos OAuth de terceiros, SSO/2FA da conta de serviço | verificar com admin |

**Ações não executáveis nesta auditoria (exigem acesso administrativo à conta Google):** criar projeto, habilitar API, criar OAuth client, configurar consent, adicionar test user. Nada destrutivo foi/ será executado.

---

## 6. Innove Requirements

Informações a obter da Innove (sem senhas/segredos):

### Google Workspace

- [ ] Domínio corporativo (ex.: `<dominio>.com.br` — placeholder).
- [ ] Conta Gmail que o Servium utilizará (ex.: `servium@<dominio>`) — **dedicada**, não admin.
- [ ] Confirmação de que a conta pertence a **Google Workspace** (não Gmail gratuito).
- [ ] Administrador responsável pelo Workspace (nome + acesso).
- [ ] Política de segurança: autorização de apps OAuth de terceiros; SSO/2FA da conta da caixa; bloqueio de API do Gmail (se houver).
- [ ] Necessidade de aprovação administrativa (consent do admin do Workspace).
- [ ] Política de "trusted apps"/whitelist se existir.

### Mailbox (definição)

```text
Servium envia e recebe como:  servium@<dominio>  (conceitual — não inventar endereço real)
```

- A conta que faz o consentimento OAuth **é** a mailbox (identidade real de envio/leitura).
- A mailbox deve permitir `Gmail API` (usuário nos limites do Workspace; API access habilitado).

### Provider (confirmação)

```text
Provider = Gmail / Google Workspace   ✅
Provider = Outlook                    ❌ (Outlook é apenas o cliente do usuário Innove)
Provider = Microsoft Graph            ❌ (fora de escopo — não expandir)
```

---

## 7. Environment Configuration

Variáveis relacionadas a e-mail/Gmail/OAuth no repositório (verificadas em código):

| Variável | Uso | Obrigatório dev | Obrigatório teste real | Obrigatório piloto | Observação |
|---|---|---|---|---|---|
| `GMAIL_CLIENT_ID` | OAuth client id | — (vazio) | ✅ | ✅ | ambiente protegido; nunca commitar |
| `GMAIL_CLIENT_SECRET` | OAuth client secret | — | ✅ | ✅ | idem |
| `GMAIL_REDIRECT_URI` | Redirect URI | default localhost | ✅ (homologação) | ✅ (https) | default `http://localhost:3000/auth/gmail/callback` |
| `COMMUNICATION_ADAPTER` | `none\|mailpit\|gmail` | mailpit | não muda (resolver per tenant) | conforme topologia | `gmail` proibido com `CI=true` |
| `MAILPIT_*` | fallback/dev/CI | ✅ | opcional | — | não afeta Gmail |
| `MAIL_FROM` | remetente global default | opcional | opcional | opcional | Gmail usa conta OAuth ("me") |
| `DATABASE_URL`/`APP_DATABASE_URL` | conexões admin/app | ✅ | ✅ | ✅ | RLS depende de `app.tenant_id` |
| `SERVIUM_SERVICE_ID` | identidade do worker | ✅ (worker) | ✅ (worker) | ✅ | obrigatório no bootstrap |
| `WORKER_*`, `SCHEDULER_*`, `RECEIVER_WINDOW_MS`, `RECEBER_INTERVAL_MS` | cadência/polling | ✅ | ✅ (ajustar janela de teste) | ✅ | `is:unread newer_than:1d` limita a janela de leitura (L-1) |

> **Nenhuma variável `GOOGLE_*`, `GMAIL_SCOPES` existe no código** — scopes são fixos.

---

## 8. Required Scopes

Extraídos do código (`apps/api/src/email/gmail-adapter.ts:23`) — **não assumidos**:

| Scope | Necessário para | Operação no código | Classificação Google** |
|---|---|---|---|
| `https://www.googleapis.com/auth/gmail.send` | enviar | `users.messages.send({ userId: 'me' })` (`:244`) | sensível/restrito* — validar verificação |
| `https://www.googleapis.com/auth/gmail.readonly` | receber | `users.messages.list/get` (`:266-279`) | sensível/restrito* |

- **Mínimos?** Sim — o código não usa `gmail.modify`/`gmail.labels`/`gmail.compose`; nada é marcado como lido nem alterado. `readonly` é o menor escopo de leitura que cobre o comportamento atual.
- **Excesso?** Não — apenas 2 scopes, ambos utilizados.
- **PARA O TESTE REAL:** manter exatamente `gmail.send` + `gmail.readonly`, casando o consent screen. **Não ampliar sem autorização.**

> \* conforme a política Google de verificação de apps (escopos Gmail são de privilégio alto). Confirmar na tela de consentimento se o projeto fica em *testing* (test users, sem verificação completa) ou *production* (verificação/security assessment). Fato da config do projeto, não do código.

---

## 9. Redirect URI

| Ambiente | URI | Status |
|---|---|---|
| Desenvolvimento/local | `http://localhost:3000/auth/gmail/callback` (default) | ✅ definida (uso dev-only) |
| Homologação | `https://<api-homologacao>/auth/gmail/callback` | `AWAITING_DECISION` — ambiente ainda não definido |
| Piloto/produção | `https://<api-piloto>/auth/gmail/callback` | `BLOCKED / AWAITING_DECISION` — ambiente ainda não definido |

> **Regra: não utilizar redirect de localhost no piloto.** Como o ambiente real (URLs de homologação/piloto) ainda não foi definido, este item é `AWAITING_DECISION`. A URI cadastrada no Google Cloud deve ser **exatamente igual** à usada pelo app (`GMAIL_REDIRECT_URI`), senão o Google rejeita o callback.

---

## 10. Real Test Plan (configuração + execução controlada)

### Setup do tenant Innove (uma única vez, supervisão humana)

1. Provisionar `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI` no ambiente protegido de **API e worker** (fora do git).
2. No Google Cloud: OAuth Client **Web application** com a redirect URI exata; consent screen com `gmail.send`+`gmail.readonly`; conta `servium@<dominio>` como test user (ou domínio interno).
3. Registrar a integração (admin, via API) — **passo que o callback não faz**:
   `PUT /configuracoes/integracao-email` com `provider='gmail'`, `auth_type='oauth2'`, `sender_email`/`mailbox_email` da mailbox, `status='configurado'`.
4. Iniciar OAuth (admin logado): `GET /auth/gmail/authorize` → consentimento com a conta `servium@<dominio>` → callback grava `gmail_tokens`.
5. Verificar `GET /auth/gmail/tokens` (admin) → `user_email`, `scopes`, `expires_at` (sem credenciais).
6. Confirmar resolução: testar que `resolverCanal(tenantInnove)` retorna `GmailAdapter` (log do worker/API).

### TESTE A — ENVIO (controlado)

```text
ServiumAI → Tenant Innove → EmailProviderResolver → GmailAdapter → Google Workspace → destinatário de teste
```

- Pré-condição: item de um ciclo do tenant Innove em estado que dispara `item.cobrar` (via `ciclo.tick`/`reenviar`).
- Validar: provider correto (`gmail`), tenant correto, remetente = `servium@<dominio>` (conta OAuth), mensagem entregue ao destinatário de teste, `messageId` retornado, `mensagens_gmail` com `direcao='envio'` + `token_correlacao`, auditoria registrada, **sem token/secret em logs**, sem vazamento entre tenants.
- Idempotência: re-executar o job (tick repetido) → `idempotency_key` (chave de cobrança) impede duplicidade; `UNIQUE` de `gmail_message_id` protege.

### TESTE B — RECEBIMENTO (controlado)

```text
Caixa externa → servium@<dominio> (Gmail) → GmailAdapter → PollWorker → token de correlação → tenant/item → processamento
```

- Enviar **manualmente** uma mensagem (de um remetente de teste) **para** `servium@<dominio>` contendo `Identificador: t:<item>:r<n>` (do item do teste A) — no corpo **ou** header `X-Correlation-Token`.
- O scheduler enfileira `email.receber`; o worker resolve o `Recebedor` do tenant; `recv:<tenant>:<provider>:<janela>` evita jobs duplicados.
- Validar: mensagem localizada (`providerMessageId`), tenant correto, token de correlação extraído, item transiciona para `recebido`, `mensagens_gmail` `direcao='recebimento'` + auditoria `receber`, **sem duplicação** (reenviar o job não duplica), sem vazamento entre tenants.
- **Correlação não resolvida:** mensagem legível sem token → registrada/logada sem interferir em outros itens (não quebra o job); documentar o comportamento observado como evidência.
- **Atenção (L-1):** a query usa `is:unread newer_than:1d`, `maxResults:20` — a mensagem de teste deve estar **não lida e recente**; nada é marcado como lida (não haverá consumo duplo pela mesma janela de idempotência).

---

## 11. Tenant Isolation Test

Estratégia para demonstrar `Tenant A ≠ Tenant B` **sem criar segundo tenant real desnecessário**:

- **Unit/integration (existente):** `apps/api/test/integracao-email.test.ts`, `provider-resolver.test.ts`, `gmail-receber.test.ts`, `correlacao.test.ts`, `observability.test.ts` já cobrem RLS, FORCE, resolução por tenant e leitura de `mensagens_gmail` isolada.
- **Prova do teste real (sem segundo tenant):** com conexões distintas por `set_config('app.tenant_id', X)`:
  1. Tenanteando como Innove: `SELECT` em `gmail_tokens`/`mensagens_gmail`/`tenant_email_integration` retorna **somente** as linhas do Innove.
  2. Como um tenant vizinho (session de teste/outro tenant dev): as mesmas consultas retornam **zero** linhas (RLS).
  3. `resolverCanal`/`resolverRecebedor` de outro tenant não resolve credenciais do Innove (token do Innove não é visível).
- **Fixtures:** usar os tenants/setups de teste existentes no banco dev (não criar conta Gmail real de terceiros).

---

## 12. Observability Verification

Evidências esperadas durante os testes (sem expor `access_token`/`refresh_token`/`client_secret`/senha):

| Pergunta | Evidência |
|---|---|
| O que aconteceu? | auditoria (`auditoria.*` upcalls `registrarAcao`) + logs JSON do worker (tipo de job, `tipo`, `tenantId`, `provider`) |
| Quando? | timestamps (`criado_em`/`atualizado_em`, `receivedAt`, `expires_at`) |
| Para qual tenant? | log com `tenantId`; RLS limita o acesso aos dados |
| Qual operação? | `tipo`/`direcao`/`estado` (envio/recebimento/correlação/decisão) |
| Qual correlation token? | `token_correlacao` + `idempotency_key` (`t:<item>:r<n>`, `recv:<tenant>:<provider>:<janela>`, chave de cobrança) |
| Qual resultado? | `ok`/`erro`/`status`; `messageId` |

- **Retry/timeout:** evidenciar 1 retry (remover/quebrar a conta temporariamente) e timeout de 15s sem token em logs — comportamento já testado por fake (não exige Gmail real).
- **Sem vazamento:** o adapter nunca loga tokens (comentário de design + comportamento: erros são `String(err.message)` do cliente, sem credenciais).

---

## 13. Known B-2 Follow-ups (classificação)

| ID | Descrição | Bloqueia HG-007? | Antes do piloto? | Pode ficar follow-up? |
|---|---|---|---|---|
| F-1 | Duplicidade se persistência de `message_id` falhar após envio | **Não** — teste controlado detecta; `UNIQUE` protege | Recomendado | Sim, para o teste real |
| F-2 | OAuth `state` não assinado/validado (CSRF) | **Não*** | ✅ **Corrigir antes do piloto** | Para o teste controlado, mitigar com supervisão/ambiente protegido |
| R-1 | Tokens em repouso **sem criptografia** | **Não*** | ✅ **Corrigir antes do piloto** | Para o teste, ambiente protegido + RLS FORCE |
| R-2 | Naming legado `mensagens_gmail`/`gmail_message_id` | Não | Não | Sim |
| R-3 | `ORDER BY provider LIMIT 1` com múltiplas integrações | **Não*** | Confirmar **1 unique integração gmail por tenant** no teste | Sim |
| L-1 | Janela `is:unread newer_than:1d` / `maxResults:20` | Não — ajustar procedimento do teste | Revisar | Sim |
| L-2 | `credential_reference` livre | Não | Não | Sim |
| L-3 | Redirect URI localhost default | **Não para dev**; ⚠️ impede piloto sem definição real | ✅ definir URI homologação/piloto | Não p/ piloto |

> \* F-2/R-1/R-3 não bloqueiam um **primeiro teste real controlado** em ambiente protegido com supervisão humana e 1 integração/tenant, mas são considerados risco para o **piloto**. Eles NÃO serão corrigidos automaticamente nesta atividade (régua do B-2: não reabrir o B-2 por follow-ups).

---

## 14. Security Assessment

| Aspecto | Estado atual | Classificação para HG-007 |
|---|---|---|
| OAuth (3-legged, `access_type=offline`) | Implementado; refresh token persistido | ✅ OK |
| `state` anti-CSRF | Apenas `tenantId:operadorId`, sem secret/PKCE (F-2) | ⚠️ mitigar no teste; corrigir p/ piloto |
| Token storage | `gmail_tokens` em texto plano (R-1) | ⚠️ aceitável no teste (DAIL+); corrigir p/ piloto |
| Secrets no repo | `.env.example` sem valores reais; `GMAIL_*` comentados | ✅ OK |
| RLS | `FORCE` em `tenant_email_integration`, `gmail_tokens`, `mensagens_gmail` | ✅ OK |
| RBAC | `integracao-email`/`authorize`/`tokens` = admin; `callback` = sessão | ⚠️ callback sem `@Roles` (sessão válida de operador também aceita); validar com F-2 |
| Logs | logs JSON com `tenantId`/operação; sem credenciais | ✅ OK |
| Scopes | mínimos (`send`+`readonly`) | ✅ OK |
| Redirect URI | dev localhost; homologação/piloto a definir | ⚠️ BLOCKED p/ piloto |
| Exposição de credencial | nenhuma credencial real introduzida por esta atividade | ✅ OK |
| Isolamento de mailbox | mailbox = conta que consente; não compartilhada entre tenants | ✅ (depende do 1-tenant-1-conta) |

---

## 15. Blockers

1. **Mailbox Innove não identificada** (endereço `servium@<dominio>`, confirmação Workspace, admin, políticas) — item externo.
2. **Google Cloud Project + OAuth Client + Consent Screen não existem** — item externo (criar).
3. **`GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REDIRECT_URI` não provisionados** em ambiente protegido de API/worker — item de operação.
4. **Redirect URI de homologação/piloto não definida** — `AWAITING_DECISION` (não usar localhost no piloto).
5. **Decisão do modo do consent screen / verificação Google** (test users vs domínio interno; verificação/GApp que scopes Gmail exigem em produção) — decisão.
6. **Condução do teste real exige supervisão humana** (teste de envio/recebimento real não é executável de forma autônoma por esta auditoria sem configuração externa).

---

## 16. Evidence Required (matriz de evidências)

- Config do anchor no Google Cloud: **prints/IDs** do OAuth client, redirect URI cadastrada, scopes habilitados, consent screen status (nunca colar secret).
- `GET /auth/gmail/tokens` (tenant Innove): `user_email`, `scopes`, `expires_at`.
- Teste A: `message_id` do Gmail, linha `mensagens_gmail` (`direcao='envio'`, `token_correlacao`), auditoria do envio, log do worker com `tenantId`+`provider`, ausência de token em logs.
- Teste B: `providerMessageId`, linha `mensagens_gmail` (`direcao='recebimento'`), item → `estado='recebido'`, auditoria `receber`, **duplicidade = 0** (`COUNT` em `mensagens_gmail` p/ o mesmo `gmail_message_id`), token extraído.
- Isolamento: planilha das consultas RLS tenanteadas (Innove vs vizinho) com contagem de linhas.
- Retry/timeout: evidência de 1 retry (derrubar temporariamente) e timeout de 15s, sem token em logs.
- Rollback/stop: procedimento documentado (Seção 18).

---

## 17. HG-007 Acceptance Matrix

| Critério | Evidência | Status |
|---|---|---|
| Google Workspace identificado | domínio + confirmação Innove | ⚠️ PENDENTE |
| Conta de serviço (mailbox) definida | `servium@<dominio>` dedicada | ⚠️ PENDENTE |
| OAuth configurado | OAuth Client + consent no GCP | ⚠️ PENDENTE |
| Redirect URI correta | cadastrada = `GMAIL_REDIRECT_URI` | ⚠️ PENDENTE |
| Scopes aprovados | `gmail.send` + `gmail.readonly` | 🔲 A verificar |
| Tenant correto | `PUT integracao-email` tenant Innove | 🔲 A executar |
| Provider resolver correto | `resolverCanal` → `GmailAdapter` | 🔲 A executar |
| Envio real | `message_id` Gmail | 🔲 A executar |
| Recebimento real | `providerMessageId` | 🔲 A executar |
| Correlação | `token_correlacao` + auditoria | 🔲 A executar |
| Idempotência | duplicidade = 0 | 🔲 A executar |
| RLS | consultas isoladas por tenant | ✅ coberto por tests; 🔲 reforçar no teste real |
| Sem vazamento de credenciais | logs/auditoria | 🔲 A verificar no teste |
| Retry/timeout | evidência observada | 🔲 A executar |
| Rollback/stop | procedimento validado | 🔲 A executar |

> Nenhum `PASS` sem evidência real — esta auditoria **não** marca itens como passados.

---

## 18. Rollback / Stop Procedure

1. `PUT /configuracoes/integracao-email` (admin): `send_enabled=false` e `receive_enabled=false` → o resolver deixa de usar Gmail (fallback/default) e o scheduler para de enfileirar recebimento do tenant.
2. (Opcional) remover a linha em `gmail_tokens` do tenant → adapter nunca resolve.
3. Provisionar delay: remover VP `GMAIL_CLIENT_ID`/`SECRET` do ambiente de API/worker → `buildGmailConfigFromEnv` retorna `null`; qualquer resolução cai no fallback global.
4. Revogar acesso no Google (conta `servium@...` → Apps/sign-in → remove o app) → refresh token inválido.
5. **Sem código a reverter** (nenhuma alteração funcional nesta atividade).

---

## 19. Human Decision Required

- [ ] Definir mailbox/domínio da Innove + aprovação do admin do Workspace (Fase 6).
- [ ] Autorizar criação/configuração do projeto Google Cloud (test users ou interno; verificação escopos).
- [ ] Provisionar `GMAIL_*` em ambiente protegido e escolher a redirect URI de homologação.
- [ ] Autorizar a execução do **Teste A e B** com supervisão humana (data/hora e responsável).
- [ ] (Futuro, p/ piloto) corrigir F-2 (state) e R-1 (tokens em repouso) — decisão separada.

---

## 20. Recommended Next Step

> **Próximo movimento:** coletar as informações da Innove (mailbox/domínio/admin/Workspace), criar o projeto Google Cloud + OAuth Client em modo **testing** com test user `servium@<dominio>`, provisionar as credenciais em ambiente protegido, registrar a integração do tenant por API, executar **Teste A (envio)** e **Teste B (recebimento)** sob supervisão, coletar a matriz de evidências e devolver ao Rodrigo para a decisão do **HG-007** (`APPROVED`/ajustes).

---

## 21. Answer to Rodrigo

```text
Temos tudo que precisamos para conectar a conta Google Workspace da Innove ao ServiumAI e executar o primeiro teste real?

RESPOSTA: PARCIALMENTE — faltam os seguintes itens:
1. Identificar a mailbox da Innove (domínio, conta servium@<dominio>, admin do Workspace, políticas de segurança).
2. Criar e configurar o Google Cloud Project + OAuth Client (Web) + Consent Screen (test user / interno).
3. Provisionar GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REDIRECT_URI em ambiente protegido (API + worker).
4. Definir a redirect URI de homologação/piloto (não localhost).
5. Autorizar a execução do teste real controlado (envio + recebimento) com supervisão humana.
```

> O **código** está pronto (READY) para receber credenciais reais; a **integração real ainda não foi testada** — código existente ≠ integração real validada.

---

## Final Classification

```text
Agent:          opencode
Model:          opencode/big-pickle
Platform:       OpenCode
HG-007:         PARTIALLY_READY
Real Gmail:     NOT_TESTED
Código alterado: NO
Documentação criada: docs/factory/HG-007_GOOGLE_WORKSPACE_INNOVE_READINESS.md
Blockers:       mailbox Innove indefinida; projeto GCP/OAuth inexistente; GMAIL_* não provisionado;
                redirect URI piloto AWAITING_DECISION; consent screen/verificação indefinidos
Human Decision Required: mailbox/Workspace; criar GCP OAuth client; provisionar env protegido;
                escolher redirect homologação; autorizar Teste A/B supervisionado
Recommended Next Step: coletar dados Innove → criar OAuth Client (testing) → provisionar env →
                registrar integração tenant → executar Teste A/B → coletar evidências → decisão HG-007
```
