# Human Gates — Servium IA

> Catálogo de pontos de decisão humana obrigatória, formato canônico de `HUMAN_DECISION_REQUIRED` e política de default-decision. Decisor: Rodrigo (owner).

## Formato canônico

Toda decisão humana solicitada por agente usa exatamente este formato (Issue ou comentário com label `needs:decision`):

```text
HUMAN_DECISION_REQUIRED
ID: HG-<NN>
Contexto: <1–3 linhas do problema e por que chegou aqui>
Opções:
  A) <opção> — prós/contras
  B) <opção> — prós/contras
Recomendação: <opção + justificativa baseada em drivers/evidência>
Trade-offs: <o que se perde/sobra em cada opção>
Risco de decidir errado: <reversibilidade EASY/MODERATE/HARD + impacto>
Impacto de não decidir: <o que fica bloqueado>
Default se não houver ação: <ver política abaixo>
```

## Política de default-decision (timeout)

Se uma decisão Level 3 permanecer sem resposta:

- O trabalho dependente permanece `AWAITING_DECISION` — **nada é implementado** com base no default;
- O default é apenas a **proposta recomendada pré-registrada** pelo agente; ao retornar, o humano pode ratificar ("ok") em uma palavra;
- Exceção: decisões marcadas `default-safe: none` não têm fallback e bloqueiam a cadeia até decisão explícita.

Nunca confundir "sem objeção" com "aprovação".

## Catálogo de gates ativos

### HG-001 — Merge da PR #2 (Software Factory V1) — ✅ RESOLVIDO

> **RESOLVIDO (2026-08-22):** APROVADO — Opção A. PR #2 mergeada após revalidação de CI. Registro: [`HUMAN_DECISIONS_LOG.md`](HUMAN_DECISIONS_LOG.md).

- **Tipo**: operacional · **Nível**: 3
- **Contexto**: factory completa na branch `chore/software-factory-v1`, CI verde; merge é humano enquanto não há branch protection.
- **Opções**: A) Mergear agora → agentes passam a trabalhar sobre `main`; B) Adiar → desenvolvimento continua na branch, mas itens oficiais ficam bloqueados.
- **Recomendação**: A (merge).
- **Risco**: LOW-MODERATE (reversível via revert). **Impacto sem decisão**: backlog oficial não inicia.
- **Default se sem ação**: nenhum (`default-safe: none`).

### HG-002 — Pacote de ADRs estruturais (001..011) — ✅ RESOLVIDO

> **RESOLVIDO (2026-08-22):** APROVADO — Opção A. ADR-001..011 → `Accepted`, condições obrigatórias preservadas (ADR-005 isolamento; ADR-009 OWASP ASVS; ADR-011 provedor/custo segue sujeito a HG-004). Registro: [`HUMAN_DECISIONS_LOG.md`](HUMAN_DECISIONS_LOG.md).

- **Tipo**: arquitetural · **Nível**: 3
- **Contexto**: revisão formal concluída (`docs/architecture/ADR_REVIEW_REPORT.md`); recomendação `ACCEPT` para os 11, com condições registradas (ADR-005 testes de isolamento; ADR-009 OWASP ASVS; ADR-011 custo/provedor na hora do setup).
- **Opções**: A) Aceitar pacote (mudar status para `Accepted`); B) Aceitar parcialmente (indicar quais); C) Rejeitar/pedir nova análise (indicar ADR e motivo).
- **Recomendação**: A.
- **Risco**: MODERATE→HARD após início da implementação — janela barata é agora. **Impacto sem decisão**: nenhuma história de implementação pode iniciar (ADRs `Proposed` bloqueiam Gate 2).
- **Default se sem ação**: manter `Proposed` e fila parada (`default-safe: none`).

### HG-003 — Aprovação da proposta inicial de backlog — ✅ RESOLVIDO

> **RESOLVIDO (2026-08-22):** APROVADO COM AJUSTES — Opção B. Backlog aprovado como direção de produto; materialização imediata restrita às Ondas 0–1 (#3–#10); ajustes vinculantes registrados em `HUMAN_DECISIONS_LOG.md` e `docs/product/INITIAL_BACKLOG.md`.

- **Tipo**: produto · **Nível**: 3
- **Contexto**: proposta PO em `docs/product/INITIAL_BACKLOG.md` (antiga `PROPOSED_INITIAL_BACKLOG.md`, transformada em backlog canônico pelo HG-003) (somente proposta; nenhuma Issue criada ainda).
- **Opções**: A) Aprovar como está → PO cria Issues reais; B) Ajustar prioridades/escopo → devolver ao PO; C) Rejeitar.
- **Recomendação**: B ou A após leitura — decisão de produto é do dono.
- **Risco**: LOW (totalmente reversível antes da criação das Issues). **Impacto sem decisão**: fila de trabalho vazia.
- **Default se sem ação**: nada é criado.

### HG-004 — Escolha concreta de PaaS/provedores com custo recorrente (ADR-007/011)

- **Tipo**: financeiro/operacional · **Nível**: 3
- **Contexto**: ADRs aceitos definem o padrão (PaaS gerenciado + Postgres gerenciado + storage S3), mas provedor concreto e aprovação de custo são decisão humana.
- **Momento**: setup de infraestrutura do primeiro ciclo que exigir ambiente real.
- **Default se sem ação**: desenvolvimento continua com adaptadores fake/local; nenhum serviço pago é contratado.

### HG-005 — Qualquer credencial/permissão ausente

- **Tipo**: acesso · **Nível**: 3
- **Formato**: registrar `AWAITING_CREDENTIAL`/`AWAITING_PERMISSION` no item + comentário; agente segue com trabalho local não bloqueado.

## Fluxo de resolução

```text
Agente detecta necessidade Level 3
  → publica HUMAN_DECISION_REQUIRED (formato acima)
  → item → estado auxiliar adequado (BLOCKED/AWAITING_DECISION)
  → FACTORY_STATUS.md atualizado
Humano decide (Issue/comentário)
  → agente registra decisão aplicada + evidência
  → item retorna à fila correspondente
```

## Contador vivo

Decisões abertas hoje: **nenhuma** (HG-001/HG-002/HG-003 resolvidas em 2026-08-22; HG-004/HG-005 são event-driven). Fonte viva: `FACTORY_STATUS.md`. Registro histórico completo: [`HUMAN_DECISIONS_LOG.md`](HUMAN_DECISIONS_LOG.md).
