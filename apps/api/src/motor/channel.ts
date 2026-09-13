/**
 * ADR-008 · Porta de comunicação. O motor NÃO conhece SMTP/IMAP/#18; testes
 * usam FakeChannel. PRM-P0.1-E: mensagens de saída carregam token de correlação
 * e canais reais expõem as respostas para o runtime correlacionar (CA-06).
 *
 * B-2 · Contratos provider-agnósticos de comunicação:
 *   - `MensagemSaida` / `ResultadoEnvio`: envio (SAÍDA);
 *   - `MensagemRecebida` / `AnexoRecebido`: modelo genérico de RECEBIMENTO;
 *   - `Recebedor` + `ReceiveContext`: porta de recebimento (R1);
 *   - `EmailIntegration`: configuração persistida por tenant (R3);
 *   - `ProviderResolver`: resolução de provider por tenant (R2).
 *
 * O Core (motor/worker/jobs/regras) depende APENAS destas abstrações — nunca
 * de implementações concretas (Mailpit/Gmail/SMTP…).
 */
import type { Client } from 'pg';

export interface MensagemSaida {
  destinatario: string;
  assunto: string;
  corpo: string;
  idempotencyKey: string;
  /** PRM-P0.1-E · token que vincula a resposta do cliente ao item do ciclo. */
  tokenCorrelacao?: string;
}

export interface ResultadoEnvio {
  ok: boolean;
  messageId?: string;
  erro?: string;
}

/** Anexo de uma mensagem recebida (provider-agnóstico). */
export interface AnexoRecebido {
  filename?: string;
  mimeType?: string;
  /** Conteúdo decodificado em base64 quando disponível no provider. */
  data?: string;
  sizeBytes?: number;
}

/**
 * PRM-P0.1-E / B-2 R1 · mensagem recebida (resposta do cliente) vista pelo
 * runtime. Modelo GENÉRICO — nenhum campo exige o provider; particularidades
 * ficam em `metadata` (nunca no domínio).
 */
export interface MensagemRecebida {
  /** Provider de origem (ex.: 'gmail' | 'mailpit'). */
  provider: string;
  /** ID da mensagem NO provider (chave de idempotência do recebimento). */
  providerMessageId: string;
  /** ID de mensagem padronizado (ex.: Message-ID SMTP) quando disponível. */
  messageId?: string;
  /** ID da thread no provider (ex.: Gmail threadId). */
  threadId?: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  receivedAt: Date;
  /** PRM-P0.1-E · token de correlação `t:<item>:r<n>` extraído pelo adapter. */
  correlationToken?: string;
  attachments?: AnexoRecebido[];
  /** Metadados específicos do provider preservados SEM vazar para o domínio. */
  metadata?: Record<string, unknown>;
}

export interface CommunicationChannel {
  enviar(msg: MensagemSaida): Promise<ResultadoEnvio>;
  /** PRM-P0.1-E · canais reais expõem as respostas recebidas (opcional). */
  receberRespostas?(context?: ReceiveContext): Promise<MensagemRecebida[]>;
}

/** B-2 R1 · contexto do recebimento (provider-agnóstico, mínimo por tenant). */
export interface ReceiveContext {
  tenantId: string;
}

/**
 * B-2 R1 · porta de RECEBIMENTO. O runtime resolve a fonte pelo tenant e
 * chama `receber` — nunca uma função concreta (ex.: buscarMensagensDoMailpit).
 */
export interface Recebedor {
  receber(context: ReceiveContext): Promise<MensagemRecebida[]>;
}

/** B-2 R3 · providers suportados pela integração de e-mail por tenant. */
export type EmailProvider = 'gmail' | 'mailpit';

/**
 * B-2 R3 · configuração de integração de e-mail de um tenant. SEM segredos:
 * `credentialReference` é apenas uma referência (o segredo vive fora do core,
 * ex.: `gmail_tokens` isolado por RLS / futuro secret manager).
 */
export interface EmailIntegration {
  tenantId: string;
  provider: EmailProvider;
  senderEmail: string | null;
  mailboxEmail: string | null;
  authType: 'none' | 'oauth2';
  credentialReference: string | null;
  sendEnabled: boolean;
  receiveEnabled: boolean;
  status: string;
}

/** B-2 R2 · resultado da resolução de envio por tenant (canal + remetente). */
export interface CanalResolvido {
  canal: CommunicationChannel;
  remetente: string;
}

/**
 * B-2 R2 · resolução de provider por tenant. Implementações concretas vivem
 * no runtime (`runtime/provider-resolver.ts`) — nunca no domínio/motor.
 */
export interface ProviderResolver {
  /** Lê a integração de e-mail do tenant (via ctx tenanteado ou nova conexão). */
  obterIntegracao(tenantId: string, ctx?: Client): Promise<EmailIntegration | null>;
  /** Resolve o canal de ENVIO + remetente do tenant; null = usa fallback global. */
  resolverCanal(tenantId: string, ctx: Client): Promise<CanalResolvido | null>;
  /** Resolve a fonte de RECEBIMENTO do tenant; null = nada a receber. */
  resolverRecebedor(tenantId: string, ctx: Client): Promise<Recebedor | null>;
}

export class FakeChannel implements CommunicationChannel {
  enviadas: MensagemSaida[] = [];
  /** Injeta falha transitória para testar retry técnico sem tocar o cliente. */
  falharProximas = 0;
  /** PRM-P0.1-E · respostas simuladas devolvidas por receberRespostas(). */
  recebidas: MensagemRecebida[] = [];
  chamadasReceber = 0;

  async enviar(msg: MensagemSaida): Promise<ResultadoEnvio> {
    if (this.falharProximas > 0) {
      this.falharProximas--;
      return { ok: false, erro: 'smtp indisponível (fake)' };
    }
    this.enviadas.push(msg);
    return { ok: true, messageId: `fake-${this.enviadas.length}` };
  }

  async receberRespostas(context?: ReceiveContext): Promise<MensagemRecebida[]> {
    void context;
    this.chamadasReceber++;
    return [...this.recebidas];
  }
}