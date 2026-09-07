# Catálogo de Rotinas Candidatas — Servium IA

> **Fase 002 — Discovery do MVP**
> Catálogo preliminar de rotinas operacionais de escritórios contábeis candidatas à automação por Funcionários Digitais.
>
> ⚠️ **Todo o ranking abaixo é hipótese de discovery**, construído a partir de conhecimento setorial geral, sem entrevistas realizadas. Não é conclusão definitiva. As avaliações devem ser revistas com evidência real (ver [`VALIDATION_PLAN.md`](VALIDATION_PLAN.md)).

## Critérios de avaliação

| Critério | Descrição |
|---|---|
| Frequência | Com que frequência a rotina ocorre (diária/semanal/mensal/eventual) |
| Repetitividade | Grau de repetição do mesmo padrão de trabalho |
| Padronização | Possibilidade de definir regras claras e verificáveis |
| Volume | Quantidade de ocorrências por ciclo |
| Tempo humano | Esforço humano atual estimado |
| Risco operacional | Impacto de um erro da automação |
| Necessidade de julgamento | Baixa / Média / Alta |
| Dependência externa | Sistemas, portais ou pessoas de fora necessários |
| Potencial de automação | Baixo / Médio / Alto |
| Valor percebido | Baixo / Médio / Alto |
| Facilidade de piloto | Baixa / Média / Alta |

## Rotinas candidatas

### RC-01 — Cobrança e acompanhamento de pendências documentais

Cobrar clientes por documentos/informações faltantes para obrigações (folha, fiscal, societário), registrar respostas, conferir recebimentos e manter status consolidado.

| Critério | Avaliação |
|---|---|
| Frequência | Mensal (ciclos recorrentes) com picos |
| Repetitividade | Alta — mesmo padrão a cada ciclo |
| Padronização | Alta — checklist por cliente/obrigação |
| Volume | Alto — dezenas/centenas de clientes × itens |
| Tempo humano | Alto (**a validar magnitude**) |
| Risco operacional | Baixo/Médio — erro típico é cobrança errada ou item aceito indevidamente |
| Necessidade de julgamento | Baixa/Média |
| Dependência externa | Média — canal de mensagens; clientes respondem |
| Potencial de automação | **Alto** |
| Valor percebido | **Alto** |
| Facilidade de piloto | **Alta** |

### RC-02 — Triagem e classificação de solicitações recebidas

Receber solicitações de clientes (e-mail/WhatsApp), classificar assunto, priorizar e encaminhar ao responsável correto.

| Critério | Avaliação |
|---|---|
| Frequência | Diária |
| Repetitividade | Média/Alta |
| Padronização | Média — assuntos variados e ambíguos |
| Volume | Médio/Alto |
| Tempo humano | Médio |
| Risco operacional | Médio — encaminhamento errado atrasa atendimento |
| Necessidade de julgamento | Média |
| Dependência externa | Média — canais de entrada |
| Potencial de automação | Médio/Alto |
| Valor percebido | Médio/Alto |
| Facilidade de piloto | Média |

### RC-03 — Acompanhamento de prazos e notificações de vencimento

Monitorar calendário de obrigações e notificar responsáveis sobre vencimentos próximos.

| Critério | Avaliação |
|---|---|
| Frequência | Diária/semanal |
| Repetitividade | Alta |
| Padronização | Alta |
| Volume | Médio |
| Tempo humano | Baixo/Médio |
| Risco operacional | Médio — notificação perdida pode custar multa |
| Necessidade de julgamento | Baixa |
| Dependência externa | **Alta** — precisa de fonte confiável dos prazos (sistema do escritório) |
| Potencial de automação | Alto |
| Valor percebido | Médio/Alto |
| Facilidade de piloto | Média/Baixa |

### RC-04 — Organização documental

Nomear, classificar e arquivar documentos recebidos na pasta/categoria correta por cliente e período.

| Critério | Avaliação |
|---|---|
| Frequência | Diária/semanal |
| Repetitividade | Alta |
| Padronização | Média/Alta — convenções de nomenclatura |
| Volume | Alto |
| Tempo humano | Médio |
| Risco operacional | Baixo/Médio — arquivo errado dificulta busca futura |
| Necessidade de julgamento | Baixa/Média |
| Dependência externa | Baixa |
| Potencial de automação | Alto |
| Valor percebido | Médio |
| Facilidade de piloto | Média |

### RC-05 — Primeiro atendimento e respostas frequentes

Responder perguntas recorrentes de clientes finais (prazos, documentos necessários, status).

| Critério | Avaliação |
|---|---|
| Frequência | Diária |
| Repetitividade | Alta |
| Padronização | Média — risco de resposta incorreta ao cliente |
| Volume | Médio |
| Tempo humano | Médio |
| Risco operacional | **Médio/Alto** — resposta errada em nome do escritório |
| Necessidade de julgamento | Média/Alta |
| Dependência externa | Média |
| Potencial de automação | Médio |
| Valor percebido | Médio |
| Facilidade de piloto | Média |

### RC-06 — Agendamento de reuniões e retornos

Agendar atendimentos entre clientes e equipe, com lembretes.

| Critério | Avaliação |
|---|---|
| Frequência | Semanal |
| Repetitividade | Alta |
| Padronização | Alta |
| Volume | Baixo/Médio |
| Tempo humano | Baixo |
| Risco operacional | Baixo |
| Necessidade de julgamento | Baixa |
| Dependência externa | Média — agenda da equipe |
| Potencial de automação | Alto |
| Valor percebido | Baixo/Médio |
| Facilidade de piloto | Alta |

### RC-07 — Consultas em portais governamentais

Consultar situações fiscais/cadastrais em portais (ex.: certidões, situação cadastral).

| Critério | Avaliação |
|---|---|
| Frequência | Semanal/mensal |
| Repetitividade | Alta |
| Padronização | Média — fluxos de portal mudam |
| Volume | Médio |
| Tempo humano | Médio |
| Risco operacional | Médio |
| Necessidade de julgamento | Baixa/Média |
| Dependência externa | **Alta** — portais instáveis, credenciais, mudanças de layout |
| Potencial de automação | Médio |
| Valor percebido | Médio/Alto |
| Facilidade de piloto | **Baixa** |

### RC-08 — Emissão de guias e documentos fiscais

Preparar/emitar guias de impostos e documentos fiscais rotineiros.

| Critério | Avaliação |
|---|---|
| Frequência | Mensal |
| Repetitividade | Alta |
| Padronização | Média |
| Volume | Alto |
| Tempo humano | Alto |
| Risco operacional | **Alto** — erro financeiro/fiscal direto |
| Necessidade de julgamento | Média/Alta |
| Dependência externa | Alta — sistemas fiscais |
| Potencial de automação | Médio |
| Valor percebido | Alto |
| Facilidade de piloto | **Baixa** |

### RC-09 — Conferência de folha (insumos trabalhistas)

Receber/conferir insumos de folha (férias, admissões, desligamentos, horas extras).

| Critério | Avaliação |
|---|---|
| Frequência | Mensal |
| Repetitividade | Média/Alta |
| Padronização | Média |
| Volume | Médio |
| Tempo humano | Alto |
| Risco operacional | **Alto** — impacto trabalhista direto |
| Necessidade de julgamento | **Alta** |
| Dependência externa | Média |
| Potencial de automação | Médio |
| Valor percebido | Alto |
| Facilidade de piloto | Baixa |

### RC-10 — Conciliação financeira básica

Confrontar lançamentos/extratos com registros contábeis e sinalizar divergências.

| Critério | Avaliação |
|---|---|
| Frequência | Mensal |
| Repetitividade | Alta |
| Padronização | Média |
| Volume | Médio/Alto |
| Tempo humano | Alto |
| Risco operacional | Alto |
| Necessidade de julgamento | **Alta** |
| Dependência externa | Alta — bancos, sistemas |
| Potencial de automação | Médio |
| Valor percebido | Alto |
| Facilidade de piloto | Baixa |

## Ranking preliminar (hipótese)

Ordenado pelos critérios de escolha do primeiro caso de uso (ver seção seguinte):

| Posição | Rotina | Justificativa resumida |
|---|---|---|
| 1º | **RC-01 Pendências documentais** | Frequente, repetitiva, padronizável, verificável, baixo risco irreversível, alto valor percebido, piloto viável sem depender de portais |
| 2º | RC-02 Triagem de solicitações | Frequente e valiosa, mas maior ambiguidade e risco de encaminhamento errado |
| 3º | RC-04 Organização documental | Boa complementar à RC-01 (candidata natural a segunda capacidade) |
| 4º | RC-03 Prazos e notificações | Simples, mas depende de fonte de dados do escritório |
| 5º | RC-06 Agendamento | Fácil, mas valor percebido baixo para justificar ser o primeiro |
| 6º | RC-05 Primeiro atendimento | Valioso, mas risco de resposta incorreta ao cliente final é alto demais para começar |
| 7º | RC-07 Consultas em portais | Dependência crítica de portais externos inviabiliza piloto rápido |
| 8º | RC-08 Guias fiscais | Risco financeiro alto; exige julgamento e integração fiscal |
| 9º | RC-09 Folha | Julgamento alto; erro tem consequência trabalhista direta |
| 10º | RC-10 Conciliação | Julgamento e dependências altas; fase posterior |

## Critérios aplicados à escolha do primeiro caso

O primeiro caso ideal favorece:

1. alta frequência e repetitividade;
2. fluxo conhecido e padronizável;
3. baixa ambiguidade;
4. resultado verificável objetivamente;
5. risco controlável (sem ações irreversíveis);
6. intervenção humana sempre possível;
7. valor perceptível rapidamente pelo escritório;
8. baixo custo/complexidade de integração no piloto;
9. tempo curto para validar;
10. métrica simples de sucesso.

## Conclusão

**RC-01 (pendências documentais) é a hipótese recomendada** para o primeiro Funcionário Digital, com RC-04 como extensão natural. A confirmação depende das entrevistas do [`VALIDATION_PLAN.md`](VALIDATION_PLAN.md) — em particular, validar que a dor é prioritária e que nenhum software já utilizado pelo escritório resolve bem o problema.
