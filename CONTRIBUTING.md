# Contribuição — Servium IA

> Política leve de branches e commits para o estágio atual do projeto. Será evoluída conforme a equipe cresce — sem Git Flow pesado.

## Branches

- **`main`** sempre estável: apenas documentação consistente ou código funcional;
- Trabalho de fases em branch dedicada:

```text
phase/002-mvp-discovery
phase/003-architecture
```

- Alterações pontuais em branch curta com prefixo:

| Prefixo | Uso |
|---|---|
| `feat/...` | nova funcionalidade |
| `fix/...` | correção |
| `docs/...` | documentação |
| `chore/...` | manutenção/configuração |
| `refactor/...` | reestruturação sem mudança de comportamento |
| `test/...` | testes |

- Merge para `main` somente após revisão; **nunca force push em `main`**.

## Commits

Padrão: **Conventional Commits**, com descrição em **português brasileiro**.

```text
docs: define escopo inicial do MVP
feat: implementa envio de lembretes
fix: corrige duplicação de cobranças
chore: configura editorconfig
refactor: reorganiza módulo de execução
test: adiciona testes de validação
```

Regras:

1. Commits pequenos; uma intenção por commit;
2. Não misturar refatoração com funcionalidade;
3. Não commitar código quebrado em `main`;
4. **Nunca commitar secrets** (credenciais, tokens, chaves — ver `.gitignore`);
5. Mensagens em pt-BR, prefixo Conventional Commit em inglês.

## Documentação

- Em português brasileiro, Markdown, links relativos;
- Atualizar [`docs/PROJECT_INDEX.md`](docs/PROJECT_INDEX.md) ao adicionar documentos estruturais;
- Agentes de IA: ler [`docs/AI_CONTEXT.md`](docs/AI_CONTEXT.md) antes de qualquer alteração.

## Revisão

Pull requests são bem-vindos após revisão do titular do projeto. O acesso ao repositório não concede direitos de uso do produto (ver [`LICENSE`](LICENSE)).
