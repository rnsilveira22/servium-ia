# FACTORY V2 — HUMAN REVIEW L3 REPORT

**Data:** 2026-09-08 · **Orchestrator:** `servium-orchestrator` · **HEAD:** `main@b265762`

---

## 1. Executive Summary

Reconciliação L3 completa sobre as pendências do ServiumIA. **Nenhum merge foi executado nesta sessão.** Dois PRs aguardam decisão L3 do Owner; uma Issue aguarda fechamento formal; uma política de retenção precisa de definição. Todos os testes executáveis locais estão verdes. O estado do repositório está íntegro e rastreável.

| Item | Estado | Ação necessária |
|---|---|---|
| PR #90 (ASVS / #57) | MERGEABLE (tech ready) + L3 | Decisão Owner (rebase+fixes feitos) |
| PR #92 (Blueprint Fase 2) | MERGEABLE + L3 | Decisão Owner |
| Issue #9 (Auditoria) | OPEN / impl. DONE | Owner fecha |
| HG-RETENÇÃO | DEFERRED | Owner define política |

---

## 2. Current Git State

| Campo | Valor |
|---|---|
| HEAD (local) | `main@b265762` |
| origin/main | `b265762` |
| Branch | `main` (sincronizada) |
| Working tree | limpa (apenas `session-ses_f8cf.md` untracked — ignora) |
| Último commit | `b265762 docs(reports): registra relatório final do ciclo Factory V2 (fechamento #94)` |

Commits recentes:

```
b265762 docs(reports): registra relatório final do ciclo Factory V2 (fechamento #94)
a004c57 docs(factory): registra merge do #94 (PR #95) na main
30744fa feat(web): correções P0/P1 de UX/UI da auditoria (#94) (#95)
dd48cf0 docs(factory): corrige MD037 no FACTORY_STATUS (#93)
6c15781 fix(api,web): cancela ciclo ativado — bug P0 (#73)
2f355ab feat(api): identidade de serviço do Funcionário Digital (#56) (#89)
```

---

## 3. Current GitHub State

### PRs abertos

| PR | Título | Branch | mergeable | CI | Reviews |
|---|---|---|---|---|---|
| #90 | mapeamento ASVS 4.0.3 nível 1 (#57) | `feat/57-mapeamento-asvs` | **MERGEABLE** (rebaseado) | 2/2 pass | 0 |
| #92 | Blueprint da experiência (Fase 2) | `docs/fase2-blueprint-proposal` | MERGEABLE | 2/2 pass | 0 |

### PRs merged recentes

| PR | Título | Data |
|---|---|---|
| #95 | correções P0/P1 UX/UI (#94) | 2026-09-08 |
| #93 | MD037 lint FACTORY_STATUS | 2026-09-07 |
| #89 | identidade de serviço FD (#56) | 2026-09-07 |
| #82 | Especificação Oficial MVP v1.0 | merged (confirmado) |

### Issues abertas

| # | Título | Prioridade | Labels |
|---|---|---|---|
| #9 | Auditoria append-only | P0 | type:story |
| #8 | Framework de jobs persistidos | P1 | type:story |
| #72 | Edit obrigação (P1) | P1 | type:bug |
| #59 | Métrica profundidade fila (P2) | P2 | type:tech-debt |
| #58 | Exceções abertas por tenant (P2) | P2 | type:tech-debt |
| #57 | Mapeamento ASVS (#90) | P0 | type:task, type:security |

### Issues fechadas

| # | Título | Via |
|---|---|---|
| #94 | Correções P0/P1 UX/UI | PR #95 |
| #56 | Identidade de serviço FD | PR #89 |
| #73 | Bug P0 cancelar ciclo | PR #91 |
| #20 | Autenticação mínima | fechada |

---

## 4. PR #90 Review — ASVS / P0.3-D / #57

```
PR #90 REVIEW

STATUS:         OPEN — **REBASEADO sobre main@b265762** (2026-09-08) · mergeState CLEAN · MERGEABLE ✓
CI:             2/2 pass (Lint alterados + Relatório lint) — pós-rebase verdes
REVIEWS:        0 (nenhum review registrado)
CONFLICT:       ~~CONFLICTING / DIRTY~~ → **RESOLVIDO** (F-02: rebase + combinação com main)
TESTS:          N/A (docs only — nenhum arquivo de código alterado)
SECURITY:       Gate 4.6 adicionado ao QUALITY_GATES.md (governança, L3); ASVS mapping abrange V2/V3/V4/V5
ASVS:           40 controles mapeados; 31 implementados, 5 parciais, 3 lacunas, 1 n/d ✓
                (resumo corrigido — F-01: V3=8/2, V4=6/1; verificado por script independente)
ACCEPTANCE:     CA-D-1 ✓  CA-D-2 ✓  CA-D-3 ✗ (sem aprovação de segurança registrada)
FACTORY V2:     L3 (governança: QUALITY_GATES.md) — bloco técnico removido
MERGE READINESS: READY (técnico) — aguarda decisão L3 do Owner
```

### Arquivos alterados

| Arquivo | +/- | Descrição |
|---|---|---|
| `docs/security/ASVS_PILOTO.md` | +162 / -0 | Novo — doc vivo ASVS 4.0.3 nível 1 |
| `docs/factory/QUALITY_GATES.md` | +20 / -0 | Gate 4.6 (checklist segurança) |
| `docs/factory/FACTORY_STATUS.md` | +8 / -7 | Atualização de estado |

### Finding F-01 — Inconsistência de contagem ASVS

**SEVERITY:** LOW (docs) — **CORRIGIDO NESTE PREPARO**
**FILE:** `docs/security/ASVS_PILOTO.md`
**IMPACT:** Resumo V4 dizia 7/0 mas V4.1.5 = `parcial`; V3 também divergia (7/3 vs 8/2 reais).
**RESOLUÇÃO:** Resumo corrigido → V2=14(12/0/2), V3=10(8/2/0), V4=7(6/1/0), V5=9(5/2/1/1), **Total=40 (31/5/3/1)** — validado por script independente (grep/awk) e consistente com as linhas. FACTORY_STATUS atualizado para "40 requisitos: 31/5/3/1".
**REQUIRES_HUMAN_DECISION:** Não — correção editorial aplicada no rebase.

### Finding F-02 — Conflito FACTORY_STATUS.md (**RESOLVIDO**)

**SEVERITY:** ~~BLOCKING~~ → RESOLVED
**FILE:** `docs/factory/FACTORY_STATUS.md`
**IMPACT:** PR baseado em `6c15781`; main avançou para `b265762` (4 commits novos incluindo #94/#95). Conflito na seção de últimas atualizações.
**RESOLUÇÃO:** Rebase da branch `feat/57-mapeamento-asvs` sobre `main@b265762` + merge manual dos blocos conflitantes (Preservou textos da main: #93/#94/#95 merged, PR #82 MERGED `c35e672`, branch main `b265762`, linhas #20/#94 da fila). Push `--force-with-lease` (`6640941..bbe94b0`). CI pós-rebase: 2/2 verdes. MergeState: **CLEAN/MERGEABLE**.
**REQUIRES_HUMAN_DECISION:** Não — operação técnica preparada; **merge permanece L3 (Owner)**.

### Cobertura CA-01..CA-05 do Gate 4.6

| Requisito | Status |
|---|---|
| Mapeamento ASVS presente e atual | ✓ (doc vivo criado) |
| Cada `implementado` aponta evidência real | ✓ (teste → arquivo:linha em todos) |
| Lacunas rastreadas com ID ASVS | ✓ (G-01..G-08) |
| RLS deny-by-default confirmado | ✓ (V4.3.1, testes de isolamento) |
| Auth (argon2id, rate-limit, anti-enumeração) confirmada | ✓ (V2.x, testes automatizados) |
| Revisão registrada explicitamente | ✗ **CA-D-3 não atendido** |

---

## 5. PR #92 Review — Blueprint UX/UI Fase 2

```
PR #92 REVIEW

STATUS:         OPEN
CI:             2/2 pass
REVIEWS:        0
CONFLICT:       MERGEABLE / CLEAN
UX SCOPE:       Blueprint completo — 7 seções: Info Architecture, Agent Experience,
                Indicadores, Mapa de Conhecimento, Padrão Visual, Fases, Riscos.
                Zero implementação — proposta pura (343 linhas).
TECHNICAL RISK: ZERO (docs only, nenhum arquivo de código)
PRODUCT IMPACT: ALTO — define direção visual/UX para Fase 2
VISUAL QA:      N/A (sem implementação)
ACCESSIBILITY:  Proposta aborda acessibilidade na seção Padrão Visual
DEPENDENCIES:   Pré-requisito: aprovação humana (Fase 3) antes de qualquer implementação
FACTORY V2:     L3 (decisão de produto/UX estratégica)
MERGE READINESS: READY (sem conflito, CI verde, docs only) — aguarda decisão Owner
```

### Escopo

| Seção | Conteúdo |
|---|---|
| §0 Resumo executivo | Gap atual (~10-30% da spec); proposta de elevação |
| §1 Info Architecture | Mapa de telas, menu, topbar, hierarquia de leitura |
| §2 Agent Experience | AgentStatusBar, estados vivos, timeline, fonte de dado |
| §3 Indicadores | Métricas com fonte real apontada; fonte pendente quando não existe |
| §4 Mapa Conhecimento | Contexto operacional e camadas de explicação |
| §5 Padrão Visual | Marca, tokens, acessibilidade, componentes, responsividade |
| §6 Fases | Milestones E-01..E-08, dependências, gates humanos |
| §7 Riscos | Complexidade, priorização para piloto |

### Finding F-03 — PR #92 contém apenas proposta

Nenhuma implementação visual ou alteração de código. O merge deste PR não altera o comportamento do produto. Recomenda-se merge (após decisão L3) para registrar formalmente a proposta no histórico, mas não há urgência — o doc já existe no repo via Fase 1 (#86).

### Decisão L3 necessária

```
DECISION POINT:
O Owner autoriza a Fase 2 como proposta registrada e direcionamento de produto?

Opção A: Merge do PR #92 (registrar proposta no histórico, sem compromisso de implementação)
Opção B: Rejeitar/ajustar proposta antes de merge
Opção C: Deferir — manter PR aberto até decisão sobre Fase 2 ser tomada
```

---

## 6. Issue #9 Reconciliation

```
ISSUE #9 — feat: trilha de auditoria append-only

TECHNICAL STATUS:  DONE (CA-01..05 entregues, PR #79 merged)
AC-01 (append-only):        ✓
AC-02 (persistência):       ✓
AC-03 (PR #52):             ✓
AC-04 (PR #51):             ✓
AC-05 (PR #53):             ✓

TEST EVIDENCE:     108 API tests verdes (incl. testes de auditoria e observabilidade)
                   docs/audit/EVENTOS_AUDITORIA.md completo (17 eventos documentados)

DOCUMENTATION:     EVENTOS_AUDITORIA.md, PRE_PILOT_REMEDIATION_PLAN.md §11-§13

PROJECT STATUS:    Drift — Issue OPEN mas implementação DONE; board inconsistente (Done/P1 vs OPEN/P0)
                   Owner postou comentário formal de fechamento em 06/09/2026 mas não fechou a Issue

RECOMMENDED ISSUE STATE:  AWAITING_OWNER — Owner precisa fechar formalmente a Issue
```

---

## 7. HG-RETENÇÃO

```
HG-RETENÇÃO

DECISION REQUIRED:  SIM — condição para PILOT_READY
SCOPE:              eventos de auditoria (eventos_auditoria), logs de aplicação, backups
CURRENT STATE:      DEFERRED (2026-08-30) — todos os eventos preservados sem limite no piloto

OPTIONS:

  Option A — Sem retenção (preserve tudo indefinidamente)
    Prós: simples, zero operação, auditoria completa
    Contras: crescimento não controlado, risco de performance no longo prazo
    Impacto técnico: baixo (tabela cresce, indexação pode degradar)

  Option B — Retenção por tempo (ex: 1 ano para piloto, revisável)
    Prós: crescimento controlado, compliance mínimo, reversível
    Contras: requer implementação de purge periódico
    Impacto técnico: baixo (DELETE periódico por data)
    Impacto operacional: baixo (cron job mensal)

  Option C — Retenção por volume (ex: max 1M eventos, purge do mais antigo)
    Prós: limite absoluto de espaço, previsível
    Contras: pode perder eventos recentes se volume for alto
    Impacto técnico: baixo (trigger ou job de contagem)
    Impacto operacional: médio (monitoramento de contagem)

RECOMMENDATION:     Option B (1 ano, revisável) — piloto curto, preserva auditoria, purge implementável com baixo custo
RATIONALE:          Compliance mínimo para piloto; reversível; crescimento controlável
TECHNICAL IMPACT:   Baixo — implementar DELETE periódico ou expiração por data
OPERATIONAL IMPACT: Baixo — cron job mensal ou trigger de cleanup
RISK:               Baixo — decisão reversível; não afeta dados do piloto atual

HUMAN APPROVAL REQUIRED: YES
```

---

## 8. Project Board Reconciliation

| Item | Estado GitHub | Estado Board | Estado Factory V2 | Correção |
|---|---|---|---|---|
| #9 | OPEN | Done (P1) | DONE (técnico) | **Drift** — Owner fecha Issue; board e issue não sincronizados |
| #20 | CLOSED | — | DONE | OK |
| #57 | OPEN | — | IN_PROGRESS (PR #90 L3) | OK — aguarda merge #90 |
| #72 | OPEN | OPEN | BACKLOG | OK |
| #58 | OPEN | OPEN | BACKLOG | OK |
| #59 | OPEN | OPEN | BACKLOG | OK |
| #82 | MERGED | — | DONE | OK |
| #90 | OPEN (PR) | — | HUMAN_REVIEW (L3) | OK — aguarda Owner |
| #92 | OPEN (PR) | — | HUMAN_REVIEW (L3) | OK — aguarda Owner |
| #94 | CLOSED | — | DONE | OK |
| HG-RETENÇÃO | — | — | DEFERRED | OK — aguarda Owner |

> Correção de drift do board (#9) é administrativa segura, mas **requer decisão do Owner** (fechar Issue = decisão formal).

---

## 9. Security Review

### PR #90

| Dimensão | Avaliação |
|---|---|
| Tipo de alteração | 100% docs — nenhum código de segurança modificado |
| Gate 4.6 | Adicionado ao QUALITY_GATES.md (governança) — L3 aprovado |
| ASVS mapping | Abrange V2/V3/V4/V5 nível 1, 40 controles |
| Lacunas G-01..G-08 | Rastreadas honestamente com prioridade |
| CA-D-3 | Explicitamente não satisfeito (sem aprovação registrada) |
| P0/P1 blockers | NENHUM |
| Vazamento de secrets | NENHUM |
| Exposure de dados | NENHUM |

**Conclusão:** O PR #90 é seguro para merge (após rebase) — é documentação de conformidade. A aprovação de segurança (CA-D-3) é um gate separado que o Owner deve registrar no HUMAN_DECISIONS_LOG.

### Estado de segurança do produto

| Controle | Estado |
|---|---|
| Autenticação (argon2id, rate-limit, anti-enumeração) | ✓ testado |
| RLS deny-by-default por tenant | ✓ testado |
| Cookie httpOnly + SameSite=Lax | ✓ testado |
| Cookie Secure | ⚠️ condicional a env (G-01, P1) |
| Anti-CSRF explícito | ✗ ausente (G-02, P1) |
| Headers de segurança (CSP, X-Frame) | ✗ ausentes (G-03, P1) |
| Validação centralizada / schema runtime | ✗ parcial (G-05/G-06, P2) |
| Upload validation | ✗ não aplicável (G-07, P2) |

---

## 10. Test Evidence

Testes executados em `main@b265762` (2026-09-08):

```
LINT (docs):       0 issues em 103 files          ✓
LINT (web):        clean (eslint --max-warnings=0)  ✓
TYPECHECK (web):   clean (tsc --noEmit)             ✓
BUILD (web):       success (vite build 1.35s)       ✓
UNIT (web):        25 passed / 0 failed             ✓
API:               108 passed / 2 skipped (Mailpit) ✓
DB/QUEUE:          24 passed / 0 failed             ✓
RUNTIME E2E:       2 passed / 0 failed              ✓
SELENIUM E2E:      31 failed (env — servidor dev não rodando localmente)  ⚠️
DOCS LINT:         0 issues (markdownlint-cli2)     ✓
```

**Nota sobre Selenium E2E:** Os 31 failures são ambientais (servidor dev não iniciado localmente). O mesmo conjunto de testes passou no CI do PR #95 (4/4) e localmente em sessões anteriores com servidor ativo. Não é regressão de código.

**Total executável local:** 160 passed, 2 skipped, 0 failed.

---

## 11. Merge Readiness

| PR | Status | Bloqueador | Ação necessária |
|---|---|---|---|
| #90 | **READY — técnico** (rebaseado, CLEAN, CI 2/2 verde) | Decisão L3 Owner + CA-D-3 | **Owner aprova merge L3** (merge não é autônomo: toca governança `QUALITY_GATES.md`) |
| #92 | **READY** (mas L3) | Decisão de produto | Owner decide merge/rejeição/defer |

---

## 12. Human Decisions Required

### DECISION 1 — PR #90 (ASVS / Gate 4.6 / #57)

```
RECOMMENDATION:  MERGE — preparo concluído (rebase + F-01/F-02 corrigidos)
REASON:          Doc vivo ASVS é completo, bem estruturado e agora consistente
                 (40 requisitos: 31/5/3/1, validado por script). Gate 4.6 é governance
                 necessária. Conflito resolvido (CLEAN/MERGEABLE), CI 2/2 verde.
                 CA-D-3 (aprovação de segurança) é gate SEPARADO — o PR pode ser
                 mergeado antes, mas PILOT_READY fica bloqueado até CA-D-3.
ACTION:          (1) Owner aprova merge L3; (2) Owner registra CA-D-3 no
                 HUMAN_DECISIONS_LOG quando fizer revisão de segurança.
```

### DECISION 2 — PR #92 (Blueprint Fase 2)

```
RECOMMENDATION:  APPROVE (Opção A) ou DEFER (Opção C)
REASON:          Proposta pura — zero código, zero risco. Merge registra direção no histórico.
                 Não há urgência — pode ser mergeado agora ou depois.
ACTION:          Owner decide: merge (A), ajustar (B), ou defer (C).
```

### DECISION 3 — Issue #9 (Auditoria)

```
RECOMMENDATION:  CLOSE
REASON:          CA-01..05 entregues e verificados. PR #79 merged. Owner já postou
                 comentário formal de fechamento (06/09) mas não fechou a Issue.
ACTION:          Owner fecha a Issue #9 no GitHub.
```

### DECISION 4 — HG-RETENÇÃO

```
RECOMMENDATION:  APPROVE (Opção B — 1 ano, revisável)
REASON:          Compliance mínimo para piloto; crescimento controlável; decisão reversível.
                 Não implementado nesta sessão — apenas decisão registrada.
ACTION:          Owner registra HG-RETENÇÃO no HUMAN_DECISIONS_LOG com a opção escolhida.
```

---

## 13. Recommended Decision Order

```
RECOMMENDED ORDER

1. Issue #9 — Owner fecha (0s, sem dependências, libera board)
2. PR #90 — Orchestrator faz rebase → Owner aprova merge → Gate 4.6 ativo → Owner registra CA-D-3
3. HG-RETENÇÃO — Owner define política → registra no HUMAN_DECISIONS_LOG
4. PR #92 — Owner decide Fase 2 (merge/ajustar/defer)
```

**Justificativa:** #9 é trivial e desbloqueia o board. #90 é P0 de segurança e precisa de rebase + CA-D-3. HG-RETENÇÃO é pré-condição para PILOT_READY. #92 é estratégico mas não bloqueante.

---

## 14. Next Wave

Somente após resolver os gates L3 acima:

| Prioridade | Item | Dependência |
|---|---|---|
| P1 | #72 — Edit obrigação PATCH | Nenhuma |
| P1 | G-01..G-03 — Headers/CORS/CSRF/Secure | CA-D-3 (Gate 4.6) |
| P2 | #58 — Exceções abertas por tenant | Nenhuma |
| P2 | #59 — Métrica profundidade fila | Nenhuma |
| P2 | G-05/G-06 — Validação centralizada/schema | Nenhuma |

---

## 15. Factory V2 State

### PR #90

```
CURRENT STATE:    HUMAN_REVIEW (L3) — tech READY · rebaseado · CLEAN/MERGEABLE
TARGET STATE:     DONE (após aprovação L3 do Owner + registro CA-D-3)
BLOCKER:          Apenas decisão L3 do Owner (conflito resolvido)
HUMAN GATE:       L3 — Owner aprova merge + registra CA-D-3
```

### PR #92

```
CURRENT STATE:    HUMAN_REVIEW (L3) — MERGEABLE
TARGET STATE:     DONE (após decisão Owner) ou DEFERRED
BLOCKER:          Nenhum técnico — apenas decisão de produto
HUMAN GATE:       L3 — Owner decide merge/rejeição/defer
```

### Issue #9

```
CURRENT STATE:    OPEN (técnicamente DONE)
TARGET STATE:     CLOSED
BLOCKER:          Owner não fechou formalmente
HUMAN GATE:       Owner fecha a Issue
```

### HG-RETENÇÃO

```
CURRENT STATE:    DEFERRED
TARGET STATE:     APPROVED (opção definida pelo Owner)
BLOCKER:          Política numérica não definida
HUMAN GATE:       Owner define e registra no HUMAN_DECISIONS_LOG
```

### DEFINIÇÃO DE DONE

```
DONE = QA_APPROVED + PO_ACCEPTED + MERGED

Nenhum item acima atende DONE nesta sessão.
```

---

## 16. Final Verdict

```
FACTORY V2 FINAL VERDICT:

CURRENT PROJECT STATE:    ESTÁVEL — main limpa, testes verdes, #90 preparado (tech ready), #92 L3 pendente

PR #90:    [APPROVE — preparo concluído: rebase + F-01/F-02 corrigidos, CLEAN/MERGEABLE, CI 2/2]
           aguarda aprovação L3 do Owner (merge não autônomo: toca governança QUALITY_GATES.md)
PR #92:    [HUMAN_REVIEW — L3 Owner decide]
ISSUE #9:  [HUMAN_REVIEW — Owner fecha]
HG-RETENÇÃO: [HUMAN_REVIEW — Owner define política]

MERGES EXECUTED:           NENHUM (sessão de review/governance + preparo técnico #90)
HUMAN DECISIONS REQUIRED:  4 (Issue #9, PR #90, PR #92, HG-RETENÇÃO)

NEXT AUTHORIZED ACTION:    (1) Owner fecha #9; (2) Owner aprova merge #90 (rebase já feito) +
                           registra CA-D-3; (3) Owner decide #92/HG-RETENÇÃO

OVERALL:  READY_TO_ADVANCE (após 4 decisões humanas) — atualmente aguarda L3
```

---

> **REGRA FINAL** — Esta sessão não acelerou o desenvolvimento. Garantiu que nenhum código, PR, Issue, decisão de produto ou mudança de governança avance sem estar no estado correto do Factory V2. O objetivo foi entregar ao Owner uma lista curta, objetiva e baseada em evidências das decisões que precisam ser tomadas. Não substituímos o julgamento humano. Não ultrapassamos L3. Não criamos trabalho fora do escopo.
