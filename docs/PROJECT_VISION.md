# Visão do Projeto — Servium IA

> **Status:** Fundação / Pré-MVP
> Este documento descreve intenções e hipóteses. Nada aqui representa funcionalidade implementada ou validada.

## Visão

O Servium IA existe para permitir que empresas mantenham uma **força de trabalho digital organizada**: funcionários digitais especializados, com funções definidas, ferramentas controladas, limites operacionais claros e supervisão humana, executando atividades operacionais e rotineiras que hoje consomem tempo de equipes humanas.

A proposta não é um chatbot nem uma coleção de automações isoladas. É uma plataforma na qual empresas organizam, supervisionam e auditam trabalho digital como parte da sua operação.

## Problema

Empresas — especialmente escritórios de contabilidade — acumulam trabalho:

- repetitivo e operacional;
- previsível e baseado em regras;
- dependente de múltiplos sistemas;
- sujeito a atrasos, retrabalho e erros manuais.

Consequências típicas:

- profissionais qualificados gastam tempo em tarefas de baixo valor agregado;
- custo operacional cresce com o volume, sem escala equivalente de qualidade;
- prazos recorrentes (obrigações, fechamentos) geram picos de sobrecarga;
- informações ficam dispersas entre sistemas, e-mails e mensagens.

## Proposta de valor

Para empresas com forte carga operacional, o Servium IA pretende oferecer funcionários digitais especializados que:

- executam rotinas e fluxos operacionais de ponta a ponta;
- interagem com sistemas e pessoas quando necessário;
- encaminham exceções para humanos em vez de improvisar;
- operam com permissões mínimas, histórico auditável e supervisão humana.

Enquanto isso, profissionais humanos permanecem responsáveis por decisões, exceções, relacionamento e atividades de maior valor.

## Mercado inicial

**Escritórios de contabilidade brasileiros.**

Motivos preliminares (hipóteses a validar):

- alta densidade de rotinas repetitivas e baseadas em regras;
- prazos e obrigações recorrentes e bem definidos;
- dor conhecida de mão de obra operacional;
- disposição a delegar trabalho operacional quando houver controle e segurança.

Este é o **vertical inicial**, não uma limitação estrutural: a arquitetura não deve acoplar permanentemente a plataforma ao setor contábil.

## Personas preliminares

Personas iniciais, sujeitas a validação na fase de discovery:

| Persona | Descrição | Interesse principal |
|---|---|---|
| Sócio/gestor do escritório | Decide sobre investimentos e processos | Reduzir custo operacional sem perder qualidade e controle |
| Contador/coordenador | Supervisiona execução das rotinas | Confiabilidade, visibilidade e tratamento correto de exceções |
| Operador/administrativo | Executa rotinas hoje | Menos trabalho repetitivo; clareza sobre o que foi feito pela IA |
| Cliente final do escritório | Recebe atendimento e documentos | Respostas rápidas e corretas |

## Conceito de funcionário digital

Definição preliminar: uma unidade de trabalho digital com identidade própria dentro da organização, podendo possuir:

- **função** — papel que exerce;
- **responsabilidades** — o que lhe é atribuído;
- **capacidades** — o que sabe fazer;
- **ferramentas** — sistemas e recursos que pode utilizar;
- **permissões** — o que tem autorização para acessar e executar;
- **contexto** — informações necessárias para sua atuação;
- **tarefas** — unidades de trabalho que executa;
- **limites operacionais** — onde deve parar e escalar;
- **supervisão** — como é monitorado e revisado;
- **histórico de execução** — registro auditável do que fez;
- **mecanismos de escalonamento** — como encaminha situações a humanos.

### Diferença para chatbot

Um chatbot responde conversas. Um funcionário digital:

- possui função e responsabilidades persistentes dentro da organização;
- executa tarefas e fluxos, não apenas diálogos;
- opera com permissões, limites e supervisão formais;
- produz histórico auditável e presta contas do que fez.

### Diferença para automação tradicional

Automação tradicional segue roteiros fixos e falha silenciosamente fora do script. Um funcionário digital:

- lida com variação e ambiguidade dentro dos seus limites declarados;
- reconhece quando não deve continuar e **escala explicitamente**;
- opera sob governança (permissões, auditoria, supervisão), não apenas sob gatilhos.

## Papel das pessoas

Humanos permanecem no controle:

- decidem o que os funcionários digitais podem fazer;
- aprovam ações críticas e tratam exceções;
- supervisionam resultados e corrigem rumos;
- permanecem responsáveis perante clientes e obrigações legais.

## Papel da IA

A IA atua como capacidade de execução dos funcionários digitais:

- interpreta solicitações, classifica demandas e executa rotinas;
- opera sempre dentro de permissões e limites definidos por humanos;
- registra o que fez e sinaliza incerteza, em vez de agir além do seguro.

## O que NÃO deve ser automatizado sem supervisão

Atividades que envolvam, por exemplo:

- decisões com impacto legal, fiscal ou financeiro relevante;
- envio de comunicações oficiais ou compromissos em nome do cliente;
- acesso ou alteração de dados sensíveis fora do mínimo necessário;
- situações ambíguas, fora do padrão ou sem regra clara;
- qualquer ação irreversível sem aprovação humana.

Esta lista é inicial e será detalhada na especificação do MVP.

## Visão de longo prazo

Que o Servium IA seja a forma padrão pela qual pequenas e médias empresas constroem sua força de trabalho digital: contratando funções digitais especializadas, organizadas e supervisionadas — começando pela contabilidade e evoluindo para outros segmentos.

## Limites iniciais

Nesta fase, deliberadamente **não** se define:

- stack tecnológica, arquitetura ou provedores;
- funcionalidades concretas do MVP;
- modelo comercial e preços;
- integrações específicas.

Ver [`roadmap/README.md`](roadmap/README.md).

## Hipóteses a validar

Estas são **hipóteses**, não fatos:

1. Escritórios contábeis confiarão trabalho operacional a funcionários digitais supervisionados.
2. Existe disposição a pagar por essa força de trabalho digital.
3. O primeiro caso de uso de maior valor pode ser identificado e entregue com escopo reduzido.
4. Supervisão humana + escalonamento explícito são suficientes para operação segura no vertical inicial.
5. A plataforma pode ser generalizada para outros segmentos sem reescrita.
6. Requisitos regulatórios (LGPD, sigilo fiscal contábil) podem ser atendidos com a arquitetura escolhida na Fase 2.
