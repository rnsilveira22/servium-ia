import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { hash } from '@node-rs/argon2';

import { ADMIN_URL } from '@servium-ia/db';
import { buildApp } from '../src/app.factory';

/**
 * M1-OPS-05 · migration 0011_emails.sql + contrato GET/PUT /configuracoes
 * (e-mail do escritório por tenant — DD-05). Rotas admin-only; validação de
 * formato + anti-CRLF; nenhuma mudança de RLS.
 */
const TEN = 'bbbb0000-0000-0000-0000-00000000cc01';
const SLUG = 'tenant-config-test';
const ADMIN_EMAIL = 'admin@config-test.local';
const OP_EMAIL = 'op@config-test.local';
const SENHA = 'senha-' + randomBytes(8).toString('hex');

let app: INestApplication;
let req: supertest.Agent;
let admin: import('pg').Client;
let cookieAdmin: string;
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

  await admin.query("INSERT INTO tenants (id, nome, slug) VALUES ($1,'Config Test',$2)", [TEN, SLUG]);
  await admin.query(
    "INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel) VALUES ($1,'Admin',$2,$3,'admin')",
    [TEN, ADMIN_EMAIL, await hash(SENHA)]
  );
  await admin.query(
    "INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel) VALUES ($1,'Operador',$2,$3,'operador')",
    [TEN, OP_EMAIL, await hash(SENHA)]
  );

  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
  cookieAdmin = await login(SLUG, ADMIN_EMAIL);
  cookieOp = await login(SLUG, OP_EMAIL);
});

afterAll(async () => {
  await app.close();
  await limpar();
  void admin.end();
});

async function limpar(): Promise<void> {
  await admin.query('DELETE FROM eventos_auditoria WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM excecoes WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM mensagens_comunicacao WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM itens_ciclo WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM ciclos WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM obrigacoes WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM itens_template WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM checklist_templates WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM clientes WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM sessoes WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM operadores WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM tenants WHERE id=$1', [TEN]);
}

describe('M1-OPS-05 · migration 0011 e contrato /configuracoes', () => {
  it('migration aplicada: tenants possui coluna email_escritorio (nullable)', async () => {
    const { rows } = await admin.query(
      `SELECT is_nullable FROM information_schema.columns
        WHERE table_name='tenants' AND column_name='email_escritorio'`
    );
    expect(rows[0]).toBeTruthy();
    expect(rows[0].is_nullable).toBe('YES');
  });

  it('GET /configuracoes (admin) ⇒ email_escritorio null quando nunca configurado', async () => {
    const r = await req.get('/configuracoes').set('Cookie', cookieAdmin);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ email_escritorio: null });
  });

  it('PUT /configuracoes com email válido ⇒ persiste; GET reflete', async () => {
    const put = await req.put('/configuracoes').set('Cookie', cookieAdmin).send({ email_escritorio: 'escritorio@config.local' });
    expect(put.status).toBe(200);
    expect(put.body).toEqual({ email_escritorio: 'escritorio@config.local' });
    const get = await req.get('/configuracoes').set('Cookie', cookieAdmin);
    expect(get.body).toEqual({ email_escritorio: 'escritorio@config.local' });
  });

  it('PUT /configuracoes com email inválido ou CRLF ⇒ 400 e NÃO persiste', async () => {
    const invalidos = ['nao-e-email', 'a@b', 'x@y.com\r\nBcc: z@w.com', 'escritorio@config.local\nBcc: z'];
    for (const email of invalidos) {
      const r = await req.put('/configuracoes').set('Cookie', cookieAdmin).send({ email_escritorio: email });
      expect(r.status, `email=${JSON.stringify(email)}`).toBe(400);
    }
    const get = await req.get('/configuracoes').set('Cookie', cookieAdmin);
    expect(get.body).toEqual({ email_escritorio: 'escritorio@config.local' }); // valor anterior intacto
  });

  it('RBAC: operador (não admin) ⇒ 403 em GET e PUT /configuracoes', async () => {
    expect((await req.get('/configuracoes').set('Cookie', cookieOp)).status).toBe(403);
    expect(
      (await req.put('/configuracoes').set('Cookie', cookieOp).send({ email_escritorio: 'x@y.com' })).status
    ).toBe(403);
  });

  it('anônimo ⇒ 401', async () => {
    expect((await req.get('/configuracoes')).status).toBe(401);
  });
});
