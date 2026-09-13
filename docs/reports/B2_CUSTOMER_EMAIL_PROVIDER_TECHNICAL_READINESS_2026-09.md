# B-2 — Customer Email Provider Technical Readiness

## 1. Executive Summary

O **envio de e-mail** já é **provider-agnóstico** (o core só conhece a porta `CommunicationChannel`; Mailpit entrou como 2º provider sem tocar no core). O **recebimento**, porém, tem **acoplamento estrutural com o Mailpit**: o poller chama `buscarMensagensDoMailpit` diretamente (`recebimento.ts:265`), e não há seleção de provedor de e-mail por tenant (apenas `email_escritorio` gravado na config). O token de correlação e a idempotência **já são genéricos** (body `t:<item>:r<n>`, `UNIQUE(idempotency_key)`, `UNIQUE(tenant_id,gmail_message_id)`).

**Classificação: `NOT_READY`.** Motivo: existem **gaps estruturais de código** a resolver (R1: contrato de recebimento; R2: canal por tenant; R3: modelo de config por tenant com credenciais) **e** decisões humanas pendentes (HG-007, HG-B2-IMPLEMENTATION, G2, G4). Não há impedimento de infra. Enquanto R1–R3 não forem implementados, qualquer provider real (Gmail, M365, SMTP+IMAP) exigirá alteração no core.

## 2. Baseline Reconcilied

| Item | Valor |
|---|---|
| Local `main` | `a95785b` — worktree limpo |
| `origin/main` | `458b8ef` (dependabot #97) |
| B-1 | MERGED (`04329db`, PR #99) + docs `a95785b` (PR #100) |
| Scope | sem alterações de código/testes/banco/migrations/schema/arquitetura/deps/docker/CI/env/docs canônicos em `docs/factory/**`, `docs/adr/**`, documentos aprovados; sem branch/PR/commit/merge; sem writes no GitHub |
| Análises entregues | **somente em Markdown na mensagem** (não gravar `docs/reports/*`) |
| Gmail | arquivos de `c7f4060` (PR #34 · SRV-18), sem alterações desde então |

> Modo: **READ ONLY** (MODO V2). Nenhum arquivo alterado. As evidências abaixo são **file:line** do repositório.

## 3. Executive Status

```text
SEND:   OK (genérico — porta CommunicationChannel; Mailpit 2º provider sem tocar core)
RECEIVE: PARCIAL — único caminho hardcoded Mailpit (recebimento.ts:265)
CHANNEL PER TENANT: INEXISTENTE (canal global por env; só email_escritorio na config)
CREDENTIALS: inexistentes para provider real (HG-007 AWAITING)
ADAPTERS: GmailAdapter completo porém órfão (built para Gmail somente)
STATUS: NOT_READY
```

## 4. Executive Status per Block

| Bloco | Estado |
|---|---|
| Envio genérico (1) | OK — porta `CommunicationChannel`, Mailpit 2º provider sem tocar core (`mailpit.ts`), sem acoplamento ao motor |
| Receptor (2) | PARCIAL — acoplado em Mailpit (`recebimento.ts:265`); `GmailAdapter.receber` jamais chamado |
| Seleção por tenant (3) | INEXISTENTE — só `email_escritorio`; nenhuma chave de provider/credencial |
| Config por tenant (4) | PARCIAL — apenas `email_escritorio` (texto) |
| Adapters (5) | PARCIAL — só `mailpit` registrado; `gmail` pode entrar sem tocar core |
| Credenciais (6) | INEXISTENTE (HG-007 AWAITING) |
| CI (7) | OK — sem credencial real em CI; política “no Gmail em CI” |

## 5. Base Architecture (Como é hoje)

```text
[web] → REST /v1 → [api] → [Motor (engine.ts — puro, sem provider)]
                                │ itens_ciclo (jobs persistidos)
                                ▼
                          [handlers.ts]  cobrar / aguardar / receber …
                                │ deps.channel (uma única instância global)
                                ▼
                    [porta CommunicationChannel — motor/channel.ts]
                     ├─ FakeChannel (tests)
                     ├─ MailpitAdapter (mailpit.ts)
                     └─ GmailAdapter (gmail-adapter.ts — só o envio feedado? NÃO — nem isso)
                                 ▲
                    [runtime/channel.ts — buildChannelFromEnv()]
```

## 6. CommunicationChannel Interface (Contrato de envio)

```ts
// apps/api/src/motor/channel.ts:32-36 (porta)
interface CommunicationChannel {
  enviar(msg: MensagemSaida): Promise<ResultadoEnvio>;
  receberRespostas?(): Promise<MensagemRecebida[]>; // opcional — NÃO usado no poller
}
```

- O `enviar` é **genérico** e já validado com 2 providers (Fake + Mailpit) sem tocar no core.
- `receberRespostas?` é opcional na interface mas **o runtime de recebimento não o utiliza** — usa `buscarMensagensDoMailpit` diretamente.

## 7. Current Receive Runtime (O acoplamento)

```text
RecebedorPeriodico (recebimento.ts:227)
  ├─ ITEM A: ciclo.enviouLembrete (243-248) → sendSeguimento (103) [envio via deps.channel — genérico OK]
  └─ ITEM B: ciclo.ultimaColeta (249-258)
        └─ buscarMensagensDoMailpit (recebimento.ts:265)   ← HARDCODED Mailpit
              └─ correlacionarRecebidas (266) → vincularResposta (121)
```

```ts
// recebimento.ts:265 (hardcoded)
const mensagens = await buscarMensagensDoMailpit(ctx, deps.msgsApiUrl);
```

- O runtime de recebimento **não consulta um provider**; chama a função concreta do Mailpit.
- Não há campo de provider/credencial por ciclo — o poller é único e global.
- **`GmailAdapter.receber` nunca é chamado.**

## 8. Provider Registry (Registro de providers)

```ts
// apps/api/src/runtime/channel.ts:36-54
function buildChannelFromEnv(ctx) {
  switch (process.env.COMMUNICATION_ADAPTER) {
    case 'none':      return { canal: new FakeChannel(), nome: 'none' };
    case 'mailpit':   return { canal: new MailpitAdapter({ from: ... }), nome: 'mailpit' };
    case 'gmail':     throw new Error("adapter 'gmail' sem provider registrado"); // linha 46-52 — falta registrar
    default:          throw new Error(...);
  }
}
```

- Registro via `setChannels/registerChannelProvider` existe (`channel.ts`), `mailpit` usa `registerChannelProvider('mailpit', ...)`;
- `gmail` **não está registrado** em `main.ts`/`worker-main.ts` (só mailpit);
- Nenhuma chave de provider por tenant.

## 9. Send Path (Caminho de envio)

```text
Motor → cobrarItem (handlers.ts:101) → deps.channel.enviar(msg) (handlers.ts:181-187)
   ├─ token: t:<item>:r<n> no corpo (Identificador:) (handlers.ts:179)
   ├─ idempotência: chaveCobranca + UNIQUE(idempotency_key) (0002)
   ├─ mensagens_comunicacao(direcao=envio, remetente=MAIL_FROM estático) (handlers.ts:209-221)
   └─ auditoria 'cobrar' (actor servico)
```

**Provider-agnostico a nível de core; o From é estático (MAIL_FROM / MAILPIT_FROM).**

## 10. Receive Path (Caminho de recebimento) — o gap estrutural

```text
[Receptor] → buscarMensagensDoMailpit  → correlacionarRecebidas → vincularResposta
        (REST + token do corpo: TOKEN_RE)   (MensagemRecebida)   (UPDATE aguardando→recebido)
```

- **Acoplamento:** `recebimento.ts:265` chama função concreta do Mailpit;
- **Token:** lido **somente do corpo** (`TOKEN_RE`, `recebimento.ts:17`) — genérico (não Mailpit), mas o caminho só existe para Mailpit;
- **`MensagemRecebida`** (motor/channel.ts) já é o contrato correto — **não é usado no recebimento real**.

## 11. Correlation Token (Genérico — OK)

```ts
// recebimento.ts:17,25-30
const TOKEN_RE = /Identificador:\s*(t:[A-Za-z0-9-]+:r\d+)/;
const mensagem = correlacionarRecebidas(mensagens, itens); // body parse
```

- Já é **genérico** (formato `t:<item>:r<n>` no corpo);
- `X-Correlation-Token` (header) **não** é lido nenhum lugar;
- Adapter Gmail lê o header mas não o mapeia para `tokenCorrelacao`.

## 12. Idempotency (Já genérico — OK)

| Camada | Mecanismo | Genérico? |
|---|---|---|
| Envio | `chaveCobranca(item,rodada)` + `UNIQUE(idempotency_key)` (`0002_business.sql:90`) | ✅ |
| Recebimento | `UNIQUE(tenant_id,gmail_message_id)` + `ON CONFLICT DO NOTHING` (`0006:33`) | ✅ (gmail_message_id é apenas o id externo) |
| Mailpit | pré-verificação em `vincularResposta` | ✅ |

- A idempotência não depende do provider — depende de **id externo + token**, que já existem no contrato.

## 13. Tenant Isolation (RLS — OK)

| Tabela | RLS | Evidência |
|---|---|---|
| mensagens_comunicacao | FORCE | 0002 (policy por tenant_id) |
| mensagens_gmail | FORCE | 0006/0008 |
| gmail_tokens | FORCE | 0006/0008 |
| itens_ciclo | FORCE | 0002 |

- Isolamento OK via RLS FORCE + conexão tenanteada; o item **não é cross-tenant por construção** (resolução por `item_id`).

## 14. Config Per Tenant (Modelo — gap R3)

```ts
// app-config, configuracoes.controller.ts
email_escritorio: string  // única chave de e-mail por tenant (texto)
```

- **Não existe** chave de *provider* por tenant;
- **Não existe** credencial criptografada/secreta por tenant;
- **Não existe** mailbox/inbox por tenant (1 conta por tenant assumida, `gmail_tokens` UNIQUE(tenant,user_email));
- **Não existe** tabela de integração por tenant (provider, cliente_id, segredo, refresh, inbox, remetente).

## 15. Adapters

| Adapter | Envio | Recebimento | Registro | Status |
|---|---|---|---|---|
| FakeChannel | ✅ | ✅ (fake/rest) | ✅ (`none`) | OK |
| MailpitAdapter | ✅ | ✅ (REST + SMTP) | ✅ (`mailpit`) | OK — **recebimento hardcoded** |
| GmailAdapter | ✅ (código, nunca roda) | ⚠️ `receber` órfão (nunca chamado) | ❌ | Órfão — built Gmail-only |

GmailAdapter mostra que adicionar **1 adapter de envio** é trivial sem tocar core. O gap é o **recebimento**.

## 16. Poller (Runtime — gap R2)

- `RecebedorPeriodico` é **uma** instância global (`runtime.ts`);
- Não há job **por tenant** com provider/credencial;
- Período fixo (5 min por ciclo) — não é configurável por tenant.

## 17. Env / Secrets (Credenciais)

| Variável | Estado |
|---|---|
| `COMMUNICATION_ADAPTER` | `none/mailpit/gmail` — só `none/mailpit` usados |
| `MAIL_FROM` / `MAILPIT_FROM` | estático (não por tenant) |
| `GMAIL_CLIENT_ID/SECRET/REDIRECT_URI` | **não provisionados** |
| Credencial real (HG-007) | **AWAITING_DECISION** |

## 18. CI

- Sem credencial real em CI (política `channel-provider.test.ts:24-26`);
- Rodada atual de QA/CI pleiteada como limpa (sem credencial).

## 19. Options Matrix (Opções de provider)

| Provider | Envio | Recebimento | Autenticação | OAuth? | Infra necessária | Esforço |
|---|---|---|---|---|---|---|
| **SMTP + IMAP** (genérico) | SMTP | IMAP (ou REST p/ provider com API) | app password / token | opcional | conta + app password | **Médio** |
| **Gmail API** | HTTP (gmail.send) | API (gmail.readonly) | OAuth2 offline | ✅ (nativo) | GCP OAuth client | Médio |
| **Microsoft Graph** | HTTP | HTTP | OAuth2 | ✅ | Entra ID app | Médio-Alto |
| **SendGrid / SES / Bounce** | API | (webhook/API) | API key | ❌ | conta | Médio |

**Recomendação técnica (não é decisão):** o par **SMTP+IMAP** é o mais **provider-agnostic e barato para piloto** (funciona para Gmail, M365, Exchange, hospedagem própria). Gmail API/Graph são alternativas com OAuth (mais seguro, mais específico). A decisão é da **produto**.

## 20. Decision for Pilot Provider (Mini-Matrix)

| Critério | SMTP+IMAP (genérico) | Gmail API | Graph |
|---|---|---|---|
| Provider-agnostic | ✅ | ❌ | ❌ |
| OAuth (sem senha p/ party) | opcional | ✅ | ✅ |
| Custo | 0 | 0 | 0 |
| Conhecimento do time | alto | médio | baixo |
| Esforço piloto | médio | médio | médio-alto |

**Veredito (recomendação):** **SMTP+IMAP** para atingir a meta MVP-01 sem dependência de OAuth; Gmail/Graph se a produto preferir OAuth de cara. Decisão final com o Owner.

## 21. Risk Analysis

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| R1 | Polling IMAP com credencial errada | queda de coleta | log via observabilidade |
| R2 | Token no corpo vs header | resposta não correlaciona | suportar corpo e header |
| R3 | 1 conta / tenant assumida | limite de produto | registrar decisão |
| R4 | Quota do provedor (SMTP/API) | envio falha | retry + monitoramento |
| R5 | Credencial de escritório comprometida | exposição | app password / menos escopo OAuth |
| R6 | Caminho de recebimento segue duplicado (Mailpit + novo) | dual-write confuso | migrar para contrato único R1 |

## 22. Missing Pieces (Backlog do B-2)

| Item | Descrição | Gap |
|---|---|---|
| **R1** | Contrato de recebimento genérico: `Recebedor`/`fetchMensagens` por provider → `MensagemRecebida[]` | `recebimento.ts:265` hardcoded |
| **R2** | Canal por tenant: job/poller com `provider`+`config` por tenant | `runtime.ts` global |
| **R3** | Modelo de config por tenant: `integracoes` ou `email_config` (provider, remetente, credencial, inbox) | config não tem chave de provider |
| **R4** | Camada de segredo (credenciais criptografadas em repouso) | tokens plain text (futuro) |
| **R5** | Provedor piloto impl: (recomendado) SMTP+IMAP genérico | — |

## 23. Sequence (Proposta de implementação mínima)

```text
R1 → contrato Recebedor por provider (recebimento reutiliza correlacionarRecebidas — sem mexer no motor)
R2 → canal por tenant (poller por tenant com provider+config)
R3 → modelo de config por tenant (integracoes / email_config)
R4 → segredo (criptografia ou vault) — opcional 1º momento
→ adapter do provider do piloto (SMTP+IMAP ou Gmail)
→ tests (M1–M13) + CI + regressão Mailpit (que continua válida)
```

## 24. Fit for MVP-01 (2º provedor de e-mail do escritório)

- **Meta MVP-01 atinge apenas o 2º canal de e-mail do escritório?** O MVP-01 define o canal de comunicação do escritório como **e-mail** via Gmail (HG-008: "e-mail do escritório"). A meta **não exige** provider-agnostic, mas **R1–R3 são o mínimo** para que o B-2 não fique engessado no próximo provider (seja Gmail ou SMTP+IMAP).
- **Fit:** **PARCIAL** — implementar **R1 (contrato) + R2 (canal por tenant) + R3 (config)** antes do adapter do piloto faz o 2º canal (qualquer provider) ser **configuração**, não novo código do core.

## 25. Risk-Based Decision Table (p/ decisão do Owner)

| Decisão | Impacto | Prioridade |
|---|---|---|
| Definir **provider do 1º piloto** | determina adapter inicial | Alta |
| Decidir migração de **receptor para contrato R1** | desbloqueia qualquer provider | Alta |
| Decidir **modelo de config (R3)** | credenciais por tenant | Alta |
| Aprovar **HG-B2-IMPLEMENTATION** | autoriza escopo | Alta |
| Revisar **G4 (token corpo vs header)** | correlação dos 2 canais | Média |

## 26. Verification (Checklist p/ leitura)

| Check | OK? |
|---|---|
| Porta `CommunicationChannel` (envio) | ✅ |
| Genérico de envio (Mailpit = 2º provider) | ✅ |
| Token de correlação genérico (formato no corpo) | ✅ |
| Idempotência genérica | ✅ |
| Isolamento RLS | ✅ |
| **Receptor genérico (R1)** | ❌ (hardcoded Mailpit) |
| **Canal por tenant (R2)** | ❌ |
| **Config por tenant com credencial (R3)** | ❌ |

## 27. Summary

| Componente | Estado |
|---|---|
| Envio genérico | ✅ |
| Receptor genérico | ❌ (acoplado Mailpit) |
| Canal por tenant | ❌ |
| Config por tenant (credencial) | ❌ |
| Idempotência/RLS/correlação | ✅ |
| **READY?** | **NOT_READY** |

**Não há bloqueio de infra.** O gateway é estrutural de código (R1–R3) + humano (HG-007, HG-B2-IMPLEMENTATION, G2/G4, decisão de provider).

## 28. Next Steps Recommended

1. **Owner decide (produto):** provider do 1º piloto; HG-B2-IMPLEMENTATION; HG-007; G4; migração p/ R1.
2. **Implementação mínima (após gate):** R1→R4 por fases com testes e CI verdes (mailpit continua válido).
3. **Revisão read-only independente** antes de cada merge (padrão B-1).

---

### IDENTIFICAÇÃO OBRIGATÓRIA

```text
Agent: opencode (big-pickle)
Model: opencode/big-pickle
Platform: OpenCode
Date: 2026-09-13
Repository: rnsilveira22/servium-ia
Base: origin/main @ 458b8ef (dependabot #97) — local a95785b, worktree limpo
Modo: READ ONLY (V2) — nenhum arquivo/commit/branch alterado.
Nenhum relatório gravado em docs/reports.
```

- **Estado B-2 (Customer Email Provider): `NOT_READY`** — gaps estruturais R1–R3 + decisões humanas HG-007/HG-B2-IMPLEMENTATION/G2/G4 pendentes.
- Fonte: análises anteriores (B-2 Gmail Technical Readiness 2026-09-13 — AWAITING_DECISION) + reexame do runtime de recebimento.
- Não foi resolvido nenhum conflito; não foi proposta nenhuma alteração de código.
