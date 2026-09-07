# Avaliação de Stack — Servium IA MVP

> **Fase 003 — Arquitetura do MVP** · Etapa E
> Comparação orientada pelos drivers ([`ARCHITECTURE_DRIVERS.md`](ARCHITECTURE_DRIVERS.md)). Notas 1–5 **sempre com justificativa**; a decisão pondera os drivers, não a soma bruta. Tudo aqui é **Recommended/Proposed** — nada `Accepted` sem aprovação humana.
>
> **Atualização (HG-002 · 2026-08-22):** as recomendações desta avaliação foram aceitas — ADR-001..011 agora `Accepted` (ver [`../decisions/README.md`](../decisions/README.md)). Este documento permanece como registro da análise que fundamentou as decisões.

## Pesos dos drivers relevantes para stack

| Driver | Peso | Motivo |
|---|---|---|
| ADRV-011 Simplicidade operacional/custo | Alto | Equipe 1–3 pessoas, piloto |
| ADRV-012 Velocidade até o piloto | Alto | Hipóteses precisam de produto real |
| ADRV-001 Tenant isolation | Alto | Requisito inegociável |
| ADRV-002 Auditoria / ADRV-003 Idempotência | Alto | Núcleo de confiança |
| ADRV-005 Async agendado | Médio | Núcleo do fluxo |
| ADRV-010 Evolutividade | Médio | Novos canais/funcionários depois |
| ADRV-013 IA determinística-first | Médio | LLM é exceção, não centro |
| ADRV-008 Observabilidade / ADRV-014 Responsividade | Baixo/Médio | Importantes, mas maduros em qualquer opção |

---

## 1. Backend

Critérios derivados dos drivers: produtividade (ADRV-012), tipagem/robustez (ADRV-002/003), jobs assíncronos (ADRV-005), ecossistema/integrações, observabilidade, manutenção, disponibilidade de profissionais, custo operacional, evolução (ADRV-010).

### Java + Spring Boot

| Critério | Nota | Justificativa |
|---|---|---|
| Robustez/tipagem | 5 | Tipagem estática forte, ecossistema empresarial maduro, contratos estáveis |
| Produtividade MVP | 3 | Verboso; bootstrap rápido com Spring Initializr, mas mais cerimônia por feature |
| Jobs/background | 4 | Quartz/@Scheduled/Spring Batch consolidados |
| Ecossistema/APIs | 5 | Quase tudo existe pronto e documentado |
| Observabilidade | 5 | Micrometer/OpenTelemetry de primeira classe |
| Custo operacional | 3 | JVM consome mais memória em VPS pequeno (custo fixo maior) |
| Profissionais (BR) | 4 | Base grande, sêniores caros; júniores abundantes |
| Evolução | 4 | Escala muito bem; refatorações seguras |

### TypeScript + Node.js

| Critério | Nota | Justificativa |
|---|---|---|
| Robustez/tipagem | 4 | TS estático sólido; cultura de tipos menos rígida que Java, mitigável com lint/strict |
| Produtividade MVP | 5 | Iteração rápida; **um único idioma com o frontend** (tipos compartilhados) — ganho real para equipe mínima |
| Jobs/background | 4 | Filas via Postgres (ex.: pg-boss) alinhadas ao ADR-006; agendamento nativo simples |
| Ecossistema/APIs | 5 | Maior ecossistema de pacotes; SDKs de e-mail/storage/LLM imediatos |
| Observabilidade | 4 | pino/OpenTelemetry maduros |
| Custo operacional | 4 | Roda bem em instâncias pequenas |
| Profissionais (BR) | 5 | Enorme disponibilidade JS/TS no mercado brasileiro |
| Evolução | 4 | Modularizável (NestJS modules); limites em CPU-intensivo — irrelevante aqui (carga IO-bound) |

### Python (FastAPI/Django)

| Critério | Nota | Justificativa |
|---|---|---|
| Robustez/tipagem | 3 | Typing opcional e culturalmente fraco; mypy ajuda, mas não é padrão universal |
| Produtividade MVP | 4 | Django admin/batteries ajudam; FastAPI excelente para APIs |
| Jobs/background | 3 | Celery exige broker extra (Redis) — conflita com ADR-006 minimalista; alternativas db-based menos maduras |
| Ecossistema/APIs | 5 | Bibliotecas de IA/ML incomparáveis — porém ADRV-013 reduz essa necessidade no MVP |
| Observabilidade | 4 | Boa via OpenTelemetry |
| Custo operacional | 4 | Leve o suficiente |
| Profissionais (BR) | 4 | Muitos devs, menos profundidade web corporativa que JS/Java |
| Evolução | 4 | Escala adequada ao nosso porte |

### Decisão proposta (backend)

**TypeScript + Node.js** (*Recommended* → ADR-002 `Proposed`).

Motivação ponderada: a carga do MVP é quase inteiramente IO-bound (orquestração de banco, canal, storage) — exatamente o ponto forte de Node; a produtividade de um monorepo TS compartilhando tipos entre API e SPA acelera ADRV-012 com equipe mínima; filas baseadas em Postgres eliminam infra extra (ADRV-006/ADR-006 alinhados); mercado brasileiro facilita contratação. Framework proposto: **NestJS** (módulos explícitos reforçam as fronteiras do monólito modular); alternativa registrada: Fastify + estrutura própria.

Python fica como escolha natural se/que funções de ML pesado surgirem (fora do MVP). Java/Spring permanece ótima opção se a equipe futura for Java-first — decisão reversível atrás das fronteiras de módulo.

---

## 2. Frontend

Contexto: SPA operacional/administrativa interna (painel, filas, formulários de configuração). Sem SEO, sem público consumidor final.

| Critério | React | Vue |
|---|---|---|
| Complexidade conceitual | 3 | 4 (mais abordável, SFCs coesos) |
| Produtividade dashboard | 5 | 4 |
| Ecossistema componentes | 5 | 4 (bom, menor) |
| Manutenção/longevidade | 5 | 4 |
| Contratação BR | 5 | 4 |
| Tipagem (TS) | 5 | 4 |

**Decisão proposta:** **React + TypeScript** (*Recommended* → ADR-003 `Proposed`) — profundidade de ecossistema para dashboards operacionais (tabelas densas, formulários, component libraries maduras) e maior facilidade de contratação/substituição. **Vue é alternativa perfeitamente viável**: se a equipe inicial tiver preferência comprovada por Vue, a troca não afeta nenhuma outra decisão desta fase (fronteira limpa via API JSON).

---

## 3. Banco de dados

| Critério | PostgreSQL | Alternativas (MySQL/MongoDB) |
|---|---|---|
| Consistência/transações | 5 | MySQL 4; Mongo 2 (transações multi-doc possíveis mas antinatural) |
| Modelo relacional do domínio | 5 | Nosso domínio é fortemente relacional (ciclo→itens→documentos→mensagens) |
| JSON flexível | 5 (JSONB) | Mongo 5; MySQL 3 |
| Auditoria append-only | 5 | 4/3 |
| Multi-tenancy (RLS) | 5 (Row-Level Security nativo) | 3/2 |
| Ferramentas/maturidade | 5 | 5/4 |
| Custo gerenciado | 4 | 4/4 |

Alternativas NoSQL rejeitadas: **nenhum requisito atual exige schema flexível ou escala horizontal de dados**; o domínio é transacional e relacional.

**Decisão proposta:** **PostgreSQL** (*Recommended* → ADR-004 `Proposed`), com RLS como defesa-em-profundidade do isolamento (ADRV-001).

---

## 4. Processamento assíncrono

| Critério | 1. Jobs no banco | 2. Fila dedicada (Redis/RabbitMQ) | 3. Workflow engine (Temporal etc.) |
|---|---|---|---|
| Simplicidade operacional | 5 (zero infra nova) | 3 (+1 serviço p/ operar/backupear) | 1 (plataforma complexa) |
| Consistência com estado de negócio | 5 (mesma transação) | 3 (dual-write a gerenciar) | 4 |
| Adequação à escala do piloto | 5 | 4 (supérflua) | 1 (supérflua) |
| Recuperação/observabilidade | 4 | 4 | 5 |
| Custo | 5 | 3 | 2 |
| Evolução | 4 (suficiente por muito tempo) | 5 | 5 |

**Decisão proposta:** **Alternativa 1 — jobs persistidos no PostgreSQL** (*Recommended* → ADR-006 `Proposed`), com gatilhos documentados de migração (volume de jobs, latência de fila, necessidade de distribuição). Fila dedicada e workflow engine são evoluções, não ponto de partida.

---

## 5. Estratégia de tenant

| Critério | Database per tenant | Schema per tenant | Shared schema + tenant_id |
|---|---|---|---|
| Isolamento | 5 | 4 | 3 (com RLS: 4+) |
| Complexidade operacional | 1 (N backups/migrações) | 2 (migrações × N schemas) | 5 (uma instância) |
| Custo no piloto | 1 | 3 | 5 |
| Queries cross-tenant (métricas agregadas) | 3 | 3 | 5 |
| Risco de vazamento por bug | 1 (mínimo) | 2 | 3 (mitigado por RLS + testes) |
| Escala com muitos tenants | 2 | 3 | 5 |

**Decisão proposta:** **Shared schema + `tenant_id` + Row-Level Security como defesa-em-profundidade** (*Recommended* → ADR-005 `Proposed`). Migração única, backup único, métricas agregadas triviais (M-01..M-12), custo mínimo; vazamento mitigado por RLS + testes dedicados de isolamento (ADRV-001). Database-per-tenant permanece opção de compliance para clientes enterprise futuros.

---

## 6. Deployment

| Critério | VPS + Docker Compose | PaaS de entrada (app gerenciado + Postgres gerenciado) | Cloud gerenciada completa/K8s |
|---|---|---|---|
| Custo mensal piloto | 5 | 4 | 1–2 |
| Operação (backup, patch, SSL, recuperação) | 2 (manual/disciplina) | 5 (gerenciado) | 4 (mas complexidade alta) |
| Segurança básica correta | 3 (depende de nós) | 5 | 4 |
| Observabilidade pronta | 3 | 4 | 5 |
| Crescimento posterior | 4 | 4 (portabilidade razoável) | 5 |
| Simplicidade p/ equipe mínima | 3 | 5 | 1 |

**Decisão proposta:** **PaaS de entrada com Postgres gerenciado + object storage compatível S3** (*Recommended* → ADR-011 `Proposed`): backups, recuperação e TLS corretos "de fábrica" (ADRV-009/ADRV-007) por custo aceitável; app empacotado de forma portátil (container) para não criar lock-in estrutural. Kubernetes explicitamente rejeitado para o MVP. VPS+Compose registrado como alternativa de redução de custos quando houver alguém responsável por operação.

---

## 7. Autenticação/autorização

Necessidades: usuários humanos do tenant, papéis mínimos (gestor/responsável), operações sensíveis auditadas, service identities futuras (funcionários digitais como atores registrados).

Opções: (a) IdP externo (Auth0/Cognito) — rápido, mas custo por usuário e dependência externa cedo demais; (b) biblioteca first-party de sessão + RBAC em tabelas próprias — controle total, zero dependência, OIDC adicionável depois.

**Decisão proposta:** **(b) autenticação first-party (sessões httpOnly + senhas com hash moderno) + RBAC mínimo**, desenhada para plugar OIDC futuramente (*Recommended* → ADR-009 `Proposed`).

---

## Resumo da stack recomendada

| Camada | Recomendação | Status |
|---|---|---|
| Backend | TypeScript + Node.js (NestJS) | Recommended → ADR-002 Proposed |
| Frontend | React + TypeScript (SPA) | Recommended → ADR-003 Proposed |
| Banco | PostgreSQL (+RLS) | Recommended → ADR-004 Proposed |
| Async | Jobs persistidos no banco | Recommended → ADR-006 Proposed |
| Documentos | Object storage S3-compatível + metadados no banco | Recommended → ADR-007 Proposed |
| Comunicação | Porta `CommunicationChannel` + adaptador (canal a validar) | Proposed → ADR-008 |
| Auth | First-party sessions + RBAC mínimo | Recommended → ADR-009 Proposed |
| IA | Determinístico-first; porta provider-agnóstica | Proposed → ADR-010 |
| Deploy | PaaS de entrada + Postgres gerenciado; sem Kubernetes | Recommended → ADR-011 Proposed |
