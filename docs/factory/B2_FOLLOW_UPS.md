# B-2 · Follow-ups formais (QA / Human Review)

> Registro formal dos follow-ups identificados pelo QA independente do B-2
> (`docs/reports/B2_QA_HUMAN_REVIEW_REPORT_2026-09.md`) e aceitos no `HG-B2-2026-09_PO_ACCEPT`
> (PO_ACCEPTED, 2026-09-14). Fonte viva: `docs/factory/FACTORY_STATUS.md`.
>
> Regra: **não iniciar F-1/F-2 automaticamente** — retornam ao backlog do MVP; o foco
> do MVP volta para os blockers do GO/NO-GO (HG-007, segurança do piloto, rollback,
> métricas, responsável humano, M1 UX, GO/NO-GO final).

| ID | Problema | Prioridade | Issue (GitHub) | Estado |
|---|---|---|---|---|
| **F-1** | **B-2 F-1 — Garantir idempotência transacional do envio Gmail** — `message_id` é persistido **após** o envio (`gmail-adapter.enviar`); se o INSERT falhar após o e-mail sair, `ok:false` ⇒ retry ⇒ possível cobrança duplicada | **MEDIUM** | a criar (GitHub indisponível no registro) | **OPEN** → backlog |
| **F-2** | **B-2 F-2 — Validar e proteger OAuth `state` no callback Gmail** — `state` não assinado em `email.controller.ts` (callback público); atacante com `code` próprio pode vincular a própria mailbox a tenant arbitrário (integridade; sem escalada cross-tenant — RLS FORCE). **Pré-existente ao B-2** | **MEDIUM / SECURITY** | a criar (GitHub indisponível no registro) | **OPEN** → backlog |
| **R-1** | **B-2 R-1 — Proteger tokens OAuth em repouso** — `access_token`/`refresh_token` em texto claro em `gmail_tokens` (pré-existente 0006/0008); recomendar secret manager/criptografia | **SECURITY FOLLOW-UP** | a criar (GitHub indisponível no registro) | **OPEN** → backlog |
| **R-2** | **B-2 R-2 — Generalizar ledger `mensagens_gmail` para `provider_message_id`** — tabela/coluna de nome Gmail usada como ledger genérico de todos os providers (dívida de naming; sem bloqueio funcional). **Não executar agora** | LOW | a criar (GitHub indisponível no registro) | **OPEN** → backlog |
| **R-3** | **B-2 R-3 — Definir política de provider primário por tenant** — `obterIntegracao` usa `ORDER BY provider LIMIT 1` (tenant com gmail+mailpit sempre resolve gmail); `UNIQUE(tenant_id, provider)` permite ambos. **Não executar agora** | LOW | a criar (GitHub indisponível no registro) | **OPEN** → backlog |
| **L-1** | Recebimento Gmail: `is:unread newer_than:1d` sem marcar lidas — re-seleciona não-lidas e ignora respostas >1d (mitigar: marcar lida / ampliar janela) | LOW | a criar (GitHub indisponível no registro) | **OPEN** → backlog |
| **L-2** | `credential_reference` aceita texto livre no `PUT /configuracoes/integracao-email` (sem validação de formato) | LOW | a criar (GitHub indisponível no registro) | **OPEN** → backlog |
| **L-3** | `GMAIL_REDIRECT_URI` default `http://localhost:...` em prod sem env ⇒ falha do Google (config — exigir env em prod) | LOW | a criar (GitHub indisponível no registro) | **OPEN** → backlog |
| **FU-1** | `demo/` untracked no working tree quebra `npm run lint` local (9 erros) — fora do PR; remover/gitignore antes do merge | — | a criar (GitHub indisponível no registro) | **OPEN** → higiene local |
| **FU-2** | Status do CI remoto do PR #103 não verificado (rede indisponível); réplica local do pipeline verde | — | — | **PENDENTE** → confirmar quando a rede permitir |
| **FU-3** | Flakiness pré-existente de `rate-limit` (429 vs 200/401) — passou isolado e na suíte nesta rodada; acompanhar | — | — | **Acompanhar** |
| **FU-4** | AC-B2-10 (observabilidade refresh/quota/`/metrics`) parcial — refresh automático OK; métricas/alertas de quota pendentes | — | a criar (GitHub indisponível no registro) | **OPEN** → backlog |
| **FU-5** | Rito manual real (AC-B2-13) depende de **HG-007** (credenciais reais) para liberar o piloto | — | — | **Bloqueado por HG-007** |