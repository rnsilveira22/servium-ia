import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { hash } from '@node-rs/argon2';

import { ADMIN_URL } from '@servium-ia/db';
import { buildApp } from '../src/app.factory';

/**
 * B-2 R3 · contrato GET/PUT /configuracoes/integracao-email.
 * Provider-agnóstico; validação de provider e e-mail; RBAC admin; isolamento
 * por tenant (RLS FORCE em tenant_email_integration — um tenant nunca lê o
 * outro). Nenhum segredo transita: só configuração + referência de credencial.
 */
const TEN = 'fefe0000-0000-0000-0000-00000000b201';
const TEN_B = 'fefe0000-0000-0000-0000-00000000b202';
const SLUG = 'tenant-integracao-test';
const SLUG_B = 'tenant-integracao-test-b';
const ADMIN_EMAIL = 'admin@integracao.local';
const ADMIN_EMAIL_B = 'admin-b@integracao.local';
const OP_EMAIL = 'op@integracao.local';
const SENHA = 'senha-' + randomBytes(8).toString('hex');

let app: INestApplication;
let req: supertest.Agent;
let admin: import('pg').Client;
let cookieAdmin: string;
let cookieAdminB: string;
let cookieOp: string;

async function login(slug: string, email: string): Promise<string> {
  const r = await req.post('/auth/login').send({ slug, email, senha: SENHA });
  expect(r.status).toBe(200);
  return r.headers['set-cookie'][0].split(';')[0];
}

beforeAll(async () => {
  const pg = await import('pg');
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await admin.query("INSERT INTO tenants (id, nome, slug) VALUES ($1,'Integração',$2)", [TEN, SLUG]);
  await admin.query("INSERT INTO tenants (id, nome, slug) VALUES ($1,'Integração B',$2)", [TEN_B, SLUG_B]);
  await admin.query(
    "INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel) VALUES ($1,'Admin',$2,$3,'admin')",
    [TEN, ADMIN_EMAIL, await hash(SENHA)]
  );
  await admin.query(
    "INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel) VALUES ($1,'AdminB',$2,$3,'admin')",
    [TEN_B, ADMIN_EMAIL_B, await hash(SENHA)]
  );
  await admin.query(
    "INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel) VALUES ($1,'Operador',$2,$3,'operador')",
    [TEN, OP_EMAIL, await hash(SENHA)]
  );

  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
  cookieAdmin = await login(SLUG, ADMIN_EMAIL);
  cookieAdminB = await login(SLUG_B, ADMIN_EMAIL_B);
  cookieOp = await login(SLUG, OP_EMAIL);
});

afterAll(async () => {
  if (app) await app.close();
  await limpar();
  void admin.end();
});

async function limpar(): Promise<void> {
  for (const t of [TEN, TEN_B]) {
    await admin.query('DELETE FROM jobs_fila WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM eventos_auditoria WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM mensagens_comunicacao WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM sessoes WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM operadores WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM tenant_email_integration WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM tenants WHERE id=$1', [t]);
  }
}

describe('B-2 R3 · migração 0012 e endpoints /configuracoes/integracao-email', () => {
  it('migração aplicada e RLS FORCE habilitado em tenant_email_integration', async () => {
    const { rows: tabela } = await admin.query(
      `SELECT relrowsecurity AS rls, relforcerowsecurity AS forcado
         FROM pg_class WHERE relname='tenant_email_integration'`
    );
    expect(tabela[0]).toBeTruthy();
    expect(tabela[0].rls).toBe(true);
    expect(tabela[0].forcado).toBe(true);
  });

  it('GET sem configuração ⇒ { integracao: null } (Nest não serializa null direto)', async () => {
    const r = await req.get('/configuracoes/integracao-email').set('Cookie', cookieAdmin);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ integracao: null });
  });

  it('PUT com provider gmail + e-mails válidos ⇒ persiste; GET reflete', async () => {
    const put = await req
      .put('/configuracoes/integracao-email')
      .set('Cookie', cookieAdmin)
      .send({
        provider: 'gmail',
        sender_email: 'financeiro@innove.local',
        mailbox_email: 'cobranca@innove.local',
        auth_type: 'oauth2',
        send_enabled: true,
        receive_enabled: true,
      });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject({
      provider: 'gmail',
      sender_email: 'financeiro@innove.local',
      mailbox_email: 'cobranca@innove.local',
      auth_type: 'oauth2',
      send_enabled: true,
      receive_enabled: true,
    });

    const get = await req.get('/configuracoes/integracao-email').set('Cookie', cookieAdmin);
    expect(get.body.integracao).toMatchObject({ provider: 'gmail', sender_email: 'financeiro@innove.local' });
  });

  it('PUT atualiza linha (upsert por tenant+provider) sem duplicar', async () => {
    await req
      .put('/configuracoes/integracao-email')
      .set('Cookie', cookieAdmin)
      .send({ provider: 'gmail', sender_email: 'novo-remetente@innove.local', receive_enabled: false });
    const { rows } = await admin.query(
      'SELECT count(*)::int AS n FROM tenant_email_integration WHERE tenant_id=$1',
      [TEN]
    );
    expect(rows[0].n).toBe(1);
    const get = await req.get('/configuracoes/integracao-email').set('Cookie', cookieAdmin);
    expect(get.body.integracao.sender_email).toBe('novo-remetente@innove.local');
    expect(get.body.integracao.receive_enabled).toBe(false);
  });

  it('provider inválido ou e-mail inválido ⇒ 400 e não persiste', async () => {
    const invalidos = [
      { provider: 'graph', sender_email: 'x@y.com' },
      { provider: 'gmail', sender_email: 'nao-e-email' },
      { provider: 'gmail', sender_email: 'a@b' },
      { provider: 'gmail', mailbox_email: 'x@y.com\r\nBcc: z@w.com' },
    ] as const;
    for (const body of invalidos) {
      const r = await req.put('/configuracoes/integracao-email').set('Cookie', cookieAdmin).send(body);
      expect(r.status, `body=${JSON.stringify(body)}`).toBe(400);
    }
    const { rows } = await admin.query(
      'SELECT count(*)::int AS n FROM tenant_email_integration WHERE tenant_id=$1',
      [TEN]
    );
    expect(rows[0].n).toBe(1); // upsert anterior segue intacto
  });

  it('isolamento RLS: tenant B nunca vê a integração do tenant A', async () => {
    const getB = await req.get('/configuracoes/integracao-email').set('Cookie', cookieAdminB);
    expect(getB.status).toBe(200);
    expect(getB.body).toEqual({ integracao: null });
  });

  it('RBAC: operador ⇒ 403; anônimo ⇒ 401', async () => {
    expect((await req.get('/configuracoes/integracao-email').set('Cookie', cookieOp)).status).toBe(403);
    expect(
      (await req.put('/configuracoes/integracao-email').set('Cookie', cookieOp).send({ provider: 'gmail' })).status
    ).toBe(403);
    expect((await req.get('/configuracoes/integracao-email')).status).toBe(401);
  });
});