# Fase 2 — Proposta de decomposição do Épico de Experiência (Blueprint UX/UI)

**Produto:** ServiumAI · **Fase:** 2 (Especificação Oficial do MVP v1.0 §28) · **Data:** 06/09/2026
**Base:** `docs/reports/UI_EXPERIENCE_PHASE1_AUDIT.md` + Especificação MVP v1.0
**Status:** **proposta** — aguarda aprovação humana (Fase 3) antes de qualquer implementação visual.

---

## 1. Objetivo do épico

Elevar o MVP do estado "funcional e estável" para "experiência premium percebida de um Funcionário Digital trabalhando", conforme §5–§19 da Especificação, sem tocar em regras de domínio.

## 2. Entregas (proposta de backlog por onda)

| # | Entrega | Seções da Spec | Dependências | Classe |
|---|---|---|---|---|
| E-01 | **Sistema de design + identidade aplicada** (tokens/cores teal-navy, tipografia, espaçamento, elevation, dark mode opcional) | §19, §4 | — | Design L3 |
| E-02 | **Biblioteca de componentes base** (Button/Input/Table/Badge/Card/Modal/Skeleton/Toast) | §19, §21 | E-01 | Arquitetura/ADR L3 |
| E-03 | **Dashboard visual**: gráficos de evolução (pendências/documentos/atividades/taxa de resolução) + barras de progresso de ciclo | §6, §7, §8 | E-02; endpoint auditoria (backend) p/ alguns gráficos | Full-stack |
| E-04 | **Agent Experience**: identidade da Estagiária Digital, estados vivos (trabalhando/analisando/aguardando/aprovação), timeline de atividades | §5, §9, §10, §12 | E-02 | Frontend |
| E-05 | **Cartões de decisão + mapa de contexto + camadas de explicação** (exceções/aprovações em formato de cartão; evidências e regras navegáveis) | §13, §14, §15 | E-02; `contexto` já existe no domínio; exceções globais (PRM-M-17, backend) | Full-stack |
| E-06 | **Acessibilidade transversal** (ARIA, labels/htmlFor, foco trap, `:focus-visible`, redução de movimento) | §21 | E-02 | Frontend |
| E-07 | **Motion design + refinamento premium + responsividade** (microinterações informativas; menu mobile funcional; navegação/breadcrumbs) | §11, §18, §20 | E-02, E-04 | Frontend |
| E-08 | **Auditoria visível** (trilha de eventos compreensível quando `GET /auditoria` existir) | §17 | backend auditoria (PRM-P0.2-A) | Full-stack |

Onda sugerida: **Onda 1** E-01+E-02 (fundação) → **Onda 2** E-03+E-04 (percepção) → **Onda 3** E-05+E-08 (transparência) → **Onda 4** E-06+E-07 (polimento).

## 3. Critérios de aceite do épico (globais)

- GA-1: Identidade de marca consistente em todas as telas (tokens oficiais teal/navy aplicados).
- GA-2: Dashboard com indicadores, gráficos e progresso de ciclo.
- GA-3: Agente visível (estados vivos + timeline) na experiência.
- GA-4: Decisões como cartões com contexto/evidência/recomendação/ação.
- GA-5: Auditoria compreensível (quando backend permitir).
- GA-6: Acessibilidade básica (ARIA, labels, foco) sem regressão funcional.
- GA-7: `npm run verify` verde + E2E Selenium verde a cada entrega.
- GA-8: **Nenhum trabalho visual significativo executado antes da Fase 3 (aprovação humana do Blueprint).**

## 4. Perguntas abertas (para a Fase 3)

1. **Stack gráfica/componentes** — criar internamente vs adoção de lib (ex.: shadcn-ui + Recharts)? (decisão arquitetural, ADR, L3)
2. **Dark mode** — incluir no escopo do MVP ou pós-piloto?
3. **Escopo da trilha no MVP** — visualizar eventos de auditoria agora (endpoint para criar) ou apenas quando PRM-P0.2-A prover API?
4. **Onda de implementação** — validar a ordem sugerida (fundação → percepção → transparência → polimento).

## 5. Relação com Gates

- Cada entrega E-01..E-08 segue o fluxo V2 (gates 1–5, QA, PO) com PR e merge L2/L3 por classe;
- Após todas as ondas → `LOCAL_ACCEPTANCE` → validação visual → `HUMAN_GATE_DEMO_FACTORY` (§27 da spec), independente do CI.
