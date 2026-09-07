# Glossário — Servium IA

> Vocabulário oficial do projeto. Os termos representam **conceitos de domínio**, não necessariamente entidades de banco de dados, classes ou tabelas. Definições são preliminares e evoluirão com a especificação do MVP.

| Termo | Definição preliminar |
|---|---|
| **Servium IA** | Plataforma B2B de funcionários digitais especializados. Marca comercial do produto. |
| **servium** | Nome técnico do projeto/repositório. |
| **Tenant** | Cliente da plataforma. Unidade de isolamento lógico de dados e configuração. |
| **Organização** | Empresa cliente dentro da plataforma; corresponde, na prática, a um tenant (distinção formal será definida na especificação). |
| **Usuário** | Pessoa que acessa a plataforma em nome de uma organização (ex.: sócio, contador, operador). |
| **Funcionário Digital** | Unidade de trabalho digital com função, responsabilidades, capacidades, ferramentas, permissões, limites e supervisão, que executa tarefas sob governança humana. Não é apenas um chatbot. |
| **Função** | Papel exercido por um funcionário digital (ex.: primeiro atendimento, classificação de solicitações, rotinas contábeis). |
| **Capacidade** | Aquilo que um funcionário digital sabe fazer dentro de sua função. |
| **Ferramenta** | Sistema ou recurso que um funcionário digital pode utilizar para executar seu trabalho (ex.: consulta a sistema externo, emissão de documento). |
| **Permissão** | Autorização explícita que define o que um funcionário digital pode acessar ou executar. Princípio: menor privilégio. |
| **Tarefa** | Unidade de trabalho atribuída a um funcionário digital, com objetivo verificável. |
| **Execução** | Ocorrência registrada de uma tarefa realizada por um funcionário digital, com entradas, passos e resultado auditáveis. |
| **Workflow** | Sequência definida de etapas e condições pelas quais tarefas fluem, incluindo pontos de aprovação e escalonamento. |
| **Exceção** | Situação fora do padrão previsto em que o funcionário digital não deve prosseguir por conta própria. |
| **Escalonamento** | Encaminhamento explícito de uma exceção ou decisão crítica para uma pessoa ou fluxo humano apropriado. |
| **Supervisão Humana** | Conjunto de mecanismos pelos quais pessoas monitoram, revisam e aprovam o trabalho dos funcionários digitais. |
| **Auditoria** | Registro consultável que permite reconstruir execuções e ações relevantes posteriormente. |
| **Integração** | Conexão controlada entre a plataforma e sistemas externos, sempre sujeita a permissões e auditoria. |

## Termos relacionados

- **ADR** (Architecture Decision Record) — registro documentado de uma decisão arquitetural. Ver [`decisions/README.md`](decisions/README.md).
- **MVP** — Minimum Viable Product; primeira versão do produto com valor validável.
- **LGPD** — Lei Geral de Proteção de Dados (Lei nº 13.709/2018), aplicável ao tratamento de dados pessoais no Brasil.
