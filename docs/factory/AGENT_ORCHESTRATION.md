# Agent Orchestration — Servium IA

> Contrato de orquestração da equipe de agentes (Factory V2 com Orchestrator). Define ordem, gatilhos, entradas/saídas, transições de estado, política de retry, bloqueadores, escalonamento, condições de parada, filas de trabalho, limites de WIP e política de merge.
>
> Complementa (não duplica): `ORCHESTRATOR.md` (papel/limites do Orchestrator), `DEVELOPMENT_WORKFLOW.md` (máquina de estados V2), `QUALITY_GATES.md` (gates), `HANDOFF_CONTRACTS.md` (contratos), `AGENT_GOVERNANCE.md` (princípios). Em conflito, prevalecem a governança e o repositório.
>
> A V1 (sem orquestrador) permanece documentada em `FACTORY_RUNBOOK.md` como fallback íntegro. Estados V2 aprovados via **HG-F2-02**.

## 1. Modelo de orquestração

A V2 introduz o agente **`servium-orchestrator`** (aprovado via **HG-F2-01**) como coordenador do fluxo. O Orchestrator **não** decide produto, prioridade, arquitetura nem merge estrutural — ele mantém fila, despacha, valida handoffs e movimenta estados (ver `ORCHESTRATOR.md`).

Sessão V2 inicia via `.opencode/command/start-orchestrator.md`. Cada sessão:

1. Verifica estado (repo, branch, GitHub, Project);
2. Lê a fila de trabalho (Issues + Project);
3. Seleciona o próximo item elegível respeitando WIP e dependências;
4. **Despacha** o item para o agente correto com pacote completo (Handoff Contracts V2);
5. Valida o handoff de retorno e registra evidências e transições no GitHub;
6. Repete ou encerra com status formal (`FACTORY_STATUS.md`).

Um item nunca tem dois responsáveis simultâneos; troca de papel só ocorre em gate/handoff formal intermediado pelo Orchestrator.

## 2. Ordem de atuação por tipo de item

| Prioridade | Tipo | Agente | Gatilho |
|---|---|---|---|
| 1 | `HUMAN_DECISION_REQUIRED` pendente resolvido pelo humano | conforme decisão | Decisão registrada |
| 2 | Item em `QA_FAILED` (loop QA, máx. 3) | servium-pleno/senior | Achados do QA |
| 3 | Item em `QA_REVIEW` sem veredito | servium-reviewer-qa | Handoff Dev→QA |
| 4 | Item em `TECH_READY` aguardando implementação | servium-pleno | Handoff Senior→Pleno |
| 5 | Item em `PO_APPROVED` sem análise | servium-senior | Handoff PO→Senior |
| 6 | Item em `OPEN` com DoR completável | servium-po | Demanda do épico corrente |
| 7 | Épico novo / refinamento de backlog | servium-po | Proposta aprovada |

Regra: desbloquear trabalho em andamento precede iniciar trabalho novo.

## 3. Entradas e saídas por agente (resumo operacional)

| Agente | Consome | Produz |
|---|---|---|
| servium-orchestrator | Itens `PO_APPROVED`/`QA_FAILED`/decisões humanas | Despachos, transições, trilha de orquestração, `HUMAN_DECISION_REQUIRED` |
| servium-po | Épicos, proposta de backlog, feedback humano | Issues com DoR completa, aceites com evidência |
| servium-senior | Issue em `PO_APPROVED` | Technical Analysis, decomposição, riscos, handoff Senior→Pleno |
| servium-pleno | Issue em `TECH_READY` | Branch, commits, PR, testes executados, relatório de implementação |
| servium-reviewer-qa | PR em `QA_REVIEW` | Veredito único `APPROVED`/`CHANGES_REQUESTED`/`BLOCKED` com achados estruturados |

Contratos detalhados: `HANDOFF_CONTRACTS.md` §V2.

## 4. Transições de estado e quem executa

Máquina de estados V2 (14 estados) e mapa no campo `Status` do Project: ver `DEVELOPMENT_WORKFLOW.md`. Regras:

- Transição é validada e executada pelo Orchestrator, a partir do retorno do agente responsável pelo estado de origem;
- Toda transição atualiza: label(s), campo `Status` no Project, comentário de evidência quando exigido;
- Estados auxiliares (`BLOCKED`, `AWAITING_DECISION`, `REJECTED`, `ESCALATED_TECHNICAL_FAILURE`) sempre com comentário explicando causa e condição de desbloqueio;
- **Nunca criar máquina de estados paralela** — fonte única é o campo Status do Project.

## 5. Filas de trabalho

Fonte única: Issues + Project `Servium IA Development`. Não existe backlog paralelo.

- **Fila Orchestrator**: despachos pendentes, handoffs a validar, transições a executar, bloqueios a escalar.
- **Fila PO**: itens em `OPEN` sem DoR; propostas de épico aguardando aprovação.
- **Fila Senior**: itens em `PO_APPROVED`; dúvidas estruturais escaladas.
- **Fila Pleno**: itens em `TECH_READY`; itens em `QA_FAILED`.
- **Fila QA**: PRs em `QA_REVIEW`; re-verificações pós-correção.

Seleção dentro da fila: maior prioridade (`priority:p0 > p1 > p2 > p3`), depois mais antigo. Itens bloqueados não entram na fila efetiva.

## 6. Limites de WIP (por agente, simultâneo)

| Agente | Máximo simultâneo |
|---|---|
| servium-senior | 2 |
| servium-pleno | 2 |
| servium-reviewer-qa | 3 |
| servium-po | 4 (refinamento é leve) |

O Orchestrator controla os WIPs e não despacha item quando o agente está no limite — reporta fila cheia em `FACTORY_STATUS.md`.

## 7. Política de retry e loop de QA

- Correção pós-QA: implementador corrige **todos** os achados, registra resposta achado-a-achado e devolve a `QA_REVIEW`.
- **Limite de loop**: após **3 reprovações consecutivas** do mesmo PR/implementação → `ESCALATED_TECHNICAL_FAILURE`:
  1. Item vai a `ESCALATED_TECHNICAL_FAILURE` com comentário;
  2. Análise de causa raiz obrigatória (implementador + senior);
  3. Se causa for requisito/arquitetura → `HUMAN_DECISION_REQUIRED` (ver `HUMAN_GATES.md`);
  4. Se causa for capacidade técnica → replanejamento pela fila Senior com escopo recontratado.
- Retry de CI falho: máximo 3 execuções antes de tratar como falha real (nunca "re-run até passar" como estratégia).

## 8. Bloqueadores e escalonamento

| Bloqueador | Estado | Escala para |
|---|---|---|
| Requisito ambíguo/conflitante | `AWAITING_DECISION` | servium-po → humano se persistir |
| Mudança estrutural sem ADR aceito | `AWAITING_DECISION` + `needs:adr` | Humano (Level 3) |
| Credencial/permissão ausente | `AWAITING_DECISION` + `needs:credential` | Humano |
| Falha técnica recorrente (3×) | `ESCALATED_TECHNICAL_FAILURE` | Senior → humano |
| Dependência externa (custo, serviço) | `AWAITING_DECISION` | Humano (Level 3) |

## 9. Condições de parada do loop autônomo (STOP)

O loop do Orchestrator termina imediatamente (sem tentar contornar) quando:

1. Qualquer regra NEVER seria acionada (ver `AUTONOMY_POLICY.md`);
2. Nenhum item elegível existe (filas vazias ou todas bloqueadas);
3. Todos os WIP estão ocupados e nada pode avançar sem humano;
4. Falha de infraestrutura de verificação (git/gh/CI indisponíveis);
5. Dúvida honesta sobre segurança, escopo ou verdade dos dados;
6. Decisão de produto/arquitetura sem autorização;
7. ADR `Proposed` dependente sem decisão humana.

Encerramento sempre com relatório de status (`FACTORY_STATUS.md` atualizado) — nunca silencioso.

## 10. Política de merge e ordem de integração (HG-F2-03)

Política única de merge (resolve o conflito entre `AUTONOMY_POLICY.md` e runbook V1):

- Merge só na `main`, sempre via PR e CI verde;
- **Merge autônomo por classe**:
  - **PR normal** (código/doc com cobertura, QA `APPROVED`, PO `ACCEPTED`, sem ADR `Proposed` dependente): merge autônomo pelo implementador, conforme `FACTORY_RUNBOOK.md` §9;
  - **PR estrutural / arquitetura / banco / produto / dependência removível / governança / Human Gates**: **Level 3 — sempre humano**.
- Ordem entre PRs concorrentes: quem fechou QA primeiro; conflito → rebaser responsável resolve e reabre QA se tocar código;
- Nenhum merge de PR que dependa de ADR `Proposed`;
- `DONE` só após o merge efetivamente concluído.

## 11. Auditoria da orquestração

Toda sessão deve deixar trilha mínima:

- Itens tocados (Issue/PR/comentários);
- Despachos e transições executadas;
- Bloqueios criados/resolvidos;
- Log em `docs/factory/ORCHESTRATOR.md` §11 e atualização do `FACTORY_STATUS.md` ao final.
