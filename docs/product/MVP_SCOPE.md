# Escopo do MVP — Servium IA

> **Fase 002 — Discovery do MVP**
> Definição rígida de escopo da primeira entrega validável. Este documento é a referência para o que entra e o que não entra no MVP. Requisitos detalhados: [`FUNCTIONAL_REQUIREMENTS.md`](FUNCTIONAL_REQUIREMENTS.md) e [`NON_FUNCTIONAL_REQUIREMENTS.md`](NON_FUNCTIONAL_REQUIREMENTS.md).

## Objetivo

Validar, com um escritório contábil piloto real, a hipótese central:

> Um Funcionário Digital de Pendências Documentais, supervisionado e com limites configuráveis, reduz o tempo humano de cobrança/conferência e aumenta a pontualidade de recebimento de documentos — sem prejudicar o relacionamento com os clientes finais.

O MVP existe para gerar evidência, não para ser a plataforma completa.

## In Scope

- Um único tipo de Funcionário Digital: **Assistente Digital de Pendências Documentais** (nome provisório — ver [`FIRST_DIGITAL_EMPLOYEE.md`](FIRST_DIGITAL_EMPLOYEE.md));
- Um único tenant (o escritório piloto), operando em ambiente controlado;
- Gestão de checklists de documentos por cliente/obrigação, configurados pelo escritório;
- Identificação automática de itens pendentes por ciclo;
- Envio de lembretes/cobranças ao cliente final dentro dos limites configurados (canal definitivo: **ainda a validar**; hipótese inicial: e-mail);
- Recebimento e registro de respostas/documentos do cliente;
- Validação básica de recebimento (item corresponde ao solicitado? legível?) com escalonamento em caso de dúvida;
- Painel de status consolidado (pendências por cliente/ciclo) para o escritório;
- Tratamento de exceções com escalonamento humano explícito;
- Registro auditável de todas as ações do Funcionário Digital;
- Configuração de limites de autonomia (frequência de cobrança, horários, limite de tentativas antes de escalar);
- Relatório de fechamento de ciclo;
- Instrumentação para as métricas definidas em [`SUCCESS_METRICS.md`](SUCCESS_METRICS.md).

## Out of Scope

**Plataforma:**

- Funções administrativas multi-tenant: onboarding automatizado/self-service de tenants, billing por tenant, gestão comercial multiempresa e recursos avançados de configuração entre tenants. **Não inclui abrir mão da consciência de tenant** (identidade e isolamento lógico permanecem requisito desde o início — ver NFR-001 em [`NON_FUNCTIONAL_REQUIREMENTS.md`](NON_FUNCTIONAL_REQUIREMENTS.md));
- Marketplace ou catálogo de Funcionários Digitais;
- Qualquer segundo tipo de Funcionário Digital (triagem RC-02, organização documental RC-04 etc. ficam para depois);

**Funcionalidades:**

- Emissão de guias, documentos fiscais ou qualquer ação com efeito fiscal/financeiro (RC-08);
- Consultas em portais governamentais (RC-07);
- Conferência de folha (RC-09) e conciliação financeira (RC-10);
- Atendimento conversacional livre ao cliente final (chatbot aberto);
- Automação de WhatsApp no piloto — WhatsApp é **alternativa relevante a avaliar**, não decisão tomada; o canal definitivo deverá ser decidido posteriormente através de validação de produto e decisão arquitetural documentada;
- Integração bidirecional com ERPs/sistemas de gestão contábil (importação/exportação manual é aceitável no piloto);
- Cobrança automática fora dos limites configurados; qualquer envio sem registro auditável;

**Produto/negócio:**

- Modelo comercial, preços e billing;
- Aplicativo mobile;
- Internacionalização;
- Treinamento de modelos próprios de IA.

## Critérios de entrada

Para iniciar a construção do MVP (Fase 004+):

1. Hipóteses críticas HYP-001 a HYP-004 validadas ou não refutadas ([`RISKS_AND_HYPOTHESES.md`](RISKS_AND_HYPOTHESES.md));
2. Escritório piloto identificado e comprometido;
3. Arquitetura e stack definidas via ADRs aceitos (Fase 003);
4. Baseline atual do escritório medido ou plano de medição acordado.

## Critérios de conclusão

O MVP considera-se concluído quando, no escritório piloto:

1. O Funcionário Digital executa ciclos completos de pendências documentais de ponta a ponta, dentro dos limites configurados;
2. Todas as ações estão registradas de forma auditável;
3. As exceções são escaladas corretamente para humanos;
4. As métricas definidas em [`SUCCESS_METRICS.md`](SUCCESS_METRICS.md) estão sendo coletadas;
5. O escritório confirma uso contínuo por pelo menos um ciclo mensal completo.

## Dependências

- Definição arquitetural (Fase 003): stack, canais de comunicação, infraestrutura;
- Escritório piloto com baseline documentado;
- Checklists reais fornecidos pelo escritório piloto.

## Restrições

- Nenhuma ação irreversível sem aprovação humana;
- Comunicação com clientes finais apenas dentro dos limites configurados e sempre identificada como representação do escritório;
- Dados pessoais tratados conforme LGPD (mínimo necessário, finalidade definida);
- Sem dependência crítica de portais governamentais nesta fase;
- **Tenant awareness obrigatória:** o MVP pode operar com um único tenant ativo no piloto, mas não deve adotar decisões estruturais que inviabilizem ou tornem excessivamente custosa a evolução para múltiplos tenants (ver NFR-001);
- Parâmetros operacionais relevantes (ex.: política de tentativas de cobrança) devem ser configuráveis, não fixados em regra.

## Premissas

- O escritório piloto consegue descrever/formalizar seus checklists de documentos;
- Os clientes finais do escritório possuem e-mail utilizável (**hipótese a validar**);
- O volume do piloto é compatível com uma operação controlada (dezenas de clientes, não milhares).

## Questões pendentes

| # | Questão | Onde se resolve |
|---|---|---|
| 1 | Canal de comunicação definitivo (e-mail é hipótese inicial; WhatsApp é alternativa a avaliar) | Validação de produto (entrevistas/piloto) + decisão arquitetural documentada |
| 2 | Como receber documentos de volta com segurança | Fase 003 (decisão arquitetural documentada) |
| 3 | Grau de autonomia padrão para primeiro envio de cobrança | Piloto (configuração conservadora inicial) |
| 4 | Softwares já usados pelo piloto e integrações mínimas | Entrevistas ([`VALIDATION_PLAN.md`](VALIDATION_PLAN.md)) |
| 5 | Política de retenção de documentos no MVP | Fase 003 + revisão jurídica |
