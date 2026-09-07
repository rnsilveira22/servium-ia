# Personas Operacionais — Servium IA (MVP)

> **Fase 002 — Discovery do MVP**
> Personas preliminares, **sem nomes ou histórias pessoais inventadas**. Apenas papéis operacionais relevantes para o primeiro caso de uso (pendências documentais — ver [`MVP_DISCOVERY.md`](MVP_DISCOVERY.md)). Todas são hipóteses a validar em entrevistas.

## Sócio / Gestor do escritório

**Responsabilidades:**

- decide investimentos e adoção de ferramentas;
- responde pela qualidade e pelos prazos perante clientes e obrigações;
- acompanha resultados do escritório.

**Dores (hipótese):**

- custo operacional crescente com a carteira;
- prazos perdidos gerando multas e desgaste;
- dificuldade de enxergar gargalos operacionais.

**Interação com o Servium IA no MVP:**

- aprova a adoção e os limites de autonomia configurados;
- acompanha indicadores agregados (pendências em aberto, tempo economizado);
- não opera o dia a dia.

**Preocupações esperadas:** segurança dos dados dos clientes; risco de mensagens inadequadas aos clientes finais; retorno mensurável.

## Responsável pela rotina (contador / coordenador / operador)

> Em escritórios pequenos e médios, essas três denominações frequentemente se confundem em uma única pessoa que executa e supervisiona (**hipótese a validar**). No MVP, tratam-se como um único papel operacional.

**Responsabilidades:**

- executa as rotinas de obrigações (folha, fiscal, societário) da carteira;
- hoje, cobra e confere documentos dos clientes manualmente;
- conhece quais documentos cada cliente/obrigação exige.

**Dores (hipótese):**

- horas mensais gastas em cobrança repetitiva e conferência;
- interrupções constantes para "correr atrás" de pendências;
- descoberta tardia de itens faltantes perto do prazo.

**Interação com o Servium IA no MVP:**

- **usuário principal**: configura checklists por cliente/obrigação;
- supervisiona o Funcionário Digital: revisa exceções escaladas, aprova ações fora do padrão;
- recebe relatórios de ciclo e corrige classificações quando necessário.

**Preocupações esperadas:** perder controle sobre o que é enviado ao cliente final; precisar refazer trabalho mal feito; curva de aprendizado.

## Cliente final do escritório

**Responsabilidades:**

- fornecer documentos e informações ao escritório para cumprimento de obrigações.

**Dores (hipótese):**

- não sabe exatamente o que precisa enviar;
- recebe cobranças repetidas e mal organizadas por canais variados.

**Interação com o Servium IA no MVP:**

- **não acessa a plataforma**; recebe comunicações geradas pelo Funcionário Digital (dentro dos limites configurados pelo escritório) e responde com documentos;
- deve conseguir identificar que a mensagem representa o escritório.

**Preocupações esperadas:** clareza sobre o que está sendo pedido; privacidade dos documentos enviados; não receber spam.

## Papéis deliberadamente excluídos do MVP

- **Gerente/analista como usuários distintos** — funções absorvidas pelo papel "responsável pela rotina" neste contexto;
- **Equipe comercial/pré-vendas**, **TI interno** — sem papel no primeiro caso de uso;
- **Usuários de outros segmentos** — fora do vertical inicial.
