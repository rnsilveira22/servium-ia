# UX/Product Gap Analysis — Servium IA

> **Tipo**: análise de produto (somente documentação).
> **Data**: 2026-09-08.
> **Escopo analisado**: código da branch `feat/web-ux-m0-foundation` (PR #96, M0 — Fundação Visual) sobre a `main` (`aef739d`), aplicação web + API + motor + banco + suíte E2E.
> **Regras da diretiva aplicadas**: NENHUMA implementação de M1..M5; NENHUM merge; NENHUM novo endpoint; NENHUMA alteração em API/banco/regras/Human Gates; bug crítico existente → registrado; melhorias M1+ → `OUT_OF_SCOPE`. O M0 da PR #96 permanece `AWAITING_HUMAN_DECISION`; silêncio não é aprovação.

---

## 1. Modelo contextual (modelo/plataforma)

| Dimensão | Descrição |
|---|---|
| **Produto** | Servium IA — plataforma multi-tenant que opera um "Funcionário Digital" (agente) para cobrança e validação de pendências documentais/contratuais de clientes por e-mail |
| **Arquitetura** | Monorepo npm workspaces: `apps/web` (React 18 + Vite SPA, sem router de servidor), `apps/api` (NestJS), `apps/e2e` (Selenium) e `apps/runtime-e2e` (fluxo ponta-a-ponta via API + seed SQL), `packages/db` (migrações + helpers + `listarEventos`), `packages/shared-types` |
| **Dados** | PostgreSQL shared-schema multi-tenant com **RLS FORCE** (tenant isolado por conexão; `set_config('app.tenant_id', …)` no guard de auth); auditoria append-only (`eventos_auditoria`) sem UPDATE/DELETE |
| **Motor** | Fila de jobs (`jobs_fila`, SKIP LOCKED, idempotência por chave determinística, ADR-008): `ciclo.ativar`, `item.cobrar`, `ciclo.tick`, `ciclo.encerrar`; decisão determinística `decidirAcao` por estado/tentativas/limites |
| **Comunicação** | `CommunicationChannel` (ADR-008) com adapters `none` (fake), `mailpit` (dev/CI) e `gmail` (piloto/produção); remetente padrão `assistente@servium.local` |
| **Identidade/auditoria** | `eventos_auditoria(tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)`; `actor_type`: `operador` (ações do humano), `servico` (entidade do Funcionário Digital, PRM-P0.3-C), `sistema` (infra/rate-limit) |
| **Perfis** | `admin` (tudo, incluindo decidir/reenviar item) e `operador` (navega + ativa ciclos) |

## 2. Estado atual do produto

| Camada | Estado | Evidência |
|---|---|---|
| API | Pronta para 8 endpoints de domínio + auth + auditoria + gmail; **GET `/auditoria` implementado e testado** (admin, filtros + cursor keyset) | `apps/api/src/auditoria/auditoria.controller.ts`; `packages/db/src/audit.ts`; `apps/api/test/auditoria.test.ts` |
| Motor | Funcional para cobrança/resposta/escalada, com limites configuráveis por ciclo e por item | `apps/api/src/motor/engine.ts`, `handlers.ts` |
| Banco | 10 migrações; vínculo `obrigacoes.template_id` e `ciclos.config` criados na **0005_motor.sql** | `packages/db/migrations/0005_motor.sql` |
| Web (M0) | Fundação visual (design tokens navy/teal, design system, a11y, menu mobile) **validada** (`M0_READY_FOR_HUMAN_GATE_ACCEPTANCE`) — na PR #96, `AWAITING_HUMAN_DECISION` | PR #96; `docs/reports/M0_UX_FOUNDATION_VALIDATION_REPORT.md` |
| Cobertura E2E | 31 Selenium + runtime-e2e; CI 4/4 verde no head `b00da07` | `npm run verify` (178 testes) |

### Descoberta central nº 1 — Banco e motor prontos, UI não conectada

- O motor materializa itens a partir de `obrigacoes.template_id` (`ativarCiclo`): se `NULL` → audita `ativacao_sem_template` e **não cria itens**.
- Porém a UI de Obrigações (`ObrigacoesPage.tsx`) só oferece **Cliente, Descrição, Prazo** — **não existe campo de Template**.
- O DTO `CriarObrigacaoInput` (`packages/shared-types/src/index.ts`) não possui `template_id`, e `POST /obrigacoes` também não o aceita.
- **Consequência** (atestada pelo próprio E2E, `ciclo-activation.test.ts:84`): `expect(await cicloDetailPage.hasSection('Itens (0)')).toBe(true)` — **todo ciclo ativado pela UI nasce com 0 itens**, logo o Funcionário Digital não envia cobrança alguma pela jornada padrão.

> ⚠️ **GAP-01 — IMPEDIMENTO FUNCIONAL (nível produto, não bug de código)**: a jornada completa "cadastrar cliente → cadastrar obrigação com template → ativar ciclo → FD cobra → cliente responde → resolver" **não é alcançável apenas pela UI/API atual**; a criação de template e o vínculo obrigação↔template existem só em SQL de seed (`apps/runtime-e2e/src/helpers.ts`) e em testes. Classificado como **bloqueante da narrativa do produto** → M1-P0 (ver §14/§15).

### Descoberta central nº 2 — Auditoria existe no backend mas é invisível na UI

- `GET /auditoria` com filtros (`entidade`, `acao`, `entidade_id`, `limite`, cursor `antesDe/antesId`) está pronto, admin-only, e chama `listarEventos` (append-only por RLS).
- A rota `/auditoria` da SPA renderiza `AuditoriaPage`, que só busca **`/metrics` e `/health`** — não consome `GET /auditoria` (grep: zero ocorrências de `auditoria`/`listarEventos` em `apps/web`).
- Ou seja: a **trilha de auditoria existe e é gravada** (cobrar, decisao, escalar, receber, decidir, reenviar, ativar, cancelar, criar, login_sucesso), mas o usuário não a vê em lugar nenhum.

## 3. Inventário de telas

| Tela (rota) | Componente | Conteúdo atual | Linguagem exibida |
|---|---|---|---|
| `Login` (`/login`) | `LoginPage` | Slug do escritório, e-mail, senha; logo; alertas de erro | "Escritorio (slug)", "E-mail", "Senha", "Entrar" |
| `Painel` (`/`) | `DashboardPage` | Cards: Ciclos ativos, Itens pendentes, **"Concluidos"**, **"Excecoes abertas"**; tabela "Ciclos recentes" | cards sem acentos; "Concluidos", "Excecoes abertas", "Criado em" |
| `Clientes` (`/clientes`) | `ClientesPage` | Tabela (Nome, Identificacao, E-mail, Criado em) + form inline "+ Novo Cliente" (Nome, Identificacao (CPF/CNPJ), E-mail) + empty state | "Identificacao", "Criado em" (sem acento) |
| `Obrigacoes` (`/obrigacoes`) | `ObrigacoesPage` | Tabela (Cliente, Descricao, Prazo, Criado em, "Ativar ciclo") + form "+ Nova Obrigacao" (Cliente select, Descricao, Prazo) + seção **"Templates de Checklist" somente leitura** | "Nova Obrigacao", "Descricao", "Obrigacoes" |
| `Ciclos` (`/ciclos`) | `CiclosPage` | Tabela (Cliente, Obrigação, Estado, Itens, Resolvidos, Excecoes, Criado em, Detalhes) + form "+ Ativar Ciclo" (select Obrigação) + empty states | "Excecoes", "Criado em" |
| `Ciclo` (`/ciclos/:id`) | `CicloDetailPage` | Info (Cliente, Obrigacao, Status, Ativado em, **ID bruto**, Encerrado em) · **Itens (estado técnico cru: `pendente/cobrado/aguardando/...`, Tentativas)** · **Comunicacoes (direcao/canal/status técnicos)** · **Excecoes (Tipo raw, Motivo, Contexto JSON cru, ações admin Resolver/Cancelar/Reenviar)** | "Informacoes", "Comunicacoes", "Ultima acao", "Tentativas"; busters técnicos `cobrado`, `aguardando`, `excecao`, `resolvido` |
| `Excecoes` (`/excecoes`) | `ExcecoesPage` | Tabela consolidada de exceções (Tipo, Motivo, **Contexto JSON**, Cliente, Item, Tentativas, Data, link ciclo truncado `UUID.slice(0,8)`, ações admin) | "Excecoes", "Contexto", "Data" |
| `Auditoria` (`/auditoria`) | `AuditoriaPage` | **Metricas** (cards de `/metrics`) + **Saude do Sistema** (`/health`: Status, **Uptime "Xh Ymin"**, Timestamp, **Correlation ID**, demais props cruas) — **sem trilha de eventos** | "Metricas", "Saude do Sistema", "Correlation ID", "Uptime", "Timestamp" |

## 4. Inventário de formulários

| Form | Tela | Campos | Obrigatórios | Público |
|---|---|---|---|---|
| Login | Login | Escritorio (slug), E-mail, Senha | Sim | todos |
| Novo Cliente | Clientes | Nome, Identificacao (CPF/CNPJ), E-mail | Nome | admin/operador |
| Nova Obrigacao | Obrigacoes | Cliente (select), Descricao, Prazo (date) | Cliente, Descricao | admin/operador |
| Ativar Ciclo | Ciclos | Obrigação (select) | Sim | admin/operador |
| Ativar Ciclo (na linha) | Obrigacoes | (botão por linha) | — | admin/operador |
| Cancelar ciclo | Ciclo | Motivo (textarea opcional) | — | admin/operador |
| Decidir item (modal) | Ciclo / Excecoes | Confirmação Resolvido/Cancelado | Desfecho | **só admin** |
| Reenviar item | Ciclo / Excecoes | (ação direta, sem modal) | — | **só admin** |
| Criar Template de Checklist | **inexistente** | (sem UI; só `POST /checklist-templates` via API) | — | — |
| Vínculo Obrigação↔Template | **inexistente** | `obrigacoes.template_id` só via SQL/seed | — | — |

## 5. Jornadas reais (o que dá para fazer hoje pela UI)

1. **Entrar no sistema** — login com slug/email/senha; redirects; logout. ✅ funcional e testado.
2. **Cadastrar cliente** → quebrável pela UI (nome obrigatório). ✅ testado indiretamente (cliente via API no E2E; não há teste E2E do form da UI).
3. **Cadastrar obrigação** (sem template) → quebrável pela UI. ✅ testado via `ObrigacoesPage`.
4. **Ativar ciclo** sobre obrigação **sem template** → ciclo **nasce com 0 itens**; FD não cobra. ⚠️ (GAP-01) — o E2E inclusive **espera** `Itens (0)`.
5. **Cancelar ciclo** (motivo opcional, modal) → ✅ testado (`#73`).
6. **Resolver/cancelar exceção** → **não testado E2E**; a rota chega até a tela, mas não há PageObject nem teste de decisão. A "criação" de exceção também não ocorre pela UI (só via motor a partir de itens, que exigem template).
7. **Reenviar item** → feito só admin; **não testado E2E**.
8. **Consultar auditoria** → ❌ **não é possível pela UI** (a página mostra só métricas/health).
9. **Gerenciar templates/Funcionário Digital** → ❌ **não é possível pela UI** (GAP-01).
10. **Acompanhar comunicação com o cliente** → parcial: tabela "Comunicacoes" no ciclo mostra direcao/canal/status **técnicos**, sem conteúdo do e-mail nem destinatário/remetente legíveis na visão de negócio.

## 6. Matriz de cobertura E2E por jornada

| Jornada/rota | Arquivo(s) E2E / Runtime | Cobertura | Observação |
|---|---|---|---|
| Login (sucesso + 4 falhas + required + logo) | `login.test.ts` | ✅ COVERED | 6 asserts |
| Auth redirects, logout, 404, título | `auth.test.ts` | ✅ COVERED | |
| Sidebar/navegação 7 rotas | `navigation.test.ts` | ✅ COVERED | |
| Health (`/health`, `/auth/me`, SPA) | `health.test.ts` | ✅ COVERED | fetch direto |
| Responsividade mobile/desktop (overflow, sidebar off-canvas) | `responsiveness.test.ts` | ✅ COVERED | |
| RBAC admin/operador (incl. 403 rota gmail tokens) | `permissions.test.ts` | ✅ COVERED | |
| Cadastrar **obrigação pela UI** | `ciclo-activation.test.ts` | ✅ COVERED | via `ObrigacoesPage` |
| Ativar ciclo pela UI | `ciclo-activation.test.ts` | ✅ COVERED | assert "Ciclo ativado" |
| **Cadastrar cliente pela UI** | — | ⚠️ PARTIAL | só via API no E2E; PageObject inexistente |
| Criar template / vínculo obrigação↔template | — | ❌ NOT COVERED | sem UI; só seed SQL |
| Ciclo com itens + cobrança + resposta do cliente | `runtime-e2e.test.ts` | ⚠️ PARTIAL | só via API/seed; **não passa pela UI** |
| Visualizar itens/comunicacoes/excecoes no ciclo | `ciclo-activation.test.ts` | ⚠️ PARTIAL | verifica presença de seção/erro, não conteúdo |
| Resolver/cancelar exceção (decisão humana) | — | ❌ NOT COVERED | |
| Reenviar item | — | ❌ NOT COVERED | |
| Upload de documento | — | ❌ NOT COVERED | não existe upload na UI/API (tabela `documentos` sem endpoint) |
| Auditoria trilha (`GET /auditoria` na UI web) | — | ❌ NOT COVERED | backend testado; web nenhum teste |

## 7. Problemas de UX identificados

| ID | Problema | Evidência | Classe (para §13) |
|---|---|---|---|
| UX-01 | **Jornada principal incompleta**: sem UI para criar template nem vincular obrigação→template, o FD nunca executa pela UI | `ObrigacoesPage.tsx` sem campo; DTO/controller sem `template_id`; E2E asserta `Itens (0)` | M1-P0 |
| UX-02 | **Auditoria não é utilizável como produto**: página mostra métricas/health técnicos em vez da trilha de eventos auditáveis | `AuditoriaPage.tsx` (só `/metrics` + `/health`) | M1-P1 |
| UX-03 | **Estado cru exibido**: badges com `pendente/cobrado/aguardando/recebido/resolvido/cancelado/excecao` e tipo `escalada_limite` sem tradução de negócio | `CicloDetailPage.tsx`, `CiclosPage.tsx`, `ExcecoesPage.tsx` | M1-P1 |
| UX-04 | **Contexto de exceção como JSON cru** (ex.: `{"tentativas":3}`) | `formatarContexto` → `JSON.stringify` | M1-P1 |
| UX-05 | **Dados técnicos expostos ao usuário**: `ID` do ciclo, link `UUID.slice(0,8)`, `Correlation ID`, `Uptime`, `Timestamp` — sem valor de negócio e confusos | `CicloDetailPage` ("ID"), `ExcecoesPage` (link truncado), `AuditoriaPage` | M1-P2 |
| UX-06 | **Falta noção de prazo/urgência**: Dashboard não mostra prazos, vencimentos nem ciclo em risco | `DashboardPage` (só 4 cards) | M1-P2 |
| UX-07 | **Comunicações sem conteúdo**: tabela "Comunicacoes" mostra `direcao/canal/status` mas não o texto do e-mail enviado/recebido | `CicloDetailPage` | M1-P2 |
| UX-08 | **Sem empty states avançados / first-run**: obrigações e ciclos têm, mas exceções/auditoria dependem de estado real | vários | M2-P2 |
| UX-09 | **Reenviar sem confirmação**: ação irreversível (fecha exceção e volta o item ao fluxo) sem modal de confirmação | `ExcecoesPage`/`CicloDetailPage` `handleReenviar` | M1-P2 |
| UX-10 | **Microtextos sem acento** em toda a UI ("Obri**gac**oes", "Descri**c**ao", "Exce**c**oes", "Infor**m**acoes", "Concluidos", "Ultima acao", "Metricas") — a11y de leitura e polimento M0 | todas as páginas | M1-P3 (polimento) |

## 8. Problemas de linguagem (técnica × negócio)

| Termo atual exibido | Contexto | Linguagem de negócio sugerida (proposta — não implementar) |
|---|---|---|
| `pendente`, `cobrado`, `aguardando`, `recebido`, `resolvido`, `cancelado`, `excecao` | badges de item | "Aguardando envio" / "Cobrança enviada" / "Aguardando resposta" / "Resposta recebida" / "Concluído" / "Cancelado" / "Escalado para análise" |
| `escalada_limite` | tipo de exceção | "Aguardou resposta até o limite" (tentativas esgotadas) |
| `aberto`, `encerrado`, `cancelado` | status do ciclo (já traduzido no detalhe) | manter "Aberto / Encerrado / Cancelado" (já feito) |
| Contexto JSON `{"tentativas":3}` | exceção | "O Funcionário Digital tentou 3 vezes em 24h" |
| `Correlation ID`, `Uptime`, `Timestamp` | Auditoria | substituir por métrica/trilha de eventos com significado |
| `Escritorio (slug)` | Login | "Código do escritório" ou auto-detectado |
| `Identificacao (CPF/CNPJ)` | Cliente | "CPF/CNPJ" |
| `Direcao` `envio/recebimento` | Comunicacoes | "Enviado pela FD" / "Resposta do cliente" |
| `Canal` `email` | Comunicacoes | "E-mail" (já ok) |
| `Template` `canal` `itens` | seção Templates (somente leitura) | "Checklist padrão" / "Itens cobrados" |

## 9. Auditoria — diagnóstico (o que se grava hoje × o que a UI mostra)

**Gravação (back — pronta e correta):** tabela append-only `eventos_auditoria`, RLS por tenant, sem UPDATE/DELETE (forçado por migração de grants). Cobertura de `acao`:

- `criar` (cliente/obrigação/template) · `ativar` · `ativacao_sem_template` — actor `operador`
- `cobrar` · `decisao` · `escalar` · `receber` · `encerrar` — actor `servico`/`sistema`
- `decidir` · `reenviar` · `cancelar` — actor `operador`
- `login_sucesso`, rate-limit — actor `sistema`

**Filtros/paginação:** `GET /auditoria` admin com `entidade`, `acao`, `entidade_id`, `limite` (1..200), cursor keyset `antesDe+antesId` — **testado** (`apps/api/test/auditoria.test.ts`), produto pronto no backend.

**E a UI?** ❌ nenhuma tela consome `listarEventos`. `AuditoriaPage` lê `/metrics`/`/health`. Resultado: o "espelho de auditoria" que o Owner espera não é alcançável; a decisão atribuível (quem agiu/quando/por quê) fica invisível.

## 10. Narrativa da Funcionária Digital hoje (contraponto ao humano)

**O que o FD faz de fato** (`motor/handlers.ts`):

1. `ativarCiclo` materializa itens do checklist no ciclo a partir de `obrigacao.template_id` **se existir** (senão, audita `ativacao_sem_template` e nada ocorre).
2. `tickCiclos`/`cobrarItem` decide por item: com base em estado+tentativas+janela, envia e-mail ao cliente (`assistente@servium.local`, assunto "Pendência documental: …", corpo "Olá {cliente}, precisamos de: {descricao}" + `Identificador: t:<item>:r<rodada>`), registra `mensagens_comunicacao` e apoia na auditoria `cobrar`/`decisao`.
3. Escalada automática `aguardando → excecao` quando estoura o limite social (padrão: 3 tentativas, janela 8h–18h, intervalo ≥24h).
4. `recebimento.ts` correlaciona a resposta do cliente (token `t:<item>:r<rodada>`) e muda o item para `recebido`, idempotente por `message_id`.
5. **Só o ser humano** decide `resolvido`/`cancelado`/`reenviar` em exceção (`decidir-item.ts` — CA-03, **admin-only**), e isso não é substituível pelo FD por design.

**Lacuna de narrativa**: a interface não conta essa história. O usuário vê badges crus ("aguardando") e JSON, nunca "a FD tentou 3x e escalou para você analisar". Não há timeline por ciclo nem "por que este item está assim".

## 11. Lacunas de transparência

| Lacuna | Impacto | Proposta (não implementar) |
|---|---|---|
| Trilha de auditoria não visível na UI | impossível auditar decisões/atribuições na tela | tela Auditoria consumir `GET /auditoria` com filtros + tradução actor/ação |
| Decisões do motor não explicadas | usuário não entende estado do ciclo sem contexto | narrativa/justificativa por item (ex.: "cobrado em HH:MM, aguardando resposta") |
| Ciclo sem template não sinalizado | FD "não faz nada" sem explicação | alerta de ciclo sem checklist + caminho para corrigir |
| `contexto` JSON cru | decisor não entende o dado | apresentação em linguagem natural |
| Quem agiu (actor `operador`) sem nome legível | trilha não atribuível visualmente | resolver actor_id → nome (ou listar "humano/admin") |
| Comunicacoes sem corpo do e-mail | sem evidência do que foi enviado/recebido | expandir linha com preview do conteúdo |

## 12. Recomendações (ordem de execução sugerida — todas `OUT_OF_SCOPE` aqui)

1. **M1-P0 (bloqueante)**: fechar a jornada — habilitar na UI de Obrigações o vínculo de Checklist Template (criar template com itens + associar) e garantir no fluxo de Ativar Ciclo; hoje a UI produz ciclos de 0 itens.
2. **M1-P0 (bloqueante p/ auditoria)**: conectar `AuditoriaPage` a `GET /auditoria` (trilha real), mantendo saúde/métricas em seção própria e em linguagem de negócio.
3. **M1-P1**: traduzir estados/tipos/contexto para linguagem de negócio; modal de confirmação para Reenviar; nome legível de quem decidiu.
4. **M1-P2**: remover/ocultar `ID`, `UUID.slice(0,8)`, `Correlation ID`, `Uptime`, `Timestamp` do fluxo de negócio; preview de comunicação.
5. **M1-P3**: aplicar acentuação nos microtextos (polimento de leitura).
6. **M2**: vencimentos/urgência no Painel, empty states avançados, on-boarding da FD.

## 13. Classificação M1–M5 (estimativa — sem implementação)

| Milestone | Itens que absorve | Prontidão | Impedimentos |
|---|---|---|---|
| **M1 — Usabilidade e jornal/língua de negócio** | UX-01..UX-10 + §8 + §11 (auditoria visível) | **Alta** qdo M0 mergear | GAP-01 (vínculo template) precisa de decisão de produto + endpoint/UI; auditoria precisa apenas de UI sobre endpoint pronto |
| **M2 — Operação assistida e Painel** | prazo/vencimento, empty states avançados, first-run, dashboards | Média | novos dados de negócio (prazo em obrigação já existe; precisa usar) |
| **M3 — Comunicação e transparência full** | timeline do FD por ciclo, corpo de mensagens, exports | Média | consumir de dados existentes (`mensagens_comunicacao`), sem novos endpoints para leitura |
| **M4 — Configuração do Funcionário Digital** | UI de templates (itens, canais, limites, horários), vinculação obrigação↔template | Média | **endpoints novos** + decisão de escopo; atende GAP-01 |
| **M5 — Relatórios/regressões & UX avançada** | export auditoria, retenção (HG-RETENÇÃO), temas/a11y | Baixa/Média | política de retenção pendente (human gate) |

> Observação: a fundação visual M0 (design system, a11y, menu mobile) já está validada e é pré-requisito satisfeito para todos os itens — o que falta é **conteúdo/negócio**, não estética base.

## 14. Itens que precisam de decisão humana

| ID | Item | Pedido (binário/escopo) | Urgência |
|---|---|---|---|
| DH-01 | **M0 merge (PR #96)** | `APPROVE` / `REJECT` (gate aberto desde 2026-09-08; estado `AWAITING_HUMAN_DECISION`) | imediata (desbloqueia tudo) |
| DH-02 | **GAP-01 — fechar jornada de template** | autorizar vínculo obrigação↔template (+ criação de template) na UI; escopo de M1 vs M4 | alta (hoje a UI gera ciclos vazios) |
| DH-03 | **Auditoria visível** | autorizar UI de `GET /auditoria` (sem novos endpoints) em M1 | alta |
| DH-04 | **Reenviar com confirmação** | aprovar modal e mensagem de confirmação | média |
| DH-05 | **Exposição de dados técnicos** | decidir ocultar `ID`/`UUID`/`Correlation ID`/`Uptime` do fluxo de negócio | média |
| DH-06 | **Retenção (HG-RETENÇÃO)** | definir política numérica (prazo/volume) | antes de `PILOT_READY` |
| DH-07 | **Fechar Issue #9 (auditoria)** | registrar CA-01→CA-05 + fechar formalmente | baixa/média |

## 15. Priorização (MoSCoW)

| Prioridade | Itens |
|---|---|
| **Must** (só após aprovar M0) | M1-P0: vínculo template na jornada (DH-02) · auditoria visível (DH-03) · tradução de estado/contexto |
| **Should** | modal Reenviar (DH-04) · legibilidade de actor/quem decidiu · ocultar dados técnicos (DH-05) |
| **Could** | microtextos acentuados (M1-P3) · preview de comunicação · timeline do FD (M3) |
| **Won't (agora)** | M4 UI de templates/limites completos · M5 relatórios/exports (dependem de DH-06 e decisões posteriores) |

## 16. Critérios de aceite (para o próximo gate humano)

1. **Jornada completa via UI**: com perfil `operador`, é possível criar cliente → obrigação **com template/itens** → ativar ciclo → ver item "cobrado/aguardando" → e atingir `resolvido` (via resposta simulada ou decisão humana). (endpoint de resposta/seed aceito; a UI deve **produzir** itens, não 0 itens).
2. **Auditoria visível e atribuível**: tela Auditoria lista eventos com entidade, ação em linguagem de negócio, autor (humano ou FD), data; filtros por entidade/ação; paginação.
3. **Zero jargão técnico crítico no fluxo principal**: badges/tipos/contexto traduzidos; IDs/`Correlation ID`/`Uptime` fora das visões de negócio.
4. **Decisões humanas registradas**: decidir/reenviar auditados com `actor_type='operador'` identificável na UI.
5. **Transparência do FD**: cada item mostra o "porquê" (cobrança enviada em X, aguardando resposta, tentativas realizadas).
6. **Cobertura E2E**: novos testes cobrindo (a) formar/criar template+vínculo, (b) ciclo com itens>0, (c) decisão humana por UI, (d) página de auditoria com dados reais.
7. **Regressão**: `npm run verify` verde (178+ testes), lint/typecheck/build/CI 4/4; lint:docs verde nos documentos novos.

## 17. Fora de escopo (OUT_OF_SCOPE — NÃO IMPLEMENTAR)

- Nada desta análise será implementado nesta entrega; é documentação apenas.
- `CRITICAL_EXISTING_BUG` formal: **nenhum bug de código bloqueante foi detectado**; o GAP-01 é **impedimento funcional de produto** (ausência de feature/UI), não defeito — registrado para decisão (DH-02), sem correção nesta entrega.
- M1..M5, novos endpoints, novos campos, alterações em API/banco/regras/Human Gates: **NÃO autorizados** nesta entrega.
- Utensílios técnicos permanentes (ex.: UI de upload de documento) inexistentes hoje permanecem fora deste escopo.
- Retenção/purge (HG-RETENÇÃO) permanece `DEFERRED`.
- M0 da PR #96 segue **sem merge** até decisão explícita do Owner.

---

> **UX_PRODUCT_GAP_ANALYSIS_READY_FOR_HUMAN_REVIEW**
