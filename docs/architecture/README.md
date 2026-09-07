# Arquitetura — Servium IA

> **Fase 003 concluída e ADRs aceitos (HG-002 · 2026-08-22).** A arquitetura do MVP (monólito modular + stack definida) está documentada abaixo e registrada em ADRs com status `Accepted`. Condições dos aceites e registro da decisão: [`../factory/HUMAN_DECISIONS_LOG.md`](../factory/HUMAN_DECISIONS_LOG.md).
>
> Processo de decisões: [`../decisions/README.md`](../decisions/README.md).

## Documentos de arquitetura

| Documento | Conteúdo |
|---|---|
| [`FUNCTIONAL_ARCHITECTURE.md`](FUNCTIONAL_ARCHITECTURE.md) | Capacidades do MVP (C1–C12), dependências e portas de integração |
| [`DOMAIN_BOUNDARIES.md`](DOMAIN_BOUNDARIES.md) | Módulos de domínio (B1–B7), ownership de dados e fronteiras |
| [`ARCHITECTURE_DRIVERS.md`](ARCHITECTURE_DRIVERS.md) | Drivers arquiteturais (ADRV-001..014) derivados dos requisitos |
| [`SYSTEM_CONTEXT.md`](SYSTEM_CONTEXT.md) | Visão C4 — contexto: atores e sistemas externos |
| [`CONTAINER_ARCHITECTURE.md`](CONTAINER_ARCHITECTURE.md) | Visão C4 — containers lógicos do MVP |
| [`STACK_EVALUATION.md`](STACK_EVALUATION.md) | Comparação fundamentada de stacks e alternativas |
| [`AI_USAGE_BOUNDARIES.md`](AI_USAGE_BOUNDARIES.md) | Onde há IA no MVP — e onde não deve haver |
| [`SECURITY_ARCHITECTURE.md`](SECURITY_ARCHITECTURE.md) | Ativos, fronteiras de confiança, ameaças e controles |
| [`ARCHITECTURE_REVIEW.md`](ARCHITECTURE_REVIEW.md) | Red Team da própria proposta: trade-offs, dívidas, gatilhos |

## Decisões aceitas (ADRs)

Todos com status `Accepted` (HG-002 · 2026-08-22) — ver [`../decisions/`](../decisions/README.md):

ADR-001 estilo arquitetural · ADR-002 backend · ADR-003 frontend · ADR-004 persistência · ADR-005 tenant · ADR-006 assíncrono · ADR-007 documentos · ADR-008 comunicação · ADR-009 autenticação · ADR-010 IA · ADR-011 deployment.

## Preocupações arquiteturais preliminares

A lista abaixo registra **preocupações futuras** que influenciarão as escolhas técnicas. Nenhuma delas possui implementação ou tecnologia definida:

- **Multi-tenancy** — isolamento lógico/físico entre clientes;
- **Autenticação** — identidade de usuários e organizações;
- **Autorização e RBAC** — controle de acesso por papéis;
- **Isolamento de dados** — nenhum cliente acessa dados de outro;
- **Auditoria** — reconstrução de execuções relevantes;
- **Rastreabilidade** — origem, contexto e resultado das ações;
- **Execução assíncrona** — processamento de tarefas fora do caminho síncrono;
- **Retries** — reprocessamento seguro de falhas transitórias;
- **Idempotência** — repetições sem efeitos colaterais indevidos;
- **Workflows** — orquestração de etapas, aprovações e escalonamentos;
- **Integração com sistemas externos** — conexões controladas e auditáveis;
- **Gerenciamento de segredos** — armazenamento e rotação seguros;
- **Observabilidade** — logs, métricas e rastreamento;
- **Custos de IA** — medição e controle de consumo por tenant/execução;
- **Limites de consumo** — quotas e proteção contra uso descontrolado;
- **Versionamento de funcionários digitais** — evolução controlada de funções e comportamentos;
- **Aprovação humana** — pontos formais de revisão no fluxo;
- **Tratamento de exceções** — escalonamento explícito e confiável;
- **LGPD** — conformidade no tratamento de dados pessoais;
- **Retenção de dados** — políticas de guarda e eliminação;
- **Segurança** — proteção de dados empresariais sensíveis desde o primeiro dia;
- **Escalabilidade** — crescimento previsível com o volume de execução.

## Próximo passo — sequência recomendada para a Fase 003

> **Status (Fase 003):** Etapas A–E executadas como proposta. A sequência abaixo é mantida como registro do método.

A seleção de tecnologia deve vir **depois** da definição dos drivers arquiteturais: a stack serve ao produto, não o contrário. Ordem recomendada:

**Etapa A — Arquitetura funcional.** Definir capacidades e responsabilidades do MVP: identidade, tenant, usuários, gestão do Funcionário Digital, tarefas, execuções, comunicação, documentos, supervisão humana, escalonamentos, auditoria, integrações. Não transformar automaticamente esses conceitos em microsserviços.

**Etapa B — Fluxos e boundaries.** Identificar responsabilidades, dependências, contextos, fronteiras, dados críticos, integrações externas e eventos relevantes. Conceitos de bounded contexts apenas se realmente úteis — sem DDD cerimonial.

**Etapa C — Requisitos direcionadores.** Usar FRs, NFRs e restrições da Fase 002 ([`../product/FUNCTIONAL_REQUIREMENTS.md`](../product/FUNCTIONAL_REQUIREMENTS.md), [`../product/NON_FUNCTIONAL_REQUIREMENTS.md`](../product/NON_FUNCTIONAL_REQUIREMENTS.md)) para identificar os drivers arquiteturais.

**Etapa D — Decisões arquiteturais.** Somente então iniciar ADRs (`Proposed` → `Accepted`) sobre arquitetura geral, stack, persistência, comunicação, autenticação, multi-tenancy, processamento assíncrono, documentos, observabilidade e provedor de IA, se necessário.

**Etapa E — Integrações específicas.** Por último, decidir canal de comunicação com cliente final (e-mail é hipótese inicial; WhatsApp é alternativa a avaliar), recebimento de documentos e serviços externos — sempre baseado nas evidências de validação de produto.
