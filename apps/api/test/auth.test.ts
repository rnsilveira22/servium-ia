import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { hash } from '@node-rs/argon2';

import { ADMIN_URL } from '@servium-ia/db';
import { buildApp } from '../src/app.factory';

const TEN = '66666666-6666-6666-6666-666666666661';
const SLUG = 'tenant-auth-test';
const SENHA = 'senha-' + randomBytes(8).toString('hex'); // gerada em runtime, nunca versionada
const EMAIL = 'admin@auth-test.local';

let app: INestApplication;
let req: supertest.Agent;
let admin: import('pg').Client;
let cookieValido: string;

async function criarOperadorAdmin() {
  const senhaHash = await hash(SENHA);
  await admin.query("INSERT INTO tenants (id, nome, slug) VALUES ($1,'Auth Test',$2)", [TEN, SLUG]);
  await admin.query(
    `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel)
     VALUES ($1,'Admin Test',$2,$3,'admin')`,
    [TEN, EMAIL, senhaHash]
  );
}

beforeAll(async () => {
  const pg = await import('pg');
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();
  await criarOperadorAdmin();

  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
});

afterAll(async () => {
  await app.close();
  await limpar();
  void admin.end();
});

async function limpar() {
  await admin.query('DELETE FROM sessoes WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM eventos_auditoria WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM operadores WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM tenants WHERE id=$1', [TEN]);
}

describe('SRV-20 · autenticação mínima', () => {
  it('hash argon2id não é reversível (senha ≠ hash)', async () => {
    const h = await hash('segredo-teste');
    expect(h.startsWith('$argon2id$')).toBe(true);
    const { verify } = await import('@node-rs/argon2');
    await expect(verify(h, 'errada')).resolves.toBe(false);
    await expect(verify(h, 'segredo-teste')).resolves.toBe(true);
  });

  it('login válido → cookie httpOnly SameSite + papel', async () => {
    const r = await req.post('/auth/login').send({ slug: SLUG, email: EMAIL, senha: SENHA });
    expect(r.status).toBe(200);
    expect(r.body.papel).toBe('admin');
    const c = r.headers['set-cookie'][0];
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
    cookieValido = c.split(';')[0];
  });

  it('login com email inexistente e senha errada são indistinguíveis (anti-enumeration)', async () => {
    const a = await req.post('/auth/login').send({ slug: SLUG, email: 'nope@x.local', senha: 'q' });
    const b = await req.post('/auth/login').send({ slug: SLUG, email: EMAIL, senha: 'errada' });
    expect(a.status).toBe(b.status);
    expect(a.body).toEqual(b.body);
  });

  it('/auth/me sem sessão = 401 (deny-by-default)', async () => {
    expect((await req.get('/auth/me')).status).toBe(401);
  });

  it('/auth/me com sessão retorna identidade do contexto correto', async () => {
    const r = await req.get('/auth/me').set('Cookie', cookieValido);
    expect(r.status).toBe(200);
    expect(r.body.tenantId).toBe(TEN);
    expect(r.body.papel).toBe('admin');
  });

  it('RBAC: rota admin nega operador comum e aceita admin', async () => {
    const ok = await req.get('/auth/admin/ping').set('Cookie', cookieValido);
    expect(ok.status).toBe(200);

    // operador comum
    const senha2 = 'op-' + randomBytes(6).toString('hex');
    await admin.query(
      `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel)
       VALUES ($1,'Op','op@auth-test.local',$2,'operador')`,
      [TEN, await hash(senha2)]
    );
    const login2 = await req.post('/auth/login').send({ slug: SLUG, email: 'op@auth-test.local', senha: senha2 });
    const cookieOp = login2.headers['set-cookie'][0].split(';')[0];
    const negado = await req.get('/auth/admin/ping').set('Cookie', cookieOp);
    expect(negado.status).toBe(403);
  });

  it('logout revoga imediatamente (server-side)', async () => {
    const out = await req.post('/auth/logout').set('Cookie', cookieValido);
    expect(out.status).toBe(204);
    expect((await req.get('/auth/me').set('Cookie', cookieValido)).status).toBe(401);
  });

  it('auditoria registra login sucesso/falha e logout no tenant correto', async () => {
    // um login falho (senha errada) + sucesso + logout já ocorridos neste teste
    await req.post('/auth/login').send({ slug: SLUG, email: EMAIL, senha: 'errada' });
    const r = await req.post('/auth/login').send({ slug: SLUG, email: EMAIL, senha: SENHA });
    const c = r.headers['set-cookie'][0].split(';')[0];
    await req.post('/auth/logout').set('Cookie', c);

    const { rows } = await admin.query(
      `SELECT acao, count(*)::int AS n FROM eventos_auditoria
        WHERE tenant_id=$1 AND entidade='auth' GROUP BY acao ORDER BY acao`,
      [TEN]
    );
    const mapa = Object.fromEntries(rows.map((r) => [r.acao, r.n])) as Record<string, number>;
    expect(mapa['login_falha'] ?? 0).toBeGreaterThanOrEqual(2);
    expect(mapa['login_sucesso'] ?? 0).toBeGreaterThanOrEqual(2);
    expect(mapa['logout'] ?? 0).toBeGreaterThanOrEqual(1);
  });
});
