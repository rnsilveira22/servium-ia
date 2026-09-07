# Backlog Inicial — Servium IA (canônico)

> **APROVADO COM AJUSTES (HG-003 · 2026-08-22).** Direção de produto aprovada por Rodrigo a partir da proposta do `servium-po` (elaborada com base em `BACKLOG_OVERVIEW.md`, `MVP_SCOPE.md`, `FUNCTIONAL_REQUIREMENTS.md` e `ADR_REVIEW_REPORT.md`). Registro formal: [`../factory/HUMAN_DECISIONS_LOG.md`](../factory/HUMAN_DECISIONS_LOG.md).
>
> **Escopo da autorização de materialização:** somente as Ondas **0 e 1** foram materializadas como Issues reais (#3–#10). As Ondas **2–7 permanecem backlog planejado** — serão refinadas e materializadas progressivamente; nada delas está autorizado a virar Issue agora.
>
> **Esta aprovação NÃO autoriza:** contratação de serviços, escolha de provedor pago, deploy em produção, mudança arquitetural, mudança de visibilidade do repositório, expansão de escopo ou bypass de Human Gates.
>
> Ondas marcadas com ⚠ dependem adicionalmente dos gates já definidos em `MVP_SCOPE.md` e `HUMAN_GATES.md`.
>
> **META ATUAL (HG-005 · 2026-08-22): `MVP-01 TIME-TO-PILOT`** — as Ondas abaixo permanecem como histórico/roadmap, mas o planejamento ativo é orientado por slices até `PILOT_READY`. Ver [`MVP_01_VERTICAL_SLICE.md`](MVP_01_VERTICAL_SLICE.md) e [`MVP_01_REPLAN_REPORT.md`](MVP_01_REPLAN_REPORT.md).

## Mapa de slices MVP-01

| Slice | Capacidades | Issues | Gate |
|---|---|---|---|
| S0 Repo executável | skeleton, CI, ambiente local | #3 ✅ #4 ✅ #5 | — |
| S1 Dados + segurança mínima | modelo mínimo do slice + RLS + cadastro cliente/checklist | #6\* #7, [N1=#16] | — |
| S2 Core do Funcionário Digital | motor de ciclo determinístico + jobs essenciais + fila de exceção | #8†, [N2=#15], [N3=#17] | — |
| S3 Comunicação real | canal mínimo bidirecional envio/recebimento | [N4=#18] | HG-006 se provedor/custo |
| S4 Supervisão e auditoria | trilha append-only + métricas mínimas | #9 | — |
| S5 Cliente piloto | preparação e avaliação PILOT_READY | — | gate de piloto |

\* escopo reduzido pelo spike SRV-10 · † subconjunto essencial; outbox segue condicional (HG-003) · N1–N4 materializadas como Issues #15–#18 (Epic EPIC-MVP01).

## Ajustes vinculantes do HG-003

1. **História 1.3**: transactional outbox só se implementada mediante necessidade concreta demonstrada na análise técnica (Gate 2); jobs persistidos, SKIP LOCKED, retry/backoff e idempotency keys permanecem requisitos. Conflito material com ADR-006 → `needs:adr` + human gate, nunca contradição silenciosa.
2. **Nova avaliação (1.5)**: PO + Senior avaliam antecipação de vertical slice mínimo de cadastro de clientes (C3.1) para validar realisticamente tenant_id/RLS/isolamento — sem antecipar toda a Onda 3.
3. **História 6.3 (futura)**: LLM permanece opcional, fora do caminho crítico do MVP, condicionado a evidência funcional e ao princípio deterministic-first (ADR-010).
4. **Onda 5 (futura)**: canal concreto continua condicionado à validação — não assumir e-mail definitivamente sem evidência.

## Princípios

1. Ondas = sequenciamento de valor com dependências técnicas respeitadas; histórias seguem o fluxo completo da factory (DoR → análise → implementação → QA → aceite);
2. Nenhuma história contraria ADR `Accepted`; nenhuma antecipa decisão de produto não tomada (canal definitivo, provedor pago);
3. Segurança e auditoria entram cedo (estruturais), nunca "depois";
4. Paralelismo humano: EPIC-003 (validação de mercado) corre fora da factory — entrevistas são trabalho do Rodrigo; resultados podem reordenar Ondas 5–7.

## Onda 0 — Bootstrap técnico da implementação *(materializada)*

Objetivo: transformar repositório documental em monorepo executável sem violar gates.

| # | História | Issue | Épico | Notas |
|---|---|---|---|---|
| 0.1 | Skeleton monorepo TS (API NestJS + SPA React + pacote de tipos compartilhados) | [#3](https://github.com/rnsilveira22/servium-ia/issues/3) | EPIC-004 | Concretiza ADR-001/002/003 |
| 0.2 | Pipeline CI evoluído: lint + build + testes (unit/integração) obrigatórios no Gate 4 | [#4](https://github.com/rnsilveira22/servium-ia/issues/4) | EPIC-004 | Depende de 0.1; sem duplicar docs-ci |
| 0.3 | Ambiente local padronizado (Postgres via container; adaptadores fake por padrão) | [#5](https://github.com/rnsilveira22/servium-ia/issues/5) | EPIC-004 | Zero serviço pago nesta onda |

## Onda 1 — Fundações de dados e confiança *(materializada)*

| # | História | Issue | Épico | Notas |
|---|---|---|---|---|
| 1.1 | Modelo de dados inicial + migrations versionadas | [#6](https://github.com/rnsilveira22/servium-ia/issues/6) | EPIC-006 | ADR-004; depende de Onda 0 |
| 1.2 | Isolamento multi-tenant: `tenant_id` + RLS deny-by-default + suíte de testes de vazamento | [#7](https://github.com/rnsilveira22/servium-ia/issues/7) | EPIC-004 | **Condição vinculante do ACCEPT do ADR-005**; depende de 1.1 + 0.2 |
| 1.3 | Framework de jobs persistidos (SKIP LOCKED, retry/backoff, idempotency keys) + outbox condicional | [#8](https://github.com/rnsilveira22/servium-ia/issues/8) | EPIC-006 | **Ajuste HG-003**: outbox só com necessidade demonstrada; conflito material com ADR-006 → `needs:adr` |
| 1.4 | Trilha de auditoria append-only (eventos de negócio e de agente) | [#9](https://github.com/rnsilveira22/servium-ia/issues/9) | EPIC-009 | ADRV-002; permanece na Onda 1 (HG-003 nº 6) |
| 1.5 | Spike: avaliar vertical slice mínimo de cadastro de clientes p/ validar fundação multi-tenant | [#10](https://github.com/rnsilveira22/servium-ia/issues/10) | EPIC-006 | **Ajuste HG-003 nº 5**: PO+Senior; não antecipa a Onda 3 |

## Onda 2 — Identidade e acesso *(planejada)*

| # | História proposta | Épico | Notas |
|---|---|---|---|
| 2.1 | Autenticação first-party (argon2, sessões httpOnly server-side) + rate limiting | EPIC-005 | **OWASP ASVS checklist obrigatório (condição ADR-009)** |
| 2.2 | RBAC mínimo (usuário ↔ papel ↔ tenant) + autorização contextual | EPIC-005 | Base p/ ações sensíveis auditadas |
| 2.3 | Identidade de serviço para Funcionários Digitais (atores não-humanos na trilha) | EPIC-005 | Prepara service identities |

## Onda 3 — Core de execução *(planejada)*

| # | História proposta | Épico | Notas |
|---|---|---|---|
| 3.1 | Cadastro de clientes e checklists de documentos por cliente/obrigação | EPIC-006 | FR base |
| 3.2 | Motor de ciclos: identificação de pendentes, estados, janelas e limites configuráveis | EPIC-006 | Determinístico-first (ADR-010) |
| 3.3 | Agendador + retries idempotentes de cobrança dentro dos limites | EPIC-006 | Consome 1.3 |
| 3.4 | Relatório de fechamento de ciclo | EPIC-006 | M-01..M-04 |

## Onda 4 — Supervisão humana *(planejada)*

| # | História proposta | Épico | Notas |
|---|---|---|---|
| 4.1 | Painel de status consolidado (pendências por cliente/ciclo) | EPIC-008 | SPA |
| 4.2 | Fila de exceções + escalonamento humano explícito | EPIC-008 | NFR core |
| 4.3 | Configuração de limites de autonomia (frequência, horários, tentativas) com auditoria | EPIC-008 | Restrição do MVP_SCOPE |

## Onda 5 — Comunicação ⚠ *(planejada — condicionada a validação/gates)*

| # | História proposta | Épico | Notas |
|---|---|---|---|
| 5.1 | Porta `CommunicationChannel` + adaptador fake (testes) | EPIC-010 | ADR-008 |
| 5.2 | `EmailAdapter` concreto + templates aprovados + ledger de envios | EPIC-010 | ⚠ HYP-005 confirmada; provedor = Level 3 (HG-004) |
| 5.3 | Recebimento de respostas/anexos + registro vinculado ao item | EPIC-010 | Idempotência de recebimento |

## Onda 6 — Funcionário Digital v1 ⚠ *(planejada — LLM opcional, fora do caminho crítico)*

| # | História proposta | Épico | Notas |
|---|---|---|---|
| 6.1 | Storage documental (S3-compatível) + metadados/hash/retenção + URLs assinadas curtas | EPIC-007 | ADR-007; provedor/custo = Level 3 |
| 6.2 | Validação básica de recebimento (corresponde? legível?) + escalonamento em dúvida | EPIC-007 | Regras primeiro |
| 6.3 | Classificação assistiva de respostas ambíguas via porta LLM (saída sugerida, veredito humano) | EPIC-007 | ADR-010; opcional se validação indicar |
| 6.4 | Instrumentação das métricas M-01..M-12 + amostragem humana (M-05) | EPIC-009 | SUCCESS_METRICS |

## Onda 7 — Piloto ⚠ *(planejada — gated)*

| # | Item | Épico | Critério de entrada |
|---|---|---|---|
| 7.1 | Onboarding do escritório piloto + baseline medido | EPIC-011 | HYP-001..004 não refutadas; escritório comprometido (`MVP_SCOPE.md`) |
| 7.2 | Operação assistida 2–3 ciclos + coleta de métricas + decisão continuar/ajustar/pivotar | EPIC-011/012 | 7.1 concluído |

## Riscos

- **Canal (Onda 5)**: se validação refutar e-mail, 5.2 muda de adaptador — porta protege o resto (ADR-008);
- **Custo recorrente**: primeiro gasto só aparece em 5.2/6.1 — sempre precedido de HG-004;
- **Escopo**: qualquer expansão detectada vira Issue nova avaliada pelo PO — nunca silenciosa.

## O que este backlog deliberadamente NÃO faz

Não define datas; não materializa Issues das Ondas 2–7 agora (refinamento progressivo); não promete segundo Funcionário Digital, WhatsApp, integração com ERPs ou qualquer item do Out of Scope (`MVP_SCOPE.md`).
