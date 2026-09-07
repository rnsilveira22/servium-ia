# Relatório — Registro da Demo Factory no Backlog

**Plataforma**: opencode (modelo: big-pickle)  
**Data**: 2026-08-27  
**Branch**: `docs/demo-factory-planning`  
**Commit**: `3f10efb`

---

## Resumo

A **Demo Factory** foi planejada e registrada formalmente no backlog da Servium IA. **Nenhum código funcional foi implementado** — apenas planejamento técnico, definição de escopo/gates e atualização documental, exatamente como solicitado.

## Arquivos alterados

### Criados

| Arquivo | Conteúdo |
|---|---|
| `docs/product/DEMO_FACTORY_STORY.md` | Épico completo: objetivo, arquitetura esperada, fluxo demonstrativo, RN-01..10, critérios de aceite, dependências, riscos, Human Gate |

### Modificados

| Arquivo | Mudança |
|---|---|
| `docs/product/BACKLOG_OVERVIEW.md` | EPIC-013 "Demo Factory" adicionado (status: BLOCKED) |
| `docs/PROJECT_INDEX.md` | Índice documental atualizado |
| `docs/roadmap/README.md` | Fase 8 "Demo Factory" (planejada, BLOCKED) adicionada |

## Identificador do item de backlog

- **Épico**: EPIC-013 — Demo Factory
- **Issue**: não criada via GitHub API — **bloqueio de autenticação** (token `gh` inválido: `HTTP 401 Requires authentication`). Corpo da Issue pronto (anexo abaixo) para criação assim que o token for renovado.

## Estado atual

`BLOCKED — AWAITING_MVP_STABILITY_AND_HUMAN_GATE`

## Bloqueios

1. **GitHub token inválido** (`gh auth` → HTTP 401). Impossibilitou:
   - criação da Issue no repositório;
   - adição ao Project board;
   - abertura de PR com CI;
   - push/merge (governança exige Issue → PR → gates).
2. **Gate de implementação** (intencional): estabilidade do MVP + autorização humana.

## Próximo Human Gate

```text
HUMAN_GATE_DEMO_FACTORY
Bloqueia toda implementação da Demo Factory.
Libera apenas com (todas):
  A) Testes manuais do MVP concluídos
  B) Testes E2E aprovados (QA = APPROVED)
  C) Fluxo principal estabilizado
  D) Dados fictícios de demonstração definidos e aprovados
  E) Identidade visual disponível (já atende)
  F) Autorização humana explícita de Rodrigo
```

## Validações executadas

| Validação | Resultado |
|---|---|
| `npm run lint:docs` (arquivos do planejamento) | ✅ 0 erros |
| Diff revisado | ✅ apenas 4 arquivos de documentação |
| Nenhum código funcional | ✅ confirmado |

*Obs.: `lint:docs` global apresenta dívida pré-existente em `docs/reports/QA_CORRECTIVE_GATE_REPORT.md` (33 erros) — fora do escopo desta atividade.*

## Git

| Item | Valor |
|---|---|
| Branch | `docs/demo-factory-planning` |
| Commit | `3f10efb` |
| Mensagem | `docs: planejamento Demo Factory registrado no backlog` |
| Arquivos | 4 (4 inseridos, 1 alterado) |

## Push / Merge

**NÃO houve push nem merge.** Aguardando: (1) renovação do token GitHub para registrar Issue/Project e abrir PR; (2) autorização da governança para prosseguir.

## Sugestão de mensagem de commit (após desbloqueio)

```text
docs: planejamento Demo Factory registrado no backlog

- docs/product/DEMO_FACTORY_STORY.md: épico EPIC-013 (escopo, ACs, riscos, Human Gate)
- docs/product/BACKLOG_OVERVIEW.md: EPIC-013 + docs/roadmap: Fase 8
- docs/PROJECT_INDEX.md: índice atualizado
- Issue registrada no Project + PR de documentação

Closes #<issue>
```

---

## Anexo — Corpo da Issue (pronto para uso)

```markdown
## Épico

`EPIC-013 — Demo Factory`

## User Story

**Como** equipe Servium IA, **quero** gerar automaticamente vídeos de apresentação
do MVP usando a aplicação real, **para** demonstrar o Estagiário Digital de forma
consistente e com revisão humana.

## Contexto

Após o MVP pronto, testado e aprovado, gerar vídeos demonstrativos com ambiente
isolado, dados fictícios, navegação Selenium, gravação de tela, narração pt-BR
com IA, legendas, identidade visual e exportação MP4.

## Objetivo

Planejar (não implementar) a Demo Factory e registrá-la no backlog.

## Regras de negócio

- RN-01: nunca dados reais de clientes
- RN-02: nunca executar contra produção por padrão
- RN-03: nunca expor senhas, tokens ou dados pessoais
- RN-04: usuário exclusivo de demonstração com permissões limitadas
- RN-05: separar testes E2E dos roteiros de apresentação
- RN-06: permitir execução local antes da CI
- RN-07: roteiro, narração e configurações versionados
- RN-08: revisão humana antes de qualquer publicação externa
- RN-09: nenhuma dependência/código nesta etapa
- RN-10: não alterar comportamento atual do MVP

## Critérios de aceite

- [ ] história técnica/epic criada e registrada
- [ ] escopo, fora de escopo e ACs definidos
- [ ] dependências e riscos registrados
- [ ] Human Gate de liberação definido
- [ ] item adicionado ao Project/roadmap
- [ ] índices documentais atualizados
- [ ] validações documentais executadas
- [ ] nenhum código funcional adicionado

## Dependências

1. Testes manuais do MVP concluídos
2. Testes E2E aprovados (QA = APPROVED)
3. Fluxo principal estabilizado
4. Dados fictícios de demonstração definidos
5. Identidade visual disponível (✅)
6. Autorização humana explícita de Rodrigo

## Prioridade

`P2 - Medium`

## Status

`BLOCKED — AWAITING_MVP_STABILITY_AND_HUMAN_GATE`
```
