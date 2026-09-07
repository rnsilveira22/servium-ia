# Métricas de Sucesso do MVP — Servium IA

> **Fase 002 — Discovery do MVP**
> Como saberemos se o piloto funcionou. **Nenhuma meta numérica é definida arbitrariamente nesta fase**: sem baseline real, metas seriam invenção. Cada métrica segue o padrão `Baseline: a medir` → `Meta: a definir após baseline`.

## Métrica norte (hipótese central)

### M-01 — Tempo humano economizado em cobrança/conferência

- **Definição:** horas mensais gastas pelo escritório em cobrar e conferir pendências, antes vs. durante o piloto.
- **Coleta:** medição manual no baseline (entrevista/acompanhamento) + registros do sistema durante o piloto.
- **Baseline:** a medir
- **Meta:** a definir após baseline
- **Por que importa:** é a tradução direta da hipótese de valor do MVP.

## Efetividade da coleta

### M-02 — Percentual de itens recebidos antes do prazo

- **Definição:** itens resolvidos até a data-limite ÷ total de itens do ciclo.
- **Baseline:** a medir (histórico do escritório quando existir; senão, primeiro ciclo como referência parcial)
- **Meta:** a definir após baseline

### M-03 — Tempo médio de resolução por item

- **Definição:** tempo entre primeira cobrança e resolução do item.
- **Baseline:** a medir
- **Meta:** a definir após baseline

## Qualidade e segurança operacional

### M-04 — Taxa de exceção

- **Definição:** itens escalados a humanos ÷ total de itens.
- **Leitura:** nem alta demais (sistema não entrega valor) nem baixa demais (possível subnotificação/autonomia excessiva).
- **Baseline:** n/a (métrica nova)
- **Faixa esperada:** a observar nos primeiros ciclos; análise qualitativa obrigatória.

### M-05 — Taxa de erro

- **Definição:** documentos aceitos indevidamente + cobranças incorretas ÷ total de itens processados.
- **Baseline:** n/a
- **Meta:** a definir após baseline; erros devem tender a zero com ajustes.

### M-06 — Taxa de retrabalho

- **Definição:** itens reabertos ou reprocessados após encerramento ÷ total de itens.

### M-07 — Percentual de intervenções humanas

- **Definição:** ações que exigiram aprovação/intervenção humana ÷ total de ações do Funcionário Digital.
- **Leitura:** complementa M-04 na calibragem de autonomia.

## Experiência

### M-08 — Satisfação do responsável pela rotina

- **Definição:** percepção do usuário principal via entrevista estruturada ao fim de cada ciclo (escala simples + comentários).
- **Baseline:** primeira aplicação
- **Meta:** a definir; tendência positiva exigida para avançar.

### M-09 — Satisfação / aceitação dos clientes finais

- **Definição:** indicadores indiretos: taxa de resposta às cobranças, reclamações registradas pelo escritório, opt-outs.
- **Baseline:** a medir
- **Meta:** a definir após baseline. Reclamações graves de relacionamento são sinal de parada (ver [`RISKS_AND_HYPOTHESES.md`](RISKS_AND_HYPOTHESES.md)).

## Confiabilidade e custo

### M-10 — Confiabilidade das execuções

- **Definição:** % de ações programadas executadas com sucesso na janela correta (sem falha técnica).

### M-11 — Custo por execução/ciclo

- **Definição:** custo operacional total do ciclo (infraestrutura + comunicação + eventuais serviços de IA) ÷ itens processados.
- **Baseline:** a medir
- **Meta:** a definir; insumo para modelo comercial futuro (**fora do escopo desta fase**).

### M-12 — Previsibilidade

- **Definição:** variância do tempo de fechamento do ciclo de pendências entre meses.
- **Leitura:** piloto bem-sucedido deve reduzir surpresas perto do prazo.

## Regras de leitura

1. Nenhuma decisão de sucesso/fracasso com base em um único ciclo — mínimo de 2–3 ciclos completos;
2. Métricas quantitativas sempre acompanhadas de evidência qualitativa (entrevistas);
3. Se o baseline revelar que a dor é menor do que a hipótese, isso é um **resultado válido** — refuta HYP-001 e evita construir produto sem valor;
4. Metas numéricas serão fixadas em documento próprio após o baseline, com acordo do escritório piloto.
