# MVP-01 — GO/NO-GO · PILOT_READINESS (Diagnóstico para PILOT_READY)

> **Tipo:** auditoria, diagnóstico, classificação e validação **somente-leitura** — **nenhum código foi alterado**; nenhuma arquitetura/banco/schema/dependência/endpoint foi modificado; `FACTORY_STATUS.md` e `HUMAN_DECISIONS_LOG.md` **não** foram tocados nesta atividade.
> **Fonte de governança (ordem canônica):** `docs/factory/*` → `docs/product/MVP_01_VERTICAL_SLICE.md` → `docs/product/INITIAL_BACKLOG.md` → `docs/product/MVP_EXPERIENCE_SPEC_v1.md` → `docs/security/*` → `docs/reports/*` → `HUMAN_DECISIONS_LOG.md` → `FACTORY_STATUS.md` → GitHub → código/testes.
> **Regra:** nenhuma decisão humana foi inventada; todo estado incerto é marcado `AWAITING_DECISION`; merge ≠ aprovação formal quando o processo exige registro; código ≠ funcionamento; unit ≠ E2E.

---

## 1. Executive Summary

O ServiumAI entregou **quase todo o núcleo funcional** do MVP-01: motor determinístico, jobs/fila com idempotência e retry, correlação de respostas, auditoria append-only, RLS deny-by-default, RBAC, hardening de auth (senha/rate-limit), M0 UX, e o Wave B1 do backend M1 (configurações, e-mail obrigatório, evidências do motor). **Mas NÃO está `PILOT_READY`.**

Pontos que impedem o GO:

1. **O ciclo nunca se conclui no fluxo normal:** a resposta do cliente marca o item `recebido`, porém **não existe caminho `recebido → resolvido` / "classificação básica"** — o `decidir` humano só opera `excecao`; itens ficam presos em `recebido`; o ciclo não encerra (criterio 1 do `MVP_01_VERTICAL_SLICE.md`).
2. **Canal real (Gmail API + OAuth 2.0 — HG-008) não é executável hoje:** o provider `gmail` **não está registrado** no runtime (`buildChannelFromEnv('gmail')` lança erro); o recebedor Gmail **não** correlaciona respostas a itens; não há `GMAIL_CLIENT_ID/SECRET` reais (HG-007) — o caminho Mailpit (local/CI) está pronto e testado, mas o canal do piloto (Gmail) depende de credencial + wiring.
3. **Governança em aberto que bloqueia por documento:** **CA-D-3** (revisão de segurança humana do ASVS) **não registrada** — `QUALITY_GATES.md:89-90` é explícito: sem `VALIDATED/APPROVED` no log, "o piloto **não** é declarado pronto".
4. **Critérios 8 e 9 vazios:** sem procedimento de rollback/parada documentado e sem métricas mínimas de negócio coletando (`/metrics` só conta HTTP).
5. **Criterio 10 (responsável humano no escritório)** é organizacional e não está representado no repositório.

**Estimativa de conclusão do MVP-01: ~60%** (núcleo técnico amplamente pronto; faltam fechamento do fluxo, canal real e critérios operacionais de piloto + formalizações de governança).

**Veredito GO/NO-GO:** **NO-GO para início imediato** — distância é *curta e bem delimitada* (P0: 3 itens técnicos + 1 governança), não é um atraso de semanas.

---

## 2. Git/GitHub Baseline (2026-09-12)

| Item | Valor |
|---|---|
| `origin/main` | `dfb75c0` (merge PR #98 — Wave B1) |
| Pai da `main` | `95c8160` (PR #96 — M0 UX) |
| Branch auditada | `chore/factory-v2-reconciliation-2026-09` (`38a59f6`, docs) |
| `feat/m1-frente-a-pleno` | `20af34f` — **3 commits à frente de `main`** (M1-UI-01 templates; M1-UI-05 exceções; revisão) — **sem PR** |
| `feat/m1-frente-b-ops` | já integrado via PR #98 |
| Worktrees | `/tmp/opencode/servium-m1-frente-a` e `-b` |
| PRs abertas | **1**: #97 (dependabot) |
| Issues abertas | **5**: #8, #9, #58, #59, #72 |

### PRs relevantes auditadas

| PR | Estado | Merge | Commit | Autor do merge | Issue | Escopo / impacto no MVP |
|---|---|---|---|---|---|---|
| #90 | MERGED 08/09 | rebase | `a8c057a` | rnsilveira22 | #57 | ASVS 4.0.3 nível 1 + Gate 4.6 (segurança do piloto) |
| #92 | MERGED 08/09 | squash | `731c009` | rnsilveira22 | — | Blueprint UX Fase 2 (planejamento) |
| #95 | MERGED 07/09 | squash | `30744fa` | rnsilveira22 | #94 | Correções UX/UI auditoria (a11y, marca, modais) |
| #96 | MERGED 09/09 | squash | `95c8160` | rnsilveira22 | — | **M0 UX** (Design System + componentes + menu mobile + a11y) — CI 4/4, Selenium 31/31, Visual QA 18/18 |
| #97 | **OPEN** | — | — | — | — | dependabot (devDeps) |
| #98 | MERGED 10/09 | squash | `dfb75c0` | rnsilveira22 | — | **M1 Wave B1** (OPS-01/03/04A/05/07) — `verify` exit 0 (API 138/2, Web 43, Runtime E2E 2) |
| #91 | CLOSED (sem merge) | — | — | — | #73 | cancelar ciclo (fix já na `main` via `6c15781`) |

- Enter PR do **Frente A (M1 UX)** não existe. PR #98 possui 1 conferência L3 do próprio PR em branco (revisar diffs de `auditoria.controller.ts`/`cadastro.controller.ts`) e **nenhum review** registrado.

---

## 3. Matriz End-to-End do MVP-01 (etapas canônicas)

| Etapa do MVP | Implementado? | Testado? | Evidência | Bloqueia PILOT_READY? |
|---|---|---|---|---|
| Cadastro (cliente) | SIM | SIM (unit+integration, Selenium parcial) | `cadastro.controller.ts:42-106`; `cadastro.test.ts:63-186` | Não |
| Obrigação (com `template_id`) | SIM | SIM | `cadastro.controller.ts:108-157` (M1-OPS-01); `cadastro.test.ts:144-193` | Não |
| Checklist (template + itens via API) | **SIM (API)** · **NÃO (UI)** | API SIM; UI NÃO (Selenium `Itens (0)`) | `cadastro.controller.ts:131-183`; GAP-01 (`UX_PRODUCT_GAP_ANALYSIS.md:39`); `ObrigacoesPage.tsx` sem `template_id` | **PARCIAL — ver P1-2** |
| Ciclo (ativação com aprovação humana) | SIM | SIM (API + Selenium) | `ciclos.controller.ts:26-51`; `ciclo-activation.test.ts:69-93` | Não |
| Motor determinístico | SIM | SIM | `engine.ts` (pure); `handlers.ts`; `motor.test.ts:125-155` | Não |
| Identificação de pendência (itens de `template_id`) | SIM | SIM | `handlers.ts:36-70`; `motor.test.ts:185-215`; `atomicidade.test.ts:138-186` | Não (backend) |
| Comunicação (envio) | SIM | SIM (Mailpit/Fake; Gmail código não wireado) | `handlers.ts:181-223`; `mailpit.test.ts:27-55`; `worker-runtime.test.ts:79-134` | **P0-2 (canal real)** |
| Recebimento + correlação | SIM (Mailpit) · **NÃO (Gmail)** | SIM (Mailpit) | `recebimento.ts:21-210`; `correlacao.test.ts:78-204`; `runtime-e2e.test.ts:133-151` | **P0-2 (canal real)** |
| **Evidência / classificação `recebido→resolvido`** | **NÃO** | **NÃO** | `engine.ts:25` define a transição mas **nenhum handler/endpoint a executa**; `decidir-item.ts:25` exige `estado='excecao'`; `runtime-e2e.test.ts:137` termina em `recebido` | **P0-1 — SIM** |
| Atualização da pendência / classificação | NÃO (só via exceção) | NÃO | idem acima | **P0-1 — SIM** |
| Exceção p/ humano | SIM | SIM | `handlers.ts:130-155`; `ci-clos.controller` decidir/reenviar (`excecoes.test.ts`); UI `ExcecoesPage.tsx` | Não |
| Auditoria append-only | SIM | SIM | `0003_rls_security.sql:44`; `auditoria.controller.ts`; `auditoria.test.ts`; `EVENTOS_AUDITORIA.md` (CA-01..05) | Não |
| Segurança | SIM (núcleo) | SIM | ASVS: 31/40 implementados, evidências verificadas (amostra §6) | **P0-3 (CA-D-3)** |
| Fechamento do ciclo + cancelamento | PARCIAL | PARCIAL | `encerrarCiclo`/`tickCiclos` (`handlers.ts:258-295`); cancelar (`cancelar-ciclo.test.ts`) — **fechamento normal travado por P0-1** | **P0-1 — SIM** |
| Métricas mínimas | **NÃO** | **NÃO** | `health.controller.ts:27-30` `/metrics` só contadores HTTP; MVP-01 M-01/M-04/M-12 sem agregação | **P0-5 — SIM** |

---

## 4. Backend / Core Status

| Camada | Estado | Evidência |
|---|---|---|
| Jobs/fila com idempotência + retry técnico | IMPLEMENTADO + TESTADO | `chaveCobranca` (`engine.ts:54-56`); `0002_business.sql:90,142-145`; `reapStuck`/`scheduler.test.ts:118-131`; `motor-erro.test.ts:238-310,424-441` |
| Retry social → exceção | IMPLEMENTADO + TESTADO | `engine.ts:41-44`; `motor-erro.test.ts:265-286` |
| Atomicidade (CA-03) | IMPLEMENTADO + TESTADO | `atomicidade.test.ts` (8 testes: ativar/escalar/decidir/encerrar/races) |
| Concorrência de workers | TESTADO | `atomicidade.test.ts:308-333` |
| Multi-tenancy RLS | IMPLEMENTADO + TESTADO | `0003_rls_security.sql` (FORCE, deny-by-default, 13 tabelas); `cadastro.test.ts:96-118`; `auditoria.test.ts:169-177` |
| Configurações do tenant (email_escritorio, janela) | IMPLEMENTADO + TESTADO (B1) | `configuracoes.controller.ts`; `configuracoes.test.ts`; migração `0011_emails.sql` |
| E-mail obrigatório novos clientes (OPS-04A) | IMPLEMENTADO + TESTADO | `email-validation.ts`; `cadastro.controller.ts:49-57`; `cadastro.test.ts:160-186` |
| Identity de serviço (`actor_type='servico'`) | IMPLEMENTADO + TESTADO | `service-id.ts`; `handlers.ts:48`; `recebimento.ts:114`; `identidade-servico.test.ts:133-196` |

> **Framework de jobs persistidos completo (Issue #8)** está **FORA do núcleo necessário**: o `INITIAL_BACKLOG.md` (S2) demarca "jobs essenciais + idempotency" como subconjunto do MVP (entregue); a generalização/outbox é P1 BACKLOG (ver §13).

---

## 5. Communication / Gmail Status

Abstração `CommunicationChannel` (ADR-008) existe e o motor é agnóstico de provedor. Classificação por dimensão:

| Dimensão | Classificação | Evidência |
|---|---|---|
| OAuth config (Gmail API) | **DEPENDE DE CREDENCIAL** | `gmail-adapter.ts:26-90` (authorize/exchange/refresh) + `email.controller.ts:20-53` + `gmail_tokens` (`0006-0008`); **sem credencial real** (HG-007); testes só com env fake (`gmail.test.ts:73-115`) |
| Enviar | **IMPLEMENTADO/TESTADO (Mailpit+Fake) · DEPENDE DE WIRING+CREDENCIAL (Gmail)** | `handlers.ts:181`; `mailpit.test.ts:27-55`; `worker-runtime.test.ts:79-134`; E2E `runtime-e2e.test.ts:98-151` |
| Receber | **IMPLEMENTADO/TESTADO (Mailpit) · DEPENDE DE WIRING (Gmail)** | `recebimento.ts:47-210`; `correlacao.test.ts:156-203`; Gmail: `GmailAdapter.receber` (`:208-246`) **não conectado ao poller nem à correlação** (não lê token, não grava `item_ciclo_id`) |
| Correlação | **IMPLEMENTADO/TESTADO (fonte Mailpit)** | token `t:<item>:r<N>` (`handlers.ts:179`); `0010_correlacao.sql`; `correlacao.test.ts:78-204` |
| Idempotência | **IMPLEMENTADO/TESTADO** | `chaveCobranca` + UNIQUE `idempotency_key`/`gmail_message_id`; `motor-erro.test.ts:292-310,393-412`; E2E `runtime-e2e.test.ts:155-174` |
| Erro/retry | **IMPLEMENTADO/TESTADO (envio) · PARCIAL (recebimento/Gmail)** | throw→fila (`handlers.ts:189-192`); poller retenta no próximo ciclo (`recebimento.ts:249-258`, sem backoff/teste de rede) |
| Auditoria da comunicação | **IMPLEMENTADO/TESTADO** | eventos `cobrar`/`receber`/`escalar`; ver §7 |
| Evidência | **TESTADO (Mailpit) · FALTA evidência Gmail real** | nenhum artefato de execução contra Google |

**Gap crítico Gmail (P0-2):** seleção por env existe (`channel.ts:36-54`), mas `adapter 'gmail' sem provider registrado` (`channel.ts:45-51`); `GmailAdapter` tem assinatura incompatível com `ChannelProvider` (`gmail-adapter.ts:93-97`); `gmail` + `CI` é bloqueado corretamente (`channel.ts:42-44`, teste em `channel-provider.test.ts:23-25`). E o `email_escritorio` do tenant (B1) **não** é usado como remetente no caminho de envio (usa `MAIL_FROM`/`MAILPIT_FROM`).

---

## 6. Security Status

Cross-check de uma **amostra** das evidências ASVS (todas conferidas em `origin/main`):

| Controle | Estado | Evidência verificada |
|---|---|---|
| RLS deny-by-default multi-tenant | PASS | `0003_rls_security.sql:18-38` FORCE; `cadastro.test.ts:96-102`; `auditoria.test.ts:169-177` |
| RBAC admin/operador (servidor) | PASS | `auth.guard.ts:26-85`; `auth.test.ts:92-107` (operador→403) |
| Sessão httpOnly + SameSite=Lax + token hasheado | PASS | `auth.controller.ts:12-15`; `auth.guard.ts:106-109`; `auth.test.ts:64-72` |
| Senha arargon2id + política min 12 | PASS | `trocar-senha.test.ts:83,93,97-103`; `password-policy.ts:11-12`; `auth.test.ts:56-62` |
| Rate-limit login (5/15min conta · 30/5min IP) | PASS | `rate-limit.test.ts:64-84,96-104,141-150` |
| Identity de serviço | PASS | `identidade-servico.test.ts:133-196` |
| Headers de segurança (helmet/CSP/X-Frame) | **NÃO IMPLEMENTADO (G-03, P1)** | grep 0 em `apps/api/src` |
| Cookie `Secure` em produção (G-01, P1) | PARCIAL | `auth.controller.ts:13` condicional a env; sem teste dedicado |
| Anti-CSRF explícito (G-02, P1) | PARCIAL | só `SameSite=Lax`; sem token anti-CSRF |
| Validação centralizada/schema (G-05/G-06, P2) | PARCIAL | checks manuais por controller; sem ValidationPipe/schema runtime |
| CORS allow list | PASS (sem teste automatizado) | `app.factory.ts:12-22` |

**Cobertura ASVS:** 40 mapeados → **31 implementados, 5 parciais, 3 lacuna, 1 n/d** (confere com `ASVS_PILOTO.md:159`). Amostra V2.1.1, V2.1.2, V2.2.1, V2.5.3, V4.1.1, V4.3.1, V5.1.5 **validada** (arquivos/linhas existem e cobrem as afirmações).

**CA-D-3 (revisão de segurança humana):**

- `QUALITY_GATES.md:89-90`: "*Sem aprovação registrada (`VALIDATED`/`APPROVED` no `HUMAN_DECISIONS_LOG`), o piloto **não** é declarado pronto — alternância aceita.*"
- `ASVS_PILOTO.md:139-147`: marcado explicitamente como **não registrado**; `HUMAN_DECISIONS_LOG.md:259` (HG-L3-0809): **CA-D-3 NÃO registrada**.
- **Classificação: BLOCKER (P0-3 — GOVERNANCE)**. Não é dívida técnica; é registro humano obrigatório.

---

## 7. Audit Status

| Critério | Estado | Evidência | Merge |
|---|---|---|---|
| CA-01 append-only (REVOKE UPDATE/DELETE) | DONE+MERGED | `0003_rls_security.sql:44`; `packages/db/tests/audit.test.ts:14-39` | #25 |
| CA-02 campos/ator (`actor_type` CHECK) | DONE+MERGED | `0002_business.sql:120-130`; `audit.ts:33-44` | #27 |
| CA-03 emissão atômica | DONE+MERGED | `atomicidade.test.ts:138-333` (8 testes) | #77 (#52) |
| CA-04 leitura (GET /auditoria) | DONE+MERGED | `auditoria.controller.ts`; `auditoria.test.ts:152-220`; keyset `audit.ts:81-100` | #76 (#51) |
| CA-05 documentação | DONE+MERGED | `EVENTOS_AUDITORIA.md` (197 ln) — **2 itens stale**: `servico` "sem emissor" e `login_block` "não existe" (emitido desde #55) | #78 (#53) |
| `actor_nome` (DA-02 / M1-OPS-07) | IMPLEMENTADO+TESTADO | `auditoria.controller.ts:54-67`; `auditoria.test.ts:222-266` | #98 |
| Correlação `X-Request-ID` + `token_correlacao` | IMPLEMENTADO+TESTADO | `correlation-id.middleware.ts`; `0010_correlacao.sql`; `correlacao.test.ts` | — |
| Retenção (HG-RETENÇÃO) | **DEFERRED** — sem purge; crescimento preservado | `HUMAN_DECISIONS_LOG.md:219-229`; `EVENTOS_AUDITORIA.md:151-157` | — |

**Issue #9**: conteúdo técnico DONE (CA-01..05), **Issue seguirá OPEN** aguardando decisão do Owner de fechamento formal (drift de board Done/P1 vs OPEN/P0 já registrado).

---

## 8. UX Status (M0 vs M1 — separação rigorosa)

### M0 — Fundação Visual

- **Aprovado** (HG-UX-M0, 08/09) e **MERGED** (PR #96, 09/09, `95c8160`): Design System (`brand-tokens.css`), componentes base, menu mobile, a11y.
- Evidência pós-merge: CI 4/4, Selenium 31/31, Visual QA 18/18, `verify` 178 testes (na época).
- **`HG-UX-M0_ACCEPTANCE` não registrado formalmente** — a única evidência de aceite é o próprio merge pelo owner (AWAITING_DECISION para formalizar).

### M1 — separação Backend (OPS) vs UX (UI)

- **M1 Backend (Wave B1):** OPS-01/03/04A/05/07 **MERGED** (`dfb75c0`). **Sem registro formal de gate/merge no log** (AWAITING_DECISION para formalizar). OPS-04B **AWAITING_DECISION** (não implementado).
- **M1 UX (Frente A):** `feat/m1-frente-a-pleno` (`3f6ebdb` M1-UI-01 templates; `a45f830` M1-UI-05 exceções; `20af34f`) — **implementado, sem PR, sem gate autorizado**. Escopo = parcela do M1 (`+1.487/−113`, 14 arquivos: TemplatesPage + ExcecoesPage + E2E). **Não** cobre: M1-UI-02..04, auditoria visual (GAP-02), linguagem de negócio em badges, jornada E2E completa, métricas.

> **M1 Backend autorizado ≠ M1 UX autorizado.** Não existe autorização formal para M1 UX; o plano M1 foi aprovado como **plano** (HG-UX-M1 citado apenas em backlog executável não versionado — ver §11). A decisão/merge do Wave B1 foi ação do owner no GitHub, sem registro de gate.

---

## 9. M1 Status (por item)

| Item M1 | Necessário p/ MVP/piloto? | Já implementado? | Mergeado/autorizado? | Human Gate? |
|---|---|---|---|---|
| M1-OPS-01 (`template_id` em `POST /obrigacoes`) | SIM (GAP-01 backend) | SIM | SIM (#98) | Formalizar registro (backlog) |
| M1-OPS-04A (e-mail obrigatório) | SIM (DD-08) | SIM | SIM (#98) | Formalizar registro |
| M1-OPS-03 (evidências motor + retry) | SIM (evidência) | SIM | SIM (#98) | Formalizar registro |
| M1-OPS-05 (configurações tenant) | SIM | SIM | SIM (#98) | Formalizar registro |
| M1-OPS-07 (actor_nome) | SIM (auditoria legível) | SIM | SIM (#98) | Formalizar registro |
| M1-OPS-04B (legados sem e-mail) | AWAITING_DECISION | NÃO | NÃO | SIM (decisão) |
| M1-UI-01 (templates na UI) | SIM (GAP-01 UI) | SIM (branch Frente A) | **NÃO** (sem PR) | SIM (gate Frente A) |
| M1-UI-05 (exceções explicadas) | SIM | SIM (branch Frente A) | **NÃO** (sem PR) | SIM (gate Frente A) |
| M1-UI-02/03/04/06..09 (auditoria visual, língua de negócio, E2E) | PARCIAL (núcleo: auditoria legível; demais melhoria) | NÃO | NÃO | SIM (gate M1 UX) |

---

## 10. Human Gates (mapa direto `PILOT_READY`)

| Gate | Estado da decisão | Evidência | Gap / ação |
|---|---|---|---|
| HG-005 (TIME-TO-PILOT) | APROVADO | log | — |
| HG-008 (canal Gmail+OAuth) | APROVADO | log | implementação parcial (P0-2) |
| HG-PR-SEC (senha/rate-limit) | APROVADO + IMPLEMENTADO | log; PRs #80/#81 | — |
| HG-UX-M0 (implementar M0) | APROVADO (08/09) + MERGED (09/09) | log; PR #96 | **HG-UX-M0_ACCEPTANCE não registrado** → AWAITING_DECISION |
| HG-UX-M1 (plano M1 paralelo) | Citado como aprovado (09/09) **apenas em backlog não versionado** | — | **sem registro formal** → AWAITING_DECISION |
| Merge Wave B1 (PR #98) | Executado pelo owner (10/09) sem registro | GitHub (`mergedBy`) | **sem registro no log** → AWAITING_DECISION |
| **M1 UX (Frente A)** | Sem decisão/revisão | branch sem PR | → criar PR + gate |
| **CA-D-3 (revisão ASVS)** | **NÃO registrado** | `QUALITY_GATES.md:89-90` | **BLOCKER (P0-3)** |
| **HG-RETENÇÃO** | DEFERRED; log registra "aguardando antes de PILOT_READY" | log; `EVENTOS_AUDITORIA.md:151-157` | decisão (não há purge); registro divergente: doc de eventos trata como não-bloqueante (preservar tudo) |

---

## 11. Governance Gaps (drift documental vs GitHub — sem alteração de arquivos)

| # | Gap | Estado documentado | Estado real (GitHub/git) |
|---|---|---|---|
| DD-1 | `FACTORY_STATUS.md` (snapshot 08/09): M0 `AWAITING`/"sem merge" | pendente | M0 MERGED 09/09 (#96) |
| DD-2 | "nenhum PR aberto" | pendente | PR #97 OPEN |
| DD-3 | Issue #20 OPEN na "Fila efetiva" | pendente | CLOSED no GitHub (24/08) |
| DD-4 | `HG-UX-M0_ACCEPTANCE`, HG-UX-M1 (plano), merge #98 — sem registro | ausente | evidência só no GitHub/blobs |
| DD-5 | Documentos de análise **perdidos** (não commitados; ausentes do worktree): `docs/ux/FACTORY_V2_UX_UI_EVOLUTION_BACKLOG.md`, `docs/ux/FACTORY_V2_UX_UI_REFERENCE_COMPARISON.md`, `docs/factory/FACTORY_V2_M1_EXECUTABLE_BACKLOG.md`, `docs/reports/M1_PARALLELO_*.md`, `RESUMO_SESSAO_CHATGPT_20260910.md` | — | existem apenas como blobs/checkpoints efêmeros (`refs/codex/...`) — **nenhuma branch contém** (`git log --all` vazio) |
| DD-6 | `EVENTOS_AUDITORIA.md` stale (servico/login_block) | desatualizado | emitidos desde #89/#55 |
| DD-7 | `HUMAN_DECISIONS_LOG.md` "Pendências": HG-UX-M1 "aguardando conclusão do M0" | desatualizado | M0 mergeado desde 09/09 |
| DD-8 | PR #98 com conferência L3 própria ("revisar diffs") não marcada | incompleta | merge executado mesmo assim |

---

## 12. Matriz de Fechamento (Prioridade × Bloqueio)

### P0 — BLOCKER

| # | Pendência | Categoria | Evidência | Estado | Implementação? | Human Gate? | Bloqueia PILOT_READY? |
|---|---|---|---|---|---|---|---|
| **B-1** | **Classificação/fechamento: transição `recebido→resolvido` ausente** (sem endpoint/path; `decidir` só aceita `excecao`) | Código/Regra de produto | `engine.ts:25`; `recebimento.ts:140`; `decidir-item.ts:25`; `runtime-e2e.test.ts:137` | NÃO implementado | **SIM** (mecânica + regra de classificação — precisa decisão da regra) | SIM (decisão da regra de classificação) | **SIM (criterio 1 + encerramento)** |
| **B-2** | **Canal real Gmail não executável** (provider não registrado; recebedor Gmail sem correlação; sem credencial) | Código + Credencial | `channel.ts:45-51`; `gmail-adapter.ts:92-161,208-246`; attivo HG-008/HG-007 | PARCIAL | **SIM** (wiring do provider + correlação) | CREDENCIAL (HG-007) + decisão de escopo | **SIM (criterio 7)** |
| **B-3** | **CA-D-3 — revisão de segurança humana ASVS não registrada** | Governança/Segurança | `QUALITY_GATES.md:89-90`; `ASVS_PILOTO.md:139-147`; log | AWAITING | **NÃO** (só registro) | **SIM (obrigatória)** | **SIM (gate explícito)** |
| **B-4** | **Procedimento de rollback/parada documentado** (criterio 8) | Operacional/Doc | sem doc; sem kill-switch; só SIGTERM + cancelar | AUSENTE | **SIM (doc)** + decisão sobre kill-switch | NÃO | **SIM (criterio 8)** |
| **B-5** | **Métricas mínimas coletando** (M-01 tempo médio, % sem escalada, tentativas, pendências/cliente — criterio 9) | Código | `health.controller.ts:27-30` (só HTTP); `MVP_01_VERTICAL_SLICE.md:86` | NÃO | **SIM** (mínimo a partir de eventos auditados) | NÃO | **SIM (criterio 9)** |
| **B-6** | Responsável humano identificado no escritório piloto (criterio 10) | Organizacional (fora do repo) | `MVP_01_VERTICAL_SLICE.md:100` | NÃO-FOUND | NÃO | SIM (Owner + escritório) | **SIM (criterio 10)** |

### P1 — NECESSÁRIO

| # | Pendência | Evidência | Implementação? | Gate? |
|---|---|---|---|---|
| P1-1 | Formalizar registros de decisão: `HG-UX-M0_ACCEPTANCE`, HG-UX-M1 (plano), merge Wave B1 (PR #98) | DD-4/DD-7 | NÃO | SIM (registro) |
| P1-2 | Criar PR + gate do Frente A (M1-UI-01 templates E M1-UI-05 exceções) — fecha GAP-01 UI (template pela UI; Selenium "Itens (0)" vira "Itens>0") | `feat/m1-frente-a-pleno` (sem PR); GAP-01 | NÃO (revisar/mergear branch pronta) | SIM (gate M1 UX) |
| P1-3 | Headers de segurança (helmet/CSP), `Secure` cookie em prod, anti-CSRF (G-01/02/03) | `ASVS_PILOTO.md` G-01..G-03 | SIM (pequeno) | QA/seguindo CA-D-3 |
| P1-4 | Auditoria visível na UI (`/auditoria` hoje só metrics/health) — M1-UI-04/GAP-02 | `AuditoriaPage.tsx:37-55` | SIM (M1 UX) | gate M1 UX |
| P1-5 | Teste E2E (Selenium) da jornada completa (template→itens>0→recebimento→decisão→auditoria) — M1.9 | Selenium atual pára em "Itens (0)" | SIM | gate M1 UX/QA |
| P1-6 | Fechamento formal Issue #9 (conteúdo DONE) | GitHub OPEN; Reconciliation | NÃO | SIM (Owner) |
| P1-7 | Decisão HG-RETENÇÃO (prazo/volume) | log; `EVENTOS_AUDITORIA.md` | NÃO | SIM (decisão) |

### P2 — MELHORIA (pode ser pós-piloto)

| # | Pendência | Observação |
|---|---|---|
| P2-1 | Upload/evidência documental (tabela `documentos` sem endpoint/UI) | `M1_IMPLEMENTATION_PLAN.md:§5` declara POST_M1 |
| P2-2 | `email_escritorio` do tenant usado como remetente real | hoje usa `MAIL_FROM` estático |
| P2-3 | Empregar Feedback/backoff dedicado no recebedor; teste de falha de rede | PARCIAL hoje |
| P2-4 | `login_block`/`servico` atualizar `EVENTOS_AUDITORIA.md` | DD-6 |
| P2-5 | M1-UI-02/03/06..09 (linguagem de negócio completa, journeys restantes) | melhoria UX |
| P2-6 | Validação centralizada/schema runtime (G-05/G-06) | dívida conhecida |

---

## 13. Non-Blockers (evidência de que NÃO bloqueiam o piloto)

- **M1-OPS-04B** (legados sem e-mail): não bloqueia novo cliente, ciclo ou comunicação de novos clientes; clientes legados sem e-mail são apenas **não cobrados** (`handlers.ts:126-127`), sem efeito nos novos. Workaround: cadastro exige e-mail desde hoje. → **AWAITING_DECISION / não-bloqueante** se o piloto só usa cadastros novos.
- **Issue #8 (framework de jobs persistidos completo)** e **outbox**: o subconjunto essencial (jobs essenciais + idempotência + retry) está entregue; generalização é P1 BACKLOG.
- **Issue #72** (obrigação editável), **#58/#59** (tech-debt P2): fila aberta, sem vínculo direto com `PILOT_READY`.
- **Criptografia em repouso/HSTS/upload/ativação out-of-band (G-04/G-07)**: fora do escopo nível 1 / piloto.
- **PR #97 (dependabot)**: manutenção de devDeps; não bloqueia.

---

## 14. Out of Scope (explícito para não expandir o MVP)

M2 completo · M3 completo · M4 completo · M5 completo · 2º Funcionário Digital · framework genérico de agentes · multi-canais/WhatsApp não validado · ERP · microsserviços/K8s/infra distribuída · LLM no caminho crítico (ADR-010) · dashboards sofisticados · dark mode. Nenhum destes apareceu como requisito obrigatório nos documentos canônicos; **divergência não encontrada** que os torne obrigatórios.

---

## 15. MVP Completion Estimate

**~60% do MVP-01** (foco PILOT_READY). Crédito nos critérios do `MVP_01_VERTICAL_SLICE.md`: 5/10 cumpridos, 2/10 parciais, 3/10 vazios.

| Bloco | Itens restantes | Esforço relativo |
|---|---|---|
| Governança | ~6 (P0-3, P1-1/P1-6/P1-7, HG-UX-M0_ACCEPTANCE, registros) | PEQUENO |
| Código | ~4 (B-1, B-2, B-5, P1-3) | MÉDIO |
| QA | ~3 (E2E jornada completa, runtime E2E recebido→resolvido, Visual QA Frente A) | MÉDIO |
| Segurança | ~3 (CA-D-3, headers/cookie/CSRF, teste CORS) | PEQUENO |
| Produto | 4 decisões (regra de classificação recebido→resolvido, M1-OPS-04B, HG-RETENÇÃO, escopo do canal) | PEQUENO |
| Operação/Organizacional | 2 (rollback/parada doc, responsável humano escritório) | MÉDIO (organizacional) |

---

## 16. Minimal Path to PILOT_READY

```text
CURRENT STATE (dfb75c0) — núcleo pronto, fluxo com gap de fechamento, canal real não wireado
      ↓
BLOCKERS
  1. B-1 recebido→resolvido (regra de produto + endpoint)        [P0]
  2. B-2 Wiring Gmail + credenciais (HG-007) + correlação        [P0]
  3. B-3 CA-D-3 revisão de segurança registrada                  [P0]
  4. B-4 doc rollback/parada (+ decisão kill-switch)             [P0]
  5. B-5 métricas mínimas (4 métricas a partir de eventos)       [P0]
  6. B-6 responsável humano no escritório piloto                [P0]
      ↓
DECISIONS
  • Regra de classificação recebido→resolvido (auto vs humana)   • HG-UX-M0_ACCEPTANCE formalizar
  • HG-UX-M1 (plano) registrar + gate Frente A (M1 UX)           • M1-OPS-04B
  • HG-RETENÇÃO (prazo)                                          • fechar #9
      ↓
IMPLEMENTATION
  • B-1 (classificação) · B-2 (provider+correlação) · B-5 (métricas)
  • P1-3 (headers/cookie/CSRF) · merge Frente A (P1-2/P1-4/P1-5)
      ↓
QA
  • tests B-1/B-2/B-5 · Selenium jornada completa · runtime E2E com fechamento
  • Visual QA Frente A · CI verde
      ↓
SECURITY
  • CA-D-3 registrada (VALIDATED/APPROVED no log) · G-01..G-03 revisadas (P1)
      ↓
E2E
  • verify (API+Web+Runtime E2E) verde na main pós-merge do Frente A
      ↓
HUMAN REVIEW
  • GO/NO-GO checklist executado (FACTORY_RUNBOOK: "PILOT_READY = PARAR")
  • decisão humana explícita de pilot deployment (NUNCA automático — AUTONOMY_POLICY L3)
      ↓
PILOT_READY
```

Menor caminho seguro: **núcleo já pronto; falta 1 transição de estado (B-1), o canal real funcional (B-2), 4 métricas (B-5), 1 doc operacional (B-4), e o registro formal (B-3/P1-1) + decisão de gate do Frente A (P1-2)** — estimativa de esforço **PEQUENO a MÉDIO** em código e **PEQUENO** em governança, sem reescritas e sem mudança de arquitetura.

---

## 17. Recommended Next Actions

1. **(Decisão de produto)** Definir a regra de `recebido→resolvido` (resposta com token => resolvido automático, ou validação humana mínima) e implementar o endpoint/worker mais simples que fecha o ciclo (B-1).
2. **(Decisão/handoff)** Registar retroativamente os gates ausentes no `HUMAN_DECISIONS_LOG.md` (P1-1) e dar o gate do **Frente A (M1 UX)** — mergear `feat/m1-frente-a-pleno` com PR revisado.
3. **(Segurança)** Registrar **CA-D-3** (P0-3) e aplicar P1-3.
4. **(Credencial)** Provisionar credencial Gmail/OAuth (HG-007), wirear o provider e a correlação de recebimento (B-2).
5. **(Operação)** Escrever o runbook de parada/rollback (B-4) e definir a coleta mínima de métricas (B-5).
6. **(Organizacional)** Confirmar o responsável humano no escritório piloto (B-6).
7. Rodar o **GO/NO-GO checklist final** (FACTORY_RUNBOOK padrão) antes de qualquer deploy.

---

## 18. GO/NO-GO

| Pergunta | Resposta |
|---|---|
| A. Podemos começar o piloto hoje? | **NÃO** (NO-GO) — porém a `main` está **estável** (CI verde; M0+B1) e a distância para GO é **delimitada e curta**. |
| B. Principal blocker | **B-1** — fluxo não se completa: resposta marca `recebido` e **nenhum caminho leva o item a `resolvido`**, então o ciclo não encerra no fluxo normal (criterio 1 + "encerramento do ciclo"). |
| C. Segundo maior blocker | **B-2** — canal real aprovado (Gmail API + OAuth, HG-008) **não executável**: provider `gmail` sem registro, recebedor sem correlação, sem credencial real (HG-007). |
| D. O que NÃO precisamos fazer antes do piloto | M2–M5; 2º Funcionário Digital; framework genérico de agentes; multi-canais (WhatsApp); ERP; microsserviços/K8s; LLM no caminho crítico; upload documental completo (POST_M1); dashboards sofisticados; dark mode; Issue #8 generalizada (outbox/SKIP LOCKED completo). |
| E. Próxima atividade recomendada | **Decisão do Owner sobre B-1** (regra de classificação) + **registro dos gates** (CA-D-3 e HG-UX-M0_ACCEPTANCE/HG-UX-M1/merge #98) e **gate do Frente A** — na ordem: governança 1º, depois implementação curta de B-1/B-5/B-2. |
| F. Menor conjunto para PILOT_READY | 3 itens técnicos (B-1, B-2, B-5) + 1 governance (B-3) + 1 doc operacional (B-4) + 1 organizacional (B-6) + merge Frente A (P1-2) + P1-3 (segurança headers/cookie) + registro P1-1. |

---

## IDENTIFICAÇÃO OBRIGATÓRIA

```text
Agent: opencode/big-pickle (auditoria read-only)
Model: opencode/big-pickle
Platform: OpenCode (CLI)
Date: 2026-09-12
Repository: rnsilveira22/servium-ia
HEAD: main = dfb75c0 (origin/main) — branch auditada: chore/factory-v2-reconciliation-2026-09 (38a59f6, docs)
Base branch: origin/main
```

*Nenhuma decisão foi criada; nenhum arquivo de produto/governança foi modificado nesta atividade; nenhuma aprovação foi inferida; conflitos documentados foram registrados sem resolução inventada.*
