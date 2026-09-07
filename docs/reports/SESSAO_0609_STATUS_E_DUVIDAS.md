# ServiumAI — Estado consolidado da sessão (para passar ao ChatGPT)

**Data:** 06/09/2026 · **Repositório:** `rnsilveira22/servium` · **Papel:** Orchestrator (Software Factory V2)
**Git `main` (local = origin/main):** `69e0950`
**Projeto:** ServiumAI · **Piloto:** Innove Contabilidade · **MVP:** Assistente Digital de Pendências Documentais (Estagiária Digital)

---

## 1. O que está CONCLUÍDO nesta e nas últimas sessões

### 1.1 P0.2 — Auditoria (concluída e encerrada)

| Issue | Item | PR | Merge | Status |
|---|---|---|---|---|
| #51 | CA-04 leitura consultável | #76 `150188f` | L2 squash | ✅ DONE+MERGED, CLOSED |
| #52 | CA-03 atomicidade | #77 `8617afd` | L2 squash | ✅ DONE+MERGED, CLOSED |
| #53 | CA-05 doc `EVENTOS_AUDITORIA.md` | #78 `7efd68a` | L2 squash | ✅ DONE+MERGED, CLOSED |
| #9 | Encerramento formal P0.2 | #79 `53ed958` | humano | ✅ PR MERGED; **Issue #9 ainda OPEN** |

- Relatório: `docs/reports/P0_2_REMEDIATION_CLOSURE_REPORT.md`.

### 1.2 P0.3 — Hardening de segurança (HG-PR-SEC aprovado em 06/09)

| Issue | Item | PR | Merge | Status |
|---|---|---|---|---|
| #54 | Política de senha ASVS/NIST + `POST /auth/trocar-senha` (min 12/max 64, sem truncamento, reuso+blocklist, revoga sessões) | #80 `6313cab` | humano | ✅ DONE+MERGED, **CLOSED** |
| #55 | Rate-limit anti-automação no login (5 falhas/15min por conta, 30/5min por IP, anti-enumeração, env `LOGIN_RATE_LIMIT_*`, evento `login_block`) | #81 `69e0950` | L2 squash | ✅ DONE+MERGED, **CLOSED** |

- Verify verde em ambos; inventário de auditoria 15→**17 eventos**.
- Decisões versionadas: `docs/security/PASSWORD_POLICY.md`, `docs/security/RATE_LIMIT_POLICY.md`.

### 1.3 Regressão P0 — `nodemailer@10` (descoberta NESTA sessão)

| Issue | Item | PR | Merge | Status |
|---|---|---|---|---|
| #83 | Bump do dependabot (PR #75) quebrou build do `@servium/api` (TS2503: namespace `nodemailer.Transporter` removido em v10) — **main estava com CI vermelho** | #84 `7b96fd6` | L2 squash | ✅ **CLOSED**; main destravada |

- Causa mascarada por `node_modules` local **desatualizado** (6.10.1 vs lockfile 10.0.0); verifies locais passavam. Correção: `import type { Transporter }` direto do módulo (`apps/api/src/runtime/mailpit.ts`).

### 1.4 Especificação Oficial do MVP v1.0 + Fase 1/2 (novo item 1)

| Artefato | Local | PR | Status |
|---|---|---|---|
| Especificação Oficial do MVP v1.0 (experiência visual/UX/UI) | `docs/product/MVP_EXPERIENCE_SPEC_v1.md` | #82 | ⏳ **aguardando aprovação humana** (docs, L3) |
| Fase 1 — Auditoria da UI atual | `docs/reports/UI_EXPERIENCE_PHASE1_AUDIT.md` | #86 | ⏳ OPEN (aguarda revisão) |
| Fase 2 — Proposta de épico de experiência (E-01..E-08, 4 ondas) | `docs/reports/UI_EXPERIENCE_PHASE2_PROPOSAL.md` | #86 | ⏳ OPEN (proposta, aguarda Fase 3) |

### 1.5 Merge L2 registrados nesta sessão (REGISTRO DE AUTONOMIA)

- #84 `7b96fd6` (regressão nodemailer) · #81 `69e0950` (#55 rate-limit).
- Merges feitos pelo próprio Rodrigo (humano): #79 `53ed958`, #80 `6313cab`.
- `FACTORY_STATUS.md` reconciliado → PR **#85** (docs de status, OPEN).

---

## 2. DÚVIDAS / PENDÊNCIAS — para resolver no ChatGPT

### 2.1 Merge do PR #85 (docs de status)

- `#85` registra o encerramento do P0.3 + regressão no `FACTORY_STATUS.md`.
- **Pergunta:** merge L2 de docs é permitido pela minha política (AUTONOMY_POLICY.md linha 21 autoriza PR normal = L2, referência PR #78). **Executo o merge L2 do #85 eu mesmo, ou deixo para você?** Não estou 100% seguro se docs de status da factory contam como "PR normal" ou exigem L3.

### 2.2 Fase 1 → Fase 2 (Blueprints)

- A auditoria mostra que o gap é **todo no acabamento da experiência** (identidade da marca teal/navy NÃO aplicada — a UI usa azul `#2563eb`; zero gráficos/timeline/estados do agente/cartões de decisão; acessibilidade crítica; sem biblioteca de componentes; menu mobile inoperante).
- **Pergunta A:** Aprovo a auditoria (Fase 1, PR #86) e autorizo o **Blueprint UX/UI completo (Fase 2)**?
- **Pergunta B:** Para gráficos, escolho **criar componentes/gráficos internos (CSS vanilla, padrão atual)** ou **adotar lib (ex.: shadcn-ui + Recharts)**? Isso é decisão de ADR (L3) e pré-requisito para as entregas E-03/E-05 da proposta de épico.

### 2.3 Escopo do backend da experiência

- §14 (mapa de contexto) e §17 (auditoria compreensível) dependem de endpoints que **ainda não existem**: `GET /auditoria` (trilha de eventos, PRM-P0.2-A) e exceções globais por tenant (PRM-M-17, hoje `ExcecoesPage` faz N+1 requisições).
- **Pergunta:** incluo criação desse backend no épico de experiência, ou deixo **fora** do MVP e só mostro auditoria quando a API existir?

### 2.4 Escopo visual — dark mode e trilha

- **Pergunta A:** Dark mode **dentro** do escopo do MVP ou **pós-piloto**?
- **Pergunta B:** visualizar **trilha de auditoria dos eventos do agente** agora (criar endpoint) ou apenas quando PRM-P0.2-A entregar?

### 2.5 Sequenciamento da próxima onda de código

- Restam da P0.3: **#56** (identidade de serviço do Funcionário Digital, `actor_type=servico`) e **#57** (mapeamento ASVS 4.0.3 nível 1 + cobertura por testes).
- Na fila: **#73** (bug P0), **#72** (gap P1), **#58/#59** (backlog P2), **HG-RETENÇÃO** (política numérica de retenção de auditoria — DEFERRED).
- **Pergunta:** depois de resolver as dúvidas 2.2–2.4, **qual frente priorizo** — o épico de experiência (Fase 2/3) OU fechar a P0.3 (#56/#57) primeiro?

### 2.6 Governança/pendências humanas (L3) que dependem de você

| Item | Tipo |
|---|---|
| **Fechar Issue #9** (auditoria) — cobertura completa; corrigir drift do board (Done/P1 vs OPEN/P0) | decisão do Owner |
| **HG-RETENÇÃO** — definir prazo/volume de retenção de auditoria | decisão de produto |
| Merge #82 (spec MVP) e #86 (auditoria/proposta) | L3 |
| Autorizar Fase 3 (aprov. humana Blueprint) | L3 |

---

## 3. Estado atual dos PRs (abertos)

| PR | Branch | Conteúdo | CI | Aguarda |
|---|---|---|---|---|
| #82 | `docs/mvp-experience-spec` | Especificação MVP v1.0 | ✅ | sua revisão (L3) |
| #85 | `docs/p03-closure-records` | Status factory P0.3 | ✅ | decisão de merge |
| #86 | `docs/fase1-ux-audit` | Auditoria UI + proposta épico | ✅ | sua revisão (L3) |

## 4. Estado do board/backlog

- P0.1 ✅ · P0.2 ✅ · P0.3-A/B ✅ · P0.3-C (#56) OPEN · P0.3-D (#57) OPEN · experiência MVP ⏳ Fase 1 entregue / Fase 2 proposta
- Nada além de docs foi implementado nesta sessão (só P0.3-A/B + regressão + docs/spec).
