# FACTORY V2 — FASE 1 — Plano de Implementação + Design Ready

Estado: **`FACTORY_V2_PHASE1_DESIGN_READY`** (PENDENTE de aprovação humana — não é `DONE`)
Data: 04/09/2026 · main = `df7a997` · Sessão: DESIGN/PLANO (sem implementação de produto ou UI)

> Documento entregável da Fase 1. Transforma a proposta da Fase 0
> (`FACTORY_V2_FASE0_AUDITORIA_DESIGN.md`) em plano executável da Factory V2,
> formaliza Human Gates, planeja a reconciliação, recomenda a primeira prova
> e **registra como contexto de produto** a evolução futura da UX (não implementada).

---

## A. ESTADO INICIAL (verificado nesta sessão)

| Dimensão | Estado verificado |
|---|---|
| Git branch | `main` |
| HEAD | `df7a997588664f01a2200f00ae3aab0f86a4690e` |
| Working tree | 1 arquivo novo não versionado: `docs/reports/FACTORY_V2_FASE0_AUDITORIA_DESIGN.md` (relatório da Fase 0, aguardando commit) |
| Sync | `git fetch origin` OK · `origin/main...main` = `0 0` (sincronizada) |
| CI | `CI success` e `E2E success` em `df7a997` |
| GitHub Issues abertas | 17 (#73, #72, #59, #58, #57, #56, #55, #54, #53, #52, #51, #49, #48, #47, #46, #45, #9) |
| GitHub PRs abertos | **1**: `#75` dependabot (bump `nodemailer`/`qs` em 3 workspaces) — externo ao escopo, decisão humana/CI necessário |
| Branches remotas novas | `origin/dependabot/npm_and_yarn/npm_and_yarn-95ec91160b` (do PR #75) |
| Agentes V1 | `servium-po`, `servium-senior`, `servium-pleno`, `servium-reviewer-qa` (sem orquestrador) |
| Estado da Factory | `PRE_PILOT_REMEDIATION_REQUIRED` na prática; `FACTORY_STATUS.md` desatualizado (P0-2 da Fase 0) |

Diferenças vs Fase 0: apareceu o **PR #75 (dependabot)**. Nada foi alterado por esta sessão.
O relatório da Fase 0 segue **não versionado** — primeiro commit pendente de autorização.

---

## B. PLANO DA FACTORY V2

### B.1 Arquitetura

```
RODRIGO (owner) ── Human Gates (L3) ───────────────────────────────────────────┐
   ▼                                                                          │
PO (servium-po) ──consenso→ ChatGPT/PO (assistente; não autoridade final)     │
   │ contrato PO→ORCH                                                         │
   ▼                                                                          │
ORCHESTRATOR (NOVO: servium-orchestrator)  ◄── fonte única: Issues + Project  │
   │  ├─► SENIOR (servium-senior)                                             │
   │  └─► PLENO  (servium-pleno)                                              │
   │         └─► REVIEWER/QA (servium-reviewer-qa)                            │
   ▼            QA_APPROVED                                                   │
HUMAN REVIEW (novo gate) ──► PO_ACCEPTED ──► DONE ◄───────────────────────────┘
```

**Responsabilidade do Orchestrator (coordenador, NÃO autoridade):**

- Distribuir, selecionar agente, preparar contexto, controlar workflow.
- Validar handoffs (saída obrigatória + evidência + estado).
- Mover estados permitidos; detectar bloqueios; solicitar retry; abrir PR normal; acompanhar CI; encaminhar revisão humana.
- Impedir desvio de escopo, fechamento indevido, DONE sem evidência, loops infinitos.

**Limites (proibido ao Orchestrator):** decidir prioridade/aceite de produto; aceitar ADR; mudar arquitetura sem aprovação; alterar governance/Human Gates; deploy; trabalhar com dados reais; decidir merge estrutural; substituir Rodrigo/PO.

**Entradas:** Issue com DoR (PO_APPROVED) + contexto/AC/dependências/restrições.
**Saídas:** pacote para Senior (`TECH_READY` coberto), estados movidos, handoffs validados, relatório de orquestração.
**Persistência de estado:** **única** — GitHub Issues + Project `Servium IA Development` (campo `Status`). Nenhuma estado paralelo em arquivo ou memória.
**Tratamento de falhas/bloqueios:** STOP conditions (B.6) → `BLOCKED`/`AWAITING_DECISION` com comentário canônico de causa + condição de desbloqueio.
**Fallback V1:** o protocolo `START_FACTORY` original permanece íntegro e utilizável sempre; o ORCH opera como camada superior sobre a mesma máquina de estados.

### B.2 Workflow — máquina de estados ÚNICA

Estados canônicos da Fase 1 (14):

```
OPEN → PO_APPROVED → TECH_READY → IMPLEMENTING → QA_REVIEW
                                                     ├─ QA_FAILED → IMPLEMENTING (máx. 3 → ESCALATED_TECHNICAL_FAILURE)
                                                     └─ QA_APPROVED → HUMAN_REVIEW → PO_ACCEPTED → DONE
Estados transversais: BLOCKED · AWAITING_DECISION · REJECTED · ESCALATED_TECHNICAL_FAILURE
```

**DONE = `QA_APPROVED AND PO_ACCEPTED AND MERGED`** (merge inclui-se explicitamente — resolve P0-1).

**Representação no GitHub Project (SEM duplicar o campo Status):** evoluir o **campo `Status` existente** para o conjunto canônico V2 (substituindo as 12 opções atuais — mapeamento abaixo). Um único campo, um único conjunto de valores; labels continuam apenas como metadados (`priority:*`, `needs:decision`, `status:blocked`). Requer edição administrativa do Project → HG-F2-02.

| V2 (canônico) | Opção atual do Project | Observação |
|---|---|---|
| `OPEN` | `Backlog` | renomeia |
| `PO_APPROVED` | `Ready` | renomeia |
| `TECH_READY` | `Tech Analysis` + `Ready for Development` | funde os dois (fim do Gate 2) |
| `IMPLEMENTING` | `In Development` | renomeia |
| `QA_REVIEW` | `Ready for QA` + `QA Review` | funde (PR em revisão) |
| `QA_FAILED` | `Changes Requested` | renomeia com semântica de falha |
| `QA_APPROVED` | `QA Approved` | igual |
| `HUMAN_REVIEW` | — (novo) | gate humano estrutural antes do aceite PO |
| `PO_ACCEPTED` | `PO Acceptance` | renomeia |
| `DONE` | `Done` | igual |
| `BLOCKED` | `Blocked` | igual |
| `AWAITING_DECISION` | — (novo) | + label `needs:decision` |
| `REJECTED` | — (novo) | com justificativa |
| `ESCALATED_TECHNICAL_FAILURE` | — (novo) | sub-estado de BLOCKED; 3ª falha |

Regra de ouro: **nunca criar uma segunda máquina de estados**. A transição só é executada pelo responsável do estado de origem e sempre registra label/Status/comentário de evidência.

### B.3 Contratos de handoff

Cada contrato define **entrada · pré-condição · saída obrigatória · evidência · estado · responsável · critério de rejeição** (handoff incompleto → retorna ao estado anterior).

#### PO → ORCHESTRATOR (entrada `OPEN`; saída `PO_APPROVED`)

- **Entrada:** Issue; prioridade; objetivo; contexto; critérios de aceite; dependências; restrições.
- **Pré-condição:** DoR completa (Gate 1 — sem ambiguidade crítica).
- **Saída:** pacote executável (Issue pronta p/ análise) + estado válido + evidência de DoR.
- **Rejeição:** AC não testável, ator ausente, dependência desconhecida → volta a `OPEN`.

#### ORCHESTRATOR → SENIOR (entrada `PO_APPROVED`; saída `TECH_READY`)

- **Entrada:** Issue pronta; contexto; AC; precedentes; restrições.
- **Pré-condição:** sem ADR `Proposed` bloqueando.
- **Saída:** análise técnica; riscos; estratégia; tarefas decompostas; testes necessários; decisões pendentes.
- **Rejeição/STOP:** se arquitetura/ADR ainda depende de decisão → **não permitir implementação prematura**; mover a `AWAITING_DECISION`.

#### SENIOR → PLENO (entrada `TECH_READY`; saída `IMPLEMENTING`)

- **Saída:** estratégia aprovada; tarefas claras; arquivos/módulos esperados; testes; riscos; AC.
- **Rejeição:** tarefas ambíguas ou escopo indefinido → volta ao Senior.

#### PLENO → QA (entrada `IMPLEMENTING`; saída `QA_REVIEW`)

- **Saída:** implementação; testes criados **e executados**; `npm run verify` verde; PR `Closes #N`; evidências; AC verificados; escopo respeitado.
- **Rejeição:** CI vermelho, teste não executado, escopo estourado → bloqued no Gate 3.

#### QA → ORCHESTRATOR/HUMAN (saída `QA_REVIEW` → `QA_APPROVED` | `QA_FAILED` | `BLOCKED`)

- **Saída:** veredito único `APPROVED` / `CHANGES_REQUESTED` (`QA_FAILED`) / `BLOCKED`.
- **Regra:** QA **nunca** corrige silenciosamente o código.

#### QA → PLENO (falha; entrada `QA_FAILED`)

- **Saída:** achado; localização; severidade; comportamento esperado; comportamento observado; evidência; correção esperada.
- **Limite:** máx. 3 loops → `ESCALATED_TECHNICAL_FAILURE` (+ análise de causa raiz; se requisito/arquitetura → humano).

#### HUMAN REVIEW → PO (entrada `QA_APPROVED`; saída `PO_ACCEPTED`)

- **Evidência exigida:** diff; testes; QA; riscos; decisões; impacto.
- **Rejeição:** evidência insuficiente → permanece em `HUMAN_REVIEW`/`AWAITING_DECISION`.

#### PO → DONE

- **Somente:** `QA_APPROVED AND PO_ACCEPTED AND MERGED`.

### B.4 Responsabilidades (resumo)

| Papel | Decide | Produz | Nunca |
|---|---|---|---|
| PO | o quê/porquê, prioridade, aceite | Issues DoR, aceite com evidência | implementa; define como técnico |
| ORCHESTRATOR | fluxo/sequência (não produto) | handoffs, estados, relatório | decide produto/ADR/merge estrutural/deploy |
| SENIOR | como (dentro dos ADRs) | análise, tarefas, testes, ADR proposal | aceita ADR; aprova QA; aceite funcional |
| PLENO | implementação (escopo) | código, testes, PR | expande escopo; mascara falha; auto-aprova |
| REVIEWER/QA | veredito técnico | `APPROVED/QA_FAILED/BLOCKED` | corrige código; revisa trabalho próprio |

### B.5 Autonomia

**Permitido ao Orchestrator (L1/L2):** distribuir tarefas; selecionar agente; preparar contexto; controlar workflow; validar handoffs; mover estados permitidos; detectar bloqueios; solicitar retry; abrir PR normal; acompanhar CI; encaminhar revisão humana.

**Proibido (L3/NEVER):** decidir prioridade; aceitar produto; aceitar ADR; mudar arquitetura sem aprovação; alterar governance; mudar Human Gates; deploy; trabalhar com dados reais; decidir merge estrutural; substituir Rodrigo/PO.

**Merge:** após HG-F2-03, expressa uma política única por classe de PR (normal autônomo sob condições / estrutural humano). Sem HG-F2-03, manter literalmente `AUTONOMY_POLICY` (L3) e registrar o conflito (Fase 0 P0-1).

### B.6 STOP conditions (o Orchestrator para imediatamente; nunca "dá um jeito")

1. Requisito ambíguo · 2. AC não testável · 3. Decisão de produto necessária · 4. ADR necessário · 5. Mudança arquitetural não autorizada · 6. Escopo fugir da Issue · 7. CI quebrado de forma recorrente (3×) · 8. Falha de segurança · 9. Credencial exposta · 10. Dados reais envolvidos · 11. Human Gate necessário · 12. Evidência insuficiente · 13. Documentação divergir do código · 14. Agente ultrapassar responsabilidade · 15. Loop QA > 3 · 16. Tentativa de DONE sem todos os requisitos.

Detecção: cada check num ponto de handoff; loop QA contador por PR; CI monitorado por ORCH.

### B.7 QA — independência e evidência

- Fluxo obrigatório: `PLENO → QA → QA_APPROVED/QA_FAILED`. **Nunca** o mesmo agente implementa e valida.
- Independência é **procedural** (agentes sob a mesma conta GitHub — limitação registrada, não escondida). Mitigação atual: permissões restritas + obrigação de evidência + proibição de auto-aprovação.
- **Evolução futura (registrada, não implementada):** contas de serviço dedicadas / identities GitHub próprias quando viável no plano atual — documentada em `GITHUB_WORKFLOW.md §Identidade`.
- Evidências mínimas por etapa:

  | Etapa | Mínimo |
  |---|---|
  | `IMPLEMENTING → QA_REVIEW` | testes executados + `npm run verify` verde + PR |
  | `QA_REVIEW → QA_APPROVED` | CI verde + AC um-a-um + relatório `qa/<issue>` |
  | `HUMAN_REVIEW → PO_ACCEPTED` | diff + testes + QA + riscos + impacto |
  | `DONE` | QA_APPROVED AND PO_ACCEPTED AND MERGED |

### B.8 GitHub

- **Issues** = entrada (DoR). **PRs** = handoff. **CI** (`ci.yml` + `e2e.yml`) = pré-condição dura de QA e merge (verde). **Project** = fonte de estados (após HG-F2-02).
- Sem branch protection (Free plan, `BLOCKED_BY_GITHUB_PLAN`) → disciplina + trilha imutável no PR.
- PR #75 (dependabot): sem ação nesta fase — requer decisão humana separada.
- Orquestrador executa operações read/write de Issues/Project via `gh` (least privilege; deny push/force/merge estrutural).

### B.9 Fallback V1

- `START_FACTORY` V1 permanece íntegro; ORCH é aditivo.
- Critérios de fallback: falha do ORCH, dúvida honesta, infra — retornar ao protocolo V1 sem perda de estado (mesmo campo `Status`).
- Remoção da V1 **nunca** automática: só após 2–3 ciclos reais, gates verdes, handoffs OK, QA independente e **decisão humana**.

---

## C. HUMAN GATES NECESSÁRIOS

Cada gate segue o formato canônico (`HUMAN_DECISION_REQUIRED`) e **bloqueia a mudança correspondente** até aprovação. `default-safe: none` — nada é implementado pelo default.

### HG-F2-01 — Criar agente ORCHESTRATOR + atualizar governança

- **Motivo:** altera Factory e `docs/factory/*` (Level 3 por `AGENT_GOVERNANCE.md:52`) e `.opencode/`.
- **Impacto:** V2 operacional; V1 permanece como fallback.
- **Decisão necessária:** A) Aprovar criação/atualização (via PR com revisão independente) · B) Ajustar escopo · C) Rejeitar.

### HG-F2-02 — Modelo de estados canônico (14)

- **Motivo:** altera o campo `Status` do Project (edição administrativa GitHub) e `DEVELOPMENT_WORKFLOW.md`.
- **Impacto:** uma única máquina de estados; sem paralela.
- **Decisão:** A) Adotar conjunto V2 (mapa da seção B.2) · B) Ajustar · C) Rejeitar.

### HG-F2-03 — Política definitiva de merge (resolve P0-1)

- **Motivo:** conflito entre `AUTONOMY_POLICY`/`AGENT_ORCHESTRATION` (L3) e `FACTORY_RUNBOOK §9` (autônomo condicionado).
- **Opções:** A) Autônomo por classe (normal sob condições; estrutural L3) — alinhado ao runbook §9 · B) Manter L3 para tudo (rolling back ao §9) · C) Regra mista com gates extras.
- **Decisão:** A (recomendada) — registrada em FONTE ÚNICA.

### HG-REC-01 — Autorização da reconciliação do estado

- **Motivo:** fechar #45–#49 (implementação mergeada), atualizar `FACTORY_STATUS.md`, `README.md`, `CHANGELOG.md` e corrigir referências incorretas (Playwright/Selenium, ADRs, HG, estados).
- **Opções:** A) Autorizar lote completo · B) Autorizar somente issues · C) Autorizar em partes.
- **Decisão:** Autorização human direta (Rodrigo).

### Gates em aberto (externos a esta fase, mantidos)

- **HG-PR-SEC** — bloqueia #54/#55 (password hardening/rate limit). Continua `needs:decision`.
- **HG-006** (custo/provedor) · **HG-007** (credenciais) — event-driven, não acionados.

---

## D. RECONCILIAÇÃO DO ESTADO (PLANO — aguardando HG-REC-01)

### D.1 Issues #45–#49 (implementação mergeada, Issues abertas)

Não fechar automaticamente. Cada fechamento exige **evidência + justificativa**:

| Issue | PR (closes) | Commit de conteúdo | Evidência |
|---|---|---|---|
| #45 — Wire handlers no worker (P0.1-A) | #61 (`0985b19`) | `ddbe530` | anc es de HEAD; testes CI verdes |
| #46 — Scheduler periódico (P0.1-B) | #62 (`dc8a97d`) | `7340089` | anc es de HEAD; `scheduler.test.ts` |
| #47 — Provider CommunicationChannel (P0.1-C) | #63 (`c404df5`) | `b0412e7` | anc es de HEAD; `channel-provider.test.ts` |
| #48 — Adapter Mailpit (P0.1-D) | #64 (`67c4267`) | `90a9df7` | anc es de HEAD; `mailpit.test.ts` |
| #49 — Correlação resposta↔item (P0.1-E) | #65 (`727b10b`) | `b6b2b75` | anc es de HEAD; `correlacao.test.ts` |

Precedente: **#50** foi fechada do mesmo modo (PR #66 / `8d7c11b`). Todas atendem `DONE = QA_APPROVED AND PO_ACCEPTED AND MERGED`.
**Justificativa de fechamento:** implementação mergeada; apenas o *tracking* ficou aberto. Não reabrir dependentes.

### D.2 Documentação

| Doc | Correção planejada |
|---|---|
| `FACTORY_STATUS.md` | main `df7a997`; P0.1 concluído (remover blocker P0.1); próx passo = Fase 1 da V2; registrar HG-F2-* pendentes |
| `README.md` | banner/estado runtime P0.1; sessão doc desatualizada |
| `CHANGELOG.md` | destravar: ADRs Accepted (HG-002), MVP-01, Gmail (HG-008), runtime P0.1, merges #61–#71 |
| Referências Playwright | `DEMO_FACTORY_STORY.md`, `DEMO_FACTORY_PLANNING_REPORT.md`, `QA_CORRECTIVE_GATE_REPORT.md` → Selenium |
| ADRs | headings `Decision (proposed)` → status Accepted (cosmético) |
| Estados divergentes | consolidar V2 (HG-F2-02) |
| HG conflitantes | reconciliar numeração catálogo vs log (HG-004/005/006/007) depois de HG-F2-03 |

Regra: nenhum conflito normativo resolvido silenciosamente — cada correção registrada com referência e, quando mudar norma, via PR com revisão independente.

---

## E. PRIMEIRA PROVA DA FACTORY V2 — RECOMENDAÇÃO

**Escolha recomendada: `#51 — Auditoria consultável por entidade/tenant (PRM-P0.2-A).`**

| Critério | #51 | #58 |
|---|---|---|
| Escopo | Contido (IN/OUT explícitos) | Contido |
| Risco estrutural | Baixo (endpoint GET + query) | Baixo (query listagem) |
| ADR pendente | Nenhuma ("Nenhuma (A∥B∥C)") | Nenhuma |
| AC claros | **4 AC objetivas** (CA-04-1..4: filtros, RLS cross-tenant, 403, append-only) | (sem AC detalhada; requer decisão de prioridade do PO) |
| Testes | RLS/vazamento, RBAC 403, append-only preservado | depende de decisão |
| Valor | P0 — destrava P0.2 (#9 CA-04) | P2 backlog |
| Implícito na Issue | Escopo/agente/QA definidos | **"NAO executar nesta fase"** |

**#58 está textualmente marcada como "não executar nesta fase" no próprio corpo** — não é candidata agora.
**#51 valida todos os handoffs** (PO→ORCH→SENIOR→PLENO→QA→HUMAN→PO→DONE) com segurança real (RLS/RBAC) exercitando QA. Risco residual baixo e valor P0.

**Não iniciar implementação sem autorização humana (Rodrigo).**

---

## F. PLANO DE IMPLEMENTAÇÃO (ETAPAS PEQUENAS)

1. **Fase 0 — commits docs:** versionar relatório da Fase 0 (PR `docs/*`, autorizado); registrar plano da Fase 1 (este documento).
2. **Gates HG-F2-01/02/03 + HG-REC-01:** Rodrigo decide (formato canônico). Nada de V2 antes disso.
3. **Reconciliação (após HG-REC-01):** fechar #45–#49 com evidência; atualizar `FACTORY_STATUS`/`README`/`CHANGELOG`/Playwright; commits em branch `chore/f2-reconciliação`.
4. **HG-F2-03 aplicado:** política única de merge registrada nas 3 fontes (AUTONOMY_POLICY, AGENT_ORCHESTRATION, FACTORY_RUNBOOK) com cross-reference.
5. **Criar Orchestrator (após HG-F2-01):** `.opencode/agent/servium-orchestrator.md` + `command/start-orchestrator.md` + `docs/factory/ORCHESTRATOR.md`; atualizar AGENT_TEAM/ORCHESTRATION/DEVELOPMENT_WORKFLOW/HANDOFF/AUTONOMY (PR único, revisão independente).
6. **HG-F2-02 aplicado:** editar no GitHub Project o campo `Status` → 14 estados; atualizar `GITHUB_WORKFLOW.md`.
7. **Prova de conceito:** executar **#51** pelo fluxo V2 completo (supervisionado), com QA independente e evidências; medir handoffs/STOPs.
8. **Avaliação:** 2–3 ciclos reais verdes → se aprovado por humano, considerar desativação gradual do START_FACTORY V1 (nunca automática).

Cada etapa pequena e revertível; nenhuma etapa exige alteração de banco/UI/API do produto.

---

## G. EVOLUÇÃO FUTURA DA UX — CONTEXTO DE PRODUTO (NÃO IMPLEMENTAR)

Registrado como roadmap/contexto de produto, por decisão de Rodrigo. **Nenhuma implementação nesta Fase 1.** Não misturar níveis: a Factory constrói/mantém Funcionários Digitais; o Servium permite ao cliente supervisionar/configurar/corrigir/interagir.

### G.1 Princípio de produto
>
> A Factory constrói e mantém os Funcionários Digitais. O Servium permite ao cliente supervisionar, configurar, corrigir e interagir com esses Funcionários Digitais.

O produto não deve parecer um CRUD administrativo. Deve mostrar: **"O que o Funcionário Digital está fazendo, o que já fez, o que aguarda e onde precisa de ajuda."**

### G.2 Dashboard operacional

Responder "Como está minha operação agora?": clientes; obrigações em dia/pendentes/atrasadas; ciclos em execução; exceções; pendências aguardando cliente; atividades recentes do FD.

### G.3 Visão do cliente

Situação atual; obrigações; documentos; pendências; ciclos; atividades recentes; ações do FD; o que depende do cliente — sem navegar por múltiplas telas para entender por que uma obrigação parou.

### G.4 Ciclos (redesign)

Abandonar apresentação puramente técnica; mostrar empresa, obrigação, período, progresso, etapa atual, última/próxima ação, pendências, documentos, exceções, histórico, responsável pela próxima ação. Preferência: timeline/progresso operacional (ex.: Empresa ABC → Documentos solicitados → Contrato recebido → CNPJ pendente → Cobrança enviada → Aguardando cliente → Próxima ação).

### G.5 Atividade do Funcionário Digital

Linha do tempo estilo feed (hora, ação, para/de quem, status), com detalhe por atividade (empresa, pendência, canal, destinatário, motivo, ação executada, próxima ação, status).

### G.6 Filtros de atividade

Período/horário (Hoje; Ontem; 7/30 dias; personalizado); atividade (verificações, solicitações, cobranças, documentos recebidos/enviados, consultas fiscais, alterações, interações, exceções, intervenções); empresa (busca pesquisável); status/resultado (concluído, aguardando cliente/documento, em execução, erro, requer intervenção); limpar filtros; contagem; combinação. Ex.: "tudo que o FD fez para a Empresa ABC nos últimos 7 dias ainda aguardando."

### G.7 Central de Interações

Não é chat com IA genérico: perguntar; solicitar ação; instruir; corrigir; intervir; explicar decisão; consultar histórico; ver impacto da instrução. Ações sensíveis: interpretação → confirmação → execução. Ex.: "Não cobre a Empresa ABC novamente hoje."

### G.8 Instruções / Regras (ensinar o FD)

Criar/editar/ativar/desativar regra; histórico; versão; autor; motivo; impacto. **Sem "aprendizado autônomo":** instrução explícita → regra versionada → execução rastreável → reversão.

### G.9 Encaminhamento

Estes requisitos deverão ser formalizados como épicos/histórias de produto pelo PO (com Rodrigo), com seus próprios gates, em fase futura. Não geram tarefa nesta Fase 1.

---

## CRITÉRIOS DE SUCESSO DA FASE 1 (checklist)

- [x] Plano completo da Factory V2 (arquitetura, workflow único, contratos, STOP, autonomia, QA, GitHub, fallback)
- [x] Human Gates identificados e formalizados (HG-F2-01/02/03, HG-REC-01)
- [x] Estratégia V1→V2 definida (preservar/fallback; remoção nunca automática)
- [x] Reconciliação planejada (#45–#49 com evidência; docs)
- [x] Primeira Issue recomendada (#51)
- [x] Evolução UX registrada como contexto de produto (não implementada)
- [x] Nenhuma alteração não autorizada no produto (API/UI/DB/governança intactos)

Estado final: **`FACTORY_V2_PHASE1_DESIGN_READY`** — NÃO é `DONE`. Aguarda aprovação humana da fase por Rodrigo.
