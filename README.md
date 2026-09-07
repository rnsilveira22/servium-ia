# Servium IA

**Servium IA** é uma plataforma B2B de **funcionários digitais especializados**: força de trabalho digital organizada, com funções definidas, permissões controladas e supervisão humana, criada para assumir atividades operacionais e rotineiras de empresas — começando por escritórios de contabilidade.

> **Status: MVP-01 em remediação pré-piloto — P0.1 resolvido/margeado · restam P0.2/P0.3**
>
> O backlog da **Onda 0–1 do MVP-01** foi implementado como **monorepo TypeScript executável** (API NestJS + SPA React + pacote de banco com migrations/RLS + suíte E2E Selenium), a partir do vertical slice definido pelo spike **SRV-10** (2026-08-23) e das decisões arquiteturais registradas nos **ADR-001..011 (Accepted, HG-002)**. O **P0.1 (runtime do Funcionário Digital)** foi implementado e mergeado (PRs #61–#66; issues #45–#50). Restam **P0.2 (auditoria #9)** e **P0.3 (hardening de auth #20)** antes de redeclarar `PILOT_READY`. A **Software Factory V2** (Orchestrator, 14 estados canônicos, merge por classe) foi aprovada por human gates em 2026-09-04 (HG-F2-01/02/03 + HG-REC-01). A hipótese de MVP permanece documentada em [`docs/product/MVP_DISCOVERY.md`](docs/product/MVP_DISCOVERY.md) e **aguarda validação com escritórios contábeis reais**.

---

## Visão

Empresas deverão poder manter uma **força de trabalho digital organizada** — não uma coleção solta de chatbots ou automações isoladas. Cada funcionário digital terá função, responsabilidades, ferramentas, limites e supervisão, executando tarefas operacionais enquanto profissionais humanos permanecem no controle das decisões, das exceções e do que realmente exige julgamento.

## Problema

Empresas acumulam grande volume de trabalho:

- repetitivo e operacional;
- previsível e baseado em regras;
- dependente de múltiplos sistemas;
- sujeito a atrasos, retrabalho e erros manuais.

Esse trabalho consome tempo de equipes qualificadas, aumenta custo operacional e reduz a capacidade de foco em atividades de maior valor.

## Solução

Funcionários digitais especializados poderão assumir essas atividades:

- executando rotinas e fluxos operacionais de ponta a ponta;
- interagindo com sistemas e pessoas quando necessário;
- **encaminhando exceções para humanos** em vez de improvisar;
- operando sempre sob permissões mínimas, registro auditável e supervisão humana.

Profissionais humanos permanecem responsáveis por decisões, exceções e atividades de maior valor.

## Mercado inicial

O primeiro mercado-alvo são os **escritórios de contabilidade brasileiros**, um segmento com forte carga de rotinas operacionais, prazos recorrentes e integração com sistemas externos.

Isso representa o **vertical inicial**, não uma limitação da plataforma: a arquitetura não deve acoplar permanentemente o produto ao setor contábil.

## Conceito de Funcionário Digital

Um funcionário digital **não é apenas um chatbot**. É uma unidade de trabalho digital com identidade própria dentro da organização, podendo possuir:

| Dimensão | Descrição preliminar |
|---|---|
| Função | Papel que exerce (ex.: atendimento, classificação, rotinas contábeis) |
| Responsabilidades | O que lhe é atribuído |
| Capacidades | O que sabe fazer |
| Ferramentas | Sistemas e recursos que pode utilizar |
| Permissões | O que tem autorização para acessar e executar |
| Contexto | Informações necessárias para sua atuação |
| Tarefas | Unidades de trabalho que executa |
| Limites operacionais | Onde deve parar e escalar |
| Supervisão | Como é monitorado e revisado |
| Histórico de execução | Registro auditável do que fez |
| Escalonamento | Mecanismos de encaminhamento a humanos |

A definição formal evoluirá na fase de especificação do MVP (ver [roadmap](#roadmap)).

## Princípios

1. **Humano no controle** — humanos permanecem responsáveis por decisões críticas e exceções.
2. **Segurança por padrão** — dados empresariais sensíveis exigem proteção desde o primeiro dia.
3. **Isolamento entre clientes** — nenhum cliente acessa dados de outro.
4. **Auditabilidade** — toda execução relevante pode ser reconstruída posteriormente.
5. **Rastreabilidade** — ações têm origem, contexto e resultado registrados.
6. **Menor privilégio** — cada funcionário digital possui somente as permissões necessárias.
7. **Automação responsável** — automatizar o que é seguro e validado, não tudo o que é possível.
8. **Tratamento explícito de exceções** — falhas e casos fora do padrão são escalados, nunca ignorados.
9. **Arquitetura evolutiva** — decisões incrementais guiadas por ADRs, sem excesso prematuro.
10. **Observabilidade** — execuções produzem logs, métricas e rastreamento adequados.
11. **Idempotência quando aplicável** — repetições não devem gerar efeitos colaterais indevidos.

Detalhes em [`docs/PRODUCT_PRINCIPLES.md`](docs/PRODUCT_PRINCIPLES.md).

## Arquitetura

Stack escolhida e registrada nos **ADR-001..011** (`Accepted` via HG-002): monólito modular em **TypeScript** (backend **NestJS** + SPA **React**), **PostgreSQL** único com **RLS deny-by-default** e `tenant_id` contextual (ADR-004/005), **jobs persistidos no banco** com SKIP LOCKED/idempotency keys (ADR-006), porta de comunicação `CommunicationChannel` (ADR-008), autenticação first-party com sessões httpOnly (ADR-009) e **deterministic-first** (ADR-010). O repositório é um **monorepo executável** — veja [`MONOREPO.md`](MONOREPO.md) para estrutura e comandos. Decisões registradas em [`docs/decisions/`](docs/decisions/README.md); preocupações arquiteturais em [`docs/architecture/README.md`](docs/architecture/README.md).

## Documentação

| Documento | Finalidade |
|---|---|
| [`docs/PROJECT_VISION.md`](docs/PROJECT_VISION.md) | Visão do produto, problema, proposta de valor e hipóteses |
| [`docs/PRODUCT_PRINCIPLES.md`](docs/PRODUCT_PRINCIPLES.md) | Princípios de produto e engenharia |
| [`docs/GLOSSARY.md`](docs/GLOSSARY.md) | Vocabulário oficial do domínio |
| [`docs/PROJECT_INDEX.md`](docs/PROJECT_INDEX.md) | Mapa de toda a documentação |
| [`docs/AI_CONTEXT.md`](docs/AI_CONTEXT.md) | Contexto e regras para agentes de IA |
| [`docs/architecture/README.md`](docs/architecture/README.md) | Preocupações arquiteturais preliminares |
| [`docs/decisions/README.md`](docs/decisions/README.md) | Processo de ADRs |
| [`docs/factory/ORCHESTRATOR.md`](docs/factory/ORCHESTRATOR.md) | Orchestrator da Software Factory V2 |
| [`docs/factory/DEVELOPMENT_WORKFLOW.md`](docs/factory/DEVELOPMENT_WORKFLOW.md) | Máquina de estados canônica V2 |
| [`docs/product/README.md`](docs/product/README.md) | Documentação de produto (discovery e especificação do MVP) |
| [`docs/roadmap/README.md`](docs/roadmap/README.md) | Roadmap por fases |

## Roadmap

Fases e objetivos — sem datas arbitrárias:

1. **Fundação** *(concluída)* — documentação, governança e definição do produto.
2. **Descoberta e especificação do MVP** *(concluída)* — primeiro problema, primeiro cliente, primeiro funcionário digital.
3. **Arquitetura** *(concluída)* — definição de stack e arquitetura via ADRs (HG-002).
4. **Core da plataforma** *(em curso)* — capacidades fundamentais da Onda 0–1 do MVP-01 implementadas; P0.1 resolvido; restam P0.2/P0.3.
5. **Primeiro funcionário digital** — primeiro caso de uso real (motor determinístico de pendências e runtime do Funcionário Digital — implementados e mergeados).
6. **Piloto** — execução em ambiente controlado (decisão de comunicação: Gmail API + OAuth; local/CI/E2E via Mailpit).
7. **Validação** — medição de resultados.
8. **Evolução comercial** — preparação para escala.

Detalhes em [`docs/roadmap/README.md`](docs/roadmap/README.md).

## Desenvolvimento

Monorepo **npm workspaces** (`apps/*`, `packages/*`) — TypeScript. Comandos na raiz: `npm ci` · `npm run db:up` (Postgres via Docker) · `npm run migrate` · `npm run seed` · `npm run verify` (lint + build + typecheck + testes) · `npm run dev` · suíte E2E Selenium em `apps/e2e`. Detalhes em [`MONOREPO.md`](MONOREPO.md).

## Licença

Produto comercial proprietário. Direitos reservados — consulte o arquivo [`LICENSE`](LICENSE).
