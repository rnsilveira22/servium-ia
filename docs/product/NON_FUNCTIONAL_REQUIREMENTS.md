# Requisitos Não Funcionais do MVP — Servium IA

> **Fase 002 — Discovery do MVP**
> NFRs preliminares, derivados dos princípios ([`../PRODUCT_PRINCIPLES.md`](../PRODUCT_PRINCIPLES.md)) e das preocupações arquiteturais ([`../architecture/README.md`](../architecture/README.md)).
>
> Valores marcados como `TBD` serão definidos na Fase 003 (Arquitetura) ou após baseline do piloto. **Nenhum SLA comercial é definido nesta fase.**

## Segurança e privacidade

### NFR-001 — Isolamento e consciência de tenant (tenant awareness)

**Descrição:** todos os dados e execuções pertencem a um tenant identificado — usuários, clientes, checklists, tarefas, execuções e documentos estão associados ao seu tenant, com autorização contextual e isolamento lógico desde o início. Nenhum dado de um escritório pode ser acessado por outro em qualquer circunstância, incluindo documentos recebidos de clientes finais. O MVP pode operar inicialmente com um único tenant ativo no piloto, mas a solução **não deve nascer estruturalmente acoplada a um único cliente**: nenhuma decisão que assuma single-tenant de forma hardcoded ou que torne excessivamente custosa a evolução para múltiplos tenants.

**Métrica/verificação:** testes de isolamento; verificação de que toda entidade relevante carrega identidade de tenant; revisão arquitetural na Fase 003.

**Prioridade:** Must

### NFR-002 — Controle de acesso por papéis

**Descrição:** acesso às funções do MVP restrito a usuários autenticados do tenant, com papéis mínimos para o piloto (ex.: responsável/gestor).

**Métrica/verificação:** matriz de acesso documentada na Fase 003.

**Prioridade:** Must

### NFR-003 — Gerenciamento de segredos

**Descrição:** credenciais (canais de comunicação, infraestrutura) fora do código, com acesso controlado e auditável.

**Métrica/verificação:** nenhuma credencial versionada; mecanismo definido via ADR.

**Prioridade:** Must

### NFR-004 — Proteção de dados pessoais (LGPD)

**Descrição:** tratamento de dados pessoais com mínimo necessário, finalidade definida, base legal mapeada e direitos dos titulares atendíveis.

**Métrica/verificação:** revisão jurídica antes do piloto; registro das operações de tratamento.

**Prioridade:** Must

### NFR-005 — Retenção e eliminação de dados

**Descrição:** política explícita de retenção de documentos e registros do piloto, com eliminação segura ao término ou a pedido.

**Métrica/verificação:** política documentada (`TBD` — Fase 003 + jurídico) e executável.

**Prioridade:** Must

## Auditabilidade e rastreabilidade

### NFR-006 — Trilha de auditoria imutável

**Descrição:** registros de ações do Funcionário Digital não podem ser alterados ou apagados; consultáveis por item/ciclo/cliente.

**Métrica/verificação:** reconstrução completa da história de qualquer item em auditoria simulada.

**Prioridade:** Must

### NFR-007 — Rastreabilidade de comunicações

**Descrição:** cada mensagem enviada ao cliente final vinculada a template, limites vigentes, item, ciclo e resultado.

**Métrica/verificação:** amostragem de mensagens enviadas com cadeia completa recuperável.

**Prioridade:** Must

## Confiabilidade

### NFR-008 — Idempotência de operações internas

**Descrição:** retries e reprocessamentos não geram efeitos duplicados (em especial: nunca enviar mensagem duplicada ao cliente final).

**Métrica/verificação:** testes de reexecução sem duplicação de envios.

**Prioridade:** Must

### NFR-009 — Tolerância a falhas de canal externo

**Descrição:** indisponibilidade do canal de comunicação não corrompe estados nem dispara envios em rajada na recuperação.

**Métrica/verificação:** comportamento definido e testado para falha/recuperação do canal.

**Prioridade:** Must

### NFR-010 — Integridade de documentos recebidos

**Descrição:** documento recebido e registrado não pode ser modificado silenciosamente; substituições exigem trilha própria.

**Métrica/verificação:** verificação de integridade em auditoria.

**Prioridade:** Must

### NFR-011 — Disponibilidade

**Descrição:** disponibilidade suficiente para operação em horário comercial durante o piloto.

**Valor:** `TBD` (sem SLA comercial nesta fase; meta operacional definida na Fase 003).

**Prioridade:** Should

## Observabilidade e desempenho

### NFR-012 — Observabilidade das execuções

**Descrição:** logs, métricas e rastreamento suficientes para diagnosticar falhas e auditar comportamento do Funcionário Digital.

**Métrica/verificação:** incidente simulado diagnosticável sem acesso a dados de produção ad hoc.

**Prioridade:** Must

### NFR-013 — Tempo de resposta interativo

**Descrição:** operações interativas do painel (status, filas de exceção) respondem em tempo adequado ao uso humano contínuo.

**Valor:** `TBD` (definir alvo na Fase 003; sem falsa precisão agora).

**Prioridade:** Should

### NFR-014 — Capacidade compatível com o piloto

**Descrição:** suportar o volume do escritório piloto (dezenas de clientes × itens mensais) com folga, sem otimização prematura para escala.

**Valor:** `TBD` após baseline do piloto.

**Prioridade:** Must

## Custos e recuperação

### NFR-015 — Custos operacionais controlados e visíveis

**Descrição:** custos de execução (incluindo eventuais serviços de IA e comunicação) mensuráveis por tenant/execução desde o piloto.

**Métrica/verificação:** custo por ciclo calculável.

**Prioridade:** Should

### NFR-016 — Recuperação de dados

**Descrição:** perda máxima tolerável e tempo de recuperação definidos para o contexto do piloto; backups executados e testados.

**Valor:** RPO/RTO `TBD` (Fase 003).

**Prioridade:** Must

### NFR-017 — Tempo de resposta das comunicações automáticas

**Descrição:** cobranças disparadas dentro da janela configurada são efetivamente enviadas no mesmo dia útil.

**Métrica/verificação:** % de envios no dia programado ≥ meta definida após baseline.

**Prioridade:** Should
