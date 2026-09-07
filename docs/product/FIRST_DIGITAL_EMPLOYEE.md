# Primeiro Funcionário Digital — Servium IA

> **Fase 002 — Discovery do MVP**
> Hipótese de especificação do primeiro Funcionário Digital. Selecionado pelos critérios de [`CANDIDATE_ROUTINES.md`](CANDIDATE_ROUTINES.md) (rotina RC-01). Tudo aqui é proposta sujeita a validação ([`VALIDATION_PLAN.md`](VALIDATION_PLAN.md)).

## Nome funcional provisório

**Assistente Digital de Pendências Documentais**

> Nome provisório e descritivo, escolhido pela função — não pelo apelo comercial. Nome definitivo será decidido depois da validação.

## Missão

Garantir que o escritório contábil disponha dos documentos e informações necessários de cada cliente para cada ciclo de obrigação, perseguindo pendências de forma consistente, educada e registrada, e encaminhando a humanos tudo o que exigir julgamento.

## Responsabilidades

1. Manter o status consolidado de pendências documentais por cliente/obrigação/ciclo;
2. Identificar itens pendentes no início de cada ciclo;
3. Enviar lembretes/cobranças ao cliente final dentro dos limites configurados;
4. Registrar respostas e recebimentos do cliente;
5. Realizar validação básica de conformidade do que foi recebido;
6. Organizar o recebido conforme convenções do escritório (classificação mínima);
7. Escalar exceções ao responsável pela rotina;
8. Produzir relatório de fechamento de ciclo.

## Atividades permitidas

- Consultar checklists e status de pendências do próprio tenant;
- Enviar mensagens padronizadas de lembrete/cobrança, dentro dos limites configurados (frequência, horário comercial, número máximo de tentativas), sempre identificadas como comunicação em nome do escritório;
- Receber e registrar documentos/respostas associados aos itens solicitados;
- Executar verificações básicas: tipo de arquivo esperado, legibilidade mínima, correspondência com o item solicitado;
- Classificar documentos recebidos nos itens corretos do checklist;
- Gerar relatórios e resumos de status para o escritório;
- Solicitar aprovação humana quando atingir um limite.

## Atividades proibidas

- Emitir guias, documentos fiscais ou qualquer conteúdo com efeito fiscal/financeiro/legal;
- Responder perguntas técnicas/consultivas do cliente final fora do escopo da cobrança;
- Alterar checklists, limites ou configurações por conta própria;
- Acessar dados de outros tenants ou dados além do mínimo necessário à função;
- Excluir ou sobrescrever documentos recebidos;
- Compartilhar documentos com terceiros;
- Reenviar cobranças após limite de tentativas sem escalonamento humano;
- Enviar qualquer comunicação fora dos templates aprovados pelo escritório.

## Entradas

- Checklists de documentos por cliente/obrigação (configurados pelo escritório);
- Calendário/ciclo de obrigações com prazos;
- Lista de clientes e responsáveis designados;
- Templates de mensagem aprovados pelo escritório;
- Limites de autonomia configurados;
- Respostas e documentos enviados pelos clientes finais.

## Saídas

- Mensagens de lembrete/cobrança enviadas (com registro auditável);
- Status atualizado de cada item (pendente / cobrado / recebido / validado / exceção / escalado);
- Documentos recebidos, classificados e armazenados;
- Notificações de exceção para o responsável;
- Relatório de fechamento de ciclo (recebido × pendente × escalado).

## Ferramentas necessárias

> Descritas por capacidade, **sem escolha de tecnologia** — a seleção técnica ocorrerá na Fase 003 via ADRs.

| Capacidade | Descrição |
|---|---|
| Canal de comunicação com cliente | Enviar mensagens e receber respostas/documentos (hipótese padrão: e-mail) |
| Armazenamento de arquivos | Guardar documentos recebidos de forma isolada por tenant |
| Registro de status | Consultar/atualizar estado de itens e ciclos |
| Agendador | Disparar ações por calendário/ciclo |
| Verificação básica de arquivos | Tipo, tamanho, legibilidade mínima |
| Notificador interno | Alertar responsáveis sobre exceções e aprovações pendentes |

## Permissões

Princípio: menor privilégio. O Funcionário Digital:

- acessa apenas os dados do próprio tenant;
- lê: checklists, clientes, prazos, templates, limites;
- escreve: status de itens, registros de execução, documentos recebidos;
- envia: apenas mensagens baseadas em templates aprovados, dentro dos limites;
- **não** possui permissão de exclusão, configuração ou acesso administrativo.

## Limites de autonomia

Configuráveis por escritório; valores abaixo são **hipóteses iniciais do piloto**, não regras definitivas do domínio:

| Limite | Hipótese inicial (configuração) |
|---|---|
| Máximo de tentativas de cobrança por item/ciclo (`max_attempts`) | **3** — valor preliminar, a validar com operação real |
| Intervalo mínimo entre cobranças do mesmo item | Definido pelo escritório (ex.: dias) |
| Janela de envio | Horário comercial do escritório |
| Envio automático | Somente templates aprovados, primeiro envio após ativação do ciclo pelo responsável |
| Volume anômalo | Se detectar volume/erro acima do esperado, pausa e escala |

> O número máximo de tentativas é **configuração, não constante**: `max_attempts = configuração`, com `3` apenas como hipótese inicial do piloto. Diferentes rotinas poderão ter políticas diferentes no futuro. Ver HYP-008 em [`RISKS_AND_HYPOTHESES.md`](RISKS_AND_HYPOTHESES.md).

## Pontos de aprovação humana

1. **Ativação do ciclo** — o responsável dispara/valida o início do ciclo antes da primeira cobrança automática;
2. **Alteração de limites/templates** — sempre humana;
3. **Ações fora dos limites** — qualquer envio além das regras exige aprovação;
4. **Reenvio após esgotar tentativas** — decisão humana;
5. **Encerramento de ciclo com pendências críticas** — revisão humana antes do fechamento.

## Exceções (o Funcionário Digital deve parar e escalar quando)

- Cliente recusa explicitamente enviar ou questiona a legitimidade da cobrança;
- Resposta ambígua ou não mapeada a nenhum item do checklist;
- Documento recebido não corresponde ao item solicitado, está ilegível ou corrompido;
- Item crítico próximo do prazo e ainda pendente;
- Falha técnica repetida no canal de comunicação;
- Qualquer sinal de dado pessoal sensível exposto indevidamente na troca.

## Escalonamentos

| Situação | Destino | Conteúdo |
|---|---|---|
| Limite de tentativas esgotado | Responsável pela rotina | Histórico de tentativas + sugestão de contato direto |
| Documento inválido/ambíguo | Responsável pela rotina | Documento + motivo da rejeição |
| Recusa/questionamento do cliente | Responsável pela rotina | Transcrição/contexto da resposta |
| Pendência crítica perto do prazo | Responsável + notificação ao gestor (se configurado) | Item, prazo, histórico |
| Falha técnica repetida | Fila operacional interna | Diagnóstico básico |

## Auditoria necessária

Para toda ação relevante, registro imutável de:

- o quê (ação executada), quando (timestamp), com qual insumo (item, cliente, template);
- resultado (sucesso/falha/exceção) e evidências (mensagem enviada, documento recebido, motivo de rejeição);
- quem aprovou intervenções humanas;
- trilha completa por item: solicitação → cobranças → resposta → validação → desfecho.

## Indicadores

Detalhados em [`SUCCESS_METRICS.md`](SUCCESS_METRICS.md). Principais ligados a este papel:

- % de itens recebidos antes do prazo;
- tempo humano economizado em cobrança/conferência;
- taxa de exceção e de escalonamento;
- taxa de erro (documento aceito indevidamente / cobrança incorreta).

## Dependências

- Canal de comunicação com cliente final: definitivo ainda a validar (hipótese inicial: e-mail; WhatsApp é alternativa a avaliar) — decisão posterior via validação de produto e decisão arquitetural documentada;
- Mecanismo seguro de recebimento de documentos;
- Checklists reais do escritório piloto;
- Configuração inicial feita pelo escritório (templates, limites, clientes).

## Hipóteses específicas deste papel

- HYP-002: escritórios delegam a cobrança a este papel digital supervisionado;
- HYP-003: clientes finais respondem bem às cobranças consistentes;
- HYP-004: checklists são padronizáveis com esforço razoável.

Ver [`RISKS_AND_HYPOTHESES.md`](RISKS_AND_HYPOTHESES.md).

## Questões a validar

1. Quais canais os clientes finais realmente usam para responder (e-mail? WhatsApp?)?
2. Que tipos de documento dominam as pendências (frequência por tipo)?
3. Quantas tentativas de cobrança são socialmente aceitáveis antes de contato humano?
4. O escritório quer revisar a primeira rodada de mensagens antes de automatizar envios subsequentes?
5. Existem clientes "especiais" que jamais devem receber cobrança automática?
