# P0.1 — Funcionário Digital Autônomo: pronto para revisão humana

Estado: **`P0_1_RUNTIME_READY_FOR_HUMAN_REVIEW`** · main = `8d7c11b` · 30/08/2026

O runtime do Funcionário Digital (FD) está **operacional e testado de ponta a ponta**:
a única ação humana necessária para um ciclo documental rodar do início ao fim é
**uma chamada `POST /ciclos`**. Todo o resto — cobrança por e-mail, correlação da
resposta, evolução de estado, auditoria — é executado sozinho pelos processos do
runtime.

## Como o FD trabalha sozinho

```
                   ┌───────────────────────── runtime (processo) ─────────────────────────┐
                   │                                                                      │
 POST /ciclos ───► │  Scheduler (MotorScheduler)                                          │
 (única ação       │    · a cada janela global (tick:global:<tenant>:<janela>)            │
  humana)          │      enfileira jobs de evolução de todos os ciclos abertos           │
                   │                                                                      │
                   │  Worker (PollWorker)                                                 │
                   │    · reivindica jobs SKIP LOCKED (isolamento por tenant via RLS)     │
                   │      - ciclo.ativar  → cria itens_ciclo a partir do template         │
                   │      - item.cobrar   → envia e-mail via canal (Mailpit/Gmail/...);   │
                   │                        grava mensagem/comunicacao + token t:<item>:rN │
                   │      - ciclo.tick    → decide cobrança/aguardar/… por frequência     │
                   │                                                                      │
                   │  Recebedor (RecebedorPeriodico)                                      │
                   │    · lê a caixa do agente (To = assistente@servium.local)            │
                   │    · extrai token do corpo (Identificador: …)                        │
                   │    · vincula resposta → item: aguardando → recebido (idempotente)    │
                   └──────────────────────────────────────────────────────────────────────┘
                                   │                                    ▲
                          SMTP real (Mailpit)                    cliente responde
                          cobrança com token                     "Segue… Identificador: t:…"
```

1. Um humano ativa um ciclo (`POST /ciclos {obrigacao_id}`).
2. O **scheduler**, no próximo tick, acorda o ciclo e o **worker** cobra cada item
   por e-mail — o corpo leva o **token de correlação** e a mensagem fica auditada
   (`mensagens_comunicacao`, `eventos_auditoria` com `acoes='cobrar'`, jobs concluídos).
3. O cliente responde ao e-mail; o **recebedor** encontra a resposta na caixa
   **do agente** (cobranças enviadas — que também têm token — são ignoradas),
   extrai o token e marca o item como `recebido` (auditoria `receber`).
4. O processo é **idempotente**: janelas seguintes **não re-cobram nem duplicam**;
   itens já `recebido` saem da elegibilidade do motor; `reapStuck` devolve jobs
   travados; RLS/RBAC/auditoria permanecem intactos em todos os passos.

## Como rodar localmente (prova para Rodrigo)

```bash
docker compose up -d --wait          # postgres + mailpit (SMTP 1025, UI http://localhost:8025)
npm run migrate                      # aplica migrations (cria role servium_app, RLS, SRV-…)
npm run seed                         # tenant/admin/operador de exemplo
npm install                          # dependências do monorepo

# API + runtime (processos separados, cada um no seu terminal):
npm run dev:api                      # NestJS  → http://localhost:3000 (POST /ciclos)

SERVIUM_SERVICE_ID=11111111-2222-3333-4444-555555555555 \
COMMUNICATION_ADAPTER=mailpit \
MAILPIT_API_URL=http://localhost:8025 \
npm run runtime                      # scheduler + worker + recebedor (assistente@servium.local)

# Aceitação de ponta a ponta (sobe API+runtime reais, Mailpit, respostas por SMTP):
npm run db:reset && npm run build && npm run test
```

A suite `@servium/runtime-e2e` faz a prova completa sozinha, mas para **ver com os
olhos**: rode `npm run dev:api` + `npm run runtime`, crie um cliente/template/obrigação
na UI, dê `POST /ciclos`, e acompanhe em `http://localhost:8025` os e-mails saindo;
responda ao e-mail com `Identificador:` + token no corpo e veja o item virar `recebido`
no banco/UI.

## Entrega (gates mergeados em main)

| Gate | PR | Conteúdo |
|------|----|----------|
| #45 Worker | #61 | PollWorker SKIP LOCKED, execução RLS por tenant, backoff/reapStuck, shutdown gracioso |
| #46 Scheduler | #62 | MotorScheduler global por tenant, janela idempotente, clock injetável |
| #47 Canal | #63 | buildChannelFromEnv, adapters none/mailpit/gmail (Gmail real proibido em CI) |
| #48 Mailpit | #64 | MailpitAdapter (nodemailer), serviço docker/CI, integração com Mailpit real |
| #49 Correlação | #65 | token t:&lt;item&gt;:rN, RecebedorPeriodico, migration 0010, recebimento idempotente |
| #50 Runtime E2E | #66 | harness apps/runtime-e2e em CI: API+runtime reais, SMTP real, asserts E2E |

Evidência contínua: **84 testes executados com sucesso**
(1 shared-types + 19 db + 60 api + 2 web + 2 runtime-e2e), além de **2 testes
skipped da API** — integração Mailpit, que ficam pulados quando `MAILPIT_API_URL`
não está disponível no ambiente. Lint + build + typecheck + Selenium E2E verdes
em cada PR.

## Fora de escopo (não autorizado)

**P0.2 = Auditoria** e **P0.3 = Security hardening** — não iniciados. Também fora
de escopo: novos canais reais além de Mailpit (Gmail é proibido em CI/E2E).

## Responsável

Plataforma: co-criação Servium via assistente **opencode** (modelo
`opencode/big-pickle`) com supervisão humana, executando o plano priorizado
PRM-P0.1 sobre a base em `main`. Correção pós-P0.1 registrada no espírito do
runbook manual local (11/2026).
