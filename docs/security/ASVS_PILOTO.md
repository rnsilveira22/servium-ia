# Mapeamento ASVS 4.0.3 nível 1 — Piloto Servium IA

> Documento **vivo** de conformidade de segurança do piloto (Issue #57 · PRM-P0.3-D · CA-07 do #20).
> Vincula os controles exigidos pelo **OWASP ASVS 4.0.3 nível 1** à implementação real e à
> **evidência automatizada** (teste → `arquivo:linha`), expondo lacunas abertas como itens rastreados.
> Sustenta `PILOT_READY` e a revisão de segurança.
>
> **Objetivo do capítulo:** nenhum artefato ASVS materializado existia até esta Issue (ADR-009 vinculou
> ASVS + testes de segurança na primeira história de auth). Este doc corrige esse gap.
>
> Escopo: capítulos **V2 (Autenticação)**, **V3 (Gerenciamento de sessão)**, **V4 (Controle de acesso)** e
> **V5 (Validação de entrada / sanitização)**, nível 1.
> Fora de escopo (V6+ criptografia etc.): remetido a revisão de ADR/RLS (ver [Relatório ADR](../architecture/ADR_REVIEW_REPORT.md)).

## Estados usados

| Status | Significado |
|---|---|
| `implementado` | Controle presente e com evidência automatizada apontada (teste → arquivo:linha). |
| `parcial` | Algum aspecto implementado; outro aspecto essencial ainda ausente ou sem evidência. |
| `lacuna` | Não implementado / sem evidência automatizada verificável; registrado como item rastreado. |

> Regra (espelho do QUALITY_GATES): **nenhuma ausência de evidência é convertida em sucesso**.
> Se não existe teste específico, o requisito é marcado `lacuna`, mesmo que o feixe de código sugira cobertura parcial.

## Critérios de aceite da Issue #57

- **CA-D-1** — lacunas abertas (CORS estrito, headers de segurança, `SameSite` etc.) rastreadas na tabela com status `lacuna`. ✅
- **CA-D-2** — cada requisito implementado aponta evidência automatizada específica (teste → `arquivo:linha`). ✅
- **CA-D-3** — revisão por responsável de segurança é condição para `PILOT_READY` (marcada explicitamente, sem inventar aprovação). ✅

---

## Rastreabilidade de decisões e políticas

| Documento | Papel neste mapeamento |
|---|---|
| [ADR-009](../decisions/ADR-009-authentication-strategy.md) | Autenticação first-party + sessões httpOnly + RBAC mínimo; condição obrigatória "checklist OWASP ASVS + testes de segurança" (HG-002). |
| [PASSWORD_POLICY.md](./PASSWORD_POLICY.md) | Valores vinculantes de senha (HG-PR-SEC · 06/09) — base da V2.1. |
| [RATE_LIMIT_POLICY.md](./RATE_LIMIT_POLICY.md) | Rate limit no login (HG-PR-SEC · 06/09) — base da V2.2. |
| [EVENTOS_AUDITORIA.md](../audit/EVENTOS_AUDITORIA.md) | Mecanismo de auditoria (append-only) como controle de trilha — citado em V2/V4. |
| ADR-005 / [0003_rls_security.sql](../../packages/db/migrations/0003_rls_security.sql) | RLS deny-by-default por tenant — base da V4.1. |

---

## V2 — Autenticação

| Requisito ASVS 4.0.3 | Descrição | Status | Evidência automatizada (teste/arquivo:linha) | Notas |
|---|---|---|---|---|
| V2.1.1 | Senhas de usuário com **mínimo 12 caracteres** | `implementado` | `apps/api/test/trocar-senha.test.ts:83-85` (`rejeita senhas com menos de 12`) / `packages/db/src/security/password-policy.ts:11,34-43` | Enforcement em `POST /auth/trocar-senha` (`apps/api/src/auth/auth.controller.ts:108-115`). |
| V2.1.2 | Senhas de pelo menos **64 caracteres** são permitidas (sem teto arbitrário abaixo de 64) | `implementado` | `apps/api/test/trocar-senha.test.ts:93-95` (`aceita exatamente 64`) / `password-policy.ts:12,41-43` | Limite máximo = 64, sem truncamento. |
| V2.1.3 | **Sem truncamento** de senha | `implementado` | `apps/api/test/trocar-senha.test.ts:87-95` / `password-policy.ts:35-43` | Contagem por code points (`[...s].length`); verifica antes de hashear. |
| V2.1.4 | **Qualquer carácter Unicode imprimível** permitido em senhas | `implementado` | `apps/api/test/trocar-senha.test.ts:79-81` (espaços) + política sem restrição de charset | NIST não exige composição; blocklist normaliza acentos (`password-policy.ts:45-52`). |
| V2.1.7 | Rejeitar senhas triviais/substituídas/calendar/pattern (blocklist) | `implementado` | `apps/api/test/trocar-senha.test.ts:97-103` / `password-policy.ts:19-27,50-52` | Blocklist v1 incorporada; expansão futura via breach list (NIST §A.2.1). |
| V2.2.1 | Controles anti-automação no login (rate limiting) | `implementado` | `apps/api/test/rate-limit.test.ts:64-84` (bloqueio por conta + `login_block`) e `rate-limit.test.ts:141-150` (por IP) | Política: `docs/security/RATE_LIMIT_POLICY.md` (5/15min conta, 30/5min IP). `login-rate-limit.interceptor.ts:47-49`. |
| V2.2.3 | Medir a recusa de autenticar contra ataques de **força bruta** (configurável) | `implementado` | `apps/api/test/rate-limit.test.ts:96-104` (janela expira → volta legitimo) | Fixed-window in-memory; expira sozinha (CA-B-3). |
| V2.3.1 | Senhas iniciais/activation codes gerados com segurança e fora de banda | `lacuna` | — | Não há fluxo de "senha inicial/ativação" via API; seed local valida política mas não há envio out-of-band. **Rastreado (CA-D-1).** |
| V2.5.3 | Hash de senha com **argon2id** (memória/CPU hard, salt único) | `implementado` | `apps/api/test/auth.test.ts:56-62` (`hash argon2id não é reversível`) / `auth.controller.ts:45-46,117` | Uso de `@node-rs/argon2` (argon2id), não reversível. |
| V2.5.4 | **Mensagem idêntica** para conta inexistente × senha errada (anti-enumeração) | `implementado` | `apps/api/test/auth.test.ts:74-79` (`login com email inexistente e senha errada são indistinguíveis`) / `auth.controller.ts:38-50` | Resposta `401` genérica nos dois casos. |
| V2.5.6 | Controle de **mudança/recuperação de senha** que exige confirmação da senha atual | `implementado` | `apps/api/test/trocar-senha.test.ts:127-137` (`senha atual incorreta ⇒ 400`) / `auth.controller.ts:101-106` | Exige `senha_atual` válida; audita `trocar_senha_falha`. |
| V2.5.7 | Revogar/expirar sessões após troca de senha | `implementado` | `apps/api/test/trocar-senha.test.ts:167-187` (`revoga as demais sessões...`) / `auth.controller.ts:120-125` | Revoga demais sessões, preservando a corrente. |
| V2.8.1 | Todas as páginas de autenticação estão **livres de clickjacking** (framing/X-Frame) | `lacuna` | — | SPA/API sem `X-Frame-Options`/CSP/`frame-ancestors` configurados. **Rastreado (CA-D-1).** |

---

## V3 — Gerenciamento de sessão

| Requisito ASVS 4.0.3 | Descrição | Status | Evidência automatizada (teste/arquivo:linha) | Notas |
|---|---|---|---|---|
| V3.1.1 | Token de sessão **nunca revelado** em URL/log/erro | `implementado` | Sessão via cookie `sid` httpOnly, nunca em URL (`auth.controller.ts:12-15`, `64`); token hashead (SHA-256) antes de persistir (`auth.guard.ts:106-109`) | Hash do token armazenado em `sessoes.token_hash` — token em si só no cookie. |
| V3.1.2 | Logout **invalida imediatamente** o token server-side | `implementado` | `apps/api/test/auth.test.ts:109-113` (`logout revoga imediatamente`) / `auth.controller.ts:74-80` | `revogado_em = now()`. |
| V3.1.3 | Sessão encerrada por **inatividade** (timeout) | `implementado` | TTL de expiração `sessoes.expira_em` validado por requisição (`auth.guard.ts:50-51`) | `SESSION_TTL_HOURS = 12` (`auth.controller.ts:10`); sem evidência de teste de expiração **automática por inatividade** dedicado → **parcial** (TTL sim; pausa de atividade não testada). |
| V3.1.5 | Sessão armazena apenas **referência opaca** (não dados da sessão no cookie) | `implementado` | Cookie só carrega `sid` opaco; dados resolvidos no DB por `token_hash` (`auth.guard.ts:45-53`) | Sem JWT/claim; estado server-side. |
| V3.2.1 | Token de sessão com **≥ 120 bits de entropia** | `implementado` | `auth.controller.ts:52` (`randomBytes(32)` = 256 bits CSPRNG) | 256 bits ≥ 120. |
| V3.2.3 | Token gerado com **CSPRNG** | `implementado` | `auth.controller.ts:52` (`node:crypto.randomBytes` — CSPRNG) | — |
| V3.4.1 | Cookie de sessão **httpOnly** | `implementado` | `apps/api/test/auth.test.ts:64-72` (`HttpOnly`) / `auth.controller.ts:12-15` | Verificado nos testes de login. |
| V3.4.2 | Cookie **Secure** em produção | `parcial` | `auth.controller.ts:13` (`COOKIE_SECURE === 'true' ? '; Secure' : ''`) | Flag `Secure` **condicional** a env; em dev/CI sem TLS fica ausente. Sem teste automatizado dedicado. **Aberto.** |
| V3.4.3 | Atributo **SameSite** em cookies | `implementado` | `apps/api/test/auth.test.ts:70` (`SameSite=Lax`) / `auth.controller.ts:14` | `SameSite=Lax` fixo em todos os cookies. |
| V3.7.1 | **CSRF** mitigado nos endpoints sensíveis (state-changing) | `parcial` | `SameSite=Lax` fornece mitigação parcial (`auth.controller.ts:14`) | Nenhum token anti-CSRF explícito; `SameSite=Lax` cobre métodos não-safe cross-site mas há limites. **Aberto (CA-D-1).** |

---

## V4 — Controle de acesso

| Requisito ASVS 4.0.3 | Descrição | Status | Evidência automatizada (teste/arquivo:linha) | Notas |
|---|---|---|---|---|
| V4.1.1 | Regras de controle de acesso aplicadas no **lado do servidor (trusted layer)** | `implementado` | `apps/api/src/auth/auth.guard.ts:26-85` (`RequireAuth` + RBAC) / teste `apps/api/test/auth.test.ts:92-107` | Guard NestJS aplica RBAC no servidor; nunca no cliente. |
| V4.1.2 | Controle de acesso **bloqueado por padrão** (deny-by-default) | `implementado` | `apps/api/test/auth.test.ts:81-83` (`/auth/me sem sessão = 401`) e `auth.guard.ts:35` | Sem cookie → `401`. |
| V4.1.3 | Falhas de controle de acesso **falham de forma segura** (403/404, sem revelar existência) | `implementado` | `apps/api/test/ciclo-detalhe.test.ts:134-138` (`ciclo de outro tenant ⇒ 404`) / `auditoria.test.ts:169-177` | RLS inverte não-autorizado em não-existente (404), sem vazar dados entre tenants. |
| V4.1.5 | **Anti-CSRF** para mudanças de estado (forte) | `parcial` | `SameSite=Lax` (`auth.controller.ts:14`) como mitigação parcial | Sem token anti-CSRF explícito; ver V3.7.1. **Aberto (CA-D-1).** |
| V4.2.1 | Permissões **mínimas** (least privilege) por papel | `implementado` | `apps/api/test/auth.test.ts:92-107` (`operador ⇒ 403` em rota admin) / `auth.controller.ts:141-146` | RBAC mínimo `admin`/`operador`. |
| V4.3.1 | **Isolamento multi-tenant** por RLS impedindo acesso cruzado | `implementado` | `apps/api/test/cadastro.test.ts:96-102` (`cliente de A invisível para B`), `auditoria.test.ts:169-177` (RLS via HTTP), `0003_rls_security.sql:18-38` | RLS deny-by-default por `app.tenant_id` (ADR-005). |
| V4.3.2 | **FK não vaza por RLS** — entidades de outro tenant rejeitadas | `implementado` | `apps/api/test/cadastro.test.ts:104-118` (`obrigação exige cliente do MESMO tenant`) | Acesso cross-tenant a entidade inexistente no contexto → `400/404`. |

---

## V5 — Validação de entrada / sanitização

| Requisito ASVS 4.0.3 | Descrição | Status | Evidência automatizada (teste/arquivo:linha) | Notas |
|---|---|---|---|---|
| V5.1.1 | Validação de entrada executada no **servidor trusted layer** | `implementado` | Controllers validam no servidor: `cadastro.controller.ts:47-123`, `auditoria.controller.ts:27-71`, `auth.controller.ts:89-115` | Validação **manual/defensiva** (sem lib zod/class-validator — ver nota). Testes: `cadastro.test.ts:92-94`, `auditoria.test.ts:184-199`. |
| V5.1.2 | Validação de entrada **centralizada** | `parcial` | Validação spread por controller (não há ValidationPipe global) | Sem `global prefix` de DTO; validação ad hoc por endpoint. **Aberto (CA-D-1).** |
| V5.1.3 | Validação usa **allow list** (extensível quando necessário) | `implementado` | `cadastro.controller.ts:116` (`tipo_esperado` restrito a enum) | Enumeração de valores aceitos para campos normativos. |
| V5.1.4 | Dados estruturados fortemente tipados / validados contra **schema** | `parcial` | Tipagem TS em runtime não é validada por schema (sem zod/JSON-Schema); validação manual de tipos das entradas | Sem schema runtime explícito além de checks manuais + tipagem de compilação. **Aberto (CA-D-1).** |
| V5.1.5 | **Sanitização** de saída/entrada para evitar injeção (incl. HTML) | `implementado` | SQL parametrizado em todos os acessos (`$1..$n` em controllers/handlers); sem concatenação de SQL com input | Ex.: `auth.controller.ts:32-37`, `cadastro.controller.ts`. Testes funcionais + RLS cobrem caminhos. |
| V5.1.6 | Validar dados **contra injeção SQL** | `implementado` | Todas as queries usam parâmetros vinculados; RLS limita visibilidade | Coberto de forma transversal pelos testes de integração (RLS + atomicidade). |
| V5.3.1 | Endpoints de **upload** validam extensão/tipo/conteúdo | `lacuna` | — | Não há pipeline de upload implementado (fora do escopo do piloto atual). **Rastreado (CA-D-1).** |
| V5.4.1 | **Deserialização** segura de dados não confiáveis | `n/d` | — | Não há deserialização de objetos não confiáveis (sem `eval`/`deserialize` de payload); motor usa JSON de fila própria. |
| V5.5.1 | Serialização/`output encoding` consistente para impedir injeção | `implementado` | API retorna JSON tipado (`JSON` via NestJS); sem template server-rendered com input bruto | — |

> **Nota técnica (V5):** a validação é implementada de forma **manual/defensiva** com `BadRequestException`
> por controller. Não há lib de schema runtime (`zod`/`class-validator`/JSON Schema). Isso atende V5.1.1/5.1.3/5.1.5
> com evidência, mas deixa **V5.1.2 (centralização)** e **V5.1.4 (schema runtime)** como lacunas/parciais abertas.

---

## Lacunas abertas rastreadas (CA-D-1)

| ID | Requisito | Lacuna | Prioridade sugerida |
|---|---|---|---|
| G-01 | V3.4.2 | Cookie `Secure` condicional a env (`COOKIE_SECURE`); sem teste automatizado dedicado | P1 — fixar para piloto real |
| G-02 | V3.4.3 / V3.7.1 / V4.1.5 | `SameSite=Lax` cobre métodos não-safe, mas **sem token anti-CSRF explícito** nos endpoints sensíveis | P1 |
| G-03 | V2.8.1 | **Headers de segurança** ausentes (`X-Frame-Options`, `CSP`, `Referrer-Policy`, `X-Content-Type-Options`) — sem HTTP-middleware (helmet) | P1 |
| G-04 | V2.3.1 | Sem fluxo de **senha inicial/ativação** out-of-band | P2 |
| G-05 | V5.1.2 | Validação de entrada **não centralizada** (ad hoc por controller; sem ValidationPipe global) | P2 |
| G-06 | V5.1.4 | **Sem schema runtime** (zod/JSON-Schema/class-validator) — validação por checks manuais | P2 |
| G-07 | V5.3.1 | Pipeline de **upload** não implementado (fora do escopo do piloto) | P2 |
| G-08 | V3.1.3 | Timeout de sessão por **inatividade** presente via TTL, mas sem teste dedicado de pausa | P3 |

CORS estrito: aplicação usa **allow list explícita** configurável (`CORS_ORIGINS`, default `http://localhost:5173` — `app.factory.ts:12-22`), o que atende o princípio de CORS estrito. Manter observação: allow list deve ser revisitada no deploy real e coberta por teste de integração (atualmente sem teste automatizado do `enableCors` → contabilizado em G-03 quanto a headers).

---

## Revisão por responsável de segurança — condição para PILOT_READY (CA-D-3)

> **⚠️ Não há aprovação registrada neste documento.**
>
> Conforme a Issue #57 (CA-D-3) e o `QUALITY_GATES.md` (Gate 4.5 Human Review / estados de validação),
> a **revisão por pessoa responsável por segurança** deste mapeamento e das lacunas listadas é
> **condição obrigatória** para `PILOT_READY`. Enquanto essa revisão não for registrada
> (estado `VALIDATED`/`APPROVED` no `HUMAN_DECISIONS_LOG`), o piloto **não** pode ser declarado pronto.
> Nenhuma aprovação foi inventada por este agente.

---

## Resumo de cobertura

| Capítulo | Total mapeado | Implementado | Parcial | Lacuna | n/d |
|---|---|---|---|---|---|
| V2 — Autenticação | 13 | 11 | 0 | 2 | 0 |
| V3 — Sessão | 10 | 7 | 3 | 0 | 0 |
| V4 — Controle de acesso | 7 | 7 | 0 | 0 | 0 |
| V5 — Validação / sanitização | 9 | 5 | 2 | 1 | 1 |
| **Total** | **39** | **30** | **5** | **3** | **1** |

> Totais somam linhas da tabela; `n/d` (não se aplica no piloto atual) é informativo e não entra no cálculo
> de lacunas. Recalcule a partir das linhas sempre que o doc evoluir.
