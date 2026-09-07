/**
 * PRM-P0.1-E · Correlação de respostas do cliente com o item do ciclo.
 *
 * O motor envia cobranças embutindo o "Identificador: t:<item>:r<rodada>".
 * Quando o cliente responde citando o identificador, este módulo:
 *   1. lê as mensagens (Mailpit REST em dev/CI; Gmail API no piloto #54);
 *   2. extrai o token de correlação do corpo da resposta;
 *   3. vincula ao item (aguardando → recebido), idempotente por message_id;
 *   4. registra mensagens_comunicacao + mensagens_gmail + auditoria 'receber'.
 * Toda escrita usa conexão contextual por tenant (RLS), nunca bypass.
 */
import { app, admin, setTenant } from '@servium-ia/db';
import type pg from 'pg';

import type { MensagemRecebida } from '../motor/channel';

const TOKEN_RE = /Identificador:\s*(t:[0-9a-f-]{36}:r\d+)/i;

export interface TokenCorrelacao {
  itemId: string;
  rodada: number;
  token: string;
}

export function extrairToken(corpo: string): string | undefined {
  return corpo.match(TOKEN_RE)?.[1];
}

export function parseToken(token: string): TokenCorrelacao | null {
  const m = token.match(/^t:([0-9a-f-]{36}):r(\d+)$/i);
  if (!m) return null;
  return { itemId: m[1]!.toLowerCase(), rodada: Number(m[2]), token };
}

/* ------------------------------------------------------------------ */
/* 1. Fonte: Mailpit (dev/CI/E2E) — REST API local, nunca Gmail.       */
/* ------------------------------------------------------------------ */

interface MailpitEnvelope {
  messages?: Array<{
    ID: string;
    MessageID: string;
    From: { Address: string };
    To?: Array<{ Address: string }>;
    Subject: string;
  }>;
}

interface MailpitDetalhe {
  MessageID?: string;
  From?: { Address?: string };
  Subject?: string;
  Text?: string;
  Snippet?: string;
}

function abaixoCaixa(endereco: string, caixa: string): boolean {
  return endereco.toLowerCase() === caixa.toLowerCase();
}

/**
 * Lista só as mensagens entregues NA caixa do agente (respostas do cliente).
 * Cobranças que nós enviamos também ficam no Mailpit e carregam o token no
 * corpo — sem este filtro seriam lidas como 'resposta' indevidamente.
 */
export async function buscarMensagensDoMailpit(apiUrl: string, caixa?: string): Promise<MensagemRecebida[]> {
  const res = await fetch(`${apiUrl}/api/v1/messages`);
  if (!res.ok) throw new Error(`mailpit: GET /api/v1/messages falhou (${res.status})`);
  const envelope = (await res.json()) as MailpitEnvelope;

  const saidas: MensagemRecebida[] = [];
  for (const m of envelope.messages ?? []) {
    const remetenteEnvelope = m.From?.Address ?? '';
    if (caixa && abaixoCaixa(remetenteEnvelope, caixa)) continue; // mensagem que nós enviamos
    if (caixa && !(m.To ?? []).some((t) => abaixoCaixa(t.Address, caixa))) continue; // não é da nossa caixa

    const det = await fetch(`${apiUrl}/api/v1/message/${m.ID}`);
    if (!det.ok) continue;
    const d = (await det.json()) as MailpitDetalhe;
    const corpo = d.Text ?? d.Snippet ?? '';
    const token = extrairToken(corpo);
    saidas.push({
      messageId: d.MessageID ?? m.MessageID ?? String(m.ID),
      remetente: (d.From?.Address ?? remetenteEnvelope) ?? '',
      assunto: d.Subject ?? m.Subject,
      corpo,
      tokenCorrelacao: token,
    });
  }
  return saidas;
}

/* ------------------------------------------------------------------ */
/* 2+3+4. Vínculo idempotente da resposta com o item (RLS por tenant). */
/* ------------------------------------------------------------------ */

export interface RecebimentoResultado {
  processadas: number;
  semToken: number;
}

async function auditar(
  ctx: pg.Client,
  tenantId: string,
  entidade: string,
  entidadeId: string,
  acao: string,
  detalhes: Record<string, unknown>
): Promise<void> {
  await ctx.query(
    `INSERT INTO eventos_auditoria (tenant_id, actor_type, entidade, entidade_id, acao, detalhes)
     VALUES ($1,'sistema',$2,$3,$4,$5)`,
    [tenantId, entidade, entidadeId, acao, JSON.stringify(detalhes)]
  );
}

/** Vincula uma resposta já tokenizada ao item (idempotente por message_id).
 *  Toda a sequência roda em transação: ou grava item + mensagens + auditoria,
 *  ou nada — nunca deixa estado parcial (item 'recebido' sem rastro da resposta). */
async function vincularResposta(
  ctx: pg.Client,
  tenantId: string,
  token: TokenCorrelacao,
  msg: MensagemRecebida
): Promise<boolean> {
  await ctx.query('BEGIN');
  try {
    const dupe = await ctx.query('SELECT 1 FROM mensagens_gmail WHERE tenant_id=$1 AND gmail_message_id=$2', [
      tenantId,
      msg.messageId,
    ]);
    if (dupe.rowCount) {
      await ctx.query('ROLLBACK');
      return false;
    }

    const upd = await ctx.query(
      `UPDATE itens_ciclo SET estado='recebido', atualizado_em=now()
        WHERE id=$1 AND tenant_id=$2 AND estado='aguardando' RETURNING id`,
      [token.itemId, tenantId]
    );
    if (upd.rowCount === 0) {
      await ctx.query('ROLLBACK'); // não está aguardando ⇒ ignora (já resolvido/exceção)
      return false;
    }

    await ctx.query(
      `INSERT INTO mensagens_comunicacao
         (tenant_id, item_ciclo_id, direcao, canal, remetente, message_id, idempotency_key, token_correlacao, status)
       VALUES ($1,$2,'recebimento','email',$3,$4,'recv:' || $5,$6,'processado')`,
      [tenantId, token.itemId, msg.remetente, msg.messageId, msg.messageId, token.token]
    );
    await ctx.query(
      `INSERT INTO mensagens_gmail
         (tenant_id, gmail_message_id, item_ciclo_id, direcao, subject, destinatario, token_correlacao)
       VALUES ($1,$2,$3,'recebimento',$4,$5,$6)`,
      [tenantId, msg.messageId, token.itemId, msg.assunto ?? null, msg.remetente, token.token]
    );
    await auditar(ctx, tenantId, 'item_ciclo', token.itemId, 'receber', {
      rodada: token.rodada,
      token: token.token,
      message_id: msg.messageId,
    });

    await ctx.query('COMMIT');
    return true;
  } catch (err) {
    await ctx.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

export async function correlacionarRecebidas(mensagens: MensagemRecebida[]): Promise<RecebimentoResultado> {
  let processadas = 0;
  let semToken = 0;

  const infra = admin();
  await infra.connect();
  try {
    for (const msg of mensagens) {
      if (!msg.tokenCorrelacao) {
        semToken++;
        continue;
      }
      const token = parseToken(msg.tokenCorrelacao);
      if (!token) {
        semToken++;
        continue;
      }
      const { rows } = await infra.query('SELECT tenant_id FROM itens_ciclo WHERE id=$1', [token.itemId]);
      if (!rows[0]) continue; // item desconhecido ⇒ ignora

      const ctx = app();
      await ctx.connect();
      try {
        await setTenant(ctx, rows[0].tenant_id as string);
        if (await vincularResposta(ctx, rows[0].tenant_id as string, token, msg)) processadas++;
      } finally {
        void ctx.end();
      }
    }
  } finally {
    void infra.end();
  }
  return { processadas, semToken };
}

/* ------------------------------------------------------------------ */
/* Recebedor periódico composto no runtime.                            */
/* ------------------------------------------------------------------ */

export interface RecebedorOptions {
  apiUrl: string;
  caixa: string;
  receberIntervalMs: number;
  log?: (level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) => void;
}

export class RecebedorPeriodico {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private rodadaPromise: Promise<RecebimentoResultado> | null = null;

  constructor(private opts: RecebedorOptions) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.rodada().catch(() => undefined);
    this.timer = setInterval(() => void this.rodada().catch(() => undefined), Math.max(1_000, this.opts.receberIntervalMs));
    this.timer.unref();
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.rodadaPromise;
    this.rodadaPromise = null;
  }

  async rodada(): Promise<RecebimentoResultado> {
    if (this.rodadaPromise) return this.rodadaPromise;
    this.rodadaPromise = this.executa();
    try {
      return await this.rodadaPromise;
    } finally {
      this.rodadaPromise = null;
    }
  }

  private async executa(): Promise<RecebimentoResultado> {
    try {
      const mensagens = await buscarMensagensDoMailpit(this.opts.apiUrl, this.opts.caixa);
      const res = await correlacionarRecebidas(mensagens);
      if (res.processadas > 0) {
        this.opts.log?.('info', 'respostas correlacionadas', { processadas: res.processadas, semToken: res.semToken });
      }
      return res;
    } catch (err) {
      this.opts.log?.('warn', 'falha ao buscar correlacionar respostas', {
        erro: String((err as Error)?.message ?? err),
      });
      throw err;
    }
  }
}