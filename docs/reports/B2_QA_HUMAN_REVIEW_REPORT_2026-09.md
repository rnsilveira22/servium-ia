# B-2 · QA Report — Provider de E-mail por Tenant (Desacoplar RECEIVE do Mailpit)

---

## Agent / Model / Platform

| Campo | Valor |
|---|---|
| **Agent** | opencode (QA independente read-only) |
| **Model** | `opencode/big-pickle` |
| **Platform** | linux (bash persistent session) |
| **Data da execução** | 2026-09-14 |
| **Categoria** | QA independente (não substitui Human Review do Owner) |

---

## 1. Identificação

| Campo | Valor |
|---|---|
| **Repositório** | `rnsilveira22/servium-ia` |
| **Branch** | `feat/mvp01-b2-email-provider` |
| **Base (target)** | `origin/main` **`458b8ef`** |
| **HEAD auditado** | **`08628be`** (1 commit; 25 arquivos alterados, **+2649 / −204**) |
| **PR** | **#103** (status remoto não verificável — rede indisponível; pipeline replicado localmente, ver §4) |
| **Implementação referente** | `docs/reports/B2_EMAIL_PROVIDER_IMPLEMENTATION_REPORT_2026-09.md` (declara `IMPLEMENTADO / QA_VERDE / E2E_RUNTIME_APROVADO / AGUARDANDO_HUMAN_REVIEW`) |

### 1.1 Reconciliação git

| Verificação | Resultado |
|---|---|
| Branch ativa | `feat/mvp01-b2-email-provider` ✅ |
| `origin/main` local | `458b8ef` ✅ |
| HEAD | único commit `08628be` (sem commits soltos) ✅ |
| Working tree | limpo, exceto `?? demo/` **untracked** — fora do escopo do PR, não commitado, não avaliado neste QA (ver FU-1) ✅ |

---

## 2. Escopo

### 2.1 Dentro do escopo (auditado)

- Desacoplamento do **RECEIVE** do Mailpit: resolutor por tenant → `GmailAdapter` | `MailpitRecebedor` | fallback.
- Envio por tenant (`sender_email`, fallback `MAIL_FROM`/canal global).
- Migração `0012_email_integration.sql`, endpoint `/configuracoes/integracao-email`, `shared-types`.
- PollWorker **único** (fix de roubo cruzado de jobs).
- AC-B2-01..13 (ver §6), segurança do fluxo, regressão Mailpit/none, CI.
- Gate humano **HG-007** (credencial Gmail real) → `AWAITING_DECISION`.

### 2.2 Fora do escopo / não alterados

- `demo/` (untracked, local) — não commitado.
- OAuth controller (`apps/api/src/email/email.controller.ts`) e `gmail_tokens` (0006/0008) — **pré-existentes**, fora do diff B-2; auditados como contexto de segurança (§5, F-2/R-1).

---

## 3. Metodologia

Read-only. **Nenhuma alteração de código, nenhum commit, nenhuma migration, nenhum teste corrigido, nenhum merge.** Problemas foram documentados conforme a regra de ouro da tarefa QA. Aprovação final permanece com o Owner (Rodrigo / `rnsilveira22`).

Comandos executados (§4) espelham o pipeline do CI (`lint` → `build` → `typecheck` → `test`) + suíte isolada de runtime e reprodução da suíte E2E.

---

## 4. Evidências de execução

### 4.1 Comandos exatos e resultados

| # | Comando | Resultado | Detalhe |
|---|---|---|---|
| 1 | `npm run build -w @servium-ia/api` | ✅ **PASS** | `tsc -p tsconfig.json` limpo |
| 2 | `npm run typecheck` | ✅ **PASS** | `tsc --noEmit -p apps/web` limpo |
| 3 | `npm run lint` (root = `eslint .`) | ⚠️ **9 erros — TODOS em `demo/` untracked** | fora do PR; **0 erros nos arquivos do diff** |
| 3b | `npx eslint apps/api/src apps/api/test packages/shared-types/src` | ✅ **PASS** | 0 erros (1 warning: `.sql` ignorado pela config) |
| 4 | `npm run test -w @servium-ia/api` | ✅ **26 passou \| 1 skip (27); 171 passou \| 2 skip** | `fileParallelism:false` (§ da config) |
| 5 | `npm run test -w @servium-ia/api -- test/rate-limit.test.ts` | ✅ **4/4** | isolado (ver FU-3) |
| 6 | `npm run test -w @servium-ia/runtime-e2e` | ✅ **3/3** | jornada piloto completa + exceção + estabilidade |
| 7 | docker sanity | ✅ | `servium-postgres` e `servium-mailpit` `Up (healthy)` |

> O skip no `mailpit.test.ts` é **pré-existente** (`describe.skipIf(!API)`) e não foi tocado por B-2 (mesmo comportamento antes/depois do diff). A regressão Mailpit é validada pelos demais 26 arquivos + E2E.

### 4.2 Arquivos-chave auditados (evidence base)

| Camada | Arquivo | Auditoria |
|---|---|---|
| Core | `apps/api/src/motor/channel.ts` | Contratos `MensagemRecebida`, `Recebedor`, `ProviderResolver`, `EmailIntegration`; **sem** acoplamento funcional |
| Resolução | `apps/api/src/runtime/provider-resolver.ts` | por tenant; `null` ⇒ fallback global; Gmail exige credencial env + token OAuth |
| Handler | `apps/api/src/runtime/receive-handler.ts` | genérico (resolver→receber→correlacionar); sem provider direto |
| Scheduler | `apps/api/src/runtime/receive-scheduler.ts` | chave `recv:<tenant>:<provider>:<janela>`; fallback dev `MAILPIT_API_URL`; `reapStuck` |
| Correlação | `apps/api/src/runtime/recebimento.ts` | `TOKEN_RE` corpo; `correlacionarRecebidas`; dedupe `gmail_message_id`; UPDATE com guarda de corrida; `actor_type='servico'` |
| Composição | `apps/api/src/runtime/main.ts` / `worker-main.ts` | **PollWorker único** + `register('email.receber', …)` pós-`createMotorWorker` |
| Adapter | `apps/api/src/email/gmail-adapter.ts` | Gmail (envio+recebimento); retry/timeout OAuth; normaliza sem persistir |
| Config | `apps/api/src/cadastro/configuracoes.controller.ts` | `@Roles('admin')`, `req.pg` tenanted, validação de provider/email/header-injection |
| Migration | `packages/db/migrations/0012_email_integration.sql` | RLS ENABLE+FORCE, policy `tenant_isolation`, UNIQUE(tenant,provider), CHECKs |
| CI | `.github/workflows/ci.yml` | **sem nenhuma variável `GMAIL_*`** ✅ |

---

## 5. Segurança

| # | Verificação | Resultado |
|---|---|---|
| S-1 | Gmail real em CI | ❌ **Bloqueado** — `channel.ts:42` `gmail && CI==='true' ⇒ throw`; `.github/workflows/ci.yml` sem `GMAIL_*`; `.env.example` com **placeholders vazios** (nenhum secret commitado) |
| S-2 | RLS FORCE (bloqueio cross-tenant) | ✅ `tenant_email_integration` (0012), `gmail_tokens` (0006/0008) — atestado por teste (`integracao-email.test.ts`) |
| S-3 | Segredos em logs/respostas | ✅ Adapter nunca loga tokens; endpoints de tokens retornam apenas `user_email/scopes/expires_at`; erros de refresh não expõem credencial |
| S-4 | Validação de input | ✅ `PUT integracao-email` rejeita provider inválido, e-mail inválido e **header-injection** (`\r\nBcc`) com 400 |
| S-5 | RBAC | ✅ GET/PUT operador ⇒ 403; anônimo ⇒ 401 |
| S-6 | OAuth callback (`state`) | ⚠️ **F-2** (MEDIUM, pré-existente) |
| S-7 | Segredos em repouso | ⚠️ **R-1** (RESERVATION, pré-existente) |

---

## 6. Verificação dos AC-B2 (01–13)

| AC | Critério (resumo) | Status QA | Evidência |
|---|---|---|---|
| AC-B2-01 | Provider `gmail` registrável fora de CI; proibido em CI | ✅ Verde | `channel.ts:42`; regressão `channel-provider` (6 testes) |
| AC-B2-02 | Fluxo OAuth authorize→callback persiste tokens (UNIQUE tenant,user) | ⚠️ Implementado; hardening pendente (F-2) | `email.controller.ts` + `gmail-adapter.exchangeCode` |
| AC-B2-03 | Envio por tenant idempotente + auditoria `cobrar` | ✅ Verde (ressalva F-1) | `resolverCanal` retorna `sender_email`; `gmail-receber.test` (message_id + `ON CONFLICT DO NOTHING`); `motor-erro.test` (auditoria `cobrar`) |
| AC-B2-04 | Poller periódico por tenant → `MensagemRecebida.correlationToken` | ✅ Verde | `receive-scheduler.test` (chaves `recv:<tenant>:<provider>:<janela>`; fallback dev; idempotência de janela); `gmail-receber.test` (token header+corpo) |
| AC-B2-05 | Correlação `aguardando→recebido` + `mensagens_comunicacao` + audit `receber` | ✅ Verde | `correlacao.test` e `motor-erro.test` |
| AC-B2-06 | Idempotência `gmail_message_id` (ledger) | ✅ Verde | `correlacao.test` (mesma resposta ⇒ `processadas=0`); dedupe `gmail_message_id` em `correlacionarRecebidas` |
| AC-B2-07 | Retry 429/5xx (envio); erro de rede não para o poller | ✅ Verde | `comRetry` (backoff exponencial, timeout global); handler sem retry-loop de fonte ⇒ job de recebimento não entra em loop |
| AC-B2-08 | Auditoria `actor_type='servico'` no recebimento | ✅ Verde | `recebimento.ts:145`; `main.ts` exige `SERVIUM_SERVICE_ID` |
| AC-B2-09 | RLS FORCE (tokens, mensagens, `tenant_email_integration`) | ✅ Verde | `integracao-email.test` (RLS+FORCE), isolamento cross-tenant testado |
| AC-B2-10 | Observabilidade refresh/quota (`/metrics`) | ⏳ **Parcial** (já flagrado na implementação) | refresh automático presente; métricas/alertas de quota → follow-up (FU-4) |
| AC-B2-11 | Regressão Mailpit/none 100% verde | ✅ Verde | suíte API completa + E2E 3/3 |
| AC-B2-12 | Sem credencial em CI; build/lint/typecheck verdes | ✅ Verde | §5 S-1; §4 comandos 1–3 |
| AC-B2-13 | Rito manual REAL (envio+recebimento Gmail fora de CI) | 🔒 **AGUARDA HG-007** | `AWAITING_DECISION` (ver §8) |

---

## 7. Arquitetura, runtime e regressão

### 7.1 Acoplamento do Core (objetivo central do B-2)

Auditoria no `apps/api/src/motor` (Core) e suas dependências:

- ✅ O Core conhece apenas **contratos**: `CommunicationChannel`, `Recebedor`, `ProviderResolver`, `EmailIntegration`, `MensagemRecebida`, `MensagemSaida`, `ResultadoEnvio`, `ReceiveContext`.
- ✅ **Sem** `if gmail` / `if mailpit` / `buscarMensagensDoMailpit()` no Core (ocorrências de "gmail|mailpit" são literais de tipo e comentários de contexto).
- ✅ Fluxo: `Core → CommunicationChannel/Recebedor → ProviderResolver → Adapter`.
- ✅ A seleção por tenant acontece **fora** do Core (`provider-resolver.ts`); o handler é genérico.

### 7.2 Multi-tenant provider e envio por tenant

- ✅ Tenant A → Gmail, Tenant B → Mailpit é demonstrado na **mesma varredura**: `receive-scheduler.test` enfileira `recv:<TEN_A>:mailpit:<janela>` e `recv:<TEN_C>:gmail:<janela>` num único tick.
- ✅ Envio por tenant: `resolverCanal` retorna canal Gmail com `remetente = sender_email` da integração; **fallback** `MAIL_FROM` global (ou canal padrão `mailpit`) para tenants sem integração — compatível com o dev/CI e sem dependência inadequada (chat real).
- ✅ **PollWorker único**: grep confirma exatamente **um** `new PollWorker(` (em `worker.ts` dentro de `createMotorWorker` + `email.receber` registrado em `worker-main.ts`). `reapStuck` existe nos dois schedulers sem criar poller extra. E2E 3/3 sem roubo cruzado.

### 7.3 Idempotência / retry / observabilidade

| Aspecto | Status | Nota |
|---|---|---|
| Envio | ⚠️ | gap documentado **F-1** |
| Recebimento | ✅ | dedupe por `gmail_message_id` + `ON CONFLICT DO NOTHING` |
| Retry envio | ✅ | 429/5xx com backoff 1s·2^n (máx 3) + timeout 15s |
| Retry recebimento | ✅ | falha de fonte ⇒ **sem** retry-loop de job (não re-enfileira) |
| Logs | ✅ | tenant/provider/contagem; sem tokens |
| Auditoria | ✅ | `cobrar`, `receber`, `decidir`, `encerrar` com ligação reconstrutível |

### 7.4 Regressão

- ✅ Suíte API completa **171 testes verdes** (inclui `provider-resolver`, `receive-handler`, `gmail-receber`, `integracao-email`, `receive-scheduler`, `correlacao`, `motor-erro`).
- ✅ Runtime E2E **3/3**: cobranças→respostas→recebido→validação humana→encerrado; exceção; estabilidade entre janelas (sem re-cobrança, sem duplicata, **0 jobs em `falha`**).
- ✅ `rate-limit` passou na suíte **e** isolado (FU-3).
- ⚠️ `npm run lint` falha localmente só por `demo/` **untracked** (FU-1) — **não** afeta CI nem o diff do PR.

---

## 8. Human Gates

| Gate | Status | Nota |
|---|---|---|
| **HG-007** — credenciais Gmail reais + rito manual (AC-B2-13) | 🔒 **`AWAITING_DECISION`** | Código de integração **implementado e testado com fake**; integração real **não validada** por ausência de credencial de ambiente protegido (DAIL+). **Ausência de credencial ≠ código errado.** |

> QA não aprova nem nega este gate: a decisão é do Owner. Este relatório classifica **qualidade do código no repositório** (eixo independente do gate operacional).

---

## 9. Findings

### 🟥 BLOCKER

- **Nenhum.**

### 🟧 HIGH

- **Nenhum.**

### 🟨 MEDIUM

| # | Finding | Arquivo | Mandato |
|---|---|---|---|
| **F-1** | **Gap de idempotência no envio Gmail:** o `message_id` é persistido **após** o envio (`INSERT ... ON CONFLICT DO NOTHING`). Se o INSERT falhar após o e-mail já ter saído, `enviar` retorna `ok:false` → handler `cobrar` falha → job retry → **possível cobrança duplicada ao cliente**. Janela estreita, risco real | `apps/api/src/email/gmail-adapter.ts:242-261` | Mitigar: reservar/persistir antes do envio, ou tratar envio-confirmado-com-falha-local como sucesso + evento de auditoria; teste com sabotagem do INSERT |
| **F-2** | **OAuth callback confia no `state` não assinado** (pré-existente, fora do diff B-2): código de troca só valida `tenantId` do param. Atacante com **seu próprio** `code` OAuth pode vincular a **própria mailbox** a tenant arbitrário (integridade/poisoning; **sem** escalada de leitura cross-tenant — RLS FORCE limita a row ao tenant parametrizado; sem vazamento de credencial de outrem). Já sinalizado como "sugestão securitária" no relatório de implementação | `apps/api/src/email/email.controller.ts:26-49` | Assinar o `state` (mac/HMAC) ou binding session↔state (mapa em memória + TTL) |

### ⚪ RESERVATION (não bloqueantes)

| # | Finding | Status |
|---|---|---|
| **R-1** | Tokens OAuth (`access_token`/`refresh_token`) **em texto claro** em `gmail_tokens` | pré-existente (0006/0008); B-2 depende do fluxo — recomenda-se secret manager/criptografia em repouso (follow-up) |
| **R-2** | **Dívida de naming:** tabela `mensagens_gmail` + coluna `gmail_message_id` usadas como **ledger genérico** de todos os providers (a correlação de mailpit também grava nessas estruturas). Sem bloqueio funcional | documentar e renomear em migration futura |
| **R-3** | `obterIntegracao` usa `ORDER BY provider LIMIT 1`: tenant com **gmail+mailpit** sempre resolve Gmail. Desenho atual é 1 provider primário por tenant; `UNIQUE(tenant,provider)` **permite** os dois | documentar/validar no formulário |

### 🟩 LOW / FOLLOW-UP

| # | Finding | Tipo |
|---|---|---|
| **L-1** | `receber` usa `is:unread newer_than:1d` e **não marca lidas**: não-lidas re-selecionadas a cada janela (ineficiente) e respostas >1d não são recolhidas | LOW (mitigar: marcar lida / ampliar janela) |
| **L-2** | `credential_reference` aceita texto livre no `PUT integracao-email` (sem validação de formato; sem vazamento) | LOW |
| **L-3** | `GMAIL_REDIRECT_URI` default `http://localhost:3000/...` em prod sem env ⇒ falha do Google (config, não vuln) — exigir env em prod | LOW |
| **FU-1** | `demo/` **untracked** quebra `npm run lint` localmente (9 erros). Não é do PR; remover/gitignore e limpar working tree antes do merge. CI não é afetado | Seguimento |
| **FU-2** | Status do CI **remoto** do PR #103 **não verificado** (rede indisponível: fetch/GitHub penduram). Réplica local do pipeline passou (§4) | Seguimento |
| **FU-3** | Flakiness **pré-existente** de `rate-limit` (429 vs 200/401): nesta rodada passou na suíte completa **e** isolado (4/4); sem relação com B-2 — acompanhar | Seguimento |
| **FU-4** | AC-B2-10 (observabilidade refresh/quota/`/metrics`) **parcial** — refresh automático OK; métricas/alertas de quota pendentes (já flagrado pela implementação) | Seguimento |
| **FU-5** | Rito manual real (AC-B2-13) depende de **HG-007** (credencial de ambiente protegido) para liberar piloto | Seguimento |

---

## 10. Classificação final

> **`QA_APPROVED_WITH_RESERVATIONS`**

Justificativa (síntese):

- ✅ **Objetivo central do B-2 atingido**: Core do motor desacoplado do Mailpit; recebimento e envio selecionados por tenant via `ProviderResolver`; **PollWorker único** (roubo cruzado corrigido); migração/endpoints/RLS corretos; AC-B2-01..09, 11, 12 **verdes**; regressão Mailpit/none íntegra.
- ✅ Pipeline local idêntico ao CI **verde** (build/typecheck/lint-diff/test/rate-limit/E2E).
- ⚠️ **Nenhum BLOCKER nem HIGH no diff B-2.** Reservas: **F-1** (janela de reenvio duplicado, real, de baixa probabilidade) e **F-2** (state OAuth não assinado — pré-existente e já declarado pela implementação); demais são reservas de dívida/segurança pré-existentes (R-1..R-3) e follow-ups de processo (FU-1..FU-5).
- 🔒 **HG-007** permanece **AWAITING_DECISION**: implementação real→Gmail **não validada** (sem credencial) — decisão do Owner.

---

## 11. Recomendação

| Prioridade | Ação |
|---|---|
| **Owner (decisão)** | Revisar Human Review final; decidir merge do PR #103 e liberação do piloto condicionada a **HG-007** |
| **1 (após merge)** | Abrir issue/follow-up para **F-1** (idempotência real de envio) e **F-2** (assinatura de `state` OAuth) |
| **2** | Limpar `demo/` do working tree (FU-1) e registrar credencial real em ambiente protegido (R-1/DAIL+) |
| **3** | Renomear dívida `mensagens_gmail`→ledger genérico (R-2) e definir política 1-provider (R-3) |
| **4** | Completar AC-B2-10 (métricas de quota) e confirmar CI remoto do PR #103 quando a rede permitir (FU-2/FU-4) |
