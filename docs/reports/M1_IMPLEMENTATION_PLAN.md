# M1 — Plano de Implementação (Product/UX)

> **Modelo/plataforma:** agente de IA (big-pickle) atuando como `servium-orchestrator` sobre o repositório **ServiumAI** (monorepo npm workspaces: `apps/web` React+Vite SPA, `apps/api` NestJS, `apps/e2e` Selenium, `apps/runtime-e2e`, `packages/db` PostgreSQL+RLS, `packages/shared-types`).
> **Tipo:** planejamento + especificação de aceite. **NENHUMA implementação nesta tarefa.**
> **Fonte primária:** `docs/reports/UX_PRODUCT_GAP_ANALYSIS.md` (gap GAP-01 — jornada de configuração; GAP-02 e demais em linguagem/auditoria/estados/comunicações/exceções/cobertura E2E).
> **Estado M0:** PR #96 validada tecnicamente, `AWAITING_HUMAN_DECISION` — **não mergeada**; este plano assume M0 (Design System, a11y, menu mobile) como fundação aprovada para M1.

---

## 1. Contexto

O MVP-01 (vertical slice do Funcionário Digital) tem motor, banco, auditoria e API funcionais e testados, mas a **interface não conecta a jornada principal do usuário**. A análise `UX_PRODUCT_GAP_ANALYSIS.md` confirmou, com evidência de código:

1. **GAP-01 (impedimento funcional):** a UI de Obrigações não permite configurar o Checklist Template necessário; `POST /obrigacoes` nem o DTO aceitam `template_id`; o motor só materializa itens a partir de `obrigacao.template_id` → **todo ciclo ativado pela UI nasce com 0 itens** (o próprio E2E atual espera `Itens (0)`).
2. **GAP-02:** `GET /auditoria` está pronto e testado no backend, mas a tela `/auditoria` mostra apenas `/metrics` + `/health`.
3. **Linguagem técnica:** badges com estados crus (`pendente`, `aguardando`, `escalada_limite`), contexto JSON exposto, `UUID.slice(0,8)`, IDs, `Correlation ID`, `Uptime`.
4. **Comunicações:** `mensagens_comunicacao` existe e é ricamente populada, mas a UI mostra colunas técnicas sem conteúdo compreensível.
5. **Cobertura E2E:** formulários reais (cliente, obrigação, template, decisão, auditoria) não são exercitados pela UI.

A M1 deve transformar essa base em uma experiência em que o usuário **entenda o que a Funcionária Digital faz, por que faz, qual o resultado e quando precisa intervir** — tudo auditável e em linguagem de negócio.

## 2. Objetivo

Entregar a **jornada M1 completa pela UI**, sem SQL e sem intervenção técnica:

```text
Login
 → criar cliente (form real)
 → criar/configurar obrigação + checklist (template + itens)
 → ativar ciclo
 → confirmar itens > 0
 → acompanhar execução da Funcionária Digital
 → visualizar resultado
 → entender exceção quando houver
 → tomar decisão (resolver/cancelar/reenviar) quando necessária
 → ver tudo na trilha de auditoria em linguagem de negócio
```

Para cada ponto a interface deve responder: **o que aconteceu, por que aconteceu, qual o resultado, o que a Funcionária Digital fará agora, preciso intervir?**

## 3. Problemas que a M1 resolve

| # | Problema | Origem | Resolvido por |
|---|---|---|---|
| P-01 | Ciclos ativados pela UI nascem com `0 itens` — FD não executa | GAP-01 | M1.1 (configurar template/vínculo) + M1.2 |
| P-02 | Sem UI para criar Checklist Template e seus itens | GAP-01 | M1.1 |
| P-03 | Sem vínculo obrigação→template acessível (só SQL/seed) | GAP-01 | M1.1 |
| P-04 | Auditoria real invisível na UI (só `/metrics`+`/health`) | GAP-02 | M1.4 |
| P-05 | Estados/tipos/contexto cru exibidos (jargão técnico) | §7/§8 da análise | M1.5 + M1.6 |
| P-06 | Comunicações da FD sem conteúdo/preview compreensível | análise §7 | M1.7 |
| P-07 | Reenviar sem confirmação (ação sensível sem modal) | análise UX-09 | M1.8 |
| P-08 | Conteúdo da FD não é explicado (“por quê cheguei aqui?”) | demanda do Owner | M1.3 + M1.6 |
| P-09 | Formulários reais sem cobertura E2E | análise §6 | M1.9 |

## 4. Escopo

**Blocos M1 (todos dentro do escopo desta entrega de planejamento):**

- **M1.1** Jornada de configuração (template + itens + vínculo obrigação→template + ativação).
- **M1.2** Jornada completa pela UI com dados reais (`itens > 0` no sucesso).
- **M1.3** Especificação de comunicação da Funcionária Digital (ação → motivo → resultado → próximo passo → intervenção).
- **M1.4** Integração UI com `GET /auditoria` (prioridade: o que aconteceu / quem / quando / entidade / resultado).
- **M1.5** Especificação de tradução de estados e linguagem consistente em Dashboard/Ciclos/Detalhe/Exceções/Auditoria.
- **M1.6** Experiência de exceções (cliente, obrigação, documento, tentativas, motivo, decisão — contexto JSON oculto).
- **M1.7** Apresentação das comunicações (destinatário, remetente, data, assunto/preview, direção, status, resultado).
- **M1.8** Confirmação para ações sensíveis (reenviar, cancelar, resolver).
- **M1.9** PageObjects + testes E2E reais e regressão.
- **M1.10** Visual: reutilizar Design System M0; prioridade clareza de operação.

**Limite de backend sugerido (a validar nas Decisões Arquiteturais):** nenhum novo endpoint obrigatório é necessário para o núcleo da M1 — a solução mínima reutiliza `POST /checklist-templates` e `GET /auditoria` existentes e adiciona `template_id` a `POST /obrigacoes`. Novos endpoints (ex.: editar template, `PATCH /obrigacoes/:id`) são **opcionais e dependem de decisão humana**.

## 5. Fora de escopo (POST_M1 / NÃO nesta M1)

- Dashboard analítico avançado, gráficos temporais, analytics, dark mode, relatórios avançados, exportações, novas integrações.
- Upload de documentos (tabela `documentos` existe, sem endpoint/UI).
- Recharts, shadcn, substituição de biblioteca visual, novo Design System.
- Retenção/purge (HG-RETENÇÃO) — permanece `DEFERRED`.
- Mudanças em Human Gates, merge de M0/PR #96, liberação de M1 automática.

> Itens importantes fora do núcleo → classificar como `POST_M1` (ver §19, decisões de escopo).

## 6. Arquitetura atual relevante

| Camada | Peças-chave | Papel na M1 |
|---|---|---|
| Banco | `clientes`, `obrigacoes` (**`template_id`**), `checklist_templates`, `itens_template`, `ciclos` (**`config`** jsonb), `itens_ciclo`, `mensagens_comunicacao`, `mensagens_gmail`, `excecoes`, `eventos_auditoria`, `documentos` (sem endpoint) | base de dados já suficiente para M1 |
| API | `POST/GET /clientes`, `POST/GET /obrigacoes`, `POST/GET /checklist-templates`, `POST /ciclos`, `GET /ciclos/:id`, `GET /ciclos/:id/excecoes`, `POST /ciclos/:id/cancelar`, `POST /ciclos/itens/:itemId/decidir`, `POST /ciclos/itens/:itemId/reenviar`, `GET /auditoria` (admin, filtros+keyset), `GET /metrics`, `GET /health`, auth (`/auth/login, logout, me, trocar-senha`, gmail) | núcleo de M1 já existe; pequenas alterações |
| Motor | `motor/handlers.ts` (`ativarCiclo`, `cobrarItem`, `tickCiclos`, `encerrarCiclo`), `engine.ts` (`decidirAcao`, `LIMITES_PADRAO`), `channel.ts`, `runtime/recebimento.ts`, fila `jobs_fila` (ADR-006) | **sem alteração obrigatória para M1** |
| Web | páginas: Login, Dashboard, Clientes, Obrigacoes, Ciclos, CicloDetalhe, Excecoes, Auditoria; componentes `Card/Table/Badge/Button/Field/Modal`; `StatusBadge` (mapeia tom p/ estado) | alvo principal da M1 |
| Testes | API 108+, web unit, db 24, runtime-e2e (seed SQL), E2E Selenium 31 (`apps/e2e`) | M1.9 amplia cobertura de formulários |

## 7. Análise técnica (JÁ EXISTE / PRECISA DE ALTERAÇÃO / PRECISA SER CRIADO)

### 7.1 Endpoints existentes

| Endpoint | Método | Papel | Status M1 |
|---|---|---|---|
| `POST/GET /clientes` | POST/GET | CRUD cliente | JÁ EXISTE (sem alteração) |
| `POST/GET /obrigacoes` | POST/GET | CRUD obrigação | **PRECISA DE ALTERAÇÃO** (aceitar `template_id`) |
| `POST/GET /checklist-templates` | POST/GET | Cria template + itens (atômico) / lista | JÁ EXISTE (reutilizar na UI) |
| `POST /ciclos` | POST | Ativa ciclo + enfileira `ciclo.ativar` | JÁ EXISTE (motor lê `obrigacao.template_id`) |
| `GET /ciclos/:id` | GET | Detalhe (info + itens + exceção + comunicacoes) | JÁ EXISTE (enriquecer conteúdo p/ M1.3/M1.7) |
| `GET /ciclos/:id/excecoes` | GET | Exceções abertas do ciclo | JÁ EXISTE |
| `POST /ciclos/:id/cancelar` | POST | Cancelar ciclo (idempotente, motivo) | JÁ EXISTE (#73) |
| `POST /ciclos/itens/:itemId/decidir` | POST | Decisão humana `resolvido` ou `cancelado` (admin) | JÁ EXISTE |
| `POST /ciclos/itens/:itemId/reenviar` | POST | Reenvio (admin; respeita limites) | JÁ EXISTE |
| `GET /auditoria` | GET | Trilha com filtros + cursor keyset (admin) | JÁ EXISTE — usar na UI (M1.4) |
| `GET /metrics`, `GET /health` | GET | Telemetria/saúde | JÁ EXISTE — mover p/ camada técnica secundária |

**Resumo:** o núcleo funcional **não exige endpoint novo**. A menor alteração é `POST /obrigacoes` + DTO (`template_id` opcional, validado por tenant). Novos endpoints (`PATCH /obrigacoes/:id`, `POST /templates/:id/*`, edição) → **decisão** (§19).

### 7.2 DTOs / shared types

| DTO | Status |
|---|---|
| `CriarClienteInput`, `ClienteDTO` | JÁ EXISTE |
| `CriarObrigacaoInput` | **PRECISA DE ALTERAÇÃO** — adicionar `template_id?: string` |
| `ObrigacaoDTO` | **PRECISA DE ALTERAÇÃO** — expor `template_id` (e idealmente nome do template, via join, p/ exibição) |
| `CriarChecklistTemplateInput`, `ItemTemplateInput`, `ChecklistTemplateDTO` | JÁ EXISTE |
| `EventoAuditoriaDTO` (`packages/db`) | JÁ EXISTE |

### 7.3 Tabelas / migrations

| Tabela | Status M1 |
|---|---|
| `clientes`, `obrigacoes(+template_id)`, `checklist_templates`, `itens_template`, `ciclos(+config)`, `itens_ciclo`, `mensagens_comunicacao`, `mensagens_gmail`, `excecoes`, `eventos_auditoria`, `sessoes`, `jobs_fila`, `documentos` (sem endpoint) | JÁ EXISTE — **sem migration nova para o núcleo M1** |
| Resolver `actor_id → nome` na Auditoria | **PRECISA DE ALTERAÇÃO** (join/enrich no controller ou `detalhes`) — sem migration |

> Decisão de dados (§19): (a) nome do operador resolvido por consulta `operadores` no controller de auditoria (mínima, sem migration); ou (b) gravar `detalhes.operador_nome` no momento do evento (mais cópia, mais simples na query). Recomenda-se (a).

### 7.4 Motor / handlers

| Rotina | Status M1 |
|---|---|
| `ativarCiclo` (lê `obrigacao.template_id`, audita `ativacao_sem_template` se ausente) | JÁ EXISTE — nenhuma alteração obrigatória |
| `cobrarItem`, `tickCiclos`, `encerrarCiclo`, `decidirAcao`, recebimento/correlação | JÁ EXISTE |
| Mensagem da FD (assunto/corpo) | JÁ EXISTE (estrutura atual já é linguagem de negócio: “Pendência documental: …”, “Olá {cliente}, precisamos de: …”) |

> Conclusão: **motor não muda na M1**. A “comunicação” da M1.3/M1.7 é camada de apresentação/dados derivados do que já é registrado.

### 7.5 Web (componentes/páginas)

| Peça | Status M1 |
|---|---|
| `ObrigacoesPage` (form Cliente/Descrição/Prazo + seção Templates só-leitura + botão Ativar ciclo) | **PRECISA DE ALTERAÇÃO** — select de template no form; estado quando não há templates; bloquear ativação sem template |
| Criação de Template (UI: nome + itens dinâmicos [descrição, tipo esperado, ordem, tamanho]) | **PRECISA SER CRIADO** (nova página ou seção; reutiliza `POST /checklist-templates`) |
| `CiclosPage` (form ativar + lista) | **PRECISA DE ALTERAÇÃO** — indicar obrigação sem template; evitar ativação vazia |
| `CicloDetailPage` (badges crus, contexto JSON, comunicacoes técnicas) | **PRECISA DE ALTERAÇÃO** — M1.3/M1.5/M1.6/M1.7/M1.8 |
| `ExcecoesPage` (consolida N ciclos via multi-fetch; contexto JSON) | **PRECISA DE ALTERAÇÃO** — M1.6 + otimizar (ver riscos) |
| `DashboardPage` (cards + “Ciclos recentes” com estado cru) | **PRECISA DE ALTERAÇÃO** — M1.5 (labels) |
| `AuditoriaPage` (hoje `/metrics`+`/health`) | **PRECISA SER REESCRITA** — M1.4 (consumir `GET /auditoria`) |
| Camada de tradução de estados/linguagem | **PRECISA SER CRIADO** — helper `estado.ts`/`labels.ts` (M1.5), reutilizado por todas as páginas |
| `StatusBadge`/`Badge` | **PRECISA DE ALTERAÇÃO** — mapear todos os estados a tom + label (hoje cobre parcial `aguardando/resolvido` e ciclos usam estado cru) |
| Modal | JÁ EXISTE (a11y) — reutilizar p/ ações sensíveis |
| API client `/api/client.ts` | JÁ EXISTE |

### 7.6 Testes existentes

| Suite | Status M1 |
|---|---|
| API (`apps/api/test`): auditoria, motor, excecoes, ciclo-detalhe, correlacao, cancelar, identidade-servico, etc. | JÁ EXISTE — pequenos ajustes apenas se backend mudar |
| DB (`packages/db/tests`): audit, audit-lista, schema | JÁ EXISTE |
| Web unit (páginas com mocks) | JÁ EXISTE — ampliar p/ novas features |
| `apps/runtime-e2e` (seed SQL admin: template+itens+vínculo) | JÁ EXISTE — **é a referência de dados de jornada real**; pode ser migrado a usar a API p/ construir o vínculo |
| `apps/e2e` Selenium (31 testes) | JÁ EXISTE — ver §13 |

### 7.7 Selenium PageObjects

| PageObject | Status |
|---|---|
| `LoginPage`, `LayoutPage`, `ObrigacoesPage`, `CiclosPage`, `CicloDetailPage` | JÁ EXISTE |
| `ClientesPage` (cadastro de cliente via UI) | **PRECISA SER CRIADO** |
| `TemplatesPage`/seção template (criar template + itens via UI) | **PRECISA SER CRIADO** |
| `ExcecoesPage` (decisão resolvido/cancelado/reenviar via UI) | **PRECISA SER CRIADO** |
| `AuditoriaPage` (validar evento aparece na UI) | **PRECISA SER CRIADO** |

## 8. Jornada principal (M1.1 + M1.2)

**Proposta de fluxo (UI):**

1. **Clientes** — form real: Nome (obrigatório), Identificação (CPF/CNPJ), E-mail. *(JÁ EXISTE)*
2. **Templates** — nova tela/seção “Checklist”: criar com Nome + itens (Descrição, Tipo esperado [documento/informação/assinatura], Ordem, Tamanho máx. opcional); editar nome/itens (decisão — ver §19); listar. *(API JÁ EXISTE; UI A CRIAR)*
3. **Obrigações** — form com Cliente + Descrição + Prazo + **seletor de Template (checklist)**; ao ativar, se não houver template configurado → mensagem orientativa (“configure um checklist antes de ativar”) e **bloqueio de ativação**. *(ALTERAÇÃO)*
4. **Ciclos** — form de ativação: seleciona obrigação (mostra cliente + se possui template ✓/✗); **ativação só libera p/ obrigação com template** → ciclo nasce com `itens > 0`. *(ALTERAÇÃO)*
5. **Detalhe do ciclo** — apresentar itens com estado em linguagem de negócio (M1.3/M1.5), comunicacoes com preview (M1.7), exceções explicadas (M1.6), ações com confirmação (M1.8).

**Critério de “funcionou”:** ativar uma obrigação configurada produz um ciclo cujo detalhe exibe **itens > 0** (o E2E para de esperar `Itens (0)`).

## 9. Jornada da Funcionária Digital (M1.3 — especificação de conteúdo)

Para **cada estado do item**, especificar 5 campos apresentados como cartão/linha:

| Estado técnico | Título p/ usuário | Texto (motivo + ação da FD) | Próximo passo | Intervenção humana? |
|---|---|---|---|---|
| `pendente` | Ainda não enviado | “A Funcionária Digital ainda não solicitou este item.” | Aguardar primeira tentativa (respeita janela/horário) | Não |
| `cobrado` | Solicitação enviada | “O documento estava pendente e foi solicitado ao cliente.” | Aguardar resposta | Não |
| `aguardando` | Aguardando resposta do cliente | “A solicitação foi enviada e ainda não recebemos o documento.” | A FD re-tenta em até 3 vezes dentro da janela | Não |
| `recebido` | Resposta recebida | “O cliente respondeu; o envio está sendo processado/vinculado.” | Validar o que foi recebido | Não (em breve validação humana) |
| `resolvido` | Concluído | “Este item foi atendido (documento recebido/validado ou marcado resolvido).” | Nenhum | Não |
| `cancelado` | Cancelado | “Este item foi cancelado (por decisão humana ou encerramento).” | Nenhum | Não |
| `excecao` | Atenção necessária | “A Funcionária Digital tentou por 3 vezes sem resposta e escalou para análise.” | **Analisar a exceção e decidir** | **Sim (admin)** |

**Variantes de tipo de exceção (`excecoes.tipo`):**

| Tipo técnico | Linguagem |
|---|---|
| `escalada_limite` | “As 3 tentativas de solicitação foram esgotadas sem resposta do cliente.” |
| (futuros) | mapear no helper de estados |

**Princípio:** cada linha de item/ciclo deve poder responder “o que aconteceu, por quê, resultado, próximo passo, preciso intervir?”. Não implementar textos agora — a tabela acima é a **especificação aprovada de conteúdo**.

## 10. Auditoria (M1.4)

**Integração:** `AuditoriaPage` passa a consumir `GET /auditoria` (admin) com filtros disponíveis (`entidade`, `entidade_id`, `acao`, `limite`, paginação via `antesDe/antesId`).

**Trilha por evento (prioridade):**

| Componente | Como exibir |
|---|---|
| O que aconteceu | tradução de `acao` (ex.: `ativar` → “Ciclo ativado”; `cobrar` → “Funcionária Digital enviou solicitação”; `decidir` → “Operador decidiu”; `escalar` → “Escalado por tentativas esgotadas”) |
| Quem fez | `actor_type` traduzido (`operador`→“Operador”, `servico`→“Funcionária Digital”, `sistema`→“Sistema”) + `actor_id` resolvido p/ nome via `operadores` |
| Quando | `criado_em` formatado pt-BR |
| Em qual cliente/ciclo | `entidade`/`entidade_id` traduzidos (exibe nome do cliente/obrigação quando um vínculo de entidade estiver disponível; senão, ID encurtado em camada secundária) |
| Resultado | `detalhes` traduzidos (não JSON cru) |

**Camada técnica secundária (colapsada/oculta por default):** `entidade_id`, `correlationId`, `endpoint`, `status HTTP` — jamais como informação principal.

**Filtros de UX propostos:** período, entidade (ciclo/cliente), ação, ator. **Não é necessário novo endpoint** — os filtros do backend já existem.

## 11. Exceções (M1.6)

A tela de exceções deve responder, por linha/card:

- **Cliente** (nome) e **obrigação** (descrição);
- **Documento/item** (descrição) e **tentativas** realizadas;
- **O que a FD tentou** (texto traduzido da ação de cobrança, ex.: “enviou solicitação em X, Y, Z”);
- **Por que escalou** (tradução de `motivo`/`tipo` em linguagem natural);
- **Qual decisão o humano pode tomar:** Resolver (documento considerado atendido), Cancelar (desistir do item), Reenviar (nova solicitação, respeitando limites);
- **Contexto JSON nunca é apresentado diretamente** — convertido em sentença (`{"tentativas":3}` → “3 tentativas realizadas”).

Ações sensíveis (Resolver/Cancelar/Reenviar) sempre com modal de confirmação (M1.8). Otimização: hoje `ExcecoesPage` faz **1 fetch por ciclo** (N+1); se o volume crescer, avaliar endpoint agregador — risco/`.env` decisão (§16/§19).

## 12. Linguagem de negócio (M1.5)

**Helper central de estados** (novo, em `apps/web/src/lib/estados.ts` ou similar):

| Estado técnico | Nome p/ usuário | Explicação | Próxima ação |
|---|---|---|---|
| `pendente` | Ainda não enviado | Não houve tentativa de contato ainda | FD solicita na próxima janela |
| `cobrado` | Solicitação enviada | E-mail enviado ao cliente | Aguardar resposta |
| `aguardando` | Aguardando resposta | Solicitação enviada, sem retorno | FD re-tenta (até 3x) |
| `recebido` | Resposta recebida | Cliente respondeu com identificador | Processar/validar |
| `resolvido` | Concluído | Item atendido | — |
| `cancelado` | Cancelado | Item cancelado (decisão) | — |
| `excecao` | Escalado p/ análise | Tentativas esgotadas | Humano decide |
| `escalada_limite` (tipo exceção) | Tentativas esgotadas | 3 tentativas sem resposta | Humano decide |

**Consistência:** o helper é a **única fonte** usada por Dashboard, Ciclos, Ciclo Detalhe, Exceções e Auditoria (sem duplicação de mapeamento nas páginas — hoje `CicloDetailPage` usa estado cru e `StatusBadge` só cobre parte).

**Microtextos:** corrigir acentuação (Obri**gaç**ões, Des**cr**i**ç**ão, Ex**ce**ç**õ**es, In**for**mações, “Concluídos”, “Última ação”). **Regra: nenhum jargão técnico crítico no fluxo principal.**

## 13. Testes E2E (M1.9)

**PageObjects (novos):** `ClientesPage`, `TemplatesPage`, `ExcecoesPage`, `AuditoriaPage` (ver §7.7).

**Novos testes (jornadas reais):**

| Jornada | Cobertura | Assert-chave |
|---|---|---|
| Cliente | preencher todos os campos via UI | linha criada com dados |
| Obrigação + template | criar template (nome+itens) via UI; vínculo template na obrigação | obrigação salva com `template_id` |
| Ciclo com itens | ativar obrigação configurada | **detalhe mostra `itens > 0` e NÃO `Itens (0)`** |
| Bloqueio de ativação vazia | tentar ativar obrigação sem template | mensagem orientativa; **sem ciclo criado** |
| Exceção + decisão | atingir exceção (via runtime/mailpit ou seed aceito) e decidir resolve/cancela pela UI | item muda de estado; modal aparece |
| Auditoria | executar uma ação (ex.: ativar ciclo) e abrir `/auditoria` | evento aparece traduzido (ação, ator, data) |
| Reenviar | ação com modal de confirmação | confirmação exibida; conseq. aplicada |

**Regressão (manter verde):** login, auth/redirects, navegação, responsividade (mobile/desktop), RBAC (admin/operador, 403), acessibilidade (focus, modais, `aria`), health, ciclo (até o ponto atual + novos asserts `itens>0`).

**Automação da jornada real:** aproveitar `apps/runtime-e2e` (hoje seed SQL admin) como referência de dados de ponta-a-ponta; na M1 a UI deve ser capaz de produzir o mesmo vínculo via formulários.

## 14. Matriz de impacto

| Item | Frontend | Backend | DB | Motor | E2E | Risco | Complexidade |
|---|---|---|---|---|---|---|---|
| M1.1 DTO+`POST /obrigacoes` com `template_id` | M | M | — | — | M | Baixo (retrocompatível) | Baixa |
| M1.1 UI de templates (criar template+itens) | A | — | — | — | A | Médio (form dinâmico) | Média |
| M1.1 Bloqueio de ativação sem template (UI) | A | — | — | — | A | Baixo | Baixa |
| M1.2 `CiclosPage`/`ObrigacoesPage` indicação de template | A | — | — | — | A | Baixo | Baixa |
| M1.2 Jornada E2E completa (itens>0) | — | — | — | — | A | Médio (flakiness) | Média |
| M1.3 Cartas de comunicação da FD | A | M (enriquecer `/ciclos/:id` p/ item exceção/comunicacao) | — | — | A | Médio | Média |
| M1.4 AuditoriaPage → `GET /auditoria` | A | M (enrich `actor_id`→nome; opcional filters) | — | — | A | Baixo | Média |
| M1.5 Helper de estados + labels consistentes | A | — | — | — | M | Baixo | Baixa |
| M1.6 Exceções explicadas (contexto → sentença) | A | M (se enriquecer texto na API) | — | — | A | Médio | Média |
| M1.7 Comunicações com preview | A | M (derivar assunto/preview de `mensagens_comunicacao` + `itens_template`) | — | — | M | Baixo | Baixa |
| M1.8 Modais p/ reenviar (e reforço outros) | A | — | — | — | A | Baixo | Baixa |
| M1.9 PageObjects + testes novos | M | — | — | — | A | Médio | Média |
| **Otimização ExcecoesPage (N+1)** | A | M (endpoint agregador — **opcional**) | — | — | M | Médio | Média |

Legenda impacto: `A` (alterado/criado), `M` (pequena alteração/melhoria), `—` (sem impacto).
**Risco geral:** baixo–médio; nenhuma mudança de schema nem de motor para o núcleo.

## 15. Dependências

1. **M0 mergeado / aprovado** (PR #96) — a M1 se apoia no Design System M0 (Badge, Modal, Field, tokens). (Bloqueante; pode ser planejado em paralelo, mas implementação M1 só após decisão M0.)
2. `POST /checklist-templates` existente (sem alteração) — usado pela UI de templates.
3. `GET /auditoria` existente (sem alteração) — usado pela nova AuditoriaPage.
4. Resolver `actor_id → operador` (enrich) — define forma de exibir “quem”.
5. Dados de exceção/comunicação: a fonte é o que o motor já grava; nenhum novo registro no backend obrigatório.
6. E2E: infraestrutura atual (docker Postgres, API :3000, web :5173, Mailpit, Chrome 151) permanece a mesma.

## 16. Riscos

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Ciclos legados já criados com `0 itens` continuam vazios | Média | Médio | Migrar/reativar na M1 (com template); ou decisão de produto p/ reativar com template |
| Form dinâmico de itens de template (UI) mais complexo que o previsto | Média | Médio | Entregar versão mínima (lista de itens + descrição/tipo); edição avançada → `POST_M1` |
| E2E de exceção depende de gerar exceção real (motor+mailpit) | Alta | Médio | Reutilizar padrão do `runtime-e2e` (responses via Mailpit) e/ou seed controlado para atingir o estado de exceção determinístico |
| `ExcecoesPage` N+1 (fetch por ciclo) | Alta (no piloto) | Baixo | Aceitar no piloto OR optar por endpoint agregador (decisão) |
| Diferença de conteúdo exibido x registrado (assunto/corpo não persistidos) | Média | Baixo | Derivar preview da descrição do item/template (sem schema novo) |
| Deslize de regressão em regras admin (decidir/reenviar) | Baixa | Alto | Manter RBAC testado; modais não mudam regras de domínio |

## 17. Ordem de implementação (incremental)

```text
M1.1  Configuração (DTO/API obrigação com template + UI templates + bloqueio)
↓
M1.2  Jornada UI completa (obrigação → ciclo itens>0)
↓
M1.3  Execução/FD (cartas de estado, enriquecer detalhe do ciclo)
↓
M1.4  Transparência (comunicações com preview)
↓
M1.5  Auditoria (AuditoriaPage → GET /auditoria + enrich ator)
↓
M1.6  Exceções (experiência explicada + decisão)
↓
M1.7  Linguagem/estados helper + microtextos (pode ocorrer junto de M1.3/M1.6)
↓
M1.8  Modais de ações sensíveis (ready p/ usar em M1.6)
↓
M1.9  E2E completo + regressão
↓
M1.10 Visual/finalização (usar M0; clareza > decoração)
↓
QA (verify + CI) e revisão humana
```

> Nota: M1.5, M1.7 e M1.8 são transversais e podem ser colapsados em M1.3/M1.6 sem alterar o plano.

## 18. Critérios de aceite propostos

| # | Critério | Como verificar |
|---|---|---|
| C-01 | Operador cria cliente, template (nome+itens), obrigação com vínculo de template e ativa ciclo **sem SQL** | E2E jornada completa via UI |
| C-02 | Ativar obrigação configurada gera ciclo com **`itens > 0`**; sem template → orientação e **nenhum ciclo criado** | UI + E2E assert `itens>0`; assert bloqueio |
| C-03 | Cada estado exibido responde: ação, motivo, resultado, próximo passo, precisa intervir? | Verificação manual + unit de helper |
| C-04 | `AuditoriaPage` lista eventos reais de `GET /auditoria` com ação traduzida, ator, data, entidade e resultado | E2E: executar ação → ver evento na UI |
| C-05 | Nenhum jargão técnico crítico (GET/POST/endpoint/UUID/correlationId/status HTTP/estados crus/contexto JSON) no fluxo principal | Revisão de UI + unit |
| C-06 | Exceção explica cliente, obrigação, documento, tentativas, motivo e decisão; contexto JSON nunca cru | UI + E2E decisão |
| C-07 | Comunicações exibem destinatário, remetente, data, assunto/preview, direção, status, resultado | Unit + revisão |
| C-08 | Ações sensíveis (reenviar/cancelar/resolver) têm confirmação com consequência e resultado | E2E + unit |
| C-09 | Suíte E2E com PageObjects novos cobre formulários reais; regressão (RBAC, login, navegação, responsividade, permissões, acessibilidade) verde | `npm run verify` + E2E CI 4/4 |
| C-10 | Regressão total (`npm run verify` ≥ 178 testes) e lint/typecheck/build e `lint:docs` verdes | CI |

## 19. Decisões humanas necessárias (Rodrigo)

> Nenhuma dessas decisões será tomada pelo agente autonomamente.

### Decisões de produto

- **DP-01 — M0 (PR #96): `APPROVE` ou `REJECT`?** Bloqueante para iniciar M1.
- **DP-02 — Ciclos legados com `0 itens`:** migrar (vincular template e reativar), cancelar, ou ignorar?
- **DP-03 — Fluxo de config de template:** obrigatório na criação da obrigação (recomendado) vs. permitir criar obrigação sem template e só bloquear na ativação.

### Decisões UX

- **DUX-01 — Camada técnica secundária:** manter oculta por padrão, colapsável, ou remover? (recomendado: colapsável)
- **DUX-02 — Local da criação de templates:** página própria (`/templates`) vs. seção ampliada em Obrigações.
- **DUX-03 — Conteúdo das cartas da FD:** aprovar a tabela da §9 como redação padrão (ou ajustar tom/wording).
- **DUX-04 — Campos adicionais no cadastro de cliente:** manter o conjunto atual (Nome/Identi/E-mail) ou ampliar na M1?

### Decisões arquiteturais

- **DA-01 — Aceitar a solução mínima (sem novo endpoint):** `template_id` em `POST /obrigacoes` + reuso de `POST /checklist-templates` e `GET /auditoria`.
- **DA-02 — Resolução de `actor_id → nome`:** (a) enrich no controller de auditoria (recomendado) vs. (b) gravar nome em `detalhes`.
- **DA-03 — Endpoint agregador de exceções** (eliminar N+1): criar agora ou `POST_M1`? (recomendado: `POST_M1` no piloto).

### Decisões de escopo

- **DE-01 — Edição (PATCH/PUT) de obrigações e templates:** incluir na M1 (recomendado: **não** — criar é o mínimo para fechar a jornada) ou `POST_M1`.
- **DE-02 — Upload de documento / validação de arquivo:** confirmar `POST_M1` (fora) — não é necessário p/ fechar a jornada principal nesta M1.
- **DE-03 — Dashboard analítico/gráficos:** confirmar `POST_M1`.

### Decisões de dados

- **DD-01 — Persistência de assunto/corpo das comunicações:** derivar preview da descrição (recomendado, sem schema novo) vs. nova coluna (migration).
- **DD-02 — Retenção de eventos (HG-RETENÇÃO):** definir política numérica (item já `DEFERRED`; se avançar na M1, planejá-la).
- **DD-03 — Nome do ator na auditoria:** resolver no momento da exibição (via query) — ok? (evita duplicação).

## 20. Proposta de Human Gate M1

**Gate formal pré-implementação (`HUMAN_GATE_M1_APPROVAL`):**

| Campo | Valor proposto |
|---|---|
| Condição de entrada | M0 (PR #96) decidido; decisões DP/DUX/DA/DE/DD da §19 registradas |
| Voto requerido | Aprovação explícita do Owner (binário) sobre este Plano M1 |
| Escopo liberado | Blocos M1.1–M1.10 conforme §4; extremos de `POST_M1` listados |
| Restrições | Sem novos endpoints salvo decisão explícita (DA-01/DA-03); sem mudança de motor; sem migration nova salvo decisão (DD-01); sem merge automático |
| Gate de saída | QA verde (`npm run verify`, CI 4/4), critérios C-01..C-10, revisão humana antes de merge |
| Registro | Estado M1 em `FACTORY_STATUS.md` (inicialmente `PROPOSED`, após aprovação `AUTHORIZED`) + item em `HUMAN_DECISIONS_LOG.md` |

**Fluxo:** este plano aprovado → registrar `HUMAN_GATE_M1_APPROVAL` (USER `APPROVE`/`REJECT`) → só então iniciar implementação em branch própria, em ordem §17, com perímetro de merge respeitando a política V2.

---

> **M1_IMPLEMENTATION_PLAN_READY_FOR_HUMAN_REVIEW**
