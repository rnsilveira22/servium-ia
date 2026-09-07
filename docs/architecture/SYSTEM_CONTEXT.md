# System Context — Servium IA MVP

> **Fase 003 — Arquitetura do MVP** · Visão inspirada em C4 — nível **System Context**: o Servium IA como um todo, seus usuários e sistemas externos.

## Diagrama

```mermaid
flowchart LR
    subgraph Usuários
        R["Responsável pela rotina<br/>(contador/coordenador/operador)"]
        G["Sócio/Gestor"]
    end
    subgraph Escritório contábil
        R
        G
    end
    CF["Cliente final do escritório"]

    S["Servium IA<br/>Assistente Digital de<br/>Pendências Documentais"]

    CH["Canal de comunicação<br/>(provedor de e-mail;<br/>outros canais futuros)"]
    ST["Armazenamento documental<br/>(object storage)"]
    IA["Provedor de IA/LLM<br/>(futuro, opcional)"]

    R -->|"configura, supervisiona,<br/>decide exceções"| S
    G -->|"acompanha indicadores"| S
    S -->|"cobranças dentro dos limites"| CH
    CH -->|"respostas e documentos"| S
    CF -.->|"recebe/envia via canal"| CH
    S -->|"arquivos"| ST
    S -.->|"funções assistivas"| IA
```

## Atores e sistemas

| Elemento | Tipo | Interação com o Servium IA |
|---|---|---|
| Responsável pela rotina | Pessoa (usuária principal) | Configura checklists/templates/limites; ativa ciclos; trata exceções; acompanha painel |
| Sócio/Gestor | Pessoa | Aprova adoção e limites; acompanha indicadores agregados |
| Cliente final do escritório | Pessoa externa | Não acessa a plataforma; troca mensagens/documentos **via canal de comunicação** |
| Canal de comunicação | Sistema externo | Entrega cobranças; recebe respostas/anexos. Provedor específico ainda a validar (hipótese: e-mail) |
| Armazenamento documental | Sistema externo | Guarda conteúdo dos documentos com integridade e ciclo de vida |
| Provedor de IA/LLM | Sistema externo futuro | Apenas funções assistivas delimitadas ([`AI_USAGE_BOUNDARIES.md`](AI_USAGE_BOUNDARIES.md)); ausência não inviabiliza o MVP |

## Premissas do contexto

- O cliente final **nunca** é usuário direto da plataforma no MVP;
- Nenhum portal governamental ou ERP é integrado nesta fase (Out of Scope);
- O escritório piloto é representado por exatamente um tenant ativo.
