# Fase 1 — Auditoria da Interface Atual do MVP

**Produto:** ServiumAI · **Fase:** 1 (Especificação Oficial do MVP v1.0, §28) · **Data:** 06/09/2026
**Objeto auditado:** `apps/web` (React 19 + Vite 6 + react-router 7, CSS vanilla)
**Método:** leitura de código estática (com evidências `arquivo:linha`); sem execução de runtime.
**Status:** proposta para revisão humana — **nenhuma implementação visual ocorreu** (aguarda Fase 3/Blueprint).

---

## 1. Sumário executivo

| Dimensão | Veredito |
|---|---|
| **Funcionalidade** | 8 rotas funcionais, todas com estados loading/erro/empty; sem TODO/placeholders; dados reais via API |
| **Identidade/marca** | Tokens oficiais teal/navy **definidos mas não aplicados** — a UI usa azul `#2563eb`, divergente da marca oficial |
| **Componentes** | **Não existe módulo de componentes** — tudo duplicado via classes CSS em cada página |
| **Dashboard/indicadores** | Só 4 cards numéricos + tabela; **sem gráficos, sem progresso, sem timeline do agente** |
| **Agente visível** | Dados do motor reais nas telas; **sem estados vivos do agente, timeline, mapa de contexto, cartões de decisão** |
| **Auditoria/mapa** | Página "Auditoria" mostra `/metrics` + `/health`, **não a trilha de eventos** (endpoint `GET /auditoria` pendente — PRM-P0.2-A) |
| **Acessibilidade** | **Crítica** — zero ARIA, zero `htmlFor`/`id`, modais sem foco trap/ESC/`role` |
| **Responsividade** | Tablet/mobile existem; **menu mobile sem toggle funcional** (classe `.open` nunca aplicada via JS) |
| **Premium (spec §19)** | **Não presente** — sem sombra, sem animação, sem microinterações, tipografia genérica de sistema |

**Leitura estratégica:** a base é **funcional, testada e estável** (UI_GATE `UI_PILOT_READY`, E2E Selenium verde — `docs/reports/UI_GATE_REPORT.md`). A distância até a Especificação MVP v1.0 está **no acabamento da experiência**, não na operação: identidade, motion, componentes, gráficos, estados do agente, trilhas e acessibilidade.

---

## 2. Stack e arquitetura atual

| Aspecto | Valor | Evidência |
|---|---|---|
| Framework | React 19 + ReactDOM 19 | `apps/web/package.json:13-14` |
| Builder | Vite 6 | `apps/web/package.json:22-23` |
| Roteamento | react-router-dom 7 | `src/App.tsx:1`, `src/layout/Layout.tsx:1` |
| Estado | React Context (`AuthContext`) | `src/auth/AuthContext.tsx:1-46` |
| Data-fetching | `fetch` manual (`api/client.ts`) | `src/api/client.ts:8-24` |
| Estilização | CSS puro + custom properties | `src/App.css:1-641`, `src/main.tsx:3-4` |
| Biblioteca de componentes/gráficos/ícones/animação | **Nenhuma** | `apps/web/package.json:11-25` (hand-rolled 100%) |

> **Nota de dívida já registrada:** ADR-003 previu "component library madura para dashboards operacionais" (`docs/decisions/ADR-003-frontend-stack.md:13`) — **não materializada**.

---

## 3. Inventário de páginas

| Rota | Página | Arquivo | Observações |
|---|---|---|---|
| `/login` | Login | `pages/LoginPage.tsx` | Slug + e-mail + senha; loading/erro; sem "esqueci senha" |
| `/` | Dashboard | `pages/DashboardPage.tsx` | 4 cards de métricas; tabela "ciclos recentes"; **sem gráficos** |
| `/clientes` | Clientes | `pages/ClientesPage.tsx` | CRUD parcial: criar e listar; **sem editar/desativar** (FR-002) |
| `/obrigacoes` | Obrigações | `pages/ObrigacoesPage.tsx` | CRUD parcial; templates só leitura; **sem limites de autonomia** (FR-003) |
| `/ciclos` | Ciclos | `pages/CiclosPage.tsx` | Ativar + listar; **sem encerrar ciclo na UI** |
| `/ciclos/:id` | Detalhe do ciclo | `pages/CicloDetailPage.tsx` | Informações/Itens/Comunicações/Exceções + ações; **sem timeline visual** |
| `/excecoes` | Exceções | `pages/ExcecoesPage.tsx` | Fila agregada por **N requisições** (N+1); sem filtros |
| `/auditoria` | Auditoria | `pages/AuditoriaPage.tsx` | **Não mostra trilha de auditoria**; só `/metrics` + `/health` |
| `*` | — | `App.tsx:57` | Redireciona para `/` **sem feedback de 404** |

---

## 4. Componentes compartilhados — inexistentes como módulo

Não há `src/components`. Toda a UI é classes CSS + JSX duplicado por página.

| Capability | Estado | Evidência |
|---|---|---|
| Layout (AppShell) | ✅ Sidebar + main | `layout/Layout.tsx:22-47` (sem Topbar/header global; cada página tem `<h1>` próprio) |
| Tabelas | ⚠️ Parcial (classes `.table`) | `App.css:187-222`; sem ordenação/paginação/colunas |
| Modais | ⚠️ Parcial (2 páginas) | `CicloDetailPage.tsx:298-320`; sem `role`/foco trap/ESC |
| Toasts/notificações | ❌ Ausente | só `.alert` inline que some ao navegar (`App.css:395-419`) |
| Formulários | ⚠️ Parcial | `App.css:255-329`; sem `<div>` de campo reutilizável |
| Badges/status | ⚠️ Parcial | `App.css:225-252`; `badge-info` **usado mas não definido** (`CicloDetailPage.tsx:226`) |
| Botões | ⚠️ Parcial | `App.css:332-393`; sem componente `<Button>` |
| Skeleton/spinner | ❌ Ausente | só texto "Carregando..." |

---

## 5. Identidade e tema — divergência crítica entre marca e UI

- Tokens oficiais (`styles/brand-tokens.css:1-8`): `--servium-navy: #12304a`, `--servium-teal: #0f8b83`, `--servium-mint: #38b7a5`.
- UI real (`App.css:3`): `--color-brand: #2563eb` (azul) — **a UI não consome os tokens oficiais**.
- Consequência: logotipos usam a marca teal/navy, mas botões/links/badges são **azuis divergentes**.
- **Sem dark mode** (sem `prefers-color-scheme`); **sem fonte de marca** (stack genérica `App.css:27-28`); **sem sombras/elevação** nos cards.

---

## 6. Acessibilidade — estado crítico

| Item | Estado |
|---|---|
| Atributos `aria-*`/`role`/`tabIndex` | **Zero em todo `src/`** |
| `<label htmlFor>` / `<input id>` | Zero (labels envolvem o input implicitamente) |
| Modais | Sem foco trap, sem `role="dialog"`, sem `aria-modal`, sem ESC |
| `:focus-visible` | Só inputs têm foco visual proprio |

---

## 7. Responsividade

- `@media (max-width: 768px)` tablet e `(max-width: 480px)` mobile existem (`App.css:579-625`).
- **GAP crítico:** o toggle mobile `.sidebar.open` existe no CSS (`App.css:608-610`) mas **nenhum JS aplica/remove** — em mobile a sidebar fica off-canvas **inacessível** (navegação quebrada em mobile).

---

## 8. Mapa contra a Especificação Oficial do MVP v1.0 (gap por seção)

| § Spec | Requisito de experiência | Status na UI atual | Gap |
|---|---|---|---|
| §5 | Identidade do agente (Estagiária Digital, status ●) | **Ausente** | Não há representação do agente em nenhuma tela |
| §6 | Indicadores operacionais (clientes, cobranças, documentos, pendências) | Parcial (4 cards métricas no Dashboard) | Faltam cobranças/documentos/exceções como indicadores |
| §7 | Barras de progresso e status (ciclo 82% concluído) | **Ausente** | Dados existem (`resolvidos`/`itens`) mas não são visualizados |
| §8 | Gráficos (evolução pendências/documentos/atividades) | **Ausente** | Nenhuma biblioteca de gráficos; dashboard sem visual |
| §9 | Timeline de atividades | **Ausente** | Comunicações em tabela plana no detalhe; sem linha do tempo |
| §10 | Estados vivos do agente (trabalhando/analisando/etc.) | **Ausente** | Sem representação de estado do agente |
| §11 | Motion design (animações informativas) | **Ausente** | Única transição: `background 0.1s` no nav (`App.css:100`) |
| §12 | Interação com o Funcionário Digital (supervisão) | **Ausente** | Sem tela de atividades/agente |
| §13 | Cartões de decisão (situação/evidência/recomendação/ação) | **Parcial** | Decisões existem como linhas de exceção com ações; sem formato de cartão |
| §14 | Mapa de conhecimento e contexto | **Ausente** | `contexto` na exceção (`CicloDetailPage.tsx:25`) não é renderizado |
| §15 | Camadas de explicação (resultado → evidências → regras) | **Ausente** | Sem camadas de explicação |
| §16 | Segurança visual (ambiente protegido, auditoria, aprovação) | **Parcial** | Auditoria/health existem; sem "ambiente protegido"/sensação de segurança |
| §17 | Auditoria compreensível | **Ausente** | Página "Auditoria" não mostra eventos (endpoint pendente) |
| §18 | Navegação principal (Dashboard/Clientes/Obrigações/Ciclos/.../Auditoria) | ✅ Presente | Falta "Pendências", "Atividades do agente" |
| §19 | Experiência visual premium/limpa/tecnológica/humana/viva | **Não presente** | Sem acabamento premium; UI funcional mas crua |
| §20 | Responsividade | Parcial | **Menu mobile inoperante** |
| §21 | Acessibilidade | **Crítica** | Zero ARIA/htmlFor/foco trap |
| §22 | Performance | ✅ OK | Sem libs pesadas; só N+1 nas exceções |
| §23 | O que o MVP **não** deve fazer | n/a | Sem chat/sem futurismo (ok) |

**Veredito Fase 1:** funcionalidade de domínio **~70% presente** (telas operacionais reais); **experiência/visual §5–§11, §13–§17 ~10–30%**; **acessibilidade e identidade são os maiores pontos de partida para o Blueprint (Fase 2)**.

---

## 9. Riscos e dívidas que aumentam o escopo da Fase 2

1. **Backend faltante para experiência** — `GET /auditoria` (trilha consultável, PRM-P0.2-A) e endpoint global de exceções (PRM-M-17) ainda não existem; a auditoria §17 e o mapa de contexto dependem deles.
2. **CRUD incompleto na UI** — editar/desativar cliente (FR-002), editar templates e limites de autonomia (FR-003/004), encerrar ciclo (FR-014) — a experiência de "trabalho do agente" fica incompleta sem essas operações na tela.
3. **N+1 em Exceções** (`ExcecoesPage.tsx:38-53`) — a tela de exceções agrega por requisição; com volume crescente vira lentidão percebida (impacta §6/§22).
4. **Sem biblioteca de componentes/gráficos** — todo o refinamento (§7/§8/§11/§19) exigirá decisão de stack (ADR). Isso é decisão **Fase 2/Blueprint/arquitetural (L3)** — não se decide agora.
5. **`badge-info`/badges dinâmicas sem CSS** (`CicloDetailPage.tsx:226`) e labels sem acento ("Obrigacoes") — itens de refinamento rápido.

---

## 10. Recomendações para a Fase 2 (Blueprint UX/UI)

> A Fase 2 é proposição **para aprovação humana** (§28 da spec: Fase 3). Nada disso é implementação.

1. **Definir sistema de design** (reta da marca oficial teal/navy, tokens, tipografia, espaçamento, elevation) e aplicá-lo globalmente — resolve a dupla identidade (§19 da spec).
2. **Dashboards visuais**: gráficos (evolução pendências/documentos; taxa de resolução; tempo médio) + barras de progresso de ciclo (§6–§8).
3. **Agent Experience**: identidade da Estagiária Digital (§5), estados vivos (§10), timeline de atividades (§9) e mapa de contexto com camadas de explicação (§14–§15).
4. **Cartões de decisão** para exceções/aprovações (§13) reaproveitando os dados já existentes.
5. **Acessibilidade transversal**: ARIA, labels, foco trap em modais, `:focus-visible` (§21).
6. **Componentes e motion**: toasts, skeleton, microinterações informativas, fix menu mobile (§11/§18/§20).
7. **Trilha de auditoria visível** quando o endpoint `GET /auditoria` existir (§17).

---

## 11. Decisões solicitadas (para avançar à Fase 2)

| Item | Tipo | Ação |
|---|---|---|
| Autorizar Fase 2 (Blueprint UX/UI) | L3 | Aprovar elaboração da proposta de Blueprint a partir desta auditoria |
| Escolher/criar biblioteca de componentes e gráficos | L3/ADR | Antes do Blueprint, decidir stack (necessário para §8) |
| Priorizar backend da experiência (auditoria/exceções globais) | L3 | Para §14/§17; pode ser deferido |
| Aprovar ESGOTO do refinamento visual | L3 | Fase 3 da spec antes de qualquer implementação visual |
