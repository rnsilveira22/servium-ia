import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import pg from 'pg';

import { ADMIN_URL, APP_URL } from '@servium-ia/db';
import { buildApp } from '../src/app.factory';
import { GmailAdapter } from '../src/email/gmail-adapter';

const TEN = 'cccc0000-0000-0000-0000-000000000001';
const SLUG = 'tenant-gmail-test';
const EMAIL = 'admin@gmail-test.local';
const SENHA = 'senha-' + randomBytes(8).toString('hex');

let app: INestApplication;
let req: supertest.Agent;
let admin: pg.Client;
let ctx: pg.Client;
let cookie: string;

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Gmail Test',$2)", [TEN, SLUG]);
  await admin.query(
    "INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel) VALUES ($1,'Admin',$2,$3,'admin')",
    [TEN, EMAIL, await (await import('@node-rs/argon2')).hash(SENHA)]
  );

  ctx = new pg.Client({ connectionString: APP_URL });
  await ctx.connect();
  await ctx.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);

  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
  const login = await req.post('/auth/login').send({ slug: SLUG, email: EMAIL, senha: SENHA });
  cookie = login.headers['set-cookie'][0].split(';')[0];
});

afterAll(async () => {
  if (app) await app.close();
  await limpar();
  void admin.end();
  if (ctx) void ctx.end();
});

async function limpar() {
  for (const sql of [
    'DELETE FROM mensagens_gmail WHERE tenant_id=$1',
    'DELETE FROM gmail_tokens WHERE tenant_id=$1',
    'DELETE FROM mensagens_comunicacao WHERE tenant_id=$1',
    'DELETE FROM documentos WHERE tenant_id=$1',
    'DELETE FROM excecoes WHERE tenant_id=$1',
    'DELETE FROM eventos_auditoria WHERE tenant_id=$1',
    'DELETE FROM jobs_fila WHERE tenant_id=$1',
    'DELETE FROM itens_ciclo WHERE ciclo_id IN (SELECT id FROM ciclos WHERE tenant_id=$1)',
    'DELETE FROM itens_template WHERE template_id IN (SELECT id FROM checklist_templates WHERE tenant_id=$1)',
    'DELETE FROM ciclos WHERE tenant_id=$1',
    'DELETE FROM checklist_templates WHERE tenant_id=$1',
    'DELETE FROM obrigacoes WHERE tenant_id=$1',
    'DELETE FROM clientes WHERE tenant_id=$1',
    'DELETE FROM clientes WHERE tenant_id=$1',
    'DELETE FROM sessoes WHERE tenant_id=$1',
    'DELETE FROM operadores WHERE tenant_id=$1',
    'DELETE FROM tenants WHERE id=$1',
  ]) {
    await admin.query(sql, [TEN]);
  }
}

describe('SRV-18 · Gmail adapter (unitário — sem Google real)', () => {
  it('enviar sem token configurado ⇒ erro descritivo', async () => {
    const adapter = new GmailAdapter(ctx, TEN, {
      clientId: 'fake',
      clientSecret: 'fake',
      redirectUri: 'http://localhost',
    });
    const r = await adapter.enviar({
      destinatario: 'teste@exemplo.com',
      assunto: 'Teste',
      corpo: 'Corpo',
      idempotencyKey: 'test-1',
    });
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('nenhum token');
  });

  it('persistir idempotência de message_id duplicado', async () => {
    // insere manualmente uma mensagem sync para simular persistência
    await ctx.query(
      `INSERT INTO mensagens_gmail (tenant_id, gmail_message_id, direcao, subject)
       VALUES ($1,$2,'envio','Teste idemp')`,
      [TEN, 'gmail-dup-123']
    );
    //第二次 inserção com mesma chave não deve falhar (UNIQUE constraint + ON CONFLICT)
    await ctx.query(
      `INSERT INTO mensagens_gmail (tenant_id, gmail_message_id, direcao, subject)
       VALUES ($1,$2,'envio','Teste idemp') ON CONFLICT DO NOTHING`,
      [TEN, 'gmail-dup-123']
    );
    const { rows } = await ctx.query(
      "SELECT count(*)::int AS n FROM mensagens_gmail WHERE gmail_message_id='gmail-dup-123'"
    );
    expect(rows[0].n).toBe(1);
  });
});

describe('SRV-18 · Gmail OAuth endpoints', () => {
  it('GET /auth/gmail/authorize retorna URL de consentimento', async () => {
    // mock env
    process.env.GMAIL_CLIENT_ID = 'fake-client-id';
    process.env.GMAIL_CLIENT_SECRET = 'fake-client-secret';
    const r = await req.get('/auth/gmail/authorize').set('Cookie', cookie);
    expect(r.status).toBe(200);
    expect(r.body.url).toContain('accounts.google.com');
    expect(r.body.url).toContain('client_id=fake-client-id');
    expect(r.body.url).toContain('gmail.send');
    expect(r.body.url).toContain('gmail.readonly');
  });

  it('callback sem code ⇒ 400', async () => {
    const r = await req.get('/auth/gmail/callback').set('Cookie', cookie);
    expect(r.status).toBe(400);
  });

  it('listar tokens (vazio) ⇒ 200', async () => {
    const r = await req.get('/auth/gmail/tokens').set('Cookie', cookie);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body).toHaveLength(0);
  });

  it('sem autenticação ⇒ 401', async () => {
    expect((await req.get('/auth/gmail/authorize')).status).toBe(401);
    expect((await req.get('/auth/gmail/tokens')).status).toBe(401);
  });
});

describe('SRV-18 · health check (via SRV-9)', () => {
  it('GET /health retorna ok + db true', async () => {
    const r = await req.get('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
    expect(r.body.db).toBe(true);
  });
});
