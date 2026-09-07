# Riscos e Hipóteses — Servium IA MVP

> **Fase 002 — Discovery do MVP**
> Dois registros distintos: **hipóteses** (HYP) — premissas que precisam de evidência; **riscos** (RSK) — eventos que podem comprometer o MVP. IDs estáveis.

## Hipóteses

### HYP-001 — A dor é relevante e prioritária

- **Hipótese:** a cobrança/conferência de pendências documentais consome tempo significativo e está entre as dores operacionais prioritárias dos escritórios-alvo.
- **Evidência atual:** conhecimento setorial geral; nenhuma entrevista realizada.
- **Nível de confiança:** médio.
- **Risco se estiver errada:** MVP construído sobre problema inexistente ou marginal.
- **Validação:** entrevistas (perguntas sobre processo atual e tempo gasto) + medição de baseline no piloto.

### HYP-002 — Escritórios delegam a cobrança ao digital

- **Hipótese:** escritórios aceitam que um Funcionário Digital supervisionado envie cobranças aos seus clientes finais, desde que com templates aprovados e limites claros.
- **Evidência atual:** nenhuma.
- **Nível de confiança:** médio/baixo.
- **Risco se estiver errada:** adoção travada por desconfiança; produto percebido como risco reputacional.
- **Validação:** perguntas diretas de delegação nas entrevistas ("qual parte você jamais delegaria?"); comportamento real no piloto.

### HYP-003 — Clientes finais respondem bem

- **Hipótese:** clientes finais respondem positivamente a cobranças digitais consistentes, educadas e identificadas, sem dano ao relacionamento.
- **Evidência atual:** nenhuma.
- **Nível de confiança:** médio.
- **Risco se estiver errada:** reclamações, perda de clientes pelo escritório, interrupção do piloto.
- **Validação:** taxa de resposta M-09, reclamações registradas, feedback qualitativo nos primeiros ciclos.

### HYP-004 — Checklists são padronizáveis

- **Hipótese:** escritórios conseguem formalizar checklists de documentos por cliente/obrigação com esforço razoável (dias, não meses).
- **Evidência atual:** nenhuma.
- **Nível de confiança:** médio.
- **Risco se estiver errada:** configuração inicial inviabiliza o piloto ou exige serviço profissional caro.
- **Validação:** exercício prático de configuração durante onboarding do piloto; medir esforço real.

### HYP-005 — E-mail é canal suficiente no piloto

- **Hipótese:** os clientes finais respondem por e-mail com documentos anexados de forma utilizável.
- **Evidência atual:** nenhuma.
- **Nível de confiança:** médio/baixo (uso forte de WhatsApp no Brasil pode reduzir aderência).
- **Risco se estiver errada:** taxa de resposta baixa; necessidade antecipada de WhatsApp (custo/complexidade).
- **Validação:** perguntas de canal nas entrevistas; taxa de resposta no piloto.

### HYP-006 — Nenhum software existente resolve bem

- **Hipótese:** as ferramentas que o escritório já usa (ERP contábil etc.) não resolvem adequadamente a cobrança ativa de pendências.
- **Evidência atual:** nenhuma.
- **Nível de confiança:** médio.
- **Risco se estiver errada:** valor incremental insuficiente frente a ferramenta já paga.
- **Validação:** inventário de softwares nas entrevistas; teste prático do que o ERP já oferece.

### HYP-007 — O valor sustenta modelo comercial

- **Hipótese:** tempo economizado + pontualidade ganha sustentam precificação viável (**modelo comercial fora do escopo desta fase**).
- **Evidência atual:** nenhuma.
- **Nível de confiança:** baixo.
- **Risco se estiver errada:** produto sem viabilidade econômica mesmo funcionando tecnicamente.
- **Validação:** pós-piloto: disposição a pagar declarada e demonstrada (M-01, M-11 + conversa comercial).

### HYP-008 — Política de tentativas: 3 é ponto de partida adequado

- **Hipótese:** um máximo de 3 tentativas de cobrança por item/ciclo equilibra persistência e bom relacionamento antes do escalonamento humano.
- **Evidência atual:** nenhuma; valor escolhido como hipótese conservadora de configuração inicial (`max_attempts = 3`), não como regra do domínio.
- **Nível de confiança:** baixo/médio.
- **Risco se estiver errada:** menos tentativas desperdiçam recebíveis fáceis; mais tentativas irritam clientes finais (ver RSK-002).
- **Validação:** observar taxas de resposta por número de tentativa nos ciclos do piloto e ajustar a configuração; diferentes rotinas poderão ter políticas diferentes no futuro.

## Riscos

| ID | Descrição | Prob. | Impacto | Mitigação | Responsável futuro | Status |
|---|---|---|---|---|---|---|
| RSK-001 | Escritórios não confiam em delegar contato com clientes finais | Média | Alto | Templates aprovados, limites conservadores, primeiro ciclo com revisão humana de todas as mensagens | Product Owner | Aberto |
| RSK-002 | Mensagens inadequadas/repetitivas irritam clientes finais | Média | Alto | Limites rígidos de frequência, janela comercial, monitoramento de reclamações (M-09), kill switch por cliente | Product Owner | Aberto |
| RSK-003 | Documentos recebidos errados aceitos como válidos | Média | Médio | Validação básica obrigatória (FR-009), exceção em caso de dúvida, amostragem humana periódica | Engenharia | Aberto |
| RSK-004 | Dados pessoais expostos ou tratados fora da LGPD | Baixa/Média | Alto | Mínimo necessário, isolamento por tenant (NFR-001), retenção definida (NFR-005), revisão jurídica pré-piloto | Jurídico/DPO | Aberto |
| RSK-005 | Canal de comunicação (provedor de e-mail) impõe limites/bloqueios para envios automatizados | Média | Médio | Canal definitivo ainda a validar; decisão arquitetural documentada após evidência de produto; volume controlado | Arquitetura | Aberto |
| RSK-006 | Checklists do piloto difíceis de formalizar (HYP-004 falha) | Média | Alto | Onboarding assistido, começar com 1–2 obrigações simples (ex.: folha), expandir depois | Product Owner | Aberto |
| RSK-007 | ERP/software existente do escritório já resolve a dor (HYP-006 falha) | Média | Alto | Inventário de softwares nas entrevistas antes de construir | Product Owner | Aberto |
| RSK-008 | Excesso de autonomia causa incidente de confiança irreversível | Baixa | Alto | Padrão conservador, aprovação humana em pontos formais, auditoria completa, kill switch global | Engenharia | Aberto |
| RSK-009 | Custos de comunicação/IA inviabilizam economia percebida | Baixa/Média | Médio | Medição desde o primeiro dia (M-11, NFR-015); arquitetura consciente de custo na Fase 003 | Arquitetura | Aberto |
| RSK-010 | Dependência de pessoas-chave do escritório piloto (rotatividade) | Média | Médio | Configuração documentada na plataforma, não na cabeça das pessoas; material de onboarding | Product Owner | Aberto |
| RSK-011 | Baseline revela dor menor que a hipótese (HYP-001 falha) | Média | Alto | Tratar como resultado válido: pivotar rotina alvo (RC-02/RC-04) antes de construir | Product Owner | Aberto |
| RSK-012 | Confiabilidade insuficiente gera retrabalho maior que o economizado | Baixa/Média | Alto | Idempotência (NFR-008), tolerância a falhas (NFR-009), métricas M-05/M-06/M-10 desde o início | Engenharia | Aberto |

> Riscos de "mudança de layout de portais" e "integrações fiscais" não se aplicam diretamente a este MVP (fora do escopo — ver [`MVP_SCOPE.md`](MVP_SCOPE.md)); tornam-se relevantes para Funcionários Digitais futuros (RC-07/RC-08).
