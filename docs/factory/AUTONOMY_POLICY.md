# Autonomy Policy — Servium IA

> Define o que os agentes podem fazer sozinhos (Level 1), com notificação (Level 2) e o que exige decisão humana explícita (Level 3). Aplica-se a toda operação autônoma iniciada por `START_FACTORY` (V1) ou `START_ORCHESTRATOR` (V2).
>
> Política de merge atualizada por **HG-F2-03** (04/09/2026): merge por classe, resolvendo o conflito V1 entre este documento (todo merge L3) e `FACTORY_RUNBOOK.md` §9 (merge autônomo de PR normal).

## Níveis de autonomia

| Ação | Nível | Justificativa |
|---|---|---|
| Ler repositório, Issues, PRs, Project, CI | 1 | Somente leitura |
| Criar branch de trabalho (`<prefixo>/<issue>-...`) | 1 | Reversível, rastreável |
| Commit em branch de trabalho | 1 | Reversível; Conventional Commits |
| Abrir/editar comentário em Issue/PR próprio do fluxo | 1 | Rastreável |
| Atualizar campos do Project para itens sob sua responsabilidade | 1 | Fonte única de estado |
| Despachar itens e movimentar estados conforme workflow (Orchestrator) | 1 | Coordenação, não decisão |
| Criar Issue de história/dívida/spike a partir de épico aprovado | 2 | Criação de escopo → PO only |
| Adicionar/remover labels padronizadas | 1 | Taxonomia fechada |
| Fechar Issue (somente pós `DONE` formal) | 2 | Efeito externo visível |
| Criar PR e solicitar QA | 2 | Inicia ciclo de revisão |
| **Merge de PR normal** (código/doc com cobertura, CI verde, QA `APPROVED`, PO `ACCEPTED`, sem ADR `Proposed` dependente) | 2 | Harmônico com `FACTORY_RUNBOOK.md` §9; autônomo com notificação |
| **Merge de PR estrutural** (arquitetura, banco, produto, dependência removível, governança, Human Gates) | 3 | Efeito estrutural — sempre humano |
| **Merge de qualquer PR envolvendo ADR `Proposed` dependente** | 3 | Bloqueado até decisão humana |
| **Aceitar/rejeitar/superseder ADR** | 3 | Decisão arquitetural humana |
| **Criar/editar épico ou mudar prioridade de produto** | 3 | Escopo de produto |
| **Contratar serviço pago / escolher provedor com custo** | 3 | Compromisso financeiro |
| **Deploy em produção / ambiente real** | 3 | Irreversível |
| **Alterar `docs/factory/*` (governança)** | 3 | Os gates se aplicam à própria factory |
| **Qualquer ação que toque dado real de cliente** | 3 | LGPD/segurança |
| Tornar repositório público / expor credenciais | NEVER | Proibição absoluta |

## Regras NEVER (absolutas — nenhum nível autoriza)

1. Tornar o repositório público;
2. Expor, commitar ou logar tokens/secrets;
3. Force push ou reescrita de histórico (especialmente `main`);
4. Ignorar reprovação de QA ou aprovar trabalho próprio;
5. Aceitar automaticamente ADR estrutural;
6. Inventar requisito de produto não especificado pelo PO/humano;
7. Esconder teste falhando ou remover teste para passar build;
8. Marcar `DONE` sem `QA_APPROVED AND PO_ACCEPTED AND MERGED`;
9. Contratar/pagar serviço sem decisão humana;
10. Deploy em produção sem aprovação humana;
11. Contornar limitações do plano GitHub Free (ex.: tentar burlar ausência de rulesets);
12. Orchestrator decidir produto, prioridade, arquitetura ou executar merge estrutural (papel de coordenação).

## Princípios operacionais

- **Reversibilidade primeiro**: ações Level 1 são todas reversíveis; se uma ação não é claramente reversível, tratar como Level 2+.
- **Evidência obrigatória**: nada é declarado feito sem evidência registrada (`VALIDATED` vs `NOT_VALIDATED`).
- **Dúvida honesta**: diante de incerteza real entre níveis, escolher o nível mais restritivo e registrar a dúvida.
- **Notificação ≠ aprovação**: Level 2 informa o humano; não prossegue se a notificação indicar risco material.

## Formato de registro

Cada ação Level 2/3 executada ou pendente aparece no relatório de sessão e em `FACTORY_STATUS.md`:

```text
[AUTONOMY] L2 | ação: <descrição> | item: #N | evidência: <link> | resultado: <ok/blocked>
[AUTONOMY] L3 | decisão requerida: <pergunta> | contexto: docs/factory/HUMAN_GATES.md#<id>
```

## Relação com outros documentos

- Gates formais: `QUALITY_GATES.md` (inclui Gate 4.5 Human Review);
- Máquina de estados V2: `DEVELOPMENT_WORKFLOW.md`;
- Papel do Orchestrator: `ORCHESTRATOR.md`;
- Catálogo de decisões humanas: `HUMAN_GATES.md`;
- Execução passo-a-passo: `FACTORY_RUNBOOK.md` (V1 fallback) e `.opencode/command/start-orchestrator.md` (V2).
