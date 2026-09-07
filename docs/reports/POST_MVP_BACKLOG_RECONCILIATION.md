# POST-MVP Backlog Reconciliation

**Estado:** `PRE_PILOT_REMEDIATION_REQUIRED` — decisões do HUMAN GATE aprovadas em **2026-08-30** (§0). O estado **`PILOT_READY` anterior fica invalidado** e não será re-declarado até que os bloqueadores P0.1/P0.2/P0.3 sejam implementados, testados e aprovados por QA.

**Decisão humana (Q1–Q4): APROVADA** — classificações aceitas; Gmail API/OAuth confirmado como decisão humana; nova ordem de prioridade; versionamento autorizado (scope: reconciliação + decisões humanas + correção de drift documental, sem implementação de blockers neste PR).

**Arquitetura de testes (decidida, NÃO implementada):** piloto/produção = Gmail API + OAuth 2.0 · local/CI/E2E = Fake SMTP via **Mailpit** · ambos atrás da porta `CommunicationChannel` (ADR-008). Mailpit será tratado após o runtime operacional estar corretamente wireado (P0.1).

**Responsável pela auditoria/reconciliação:** plataforma **opencode**, modelo **`opencode/big-pickle`** · sessão 2026-08-30 · base `main` @ `e04d1e6` · origin `rnsilveira22/servium-ia` (leitura; sem alteração em Issues/Project Board/labels/milestones/commits de código).

**Método:** auditoria por evidências (ordem de confiança: código → testes → migrations → CI → PR mergeado → docs → comentários GitHub → status da Issue). Nenhuma afirmação usa o status do boneco "closed" como prova.

---

## 0. Decisões do HUMAN GATE — 2026-08-30 (aprovadas; decisor: Rodrigo/owner)

**Q1 — Classificações: APROVADO.**

- `#9` = **PRE_PILOT_BLOCKER**; `#20`, `#18`, `#17`, `#8` = **CLOSED_BUT_GAP_FOUND**;
- **GAP_RUNTIME do motor** (#15/#18) = **PRE_PILOT_BLOCKER crítico**;
- Não reabrir/alterar Issues indiscriminadamente sem primeiro propor a **rastreabilidade dos gaps** (matriz da §3, deep dive da §5 e itens da §9.2 fornecem a proposta).

**Q2 — Decisão de comunicação: CONFIRMADO (decisão humana).**

- **Gmail API + OAuth 2.0** adotado como canal real do piloto, substituindo para implementação a recomendação anterior **A (SMTP/IMAP) da SRV-10**;
- Formalizado em [`HUMAN_DECISIONS_LOG.md`](../factory/HUMAN_DECISIONS_LOG.md) (**HG-008**), preservando o histórico e explicando a divergência (ver §4, revisão da SRV-10, e §8.4).

**Q3 — Nova ordem de prioridade (substitui a Ordem recomendada original):**

| Prioridade | Escopo |
|---|---|
| **P0.1** | **Runtime operacional do Funcionário Digital**: corrigir GAP_RUNTIME (registrar/injetar handlers reais no worker; mecanismo de scheduler/tick; conectar motor ao `CommunicationChannel`; conectar **Gmail Adapter** ao fluxo real; resolver os gaps da #18 necessários à **correlação resposta↔item**; garantir `template`/`token_correlacao` quando exigidos pelo fluxo; **provar que o motor funciona fora dos testes**) |
| **P0.2** | **#9 Auditoria**: completar CA-03; implementar CA-04; completar CA-05; preservar CA-01/CA-02 já comprovados; **não duplicar implementação existente** |
| **P0.3** | **#20 Security hardening**: política adequada de senha; rate limiting; revisar credencial de serviço; materializar requisitos **ASVS** necessários ao piloto |
| Depois | Avaliar gaps menores **#17** e **#8**; executar **E2E/runtime**; **LOCAL_ACCEPTANCE** |

**PILOT_READY invalidado** → novo estado oficial: **`PRE_PILOT_REMEDIATION_REQUIRED`**. Não declarar novamente `PILOT_READY` até que os bloqueadores acima estejam implementados, testados e **aprovados pelo QA**.

**Q4 — Versionamento: AUTORIZADO.** Commit/PR exclusivamente de reconciliação, decisões humanas e correção de drift documental (preservando histórico quando apropriado). **NÃO iniciar implementação dos bloqueadores neste mesmo PR.** Após merge, STOP e retorno com proposta de **decomposição das histórias de `PRE_PILOT_REMEDIATION`**.

---

## 1. Resumo executivo

- **12 histórias funcionais fechadas** foram reconciliadas contra `main`. A esmagadora maioria tem implementação real, testes e CI verdes; **4 foram fechadas com lacunas** contra os próprios critérios de aceite (`CLOSED_BUT_GAP_FOUND`): **#20** (significativo), **#18** (material), **#17** e **#8** (menores).
- **Issue #9 (auditoria append-only) permanece aberta** e é o **único bloqueador formal do caminho crítico pré-piloto** (SRV-10 §7). Parte dos seus critérios já está materializada por emissões anteriores (CA-01/CA-02), parte está parcial (CA-03) e parte **não existe** (CA-04 query mínima; CA-05 doc explícito).
- **Risco pré-piloto número 1 não relacionado à #9:** o motor determinístico (#15) está implementado e testado, **mas não está wireado no runtime de produção** — `worker.mjs` registra zero handlers, não há scheduler e o canal Gmail (#18) não é injetado no motor. Em produção hoje, jobs enfileirados não são processados.
- **Decisão de comunicação divergiu da recomendação da SRV-10** (spike recomendou A = SMTP+IMAP infra própria; implementado = Gmail API + OAuth) e **não há registro no `HUMAN_DECISIONS_LOG`** — o único registro é o corpo do PR #34 ("aprovado pelo owner com ajuste da Recomendação A") com QA/PO comentados no PR, sem link lógico ao HG-006.
- **Drift documental amplo:** README, `AI_CONTEXT`, `FACTORY_STATUS`, `SOFTWARE_FACTORY_REPORT`, `GITHUB_INTEGRATION_REPORT`, `BACKLOG_OVERVIEW`, `MVP_01_REPLAN_REPORT` narram o projeto como "discovery/documental/ADRs Proposed/sem código" — contradiz 1+ semana de merges.
- **Sem alteração executada em GitHub**: este relatório é só leitura. Pendências humanas listadas na §9.

---

## 2. Escopo e limitações

- Auditado: código em `main`, `packages/db/tests`, `apps/api/test`, `apps/e2e`, migrations `0001–0009`, workflows CI/E2E, 29 PRs merged (astração Issue↔PR↔commit), 16 Issues (1 aberta), docs (`docs/**`, README, MONOREPO).
- **E2E/Selenium é evidência complementar**, não prova: cobre login/navegação/auth/health/responsividade/perms — **não** prova o ciclo do motor em runtime, nem Gmail real, nem imutabilidade por fluxo de UI.
- Não executado: alterar Issues/board/labels/milestones, fechar/reabrir, commits/push, decisões de negócio.
- **Limitação de acesso:** token GitHub sem escopo Projects V2 → `PROJECT_BOARD_READ_BLOCKED_BY_TOKEN_SCOPE` (campos QA/PO do board não consolidáveis; usou-se comentários nos PRs).

---

## 3. Matriz mestra — Issue × evidência × classificação

Legenda classificação: **CLOSED_CONSISTENT** = fecha corretamente; **CLOSED_BUT_GAP_FOUND** = fechada porém lacuna vs critérios; **OPEN**.

### 3.1 Ondas 0–1 · caminho funcional

| Issue | Título | PR (merge SHA, data) | Implementação em `main` | Testes (prova) | Classificação | Observação |
|---|---|---|---|---|---|---|
| **#3** | skeleton monorepo TS (SRV-3) | #12 `26b0db5` (08-22) | workspaces `apps/*`,`packages/*`; `package.json`, `tsconfig.base.json` | `app.controller.spec.ts` | `CLOSED_CONSISTENT` | — |
| **#4** | CI evoluído (SRV-4) | #14 `dfed2eb` (08-23) | `.github/workflows/ci.yml`: lint+build+typecheck+test+Postgres service | CI verde em todos os PRs subsequentes | `CLOSED_CONSISTENT` | `npm run test` raiz cobre `@servium/db` → **testes RLS rodam no CI** |
| **#5** | ambiente local Postgres (SRV-5) | #21 `106ed9e` (08-23) | `docker-compose.yml` + `scripts/seed.mjs` idempotente | E2E/local `db:up`→migrate→seed | `CLOSED_CONSISTENT` | seed só cria tenant+operadores (sem dados de negócio) |
| **#6** | modelo de dados + migrations (SRV-6) | #25 `7d5c4ae` (08-23) | migrations `0001`,`0002` (13 tabelas base); runner `packages/db/scripts/migrate.mjs` (transacional, idempotente); `tenant_id NOT NULL` em toda tabela | `schema.test.ts`; migração em banco limpo provada no E2E CI e localmente | `CLOSED_CONSISTENT` | CA-01/CA-02/CA-03/CA-04 satisfeitos; CA-05 = documentação de execução existe (SRV-10 §4.1, MONOREPO, E2E report) |
| **#7** | isolamento multi-tenant RLS (SRV-7) | #27 `6bda68b` (08-24) | migration `0003`: role `servium_app` (no-bypass/no-super), `ENABLE+FORCE RLS`, policy `tenant_isolation` keyed em `app.tenant_id` em **todas** as 16 tabelas de negócio; `REVOKE UPDATE/DELETE` em `eventos_auditoria` | `rls-suite.test.ts`: catálogo RLS+FORCE+policy; sem bypass; `tenant_id NOT NULL`; matriz vazamento LEITURA/ESCRITA/REMOÇÃO cruzada; contexto ausente/vazio/inválido=deny | `CLOSED_CONSISTENT` | CA-04 (deny sem contexto) e CA-03 (falha build no CI) provados; CA-05 evidência ADR-005 = suíte no PR #27 + relatos |
| **#8** | jobs SKIP LOCKED + retry/idempotência (SRV-8 subset) | #30 `d9e7379` (08-24) | `queue.ts` (`claimJobs` `FOR UPDATE SKIP LOCKED`, backoff `2^t×5s`, teto `max_tentativas`, estado terminal `falha`, `reapStuck` 15min); `worker.mjs` (poll 2s, batch 10); `jobs_fila` UNIQUE(tenant,idempotency) | `queue.test.ts`: **concorrência real 2 claimants lotes disjuntos**; backoff→falha; dedup; entre-tenants | `CLOSED_BUT_GAP_FOUND` *(menor)* | **CA-06 (sinal de fila crescente observável) não instrumentado** — só log por job (`worker.mjs:14-16,44,47`); sem métrica de backlog. Outbox **ADIADA e documentada** (INITIAL_BACKLOG §Onda1, ADR-006, issue #8) — CA-05 OK |
| **#10** | Spike SRV-10 (vertical slice MVP-01) | #22 `848f419` (08-23) | `docs/factory/spikes/SRV-10-mvp01-slice.md`: 8 respostas + comparativo A/B/C | — (entregável doc) | `CLOSED_CONSISTENT` *(com hiato rastreável)* | DoD preenchido; **implementação posterior divergiu da recomendação (Gmail API vs A/SMTP+IMAP)** sem registro no log de decisões (§5.4) |
| **#15** | motor determinístico (SRV-15) | #32 `4a15015` (08-25) | `motor/engine.ts` (puras, relógio injetado, `TRANSICOES`, limites config); `motor/handlers.ts` (ativar/cobrar/tick/encerrar, auditoria, idempotência por `chaveCobranca`); `motor/channel.ts` (porta ADR-008) | `motor.test.ts`: **relógio fake** (`:109-136` horário/frequência/limite), limite→exceção (`:174-185`), tick repetido não duplica (`:166-172`) | `CLOSED_CONSISTENT` (CAs 01–06) **+ GAP_RUNTIME** | **CA-03 (fora de horário é determinístico)** e CA-06 (encerrar) OK; **runtime NÃO wireado**: `worker.mjs:12` mapa de handlers vazio, sem scheduler, canal Gmail não injetado (§7) |
| **#16** | cadastro mínimo (SRV-16) | #31 `9ca83b1` (08-24) | `cadastro/cadastro.controller.ts` (clientes/obrigações/checklist-templates, validações, RBAC, auditoria com `operador_id`); transaction p/ template | `cadastro.test.ts`: fluxo feliz, 400, **isolamento cross-tenant (cliente/template invisível entre tenants)**, rollback atômico template, auditoria | `CLOSED_CONSISTENT` | CA-01→CA-05 cobertos; "itens" não têm rota isolada (criados via template) — coerente com recorte |
| **#17** | fila de exceções + intervenção (SRV-17) | #33 `c7fad11` (08-25) | `cadastro/ciclos.controller.ts` (`GET /ciclos/:id/excecoes`; `decidir` e `reenviar` **admin-only**; auditoria com `operador_id`; `reenviar` transacional; volta a `aguardando`) | `excecoes.test.ts`: listar abertas, **operador recebe 403 para decidir**, decidir+auditoria, reenviar+auditoria | `CLOSED_BUT_GAP_FOUND` *(menor)* | **CA-02**: listagem é **por ciclo**, não global por tenant (`ciclos.controller.ts:61-80`). Motor só "decide" escalar, nunca cancela → CA-04 satisfeito por design |
| **#18** | comunicação real bidirecional (SRV-18) | #34 `c7f4060` (08-25) | `gmail-adapter.ts` (OAuth2, retry 429/5xx, auto-refresh, `receber()` polling, idempotência message_id); `email.controller` (authorize/callback/tokens, admin); migrations `0006–0009` (gmail_tokens/mensagens_gmail + RLS) | `gmail.test.ts` (**sem Google real**, fakes; dedup message_id) | `CLOSED_BUT_GAP_FOUND` *(material)* | **CA-02 não implementado**: `receber()` lê `X-Correlation-Token` mas **não vincula à solicitação original** (não grava em `mensagens_comunicacao.token_correlacao`/`item_ciclo_id`; `mensagens_gmail` não tem essas colunas). **CA-01**: `template`/`token_correlacao` nunca populados (`handlers.ts:171-182`). **CA-05**: fallback manual explícito não codificado. **Gmail NÃO é wireado ao motor** (§7) |
| **#20** | autenticação mínima (SRV-20) | #28 `8c6d225` (08-24) | `auth/auth.controller.ts` (argon2id via `@node-rs/argon2`, cookie `sid` HttpOnly+SameSite=Lax, logout revoga `sessoes.revogado_em`, anti-enumeration ASVS V2.5, token 256-bit CSPRNG V3.1); `auth.guard.ts` (RBAC admin/operador, `expira_em > now()`); migration `0004` (sessoes, token_hash sha256) | `auth.test.ts`: hash/verify, cookie flags, RBAC 403, logout→401, auditoria | `CLOSED_BUT_GAP_FOUND` *(significativo — 4 CAs)* | **CA-01 senha fraca: SEM política mínima em código/teste** (seed usa `admin123`). **CA-04 rate-limit login: NÃO implementado** (sem throttler; só planejado — INITIAL_BACKLOG Onda 2.1, SRV-10 §4.2). **CA-05 credencial de serviço FD: NÃO existe** (workaround: fila + contexto tenant; `actor_type='servico'` nunca emitido). **CA-07 checklist OWASP ASVS: NÃO materializado** (só referências). Expiração implementada mas não testada |

### 3.2 Ondas posteriores · QA e operação

| Issue | Título | PR (merge SHA) | Evidência | Classificação |
|---|---|---|---|---|
| **#36** | QA corrective gate (falso positivo UI_PILOT_READY) | #37 `132979c` (08-25) | fix web+api (CSS/runbook/seed) + `docs/reports/QA_CORRECTIVE_GATE_REPORT.md` | `CLOSED_CONSISTENT` |
| **#39** | Demo Factory v1 (EPIC-013) | #40 `17e838a` (08-27, docs) | planejamento registrado no backlog; roadmap mantém **EPIC-013 BLOCKED** (estabilidade + gate humano) | `CLOSED_CONSISTENT` *(fechada por documentação; épico permanece bloqueado por design* `HUMAN_GATE_DEMO_FACTORY`*)* |
| **#42** | CI E2E no GitHub Actions | #43 `e04d1e6` (08-30) | `.github/workflows/e2e.yml` + `run-e2e.sh`; runs 33323875084 (PR) e 33324884924 (push main) **29/29** | `CLOSED_CONSISTENT` |
| *(PR reflexo)* | Suíte Selenium E2E básica (PR #41 → `02b4213`, 08-30) | — | 29 testes / 6 arquivos em `apps/e2e`; local 29/29 banco limpo | — (sem Issue) |

### 3.3 Outras Issues fechadas (contexto histórico)

- **#2** (Software Factory V1) → PR #11/#2 (HG-001) · **#3/#4/#5** nas 3.1 · **#11/#13/#19/#22/#23/#24/#26/#29** = PRs de governança/backlog/CI (SRV-2 não existe como issue; correspondem a docs/regras já vigentes).

---

## 4. Matriz SRV-10 — dependências e saída do spike

Fonte-saída: `docs/factory/spikes/SRV-10-mvp01-slice.md` (fechou #10; alvo de HG-005; PO accepted).

| Dependência declarada na Issue | Estado real | Veredito |
|---|---|---|
| **#16** dependia de #6/#7/#10 | implementada pós-spike (PR #31); entidades finais = recorte spike (12 tabelas, hoje 16) | ✓ satisfeita (texto DoR "pendente" ficou obsoleto no corpo da Issue — drift administrativo) |
| **#15** dependia de #6/#7/#8(subset) + confirmação Senior | implementada usando `queue.ts` (#30) e RLS (#7) | ✓ satisfeita; DoR "pendente" obsoleto na Issue |
| **#17** dependia de #15 + **#9** | motor produz exceções; **#9 continua aberta** → dependência de trilha NÃO concluída (mitigada apenas parcialmente pelos eventos que o próprio motor escreve) | ⚠ parcial — dependência pendente = #9 |
| **#18** dependia de SRV-10 + HG-006 se provedor | saída existe (recomendação A); **implementação = Gmail API (provedor)**; PR #34 alega "aprovado pelo owner com ajuste" e diz HG-006 desnecessário "por custo"; **sem registro no `HUMAN_DECISIONS_LOG`** | ⚠ decisão concreta registrada apenas em PR body/comentários; sequência "validação antes de iniciar" (comentário da PO na #18, 08-23) **não estrita**: implementação antecedeu a validação registrada |
| **#20** dependia de #6/#7 | implementada (tags da SRV-10 §4.2) | ✓ satisfeita (com gaps §3.1) |
| 8 respostas do spike + comparativo A/B/C | presentes no doc (às 8 seções) | ✓ |
| Human gates previstos (§8): gate do piloto; HG-006; merges Level 3 | gate do piloto ainda pendente (correto); HG-006 em zona cinza; merges: os 2 últimos (#41/#43) autônomo com aprovação humana explícita | ✓ parcial |

**Conclusão SRV-10:** o *entregável do spike* está completo; **a aderência*r da implementação** ao plano é o ponto de atenção (comunicação + wiring runtime), não a existência do spike.

---

## 5. Deep dive — Issue #9 (auditoria append-only) — `PRE_PILOT_BLOCKER`

**Issue aberta** (`type:story, priority:p0, agent:pleno`), sem comentários. Critérios × evidência:

| CA | Critério | Situação | Evidência |
|---|---|---|---|
| **CA-01** | append-only: UPDATE/DELETE tecnicamente impedidos (permissões/triggers) + tentativa falha coberta por teste | **SATISFIED** (por emissões anteriores) | migration `0003_rls_security.sql:44` `REVOKE UPDATE, DELETE ON eventos_auditoria FROM servium_app`; `packages/db/tests/audit.test.ts:30-36` prova UPDATE e DELETE rejeitados (`/permission denied/i`) e INSERT ok |
| **CA-02** | campos: ator, ação, timestamp, tenant, payload, versão/prompts quando aplicável | **SATISFIED** (schema) | `0002_business.sql:120-130`: `tenant_id, actor_type (sistema/operador/servico), actor_id, entidade, entidade_id, acao, detalhes jsonb, criado_em`; versão/prompts → `detalhes` (sem LLM no caminho crítico, ADR-010 → "quando aplicável" não ocorre hoje) |
| **CA-03** | eventos acoplados ao estado de negócio na mesma transação (ou mecanismo alternativo documentado) | **PARTIAL** | **Atômico**: `cobrarItem` BEGIN/COMMIT cobre UPDATE item + INSERT `mensagens_comunicacao` + auditoria (`handlers.ts:159-184`); `reenviarItem` idem (`ciclos.controller.ts:120-142`). **Não atômico (autocommit)**: `ativarCiclo` (`handlers.ts:62-67`), `escalar` (`handlers.ts:120-131`), `decidirItem` (`ciclos.controller.ts:90-105`) — evento pode divergir do estado em caso de falha parcial |
| **CA-04** | consulta mínima por entidade/tenant (query testada OU endpoint interno) | **NOT SATISFIED** | nenhum read de `eventos_auditoria` em runtime (grep: só testes/fixtures e INSERTs). Sem endpoint `/auditoria` real (a UI expõe "Métricas + health"; `QA_CORRECTIVE_GATE_REPORT.md:123`) |
| **CA-05** | documentação do que é auditável hoje | **PARTIAL** | mecanismo descrito em ADRV-002/FR-013/NFR-006/ADR-004/009/010, `SRV-10 §2`, `MVP_01_VERTICAL_SLICE.md:74-76`; **ausente** uma doc corrente "o que é auditável hoje" (eventos emitidos hoje: `ativar`, `decidir`, `reenviar`, `cobrar`, `escalar`, `decisao`, `encerrar`, `login_sucesso/falha`, `logout`, `ativacao_sem_template`) |

**Classificação:** `OPEN` — **ítem restante do caminho crítico SRV-10 §7 (#9 → PILOT_READY)**. Recomenda-se **não fechar/reabrir**: refinar a Issue para o escopo restante (CA-04 + CA-03 hardening + CA-05 doc) e registrar que CA-01/CA-02 já estão satisfeitos por emissões anteriores (rastreabilidade via #25/#27).

---

## 6. Matriz pré-piloto (SRV-10 §7) + GAP_RUNTIME

Cadeia do spike: `#5 ∥ #10 → #6 → #7 ∥ N5(#20) ∥ #16 → #8s ∥ #15 → #17 ∥ #18 → #9 → PILOT_READY`.

| Passo | Estado | Nota |
|---|---|---|
| #5, #10, #6, #7 | ✅ | consistente |
| #20 (N5) | ✅ *(com gaps)* | rate-limit + senha fraca + credencial serviço + ASVS pendentes |
| #16 | ✅ | consistente |
| #8(subset) | ✅ *(CA-06 gap)* | backlog metric ausente |
| #15 | ✅ CAs *(GAP_RUNTIME)* | **runtime não wireado** |
| #17 | ✅ *(CA-02 por ciclo)* | listagem global a confirmar c/ PO |
| #18 | ✅ *(CA-02 não implementado; não wireado)* | adapter existe, vínculo resposta↔item ausente |
| **#9** | ❌ **BLOQUEADOR** | CA-04 ausente; CA-03/CA-05 parciais |
| **GAP_RUNTIME do motor** | ❌ | ver abaixo |
| Gate humano do piloto | ⏸ | pendente por design |

**GAP_RUNTIME do motor (#15/#18) — evidência:**

- `packages/db/scripts/worker.mjs:11-12` → `const handlers = new Map();` — **nenhum handler** cadastrado; em produção todo job falharia com "sem handler para tipo=…" (`:41`). Os handlers do motor só são exercidos nos testes (`motor.test.ts:21-46` `rodarJobs()`).
- **Sem scheduler**: nenhum `cron`/`setInterval` em `apps/api` (health/metrics/news). O único trigger é ativação HTTP + self-chaining (`handlers.ts:69`) — sem algo disparando o primeiro tick periódico, nenhum ciclo avança sozinho.
- **Canal Gmail não injetado**: `registrarMotorHandlers` recebe `MotorDeps.channel` (`handlers.ts:249-255`) mas nenhum provider de produção o instancia com `GmailAdapter`; os testes usam `FakeChannel`.

**Impacto:** o motor está *provado por testes*, porém **não executa no ambiente de produção atual**. Para `PILOT_READY` é necessário wire: (1) handler map no worker (importando `registrarMotorHandlers` do motor), (2) canal real injectado, (3) scheduler/tick inicial e auto-reativação.

---

## 7. Drift documental — síntese (gerado por varredura de 60 arquivos .md)

| Arquivo | Linha | Texto divergente |
|---|---|---|
| `README.md` | 5,7,81,104,116 | "Status: Discovery do MVP"; "não há produto…funcionalidades"; "Nenhuma arquitetura definitiva"; "repositório exclusivamente documental" |
| `docs/AI_CONTEXT.md` | 19 | "**Não há código de produto.**" |
| `docs/factory/SOFTWARE_FACTORY_REPORT.md` | 17-19,199,240 | stack "Nenhuma"; ADRs "Proposed"; "repositório documental" |
| `docs/factory/GITHUB_INTEGRATION_REPORT.md` | 150,156,160 | ADRs todos "Proposed"; "commit pendente de push" |
| `docs/factory/FACTORY_STATUS.md` | 17,33,46-57,76,81 | snapshot 08-23 (main `26b0db5`); #8/#15/#16/#17/#18 marcadas Backlog (hoje merged); #9 "Ready" (mantém-se correta); HG-006 "provável pós-SRV-10" |
| `docs/product/MVP_01_REPLAN_REPORT.md` | 44-47,78,94,100 | N1–N4 "Backlog (refinar pós-spike)"; "PENDING_SPIKE"; HG-006 |
| `docs/product/BACKLOG_OVERVIEW.md` | 4,13-21 | épicos "Pendente"/"Fase 002"; EPIC-013 BLOCKED OK |
| `docs/product/MVP_01_VERTICAL_SLICE.md` | 72 | "e-mail transacional via SMTP configurado pelo escritório" → implementado Gmail API |
| `docs/factory/spikes/SRV-10-mvp01-slice.md` | 92,114 | recomendação A (SMTP+IMAP) e "HG-006 evitado" → implementação divergiu |
| `docs/product/OPERATIONAL_FLOW.md` | 31-42 | máquina conceitual `EmValidacao/Escalado` vs CHECK real `recebido/excecao` (`0002:69-70`); versão coerente = SRV-10 §2 |
| `docs/product/NON_FUNCTIONAL_REQUIREMENTS.md` | 6,46,98,116,124,142 | marcadores "TBD (Fase 003 / baseline)" |
| `docs/factory/templates/QA_REVIEW_TEMPLATE.md` | — | links p/ `docs/factory/qa/` inexistente (reviews em `docs/reports/`) |

Alvo mais impactante para corrigir antes do piloto: **README, AI_CONTEXT, FACTORY_STATUS, MVP_01_REPLAN_REPORT** (risco de leitura errada por humanos/agentes). Demais pontos em `SUCCESS_METRICS`/`roadmap` são "TBD deliberado" e permanecem verdadeiros.

---

## 8. Riscos descobertos (ordem de prioridade)

1. **Motor sem wire em runtime** (§6) — piloto real bloquearia sem isso.
2. **#20**: rate-limit de login e política de senha fraca ausentes (segurança real no piloto); credencial de serviço do FD inexistente.
3. **#18 CA-02**: comunicação "cliente→sistema vinculada à solicitação" não fecha; duas ledgers (`mensagens_comunicacao` vs `mensagens_gmail`) desconexas; `template`/`token_correlacao` nunca populados — envio real Gmail não provado de ponta a ponta (testes com fake, sem Google real).
4. **Rastreabilidade da decisão de comunicação** (Gmail vs spike A) sem registro formal no `HUMAN_DECISIONS_LOG`/HG-006.
5. **#9 CA-04/CA-03** — trilha sem consulta mínima e com alguns eventos fora de transação (atual "auditabilidade" incompleta).
6. **Drift documental** (§7) — risco de leitura incorreta de estado por humanos/agentes/QA.
7. `PROJECT_BOARD_READ_BLOCKED_BY_TOKEN_SCOPE` — campos QA/PO do board não conferíveis (mitigado por comentários em PR).
8. Menores: #17 listagem por ciclo; #8 CA-06 sem métrica; auth `actor_type='servico'` nunca emitido.

---

## 9. Recomendações e decisões humanas solicitadas

### 9.1 Bloqueantes pré-piloto (sugestão de sequência)

1. **Implementar #9 refinada** (CA-04: endpoint/query mínima por entidade+tenant testado; CA-03: wrappers de transação nos caminhos não atômicos; CA-05: doc "o que é auditável hoje"; registrar CA-01/CA-02 como pré-satisfeitos). *(continued in §10)*
2. **Wire de runtime do motor**: handlers no `worker.mjs`, canal real injetado, scheduler de abertura (tick) — + teste E2E de ciclo completo em runtime.
3. **#20**: rate-limit de login + política de senha mínima (mínimo para piloto) — ou aceite explícito humano de adiar.

### 9.2 Ações administrativas / governança

1. Registrar **retroativamente a decisão Gmail/OAuth** no `docs/factory/HUMAN_DECISIONS_LOG.md` (aprovação owner + HG-006 não acionado por ausência de custo) — fechar a faixa de rastreabilidade. ✅ executado nesta sessão (HG-008).
2. Atualizar docs obsoletos (§7): README, `AI_CONTEXT`, `FACTORY_STATUS`, `MVP_01_REPLAN_REPORT`, `BACKLOG_OVERVIEW`, `SOFTWARE_FACTORY_REPORT`/`GITHUB_INTEGRATION_REPORT`, `OPERATIONAL_FLOW` máquina, e link de QA template. ✅ executado nesta sessão.
3. Alinhar corpo das Issues fechadas (#15/#16/#17/#18 DoR "pendente") — **sem reabrir**, apenas anexo de nota (opcional, sob aprovação humana).

### 9.3 Confirmar com PO/QA

1. **#17**: a listagem por ciclo satisfaz o CA-02 ou criar história de "exceções abertas por tenant" (listagem global)?
2. **#18 CA-02**: aceitar como "demonstrável em ambiente controlado" (aceite PO registrado) ou abrir história de vínculo resposta↔item (recomenda-se: abrir, é o núcleo do bidirecional)?
3. **#8 CA-06**: aceitar log-consultável ou adicionar métrica de profundidade da fila?

### 9.4 Perguntas diretas ao humano (este relatório) — RESPONDIDAS (HUMAN GATE · 2026-08-30)

> Estado consolidado na **§0**. As quatro perguntas foram respondidas por decisão humana (Q1–Q4); este relatório, o log de decisões (HG-008) e a correção de drift documental são o conteúdo do PR de documentação/governança autorizado. A **decomposição das histórias** de `PRE_PILOT_REMEDIATION` (P0.1/P0.2/P0.3) é a proposta a entregar **após o merge**, na etapa STOP definida pela decisão Q4.

---

## 10. Detalhamento operacional do refinamento sugerido da Issue #9

*(lote de trabalho recomendado; NÃO executado nesta execução)*

1. **CA-04**: implementar query utilitária testada (`packages/db/src/audit.ts`) — `listarEventosEntidade(tenant, entidade, entidadeId)` retornando eventos ordenados, ou endpoint interno mínimo `GET /auditoria?entidade=&entidade_id=` com RBAC admin, + teste de integração.
2. **CA-03**: garantir transação explícita para `ativarCiclo`, `escalar` (UPDATE estado + INSERT exceção + auditoria), `decidirItem` (UPDATE item + UPDATE exceção + auditoria), e `tickCiclos` encerramento — alinhadas ao padrão já usado em `cobrarItem`.
3. **CA-05**: doc `docs/audit/` ou seção em `docs/architecture` listando eventos emitidos hoje + mecanismo append-only + política de retenção (pendenciada jurídica — NFR retenção), com tabela de eventos atuais.
4. **CA-02**: adicionar campos `versao_prompt`/`versao_modelo` em `detalhes` quando (futuro) houver LLM — hoje sem aplicabilidade (ADR-010).
5. Registrar na Issue (comentário) a rastreabilidade: CA-01 coberto por `0003`+`audit.test.ts` (PRs #25/#27); CA-02 por `0002` — evitando retrabalho.

---

## 11. Evidências anexas (referências-chave)

- PRs merged: `#12 26b0db5` · `#14 dfed2eb` · `#21 106ed9e` · `#25 7d5c4ae` · `#27 6bda68b` · `#28 8c6d225` · `#30 d9e7379` · `#31 9ca83b1` · `#32 4a15015` · `#33 c7fad11` · `#34 c7f4060` · `#35 5626dd9` · `#37 132979c` · `#40 17e838a` · `#41 02b4213` · `#43 e04d1e6` (todos `rnsilveira22/servium-ia`).
- Migrations: `packages/db/migrations/0001…0009`.
- Testes: `packages/db/tests/{schema,rls-suite,rls,audit,queue}.test.ts` · `apps/api/test/{auth,cadastro,excecoes,motor,gmail,observability}.test.ts` · `apps/e2e` 29/29.
- CI: `.github/workflows/{ci,docs-ci,e2e}.yml`; runs E2E `33323875084`, `33324884924`.
- Docs: SRV-10 §4.1/§4.3/§7 · `OPERATIONAL_FLOW.md` · `INITIAL_BACKLOG.md` · `QUALITY_GATES.md` · `GITHUB_WORKFLOW.md` · `HUMAN_DECISIONS_LOG.md` · `HUMAN_GATES.md` · `ADR-004/005/006/008/009/010`.

*Gerado por auditoria de reconciliação (leitura). Nenhuma mudança em Issues/board/labels/milestones; nenhum commit.*
