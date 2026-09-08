# Quality Gates — Servium IA (V2)

> Cinco gates obrigatórios (mais Gate 4.5 quando aplicável). Nenhum é pulável; nenhum agente pode dispensar outro. Transições de gate são validadas/executadas pelo **Orchestrator** (ver `AGENT_ORCHESTRATION.md` §4).

## Gate 1 — Definition of Ready (entrada da análise técnica)

Responsável: `servium-po` (prepara) → verificação por `servium-senior`.

- [ ] Objetivo definido
- [ ] Ator/persona definido
- [ ] Critérios de aceite definidos, objetivos e testáveis (Given/When/Then quando apropriado)
- [ ] Dependências conhecidas
- [ ] Contexto suficiente
- [ ] Ausência de ambiguidade crítica

Falha → retorna a `OPEN` com lacunas listadas (estado `PO_APPROVED` exige DoR completa).

## Gate 2 — TECH READY (entrada do desenvolvimento)

Responsável: `servium-senior`.

- [ ] Análise técnica concluída (template oficial)
- [ ] Arquitetura validada contra ADRs vigentes (`Proposed` ≠ autorização)
- [ ] Riscos identificados com mitigação
- [ ] Tarefas decompostas e atribuídas
- [ ] Estratégia de testes definida
- [ ] Bloqueadores resolvidos ou registrados formalmente

## Gate 3 — READY FOR QA

Responsável: implementador (`servium-pleno`/`servium-senior`).

- [ ] Implementação concluída dentro do escopo contratado
- [ ] Testes criados **e executados** localmente (evidência real)
- [ ] Build executado
- [ ] Lint/análise estática executados (quando existirem)
- [ ] Documentação relacionada atualizada
- [ ] PR aberto referenciando a Issue
- [ ] Relatório de implementação com evidências registrado no PR

## Gate 4 — QA Review

Responsável: `servium-reviewer-qa` (independente).

Exige: CI verde · code review formal · testes · avaliação de regressão · segurança · arquitetura · critérios de aceite verificados um a um.

Resultado único: `APPROVED` | `CHANGES_REQUESTED` | `BLOCKED`.

### Bloqueadores automáticos (reprovação imediata)

- Teste falhando / build falhando
- Vulnerabilidade crítica
- Quebra de isolamento (tenant)
- Credencial exposta
- Autorização incorreta
- Perda potencial de dados
- Critério de aceite não atendido
- Mudança arquitetural não aprovada
- Regressão relevante
- Migration destrutiva não autorizada

### Severidade de achados

`CRITICAL > HIGH > MEDIUM > LOW > INFO`

## Gate 5 — PO Acceptance

Responsável: `servium-po`, somente após `QA_APPROVED` (e após `HUMAN_REVIEW` quando exigido).

- PO valida comportamento funcional contra os critérios de aceite.
- Resultado: `ACCEPTED` | `REJECTED` — sempre com evidência ou justificativa registrada.
- `ACCEPTED` + QA `APPROVED` + **merge concluído** ⇒ `DONE`. Formalmente: `DONE = QA_APPROVED AND PO_ACCEPTED AND MERGED`.

## Gate 4.5 — Human Review (quando aplicável)

Responsável: humano (Rodrigo). Acionado pelo Orchestrator quando item entrar em `HUMAN_REVIEW`.

- Obrigatório para: mudanças arquiteturais/estruturais, decisões de produto, alterações de governança/Human Gates, dependências removíveis, qualquer ação `AUTONOMY_POLICY` Level 3.
- A decisão humana deve seguir o formato canônico `HUMAN_DECISION_REQUIRED` (`HUMAN_GATES.md`).
- Sem decisão registrada, o item permanece `HUMAN_REVIEW`/`AWAITING_DECISION` — nunca avança por silêncio.

## Gate 4.6 — Revisão de segurança (ASVS — Issue #57 / PRM-P0.3-D)

> **Condição obrigatória para `PILOT_READY`.** Cada controle do documento vivo
> [`docs/security/ASVS_PILOTO.md`](../security/ASVS_PILOTO.md) é verificado contra a implementação real
> e sua evidência automatizada (teste → `arquivo:linha`). Responde ao ADR-009 (checklist OWASP ASVS +
> testes de segurança) e à Issue #20 (CA-07).
>
> Responsável: pessoa responsável por segurança. Sem aprovação registrada (`VALIDATED`/`APPROVED`
> no `HUMAN_DECISIONS_LOG`), o piloto **não** é declarado pronto — alternância aceita.

Checklist de revisão de segurança (escopo: capítulos V2/V3/V4/V5 nível 1):

- [ ] Mapeamento ASVS (V2/V3/V4/V5) presente e atual com o código (`docs/security/ASVS_PILOTO.md`)
- [ ] Cada requisito `implementado` aponta evidência automatizada real (teste → arquivo:linha) — sem evidência inventada
- [ ] Lacunas abertas (`lacuna`/`parcial`) rastreadas na tabela com ID ASVS (CA-D-1)
- [ ] Lacunas G-01..G-08 revisadas e priorizadas (headers/CORS, CSRF/SameSite, cookie Secure, validação centralizada/schema, upload, activação out-of-band)
- [ ] RLS deny-by-default por tenant confirmado (ADR-005) e coberto por teste de isolamento
- [ ] Autenticação (argon2id, rate-limit, anti-enumeração) confirmada por teste automatizado
- [ ] Revisão registrada explicitamente (não presumida) antes de `PILOT_READY` (CA-D-3)

## Estados de validação

Usar explicitamente: `VALIDATED`, `NOT_VALIDATED`, `BLOCKED`, `AWAITING_CREDENTIAL`, `AWAITING_PERMISSION`, `AWAITING_DECISION`.
**Nunca transformar ausência de evidência em sucesso.**
