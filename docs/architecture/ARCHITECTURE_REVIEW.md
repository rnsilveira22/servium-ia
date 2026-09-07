# Architecture Review — Servium IA MVP (Red Team da Fase 003)

> **Fase 003 — Revisão crítica da própria proposta.** Perguntas difíceis feitas à arquitetura proposta (ADRs 001–011, todos `Proposed`), com achados honestos.

## Pontos fortes

1. **Proporcionalidade**: nenhuma peça de infraestrutura sem requisito que a sustente (sem Redis, sem Kubernetes, sem broker, sem IdP externo);
2. **Confiança como centro**: idempotência de envios, auditoria imutável e gates humanos são estruturais, não features;
3. **Tenant awareness desde o dia um** (shared schema + RLS + testes de vazamento) — piloto single-tenant sem dívida estrutural;
4. **Canal e IA atrás de portas**: as duas maiores incertezas de produto (canal definitivo, papel real de LLM) ficam isoladas em decisões reversíveis;
5. **Fronteiras documentadas antes da stack** — a ordem Produto→Capacidades→Boundaries→Drivers→ADRs foi respeitada.

## Trade-offs aceitos

| Decisão | Ganho | Custo aceito |
|---|---|---|
| Monólito modular | Simplicidade, transações locais | Disciplina de fronteiras; extração futura deliberada |
| Jobs no Postgres | Zero infra nova | Throughput/latência limitados; polling |
| Shared schema + RLS | Operação única, métricas fáceis | Vazamento por bug depende de RLS + testes |
| Auth first-party | Controle, zero dependência | Responsabilidade de acertar segurança básica |
| PaaS de entrada | Backups/TLS/recuperação gerenciados | Custo > VPS bruto; limites da plataforma |
| React sobre Vue | Ecossistema/contratação | Se equipe for Vue-first, decisão será revertida |

## Dívidas deliberadas (registradas, não escondidas)

1. Sem 2FA no piloto (registrada em Security — evolução próxima);
2. Sem antivírus/sandbox de anexos (validação básica apenas);
3. Sem CI/CD definido nesta fase (próximo passo natural pós-aprovação dos ADRs);
4. Sem testes de carga (escala do piloto não justifica);
5. Observabilidade inicial simples (logs/métricas; tracing completo depois);
6. `NFR-011/013/016` com valores TBD até baseline.

## O que deliberadamente NÃO estamos construindo

Microsserviços · message broker · Kubernetes · multi-tenant self-service/billing · segundo Funcionário Digital · WhatsApp automatizado · integração com ERPs/portais · chatbot livre · app mobile · ML treinado sob medida · data lake/analytics platform.

## Críticas do Red Team (e respostas)

1. **"Superarquitetando?"** — Risco baixo: 7 módulos num único deployável é o mínimo estruturado possível; a alternativa "sem módulos" seria mais barata hoje e mais cara amanhã. Mantido.
2. **"Componente sem requisito?"** — Workflow engine e fila dedicada foram explicitamente rejeitados; nada existe sem driver. Nenhuma tecnologia entrou por preferência — cada ADR lista alternativas reais.
3. **"LLM onde regra resolveria?"** — Não: LLM restrito a classificação assistiva de respostas/documentos ambíguos, saída nunca conclusiva (ADR-010). Vigiar tentação futura de "IA everywhere".
4. **"Microsserviço prematuro?"** — Não; risco real é o oposto: monólito sem fronteiras. Mitigado por DOMAIN_BOUNDARIES + lint de dependências.
5. **"Infra que o piloto não precisa?"** — Object storage gerenciado poderia ser filesystem? Poderia, mas integridade/retenção LGPD (NFR-005/010) justificam desde já; custo marginal mínimo.
6. **"Tenant isolation preservado?"** — Sim, com defesa em duas camadas (aplicação + RLS) e testes dedicados; ponto mais sensível permanece erro humano em políticas RLS → pipeline obrigatório.
7. **"Auditoria adequada?"** — Append-only com evidências cobre o fluxo todo; falta definir retenção exata da trilha (depende de política jurídica — pendência humana).
8. **"HITL presente?"** — Gates de ativação/aprovação/exceção/kill switch são estados do fluxo central, não opcionais.
9. **"Evolução sem reescrita?"** — Novo canal = novo adaptador; novo Funcionário Digital = nova configuração + módulo de comportamento; funções administrativas multi-tenant cabem nas fronteiras atuais.
10. **"Compreensível para equipe pequena?"** — Sim: 1 deployável + 1 banco + storage; qualquer dev sênior opera isso sozinho.
11. **"Custo razoável?"** — Estimativa de entrada em PaaS gerenciado é de dezenas, não centenas, de reais mensais no piloto; monitorado via M-11.

## Triggers para reavaliar a arquitetura

- Volume ≥ ordem de grandeza acima do piloto (jobs/fila primeiro);
- Segundo Funcionário Digital com ciclo de vida independente;
- Equipe crescendo para múltiplas squads com domínios distintos;
- Cliente enterprise exigindo isolamento físico/compliance específico;
- Necessidade real de canal multimodal rico (voz/WhatsApp conversacional);
- Custos de IA/canal distorcendo a economia unitária (M-11).

## Conclusão

Arquitetura **proporcional ao estágio**, segura nos pontos inegociáveis (tenant, auditoria, idempotência, HITL) e reversível nas apostas incertas (canal, IA, frontend framework). Pronta para revisão humana — nenhum ADR aceito automaticamente.
