# HG-007 FASE 2 — Google Cloud + OAuth — ServiumAI × Innove — Preparation Report

**Data:** 2026-09-15 · **Gate:** HG-007 (`AWAITING_DECISION`) · **Classificação:** `PARTIALLY_READY`
**Escopo:** apenas preparação/documentação do ambiente Google Cloud + OAuth. **Nenhuma autorização OAuth real, nenhum envio/polling real, nenhuma credencial no repositório.**
**Fonte de contexto:** [`HG-007_GOOGLE_WORKSPACE_INNOVE_READINESS.md`](HG-007_GOOGLE_WORKSPACE_INNOVE_READINESS.md) (Fase 1).

---

## 1. Objetivo

Preparar, documentar e validar tecnicamente os requisitos de configuração para:

```text
Google Cloud → Gmail API → OAuth Consent Screen → OAuth Client → Redirect URI → ServiumAI → Tenant Innove
```

sem executar a autorização OAuth real nem colocar credenciais reais em arquivos versionados.

---

## 2. Estado inicial

| Campo | Valor verificado |
|---|---|
| HEAD | `c0675f8ccac7204b487dc4f3c789668a133ba993` |
| origin/main | `c0675f8ccac7204b487dc4f3c789668a133ba993` |
| `HEAD == origin/main` | ✅ |
| B-2 merge `0266322` | ✅ presente (ancestor de HEAD) |
| Working tree | 🔹 apenas `demo/` untracked (excluído de todo commit) |
| B-2 | `DONE` · `B2_MERGED_AND_RECONCILIED` |
| HG-007 | `PARTIALLY_READY` · Real Gmail `NOT_TESTED` |

> Sem `git reset --hard` / `git clean -fd` executados.

---

## 3. Estado do B-2

- **PR #103** squash merged em `main` no commit `0266322` (14/09), CI 4/4 verde.
- Implementação provider-agnóstica consolidada: `EmailProviderResolver`, `GmailAdapter`, `tenant_email_integration` (RLS FORCE), `gmail_tokens`, `mensagens_gmail`, correlação `t:<item>:r<n>`, PollWorker, retry/timeout, eventos persistidos.
- Segue **sem** alteração por esta atividade. **Não reabrir o B-2** (follow-ups ficam registrados, seção 17).

---

## 4. Auditoria do Google OAuth atual (verificada no código)

Reauditei os arquivos para confirmar o relatório da Fase 1 (sem DOCUMENTATION_DRIFT).

### 4.1 Variáveis consumidas

| Variável | Onde no código | Papel |
|---|---|---|
| `GMAIL_CLIENT_ID` | `apps/api/src/email/gmail-adapter.ts:38` · `email.controller.ts:8` | client ID do OAuth |
| `GMAIL_CLIENT_SECRET` | `gmail-adapter.ts:39` · `email.controller.ts:9` | client secret |
| `GMAIL_REDIRECT_URI` | `gmail-adapter.ts:44` · `email.controller.ts:10` | redirect URI; default `http://localhost:3000/auth/gmail/callback` |

> Sem `GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`, `buildGmailConfigFromEnv` retorna `null` → Gmail fica inativo por tenant (fallback global). Sem `GMAIL_REDIRECT_URI`, default **localhost**.

### 4.2 Scopes (exatos, extraídos do código)

`gmail-adapter.ts:23` — **não mudaram desde a Fase 1:**

```text
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.readonly
```

Não são utilizados (verificado por busca no código): `gmail.modify`, `gmail.compose`, `gmail.metadata`, `gmail.labels`. **Não haverá ampliação de scopes.**

### 4.3 Fluxo OAuth mapeado

```text
GET /auth/gmail/authorize          (admin)  → generateAuthUrl(access_type=offline, prompt=consent, scope=[send,readonly], state)
        ↓
Google consent screen
        ↓
GET /auth/gmail/callback?code&state (sessão válida; REQUER cookie de sessão no browser)
        ↓
state.split(':')[0] = tenantId (operadorId NÃO validado → F-2)
set_config('app.tenant_id', tenantId) em conexão ADMIN_URL
exchangeCode → oauth2.getToken(code) → verifyIdToken → e-mail da conta
INSERT/UPDATE gmail_tokens (tenant_id, user_email, access_token, refresh_token, scopes, expires_at)   [texto plano → R-1]
        ↓
tenant_email_integration (NÃO é criada/atualizada pelo callback — passo operacional separado, seção 13)
        ↓
EmailProviderResolver.resolverCanal/resolverRecebedor (requer integração gmail + token) → GmailAdapter
```

| Aspecto | Estado |
|---|---|
| Endpoint authorize | `GET /auth/gmail/authorize` — `@Roles('admin')` |
| Endpoint callback | `GET /auth/gmail/callback` — sessão válida, sem `@Roles` |
| Client ID/secret | via env (seção 4.1) |
| Redirect URI | via env; default localhost (seção 9) |
| Scopes | fixos `send` + `readonly` |
| access_type | `offline` |
| prompt | `consent` |
| state | `tenantId:operadorId` — sem assinatura/validação anti-CSRF (**F-2**) |
| Associação tenant | via `state` → `set_config('app.tenant_id')` → RLS |
| Associação mailbox | **e-mail da conta que consente** (`verifyIdToken`) → `gmail_tokens.user_email` |
| Persistência tokens | `gmail_tokens` texto plano (**R-1**) |
| Refresh token | obtido (`offline`+`consent`) e usado no refresh automático (expiração <60s) |
| Resolução provider | `provider-resolver.ts:73` `ORDER BY provider LIMIT 1`; exige `sendEnabled`+`receiveEnabled` e token presente |

---

## 5. Google Cloud — Spec & Checklist (administrador Innove/Rodrigo)

### 5.1 Projeto Google Cloud

```text
Status:      PENDENTE
Responsável: Rodrigo / administrador Google (Workspace da Innove)
```

- Um projeto dedicado à integração é recomendado mas **não existe** — não será criado automaticamente.
- `OAuth Client`: **Web application** (o fluxo é redirect-based via `google.auth.OAuth2`).

### 5.2 Consulta de pré-requisito

Checklist operacional (acao manual):

```text
[ ] Criar projeto Google Cloud (ou definir projeto existente dedicado)
[ ] Habilitar Gmail API no projeto
[ ] Abrir API & Services → OAuth consent screen
[ ] Criar OAuth Client (Web application)
[ ] Registrar redirect URI(s)
[ ] Adicionar usuário de teste / público (seção 10)
[ ] Verificar aprovações/verificação exigidas para escopos Gmail (produção)
```

---

## 6. Gmail API

| Item | Valor |
|---|---|
| Required | **YES** |
| Status | **PENDING** (ação administrativa) |
| Motivo | adapter usa `gmail.users.messages.send/list/get` — exige Gmail API habilitada no projeto |

---

## 7. OAuth Consent Screen — Checklist

| Campo | Valor sugerido (placeholder — não inventar) |
|---|---|
| Application name | `ServiumAI` |
| Support email | `<PREENCHER>` (contato dev não confidencial) |
| Developer contact | `<PREENCHER>` (obrigatório pelo Google) |
| Authorized domain | `<PREENCHER>` (o domínio da app no piloto, seção 9) |
| Scopes | `gmail.send` + `gmail.readonly` (exatos do código) |
| Test users / Internal audience | a definir (seção 10) |

---

## 8. Internal vs External

| Opção | Aplicabilidade | Impacto | Decisão |
|---|---|---|---|
| **Internal** | somente usuários do domínio Google Workspace da Innove | restrito ao Workspace; sem verificação pública; consignação simples | **HUMAN DECISION** (verificar se a conta `servium@<dominio>` fica feliz como internal / se o domínio é do Workspace) |
| **External + Testing** | qualquer conta, com lista de test users | exige configurar test users (a conta Innove); contorno do app-verificação em produção p/ escopos sensíveis | **HUMAN DECISION** |

> **Não declarei `Internal` nem `External` como definitiva** — depende da configuração real do Workspace da Innove (confirmar se a caixa do Servium pertence ao domínio Workspace próprio vs contas externas). Decisor: Rodrigo / admin do Workspace.

---

## 9. Redirect URI

### 9.1 Fato no código

```text
GMAIL_REDIRECT_URI default = http://localhost:3000/auth/gmail/callback
```

- Permitido **somente** para desenvolvimento local.
- Para homologação/piloto exige `https://<api-real>/auth/gmail/callback`.

### 9.2 Ambientes no repositório (pesquisa interna — nada encontrado)

| Recurso pesquisado | Resultado |
|---|---|
| Ambiente de homologação | ❌ não definido |
| Ambiente de piloto | ❌ não definido |
| URL pública da API | ❌ não definida (`PORT` default `3000`; sem deploy config) |
| HTTPS | ❌ sem config de TLS/proxy |
| Proxy/reverse-proxy | ❌ nenhum (ex.: nginx/traefik/caddy) no repo |
| Domínio | ❌ não há domínio cadastrado |
| `docker-compose.yml` | apenas `postgres` + `mailpit` (sem serviço API/web) |
| `.github/workflows/*` | somente CI/docs-ci/e2e (sem deploy, sem secrets de deploy) |

**Conclusão:** não há ambiente de homologação/piloto definido no repositório.

```text
REDIRECT_URI (homologação/piloto) = AWAITING_DECISION
```

> **Não cadastrar localhost como solução de piloto.**

### 9.3 Matriz de Redirect URI

| Ambiente | Redirect URI | Estado |
|---|---|---|
| Local | `http://localhost:3000/auth/gmail/callback` | existente (default) |
| Homologação | `https://<api-homologacao>/auth/gmail/callback` | `AWAITING_DECISION` |
| Piloto | `https://<api-piloto>/auth/gmail/callback` | `AWAITING_DECISION` |

---

## 10. Scopes — Menor Privilégio

| Scope | Operação no código | Necessário |
|---|---|---|
| `gmail.send` | `users.messages.send` (envio) | **SIM** |
| `gmail.readonly` | `users.messages.list/get` (recebimento) | **SIM** |
| `gmail.modify` / `compose` / `metadata` / `labels` | não utilizados | **NÃO** |

- Escopos **fixos** no código, sem variável de ambiente → nada a configurar além de manter o consent screen com os mesmos 2 scopes.
- Sem ampliação de permissão nesta atividade.

---

## 11. Google Workspace — Checklist (Innove)

```text
[ ] Confirmar domínio Google Workspace (ex.: <dominio>.com.br — placeholder)
[ ] Confirmar mailbox dedicada ao Servium (ex.: servium@<dominio>)
[ ] Confirmar que a mailbox NÃO é conta administrativa
[ ] Confirmar administrador responsável pelo Workspace
[ ] Confirmar política OAuth do Workspace (app access control)
[ ] Confirmar política de aplicações de terceiros (OAuth apps não confiáveis)
[ ] Confirmar 2FA/SSO da conta da caixa
[ ] Confirmar necessidade de aprovação administrativa do app
[ ] Confirmar acesso à Gmail API habilitado para a conta
```

---

## 12. Mailbox do Servium

> **A conta Google que realizar o consentimento OAuth será a identidade efetivamente utilizada pelo `GmailAdapter` para envio e leitura** (`users.messages.send({ userId: 'me' })`; `userId='me'`).

- O MIME monta `From` manualmente, mas a API define o remetente real como a conta autenticada (o `.env.example` registra: "Identity para envio via Gmail é a conta OAuth ('me') — não há 'from' configurável").
- Mailbox placeholder: **`servium@<dominio>`** (nunca inventar endereço real).
- A mailbox deve ser uma conta Google Workspace dedicada, **não** administrativa, com Gmail API habilitada.

---

## 13. Configuração do Tenant Innove

Contrato real verificado em `apps/api/src/cadastro/configuracoes.controller.ts` (`PUT /configuracoes/integracao-email`, admin, RLS).

Campos do upsert (`configuracoes.controller.ts:123-147`) e validações:

- `provider` ∈ `['gmail','mailpit']` (`EMAIL_PROVIDERS`);
- `auth_type` ∈ `['none','oauth2']` (`EMAIL_AUTH_TYPES`);
- `sender_email` / `mailbox_email` validados como e-mail;
- defaults no controller: `send_enabled=true`, `receive_enabled=true`, `auth_type='oauth2'`, `status='configurado'`.

Exemplo com placeholders (não executado):

```json
{
  "provider": "gmail",
  "auth_type": "oauth2",
  "sender_email": "<MAILBOX_INNOVE>",
  "mailbox_email": "<MAILBOX_INNOVE>",
  "send_enabled": true,
  "receive_enabled": true
}
```

> **Importante:** o callback OAuth **não** cria/atualiza `tenant_email_integration` — o registro da integração é **obrigatório** via API (passo de setup) para o resolver ativar Gmail e o scheduler enfileirar recebimento.

---

## 14. Environment Variables (provisionamento)

Todas as variáveis **não existem** no ambiente local/CI hoje (forem apenas documento/placeholder):

| Variável | API | Worker | Status |
|---|---|---|---|
| `GMAIL_CLIENT_ID` | ✅ (lê em `email.controller.ts`) | ✅ (lê via `provider-resolver` → `gmail-adapter`) | `PENDING` |
| `GMAIL_CLIENT_SECRET` | ✅ | ✅ | `PENDING` |
| `GMAIL_REDIRECT_URI` | ✅ (default localhost) | ✅ (default localhost) | `PENDING` |

- **API e Worker precisam** dos valores (ambos resolvem Gmail; a API expõe `authorize`/`callback`/`tokens`).
- O callback acontece no processo da **API** (rota `auth/gmail/callback`); o envio/recebimento real acontece no **Worker**.
- `GMAIL_CLIENT_SECRET` **nunca** deve ser impresso; valore real fora do repo.

```text
Environment Readiness
GMAIL_CLIENT_ID       = PENDING
GMAIL_CLIENT_SECRET   = PENDING
GMAIL_REDIRECT_URI    = PENDING
```

---

## 15. Secrets Management

- **Vai existir solução definida?** Não foi encontrada infra de segredos no repo:
  - sem secret manager (GCP Secret Manager / Vault / AWS);
  - sem Docker secrets (compose não tem serviço de app);
  - sem CI secrets deploy (`workflows` não usam `secrets.*`);
  - `.env.example` documenta: "Preencher apenas em ambiente protegido **DAIL+**; nunca commitar secret" (linhas 24-29).
- Existe `tenant_email_integration.credential_reference` (referência textual ao segredo) — hoje **livre** (L-2), sem mexer.

```text
SECURITY_DECISION_REQUIRED: definir onde as credenciais (client secret / tokens OAuth / refresh tokens)
serão armazenadas fora do repo (proteção da DAIL+, secret manager futuro) antes do piloto.
```

- Não criar infraestrutura nova nesta atividade.

---

## 16. Security Verification

`git grep` (todo o repositório):

| Padrão | Resultado |
|---|---|
| `GMAIL_CLIENT_SECRET` | apenas nomes de variáveis, placeholder comentado (`.env.example:27`) e `fake-client-secret` em testes (`gmail.test.ts:116`, `provider-resolver.test.ts:29`) → **PASS** |
| `refresh_token` (valor real) | nada com valor literal → **PASS** |
| `access_token` (valor real) | nada com valor literal → **PASS** |

**Conclusão:** nenhuma credencial real presente no repositório. **PASS.** Nenhuma credencial foi escrita em git/Markdown/log nesta atividade.

---

## 17. B-2 Follow-ups (classificação — impacto HG-007/piloto)

| ID | Item | Impacta teste real HG-007? | Impacta piloto? | Ação nesta fase |
|---|---|---|---|---|
| F-1 | possível duplicidade se persistência `message_id` falhar | não bloqueia | risco baixo | manter follow-up |
| F-2 | OAuth `state` não assinado/validado | não bloqueia (mitigação: sessão + ambiente controlado) | **corrigir antes do piloto** | `HUMAN_DECISION_REQUIRED` (código) |
| R-1 | tokens em repouso sem criptografia | não bloqueia (DAIL+ + RLS FORCE) | **corrigir antes do piloto** | `HUMAN_DECISION_REQUIRED` (código) |
| R-2 | naming `mensagens_gmail`/`gmail_message_id` | não | não | follow-up |
| R-3 | `ORDER BY provider LIMIT 1` | não (1 integração gmail por tenant) | validar 1-tenant-1-conta | follow-up |
| L-1 | janela `is:unread newer_than:1d` / `maxResults` | ajustar procedimento do teste | revisar | follow-up |
| L-2 | `credential_reference` livre | não | não | follow-up |
| L-3 | redirect URI localhost | não para dev; **piloto exige URI real** | **bloqueia sem decisão** | `AWAITING_DECISION` |

> Não reabrir o B-2. Nenhuma mudança de código foi proposta/implementada nesta fase.

---

## 18. Pre-flight Checklist (verificações não invasivas)

| # | Verificação | Método | Resultado |
|---|---|---|---|
| 1 | API inicia | bootstrap existente (build/typecheck verdes no B-2) | ✅ |
| 2 | Worker inicia | `worker-main.ts` bootstrap (teste de runtime do B-2) | ✅ |
| 3 | GmailAdapter carrega | `require('.../dist/email/gmail-adapter.js')` | ✅ |
| 4 | `GMAIL_CLIENT_ID` reconhecido | `buildGmailConfigFromEnv({GMAIL_CLIENT_ID:...})` com placeholder | ✅ parse OK |
| 5 | `GMAIL_CLIENT_SECRET` reconhecido sem exposição | idem; valor não impresso | ✅ |
| 6 | `GMAIL_REDIRECT_URI` reconhecido | idem; default confirmado `http://localhost:3000/auth/gmail/callback` | ✅ |
| 7 | Resolver reconhece Gmail | lógica `provider-resolver.ts:82-127` (tests B-2 green) | ✅ |
| 8 | `tenant_email_integration` existe | migration `0012` + teste `integracao-email.test.ts` | ✅ |
| 9 | OAuth endpoints existem | `EmailController` (`authorize`/`callback`/`tokens`) | ✅ |

> ⚠️ **Fase 22/23 do rito:** placeholders foram usados **apenas** para validar parsing/config de env — **nenhuma autenticação/requisição ao Google foi feita.**

---

## 19. Blockers

```text
TÉCNICOS (código/básico):
1. Nenhum bloqueio técnico impede a preparação do ambiente — adapter/OAuth/env já existem e parseiam.
   Os únicos itens técnicos são decisões humanas pré-piloto (F-2, R-1, L-3).

AMBIENTE (externos/decisão):
2. Projeto Google Cloud + Gmail API + OAuth Client + Consent Screen NÃO existem (ação administrativa).
3. GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REDIRECT_URI não provisionados (PENDING).
4. Redirect URI de homologação/piloto AWAITING_DECISION (não pode usar localhost no piloto).
5. Mailbox/domínio do Workspace da Innove não confirmados (seção 11).
```

---

## 20. Human Decisions Required

```text
1. Decidir Internal vs External (Testing) do consent screen  — Rodrigo / admin Workspace
2. Definir mailbox/domínio/Workspace da Innove + aprovação do admin  — Innove
3. Definir ambiente de homologação/piloto (URL pública/HTTPS/domínio) e redirect URI  — Rodrigo/Infra
4. Provisionar GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REDIRECT_URI em ambiente protegido (DAIL+)  — Infra
5. Definir secrets management (SECURITY_DECISION_REQUIRED)  — Rodrigo/Infra
6. (Futuro, pré-piloto) tratar F-2 (state), R-1 (tokens)  — Rodrigo/PO
7. Autorizar a Fase 3 (consentimento + teste real controlado)  — Rodrigo/PO
```

---

## 21. Próxima etapa (Fase 3 — não executada nesta fase)

```text
1. Coletar dados da Innove (mailbox/domínio/admin Workspace) + decisão Internal/External
2. Criar/configurar projeto GCP + Gmail API + OAuth Client (Web) + redirect URI de homologação
3. Provisionar env (API+Worker) com placeholders reais apenas em DAIL+
4. Registrar integração do tenant via PUT /configuracoes/integracao-email (placeholders)
5. Executar consentimento OAuth real (autorizado) e validar gmail_tokens
6. Executar Teste A (envio) / Teste B (recebimento) controlado e coletar evidências
7. Decisão do HG-007 por Rodrigo (gate humano)
```

---

## 22. Final Classification

```text
HG-007 Fase 2 = PARTIALLY_READY
```

> Não é `BLOCKED` (nenhum bloqueio técnico impede a preparação) e não é `READY_FOR_HUMAN_EXECUTION` (ainda faltam decisões/insumos externos — Internal/External, mailbox Innove, ambiente homologação/piloto, provisionamento de env), que **devem** ser resolvidos antes da execução autorizada.
>
> Distinção implícita mantida: **IMPLEMENTED ≠ CONFIGURED ≠ AUTHENTICATED ≠ REAL TESTED ≠ PILOT READY**. Nada foi configurado/autenticado/testado de verdade nesta fase.

```text
Agent:   opencode
Model:   opencode/big-pickle
Platform: linux (bash persistent session)
Date:    2026-09-15
Repository: rnsilveira22/servium-ia
```
