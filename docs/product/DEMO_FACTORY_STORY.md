# Demo Factory — Planejamento (BLOCKED)

> **Estado**: `BLOCKED — AWAITING_MVP_STABILITY_AND_HUMAN_GATE`
> **Tipo**: Épico técnico/growth — automação de vídeos demonstrativos
> **Registro**: Issue `/docs/factory` backlog — segue o item #`<issue>` registrado no Project.
> **Fase candidata**: pós-MVP-01 (após estabilidade + aprovação humana)

---

## Objetivo

Gerar automaticamente vídeos de apresentação do MVP "Assistente Digital de Pendências Documentais" (comercial: **Estagiário Digital**) usando a aplicação real, em ambiente isolado, com dados fictícios, narração em pt-BR, legendas sincronizadas, identidade visual e exportação em MP4 para revisão humana.

## Fora de escopo (nesta fase)

- Implementar qualquer código, dependência ou script funcional.
- Alterar o comportamento atual do MVP.
- Executar contra produção.
- Publicar qualquer vídeo.

---

## Arquitetura inicial esperada (referência de planejamento)

```text
demo/
├── scenarios/
│   └── mvp-estagiario.spec.ts
├── scripts/
│   └── narracao-pt-BR.md
├── fixtures/
│   └── dados-demonstracao.json
├── branding/
│   ├── logo.svg
│   └── README.md
├── config/
│   └── demo.config.ts
└── output/
    └── .gitkeep
```

### Tecnologias candidatas

| Componente | Candidato | Observação |
|---|---|---|
| Automação de navegador | Selenium | Já utilizado para E2E (`apps/e2e`) |
| Montagem de vídeo | FFmpeg | Recorte, legendas, logo, exportação MP4 |
| Narração pt-BR | TTS configurável | Provedor a decidir na implementação (sem custo automático) |
| Execução futura | GitHub Actions | Após versão aprovada (artefato MP4) |
| Dados | Fictícios, ambiente isolado | Nunca dados reais |

## Fluxo demonstrativo planejado

1. Abrir a Servium IA;
2. Login com usuário de demonstração;
3. Apresentar o dashboard;
4. Localizar ou cadastrar cliente fictício;
5. Mostrar obrigações do cliente;
6. Iniciar um ciclo documental;
7. Mostrar a solicitação gerada;
8. Simular recebimento de documento;
9. Apresentar uma exceção;
10. Resolver a exceção;
11. Abrir auditoria;
12. Mostrar o resultado do ciclo.

---

## Regras de negócio / restrições

- RN-01: nunca utilizar dados reais de clientes;
- RN-02: nunca executar contra produção por padrão;
- RN-03: nunca expor senhas, tokens ou dados pessoais no vídeo;
- RN-04: usar usuário exclusivo de demonstração com permissões limitadas;
- RN-05: separar testes E2E dos roteiros de apresentação;
- RN-06: permitir execução local antes da integração com CI;
- RN-07: manter roteiro, narração e configurações versionados;
- RN-08: exigir revisão humana antes de qualquer publicação externa;
- RN-09: não adicionar dependências nem escrever código funcional nesta etapa;
- RN-10: não alterar o comportamento atual do MVP.

---

## Critérios de aceite (fase de implementação)

- [ ] CA-01: gera vídeo MP4 completo do fluxo em ambiente isolado;
- [ ] CA-02: usa exclusivamente dados fictícios;
- [ ] CA-03: narração pt-BR e legendas sincronizadas presentes;
- [ ] CA-04: identidade visual Servium IA aplicada;
- [ ] CA-05: nenhuma credencial/dado pessoal visível;
- [ ] CA-06: executável localmente sem CI;
- [ ] CA-07: vídeo publicado como artefato para revisão humana;
- [ ] CA-08: opção futura de execução no GitHub Actions documentada.

---

## Dependências

| # | Dependência | Critério de liberação |
|---|---|---|
| 1 | Testes manuais do MVP concluídos | Relatório humano |
| 2 | Testes E2E aprovados | QA = APPROVED |
| 3 | Fluxo principal estabilizado | Sem bugs críticos |
| 4 | Dados fictícios de demonstração definidos | Fixtures aprovadas |
| 5 | Identidade visual disponível | Servium IA brand ✅ (já disponível) |
| 6 | Autorização humana explícita de Rodrigo | Human Gate HG-0? |

## Riscos

| # | Risco | Mitigação |
|---|---|---|
| R-01 | Gravação instável (flaky) | Screenshots espelhados + retries configuráveis |
| R-02 | Custo de TTS/FFmpeg | Provedor configurável; execução local padrão |
| R-03 | Duração do vídeo | Roteiro indexado; cortes por cena |
| R-04 | Dados fictícios desatualizados | Fixtures versionadas e revisor humano |
| R-05 | Vazamento de dados reais | Ambiente isolado, usuário limitado, review obrigatório |

---

## Human Gate de liberação

**Gate de implementação** — só libera esta atividade com todas as condições atendidas:

```text
HUMAN_GATE_DEMO_FACTORY
Condições:
  A) Testes manuais do MVP concluídos (evidência);
  B) Testes E2E aprovados (QA = APPROVED);
  C) Fluxo principal estabilizado;
  D) Dados fictícios de demonstração definidos e aprovados;
  E) Identidade visual disponível;
  F) Autorização humana explícita de Rodrigo.
Estado até lá: BLOCKED — AWAITING_MVP_STABILITY_AND_HUMAN_GATE
```

Sem autorização explícita de Rodrigo, **nenhum código da Demo Factory é implementado**.

---

## ADR

Nenhum ADR é necessário nesta fase: é planejamento e registro, sem decisão arquitetural vinculante. A stack candidata será confirmada em ADR quando a implementação for autorizada.

---

## Arquivos deste planejamento

### Criados

- `docs/product/DEMO_FACTORY_STORY.md` (este arquivo)

### Modificados

- `docs/product/BACKLOG_OVERVIEW.md` (épico → Backlog)
- `docs/PROJECT_INDEX.md` (índice)
- `docs/roadmap/README.md` (roadmap)

### Registro operacional

- Issue no backlog GitHub (+ adição ao Project)

---

## Validações

- [x] `npm run lint:docs` sem erros nos arquivos deste planejamento
