/**
 * PRM-P0.1-E · Correlação de respostas do cliente com o item do ciclo.
 *
 * O motor envia cobranças embutindo o "Identificador: t:<item>:r<rodada>".
 * Quando o cliente responde citando o identificador, este módulo:
 *   1. coleta mensagens via contrato genérico `Recebedor` (B-2 R1) — o
 *      runtime NUNCA chama uma função de provider diretamente;
 *   2. extrai o token de correlação (corpo e/ou header já normalizado pelo
 *      adapter → `MensagemRecebida.correlationToken`);
 *   3. vincula ao item (aguardando → recebido), idempotente por
 *      `provider_message_id`;
 *   4. registra mensagens_comunicacao + mensagens_gmail + auditoria 'receber'.
 *
 * B-2: Mailpit segue como provider de dev/teste via `MailpitRecebedor`;
 * Gmail/SMTP/etc. entram pelo mesmo contrato sem tocar neste módulo.
 * Toda escrita usa conexão contextual por tenant (RLS), nunca bypass.
 */
import { app, admin, setTenant } from '@servium-ia/db';
import type pg from 'pg';

import type { MensagemRecebida, Recebedor, ReceiveContext } from '../motor/channel';

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
    MessageID?: string;
    Created?: string;
    From?: { Address: string };
    To?: Array<{ Address: string }>;
    Subject?: string;
  }>;
}

interface MailpitDetalhe {
  MessageID?: string;
  From?: { Address?: string };
  To?: Array<{ Address?: string }>;
  Subject?: string;
  Text?: string;
  HTML?: string;
  Created?: string;
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
    const providerMessageId = d.MessageID ?? m.MessageID ?? String(m.ID);
    saidas.push({
      provider: 'mailpit',
      providerMessageId,
      messageId: providerMessageId,
      from: (d.From?.Address ?? remetenteEnvelope) ?? '',
      to: (d.To ?? []).map((t) => t.Address ?? '').filter(Boolean),
      subject: d.Subject ?? m.Subject ?? '',
      bodyText: corpo,
      bodyHtml: d.HTML ?? undefined,
      receivedAt: new Date(d.Created ?? m.Created ?? Date.now()),
      correlationToken: token,
    });
  }
  return saidas;
}

/** B-2 R1 · facade `Recebedor` do Mailpit — dev/CI/E2E pelo mesmo contrato. */
export interface MailpitRecebedorOptions {
  apiUrl: string;
  caixa?: string;
}

export class MailpitRecebedor implements Recebedor {
  constructor(private opts: MailpitRecebedorOptions) {}

  async receber(context: ReceiveContext): Promise<MensagemRecebida[]> {
    void context;
    return buscarMensagensDoMailpit(this.opts.apiUrl, this.opts.caixa);
  }
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
  detalhes: Record<string, unknown>,
  serviceId?: string
): Promise<void> {
  await ctx.query(
    `INSERT INTO eventos_auditoria (tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [tenantId, serviceId ? 'servico' : 'sistema', serviceId ?? null, entidade, entidadeId, acao, JSON.stringify(detalhes)]
  );
}

/** Vincula uma resposta já tokenizada ao item (idempotente por provider_message_id).
 *  Toda a sequência roda em transação: ou grava item + mensagens + auditoria,
 *  ou nada — nunca deixa estado parcial (item 'recebido' sem rastro da resposta). */
async function vincularResposta(
  ctx: pg.Client,
  tenantId: string,
  token: TokenCorrelacao,
  msg: MensagemRecebida,
  serviceId?: string
): Promise<boolean> {
  await ctx.query('BEGIN');
  try {
    const dupe = await ctx.query('SELECT 1 FROM mensagens_gmail WHERE tenant_id=$1 AND gmail_message_id=$2', [
      tenantId,
      msg.providerMessageId,
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
      [tenantId, token.itemId, msg.from, msg.providerMessageId, msg.providerMessageId, token.token]
    );
    await ctx.query(
      `INSERT INTO mensagens_gmail
         (tenant_id, gmail_message_id, item_ciclo_id, direcao, subject, destinatario, token_correlacao)
       VALUES ($1,$2,$3,'recebimento',$4,$5,$6)`,
      [tenantId, msg.providerMessageId, token.itemId, msg.subject ?? null, msg.from, token.token]
    );
    await auditar(ctx, tenantId, 'item_ciclo', token.itemId, 'receber', {
      provider: msg.provider,
      rodada: token.rodada,
      token: token.token,
      message_id: msg.providerMessageId,
    }, serviceId);

    await ctx.query('COMMIT');
    return true;
  } catch (err) {
    await ctx.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

export async function correlacionarRecebidas(
  mensagens: MensagemRecebida[],
  serviceId?: string
): Promise<RecebimentoResultado> {
  let processadas = 0;
  let semToken = 0;

  const infra = admin();
  await infra.connect();
  try {
    for (const msg of mensagens) {
      if (!msg.correlationToken) {
        semToken++;
        continue;
      }
      const token = parseToken(msg.correlationToken);
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
        if (await vincularResposta(ctx, rows[0].tenant_id as string, token, msg, serviceId)) processadas++;
      } finally {
        void ctx.end();
      }
    }
  } finally {
    void infra.end();
  }
  return { processadas, semToken };
}