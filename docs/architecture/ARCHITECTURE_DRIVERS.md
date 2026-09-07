# Drivers Arquiteturais do MVP — Servium IA

> **Fase 003 — Arquitetura do MVP** · Etapa C
> Drivers extraídos diretamente dos requisitos e registros existentes — nada aqui é inventado. Cada driver indica origem rastreável (FR/NFR/RSK/HYP/princípio) e as decisões que afeta.

## Classificação de prioridade

**Must** = inviabiliza o MVP se não atendido · **Should** = forte impacto no sucesso, negociável no detalhe.

## Drivers

### ADRV-001 — Tenant awareness e isolamento lógico

- **Origem:** NFR-001; FR-019 (nota); princípio *Multi-tenancy seguro*; RSK-004.
- **Descrição:** toda entidade carrega identidade de tenant; autorização contextual por tenant; impossibilidade de vazamento entre clientes; piloto single-tenant sem acoplamento estrutural.
- **Impacto arquitetural:** modelo de dados com tenant_id universal; filtros/RLS em toda leitura; testes de isolamento; proibição de cache/contexto global por cliente.
- **Prioridade:** Must
- **Decisões afetadas:** ADR-001, ADR-004, ADR-005, ADR-009.

### ADRV-002 — Auditabilidade imutável

- **Origem:** FR-013; NFR-006, NFR-007; princípio *Auditabilidade*.
- **Descrição:** reconstrução completa de qualquer item/ciclo posteriormente; trilha append-only separada de logs técnicos.
- **Impacto arquitetural:** evento de auditoria como cidadão de primeira classe; evidências anexadas (mensagem, documento, veredito); sem deletes/updates na trilha.
- **Prioridade:** Must
- **Decisões afetadas:** ADR-001, ADR-004, ADR-007.

### ADRV-003 — Idempotência de efeitos externos

- **Origem:** NFR-008; RSK-012; princípio *Idempotência*.
- **Descrição:** retries e reprocessamentos nunca duplicam envios ao cliente final nem efeitos documentais.
- **Impacto arquitetural:** registro de intenção antes do efeito (outbox conceitual); chaves de idempotência por ação externa; contagem social de tentativas separada de retries técnicos.
- **Prioridade:** Must
- **Decisões afetadas:** ADR-006, ADR-008.

### ADRV-004 — Human-in-the-loop como gate arquitetural

- **Origem:** FR-003, FR-005, FR-010, FR-012; princípios *Human-in-the-loop*, *Escalation*, *Automação responsável*; RSK-008.
- **Descrição:** gates formais (ativação de ciclo, aprovações, fila de exceções, kill switch) fazem parte do fluxo central, não são enfeites.
- **Impacto arquitetural:** estados de aprovação na máquina de execução; fila de supervisão com contexto completo; pausa imediata de autonomia.
- **Prioridade:** Must
- **Decisões afetadas:** ADR-001, ADR-006.

### ADRV-005 — Processamento assíncrono agendado

- **Origem:** FR-005..FR-007; NFR-017; OPERATIONAL_FLOW (agendador).
- **Descrição:** ciclos, cobranças e retries ocorrem em background, fora do caminho interativo.
- **Impacto arquitetural:** mecanismo de jobs persistidos e recuperáveis a falhas; agendamento por janela configurada.
- **Prioridade:** Must
- **Decisões afetadas:** ADR-006, ADR-011.

### ADRV-006 — Integração externa tolerante a falhas

- **Origem:** NFR-009; RSK-005; HYP-005.
- **Descrição:** canal de comunicação e storage são serviços externos sujeitos a indisponibilidade/limites; falha não pode corromper estados nem disparar rajadas na recuperação.
- **Impacto arquitetural:** portas/adaptadores para provedores; backoff; circuit breaker conceitual; canal trocável sem reescrita.
- **Prioridade:** Must
- **Decisões afetadas:** ADR-007, ADR-008.

### ADRV-007 — Documentos: integridade, LGPD e retenção

- **Origem:** NFR-004, NFR-005, NFR-010; RSK-004; FR-008, FR-009.
- **Descrição:** documentos são dados pessoais potenciais: hash de integridade, metadados completos, vínculo auditável, retenção/eliminação executável.
- **Impacto arquitetural:** storage dedicado com metadados no banco; imutabilidade do conteúdo; política de ciclo de vida desde o design.
- **Prioridade:** Must
- **Decisões afetadas:** ADR-004, ADR-007.

### ADRV-008 — Observabilidade com custo visível

- **Origem:** NFR-012, NFR-015; M-11; princípio *Observabilidade*.
- **Descrição:** logs estruturados, métricas e correlação (tenant/task/execution) desde o piloto; custos operacionais mensuráveis por tenant/execução.
- **Impacto arquitetural:** correlation IDs padronizados; instrumentação nativa; separação observabilidade técnica × auditoria de negócio.
- **Prioridade:** Should
- **Decisões afetadas:** ADR-002, ADR-011.

### ADRV-009 — Segurança de segredos e dados sensíveis

- **Origem:** NFR-003; RSK-004; princípios *Segurança por padrão*, *Least Privilege*.
- **Descrição:** credenciais de provedores fora do código; acesso mínimo por papel; logs sem dados sensíveis.
- **Impacto arquitetural:** gerenciamento de segredos externo ao deploy; sanitização de logs; RBAC mínimo.
- **Prioridade:** Must
- **Decisões afetadas:** ADR-009, ADR-011.

### ADRV-010 — Evolutividade sem reescrita

- **Origem:** PROJECT_VISION (vertical inicial não limitante); FR-017..019 (Won't agora, candidatos depois); EPICs futuros.
- **Descrição:** novos canais, novos Funcionários Digitais e funções administrativas multi-tenant devem caber na arquitetura sem reescrita total.
- **Impacto arquitetural:** módulos com fronteiras estáveis; portas para provedores; configuração declarativa de Funcionários Digitais.
- **Prioridade:** Should
- **Decisões afetadas:** ADR-001, ADR-008, ADR-010.

### ADRV-011 — Simplicidade operacional e baixo custo

- **Origem:** PRODUCT_PRINCIPLES (*Evolução incremental*); MVP_SCOPE (restrições); contexto de equipe pequena; RSK-009.
- **Descrição:** operável por 1–3 pessoas; infraestrutura mínima; custo proporcional ao piloto.
- **Impacto arquitetural:** preferência por menos peças móveis; serviços gerenciados de entrada; zero Kubernetes.
- **Prioridade:** Must
- **Decisões afetadas:** ADR-001, ADR-006, ADR-011.

### ADRV-012 — Velocidade até o piloto

- **Origem:** VALIDATION_PLAN; SUCCESS_METRICS (baseline rápido); HYP-001..004.
- **Descrição:** hipóteses precisam de produto real rápido; produtividade da stack importa mais que performance bruta (carga do piloto é trivial).
- **Impacto arquitetural:** stack com alta produtividade e boa tooling; monorepo compartilhando tipos quando possível.
- **Prioridade:** Must
- **Decisões afetadas:** ADR-002, ADR-003.

### ADRV-013 — Uso determinístico-first de IA

- **Origem:** AI_USAGE_BOUNDARIES (Etapa F); princípio *Automação responsável*; RSK-003, RSK-009.
- **Descrição:** LLM somente onde linguagem natural exige; regras determinísticas onde bastam; decisões sensíveis nunca delegadas a modelo.
- **Impacto arquitetural:** IA isolada atrás de porta própria; saídas de IA sempre passíveis de revisão humana; registro de versão/prompt para reprodutibilidade.
- **Prioridade:** Must
- **Decisões afetadas:** ADR-010.

### ADRV-014 — Responsividade interativa adequada

- **Origem:** NFR-013; FR-011 (painel); M-08 (satisfação do operador).
- **Descrição:** painel e filas respondem em tempo adequado ao uso humano contínuo (alvo TBD pós-baseline).
- **Impacto arquitetural:** leituras otimizadas para o painel; processamento pesado fora do caminho síncrono.
- **Prioridade:** Should
- **Decisões afetadas:** ADR-002, ADR-003, ADR-004.

## Resumo

| Driver | Prioridade | Decisões mais impactadas |
|---|---|---|
| ADRV-001 Tenant isolation | Must | ADR-004, ADR-005 |
| ADRV-002 Auditoria | Must | ADR-004 |
| ADRV-003 Idempotência | Must | ADR-006, ADR-008 |
| ADRV-004 HITL | Must | ADR-001, ADR-006 |
| ADRV-005 Async agendado | Must | ADR-006 |
| ADRV-006 Integrações tolerantes | Must | ADR-007, ADR-008 |
| ADRV-007 Documentos/LGPD | Must | ADR-004, ADR-007 |
| ADRV-008 Observabilidade/custo | Should | ADR-002, ADR-011 |
| ADRV-009 Segredos/sensível | Must | ADR-009, ADR-011 |
| ADRV-010 Evolutividade | Should | ADR-001, ADR-008, ADR-010 |
| ADRV-011 Simplicidade/custo | Must | ADR-001, ADR-011 |
| ADRV-012 Velocidade | Must | ADR-002, ADR-003 |
| ADRV-013 IA determinística-first | Must | ADR-010 |
| ADRV-014 Responsividade | Should | ADR-002, ADR-003 |
