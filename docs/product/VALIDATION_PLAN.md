# Plano de Validação — Servium IA MVP

> **Fase 002 — Discovery do MVP**
> Plano de validação das hipóteses com escritórios contábeis reais. **Nenhuma entrevista foi realizada até este momento** — este documento define como realizá-las. Responsável pela execução: equipe humana do Servium IA.

## Objetivo

Confirmar ou refutar as hipóteses críticas HYP-001 a HYP-006 ([`RISKS_AND_HYPOTHESES.md`](RISKS_AND_HYPOTHESES.md)) antes e durante o piloto, com evidência real, tornando a decisão de avançar para construção embasada em dados.

## Perfil dos entrevistados

- Escritórios de contabilidade brasileiros de pequeno/médio porte (5–50 pessoas);
- Entrevistado ideal: quem **executa** a rotina de pendências (contador/coordenador/operador) — não apenas quem decide;
- Desejável: participação parcial do sócio/gestor (visão de custo e adoção).

## Quantidade inicial sugerida

**3 a 5 escritórios** para as entrevistas iniciais.

- O piloto em si pode começar antes das 5 entrevistas serem concluídas, desde que HYP-001, HYP-002 e HYP-006 estejam confirmadas pelo primeiro entrevistado/piloto candidato;
- Menos que 3 entrevistas: evidência insuficiente para generalizar; prosseguir apenas como piloto exploratório, sem compromisso de construção completa.

## Roteiro de entrevista (~45 min)

> Perguntas abertas sobre comportamento atual — nunca perguntas de venda ("você usaria IA?").

### Bloco 1 — Contexto (10 min)

1. Conte como é o escritório: quantas pessoas, quantos clientes, quais rotinas mensais.
2. Quais softwares vocês usam hoje no dia a dia? Para quê exatamente?

### Bloco 2 — Processo atual de pendências (20 min)

1. Quando chega o período da folha (ou outra obrigação), como vocês sabem quais documentos estão faltando de cada cliente?
2. Como essa atividade é feita hoje, passo a passo? Quem faz?
3. Quanto tempo normalmente é gasto nisso, por mês? Por pessoa?
4. Por quais canais vocês cobram os clientes? Os clientes respondem por onde?
5. Onde costuma ocorrer erro nesse processo? O que acontece quando ocorre?
6. O que acontece quando um cliente simplesmente não responde às cobranças?
7. Quem precisa revisar os documentos recebidos antes de vocês usarem?
8. Já perderam prazo ou pagaram multa por documento que faltou? Conte como foi.
9. Vocês já tentaram resolver isso com planilha, sistema ou processo próprio? Como foi?

### Bloco 3 — Ferramentas existentes (5 min)

 1. O software contábil que vocês usam tem algum controle de pendências? Vocês usam? Por quê (não)?

### Bloco 4 — Delegação e limites (10 min)

 1. Se uma assistente digital fizesse essa cobrança automaticamente, dentro de regras que vocês definem, o que precisaria acontecer para vocês confiarem?
 2. Qual parte desse processo você jamais delegaria sem aprovação humana?
 3. Que mensagem seria aceitável enviar ao seu cliente? O que jamais poderia ser enviado?

### Bloco 5 — Fechamento (5 min)

 1. Se esse problema desaparecesse, o que a equipe faria com o tempo liberado?
 2. Existe algo mais crítico que isso no dia a dia de vocês? O quê?

## Evidências desejadas

| Evidência | Hipótese relacionada |
|---|---|
| Descrição concreta do processo + tempo estimado mensal | HYP-001 |
| Relato de erros/prazos perdidos por pendência | HYP-001 |
| Inventário de softwares e teste do que já resolvem | HYP-006 |
| Reação à proposta de delegação com limites ("o que precisaria para confiar") | HYP-002 |
| Canais reais de resposta dos clientes finais | HYP-005 |
| Capacidade de listar documentos por obrigação na hora da entrevista | HYP-004 |

## Critérios para validar

- ≥ 2 de 3 (ou ≥ 3 de 5) escritórios descrevem a dor como relevante e frequente, com tempo mensal significativo;
- Nenhum software existente resolve bem o problema nos casos avaliados;
- Escritórios indicam condições claras e viáveis de confiança (templates + limites);
- Clientes finais respondem por canal tecnicamente acessível.

## Critérios para rejeitar/pivotar

- A dor não aparece espontaneamente nem com investigação (tempo gasto trivial);
- Software já utilizado resolve satisfatoriamente para a maioria;
- Escritórios recusam delegar qualquer contato com clientes finais mesmo com supervisão total;
- Checklists impossíveis de formalizar sem projeto customizado por cliente.

Nesses casos: **não construir**; pivotar para próxima rotina do ranking ([`CANDIDATE_ROUTINES.md`](CANDIDATE_ROUTINES.md)) ou revisar premissas.

## Ajustes esperados

Esta especificação foi produzida sem entrevistas e **deve ser revisada** após validação:

- o problema pode mudar de forma (ex.: dor maior em conferência do que em cobrança);
- o canal inicial pode revelar-se outro (WhatsApp vs. e-mail — HYP-005);
- os limites de autonomia propostos podem ser conservadores ou frouxos demais;
- requisitos FR/NFR ganharão ajustes de prioridade;
- métricas receberão metas numéricas após baseline.

Alterações relevantes devem ser registradas nos próprios documentos com referência às evidências que as motivaram.
