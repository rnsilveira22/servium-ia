# Agent Team — Servium IA

> Equipe de agentes da Software Factory (V1 + Orchestrator V2). Ambiente de execução: OpenCode (`.opencode/agent/`). Gestão: GitHub Issues/Projects. Princípios: `docs/AI_CONTEXT.md` e `AGENT_GOVERNANCE.md`.

## Composição (cinco agentes)

| Agente | Arquivo | Papel | Entrada típica | Saída típica |
|---|---|---|---|---|
| `servium-orchestrator` | `.opencode/agent/servium-orchestrator.md` | Orchestrator — coordena fluxo, handoffs, estados e bloqueios (V2) | Item `PO_APPROVED`, decisões humanas, filas das Issues | Despachos, transições de estado, trilha, `HUMAN_DECISION_REQUIRED` |
| `servium-po` | `.opencode/agent/servium-po.md` | Product Owner — backlog, histórias, priorização, aceite funcional | Necessidade de produto, histórico `QA_APPROVED` | Issues formatadas, `ACCEPTED/REJECTED`, `DONE` |
| `servium-senior` | `.opencode/agent/servium-senior.md` | Analista/Dev Sênior — direção técnica, análise, partes críticas | História `PO_APPROVED`/`TECH_READY` | Análise técnica, ADRs propostos, código crítico |
| `servium-pleno` | `.opencode/agent/servium-pleno.md` | Analista/Dev Pleno — implementação disciplinada | História `TECH_READY` + tarefas | Código + testes + PR com evidências |
| `servium-reviewer-qa` | `.opencode/agent/servium-reviewer-qa.md` | Reviewer/QA independente — gate técnico final | PR + relatório de implementação | `APPROVED / CHANGES_REQUESTED / BLOCKED` |

O Orchestrator foi aprovado em 04/09/2026 via **HG-F2-01**. A V1 sem orquestrador (`docs/factory/FACTORY_RUNBOOK.md`) permanece como fallback íntegro. O Orchestrator é **coordenador**, não autoridade técnica/funcional (ver `docs/factory/ORCHESTRATOR.md`).

## Matriz de permissões (least privilege)

| Capacidade | orchestrator | po | senior | pleno | reviewer-qa |
|---|---|---|---|---|---|
| Ler repositório | ✅ | ✅ | ✅ | ✅ | ✅ |
| Buscar (grep/glob/list) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar código de produto | ❌ | ❌ | ✅ | ✅ | ❌ |
| Editar docs de produto (`docs/product/**`) | ❌ | ✅ | ✅* | ❌ | ❌ |
| Editar docs de governança (`docs/factory/**` exceto `qa/`) | ✅ (via PR aprovado) | ✅ (via PR aprovado) | ✅ (via PR aprovado) | ❌ | ❌ |
| Editar relatórios QA (`docs/factory/qa/**`) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Bash irrestrito | ❌ (git/gh read + gh issue/project não destrutivo; ask no resto) | ❌ (somente leitura/git read/gh read) | ✅ (com denials destrutivos) | ✅ (com denials destrutivos) | ⚠️ ask por comando; deny em push/commit/rebase/rm |
| Webfetch | ⚠️ ask | ⚠️ ask | ✅ | ⚠️ ask | ⚠️ ask |

\* Sênior edita docs apenas quando a análise técnica exigir; conteúdo de produto é autoridade do PO.

Denials explícitos para todos os agentes com bash amplo: `git push --force`, `git reset --hard`, `rm -rf /*`. QA adicionalmente: `git push*`, `git commit*`, `git rebase*`, `rm *`. Orchestrator adicionalmente: deny em `git push --force`, `git push * main*`, `git reset --hard`, `gh pr merge*`; ask em `gh pr create*` e `git rebase*`.

## Autoridade e proibições — resumo

- **Orchestrator**: coordena e despacha; nunca decide produto, prioridade, arquitetura, merge estrutural, deploy nem dados reais.
- **PO**: define o quê e por quê; nunca o como técnico. `DONE` só com `QA_APPROVED AND PO_ACCEPTED AND MERGED`.
- **Senior**: define o como dentro dos ADRs vigentes; propõe ADRs (`Proposed`), nunca os aceita sozinho.
- **Pleno**: implementa o escopo contratado; escalar toda dúvida estrutural ao Senior.
- **Reviewer/QA**: verifica independentemente; nunca corrige silenciosamente; emite exatamente um resultado formal.

## Independência do QA

O reviewer/QA é agente separado dos implementadores. Como não há identidade GitHub própria para os agentes (ver `GITHUB_WORKFLOW.md §Identidade`), a independência é garantida tecnicamente: permissões restritas de edição + obrigação de evidência + proibição de auto-aprovação registrada no prompt de todos os agentes.

## Validação

```bash
opencode agent list   # deve listar servium-orchestrator, servium-po, servium-senior, servium-pleno, servium-reviewer-qa
```
