# MVP Discovery — Servium IA

> **Fase 002 — Discovery e Especificação do MVP**
> Este é o documento central da fase. Tudo aqui é **hipótese de discovery** até ser validado com escritórios contábeis reais.
>
> Classificação usada em todo o documento: **Confirmado** · **Hipótese** · **A validar** · **Decisão** · **Fora do escopo**

## Contexto

O Servium IA é uma plataforma B2B de funcionários digitais especializados. A Fase 001 estabeleceu visão, princípios e governança (ver [`../PROJECT_VISION.md`](../PROJECT_VISION.md)). Esta fase transforma essa visão ampla em uma hipótese de MVP específica, testável e especificada o suficiente para orientar a definição arquitetural (Fase 003).

Estado atual: não há código, stack ou integrações. Não há cliente piloto definido. Não há entrevistas realizadas.

## Problema amplo

Escritórios de contabilidade brasileiros operam com forte carga de trabalho repetitivo, baseado em regras e prazos recorrentes, executado manualmente por equipes frequentemente enxutas. Esse trabalho consome tempo de profissionais qualificados, gera atrasos e retrabalho, e escala mal: mais clientes implicam proporcionalmente mais esforço operacional.

## Problema do primeiro MVP

Dentro do problema amplo, o MVP ataca **um** problema específico:

> Escritórios contábeis perdem tempo e prazos perseguindo **pendências documentais**: a cada ciclo de obrigações (folha, fiscal, societário), falta um conjunto de documentos e informações dos clientes, e o escritório precisa cobrar, receber, conferir e organizar esses itens manualmente — por e-mail, WhatsApp e telefone, sem visibilidade consolidada do que já foi recebido e do que ainda falta.

Este problema foi selecionado por critérios objetivos documentados em [`CANDIDATE_ROUTINES.md`](CANDIDATE_ROUTINES.md) (ranking de rotinas candidatas). A seleção é **hipótese**, não conclusão.

## Cliente-alvo

- **Quem:** pequenos e médios escritórios de contabilidade brasileiros.
- **Perfil preliminar (hipótese):** entre ~5 e ~50 funcionários, com carteira de dezenas a centenas de clientes mensalistas, operando com rotinas mensais recorrentes (folha, impostos, obrigações acessórias) e processos de coleta de documentos majoritariamente manuais.
- **Decisão:** o MVP será validado inicialmente com **um escritório piloto real**, ainda não identificado (ver [`VALIDATION_PLAN.md`](VALIDATION_PLAN.md)).

## Usuários envolvidos

Papéis relevantes para este primeiro caso de uso (detalhados em [`PERSONAS.md`](PERSONAS.md)):

| Papel | Papel no MVP |
|---|---|
| Sócio/Gestor | Decide adoção; acompanha resultados agregados |
| Responsável pela rotina (contador/coordenador/operador) | Configura checklists, supervisiona o Funcionário Digital, trata escalonamentos |
| Cliente final do escritório | Recebe as cobranças de pendências e responde com documentos |

Papéis como gerente e analista **não são usuários distintos no MVP** — suas funções se confundem com "responsável pela rotina" em escritórios pequenos e médios (**hipótese a validar**).

## Situação atual

Fluxo típico hoje (**hipótese construída a partir de conhecimento setorial; a validar em entrevistas**):

1. Chega o período de uma obrigação (ex.: folha do mês, declaração anual).
2. O responsável monta mentalmente ou em planilha a lista de documentos necessários por cliente.
3. Alguém cobra os itens faltantes por WhatsApp, e-mail ou telefone — geralmente o próprio contador ou a recepção, sem roteiro padronizado.
4. Documentos chegam esparsamente, em formatos variados, às vezes errados ou ilegíveis.
5. Alguém confere item a item, organiza arquivos e repete a cobrança do que falta.
6. Perto do prazo, ocorre correria; itens críticos podem ser descobertos tarde.

## Dores

- Tempo de profissionais qualificados gasto em cobrança repetitiva (**a validar magnitude**);
- Falta de visibilidade consolidada: ninguém sabe, num painel, o que está pendente por cliente;
- Cobranças inconsistentes: cada pessoa cobra de um jeito, em horários diferentes;
- Documentos recebidos errados/ilegíveis descobertos tarde;
- Prazos perdidos ou apertados gerando horas extras, multas e desgaste com clientes;
- Desgaste relacional: cobrança manual repetida tensiona a relação com o cliente.

## Causas

- A lista de documentos necessários varia por cliente e por obrigação, mas raramente está formalizada como checklist;
- O controle de "quem deve o quê" vive na cabeça das pessoas, em planilhas ou no histórico de conversas;
- Não existe um "funcionário" dedicado a perseguir pendências com persistência educada;
- Os canais (e-mail, WhatsApp) não estão conectados a um registro central de status.

## Consequências

- Horas mensais perdidas por profissional em cobrança e conferência (**quantificar em entrevistas**);
- Retrabalho e risco de multas por obrigações entregues incompletas ou atrasadas;
- Sobrecarga concentrada nos períodos de fechamento;
- Capacidade de crescimento da carteira limitada pela capacidade operacional.

## Alternativas existentes

Como os escritórios resolvem isso hoje (**hipótese**):

1. **Planilhas de controle + cobrança manual** — solução dominante; funciona até certo volume, não escala;
2. **Funcionalidades de "pendências" em softwares de gestão contábil** — existem módulos em alguns ERPs do setor; adoção e uso efetivo variam; normalmente não fazem a cobrança ativa com acompanhamento inteligente (**verificar em entrevistas quais softwares o piloto usa e o que ele já oferece**);
3. **Grupos de WhatsApp por cliente** — informal, sem status consolidado, mistura assuntos;
4. **Estagiários/assistentes dedicados à cobrança** — custo recorrente, rotatividade, variação de qualidade.

## Oportunidade

Um Funcionário Digital dedicado a esse trabalho poderia:

- manter checklists formais por cliente/obrigação;
- identificar automaticamente o que está pendente;
- cobrar de forma consistente, educada e registrada, dentro de limites configurados;
- conferir e organizar o que chega;
- escalar para humanos exatamente os casos que exigem julgamento;
- dar ao escritório visibilidade consolidada do estado de cada cliente.

A dor é frequente, recorrente e sentida — mas isso é **hipótese a confirmar com evidência de entrevistas e piloto**.

## Hipótese de solução

> Um Funcionário Digital de Pendências Documentais, operando dentro de limites configurados pelo escritório e sob supervisão humana, reduz o tempo humano gasto em cobrança/conferência e aumenta a proporção de documentos recebidos antes do prazo — sem prejudicar o relacionamento com os clientes finais.

Especificação completa: [`FIRST_DIGITAL_EMPLOYEE.md`](FIRST_DIGITAL_EMPLOYEE.md). Escopo: [`MVP_SCOPE.md`](MVP_SCOPE.md).

## Hipóteses a validar

Registradas formalmente com IDs em [`RISKS_AND_HYPOTHESES.md`](RISKS_AND_HYPOTHESES.md). Resumo:

1. A dor de pendências documentais é relevante e prioritária o suficiente para justificar adoção;
2. Escritórios aceitam delegar a cobrança a um Funcionário Digital supervisionado;
3. Clientes finais respondem bem a cobranças digitais consistentes e educadas;
4. Checklists de documentos podem ser padronizados por escritório com esforço razoável;
5. O valor percebido (tempo economizado + pontualidade) sustenta um modelo comercial.

## Perguntas em aberto

Ver roteiro completo em [`VALIDATION_PLAN.md`](VALIDATION_PLAN.md). Principais:

- Como funciona hoje, passo a passo, a coleta de documentos para folha e para obrigações fiscais?
- Quanto tempo humano mensal isso consome? Quem faz?
- Que softwares o escritório já usa e o que eles já resolvem?
- O que acontece quando um cliente não responde às cobranças?
- Qual parte desse processo o escritório jamais delegaria a um sistema?
- Que canais os clientes finais preferem (e-mail, WhatsApp, telefone)?

## Critérios para avançar

Esta fase considera-se madura para avançar à Fase 003 (Arquitetura) quando:

- [x] Problema do MVP definido e especificado (este documento);
- [x] Primeiro Funcionário Digital proposto com limites e fluxo;
- [x] Requisitos funcionais e não funcionais preliminares documentados;
- [ ] **Validação com 3–5 escritórios** confirmando as hipóteses críticas HYP-001 a HYP-004 ([`RISKS_AND_HYPOTHESES.md`](RISKS_AND_HYPOTHESES.md));
- [ ] Escritório piloto candidato identificado.

As duas últimas condições exigem atividade humana externa a esta fase. A especificação produzida aqui foi desenhada para **não bloquear** o início da Fase 003 enquanto a validação ocorre, desde que as hipóteses críticas não sejam refutadas.
