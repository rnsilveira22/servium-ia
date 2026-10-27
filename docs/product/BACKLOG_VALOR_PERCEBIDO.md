# Backlog — Valor Percebido pelo Escritório (VP)

> **Backlog aprovado pelo titular (Rodrigo) em 2026-10-26.** VP-01 materializada como Issue #108 (PR #107); as demais histórias seguem como planejadas e só viram Issue quando forem refinadas.
> Não substitui [`INITIAL_BACKLOG.md`](INITIAL_BACKLOG.md) (canônico). Histórias que tocam escopo/arquitetura (VP-05, VP-06) continuam exigindo ADR e Human Gate.

## Diagnóstico

O MVP-01 já executa o ciclo de pendências documentais de ponta a ponta (cobrança por e-mail, recebimento, exceções, auditoria). O problema é de **percepção**: o que a contadora vê ao abrir o sistema não responde à pergunta que ela faz todo dia — *"o que eu preciso olhar hoje?"*.

| Lacuna observada | Onde |
|---|---|
| Painel só exibe 4 contadores e ciclos sem nome de cliente, sem urgência e sem prazo | `DashboardPage` |
| Não existe visão consolidada "por cliente" | — |
| O valor entregue (tempo economizado) não aparece em lugar nenhum | `SUCCESS_METRICS.md` define M-01..M-03, mas nada é exibido |
| Responsável precisa abrir o sistema para saber se há problema | — |

## Priorização

| ID | História | Prioridade | Estado | Depende de |
|---|---|---|---|---|
| VP-01 | Painel por cliente com semáforo | P1 | **Implementada** — Issue #108, PR #107 (em revisão) | — |
| VP-02 | Resumo diário por e-mail ao responsável | P1 | **Implementada** — aguarda revisão (empilhada sobre o PR #107) | VP-01 (reusa a classificação) |
| VP-03 | Indicadores de valor no painel e no fechamento de ciclo | P1 | Proposta | — |
| VP-04 | Prévia e aprovação da cobrança antes do envio | P1 | Proposta | — |
| VP-05 | Radar de CND (Serpro), somente leitura | P2 | **Bloqueada por gate** | ADR + Human Gate |
| VP-06 | Triagem da caixa postal e-CAC/eSocial | P3 | Fora do horizonte | VP-05 + ADR de certificado digital |

## VP-01 — Painel por cliente com semáforo

**Como** responsável pela rotina, **quero** ver cada cliente com uma cor e a razão dela, **para** saber em segundos onde agir hoje.

**Regras (puras, ajustáveis com o piloto)** — implementadas em `apps/api/src/cadastro/semaforo.ts`:

| Cor | Condição |
|---|---|
| Vermelho | Exceção aberta aguardando decisão **ou** itens pendentes com prazo em até 2 dias (ou vencido) |
| Amarelo | Itens pendentes com prazo em até 7 dias |
| Verde | Nada pendente, ou pendência com prazo confortável / sem prazo definido |

**Critérios de aceite**

- [x] `GET /ciclos/painel` (admin e operador) retorna um item por cliente com ciclo aberto, ordenado por cor e depois por prazo mais próximo;
- [x] Cada item traz contagens (itens, resolvidos, pendentes, exceções), prazo mais próximo e motivo em linguagem de negócio;
- [x] Ciclos encerrados/cancelados não entram no cálculo;
- [x] Isolamento por tenant garantido por RLS (teste de integração com dois tenants);
- [x] O Painel exibe a cor **e** um rótulo em texto (Atenção · Acompanhar · Em dia) — acessível sem depender da cor;
- [x] Atalho "Decidir" leva à fila de exceções quando o cliente tem exceção aberta;
- [x] Dia de hoje calculado no fuso `America/Sao_Paulo`.

**Pontos a validar com o piloto:** os limiares de 2 e 7 dias; se "sem prazo definido" deve ser amarelo.

## VP-02 — Resumo diário por e-mail

**Como** responsável, **quero** receber toda manhã um resumo do que exige minha atenção, **para** não precisar abrir o sistema só para descobrir se há problema.

**Critérios de aceite**

- [x] Job `resumo.diario` na fila existente, com `idempotency_key` por tenant + dia; o `ResumoScheduler` enfileira 1 job/dia/tenant a partir da hora configurada (padrão 08:00 de Brasília) e recupera o dia se o runtime voltar depois da hora;
- [x] Destinatários: admins ativos do tenant (operadores e inativos não recebem); idempotência extra por destinatário/dia, então o retry após falha parcial não reenvia a quem já recebeu;
- [x] Conteúdo: clientes vermelhos ("Precisam de você hoje") e amarelos ("Para acompanhar") com motivo e prazo, cobranças enviadas e respostas recebidas nas últimas 24 h;
- [x] Dia sem nada urgente: não envia (ação `resumo_diario_dispensado` auditada); `enviar_vazio` liga o e-mail "tudo em dia";
- [x] Reaproveita `consultarPainel`/`montarPainel` (VP-01) e o canal resolvido por tenant (Gmail em produção, Mailpit em dev/CI);
- [x] Auditoria: `resumo_diario_enviado`, `resumo_diario_falha`, `resumo_diario_dispensado`, `resumo_diario_sem_destinatario` e `configurar_resumo_diario`; falha de envio propaga para o retry/backoff da fila — nunca perda silenciosa;
- [x] Opt-in: padrão **desligado**; `GET/PUT /configuracoes/resumo-diario` (admin; hora 0–23, `ativo`, `enviar_vazio`);
- [x] Enviado **somente** ao responsável, nunca ao cliente final (restrição do MVP);
- [x] Tela **Configurações** no web (somente admin): liga/desliga, escolhe a hora (Brasília) e `enviar_vazio`; operador não vê o link e, pela URL direta, recebe aviso sem chamar a API.

**Gate:** nenhum (mesmo canal já aprovado em HG-008).

## VP-03 — Indicadores de valor

**Como** sócio/gestor, **quero** ver quanto trabalho o Funcionário Digital fez, **para** justificar a contratação.

**Critérios de aceite**

- Painel e relatório de fechamento exibem: cobranças enviadas, documentos recebidos, exceções tratadas, % de itens resolvidos antes do prazo (M-02);
- Opcional e **rotulado como estimativa**: "tempo equivalente" = ações automatizadas × minutos por ação configurável pelo escritório;
- **Não** apresentar a estimativa como M-01: `SUCCESS_METRICS.md` exige baseline real antes de qualquer meta — a estimativa serve como conversa comercial, não como evidência.

## VP-04 — Prévia e aprovação da cobrança

**Como** responsável, **quero** ver o texto que será enviado e aprová-lo, **para** confiar no tom antes de delegar de vez.

**Critérios de aceite**

- Na ativação do ciclo, prévia da primeira mensagem por cliente com variáveis resolvidas;
- Edição do texto do template por tenant (campos de saudação, assinatura, tom);
- Política configurável: primeiras N cobranças exigem aprovação; depois, autonomia conforme limites já existentes;
- Toda aprovação/edição auditada.

## VP-05 — Radar de CND (Serpro) — *bloqueada por gate*

**Como** responsável com 20+ CNPJs, **quero** ver a situação das certidões de cada cliente no mesmo painel, **para** agir antes do vencimento.

**Por que está bloqueada:** [`MVP_SCOPE.md`](MVP_SCOPE.md) coloca "Consultas em portais governamentais (RC-07)" **fora do escopo** do MVP-01 e exige "sem dependência crítica de portais governamentais nesta fase". Incluí-la exige:

1. **Decisão de produto** (Rodrigo) revisando o Out of Scope — ideal após validar VP-01..VP-03 com 3–5 escritórios;
2. **ADR** novo: integração Serpro (API de teste primeiro), armazenamento de credenciais, modelo de cache e frequência de consulta;
3. **Human Gate** conforme `AUTONOMY_POLICY.md` (nova integração externa e dados fiscais).

**Escopo proposto (quando liberada):** somente leitura (sem emissão, sem efeito fiscal), status verde/amarelo/vermelho por cliente e alerta N dias antes do vencimento, integrado ao semáforo de VP-01.

## VP-06 — Triagem da caixa postal e-CAC/eSocial

Fora do horizonte do MVP. Depende de VP-05 e de um ADR específico para **certificado digital A1 de múltiplos CNPJs** (custódia de chaves, LGPD, auditoria). É o maior risco de segurança do produto; não antecipar.

## Ordem sugerida de execução

```text
VP-01 (feito) → VP-02 → VP-03 → VP-04 → [validar com 3–5 escritórios] → decidir VP-05
```

Cada história segue o fluxo completo da factory (DoR → implementação → QA → aceite) descrito em [`DEVELOPMENT_WORKFLOW.md`](../factory/DEVELOPMENT_WORKFLOW.md).
