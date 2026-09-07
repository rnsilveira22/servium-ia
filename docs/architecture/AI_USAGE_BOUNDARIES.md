# AI Usage Boundaries — Servium IA MVP

> **Fase 003 — Arquitetura do MVP**
> Pergunta central: *o primeiro Funcionário Digital realmente precisa de LLM em todas as etapas?* **Não.** Este documento classifica cada função do MVP e delimita onde IA agrega valor — princípio: **não usar LLM onde uma regra determinística é suficiente** (ADRV-013, ADR-010).

## Classificação das funções

| Função do MVP | Determinístico | Automação tradicional | IA/ML potencial | LLM potencial | Humano obrigatório |
|---|:---:|:---:|:---:|:---:|:---:|
| Identificar itens pendentes por checklist | ✅ | | | | |
| Agendar cobranças (janela/intervalo) | ✅ | | | | |
| Aplicar limites de autonomia (`max_attempts` etc.) | ✅ | | | | |
| Renderizar/enviar mensagem a partir de template aprovado | ✅ | | | | |
| Registrar respostas e associar ao item (regra clara) | ✅ | | | | |
| Validação básica de documento (tipo/tamanho/hash) | ✅ | | | | |
| Máquina de estados e retries | ✅ | | | | |
| Relatórios e métricas | ✅ | | | | |
| Trilha de auditoria | ✅ | | | | |
| Correspondência doc↔item ambígua (nome/tipo não óbvios) | | | ✅ heurísticas | ✅ sugestão | revisão final |
| Interpretar resposta livre do cliente ("vou enviar semana que vem") | | | | ✅ classificação sugerida | exceções → humano |
| Aprovar envio fora dos limites | | | | | ✅ sempre |
| Resolver exceções escaladas | | | | | ✅ sempre |
| Ativar ciclo / alterar limites/templates | | | | | ✅ sempre |

Legenda: ✅ = responsável primário pela função.

## Onde IA NÃO deve ser usada

1. **Decisão de envio** — se/quando/quem receber cobrança é regra + limite configurado; nunca inferido por modelo;
2. **Alteração de limites/templates/checklists** — configuração é humana;
3. **Validação conclusiva de documentos** — veredito final é regra verificável ou humano;
4. **Geração livre de mensagens** — apenas templates aprovados pelo escritório;
5. **Auditoria e relatórios** — registros são fatos, não interpretações;
6. **Qualquer ação irreversível** — comunicação enviada, exclusão, configuração.

## Regras para o uso assistivo de LLM (quando validado)

- Saída é **sugestão classificatória**, nunca veredito conclusivo nem gatilho direto de ação;
- Conteúdo do cliente tratado como **dado**, jamais como instrução (prompt injection);
- Prompt + versão do modelo registrados na trilha de auditoria (reprodutibilidade);
- Provedor atrás de porta própria (`LLMProvider`), trocável; dados mínimos enviados (LGPD);
- Amostragem humana periódica mede taxa de erro da sugestão (M-05).

## Riscos monitorados

Alucinação (mitigado: saída não-conclusiva) · custo (ADRV-008/M-11) · latência (fora do caminho interativo) · privacidade (mínimo necessário) · disponibilidade (degradação = escalar para humano) · vendor lock-in (porta abstrata) · rastreabilidade/reprodutibilidade (registro de versões).
