# Requisitos Funcionais do MVP — Servium IA

> **Fase 002 — Discovery do MVP**
> Requisitos funcionais preliminares do primeiro MVP (Assistente Digital de Pendências Documentais). Priorização MoSCoW: **Must** (obrigatório) / **Should** (importante) / **Could** (desejável) / **Won't** (explicitamente fora desta versão).
>
> IDs são estáveis: requisitos nunca são renumerados; cancelamentos permanecem no registro.

## Gestão de checklists e configuração

### FR-001 — Manter checklist de documentos por cliente/obrigação

**Descrição:** o escritório pode criar, editar e desativar checklists que definem quais documentos/informações devem ser coletados de cada cliente para cada tipo de obrigação.

**Motivação:** base de todo o fluxo; formaliza conhecimento hoje implícito.

**Critério de aceite:** responsável cria um checklist com múltiplos itens, associa-o a clientes/obrigações e o sistema reflete a associação nos ciclos seguintes.

**Prioridade:** Must

### FR-002 — Cadastrar clientes e responsáveis designados

**Descrição:** o escritório mantém a lista de clientes atendidos pelo MVP, com dados de contato para cobrança e o responsável interno designado.

**Motivação:** direcionamento correto das comunicações e dos escalonamentos.

**Critério de aceite:** cliente criado com canal de contato e responsável; alterações refletem-se em novos ciclos.

**Prioridade:** Must

### FR-003 — Configurar limites de autonomia

**Descrição:** o escritório configura limites do Funcionário Digital: máximo de tentativas por item/ciclo, intervalo entre cobranças, janela de envio e templates aprovados.

**Motivação:** autonomia deve ser explícita e controlada (princípio *Automação responsável*).

**Critério de aceite:** limites editáveis; o Funcionário Digital respeita os valores vigentes no momento da execução, registrados na auditoria.

**Prioridade:** Must

### FR-004 — Gerenciar templates de mensagem aprovados

**Descrição:** o escritório cria e aprova os modelos de mensagem de lembrete/cobrança; apenas mensagens derivadas desses templates podem ser enviadas.

**Motivação:** nenhuma comunicação ao cliente final sem conteúdo aprovado.

**Critério de aceite:** template inativo não gera envios; cada mensagem enviada referencia o template usado.

**Prioridade:** Must

## Execução do ciclo

### FR-005 — Ativar ciclo de pendências com aprovação humana

**Descrição:** o responsável ativa um ciclo (período/obrigação) para um conjunto de clientes; somente após ativação começam as ações automáticas.

**Motivação:** ponto de aprovação humana obrigatório antes de qualquer contato com cliente final.

**Critério de aceite:** nenhum envio ocorre antes da ativação; a ativação é registrada com autoria.

**Prioridade:** Must

### FR-006 — Identificar itens pendentes automaticamente

**Descrição:** ao ativar o ciclo, o sistema compara o checklist de cada cliente com os recebimentos já registrados e marca itens pendentes.

**Motivação:** eliminar conferência manual inicial.

**Critério de aceite:** itens já resolvidos não são recobrados; pendências refletem fielmente o checklist vigente.

**Prioridade:** Must

### FR-007 — Enviar cobranças dentro dos limites configurados

**Descrição:** o Funcionário Digital envia lembretes aos clientes finais para itens pendentes, respeitando tentativas máximas, intervalos, janela de envio e templates.

**Motivação:** núcleo do valor — cobrança consistente sem esforço humano.

**Critério de aceite:** nenhum envio fora dos limites; toda tentativa exaurida resulta em escalonamento, não em nova mensagem.

**Prioridade:** Must

### FR-008 — Receber e associar respostas/documentos ao item correto

**Descrição:** documentos/respostas enviados pelo cliente chegam ao sistema e são associados ao item solicitado correspondente.

**Motivação:** fechar o laço entre cobrança e recebimento sem triagem manual.

**Critério de aceite:** documento recebido fica vinculado a cliente, item e ciclo, com origem registrada.

**Prioridade:** Must

### FR-009 — Validar recebimento de forma básica

**Descrição:** verificação básica do recebido: correspondência com o item solicitado, tipo/tamanho de arquivo esperado e legibilidade mínima.

**Motivação:** evitar aceitar documento errado silenciosamente; detectar problemas cedo.

**Critério de aceite:** recebimentos inválidos geram exceção escalada com motivo; válidos avançam para resolvido. Critérios detalhados por tipo de item são configuráveis (**nível de sofisticação da validação: a definir na Fase 003**).

**Prioridade:** Must

## Supervisão e exceções

### FR-010 — Escalonar exceções ao responsável

**Descrição:** situações definidas como exceção (limite esgotado, recusa, ambiguidade, documento inválido, pendência crítica próxima do prazo) são encaminhadas ao responsável designado com contexto completo.

**Motivação:** princípio *Escalation* — o digital nunca improvisa.

**Critério de aceite:** cada exceção chega ao responsável com histórico do item; item entra em estado `Escalado` e não recebe novas ações automáticas.

**Prioridade:** Must

### FR-011 — Painel de status consolidado

**Descrição:** visão do escritório com estado atual de pendências por cliente, obrigação e ciclo (pendente/cobrado/aguardando/em validação/escalado/resolvido).

**Motivação:** visibilidade consolidada é dor central identificada no discovery.

**Critério de aceite:** responsável consegue responder "o que está pendente e há quanto tempo" sem consultar conversas ou planilhas.

**Prioridade:** Must

### FR-012 — Resolver itens escalados com registro humano

**Descrição:** o responsável registra a decisão sobre itens escalados (resolvido, cancelado, reenviar com aprovação especial), com motivo.

**Motivação:** fechar o ciclo de supervisão com rastreabilidade.

**Critério de aceite:** decisão humana registrada com autoria e motivo; item sai da fila de exceções.

**Prioridade:** Must

## Auditoria e relatórios

### FR-013 — Registrar trilha auditável completa

**Descrição:** toda ação do Funcionário Digital (envios, validações, transições de estado, retries) é registrada de forma imutável e consultável, com timestamp e insumos.

**Motivação:** princípio *Auditabilidade*; requisito inegociável.

**Critério de aceite:** dado um item qualquer, é possível reconstruir sua história completa posteriormente.

**Prioridade:** Must

### FR-014 — Gerar relatório de fechamento de ciclo

**Descrição:** ao encerrar um ciclo, gerar resumo: recebidos × pendentes × escalados × cancelados, por cliente e no total.

**Motivação:** fechamento com revisão humana e insumo para métricas.

**Critério de aceite:** relatório disponível ao fim do ciclo e arquivado.

**Prioridade:** Must

### FR-015 — Notificar responsáveis sobre eventos relevantes

**Descrição:** notificações internas ao escritório para exceções novas, aprovações pendentes e pendências críticas próximas do prazo.

**Motivação:** intervenção humana oportuna sem vigilância constante.

**Critério de aceite:** eventos definidos geram notificação ao responsável designado em tempo útil.

**Prioridade:** Should

### FR-016 — Instrumentar métricas do piloto

**Descrição:** coletar os dados necessários às métricas definidas em [`SUCCESS_METRICS.md`](SUCCESS_METRICS.md) (tempos, taxas, intervenções).

**Motivação:** validar a hipótese central exige medição desde o primeiro dia.

**Critério de aceite:** métricas calculáveis a partir dos registros, sem instrumentação manual adicional.

**Prioridade:** Must

## Fora do MVP (Won't nesta versão)

### FR-017 — Comunicação via WhatsApp automatizada

**Descrição:** canal WhatsApp como meio automático de cobrança.

**Motivação do adiamento:** custo/política da plataforma e complexidade de aprovação. O canal de comunicação definitivo deverá ser decidido posteriormente através de validação de produto (entrevistas, operação real, comportamento dos clientes) e decisão arquitetural documentada — WhatsApp é alternativa relevante a avaliar, não escolha feita.

**Prioridade:** Won't (MVP) — candidato a avaliação pós-piloto

### FR-018 — Integração bidirecional com ERPs contábeis

**Descrição:** sincronização automática com sistemas de gestão do escritório.

**Motivação do adiamento:** piloto aceita carga manual; integração depende do software real do piloto.

**Prioridade:** Won't (MVP)

### FR-019 — Administração multi-tenant (self-service, billing, gestão comercial)

**Descrição:** onboarding autônomo de novos escritórios, administração completa de múltiplos tenants, billing por tenant e recursos avançados de configuração entre tenants.

**Motivação do adiamento:** o piloto opera com um único tenant ativo. **Atenção:** este item adere apenas as *funções administrativas* multi-tenant. A **consciência de tenant** (identidade, isolamento lógico e associação de dados/execuções ao tenant) permanece requisito desde o início — ver NFR-001. Nenhuma decisão estrutural single-tenant deve ser tomada.

**Prioridade:** Won't (MVP)
