import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { gmail_v1 } from 'googleapis';

import { ADMIN_URL, APP_URL } from '@servium-ia/db';
import type { MensagemRecebida } from '../src/motor/channel';
import { GmailAdapter, type GmailConfig } from '../src/email/gmail-adapter';

/**
 * B-2 R1 · GmailAdapter.receber: normaliza payload do Gmail para
 * MensagemRecebida provider-agnóstica, extrai token de correlação (header
 * X-Correlation-Token) e NÃO persiste nada (idempotência fica na correlação).
 * Sem Google real — cliente injetado (fake). E enviar persiste message_id
 * (idempotência de envio).
 */
const TEN = 'baba0000-0000-0000-0000-00000000d401';
const SLUG = 'tenant-gmail-receber';

const CFG: GmailConfig = {
  clientId: 'fake-client-id',
  clientSecret: 'fake-client-secret',
  redirectUri: 'http://localhost:3000/auth/gmail/callback',
};

const TOKEN = 't:00000000-0000-0000-0000-000000000000:r1';

let admin: pg.Client;
let ctx: pg.Client;

function base64(s: string): string {
  return Buffer.from(s).toString('base64');
}

/** Payload de mensagem como a Gmail API devolve (format=full). */
function mensagemCompleta(overrides: Partial<gmail_v1.Schema$Message> = {}): gmail_v1.Schema$Message {
  const base = {
    id: 'msg-1',
    threadId: 'thr-1',
    internalDate: '1700000000000',
    snippet: 'segue o documento',
    payload: {
      mimeType: 'multipart/alternative',
      headers: [
        { name: 'From', value: 'Cliente Gmail <cliente-gmail@local>' },
        { name: 'To', value: 'financeiro@innove.local, caixa@innove.local' },
        { name: 'Subject', value: 'Re: Pendência documental' },
        { name: 'X-Correlation-Token', value: TOKEN },
      ],
      parts: [{ mimeType: 'text/plain', body: { data: base64(`arquivo em anexo\nIdentificador: ${TOKEN}`) } }],
    },
  };
  return { ...base, ...overrides };
}

/** Cliente Gmail fake injetado (nunca toca a rede Google). */
function fakeGmail(messages: gmail_v1.Schema$Message[]): gmail_v1.Gmail {
  return {
    users: {
      messages: {
        list: async () => ({ data: { messages: messages.map((m) => ({ id: m.id!, threadId: m.threadId })) } }),
        get: async (params: { id?: string }) => ({ data: messages.find((m) => m.id === params.id) ?? {} }),
        send: async () => ({ data: { id: 'sent-9' } }),
      },
    },
  } as unknown as gmail_v1.Gmail;
}

async function adapterCom(messages: gmail_v1.Schema$Message[]): Promise<GmailAdapter> {
  return new GmailAdapter(ctx, TEN, CFG, 'financeiro@innove.local', {
    gmailClient: async () => fakeGmail(messages),
    timeoutMs: 2000,
  });
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Gmail Recv',$2)", [TEN, SLUG]);

  ctx = new pg.Client({ connectionString: APP_URL });
  await ctx.connect();
  await ctx.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);
});

afterAll(async () => {
  await limpar();
  void admin.end();
  void ctx.end();
});

async function limpar(): Promise<void> {
  await admin.query('DELETE FROM mensagens_gmail WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM tenants WHERE id=$1', [TEN]);
}

describe('B-2 R1 · GmailAdapter.receber (normalização, sem persistência)', () => {
  it('normaliza payload → MensagemRecebida com token de correlação', async () => {
    const adapter = await adapterCom([mensagemCompleta()]);
    const recebidas: MensagemRecebida[] = await adapter.receber({ tenantId: TEN });
    expect(recebidas).toHaveLength(1);
    expect(recebidas[0]!).toMatchObject({
      provider: 'gmail',
      providerMessageId: 'msg-1',
      threadId: 'thr-1',
      from: 'cliente-gmail@local',
      subject: 'Re: Pendência documental',
      correlationToken: TOKEN,
    });
    expect(recebidas[0]!.to).toEqual(['financeiro@innove.local', 'caixa@innove.local']);
    expect(recebidas[0]!.bodyText).toContain('Identificador:');
    expect(recebidas[0]!.receivedAt).toBeInstanceOf(Date);
  });

  it('receber NÃO persiste em mensagens_gmail (idempotência pertence à correlação)', async () => {
    const adapter = await adapterCom([mensagemCompleta()]);
    await adapter.receber({ tenantId: TEN });
    const { rows } = await admin.query('SELECT count(*)::int AS n FROM mensagens_gmail WHERE tenant_id=$1', [TEN]);
    expect(rows[0].n).toBe(0);
  });

  it('header X-Correlation-Token inválido + sem token no corpo ⇒ correlationToken ausente', async () => {
    const msg = mensagemCompleta({
      payload: {
        mimeType: 'text/plain',
        headers: [
          { name: 'From', value: 'x@y.com' },
          { name: 'Subject', value: 'Re: Pendência' },
        ],
        body: { data: base64('sem identificador aqui') },
      },
    });
    const adapter = await adapterCom([msg]);
    const recebidas = await adapter.receber({ tenantId: TEN });
    expect(recebidas[0]!.correlationToken).toBeUndefined();
    expect(recebidas[0]!.bodyText).toBe('sem identificador aqui');
  });

  it('enviar com cliente fake: ok + persiste message_id (idempotência de envio)', async () => {
    const adapter = await adapterCom([]);
    const r = await adapter.enviar({
      destinatario: 'cliente@local',
      assunto: 'Pendência',
      corpo: `Olá\nIdentificador: ${TOKEN}`,
      idempotencyKey: 'envio-1',
    });
    expect(r.ok).toBe(true);
    expect(r.messageId).toBe('sent-9');
    const { rows } = await admin.query(
      "SELECT count(*)::int AS n FROM mensagens_gmail WHERE tenant_id=$1 AND gmail_message_id='sent-9'",
      [TEN]
    );
    expect(rows[0].n).toBe(1);
    // duplicata de envio ⇒ ON CONFLICT DO NOTHING mantém 1 linha
    await adapter.enviar({
      destinatario: 'cliente@local',
      assunto: 'Pendência',
      corpo: 'x',
      idempotencyKey: 'envio-1',
    });
    const { rows: dup } = await admin.query(
      "SELECT count(*)::int AS n FROM mensagens_gmail WHERE tenant_id=$1 AND gmail_message_id='sent-9'",
      [TEN]
    );
    expect(dup[0].n).toBe(1);
  });
});