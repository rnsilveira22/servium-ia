# B-2 — Gmail Technical Readiness & Implementation Plan

## 1. Executive Summary

O **canal Gmail** está como **código morto do ponto de vista de runtime**: existe um adapter completo (`GmailAdapter`), endpoints OAuth (`/auth/gmail/*`), tabelas RLS (`gmail_tokens`, `mensagens_gmail`) e testes unitários — **mas nada disso é executável nem wireado**:

- O provider `gmail` **não está registrado** em nenhum entry point (`main.ts`/`worker-main.ts` registram apenas `mailpit`); `buildChannelFromEnv('gmail')` lança `adapter 'gmail' sem provider registrado` (`channel.ts:46-52`).
- O fluxo de **recebimento é hardcoded para Mailpit** (`RecebedorPeriodico.executa` chama `buscarMensagensDoMailpit`, `recebimento.ts:265`); `GmailAdapter.receber` **nunca é invocado** por nenhum código (grep: única referência é a própria definição, `gmail-adapter.ts:154`).
- **Correlação só lê token do corpo** (`TOKEN_RE`, `recebimento.ts:17`), formato Mailpit; o Gmail lê cabeçalho `X-Correlation-Token` (`gmail-adapter.ts:167`) mas **não o extrai para `tokenCorrelacao`** nem persiste `item_ciclo_id`/`token_correlacao` no `mensagens_gmail` (`gmail-adapter.ts:173-178`).
- **Sem credenciais reais** (HG-007 `AWAITING_DECISION`); `GMAIL_CLIENT_ID/SECRET/REDIRECT_URI` só aparecem no controller e em teste fake — ausentes de `.env.example`, `docker-compose` e CI.
- Um **desenho a decidir**: `ChannelProvider.build()` é sem-tenant (`channel.ts:18-20`) mas `GmailAdapter` exige `(ctx, tenantId, cfg)` (`gmail-adapter.ts:92-98`); o envio atual usa **um canal global** sem contexto de tenant (`handlers.ts:181-187`).

**Não existe bloqueio arquitetural** (communication channel, monólito, PostgreSQL, jobs, RLS e idempotência são suficientes). O que falta são **3 decisões/registros humanos + credencial + um conjunto pequeno de mudanças de código/testes**. Não há nenhuma evidência de runtime com Gmail real em qualquer lugar (CI/local/E2E sempre usam Mailpit ou `none`).

## 2. Reconciled Git/GitHub Baseline

| Item | Valor |
|---|---|
| Local (branch) | `main` — worktree **limpo** |
| HEAD local | `a95785b` (docs B-1 closure, PR #100) |
| **HEAD analisado** | **`458b8ef`** (`origin/main`) — dependabot PR #97 (devDeps) em cima de `a95785b`; sem impacto no código auditado |
| B-1 | MERGED — `04329db` (PR #99), na linha principal (HEAD-2) |
| Arquivos Gmail | criados em `c7f4060` (PR #34 · SRV-18) e **sem alterações posteriores** |
| PRs B-2 | **NENHUM PR** de B-2/Gmail além do #34 (histórico) |
| Issues relacionadas | `#18` comunicação real bidirecional (CLOSED 2026-08-25); `#47` provider por env (CLOSED 2026-09-05); **nenhuma issue aberta de B-2** |
| Registros humanos | `HG-008` APROVADO (canal = Gmail API + OAuth); `HG-007` (credenciais) → **AWAITING** |

## 3. Current Gmail Architecture

| Componente | Arquivo:linha | Estado |
|---|---|---|
| Porta `CommunicationChannel` (`enviar` + `receberRespostas?` opcional) | `apps/api/src/motor/channel.ts:32-36` | IMPLEMENTED/VERIFIED (interface) |
| Seleção por env `COMMUNICATION_ADAPTER` (`none\|mailpit\|gmail`) | `apps/api/src/runtime/channel.ts:14,36-54` | IMPLEMENTED/VERIFIED |
| Proteção "Gmail nunca em CI" | `channel.ts:42-44`; `channel-provider.test.ts:24-26` | IMPLEMENTED/VERIFIED |
| Registro de providers — **só `mailpit`** | `main.ts:16`; `worker-main.ts:12` | **PARCIAL** — `gmail` não registrado |
| `GmailAdapter` (envio+recebimento+OAuth helpers) | `apps/api/src/email/gmail-adapter.ts` (189 ln) | **IMPLEMENTED / NOT RUNTIME-VERIFIED** |
| Endpoints OAuth `/auth/gmail/*` | `apps/api/src/email/email.controller.ts` | IMPLEMENTED (API) / TESTADO (fake env) |
| Tabelas `gmail_tokens` + `mensagens_gmail` (RLS FORCE) | `0006_gmail.sql`; `0007`, `0008`, `0009`, `0010` | IMPLEMENTED/VERIFIED (DB) |
| `email_escritorio` por tenant | `0011_emails.sql`; `configuracoes.controller.ts` | IMPLEMENTED — **não usado no caminho de envio** |

**Classificação consolidada**

| Dimensão | IMPLEMENTADO | TESTADO | WIREADO | EXECUTÁVEL | VERIFICADO EM RUNTIME |
|---|---|---|---|---|---|
| Envio via **Mailpit/Fake** | ✅ | ✅ | ✅ | ✅ | ✅ (runtime-e2e, CI) |
| Envio via **Gmail** | ✅ (código) | apenas erro-sem-token (`gmail.test.ts:76-90`) | ❌ | ❌ (`sem provider registrado`) | ❌ |
| Recebimento **Mailpit** | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recebimento **Gmail** | ✅ (código) | ❌ | ❌ | ❌ (nada o invoca) | ❌ |
| Correlação (token→item) | ✅ (corpo/Mailpit) | ✅ | ✅ (só Mailpit) | ✅ (só Mailpit) | ✅ (Mailpit) |
| Correlação (Gmail) | ❌ (token do corpo nunca extraído no adapter Gmail) | ❌ | ❌ | ❌ | ❌ |
| OAuth/refresh | ✅ (código) | parcial (autorize URL + 400) | ❌ (sem credencial) | ❌ | ❌ |
| `email_escritorio` como remetente | ❌ | ❌ | ❌ | ❌ | ❌ |

## 4. Current Send Flow

```text
Motor (engine.ts decisão 'cobrar'/'aguardar')
  → job item.cobrar (handlers.ts:101)
  → cobrarItem: token t:<item>:r<n> (handlers.ts:179)
  → deps.channel.enviar({...})          (handlers.ts:181-187)   ← sem tenant
     → FakeChannel / MailpitAdapter / GmailAdapter(se registrado)
  → mensagens_comunicacao(direcao='envio') + audit 'cobrar' (handlers.ts:209-224)
```

- **Onde o provider é selecionado:** `buildChannelFromEnv()` em `main.ts:17`/`worker-main.ts:13` — **uma única instância global**.
- **Onde o Gmail deveria ser registrado:** `registerChannelProvider('gmail', ...)` em `main.ts`/`worker-main.ts` — **não existe**.
- **Interface a satisfazer:** `CommunicationChannel.enviar(msg: MensagemSaida)` (`motor/channel.ts:8-15,32-36`).
- **`GmailAdapter` implementa a interface?** Parcialmente: `enviar` casa; **não implementa `receberRespostas`** nem expõe o token/tenant ao chamador — e o construtor exige `(ctx, tenantId, cfg)` (`gmail-adapter.ts:92-98`), o que é **incompatível com `ChannelProvider.build(): CommunicationChannel` sem-arg** (`channel.ts:18-20`). Um `GmailProvider` não pode ser construído globalmente. **Ponto-chave de desenho.**
- **Remetente configurável?** Não por tenant. Envio usa:
  - `deps.remetentePadrao` = `process.env.MAIL_FROM` (`worker.ts:27`) — **só para o registro** em `mensagens_comunicacao.remetente` (`handlers.ts:217`);
  - `MailpitAdapter.cfg.from` = `MAILPIT_FROM` (`mailpit.ts:54`);
  - `GmailAdapter.remetente` default `'assistente@servium.local'` (`gmail-adapter.ts:97`);
  - **`email_escritorio` (B1/OPS-05) NÃO é lido no caminho de envio** (`grep`: só em `configuracoes.controller.ts`).
  - Obs.: Gmail API usa identidade do OAuth (“`me`”) — o From efetivo será a conta autorizada, não um campo arbitrário.
- **Autenticação/tokens:** `getValidClient` (`gmail-adapter.ts:61-89`) lê `gmail_tokens WHERE tenant_id=$1 LIMIT 1` na conexão tenanteada, refresh automático com **60 s de margem** (linha 77-86) e grava de volta. Nenhuma evidência de runtime.
- **Erros:** 429/5xx → retry 3× com backoff exponencial (1s base); demais → `{ok:false}` (`gmail-adapter.ts:119-150`). Throw no handler propaga para retry da fila (`handlers.ts:189-192`). Mailpit não tem esse retry (só catch→`{ok:false}`).
- **Idempotência envio:** chave determinística `chaveCobranca(itemId, rodada)` (`engine.ts:54-56`, `handlers.ts:170-175`) + `UNIQUE(idempotency_key)` em `mensagens_comunicacao` (0002) + `message_id` persistido com `ON CONFLICT DO NOTHING` (`gmail-adapter.ts:130-137`).
- **Auditoria envio:** `cobrar` (`handlers.ts:223`), actor `servico` quando `serviceId`.

## 5. Current Receive Flow

```text
Fonte
  ├─ Mailpit: RecebedorPeriodico (recebimento.ts:227) → buscarMensagensDoMailpit (265)
  │     → correlacionarRecebidas (266) → vincularResposta (121)
  │         → UPDATE itens_ciclo estado='recebido' WHERE estado='aguardando' (139-143)
  │         → mensagens_comunicacao + mensagens_gmail + audit 'receber' (149-165)
  └─ Gmail:  GmailAdapter.receber (gmail-adapter.ts:154-188)
              → lista is:unread newer_than:1d, metadataHeaders incl X-Correlation-Token (167)
              → INSERT mensagens_gmail SEM item_ciclo_id/token_correlacao (173-178)
              → retorna tipo inline SEM tokenCorrelacao
              → ❌ NINGUÉM CHAMA
```

- **Quem chama `GmailAdapter.receber`:** **ninguém** (grep: única ocorrência é a definição).
- **Existe poller Gmail?** Não. `RecebedorPeriodico` é **Mailpit-específico** (hardcoded `buscarMensagensDoMailpit`, `recebimento.ts:265`).
- **Como o token é carregado:** nem chega a ocorrer — a fonte Gmail não produz `MensagemRecebida.tokenCorrelacao`.
- **Como o mensagem é identificada:** Gmail só persiste `gmail_message_id`/thread/snippet/headers.
- **Como `item_ciclo_id` é encontrado:** **nunca** via Gmail; só o bloco Mailpit grava (`recebimento.ts:155-160`).
- **Duplicadas:** `UNIQUE(tenant_id,gmail_message_id)` + `ON CONFLICT DO NOTHING` (receber) / verificação explícita antes (vincular) — só Mailpit usa a 2ª.
- **Sem token:** Mailpit conta `semToken` (`recebimento.ts:186-189`); Gmail não tem esse conceito no adapter.
- **Inválida/cross-tenant:** só Mailpit via `correlacionarRecebidas` (item desconhecido ⇒ ignora; RLS no acesso); **não aplicável hoje ao Gmail**.
- **Erros Gmail:** sem try/catch no `receber` além do `getValidClient`; sem timeout de rede configurado; poller substituído não existe.
- **Retry/backoff recebimento Gmail:** **não existe** (nem para Mailpit — apenas “tenta de novo no próximo ciclo”).
- **Observabilidade/auditoria recebimento:** via Mailpit (`receber` com actor `servico`); **Gmail não gera** eventos de recebimento nem correlação.

## 6. Correlation Analysis

- **Formato:** `t:<item_uuid>:r<n>` (`recebimento.ts:17,30`).
- **Onde é gerado/armazenado:** `handlers.ts:179-186` (é enviado no corpo “`Identificador: …`”). Persistido em `mensagens_comunicacao.token_correlacao` (`handlers.ts:210-221`).
- **Onde é extraído/validado:** `correlacionarRecebidas` only parses body via `TOKEN_RE` (`recebimento.ts:25-27`, `correlacao.test.ts:79-89`); Mailpit entrega `Text` do corpo (`recebimento.ts:80`).
- **Como é associado ao item:** resolução do `tenant_id` do item pela conexão admin (leitura de `itens_ciclo`), depois `app()` tenanteado → `vincularResposta` (`recebimento.ts:195-202`). RLS garante que o `UPDATE itens_ciclo ... WHERE id=$1 AND tenant_id=$2` só afete o tenant do item.
- **Proteção contra duplicidade:** duplo — `gmail_message_id` único por tenant + `WHERE estado='aguardando'` (transição somente uma vez) (`recebimento.ts:130-137,139-147`).
- **Cross-tenant:** token falso/desconhecido ⇒ item não encontrado ⇒ ignorado (`recebimento.ts:196`). Cross-tenant leakage **não existe** por construção (resolução por id do item + RLS), e também não é alcançável pelo Gmail hoje.
- **Reuso:** o mecanismo existente é **suficiente e deve ser reaproveitado**. A alteração mínima é fazer a fonte Gmail produzir `MensagemRecebida` com `tokenCorrelacao` (lendo corpo **ou** cabeçalho) e alimentar o mesmo `correlacionarRecebidas`.

> **Ponto de compatibilidade a decidir:** Mailpit extrai token do **corpo**; `GmailAdapter` já pede o cabeçalho `X-Correlation-Token` na metadata (`gmail-adapter.ts:167`). Para que uma mesma mensagem correlacione nos dois canais, a implementação de B-2 deve (a) extrair token do corpo (payload `full`/`raw`) para resposta padrão por texto, **ou** (b) padronizar envio com `X-Correlation-Token` no cabeçalho (Mailpit já envia `X-Servium-Msg-Key`, mas **não** `X-Correlation-Token` no cabeçalho — `mailpit.ts:37`). Recomenda-se dar suporte aos dois formatos no futuro, mas **decisão explícita** necessária.

## 7. OAuth and Credential Dependencies

| Item | Evidência | Estado |
|---|---|---|
| Fluxo OAuth (auth URL → code → tokens) | `gmail-adapter.ts:22-59`; `email.controller.ts:23-49` | IMPLEMENTED (código) |
| Scopes | `gmail.send` + `gmail.readonly`, `access_type=offline`, `prompt=consent` | IMPLEMENTED (`gmail-adapter.ts:12,26-34`) |
| Armazenamento de tokens | `gmail_tokens` (0006); `ON CONFLICT (tenant_id,user_email)` | IMPLEMENTED/VERIFIED |
| Refresh automático | `gmail-adapter.ts:61-89` | IMPLEMENTED (código), **não testado e nunca rodado** |
| `GMAIL_CLIENT_ID/SECRET/REDIRECT_URI` | `email.controller.ts:8-11` | **Ausentes** (só fake em `gmail.test.ts:115-116`) |
| Provisionamento | `GET /auth/gmail/authorize` (admin) → callback | Sem URI de redirect registrada no Google; **nenhuma UI** no web chama o endpoint |
| HG-007 (credenciais/permissões ausentes) | `HUMAN_DECISIONS_LOG.md:355` — “aguardando momento” | **AWAITING_DECISION** |

**Necessário para executar:** projeto Google Cloud + OAuth Client ID/Secret + URI de redirect publicada + permissão da conta de e-mail do escritório. Isso é **dependência humana/credencial (HG-007)**, não código.

## 8. Multi-Tenant and Security Analysis

| Controle | Evidência | Avaliação |
|---|---|---|
| RLS em `gmail_tokens`/`mensagens_gmail` (FORCE + policy) | `0006_gmail.sql:16-20,36-40`; `0008` FORCE | ✅ |
| Tokens lidos na conexão tenanteada | `gmail-adapter.ts:61-66` (mas o construtor é global — o ctx tenanteado precisa vir do uso) | ⚠️ depende do wiring decidido |
| `state` do OAuth (`tenantId:operadorId`) | `email.controller.ts:26` — **`operadorId` é parseado e descartado** (`:34-35`); sem validação/expiração de `state` | ⚠️ CSRF/replay: baixo (code único do Google), mas recomenda-se validar state |
| Callback usa conexão admin (`ADMIN_URL`) + `set_config` | `email.controller.ts:38-44` | ✅ minimal; não vaza token |
| `GET /auth/gmail/tokens` só expõe `user_email,scopes,expires_at,criado_em` | `email.controller.ts:52-60` | ✅ sem expor refresh/access |
| Isolamento de mailbox | `getValidClient` por `tenant_id`, `LIMIT 1` (`gmail-adapter.ts:66`) | ✅ 1 conta/tenant; **múltiplas contas por tenant não suportado** |
| Correlação cross-tenant | `correlacionarRecebidas` resolve item por id + RLS | ✅ (quando alcançável) |
| Tokens em repouso sem criptografia | colunas `access_token`/`refresh_token` em texto | ⚠️ fora do nível 1 do ASVS (G-04); flag para futuro |
| Exposição de tokens | sem logs de credenciais; erros retornam mensagem genérica | ✅ |

**Riscos de segurança identificados (a documentar, não corrigir):**

1. `state` do OAuth não é validado contra a sessão que iniciou o fluxo (só carrega `tenantId`); atacante em posse de `tenantId` válido poderia completar um consentimento para um tenant não autorizado **se** obtiver o code — mitigação natural: consentimento é do dono da conta.
2. `refresh_token` armazenado em texto plano no banco (sem criptografia em repouso).
3. refresh token Google **expira** (scopes sensíveis / inatividade) — precisa de re-consentimento; sem observabilidade desse caso hoje.
4. `GmailAdapter.receber` consulta mensagens **não lidas** sem marcá-las como lidas → re-poll ineficiente (idempotente por `message_id`, porém).
5. Sem timeout de rede no `fetch` para a API Google.

## 9. Idempotency / Retry / Error Handling

| Aspecto | Envio | Recebimento |
|---|---|---|
| Chave idempotência | `chaveCobranca` + `UNIQUE(idempotency_key)` (`handlers.ts:170-175`) | `UNIQUE(tenant_id,gmail_message_id)` (`0006:33`) |
| Persistência pré-retorno | `message_id` com `ON CONFLICT DO NOTHING` (`gmail-adapter.ts:130-137`) | `ON CONFLICT DO NOTHING` (`gmail-adapter.ts:173-178`) |
| Retry técnico (fila) | throw→fila (`handlers.ts:189-192`) | sem job; próximo tick (`recebimento.ts:249-258`) |
| Retry de API (429/5xx) | backoff 3× (`gmail-adapter.ts:119-150`) | sem retry no `receber` |
| Erro de rede | `{ok:false}` → fila | throw → log + próxima rodada |
| Auditoria do erro | não emite evento de falha (fica na fila) | não emite |

## 10. Audit and Observability

- **Eventos existentes** (todos via `handlers.ts`/`recebimento.ts`): `cobrar`, `receber`, `escalar`, `decidir`, `encerrar`, `ativar` — actor `servico`/`sistema`/`operador`; **nenhum evento Gmail específico** além dos genéricos.
- **`actor_nome`/`X-Request-ID`:** `actor_nome` implementado (M1-OPS-07, PR #98) em `auditoria.controller.ts:54-67`; correlação `X-Request-ID` via `correlation-id.middleware.ts`. Nada é emitido no caminho Gmail hoje porque não há caminho Gmail.
- **Observação:** a audit trail **já espera** Gmail (eventos `cobrar`/`receber` existem genéricos e a tabela `mensagens_gmail` guarda message_id) — falta apenas o caminho que grava.

## 11. Existing Tests

| Teste | O que prova | FAKE/MOCK | MAILPIT | REAL GMAIL |
|---|---|---|---|---|
| `apps/api/test/gmail.test.ts:76-90` | adapter `enviar` sem token ⇒ erro descritivo | ✅ | — | ❌ |
| `gmail.test.ts:92-109` | UNIQUE/`ON CONFLICT` em `mensagens_gmail` (SQL direto) | ✅ | — | ❌ |
| `gmail.test.ts:113-123` | `GET /auth/gmail/authorize` gera URL de consentimento (env fake) | ✅ | — | ❌ |
| `gmail.test.ts:125-140` | callback sem code ⇒ 400; lista tokens vazio; 401 anônimo | ✅ | — | ❌ |
| `apps/api/test/channel-provider.test.ts` | seleção default `none`; gmail+CI lança; mailpit sem provider lança; registro funciona | ✅ | — | ❌ |
| `apps/api/test/mailpit.test.ts:36-63` | `enviar` ok via SMTP Mailpit + falha de transporte | — | ✅ | ❌ |
| `apps/api/test/worker-runtime.test.ts:99-160` | handlers reais + idempotência + job desconhecido→falha | ✅ | ✅ | ❌ |
| `apps/api/test/correlacao.test.ts:78-204` | token é parseável; `aguardando→recebido`; idempotência; sem-token; REST Mailpit fake; envio próprio não vira resposta | ✅ | ✅ | ❌ |
| `apps/runtime-e2e/src/runtime-e2e.test.ts` | jornada completa com `COMMUNICATION_ADAPTER: 'mailpit'` (linha 47) | — | ✅ | ❌ |

**Conclusão:** nenhum teste cobre `GmailAdapter.receber`, `exchangeCode` (sucesso), refresh de token, envio autorizado, correlação via Gmail ou jornada com token Gmail. **“unit verde” ≠ “Gmail real funcionando”** — e aqui nem unit do caminho feliz existe.

## 12. Missing Tests

| # | Prova necessária | Tipo |
|---|---|---|
| M1 | `GmailAdapter.receber` → `MensagemRecebida` com `tokenCorrelacao` (corpo e/ou header) | unit (mock googleapis) |
| M2 | `exchangeCode` sucesso grava tokens (mock `getToken`/`verifyIdToken`) | unit/integration (mock) |
| M3 | refresh de `access_token` expirado atualiza `gmail_tokens` | unit (mock) |
| M4 | fluxo envio autorizado: `enviar` → id + persistência idempotente | integration (mock; sem Rede Google) |
| M5 | recebimento→correlação→item `recebido` + `mensagens_comunicacao` + audit `receber` (token Gmail) | integration (mock) |
| M6 | idempotência duplicada de `gmail_message_id` no recebimento Gmail | integration (mock) |
| M7 | retry 429/5xx no envio (mock code=429) | unit |
| M8 | erro de rede no `receber` (mock throw) não corrompe/paralisa poller | unit |
| M9 | isolamento de tenant: token de tenant A não vincula item de tenant B | integration (RLS) |
| M10 | auditoria/`actor_type='servico'` no caminho Gmail (envio+recebimento) | integration (mock) |
| M11 | mensagens sem token / token inválido / token desconhecido no Gmail | integration (mock) |
| M12 | regressão completa Mailpit não quebra (suíte atual 100% verde) | integration/runtime/CI |
| M13 | **Jornada real** (validação manual pós-merge, fora de CI — política “no Gmail em CI”) | **Aceite manual piloto** |

> Política vigente (`channel.ts:42-44`, `gmail.test.ts` doc, `PRE_PILOT_REMEDIATION_PLAN.md` regra 6): **Gmail real nunca em CI/local**. Portanto a prova “real” pertence ao aceite manual do piloto, não a CI.

## 13. Gap Analysis

| # | Gap | Evidência | Classificação |
|---|---|---|---|
| G1 | Provider `gmail` não registrado (só `mailpit`) | `main.ts:16`; `worker-main.ts:12` vs `channel.ts:46-52` | CÓDIGO (P0) |
| G2 | `ChannelProvider.build()` sem-tenant ≠ `GmailAdapter(ctx, tenantId, cfg)`; canal global sem tenant | `channel.ts:18-20` vs `gmail-adapter.ts:92-98`; `handlers.ts:181` | DESENHO/DECISÃO (+ CÓDIGO) |
| G3 | Poller de recebimento hardcoded Mailpit; `GmailAdapter.receber` órfão | `recebimento.ts:265`; grep (0 chamadas) | CÓDIGO (P0) |
| G4 | Correlação lê só token do corpo; Gmail só header, sem extração/mapeamento | `recebimento.ts:17` vs `gmail-adapter.ts:167,173-178` | CÓDIGO + DECISÃO (formato token) |
| G5 | Credenciais reais ausentes | `email.controller.ts:8-11`; `.env.example`/docker-compose/CI sem `GMAIL_*` | CREDENCIAL (HG-007) — AWAITING |
| G6 | `email_escritorio` não é usado como remetente | `worker.ts:27` (MAIL_FROM estático); `mailpit.ts:54`; `gmail-adapter.ts:97` | CÓDIGO/UX (menor) |
| G7 | Sem UI para disparar o consentimento OAuth (só endpoint API) | `email.controller.ts`; nenhuma chamada em `apps/web/src` | UX (menor) |
| G8 | refresh/erros de rede/token expirado sem observabilidade (log) | `gmail-adapter.ts:77-86` silencioso | OPERAÇÃO (menor) |

## 14. Required Changes for Implementation

(Menor conjunto; ordem de prioridade)

| # | Tipo | Mudança | Arquivo provável | Depende | Risco | Gate |
|---|---|---|---|---|---|---|
| C1 | **A · Código** | Definir resolução de canal por tenant e **registrar provider `gmail`** em `main.ts`/`worker-main.ts` | `runtime/channel.ts`, `runtime/main.ts`, `worker-main.ts`, talvez `email/gmail.provider.ts` | G2 (decisão) | Médio (tocar caminho global) | HG-B2-IMPLEMENTATION |
| C2 | **A · Código** | `GmailAdapter.receber` passa a produzir `MensagemRecebida` com `tokenCorrelacao` (corpo e/ou header) e persistir `item_ciclo_id`/`token_correlacao` | `email/gmail-adapter.ts` (~L154-188) | decisão formato token | Baixo | idem |
| C3 | **A · Código** | Poller Gmail periódico (um job/loop por tenant com token) que alimenta o **mesmo** `correlacionarRecebidas` | `runtime/recebimento.ts` (novo builder de fonte) | C2, G1 | Médio | idem |
| C4 | **B · Testes** | Suíte M1–M12 (mock googleapis; sem rede) | `apps/api/test/gmail*.test.ts`; runtime-e2e | C1–C3 | — | idem |
| C5 | **C · Configuração** | Documentar provisionamento `GMAIL_CLIENT_ID/SECRET/REDIRECT_URI` e fluxo de consentimento no `.env.example`/runbook | `.env.example`, `docs/development/LOCAL_ENV.md`, `FACTORY_RUNBOOK.md` | — | — | registro |
| C6 | **D · Credencial** | Criar projeto OAuth Google + registrar redirect + autorizar conta do escritório; **acionar HG-007** | externo | decisão Owner | — | **HG-007** |
| C7 | **A/C · Código+Config** | (menor) usar `email_escritorio` como remetente Mailpit e documentar identidade Gmail (“me”) | `mailpit.ts`, `handlers.ts`, `configuracoes` | decisão produto | Baixo | idem |
| C8 | **H · UX** | (menor) botão/serviço “Integrar e-mail” + status de token | `apps/web/src/*` | C1, C6 | Baixo | idem |
| C9 | **E · Segurança** (recomendado) | validar `state` do OAuth no callback; opcional: criptografia de tokens em repouso | `email.controller.ts`; futuro migration | — | Baixo | revisão |

## 15. Human Gates / Decisions

| Gate | Objetivo | Estado | Evidência | Decisor | Bloqueia implementação? | Bloqueia PILOT_READY? |
|---|---|---|---|---|---|---|
| **HG-007** | Credenciais/permissões (OAuth client, conta, redirect) | **AWAITING_DECISION** (“aguardando momento”) | `HUMAN_DECISIONS_LOG.md:355` | Owner (Rodrigo) | **SIM** (sem credencial não executa) | **SIM** (critério 7) |
| **HG-008** | Canal do piloto = Gmail API+OAuth | APROVADO (2026-08-30) | log (HG-008) | Owner | Não (já decidido) | — |
| **HG-B2-IMPLEMENTATION** *(proposta)* | Autorizar implementação do B-2 após esta análise | **AWAITING_DECISION** (não registrado — proposta na §19) | este relatório | Owner | **SIM** | indireto |
| **Decisão G2** | Como resolver o canal Gmail por tenant (proxy tenanteado vs. provider por job) | **AWAITING_DECISION** | este relatório §4/§8 | Owner + Sênior | SIM | — |
| **Decisão G4** | Formato de token aceito no recebimento Gmail (corpo e/ou `X-Correlation-Token`) | **AWAITING_DECISION** (recomenda-se ambos) | este relatório §6 | Owner | leva ao C2 | — |
| **Decisão G6/G7** | Sender via `email_escritorio` vs identidade OAuth; incluir UX de consentimento no escopo | **AWAITING_DECISION** | este relatório §4/§14-C7/C8 | Owner | opcional | — |

## 16. Proposed Acceptance Criteria

```text
AC-B2-01 (provider): COMMUNICATION_ADAPTER=gmail registra e constrói o canal Gmail fora de CI;
  em CI permanece proibido (regressão channel-provider).
AC-B2-02 (OAuth/config): fluxo authorize→callback persiste tokens em gmail_tokens com UNIQUE(tenant,user);
  refresh de access_token expirado re-autentica; state do OAuth é validado.
AC-B2-03 (envio): item em 'aguardando' dispara envio via Gmail (mock) com persistência idempotente de
  message_id e auditoria 'cobrar' (actor servico).
AC-B2-04 (recebimento): poller Gmail periódico lê respostas e produz MensagemRecebida com tokenCorrelacao.
AC-B2-05 (correlação): resposta Gmail com token válido vincula item aguardando→recebido, grava
  mensagens_comunicacao + mensagens_gmail(item_ciclo_id) + auditoria 'receber'; o item segue a decisão
  humana do B-1 (resolvido/excecao) — sem regressão.
AC-B2-06 (idempotência): segunda leitura do mesmo gmail_message_id não duplica nem re-marca.
AC-B2-07 (retry/erro): falha 429/5xx no envio aplica backoff e termina em falha técnica de fila;
  erro de rede no poller é capturado sem matar o processo.
AC-B2-08 (auditoria): todos os passos geram eventos com actor_type servico e entidade/link reconstrutível.
AC-B2-09 (RLS/isolamento): token/mensagens por tenant isolados (FORCE); token de tenant A não vincula item B.
AC-B2-10 (observabilidade): logs de refresh/token expirado/quota; contadores em /metrics incrementados.
AC-B2-11 (regressão Mailpit): suíte atual (API/Web/Runtime E2E/Selenium) permanece 100% verde (Mailpit/none).
AC-B2-12 (CI): nenhuma credencial real em CI; gmail+CI bloqueado; build/lint/typecheck verdes.
AC-B2-13 (aceite real piloto): rito manual documentado para validar envio+recebimento reais (fora de CI),
  com registro da evidência (ex.: id de mensagem + recibo de auditoria).
```

## 17. Risks

1. **Quota Google** (250 msg/dia): exaustão silenciosa no piloto; requer monitoramento e respostas definidas.
2. **Refresh token vencido/inatividade**: re-consentimento humano; sem alarme hoje.
3. **Reuso de token do corpo vs header** mal resolvido ⇒ respostas reais do cliente não correlacionam (ruído operacional, ciclo não fecha).
4. **Canal global sem tenant** (G2): se implementado “prego–mola”, pode misturar tokens/mailboxes entre tenants (vazamento lógico) — mitigar com a decisão G2.
5. **`state` OAuth sem validação** e tokens em texto plano no banco (repouso).
6. **Gmail = identidade “me”**: `From` efetivo é a conta OAuth; expectativa divergente de `email_escritorio`.
7. **Polling ineficiente** (is:unread sem marcar lido) e **sem timeout** de rede.
8. **Sem prova real em CI** (política): a verdade final só aparece no aceite manual do piloto — planejar isso na agenda.

## 18. Out of Scope

WhatsApp/Telegram/SMS · multi-canais · 2º Funcionário Digital · framework genérico de agentes · LLM no caminho crítico · microserviços/K8s/broker · dashboards sofisticados · M2–M5 · upload documental (DE-02) · criptografia em repouso (G-04, fora do nível 1) · refatoração do motor. **Follow-up (não blocker):** marcar mensagens como lidas, timeout de rede, e observabilidade de quota.

## 19. Proposed Implementation Sequence

```text
0. (Humanas) Decidir/registrar: HG-B2-IMPLEMENTATION (escopo), HG-007 (credenciais),
   decisões G2 (tenant-aware channel) e G4 (formato token); escolher incluir G6/G7 no escopo.
1. C1 — resolução de canal por tenant + registro 'gmail' (sem tocar regras do motor).
2. C2 — GmailAdapter.receber → MensagemRecebida(tokenCorrelacao) + item_ciclo_id.
3. C3 — poller Gmail periódico alimentando correlacionarRecebidas (reuso).
4. C4 — testes M1–M12 (mock googleapis; sem rede) + verificação manual do padding.
5. C7/C8 — remetente email_escritorio (menor) e UX de consentimento (menor).
6. C6 — provisionamento real da credencial (fora dessa PR; artefato operacional).
7. Rito manual (AC-B2-13) com credencial real → registro de evidência.
8. Merges seguindo ca-class/pr: branch feat → PR → CI → revisão → gate humano → merge.
```

## 20. TECH_READY Decision

**AWAITING_DECISION.**

Não é `NOT_READY`: não há impedimento arquitetural — `CommunicationChannel` (ADR-008), monólito modular, PostgreSQL, jobs persistidos, RLS e idempotência **são suficientes** para B-2 (**“Arquitetura atual é suficiente para B-2”**; nenhuma mudança de infra/Redis/broker/microserviço). O stack atual cobre o desenho.

Não é `READY_FOR_IMPLEMENTATION_AUTHORIZATION` **ainda** porque existem **decisões humanas em aberto** que bloqueiam a autorização/execução:

1. **HG-007** (credenciais/permissões) — `AWAITING_DECISION` (sem ele não há execução real);
2. **Autorização formal** de implementação (proposta `HG-B2-IMPLEMENTATION`) — não registrada;
3. **G2** — estratégia de canal Gmail por tenant (desenho do caminho de envio);
4. **G4** — formato de token aceito no recebimento Gmail (corpo e/ou header);
5. (menores) G6/G7 — remetente e UX de consentimento.

Escopo, arquitetura, dependências, riscos, ACs e testes estão **definidos** (este relatório); o bloqueio é **decisão humana registrada + credencial**.

## 21. Recommended Next Factory V2 Activity

1. **(Produto/Governança)** Owner decide e registra: **HG-B2-IMPLEMENTATION** (autorização de implementação, escopo conforme §14) e **HG-007** (credenciais) no `HUMAN_DECISIONS_LOG.md`; decide **G2/G4** (e opcionalmente G6/G7). — trata o `AWAITING_DECISION`.
2. **(Implementação, após o gate)** Nova branch `feat/mvp01-b2-gmail-wiring` com C1→C4 (mais C7/C8 se autorizadas), sem credenciais reais em CI, mantendo Mailpit como única fonte de CI.
3. **(QA)** `verify` completo + revisão independente; mesma trilha de gates aplicada no B-1 (revisão read-only → `PO_ACCEPTED` → merge em PR).
4. **(Operacional)** Provisionar credencial (C6) fora do repositório e executar o **rito manual real** (AC-B2-13) registrando evidência.
5. Atualizar `FACTORY_STATUS`/GO-NO-GO após cada marco (registrar B-2 no estado do MVP-01).

---

### IDENTIFICAÇÃO OBRIGATÓRIA

```text
Agent: opencode (big-pickle)
Model: opencode/big-pickle
Platform: OpenCode
Date: 2026-09-13
Repository: rnsilveira22/servium-ia
Base: origin/main
HEAD analisado: 458b8ef (origin/main) — worktree local em `main` @ a95785b (dependabot #97 acima não toca código auditado)
```

- **Estado B-2:** `AWAITING_DECISION` (técnica e arquitetonicamente viável; faltam decisões humanas + credencial + autorização).
- **Nenhum arquivo foi alterado**; nenhum commit/PR/branch criado; `HUMAN_DECISIONS_LOG.md`/`FACTORY_STATUS.md`/GitHub intactos.
- Conflitos documentados (gaps G1–G8) sem resolução inventada.
