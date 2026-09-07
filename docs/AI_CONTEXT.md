# Contexto para Agentes de IA — Servium IA

> Este documento orienta agentes de IA (e novos colaboradores) que trabalhem neste repositório. Leia-o integralmente antes de qualquer alteração.

## Projeto

**Servium IA** — plataforma B2B de funcionários digitais especializados.

## Missão

Permitir que empresas mantenham uma força de trabalho digital organizada: funcionários digitais com função, permissões, limites e supervisão humana, executando atividades operacionais e rotineiras.

## Mercado inicial

Escritórios de contabilidade brasileiros. **Vertical inicial, não limitação estrutural** — a arquitetura não deve acoplar a plataforma ao setor contábil.

## Estado atual

**MVP-01 implementado (Onda 0–1) e reconciliação pós-MVP aprovada por human gate (2026-08-30).** Existe **código de produto executável** no repositório: monorepo TypeScript (API NestJS + SPA React + pacote `@servium/db` com migrations/RLS). Stack = ADR-001..011 `Accepted` (HG-002): monólito modular TS, PostgreSQL com RLS deny-by-default, jobs no banco (SKIP LOCKED), porta `CommunicationChannel` (ADR-008), auth first-party (ADR-009), deterministic-first (ADR-010). **Estado atual oficial:** `PRE_PILOT_REMEDIATION_REQUIRED` (PILOT_READY invalidado) — remediações pré-piloto: **P0.1** runtime operacional do Funcionário Digital (wire de handlers no worker + scheduler + canal Gmail no fluxo real), **P0.2** trilha de auditoria append-only (Issue #9 — CA-04/CA-05 em aberto), **P0.3** hardening de autenticação #20 (senha fraca e rate-limit pendentes). Consulte [`reports/POST_MVP_BACKLOG_RECONCILIATION.md`](reports/POST_MVP_BACKLOG_RECONCILIATION.md) e [`factory/FACTORY_STATUS.md`](factory/FACTORY_STATUS.md). A hipótese de MVP (Assistente Digital de Pendências Documentais) permanece especificada em [`product/MVP_DISCOVERY.md`](product/MVP_DISCOVERY.md), **aguardando validação com escritórios reais** ([`product/VALIDATION_PLAN.md`](product/VALIDATION_PLAN.md)).

**Regra crítica:** os ADRs `Accepted` são vigentes e vinculantes; alterá-los exige novo ciclo de decisão (novo ADR que os substitua ou revisão formal registrada). Nenhum agente aceita o próprio ADR.

## Fonte da verdade

O próprio repositório `rnsilveira22/servium-ia`. Materiais antigos no ambiente local **não** fazem parte deste projeto e não devem ser considerados como referência.

## Regras para agentes

Todo agente deve:

1. ler [`README.md`](../README.md);
2. ler [`PROJECT_INDEX.md`](PROJECT_INDEX.md);
3. ler este arquivo (`AI_CONTEXT.md`);
4. verificar ADRs existentes em [`decisions/`](decisions/README.md);
5. verificar o estado atual do Git antes de alterar qualquer coisa;
6. não assumir requisitos inexistentes;
7. não inventar decisões arquiteturais;
8. preservar compatibilidade com decisões aceitas;
9. executar testes relevantes antes de concluir tarefas (quando houver testes definidos);
10. documentar decisões importantes em ADRs;
11. informar arquivos alterados;
12. informar testes executados;
13. informar riscos ou pendências;
14. nunca inserir credenciais no repositório.

## Regra de implementação

Futuras implementações **devem seguir a especificação validada do MVP** — em especial [`product/MVP_SCOPE.md`](product/MVP_SCOPE.md), [`product/FUNCTIONAL_REQUIREMENTS.md`](product/FUNCTIONAL_REQUIREMENTS.md) e [`product/NON_FUNCTIONAL_REQUIREMENTS.md`](product/NON_FUNCTIONAL_REQUIREMENTS.md). Não implementar requisitos fora do escopo definido, nem funcionalidades marcadas como `Won't` ou *Out of Scope*, sem decisão documentada que revise o escopo.

## Diretrizes de precisão arquitetural (revisão Fase 002.1)

- Operar inicialmente com um único tenant (piloto) **não autoriza arquitetura hardcoded single-tenant**: identidade e isolamento lógico por tenant são requisito desde o início (NFR-001);
- Parâmetros operacionais relevantes (ex.: política de tentativas de cobrança) devem ser tratados como **configuração**, não como constantes; valores iniciais são hipóteses do piloto;
- Hipóteses de produto **não são fatos** — mesmo documentadas, seguem sujeitas a refutação pela validação;
- Tecnologias devem ser escolhidas **depois** da definição dos drivers arquiteturais (ver sequência em [`architecture/README.md`](architecture/README.md)): a stack serve ao produto.

## Anti-alucinação de projeto

Um agente **não deve assumir como existentes** — nem em documentação, código ou discussão:

- APIs;
- bancos de dados;
- filas;
- provedores de IA;
- provedores de cloud;
- frameworks;
- serviços;
- funcionalidades;
- requisitos;
- integrações;

que não estejam **documentados neste repositório ou efetivamente implementados**.

Se um agente precisar de uma dessas premissas para propor algo, deve registrá-la explicitamente como hipótese ou proposta (por exemplo, em ADR com status `Proposed`), nunca como fato.

## Documentos de referência obrigatórios

| Documento | Uso |
|---|---|
| [`../README.md`](../README.md) | Porta de entrada do projeto |
| [`PROJECT_VISION.md`](PROJECT_VISION.md) | Visão, problema e hipóteses |
| [`PRODUCT_PRINCIPLES.md`](PRODUCT_PRINCIPLES.md) | Princípios que restringem decisões |
| [`GLOSSARY.md`](GLOSSARY.md) | Terminologia oficial |
| [`PROJECT_INDEX.md`](PROJECT_INDEX.md) | Mapa da documentação |
| [`product/MVP_DISCOVERY.md`](product/MVP_DISCOVERY.md) | Hipótese central do MVP |
| [`product/MVP_SCOPE.md`](product/MVP_SCOPE.md) | Escopo IN/OUT do MVP |
| [`architecture/README.md`](architecture/README.md) | Proposta arquitetural do MVP e índice de documentos |
| [`architecture/DOMAIN_BOUNDARIES.md`](architecture/DOMAIN_BOUNDARIES.md) | Módulos e fronteiras — referência para qualquer implementação |
| [`decisions/README.md`](decisions/README.md) | ADRs: processo e decisões (verificar status antes de usar) |
| [`factory/DEVELOPMENT_WORKFLOW.md`](factory/DEVELOPMENT_WORKFLOW.md) | Fluxo oficial de desenvolvimento, estados e regra de DONE |
| [`factory/AGENT_GOVERNANCE.md`](factory/AGENT_GOVERNANCE.md) | Governança, segurança e escalonamento para agentes |
| [`factory/HANDOFF_CONTRACTS.md`](factory/HANDOFF_CONTRACTS.md) | Contratos obrigatórios entre agentes (PO/Senior/Pleno/QA) |

## Software Factory (agentes OpenCode)

A equipe oficial de desenvolvimento por agentes é definida em `.opencode/agent/`: `servium-po`, `servium-senior`, `servium-pleno` e `servium-reviewer-qa`. Regras: nenhum histórico chega a `DONE` sem `QA_APPROVED AND PO_ACCEPTED`; QA é independente; permissões mínimas por agente. Detalhes em `factory/`.
