# B-1 — Human Decision Formalization

> Registro formal da decisão humana sobre o blocker **B-1 — fluxo `recebido → resolvido`** no canal de governança Factory V2. Atividade **read-only de registo**: nenhuma implementação de B-1 foi realizada.

## 1. Identificação

| Campo | Valor |
|---|---|
| Modelo | opencode/big-pickle |
| Plataforma | OpenCode (CLI) |
| Data | 2026-09-12 |
| Branch | `chore/factory-v2-reconciliation-2026-09` |
| HEAD | `38a59f6` |

## 2. Estado encontrado

Antes do registro, foi validado o estado do repositório:

- `git status`: branch `chore/factory-v2-reconciliation-2026-09`, sincronizada com `origin/...`; worktree sem alterações (apenas 2 relatórios read-only não commitados: `docs/reports/B1_RECEBIDO_RESOLVIDO_ANALISE_DECISAO_2026-09.md` e `docs/reports/MVP_01_GO_NO_GO_PILOT_READINESS_2026-09.md`).
- `git branch --show-current`: `chore/factory-v2-reconciliation-2026-09`.
- `git log -1 --oneline`: `38a59f6 docs(factory): reconcile current GitHub state with Factory V2 (2026-09-12)`.
- `HUMAN_DECISIONS_LOG.md`: **B-1 ainda não estava registrado** — nenhuma entrada `HG-B1*` existia (scan presente nas seções e na tabela "Pendências").
- `FACTORY_STATUS.md`: B-1 não consta como decisão registrada; blocker listado apenas na auditoria GO/NO-GO (`MVP_01_GO_NO_GO_PILOT_READINESS_2026-09.md`, P0-1).
- Análise técnica existente confirmada: `docs/reports/B1_RECEBIDO_RESOLVIDO_ANALISE_DECISAO_2026-09.md` (recomendação = Alternativa A).

**Conclusão do gate de validação:** decisão B-1 **não duplicada**; sem conflito documental que exija `HUMAN_DECISION_REQUIRED`. Prosseguiu-se para o registro.

## 3. Decisão formalizada

- **ID**: `HG-B1-2026-09`
- **Decisão**: **APROVADO — Alternativa A — validação humana do item `recebido`** no MVP-01.
- **Decisor**: Rodrigo — Product Owner.
- **Data**: 2026-09-12.

## 4. Registro no `HUMAN_DECISIONS_LOG.md`

Foi acrescentada a seção `## HG-B1-2026-09 — MVP-01 · B-1 — Fluxo recebido → resolvido (Alternativa A)` seguindo o padrão já utilizado no documento (cabeçalho com quote `[AUTONOMY] L3`, campos `- **Decisão**`, `- **Decisor**`, regra de negócio, justificativa, escopo, evolução futura, status e referências), e adicionada a linha correspondente na tabela **"Pendências"**:

| ID | Estado |
|---|---|
| HG-B1-2026-09 | **APROVADO (2026-09-12)** — Alternativa A (validação humana); implementação aguarda nova autorização |

O registro segue o formato nativo do arquivo (não foi inventado formato novo).

## 5. Regra de negócio aprovada

```text
Cliente responde
      ↓
Resposta correlacionada
      ↓
AGUARDANDO → RECEBIDO
      ↓
Validação humana
      ├── atende ao solicitado → RESOLVIDO
      │
      └── não atende / dúvida → EXCEÇÃO
                                  ↓
                            decisão humana
```

- Resposta correlacionada válida ⇒ item `recebido`.
- Usuário autorizado valida o item.
- Pode concluir `resolvido` (atende ao solicitado) ou encaminhar para `excecao` (não atende / dúvida).
- A resposta correlacionada **não** é considerada automaticamente resolução da pendência; a Estagiária Digital registra o recebimento e disponibiliza o item para validação humana.

## 6. Escopo autorizado

Somente a regra de negócio da §5, válida para **MVP-01 / piloto assistido**. Autoriza o desenho da próxima atividade (ver §9). **NÃO autoriza implementação nenhuma nesta atividade.**

## 7. Fora do escopo

NÃO autorizado:

- resolução automática;
- uso de LLM para decidir se um documento está correto;
- criação de validação automática de conteúdo;
- upload de documentos fora do escopo já aprovado;
- alteração da arquitetura;
- novo framework de agentes;
- M2, M3, M4 ou M5;
- alterações de Gmail além das necessárias posteriormente para P0-2;
- dark mode;
- novos recursos de produto não relacionados ao B-1.

## 8. Critérios de aceite da próxima atividade

Referência preservada para a futura implementação (fonte: `B1_RECEBIDO_RESOLVIDO_ANALISE_DECISAO_2026-09.md` §13 e prompt da decisão):

- **AC-B1-01** — Item `recebido` pode ser validado por usuário autorizado.
- **AC-B1-02** — Validação positiva: `recebido → resolvido`.
- **AC-B1-03** — Item não validável pode ser encaminhado: `recebido → excecao`.
- **AC-B1-04** — Fluxo existente de `excecao` continua funcionando.
- **AC-B1-05** — Toda decisão humana gera auditoria com veredito e operador.
- **AC-B1-06** — Não é possível decidir novamente um item já finalizado.
- **AC-B1-07** — RLS / isolamento multi-tenant permanece intacto.
- **AC-B1-08** — O ciclo pode chegar a `encerrado` com todos os itens em estados finais válidos.
- **AC-B1-09** — Runtime E2E cobre `cobrança → resposta → recebido → validação humana → resolvido → encerramento`.
- **AC-B1-10** — Selenium cobre a ação de validação na interface.
- **AC-B1-11** — Testes existentes permanecem verdes.

## 9. NEXT_ACTIVITY_AUTHORIZATION

```text
NEXT_ACTIVITY_AUTHORIZATION

Tema:
MVP-01 — Implementação B-1

Decisão de produto:
Alternativa A — validação humana de item RECEBIDO

Escopo autorizado:
- permitir validação humana de item RECEBIDO;
- permitir conclusão como RESOLVIDO;
- permitir encaminhamento para EXCEÇÃO;
- preservar fluxo atual de EXCEÇÃO;
- registrar auditoria;
- preservar isolamento multi-tenant;
- adicionar testes;
- completar Runtime E2E;
- atualizar UX necessária para o fluxo.

Fora do escopo:
- resolução automática;
- LLM;
- upload;
- M2+;
- mudanças arquiteturais;
- Gmail/P0-2, salvo dependência técnica comprovada.

Estado:
READY_FOR_IMPLEMENTATION_AUTHORIZATION

Observação:
A implementação exige uma nova autorização de execução.
```

## 10. Governança

- Nenhum merge de código.
- Nenhum PR de implementação criado.
- Nenhuma atividade atribuída a Pleno/Senior.
- Nenhum Human Gate existente alterado.
- Nenhuma declaração de `MVP_READY` / `GO` / `PILOT_READY` / `DONE` emitida.
- GitHub: **nenhum estado alterado** (nenhuma Issue movida; nenhum PR criado; nenhum campo para IMPLEMENTING).
- A decisão B-1 **não significa MVP pronto** — apenas remove a ambiguidade de produto que bloqueava a implementação do B-1.

## 11. Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/factory/HUMAN_DECISIONS_LOG.md` | **Modificado** — entrada `HG-B1-2026-09` adicionada + linha na tabela "Pendências" |
| Qualquer outro arquivo | Não alterado |

## 12. Conclusão

- A decisão de produto B-1 foi **formalizada no canal de governança** (`HUMAN_DECISIONS_LOG.md`), de forma consistente com o padrão existente.
- **Implementação de B-1 NÃO foi iniciada** — nenhuma alteração em `apps/api`, `apps/web`, migrations, testes, engine, handlers ou controllers.
- A próxima atividade (implementação) permanece aguardando **nova autorização de execução**.

```text
HUMAN DECISION B-1 = APPROVED
IMPLEMENTATION B-1 = NOT STARTED
NEXT = AWAITING IMPLEMENTATION AUTHORIZATION
```

---

**Informações finais:**

- **Modelo utilizado**: opencode/big-pickle
- **Plataforma**: OpenCode (CLI)
- **Branch**: `chore/factory-v2-reconciliation-2026-09`
- **HEAD**: `38a59f6`
- **`HUMAN_DECISIONS_LOG.md` foi alterado**: SIM (registro formal `HG-B1-2026-09`)
- **Algum outro arquivo foi alterado**: NÃO
- **Commit foi criado**: NÃO
- **PR foi criado**: NÃO
- **Implementação B-1 foi realizada**: NÃO
