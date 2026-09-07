# ServiumAI — Especificação Oficial do MVP

**Versão:** 1.0 · **Status:** Proposta para aprovação humana
**Produto:** ServiumAI · **Primeiro Funcionário Digital:** Estagiária Digital
**MVP:** Assistente Digital de Pendências Documentais · **Piloto:** Innove Contabilidade

---

## 1. Objetivo do documento

Este documento define a experiência que o MVP do ServiumAI deve entregar ao usuário, incluindo: experiência funcional; experiência visual; UX/UI; interação com o Funcionário Digital; visualização de atividades; indicadores e gráficos; animações e microinterações; transparência das decisões; mapa de conhecimento e evidências; segurança percebida; controle humano; auditoria; critérios de aceitação da experiência.

Este documento **não substitui os ADRs, requisitos funcionais, requisitos não funcionais ou documentos de arquitetura existentes**. Ele define principalmente **como o MVP deve se apresentar e ser percebido pelo usuário**.

---

## 2. Visão do MVP

O ServiumAI não deve ser percebido como *"um sistema administrativo com inteligência artificial"*, mas como **"um ambiente onde Funcionários Digitais trabalham para a empresa"**. O usuário deve perceber rapidamente: o que está acontecendo; o que o Funcionário Digital está fazendo; o que já foi concluído; o que está pendente; o que precisa da atenção humana; por que determinada conclusão foi alcançada; quais informações fundamentaram uma ação; quais ações foram executadas; que existe controle e rastreabilidade.

---

## 3. Primeiro Funcionário Digital

**Estagiária Digital** — Assistente Digital de Pendências Documentais. Responsabilidade no MVP: acompanhar clientes e obrigações do processo de coleta documental, identificando pendências, realizando ações automatizadas previstas nas regras e encaminhando situações que exigem intervenção humana. **Princípio:** a Estagiária Digital deve parecer um funcionário trabalhando, e não apenas um chatbot respondendo perguntas.

---

## 4. Princípios da experiência

1. **Intuitividade** — compreensão sem treinamento extenso; reduzir carga cognitiva; priorizar informação; linguagem operacional clara; evitar excesso de opções; próximos passos evidentes.
2. **Profissionalismo** — primeira impressão de produto SaaS profissional: tecnologia, confiabilidade, organização, maturidade, segurança. Deve parecer produto comercial, não PoC.
3. **Inteligência percebida** — demonstrar visualmente que o sistema analisa, processa, acompanha, identifica situações, executa tarefas, aguarda respostas e solicita intervenção. Inteligência pelo **comportamento do produto**, não por elementos gráficos futuristas.
4. **Automação percebida** — visualizar o trabalho realizado: cobranças enviadas, documentos recebidos/processados, pendências resolvidas, clientes acompanhados, exceções identificadas.
5. **Segurança e controle** — comunicar que **o agente trabalha, mas o humano continua no controle**; ações sensíveis/situações fora da autonomia são decisões que requerem intervenção humana.

---

## 5. Dashboard do MVP

Tela principal de percepção do produto — responde a *"Como está o trabalho da minha Funcionária Digital?"*.

**5.1 Identidade do agente** — apresentar: Estagiária Digital · Assistente de Pendências Documentais · Status ``● Trabalhando normalmente``; indicação da atividade atual (ex.: "Analisando pendências dos clientes..." / "Processando novos documentos..." / "Aguardando respostas de clientes...").

---

## 6. Indicadores operacionais

Clientes acompanhados · cobranças realizadas · documentos recebidos · documentos processados · pendências abertas · pendências resolvidas · exceções · ações aguardando aprovação. Hierarquia visual clara.

---

## 7. Barras de progresso e status

Comunicar evolução operacional (ex.: *Ciclo mensal — 37 de 45 clientes processados, 82% concluído*; *Resolução de pendências — 78% resolvido*). Animações suaves na mudança de estado; a animação deve comunicar progresso real.

---

## 8. Gráficos

Evolução das pendências; evolução dos documentos recebidos; volume de atividades; clientes processados; taxa de resolução; evolução do ciclo. Devem ser simples, elegantes, legíveis, responsivos e orientados à decisão — **sem gráficos apenas para preencher espaço**.

---

## 9. Timeline de atividades

Histórico recente (ex.: `09:42 ✓ Documento recebido · 09:41 ✓ Cliente identificado · 09:41 ✓ Documento associado à obrigação · 09:40 ✓ Pendência atualizada · 09:38 → Nova resposta recebida`). Novas atividades com transição visual discreta. Reforça: *"O agente está trabalhando."*

---

## 10. Estados vivos do agente

Trabalhando · Analisando · Processando · Aguardando resposta · Aguardando aprovação · Atenção necessária · Concluído · Erro · Operação normal. Cada estado com comportamento visual próprio.

---

## 11. Motion Design

**Princípio:** animação comunica informação (não decoração). Exemplos: agente trabalhando (movimento contínuo sutil); processamento; documento recebido (entrada visual); pendência resolvida (transição); nova exceção (destaque controlado); aprovação humana (mudança clara de estado); conclusão (feedback positivo discreto). **Regras:** suaves, rápidas, com propósito, sem prejuízo de produtividade/distração, respeitando acessibilidade, funcionando em diferentes dispositivos, sem comprometer performance. Sofisticado, não exageradamente futurista.

---

## 12. Interação com o Funcionário Digital

Supervisionar a Estagiária Digital. A experiência deve responder: O que ela está fazendo? O que já fez? O que encontrou? O que concluiu? O que pretende fazer? O que precisa de mim?

---

## 13. Cartões de decisão

Situações que exigem intervenção humana apresentadas estruturadamente: situação · evidências · recomendação · consequência · ação disponível ao humano (ex.: situação "segunda solicitação enviada há 3 dias sem resposta" → recomendação "realizar terceira tentativa" → ações *Aprovar / Ver detalhes / Não realizar*).

---

## 14. Mapa de conhecimento e contexto

Experiência visual de **como uma resposta/decisão foi fundamentada**: contexto + evidências + regras aplicadas + resultado (não cadeia de pensamento privada). Estrutura: ESTAGIÁRIA DIGITAL → CLIENTE ‖ OBRIGAÇÃO → regras aplicadas → conclusão → ação sugerida (cadastro/histórico · período/documentos).

---

## 15. Camadas de explicação

Três níveis: **Nível 1 Resultado** (ex.: "Pendência identificada") · **Nível 2 Evidências** (documento não localizado, obrigação relacionada, período, histórico da comunicação, prazo) · **Nível 3 Regras/contexto** (regra aplicada, condição identificada, resultado produzido). Transparência sem expor raciocínio interno.

---

## 16. Segurança visual

Transmitir segurança pela experiência: operação normal (● Ambiente protegido); auditoria ("Todas as ações do agente são registradas."); aprovação ("Esta ação requer aprovação humana."); permissões (quando a ação depende da autorização do usuário).

---

## 17. Auditoria

Toda atividade relevante com rastreabilidade: quando ocorreu · qual agente · qual cliente · qual objeto · qual ação · qual resultado · se houve intervenção humana. Apresentada de forma compreensível para o usuário operacional, não apenas como log técnico.

---

## 18. Navegação principal

Refletir o trabalho do usuário: Dashboard · Clientes · Obrigações · Ciclos · Pendências · Exceções · Atividades do agente · Auditoria. Evitar complexidade desnecessária.

---

## 19. Experiência visual

**Premium** (acabamento SaaS moderno) · **Limpa** (espaço visual suficiente, baixa poluição) · **Tecnológica** (contemporânea sem excesso futurista) · **Humana** (compreensão rápida) · **Viva** (atividade por estados, transições, indicadores e animações).

---

## 20. Responsividade

Funcionar em desktop, notebook, tablet e diferentes resoluções. Experiência principal otimizada para o ambiente de escritórios contábeis.

---

## 21. Acessibilidade

Animações/elementos visuais não podem ser a única forma de comunicação. Informações também por texto, ícones, estados, labels, contraste adequado, feedback acessível. Consideração para redução de movimento quando suportado.

---

## 22. Performance

O acabamento não compromete a operação: carregar rápido, evitar processamento desnecessário, não bloquear a interface, funcionar adequadamente durante atualizações de dados.

---

## 23. O que o MVP NÃO deve fazer

Parecer um chatbot genérico; depender de tela de conversa como experiência principal; animações sem propósito; gráficos sem valor operacional; esconder ações importantes atrás de excesso de navegação; apresentar decisões da IA como autoridade absoluta; permitir que o agente altere autonomamente regras críticas; expor cadeia de pensamento privada; experiência excessivamente futurista; sacrificar usabilidade em favor de estética.

---

## 24. Critério de sucesso da experiência

Um usuário da Innove deve compreender, sem explicação técnica: quem está trabalhando (Estagiária Digital); o que ela faz (acompanha clientes e pendências documentais); quanto já fez (indicadores, gráficos, progresso); o que aconteceu recentemente (timeline); existe algum problema (exceções e alertas); ela precisa de mim (solicitações de aprovação); por que chegou à conclusão (contexto, evidências e regras); posso confiar (auditoria, controle e rastreabilidade).

---

## 25. Critério de percepção comercial

Quatro percepções: "É bonito." · "É fácil de usar." · "Realmente parece que existe uma pessoa trabalhando aqui." · "Eu consigo acompanhar e controlar o que ela faz."

---

## 26. Critério de aprovação visual

Visualmente pronto quando: identidade consistente; navegação clara; Dashboard profissional; estados do agente claros; indicadores compreensíveis; gráficos adequados; barras de progresso funcionando; timeline clara; animações funcionando; experiência de exceções clara; experiência de aprovação clara; contexto/evidências acessíveis; auditoria compreensível; sem elementos visuais provisórios; experiência completa demonstrável de ponta a ponta.

---

## 27. Relação com os Human Gates

A implementação não elimina os Human Gates existentes; a experiência visual passa a fazer parte da validação. Sequência: Reconciliação → Implementação/ajustes → Validação funcional → LOCAL_ACCEPTANCE → Demo Run visível → Validação visual → `HUMAN_GATE_DEMO_FACTORY` → Demo/Vídeo. O MVP não é considerado comercialmente pronto apenas por build/testes/CI verdes — qualidade funcional e de experiência são validadas separadamente.

---

## 28. Estratégia de implementação

- **Fase 1 — Auditoria:** analisar a interface atual (o que existe, o que aproveitar, inconsistências, problemas de UX/visuais, estados ausentes, componentes necessários, limitações técnicas).
- **Fase 2 — Blueprint UX/UI:** proposta completa (arquitetura de informação, navegação, Dashboard, componentes, estados, gráficos, barras, timeline, Agent Experience, mapa de contexto, decisões, aprovações, auditoria, motion design).
- **Fase 3 — Aprovação humana:** Rodrigo aprova ou solicita alterações no blueprint. **Nenhuma implementação visual significativa é considerada aprovada antes dessa etapa.**
- **Fase 4 — Implementação:** implementar o blueprint aprovado no MVP existente.
- **Fase 5 — Validação:** testes funcionais, E2E, validação visual, Demo Run, revisão de UX/responsividade/performance.
- **Fase 6 — Human Gate:** submeter o resultado aos Gates aplicáveis.

---

## 29. Princípio final

Mudança de paradigma: SOFTWARE → AUTOMATIZAÇÃO → INTELIGÊNCIA → FUNCIONÁRIO DIGITAL → TRABALHO VISÍVEL → HUMANO NO CONTROLE. O usuário não apenas recebe o resultado da automação — ele vê, compreende e supervisiona o trabalho do Funcionário Digital.

---

## 30. Definição de pronto

Pronto para apresentação ao piloto quando: **a Estagiária Digital estiver funcionalmente operacional e sua experiência visual transmitir profissionalismo, inteligência, automação, segurança e controle humano de maneira clara, intuitiva e consistente.**

---

**Status deste documento:** aguardando aprovação humana.
