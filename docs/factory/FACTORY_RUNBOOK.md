# Factory Runbook — Servium IA

> Manual operacional de uma sessão autônoma da factory. O comando `START_FACTORY` (`.opencode/command/start-factory.md`) referencia este runbook. Fontes normativas: `AGENT_GOVERNANCE.md`, `AUTONOMY_POLICY.md`, `AGENT_ORCHESTRATION.md`.
>
> **Factory V2 (Orchestrator):** a V1 deste runbook permanece **íntegra como fallback**. A V2 adiciona o agente `servium-orchestrator` e inicia via `.opencode/command/start-orchestrator.md`; papel e limites em `ORCHESTRATOR.md`. Estados canônicos V2 em `DEVELOPMENT_WORKFLOW.md`; política de merge unificada por classe em `AUTONOMY_POLICY.md` (HG-F2-03) em harmonia com o §9 deste documento.

## 0. Identidade da sessão

Uma sessão OpenCode **atua como um agente por vez por item** (na V2, sob coordenação do Orchestrator). Antes de agir, declarar no primeiro output:

```text
[FACTORY] sessão iniciada | branch: <branch> | data: <data>
[FACTORY] papel ativo inicial: <orchestrator|po|senior|pleno|qa> (muda só em gate/handoff)
```

## 1. Verificação de estado (sempre, nesta ordem)

1. **Repo**: `git status` limpo; branch atual; `git fetch origin` sem surpresa;
2. **GitHub**: `gh auth status` OK; PRs abertos e seus estados;
3. **Project**: itens por Status (Board); campos coerentes com labels;
4. **Bloqueios humanos**: Issues/comentários com `needs:decision` — há decisão nova a processar?
5. **CI**: workflows verdes nos PRs abertos.

Qualquer inconsistência (ex.: campo do Project ≠ labels) é corrigida com registro antes de novo trabalho.

## 2. Seleção de trabalho

Seguir ordem e filas de `AGENT_ORCHESTRATION.md` (§2 e §5), respeitando WIP (§6). Se nenhum item for elegível → atualizar `FACTORY_STATUS.md` e encerrar.

## 3. Execução por papel

### servium-po

- Completa DoR de itens em `BACKLOG` (Gate 1);
- Cria Issues somente de épico aprovado (Level 2/3 — ver `AUTONOMY_POLICY.md`);
- Processa aceites (`PO_ACCEPTANCE`) de itens em `QA_APPROVED`;
- Nunca aprova o que não tem evidência.

### servium-senior

- Consome fila `READY`: produz Technical Analysis (template oficial) e valida contra ADRs vigentes;
- `Proposed` ≠ autorização — se a história depende de ADR não aceito → `AWAITING_DECISION` + HG;
- Decomposição + estratégia de testes → Gate 2 → handoff.

### servium-pleno

- Implementa exatamente o escopo contratado; expansão vira Issue nova;
- Branch `<prefixo>/<issue>-descricao`; Conventional Commits pt-BR;
- Evidências reais (testes executados, build, lint) → Gate 3 → PR → handoff QA;
- Ao receber `CHANGES_REQUESTED`: responde achado-a-achado, corrige tudo, devolve.

**Flexibilização de papéis (decisão owner · 2026-08-24):** quando não houver item na sua fila, o papel auxilia o seguinte na cadeia — `servium-senior` auxilia `servium-pleno` na implementação; `servium-pleno` auxilia `servium-reviewer-qa` nos testes. O veredito de QA permanece SEMPRE do revisor titular; quem implementou não assina o aceite da própria PR.

### servium-reviewer-qa

- Veredito único formal via template QA; bloqueadores automáticos de `QUALITY_GATES.md` §Gate 4;
- Nunca edita código; nunca aprova com CI vermelho ou critério descumprido;
- 3ª reprovação consecutiva → `ESCALATED_TECHNICAL_FAILURE` (orquestração §7).

## 4. Regras de escrita (todos os papéis)

- Toda transição: label(s) + campo Status do Project consistentes;
- Evidência antes de afirmação: `VALIDATED` só com execução real registrada;
- Segredos nunca em texto, log, Issue, PR ou commit;
- Nada de comentário "enfeitando" histórico — commits só quando carregam mudança real.

## 5. Encerramento de sessão

1. Atualizar `docs/factory/FACTORY_STATUS.md` (itens movidos, bloqueios, decisões pendentes);
2. Commitar mudanças documentais na branch de trabalho vigente (nunca direto na `main`);
3. Push (sem force);
4. Relatório final no chat com: itens tocados, transições, bloqueios criados/resolvidos, decisões humanas pendentes.

## 6. Recuperação de falhas

| Falha | Ação |
|---|---|
| CI vermelho em PR próprio | Investigar log; máx. 3 retries legítimos; senão tratar como falha real |
| `gh` indisponível | Registrar `BLOCKED` infra; seguir trabalho local; re-tentar na próxima sessão |
| Estado do Project divergente | Corrigir para a fonte da verdade (Issue + evidências) e registrar correção |
| Conflito de merge | Responsável rebasa; se tocar código já revisado → volta a `READY_FOR_QA` |
| Suspeita de dado real exposto | Parar tudo; remover do índice/git conforme política de segurança; reportar humano imediatamente |

## 7. PRE-PUSH VALIDATION GATE (obrigatório)

Nenhuma branch é enviada ao remoto com PR aberta sem que o agente responsável execute **localmente** os mesmos checks relevantes da CI, usando os scripts reais do repositório.

### 7.1 Alteração apenas de documentação

```bash
npm run lint:docs        # markdownlint-cli2 em todo docs/ + raiz (config .markdownlint.jsonc)
```

### 7.2 Alteração de código

```bash
npm ci                   # instalação consistente com o lockfile (obrigatória se package-lock.json mudou)
npm run db:up            # Postgres local p/ testes de @servium/db (CI usa service equivalente)
npm run verify           # cadeia idêntica à CI: lint → build → typecheck → test (inclui db)
npm run db:down          # encerra o banco após a validação
```

A ordem `build` antes de `typecheck` é intencional e espelha a CI: `@servium/shared-types` só resolve tipos após gerar `dist/`. Não reordenar sem alterar CI junto.

### 7.3 Regras

- Qualquer check local falhando ⇒ **não fazer push**; corrigir; repetir; só então push;
- Proibido mascarar falha (`continue-on-error`, `|| true`, silenciar saída) — local ou CI; em shell, usar `set -o pipefail` (pipes como `cmd | tail` escondem o código de saída do comando);
- A CI é a única fonte de verdade pós-push; gate local existe para reduzir runs failed intermediários, nunca para substituí-la;
- Comandos duplicados não existem: a CI chama os **mesmos scripts npm** usados localmente (`lint`, `build`, `typecheck`, `test`) — qualquer mudança de comando muda script + workflow no mesmo commit;
- Node 22 (engines) e lockfile versionado na raiz garantem paridade de versões;
- Notificações do GitHub permanecem sempre ativas.

## 8. Padrão de acesso a dados (ADR-005 · vinculante)

- Conexões de aplicação/teste usam **sempre** o role `servium_app` (sem BYPASSRLS/superuser);
- **Proibido** conectar a aplicação como superuser/dono do schema em runtime;
- Toda operação de negócio define `app.tenant_id` antes da primeira query — preferir `withTenant()` de `@servium/db`;
- Contexto ausente, vazio ou inválido = **deny** (políticas `NULLIF(current_setting(...))`);
- Novas tabelas tenant-scoped: herdar padrão (tenant_id NOT NULL + política) — a suíte de catálogo da SRV-7 falha a CI caso contrário.

## 9. AUTONOMOUS FEATURE MERGE (ativo desde 2026-08-24 · decisão do owner)

PR **normal de implementação** é mergeada automaticamente pela Factory quando TODAS as condições valem:

`CI_GREEN AND PRE-PUSH_GATE=PASS AND QA=APPROVED AND PO=ACCEPTED AND NO_HUMAN_GATE AND NO_STOP_CONDITION AND NO_LEVEL3_CHANGE AND NO_BLOCKING_REVIEW AND MERGEABLE/CLEAN AND DIFF_WITHIN_APPROVED_SCOPE`

Após merge: atualizar main → validar → próximo item. Não parar por merge pronto.

**Continuam exigindo o owner (Level 3)**: ADR novo/material, arquitetura estrutural, stack, boundary, segurança/RLS estrutural, custo recorrente/provedor pago, deploy cliente/produção, DNS, secrets do owner, escopo/produto, governança da Factory, visibilidade, force push/histórico.

**DONE (com PR)** = CI_GREEN AND QA_APPROVED AND PO_ACCEPTED AND MERGED.

**PILOT_READY** = PARAR. Checklist GO/NO-GO + HUMAN_DECISION_REQUIRED — PILOT DEPLOYMENT.
