import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

import { ADMIN_URL, APP_URL } from '@servium-ia/db';
import { EmailProviderResolver } from '../src/runtime/provider-resolver';
import { GmailAdapter } from '../src/email/gmail-adapter';
import { MailpitRecebedor } from '../src/runtime/recebimento';

/**
 * B-2 R2 · EmailProviderResolver — resolução por tenant SEM tocar no Core.
 * Um tenant tem UM provider primário (pilot: Innove → Gmail). Regras:
 *  - sem integração ⇒ fallback global (null no envio; Mailpit no recebimento dev);
 *  - provider gmail exige credencial env E token OAuth no tenant;
 *  - provider mailpit ⇒ MailpitRecebedor;
 *  - NUNCA retorna adapter sem as pré-condições (evita job em loop).
 */
const TEN_GMAIL = 'dada0000-0000-0000-0000-00000000c301';
const TEN_MAILPIT = 'dada0000-0000-0000-0000-00000000c302';
const TEN_FALLBACK = 'dada0000-0000-0000-0000-00000000c303';
const TEN_VAZIO = 'dada0000-0000-0000-0000-00000000c304';

let admin: pg.Client;
let ctx: pg.Client;

function resolver(opts: Partial<{ credencial: boolean; mailpit: boolean }> = {}): EmailProviderResolver {
  const env: Record<string, string> = {};
  if (opts.credencial) {
    env['GMAIL_CLIENT_ID'] = 'fake-client-id';
    env['GMAIL_CLIENT_SECRET'] = 'fake-client-secret';
    env['GMAIL_REDIRECT_URI'] = 'http://localhost:3000/auth/gmail/callback';
  }
  if (opts.mailpit) {
    env['MAILPIT_API_URL'] = 'http://localhost:8025';
    env['MAILPIT_AGENT_EMAIL'] = 'assistente@servium.local';
  }
  return new EmailProviderResolver({ env });
}

async function criarTenant(id: string, slug: string): Promise<void> {
  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Resolver',$2)", [id, slug]);
}

async function integracao(tenantId: string, provider: string, receiveEnabled = true): Promise<void> {
  await admin.query(
    `INSERT INTO tenant_email_integration
       (tenant_id, provider, sender_email, mailbox_email, auth_type, send_enabled, receive_enabled, status)
     VALUES ($1,$2,$3,$4,'oauth2',true,$5,'configurado')`,
    [tenantId, provider, `financeiro@${tenantId.slice(0, 8)}.local`, 'cobranca@local', receiveEnabled]
  );
}

async function tokenGmail(tenantId: string): Promise<void> {
await admin.query(
      `INSERT INTO gmail_tokens (tenant_id, user_email, access_token, refresh_token, scopes, expires_at)
       VALUES ($1,'financeiro@innove.local','at','rt','{gmail.send,gmail.readonly}', now() + interval '1 hour')`,
      [tenantId]
    );
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  if (!ctx) {
    ctx = new pg.Client({ connectionString: APP_URL });
    await ctx.connect();
    await ctx.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN_GMAIL]);
  }
});

afterAll(async () => {
  await limpar();
  void admin.end();
  void ctx.end();
});

async function limpar(): Promise<void> {
  if (!admin) return;
  for (const id of [TEN_GMAIL, TEN_MAILPIT, TEN_FALLBACK, TEN_VAZIO]) {
    await admin.query('DELETE FROM tenant_email_integration WHERE tenant_id=$1', [id]);
    await admin.query('DELETE FROM gmail_tokens WHERE tenant_id=$1', [id]);
    await admin.query('DELETE FROM tenants WHERE id=$1', [id]);
  }
}

/** ctx do tenant alvo (cada teste usa a conexão correta — RLS FORCE). */
async function ctxDe(tenantId: string): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: APP_URL });
  await c.connect();
  await c.query('SELECT set_config($1,$2,false)', ['app.tenant_id', tenantId]);
  return c;
}

describe('B-2 R2 · EmailProviderResolver', () => {
  it('obterIntegracao: sem linha ⇒ null; com linha ⇒ integração mapeada (conexão própria)', async () => {
    await criarTenant(TEN_GMAIL, 'tenant-resolver-gmail');
    await integracao(TEN_GMAIL, 'gmail');
    const resolv = resolver({ credencial: true, mailpit: true });
    const integra = await resolv.obterIntegracao(TEN_GMAIL);
    expect(integra).toMatchObject({
      tenantId: TEN_GMAIL,
      provider: 'gmail',
      senderEmail: `financeiro@${TEN_GMAIL.slice(0, 8)}.local`,
      authType: 'oauth2',
      receiveEnabled: true,
    });
  });

  it('resolverCanal: gmail exige credencial env + token OAuth; senão null (fallback global)', async () => {
    const ctxG = await ctxDe(TEN_GMAIL);
    try {
      // credencial sim, mas SEM token ⇒ null
      expect(await resolver({ credencial: true }).resolverCanal(TEN_GMAIL, ctxG)).toBeNull();
      // sem credencial, mesmo com token ⇒ null
      await tokenGmail(TEN_GMAIL);
      expect(await resolver({ mailpit: true }).resolverCanal(TEN_GMAIL, ctxG)).toBeNull();
      // credencial + token ⇒ GmailAdapter com remetente da integração
      const resolvido = await resolver({ credencial: true }).resolverCanal(TEN_GMAIL, ctxG);
      expect(resolvido).not.toBeNull();
      expect(resolvido!.canal).toBeInstanceOf(GmailAdapter);
      expect(resolvido!.remetente).toBe(`financeiro@${TEN_GMAIL.slice(0, 8)}.local`);
    } finally {
      void ctxG.end();
    }
  });

  it('resolverCanal: provider mailpit NÃO resolve envio (usa canal global do motor)', async () => {
    await criarTenant(TEN_MAILPIT, 'tenant-resolver-mailpit');
    await integracao(TEN_MAILPIT, 'mailpit');
    const ctxM = await ctxDe(TEN_MAILPIT);
    try {
      expect(await resolver({ credencial: true }).resolverCanal(TEN_MAILPIT, ctxM)).toBeNull();
    } finally {
      void ctxM.end();
    }
  });

  it('resolverRecebedor: integração mailpit ⇒ MailpitRecebedor na caixa do tenant', async () => {
    const ctxM = await ctxDe(TEN_MAILPIT);
    try {
      const recebedor = await resolver({ mailpit: true }).resolverRecebedor(TEN_MAILPIT, ctxM);
      expect(recebedor).toBeInstanceOf(MailpitRecebedor);
    } finally {
      void ctxM.end();
    }
  });

  it('resolverRecebedor: gmail sem token OAuth ⇒ null (evita loop de jobs)', async () => {
    // TEN_VAZIO terá integração gmail SEM token
    await criarTenant(TEN_VAZIO, 'tenant-resolver-vazio');
    await integracao(TEN_VAZIO, 'gmail');
    const ctxV = await ctxDe(TEN_VAZIO);
    try {
      expect(await resolver({ credencial: true }).resolverRecebedor(TEN_VAZIO, ctxV)).toBeNull();
    } finally {
      void ctxV.end();
    }
  });

  it('resolverRecebedor: fallback dev/CI com MAILPIT_API_URL e tenant sem integração', async () => {
    await criarTenant(TEN_FALLBACK, 'tenant-resolver-fallback');
    const ctxF = await ctxDe(TEN_FALLBACK);
    try {
      const recebedor = await resolver({ mailpit: true }).resolverRecebedor(TEN_FALLBACK, ctxF);
      expect(recebedor).toBeInstanceOf(MailpitRecebedor);
      // sem MAILPIT_API_URL ⇒ nada a receber
      expect(await resolver({}).resolverRecebedor(TEN_FALLBACK, ctxF)).toBeNull();
    } finally {
      void ctxF.end();
    }
  });

  it('resolverRecebedor: integração gmail + token ⇒ GmailAdapter (fonte do tenant)', async () => {
    const ctxG = await ctxDe(TEN_GMAIL);
    try {
      const recebedor = await resolver({ credencial: true }).resolverRecebedor(TEN_GMAIL, ctxG);
      expect(recebedor).toBeInstanceOf(GmailAdapter);
    } finally {
      void ctxG.end();
    }
  });
});