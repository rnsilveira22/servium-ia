# DEC-PASSWORD-POLICY — Política de senha ASVS/NIST (Issue #54)

## Decisão

**HG-PR-SEC APROVADA em 06/09/2026** — valores vinculantes registrados aqui e no `HUMAN_DECISIONS_LOG`.

## Valores

| Parâmetro | Valor | Justificativa |
|---|---|---|
| comprimento mínimo | **12** | NIST SP 800-63B §A.2.1: mínimo 8 em geral; 12 adotado por postura B2B |
| comprimento máximo | **64** | NIST SP 800-63B §A.1: não truncar; 64 é limite semântico |
| composição obrigatória | **não** | NIST desaconselha exigir mistura (maiúscula+símbolo) — reduz entropia sem benefício comprovado |
| truncamento | **não** | NIST §A.1: verificar comprimento sem truncar |
| espaços | **permitidos** | NIST §A.1: espaços são válidos em senhas memorizadas |
| blocklist | **v1: lista mínima incorporada** | NIST §A.1: rejeitar senhas amplamente conhecidas; futura expansão via breach list |

## Referências normativas

- **NIST SP 800-63B** (Digital Identity Guidelines) — §5.1.1.1 (memorized secrets), §A.1 (verifiers), §A.2.1 (composition)
- **OWASP ASVS 4.0.3** — V2.1 (Authentication — Memorized Secret)
- **HG-PR-SEC** — Human Gate aprovada 06/09/2026 (Rodrigo, owner)

## Mecanismo de enforcement

1. **`validarPoliticaSenha()`** — função pura em `packages/db/src/security/password-policy.ts`
2. **`POST /auth/trocar-senha`** — endpoint autenticado (RequireAuth); valida senha atual, aplica política, rehash (argon2), revoga demais sessões do operador, audita sucesso/falha
3. **Seed** — `scripts/seed.mjs` valida senhas default (`ADMIN_PASS`/`OPERATOR_PASS`) contra política; rejeita com erro claro se fora da política

## Auditoria

Eventos registrados em `eventos_auditoria` (tabela append-only):

| Evento | Quando | `detalhes` |
|---|---|---|
| `trocar_senha` | Senha atualizada com sucesso | `{}` |
| `trocar_senha_falha` | Senha atual incorreta ou nova senha fora da política | `{ motivo: 'senha_invalida' }` ou `{ motivo: 'politica_violada', motivo_detalhe: '<codigo>' }` |

`entidade = 'auth'`, `actor_type = 'operador'`, `entidade_id = operador_id`.

## Desvios e decisões futuras

- **Blocklist v1**: lista mínima incorporada (5 senhas dev + top comuns). Futuro: importar breach list (HaveIBeenPwned k-anonimidade ou equivalente).
- **Reuso de senhas anteriores**: não implementado nesta versão (NIST recomenda verificar mas aceito como lacuna documentada — v2).
- **Criação de operadores via API**: política NÃO aplicada (escopo OUT documentado); futura implementação deve usar a mesma função.
