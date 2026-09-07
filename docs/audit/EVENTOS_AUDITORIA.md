# Mecanismo de auditoria do piloto — Eventos, RLS e evidências

> **Issue:** [#53 — PRM-P0.2-C](https://github.com/rnsilveira22/servium/issues/53) · **Rastreio:** [#9](https://github.com/rnsilveira22/servium/issues/9) CA-05 (auditoria append-only)
> **Base:** `main@150188f` · **Tipo:** DOC-only — nenhuma alteração de código, migration, trigger ou backfill
> **Referentes de implementação:** [#51](https://github.com/rnsilveira22/servium/issues/51) (PRM-P0.2-A · leitura) e [#52](https://github.com/rnsilveira22/servium/issues/52) (PRM-P0.2-B · atomicidade), ambos mergeados antes desta base.

Este documento é a referência do que **é auditável hoje** no ServiumAI: a tabela `eventos_auditoria`, os 17 eventos emitidos pelos caminhos atuais, o mecanismo append-only, a delegação de isolamento ao RLS, as leituras disponíveis (PRM-P0.2-A) e a política de retenção (**DEFERIDA** via HG-RETENÇÃO).

## 1. Objetivo e escopo

### Escopo IN

- Inventário exaustivo dos eventos emitidos hoje, com o sítio de emissão no código (arquivo:função) e conferidos por `grep` contra `main@150188f`.
- Mecanismo de gravação: append-only via `REVOKE`, isolamento por RLS `tenant_isolation`, índice de leitura, convenção `actor_type`.
- Leituras disponíveis: `GET /auditoria` (admin-only) e `listarEventos` com paginação keyset.
- Política de retenção registrada como **DEFERIDA** (HG-RETENÇÃO) — sem prazo numérico.
- Mapa de evidências (testes) que provam CA-01/CA-02/CA-03/CA-04 — cobre o CA-05-3 da Issue #53.

### Escopo OUT (explícito)

- **Purge/limpeza** de `eventos_auditoria`: não implementado; condicionado a HG-RETENÇÃO (ver §6).
- **Export/reconstrução** de trilha: fora desta entrega.
- **UI de auditoria** (SPA): fora; hoje existe apenas a rota de navegação `/auditoria` no frontend (`apps/e2e/src/tests/navigation.test.ts:77`), consumindo dados via API.
- Qualquer mudança de schema, trigger, backfill ou correção de código: **não faz parte desta entrega**.

## 2. Mecanismo

### 2.1 Tabela

`eventos_auditoria` ([`packages/db/migrations/0002_business.sql:120-130`](../../packages/db/migrations/0002_business.sql)):

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | `uuid PK` | gerado por `gen_random_uuid()` |
| `tenant_id` | `uuid NOT NULL` | `REFERENCES tenants(id)`; base do RLS |
| `actor_type` | `text NOT NULL` | `CHECK (actor_type IN ('sistema','operador','servico'))` |
| `actor_id` | `uuid` | `NULL` para `sistema`; `operador` idem; `servico` reservado (PRM-P0.3-C) |
| `entidade` | `text NOT NULL` | ex.: `ciclo`, `item_ciclo`, `auth`, `cliente`... |
| `entidade_id` | `uuid NOT NULL` | chave da entidade auditada |
| `acao` | `text NOT NULL` | ver inventário §3 |
| `detalhes` | `jsonb` | payload relevante; nunca regista segredos |
| `criado_em` | `timestamptz NOT NULL` | `DEFAULT now()` |

### 2.2 Append-only

[`packages/db/migrations/0003_rls_security.sql:44`](../../packages/db/migrations/0003_rls_security.sql), uma linha após o `GRANT` genérico:

```sql
REVOKE UPDATE, DELETE ON eventos_auditoria FROM servium_app;
```

A role `servium_app` (única usada pela aplicação) pode **somente INSERT e SELECT** em `eventos_auditoria`. Tentativa de `UPDATE`/`DELETE` falha com `permission denied` — provado em [`packages/db/tests/audit.test.ts:14-39`](../../packages/db/tests/audit.test.ts) (CA-01).

### 2.3 RLS — isolamento por tenant

A política `tenant_isolation` é criada via loop em [`0003_rls_security.sql:31-35`](../../packages/db/migrations/0003_rls_security.sql) para `eventos_auditoria` (e demais tabelas de negócio) com:

```sql
ALTER TABLE eventos_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_auditoria FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON eventos_auditoria
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

Consequências: (1) escrita sem `app.tenant_id` contextualizado é rejeitada pelo `WITH CHECK`; (2) leitura sem contexto retorna 0 linhas (deny-by-default); (3) a leitura da trilha **não filtra por tenant_id no SQL** — o isolamento é exclusivamente do RLS (ver §5). Aplicado após **#51** e **#52**, que corrigiram leitura e transações.

### 2.4 Índice de leitura

[`packages/db/migrations/0002_business.sql:156`](../../packages/db/migrations/0002_business.sql):

```sql
CREATE INDEX idx_eventos_tenant_criado ON eventos_auditoria(tenant_id, criado_em DESC);
```

Sustenta o keyset `(criado_em DESC, id DESC)` usado por `listarEventos` (§5). Filtros por `entidade`/`acao`/`entidade_id` fora do índice fazem seq scan aceitável no piloto (documentado em [`packages/db/src/audit.ts:47-53`](../../packages/db/src/audit.ts)).

### 2.5 Convenção `actor_type`

| Valor | Quem emite hoje | `actor_id` | Previsto para |
|---|---|---|---|
| `sistema` | motor (`handlers.ts`) e runtime de recebimento (`recebimento.ts`) | `NULL` | infra/processamento automático |
| `operador` | auth, cadastro, ciclos (ativar/decidir/reenviar) | UUID do operador autenticado | ações humanas |
| `servico` | — (nenhum emissor hoje) | — | [PRM-P0.3-C](../reports/PRE_PILOT_REMEDIATION_PLAN.md) — identidade de serviço do Funcionário Digital |

O valor `servico` já é aceito pelo `CHECK` do schema (`0002:123`) e previsto pelo DTO ([`packages/db/src/audit.ts:33-42`](../../packages/db/src/audit.ts)), mas **não é emitido por nenhum caminho** em `main@150188f` — em [PRM-P0.3-C](../reports/PRE_PILOT_REMEDIATION_PLAN.md) o worker passará a gravar com identidade de serviço estável.

## 3. Inventário de eventos (17 ações)

> Conferido por `grep -rn "INSERT INTO eventos_auditoria" apps packages` em `main@150188f`: **6 arquivos de produção** com 8 pontos de escrita (helper `auditar` em `auth` tem dois métodos; `ciclos.controller.ts` tem dois pontos). As 15 ações abaixo correspondem 1:1 a linhas de código reais; `ativar` e `encerrar` têm **dois sítios de emissão** cada. **Leitura NÃO gera evento.**

| Evento (`acao`) | Fonte (arquivo:função) | Quando | Payload/detalhes-chave | Ator |
|---|---|---|---|---|
| `ativar` | [HTTP] `apps/api/src/cadastro/ciclos.controller.ts:40` (`CiclosController.ativar`) | `POST /ciclos` com `obrigacao_id` existente no tenant | `{ obrigacao_id }`; `entidade=ciclo` | `operador` |
| `ativar` | [Motor] `apps/api/src/motor/handlers.ts:69` (`ativarCiclo`) | job `ciclo.ativar`, ciclo aberto com template, ainda sem itens (idempotente) | `{}`; `entidade=ciclo` | `sistema` |
| `ativacao_sem_template` | `apps/api/src/motor/handlers.ts:56` (`ativarCiclo`) | job `ciclo.ativar`, obrigação **sem** `template_id` | `{}`; `entidade=ciclo` | `sistema` |
| `decisao` | `apps/api/src/motor/handlers.ts:120` (`cobrarItem`) | decisão do motor = `nada`/`aguardar` (fora de janela/frequência) | `{ acao, motivo }`; `entidade=item_ciclo` | `sistema` |
| `escalar` | `apps/api/src/motor/handlers.ts:143` (`cobrarItem`) | decisão = `escalar` (limite social esgotado), transição `aguardando→excecao` | `{ motivo }`; `entidade=item_ciclo` | `sistema` |
| `cobrar` | `apps/api/src/motor/handlers.ts:206` (`cobrarItem`) | decisão = `cobrar`; envio pelo canal OK; item `→aguardando` | `{ rodada }`; `entidade=item_ciclo` | `sistema` |
| `encerrar` | `apps/api/src/motor/handlers.ts:251` (`tickCiclos`) | tick com `ciclo_id`, sem itens elegíveis, todos os itens em estado final | `{}`; `entidade=ciclo` | `sistema` |
| `encerrar` | `apps/api/src/motor/handlers.ts:278` (`encerrarCiclo`) | job `ciclo.encerrar`, zero itens não-finais | `{}`; `entidade=ciclo` | `sistema` |
| `decidir` | `apps/api/src/cadastro/decidir-item.ts:36` (`decidirItem`) | `POST ciclos/itens/:id/decidir` (admin) com desfecho `resolvido`/`cancelado` | `{ desfecho }`; `entidade=item_ciclo` | `operador` |
| `reenviar` | `apps/api/src/cadastro/ciclos.controller.ts:199` (`CiclosController.reenviarItem`) | `POST ciclos/itens/:id/reenviar` (admin), item em `excecao` | `'{}'::jsonb`; `entidade=item_ciclo` | `operador` |
| `receber` | `apps/api/src/runtime/recebimento.ts:159` (`vincularResposta`, insert via helper `:111`) | poller correlaciona resposta com token `t:<item>:r<rodada>`; item `aguardando→recebido` (idempotente por `message_id`) | `{ rodada, token, message_id }`; `entidade=item_ciclo` | `sistema` |
| `login_sucesso` | `apps/api/src/auth/auth.controller.ts:63` (`AuthController.login`) | credenciais válidas (conexão **admin** pré-auth) | `{}`; `entidade=auth`, `entidade_id=operador` | `operador` |
| `login_falha` | `apps/api/src/auth/auth.controller.ts:48` (`AuthController.login`) | senha inválida (conexão **admin** pré-auth) | `{ motivo: 'senha_invalida' }`; `entidade=auth` | `operador` |
| `logout` | `apps/api/src/auth/auth.controller.ts:77` (`AuthController.logout`) | `POST /auth/logout` autenticado; sessão revogada | `{}`; `entidade=auth` | `operador` |
| `trocar_senha` | `apps/api/src/auth/auth.controller.ts` (`AuthController.trocarSenha`) | `POST /auth/trocar-senha` autenticado; hash atualizado, demais sessões revogadas | `{}`; `entidade=auth`, `entidade_id=operador` | `operador` |
| `trocar_senha_falha` | `apps/api/src/auth/auth.controller.ts` (`AuthController.trocarSenha`) | `POST /auth/trocar-senha`; senha atual incorreta (`motivo: 'senha_invalida'`) ou nova senha fora da política (`motivo: 'politica_violada'`, `motivo_detalhe` com o código) | `{ motivo, motivo_detalhe? }`; `entidade=auth` | `operador` |
| `criar` (cliente) | `apps/api/src/cadastro/cadastro.controller.ts:58` (`CadastroController.criarCliente`) | `POST /clientes` — auditoria **pós-COMMIT** (autocommit, não atômica) | `{ nome }`; `entidade=cliente` | `operador` |
| `criar` (obrigação) | `apps/api/src/cadastro/cadastro.controller.ts:90` (`CadastroController.criarObrigacao`) | `POST /obrigacoes` — auditoria **pós-COMMIT** (não atômica) | `{ descricao }`; `entidade=obrigacao` | `operador` |
| `criar` (checklist_template) | `apps/api/src/cadastro/cadastro.controller.ts:164` (`CadastroController.criarTemplate`) | `POST /checklist-templates`; template+itens em transação, mas a auditoria roda **depois do COMMIT** (não atômica) | `{ nome, itens }`; `entidade=checklist_template` | `operador` |

**Notas honestas sobre atomicidade** (relevantes p/ CA-03):

- **Transacionais** (`BEGIN/COMMIT`/`ROLLBACK`): `ativar` motor (itens + evento + job tick), `escalar` (estado + exceção + evento), `cobrar` (estado + mensagem + evento), `encerrar` (ambos os sítios), `decidir` (item + exceção + evento), `reenviar` (exceção + item + evento), `receber` (item + `mensagens_*` + evento).
- **NÃO transacionais (honestidade declarada):** `criar`/cliente, `criar`/obrigação e `criar`/checklist_template — o evento é emitido após o COMMIT da entidade; se o INSERT do evento falhar, a entidade existe sem rastro. `ativar` HTTP também roda em autocommit (ciclo + `enqueue`×2 + evento em statements separados). Casos `decisao` e `ativacao_sem_template` são autocommit, porém **não acompanham mudança de estado de negócio** (são informativos), mitigando o impacto de uma falha pontual.

## 4. Semântica e garantias

- **Append-only:** a aplicação não pode `UPDATE`/`DELETE` em `eventos_auditoria` (§2.2); o único caminho é `INSERT` (ou `SELECT` de leitura).
- **Isolamento RLS-only:** a trilha não é filtrada por `tenant_id` no SQL de leitura; a separação entre tenants é garantida **exclusivamente** pelo RLS `tenant_isolation` FORCE. Auditoria de credencial (`login_*`) é a única exceção operacional: usa conexão **admin** pré-auth apenas para o INSERT do evento, nunca para dados de negócio (comentado em [`auth.controller.ts:102-104`](../../apps/api/src/auth/auth.controller.ts)).
- **Correlação:** o token `t:<item>:r<rodada>` (PRM-P0.1-E) liga envio e recebimento; o evento `cobrar` guarda `rodada` e o evento `receber` guarda `token`+`message_id`, permitindo reconstruir o par envio↔resposta por `item_ciclo_id`.
- **PII admin-only residual:** `detalhes` pode conter dado pessoal mínimo (`nome` do cliente em `criar` cliente, `descricao` de obrigação). O acesso à trilha é restrito a **admin do próprio tenant** (RBAC `@Roles('admin')` + RLS) — ver §5 e riscos §7.
- **Nunca regista segredos:** senhas, tokens de sessão ou hashes não são gravados em `detalhes` em nenhum emissor (auditoria da credencial grava apenas `motivo` e o UUID do operador).

## 5. Leitura e consulta (PRM-P0.2-A)

Endpoint **`GET /auditoria`** — [`apps/api/src/auditoria/auditoria.controller.ts`](../../apps/api/src/auditoria/auditoria.controller.ts):

- **RBAC:** `@UseGuards(RequireAuth)` + `@Roles('admin')` — `operador` recebe `403`; anônimo `401`.
- **Filtros:** `entidade`, `acao`, `entidade_id` (UUID validado) e `limite`.
- **Paginação keyset:** `antes_de` (timestamp ISO 8601) + `antes_id` (UUID) — **devem vir juntos**; incompletos ⇒ `400`. Ordenação `(criado_em DESC, id DESC)`, tiebreaker por `id`.
- **`limite`:** inteiro **1–200**; fora ⇒ `400`. Default na camada de dados: 50.
- **Resposta:** `{ eventos, tem_mais }` — `tem_mais` derivado de `LIMIT limite+1` (linha descartada ⇒ há página seguinte).

`listarEventos` — [`packages/db/src/audit.ts:54-100`](../../packages/db/src/audit.ts):

- **Sem `WHERE tenant_id`** — isolamento delegado ao RLS da conexão (§2.3); sem `app.tenant_id` configurado retorna 0 linhas.
- **Keyset:** `(criado_em < $antes OR (criado_em = $antes AND id < $id))`, clamp interno `[1,200]`, `ORDER BY criado_em DESC, id DESC`.
- Contrato de saída em `EventoAuditoriaDTO` ([`audit.ts:33-42`](../../packages/db/src/audit.ts)), incluindo `actor_type`/`actor_id`.

### O que NÃO é auditado

- **Leituras** (listar clientes/ciclos/obrigações/templates, `GET /auditoria`): por design, leitura não gera evento (registrado no plano §11, `PRE_PILOT_REMEDIATION_PLAN.md`).
- **Login com tenant desconhecido** (`AuthController.login` quando o `SELECT` não retorna operador): sem FK válida não há evento; o sinal vai ao log da aplicação (anti-enumeração — resposta idêntica).
- **`login_block`** (rate limit): não existe — pertence à Issue #55 ([PRM-P0.3-B](../reports/PRE_PILOT_REMEDIATION_PLAN.md)), dependente do mesmo gate.
- **Conteúdo das comunicações:** o envio em si não é auditado como evento; a ação `cobrar` (rodada) e o recebimento `receber` (token/message_id) rastreiam o fluxo, sem corpo da mensagem.
- **Scheduler/ticks re-enfileirados** sem ação de negócio não geram evento (só `decisao` quando o motor decide não agir).

## 6. Retenção — DEFERIDA (HG-RETENÇÃO)

**`HG-RETENÇÃO DEFERRED (2026-08-30)`** — decisão humana registrada no [plano §13](../reports/PRE_PILOT_REMEDIATION_PLAN.md) (e §21, §24, Anexo A.3) e reapresentada na [Issue #53](https://github.com/rnsilveira22/servium/issues/53):

- Durante **MVP/piloto**, os eventos de auditoria são **preservados** até a aprovação da política — **nada é purgado automaticamente**.
- **Não há prazo numérico de retenção** neste documento: definir prazos é decisão de PO/jurídico no gate `HG-RETENÇÃO`.
- Qualquer **purge futuro** fica **condicionado a HG-RETENÇÃO** (pré-condição antes de qualquer limpeza, conforme plano §24.3 e linha 500). Enquanto não houver decisão, persistir tudo.

## 7. Mapa de evidências (cobre CA-05-3)

| Evento / AC | Evidência (teste arquivo:linha) | AC coberta |
|---|---|---|
| CA-01 · append-only | `packages/db/tests/audit.test.ts:14-39` — INSERT ok; `UPDATE`/`DELETE` → `/permission denied/i`; base: `migrations/0003_rls_security.sql:44` | CA-01 (#9) · CA-04-4 (#51) |
| CA-02 · campos/ator | `packages/db/migrations/0002_business.sql:120-130` (schema + CHECK `actor_type`); `packages/db/src/audit.ts:33-42` (DTO) | CA-02 (#9) |
| `ativar` (motor) | `apps/api/test/atomicidade.test.ts:138-166` (falha na auditoria ⇒ rollback: 0 itens, 0 eventos, 0 jobs); `:168-186` (persiste itens+evento+job) | CA-03-1 (#52) |
| `escalar` | `apps/api/test/atomicidade.test.ts:188-209` (falha no INSERT de exceção ⇒ rollback; sem evento); `:308-333` (corrida 2 workers ⇒ 1 exceção/1 evento) | CA-03-2 (#52) |
| `decidir` | `apps/api/test/atomicidade.test.ts:211-235` (falha no UPDATE de exceções ⇒ rollback); `:237-261` (falha na auditoria ⇒ rollback) | CA-03-3 (#52) |
| `encerrar` | `apps/api/test/atomicidade.test.ts:263-282` (`encerrarCiclo`); `:284-306` (bloco final de `tickCiclos`) | CA-03-4 (#52) |
| contrato público | casos de `apps/api/test/atomicidade.test.ts` sem mudança de assinatura de handlers/endpoints | CA-03-5 (#52) |
| CA-04-1 · GET admin (`cobrar`) | `apps/api/test/auditoria.test.ts:153-167` — admin vê evento real com rodada correta | CA-04-1 (#51) |
| CA-04-2 · RLS | `apps/api/test/auditoria.test.ts:169-177` (via HTTP, tenant A não vê B); `packages/db/tests/audit-lista.test.ts:102-125` (`listarEventos`: A só A, B só B, sem contexto 0) | CA-04-2 (#51) |
| CA-04-3 · RBAC | `apps/api/test/auditoria.test.ts:179-182` — `operador` 403; anônimo 401 | CA-04-3 (#51) |
| CA-04-4 · append-only preservado | `packages/db/tests/audit.test.ts:14-39` | CA-04-4 (#51) |
| ordenação/keyset | `packages/db/tests/audit-lista.test.ts:127-146` (DESC + empate de `criado_em`); `:148-187` (páginas não repetem/perdem linha); endpoint `apps/api/test/auditoria.test.ts:201-219` | CA-04 (#51) |
| filtros/limite/validação | `packages/db/tests/audit-lista.test.ts:189-208` (filtros combináveis); `:210-223` (`tem_mais`; clamp [1,200]); `apps/api/test/auditoria.test.ts:184-199` (400 para entrada inválida — previne 22P02) | CA-04 (#51) |
| `trocar_senha` / `trocar_senha_falha` | `apps/api/test/trocar-senha.test.ts` — sucesso 204 + auditoria; falhas auditadas (`senha_invalida`, `politica_violada`); senha atualizada e demais sessões revogadas | CA-A-1 (#54) |

A tabela acima referencia os testes de **#51** (CA-04-x) e **#52** (CA-03-x), além dos testes históricos de CA-01/CA-02 — satisfazendo o CA-05-3 ("documenta provas de CA-01/CA-02/CA-03/CA-04"). Rastreio completo dos critérios da Issue #9: CA-01/CA-02 satisfeitos por `#25`/`#27` (reconciliação §5), CA-03 fechado por #52, CA-04 por #51 e CA-05 por este documento.

## 8. Riscos e limitações

1. **PII admin-only residual:** `detalhes` contém dado pessoal mínimo (`nome` de cliente, `descricao` de obrigação) e UUIDs de operadores. Acesso restrito a admin do próprio tenant (RBAC+RLS); revisão jurídica futura do que deve (ou não) compor `detalhes`.
2. **Caminhos de cadastro não-atômicos:** `criar`/cliente, `criar`/obrigação, `criar`/checklist_template e `ativar` (HTTP) emitem o evento **pós-COMMIT/autocommit** — falha do INSERT de auditoria deixa a entidade sem rastro (CA-03 coberto apenas nos caminhos do motor/decidir/reenviar/receber). Mitigação operacional: monitorar eventos ausentes por entidade criada.
3. **Login via conexão admin:** `login_sucesso`/`login_falha` usam conexão **admin** pré-auth (sem RLS) para gravar o evento — escopo restrito ao INSERT de auditoria de credencial e `tenant_id` do operador autenticado; não acessa dados de negócio. Utilização indevida futura dessa conexão seria violação da separação documentada em [`auth.controller.ts:102-104`](../../apps/api/src/auth/auth.controller.ts).
4. **Ator `servico` não emitido:** a trilha ainda não distingue "FD agindo" de "infra do sistema" (tudo `sistema`) — dependência de [PRM-P0.3-C](../reports/PRE_PILOT_REMEDIATION_PLAN.md), fora desta entrega.
5. **Retenção em aberto:** sem HG-RETENÇÃO não há prazo nem purge; o crescimento da tabela no piloto é aceito intencionalmente (política §6).

## 9. Referências cruzadas

- [ADR-005 — Estratégia de Tenant (RLS)](../decisions/ADR-005-tenant-strategy.md) — base do isolamento §2.3.
- [ADR-009 — Autenticação e Autorização](../decisions/ADR-009-authentication-strategy.md) — ações sensíveis auditadas; RBAC mínimo (§5).
- [ADR-010 — IA determinístico-first](../decisions/ADR-010-ai-usage-strategy.md) — auditoria como classe determinística; promps/versões em `detalhes` quando houve LLM (hoje não aplicável).
- [`HUMAN_DECISIONS_LOG.md`](../factory/HUMAN_DECISIONS_LOG.md) — HG-008 (canal) e registro de gates; HG-RETENÇÃO permanece DEFERRED (plano §21/§24).
- [`PRE_PILOT_REMEDIATION_PLAN.md`](../reports/PRE_PILOT_REMEDIATION_PLAN.md) — §11 (PRM-P0.2-A), §12 (PRM-P0.2-B), **§13 (PRM-P0.2-C** — escopo IN/OUT e decisão de retenção), §16 (PRM-P0.3-C), §21 (Human Gates), §24 (próximos passos).
- [`POST_MVP_BACKLOG_RECONCILIATION.md`](../reports/POST_MVP_BACKLOG_RECONCILIATION.md) — §5 (deep dive da Issue #9) e §10 (recomendações que originaram P0.2).
- [`DOMAIN_BOUNDARIES.md`](../architecture/DOMAIN_BOUNDARIES.md) — módulo B7 (Audit & Observability): trilha append-only, correlação, destino dos eventos.
- Issues: [#9](https://github.com/rnsilveira22/servium/issues/9) (épico CA-01..05) · [#51](https://github.com/rnsilveira22/servium/issues/51) (PRM-P0.2-A · leitura) · [#52](https://github.com/rnsilveira22/servium/issues/52) (PRM-P0.2-B · atomicidade) · [#53](https://github.com/rnsilveira22/servium/issues/53) (este documento).
