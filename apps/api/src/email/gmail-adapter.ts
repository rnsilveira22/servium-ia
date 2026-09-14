/**
 * SRV-18 / B-2 · Adapter Gmail API + OAuth 2.0 (ADR-008 CommunicationChannel +
 * B-2 R1 Recebedor). Adapter concreto; core do motor não conhece Gmail —
 * acoplamento via injeção/resolução por tenant.
 *
 * Idempotência ENVIO: message_id persistido antes do return; duplicatas rejeitadas.
 * Idempotência RECEBIMENTO: resolvida na camada de correlação (providerMessageId);
 * este adapter NÃO grava mensagens — apenas normaliza para `MensagemRecebida`.
 * Retry: backoff exponencial para erros 429/5xx; timeout global por chamada.
 */
import { google, gmail_v1 } from 'googleapis';
import type { Client } from 'pg';

import type {
  CommunicationChannel,
  MensagemRecebida,
  MensagemSaida,
  Recebedor,
  ReceiveContext,
  ResultadoEnvio,
} from '../motor/channel';

const SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const DEFAULT_TIMEOUT_MS = 15_000;
const TOKEN_RE = /Identificador:\s*(t:[0-9a-f-]{36}:r\d+)/i;
const TOKEN_FORMAT_RE = /^t:[0-9a-f-]{36}:r\d+$/i;

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** B-2 · lê a config OAuth do ambiente; null quando credencial não provisionada. */
export function buildGmailConfigFromEnv(env: NodeJS.ProcessEnv = process.env): GmailConfig | null {
  const clientId = env.GMAIL_CLIENT_ID;
  const clientSecret = env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: env.GMAIL_REDIRECT_URI ?? 'http://localhost:3000/auth/gmail/callback',
  };
}

/** Tipo injetável do cliente Gmail (testes usam fake — nunca rede Google). */
export type GetGmailClient = () => Promise<gmail_v1.Gmail>;

function buildOAuth2(cfg: GmailConfig) {
  return new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
}

export function buildAuthUrl(cfg: GmailConfig, state: string): string {
  const oauth2 = buildOAuth2(cfg);
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
}

export async function exchangeCode(
  cfg: GmailConfig,
  code: string,
  ctx: Client,
  tenantId: string
): Promise<{ email: string }> {
  const oauth2 = buildOAuth2(cfg);
  const { tokens } = await oauth2.getToken(code);
  const ticket = await oauth2.verifyIdToken({ idToken: tokens.id_token! });
  const email = ticket.getPayload()!.email!;

  await ctx.query(
    `INSERT INTO gmail_tokens (tenant_id, user_email, access_token, refresh_token, scopes, expires_at)
     VALUES ($1,$2,$3,$4,$5,to_timestamp($6))
     ON CONFLICT (tenant_id, user_email) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       scopes = EXCLUDED.scopes,
       expires_at = EXCLUDED.expires_at,
       atualizado_em = now()`,
    [tenantId, email, tokens.access_token!, tokens.refresh_token!, SCOPES, tokens.expiry_date! / 1000]
  );
  return { email };
}

async function getValidClient(ctx: Client, tenantId: string, cfg: GmailConfig): Promise<gmail_v1.Gmail> {
  const { rows } = await ctx.query<{
    access_token: string;
    refresh_token: string;
    expires_at: Date;
  }>('SELECT access_token, refresh_token, expires_at FROM gmail_tokens WHERE tenant_id=$1 LIMIT 1', [tenantId]);
  if (rows.length === 0) throw new Error('nenhum token Gmail configurado para este tenant');

  const row = rows[0]!;
  const oauth2 = buildOAuth2(cfg);
  oauth2.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
  });

  // refresh automático se expirado (B-2: erros de refresh NUNCA logam tokens)
  if (row.expires_at.getTime() < Date.now() + 60_000) {
    const refreshRes = await oauth2.refreshAccessToken();
    const newAccessToken = refreshRes.credentials.access_token ?? '';
    const newExpiry = (refreshRes.credentials.expiry_date ?? Date.now()) / 1000;
    await ctx.query(
      'UPDATE gmail_tokens SET access_token=$2, expires_at=to_timestamp($3), atualizado_em=now() WHERE tenant_id=$1',
      [tenantId, newAccessToken, newExpiry]
    );
    oauth2.setCredentials({ access_token: newAccessToken, refresh_token: row.refresh_token });
  }

  return google.gmail({ version: 'v1', auth: oauth2 });
}

/** Tempo limite global em torno de uma chamada à API (evita poller trava). */
async function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const armadilha = new Promise<never>((_, rejeita) => {
    timer = setTimeout(() => rejeita(new Error(`gmail: timeout após ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promessa, armadilha]);
  } finally {
    clearTimeout(timer);
  }
}

/** Retry 429/5xx com backoff exponencial (quota Google = 250 msg/dia). */
async function comRetry<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt < MAX_RETRIES) {
    try {
      return await comTimeout(fn(), timeoutMs);
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { code?: number }).code;
      if (status === 429 || (typeof status === 'number' && status >= 500)) {
        attempt++;
        await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt - 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`gmail: falha persistente após ${MAX_RETRIES} tentativas: ${String(lastError)}`);
}

function decodificar(data?: string | null): string {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

/** Extrai texto/html do payload (suporta multipart aninhado). */
function extrairCorpo(payload?: gmail_v1.Schema$MessagePart): { text: string; html?: string } {
  if (!payload) return { text: '' };
  const direto = decodificar(payload.body?.data);
  let text = '';
  let html = '';
  for (const parte of payload.parts ?? []) {
    const mime = parte.mimeType ?? '';
    if (mime === 'text/plain') text += decodificar(parte.body?.data);
    else if (mime === 'text/html') html += decodificar(parte.body?.data);
    else {
      const sub = extrairCorpo(parte);
      text += sub.text;
      html += sub.html ?? '';
    }
  }
  const corpoTexto = text || direto || html;
  return { text: corpoTexto, html: html || undefined };
}

function parseAddresses(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => {
      const t = s.trim();
      const comNome = t.match(/<([^>]+)>/);
      return (comNome?.[1] ?? t).trim();
    })
    .filter(Boolean);
}

function headerMap(headers?: gmail_v1.Schema$MessagePartHeader[]): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const h of headers ?? []) {
    if (h.name && h.value) mapa[h.name.toLowerCase()] = h.value;
  }
  return mapa;
}

/** Correlação: header X-Correlation-Token OU token no corpo (formato t:<item>:r<n>). */
function extrairTokenCorrelacao(headers: Record<string, string>, bodyText: string): string | undefined {
  const doHeader = (headers['x-correlation-token'] ?? '').trim();
  if (TOKEN_FORMAT_RE.test(doHeader)) return doHeader;
  return bodyText.match(TOKEN_RE)?.[1];
}

/**
 * Converte MensagemSaida para MIME e envia via Gmail API.
 * Implementa `CommunicationChannel` (envio) e `Recebedor` (recebimento, B-2 R1).
 */
export class GmailAdapter implements CommunicationChannel, Recebedor {
  constructor(
    private ctx: Client,
    private tenantId: string,
    private cfg: GmailConfig,
    private remetente: string = 'assistente@servium.local',
    private opts: { gmailClient?: GetGmailClient; timeoutMs?: number } = {}
  ) {}

  private cliente(): Promise<gmail_v1.Gmail> {
    return this.opts.gmailClient ? this.opts.gmailClient() : getValidClient(this.ctx, this.tenantId, this.cfg);
  }

  async enviar(msg: MensagemSaida): Promise<ResultadoEnvio> {
    let gmail: gmail_v1.Gmail;
    try {
      gmail = await this.cliente();
    } catch (err) {
      return { ok: false, erro: String((err as Error).message ?? err) };
    }

    const mime = [
      `To: ${msg.destinatario}`,
      `From: ${this.remetente}`,
      `Subject: ${msg.assunto}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      msg.corpo,
    ].join('\r\n');

    const encoded = Buffer.from(mime).toString('base64url');

    try {
      const res = await comRetry(
        () => gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } }),
        this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
      );
      const messageId = res.data.id ?? undefined;

      // idempotência: persistir message_id ANTES de retornar ao chamador
      if (messageId) {
        await this.ctx.query(
          `INSERT INTO mensagens_gmail (tenant_id, gmail_message_id, direcao, subject, destinatario)
           VALUES ($1,$2,'envio',$3,$4)
           ON CONFLICT DO NOTHING`,
          [this.tenantId, messageId, msg.assunto, msg.destinatario]
        );
      }
      return { ok: true, messageId };
    } catch (err) {
      return { ok: false, erro: String((err as Error).message ?? err) };
    }
  }

  /** B-2 R1 · recebe novas mensagens do Gmail normalizadas para MensagemRecebida.
   *  NÃO persiste aqui: a idempotência/peristência acontece na correlação. */
  async receber(context: ReceiveContext, query: string = 'is:unread newer_than:1d'): Promise<MensagemRecebida[]> {
    const gmail = await this.cliente();
    const list = await comRetry(
      () => gmail.users.messages.list({ userId: 'me', q: query, maxResults: 20 }),
      this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );
    const messages = list.data.messages ?? [];
    const results: MensagemRecebida[] = [];
    for (const m of messages) {
      if (!m.id) continue;
      const full = await comRetry(
        () => gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' }),
        this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
      );
      const headers = headerMap(full.data.payload?.headers);
      const corpo = extrairCorpo(full.data.payload);
      results.push({
        provider: 'gmail',
        providerMessageId: m.id,
        messageId: full.data.id ?? m.id,
        threadId: m.threadId ?? full.data.threadId ?? undefined,
        from: parseAddresses(headers['from'])[0] ?? '',
        to: parseAddresses(headers['to']),
        cc: headers['cc'] ? parseAddresses(headers['cc']) : undefined,
        subject: headers['subject'] ?? '',
        bodyText: corpo.text,
        bodyHtml: corpo.html,
        receivedAt: full.data.internalDate ? new Date(Number(full.data.internalDate)) : new Date(),
        correlationToken: extrairTokenCorrelacao(headers, corpo.text),
        metadata: { snippet: full.data.snippet ?? null },
      });
    }
    void context;
    return results;
  }

  /** Compatibilidade com CommunicationChannel (opcional) — mesmo fluxo de recebimento. */
  async receberRespostas(context?: ReceiveContext): Promise<MensagemRecebida[]> {
    return this.receber(context ?? { tenantId: this.tenantId });
  }
}