# Relatório de Replanejamento — MVP-01 (HG-005)

> Produzido pela factory em 2026-08-22 após a decisão `PRODUCT PRIORITY: MVP-01 TIME-TO-PILOT`.
>
> **ATUALIZAÇÃO (2026-08-30):** relatório **histórico de planejamento**. N1–N4 e N5 foram materializadas e mergeadas (PRs #31/#32/#33/#34/#28); a decisão de comunicação (indicada aqui como `PENDING_SPIKE`/HG-006) foi resolvida em **HG-008**: canal real do piloto = **Gmail API + OAuth 2.0** (sem custo recorrente → HG-006 não acionado). Estado real: [`FACTORY_STATUS.md`](../factory/FACTORY_STATUS.md) e [`reports/POST_MVP_BACKLOG_RECONCILIATION.md`](../reports/POST_MVP_BACKLOG_RECONCILIATION.md). Histórico preservado.

## A. Produto — o que é o MVP-01

Primeiro **Assistente Digital de Pendências Documentais** executando ciclos reais de cobrança/conferência de documentos no cliente piloto: identificar pendência → solicitar → acompanhar/retry → receber → classificar → escalar exceções → auditar → encerrar → métricas. (`MVP_01_VERTICAL_SLICE.md`)

## B. Primeiro Funcionário Digital

**Assistente Digital de Pendências Documentais** — definição já existente em `FIRST_DIGITAL_EMPLOYEE.md` (preservada, nada inventado). Deterministic-first (ADR-010).

## C. Vertical Slice

Fluxo end-to-end único e demonstrável conforme máquina de estados de `OPERATIONAL_FLOW.md`, com ativação humana obrigatória do ciclo e fila de exceção.

## D. Current Backlog Assessment

| Issue | Item | Veredito | Justificativa |
|---|---|---|---|
| #3 ✅ | Skeleton monorepo | KEEP (DONE) | SLICE 0 concluído |
| #4 ✅ | CI evoluído | KEEP (DONE) | fundação de qualidade; typecheck web incluído |
| #5 | Ambiente local | **KEEP · P0** | pré-requisito imediato de tudo (SLICE 1) |
| #6 | Modelo de dados | **MODIFY · P1→P0** | escopo reduzido às entidades do slice (spike SRV-10 define); sem antecipar entidades sem uso |
| #7 | Multi-tenant RLS | **KEEP · P0** | obrigatório, condição ADR-005 vinculante; inegociável no time-to-pilot |
| #8 | Jobs persistidos | **KEEP · P1** | subconjunto essencial (agendamento/retry/backoff/idempotência/acompanhamento); outbox segue condicional (HG-003); sem complexidade sem driver |
| #9 | Auditoria append-only | **KEEP · P0** | obrigatória antes do piloto |
| #10 | Spike | **MODIFY · P1→P0** | foco ampliado: definir o vertical slice técnico mínimo do MVP-01 (entidades mínimas, capacidades a antecipar/adiar, canal, sequência) |

## E. Capabilities Pulled Forward

Do roadmap original para dentro do MVP-01 (controlado, PO+Senior): cadastro mínimo de cliente/checklist; motor de ciclo de pendências determinístico; fila de exceção + intervenção humana; envio/recebimento de comunicação real (canal mínimo); métricas mínimas via eventos auditados.

## F. Capabilities Deferred

Segundo Funcionário Digital; framework genérico de agentes; múltiplos canais / WhatsApp (sem validação); integrações ERP; LLM no caminho crítico; infraestrutura distribuída/microsserviços/Kubernetes; painel sofisticado/dashboards; portal do cliente; abstrações sem caso de uso real.

## G. New Issues Required

Apenas 4 (progressive materialization):

| Nova | Issue | Título | Papel | Prioridade | Status inicial |
|---|---|---|---|---|---|
| N1 | [#16](https://github.com/rnsilveira22/servium-ia/issues/16) | Cadastro mínimo de cliente, obrigação e checklist | Pleno | P1 | Backlog (refinar pós-spike) |
| N2 | [#15](https://github.com/rnsilveira22/servium-ia/issues/15) | Motor determinístico do ciclo de pendências | Pleno | P0 | Backlog (deps confirmadas pelo Senior pós-SRV-10) |
| N3 | [#17](https://github.com/rnsilveira22/servium-ia/issues/17) | Fila de exceções e intervenção humana | Pleno | P1 | Backlog |
| N4 | [#18](https://github.com/rnsilveira22/servium-ia/issues/18) | Comunicação real bidirecional (capability; arquitetura pendente da SRV-10) | Pleno | P1 | Backlog (**se pago/provedor → HG-006**) |

Épico `EPIC-MVP01`: agrupado pela opção `EPIC-003` do campo Epic do Project + label `epic:mvp01` (a API do GitHub não permite criar opções de campo programaticamente — limitação registrada).

## H. Dependency Graph (nova ordem)

```text
#5 (ambiente) ∥ #10 (spike slice)
        │
        ▼
      #6* → #7 ∥ N1
             │
             ▼
       (#8 essencial ∥ N2)
             │
             ▼
         N2 → N3 ∥ N4 → #9
                        │
                        ▼
                   PILOT_READY assessment
(*#6 com escopo reduzido pelo spike)
```

## I. Time-to-Pilot Critical Path

`#10 + #5` → `#6` → `#7` → `N1` → `N2` → (`N3`,`N4`) → `#9` → avaliação PILOT_READY. Paralelismo só entre itens independentes; WIP inalterado (Senior 2/Pleno 2/QA 3).

## J. Human Gates pendentes

| Gate | Assunto | Momento |
|---|---|---|
| HG-006 | Escolha de comunicação com provedor/custo recorrente | se alternativa vencedora da SRV-10 não for infraestrutura própria |
| Merge PRs #13/#14/#15 | Level 3 | contínuo |
| Piloto | autorização de execução no cliente real | após PILOT_READY (≠ deploy automático) |

## K. Pilot Ready Criteria

Os 10 critérios objetivos estão definidos em `MVP_01_VERTICAL_SLICE.md §Critérios`. Chegar a PILOT_READY **não** implica deploy automático.

## L. GitHub Changes

- Novo: `MVP_01_VERTICAL_SLICE.md`, `MVP_01_REPLAN_REPORT.md`; Issues N1–N4 (Project, Epic `EPIC-MVP01`, Status=Backlog);
- Modificados: #10 (título/corpo/comentário de rastreabilidade), #6 (comentário de escopo), prioridades no Project;
- Documentação: `INITIAL_BACKLOG.md` (meta MVP-01 + mapa de slices), `HUMAN_DECISIONS_LOG.md` (HG-005), `HUMAN_GATES.md`/renumbering HG-006/HG-007, `FACTORY_STATUS.md`, `PROJECT_INDEX.md`.

## M. Next Eligible Issue

**#10 (spike MVP-01, P0)** — primeiro a executar; em paralelo **#5** (Pleno, P0). Saída do spike desbloqueia refinamento de N1–N4 e o recorte final da SRV-6.

---

## Decisão de comunicação

**COMMUNICATION DECISION: PENDING_SPIKE** — alternativas A/B/C e critérios definidos na SRV-10/SRV-18; decisão concreta pode acionar HG-006.
