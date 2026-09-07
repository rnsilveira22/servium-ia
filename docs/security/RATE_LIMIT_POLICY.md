# Política de Rate Limiting no Login — `POST /auth/login`

## Status

Aprovado (HG-PR-SEC) em 2026-09-06 · Issue #55 (PRM-P0.3-B).

## Objetivo

Mitigar brute-force / credential-stuffing no endpoint de login (ASVS V2.2
Authentication / anti-automation; NIST 800-63B confidencialidade).

## Valores (vinculantes)

| Alvo            | Limite | Janela  | Acionado por        |
|-----------------|--------|---------|---------------------|
| Conta `(slug,email)` | 5 falhas | 15 min  | falhas de autenticação |
| IP              | 30 falhas | 5 min | falhas de autenticação |

- Falhas contadas: credenciais inválidas (senha errada) e conta inexistente.
- **Resposta anti-enumeração:** 401 para credenciais inválidas e 429 para
  limite excedido, com o **mesmo formato de corpo** — nunca se expõe qual regra
  (conta vs IP) acionou o bloqueio.

## Comportamento da janela

- Fixed-window em memória: a janela expira sozinha (troca de bucket) e o login
  legítimo volta a funcionar — **sem estado persistente corrompido** (CA-B-3).
- A tentativa que cruza o limite emite o evento `login_block` (quando há
  tenant/operador identificável) ou log estruturado sem PII (caso contrário).
- O request seguinte dentro da janela recebe `429`.

## Configuração (env) para CI/testes

| Env                                   | Padrão  | Significado                |
|---------------------------------------|---------|----------------------------|
| `LOGIN_RATE_LIMIT_ACCOUNT_MAX`        | `5`     | falhas por conta / janela  |
| `LOGIN_RATE_LIMIT_ACCOUNT_WINDOW_MS`  | `900000`| janela da conta (ms)       |
| `LOGIN_RATE_LIMIT_IP_MAX`             | `30`    | falhas por IP / janela     |
| `LOGIN_RATE_LIMIT_IP_WINDOW_MS`       | `300000`| janela do IP (ms)          |

## Auditoria

- Evento `login_block` em `eventos_auditoria` no tenant correto, com detalhes
  mínimos sem PII desnecessária, além de log estruturado.
- `login_sucesso` / `login_falha` preservados (sem regressão).

## Limitação de escala (decisão v1)

O contradomínio do rate limit vive **em memória por instância** da aplicação.
É aceito como v1 porque o piloto roda como aplicação **single-instance**.
Em cenário **multi-instance** (horizontal) o estado não seria compartilhado
entre réplicas; uma migração exigiria store compartilhado (ex.: Redis) com o
mesmo contrato, sem alterar a API pública.
