# Changelog

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Este projeto ainda não possui releases publicadas.

## [Unreleased]

### Added

- Fase inicial F0/F1 — auditoria da Software Factory V1 + design e plano executável da **Factory V2**:
  `docs/reports/FACTORY_V2_FASE0_AUDITORIA_DESIGN.md` e `docs/reports/FACTORY_V2_FASE1_IMPLEMENTATION_PLAN.md`.
- Factory V2 aprovada por human gates (HG-F2-01/02/03 + HG-REC-01 · 2026-09-04): agente
  `servium-orchestrator`, comando `start-orchestrator`, `docs/factory/ORCHESTRATOR.md`,
   máquina de estados canônica de **14 estados**, política de merge **por classe**
   (normal L2 autônomo; estrutural L3 humano).
- Initial project foundation: documentação de visão, princípios de produto,
  glossário, contexto para agentes de IA, índice de documentação, estrutura
  de ADRs, roadmap inicial, licença proprietária e configurações base do
  repositório.
- Fase 002 — Discovery do MVP: documento central de discovery, escopo do MVP,
  personas operacionais, catálogo e ranking de rotinas candidatas,
  especificação do primeiro Funcionário Digital (Assistente Digital de
  Pendências Documentais), fluxo operacional com human-in-the-loop,
  requisitos funcionais (FR-001 a FR-019) e não funcionais (NFR-001 a
  NFR-017), métricas de sucesso, registro de hipóteses (HYP-001 a HYP-007)
  e riscos (RSK-001 a RSK-012), plano de validação com escritórios contábeis
  e backlog macro por épicos.
- Política de contribuição: branches e Conventional Commits (`CONTRIBUTING.md`).

### Changed

- Status do projeto atualizado para "Discovery do MVP" no README, índice de
  documentação, contexto para agentes de IA e roadmap.
- Revisão da especificação (Fase 002.1): estratégia de tenant refinada —
  funções administrativas multi-tenant permanecem fora do MVP, mas consciência
  de tenant (identidade e isolamento lógico) é requisito desde o início
  (NFR-001 refinado; FR-019 reformulado); canal de comunicação mantido como
  hipótese (e-mail = hipótese inicial; WhatsApp = alternativa a avaliar;
  canal definitivo a decidir por validação de produto + decisão arquitetural);
  política de tentativas de cobrança tornada configurável (`max_attempts`,
   hipótese inicial 3 — HYP-008); recomendação para a Fase 003 refinada:
   começar por arquitetura funcional → fluxos/boundaries → drivers → ADRs →
   integrações específicas.
- Fase 003 — Arquitetura do MVP (proposta, todos os ADRs em `Proposed`):
  arquitetura funcional com capacidades C1–C12; boundaries de domínio com
  módulos B1–B7; drivers arquiteturais ADRV-001 a ADRV-014; visões de
  contexto e containers (C4); avaliação fundamentada de stack; ADR-001 a
  ADR-011 (monólito modular; TypeScript/NestJS; React+TS; PostgreSQL;
  shared schema + tenant_id + RLS; jobs no banco; object storage S3-
  compatível; abstração de canal de comunicação; autenticação first-party
  - RBAC; IA determinístico-first com LLM assistivo isolado; PaaS de
  entrada sem Kubernetes); limites de uso de IA; arquitetura de segurança;
  revisão arquitetural (red team) da própria proposta.
- Login: feedback amigável para o cliente — o `429` (rate limit) agora retorna
  mensagem em PT-BR e `retryAposSegundos` para a UI exibir contagem regressiva,
  e o formulário de login da SPA traduz 401/429 com mensagens claras e
  desabilita o botão durante o bloqueio. Anti-enumeração (conta vs IP)
  preservada; trade-off documentado em `docs/security/RATE_LIMIT_POLICY.md`.
- API/runtime/seed carregam `.env` automaticamente via `process.loadEnvFile()`
  (busca no diretório de trabalho e ascendentes) — limites de rate limit de dev
  configuráveis localmente via `.env`.
- Modelos de e-mail padrão: nova tabela `email_templates` (tenant-scoped + RLS),
  CRUD em `/email-templates`, vínculo opcional `checklist_templates.email_template_id`
  (1 modelo por checklist). O motor passa a renderizar **assunto/corpo** a partir
  do modelo com placeholders `{{cliente_nome}}`, `{{item_descricao}}`,
  `{{token_correlacao}}`; sem modelo, mantém o texto fixo anterior (retrocompatível).
  UI: página "Modelos de Email" (criar/editar/excluir + vincular a checklist).
