import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import pg from 'pg';

import { ADMIN_URL } from '@servium/db';
import { buildApp } from '../src/app.factory';

const TEN_ACCT = '88888888-8888-8888-8888-888888888881';
const TEN_IP = '88888888-8888-8888-8888-888888888882';
const SLUG_ACCT = 'rl-acct';
const SLUG_IP = 'rl-ip';
const SENHA = 'senha-' + randomBytes(8).toString('hex');
const EMAIL_ACCT = 'admin@rl-acct.local';
const EMAIL_IP = 'admin@rl-ip.local';

let admin: pg.Client;

async function criarOperador(ten: string, slug: string, email: string) {
  const { hash } = await import('@node-rs/argon2');
  await admin.query("INSERT INTO tenants (id, nome, slug) VALUES ($1,'RL',$2)", [ten, slug]);
  await admin.query(
    `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel)
     VALUES ($1,'Admin',$2,$3,'admin')`,
    [ten, email, await hash(SENHA)]
  );
}

// --- CA-B-1 + CA-B-3: bloqueio por CONTA + expiração da janela ---------------

describe('SRV-30 · rate limit por conta (CA-B-1) e expiração (CA-B-3)', () => {
  const ACCT_MAX = 3;
  const ACCT_WINDOW = 1000;
  let app: INestApplication;
  let req: supertest.Agent;

  beforeAll(async () => {
    process.env.LOGIN_RATE_LIMIT_ACCOUNT_MAX = String(ACCT_MAX);
    process.env.LOGIN_RATE_LIMIT_ACCOUNT_WINDOW_MS = String(ACCT_WINDOW);
    process.env.LOGIN_RATE_LIMIT_IP_MAX = '10000'; // IP nunca dispara aqui
    process.env.LOGIN_RATE_LIMIT_IP_WINDOW_MS = '600000';

    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await limpar();
    await criarOperador(TEN_ACCT, SLUG_ACCT, EMAIL_ACCT);

    app = await buildApp(true);
    await app.init();
    req = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await limpar();
    void admin.end();
    delete process.env.LOGIN_RATE_LIMIT_ACCOUNT_MAX;
    delete process.env.LOGIN_RATE_LIMIT_ACCOUNT_WINDOW_MS;
    delete process.env.LOGIN_RATE_LIMIT_IP_MAX;
    delete process.env.LOGIN_RATE_LIMIT_IP_WINDOW_MS;
  });

  it('CA-B-1: após N falhas consecutivas a conta é bloqueada (429) e audita login_block', async () => {
    // as primeiras ACCT_MAX falhas são 401 (credenciais inválidas) e a ACCT_MAXª cruza o limite
    for (let i = 0; i < ACCT_MAX; i++) {
      const r = await req.post('/auth/login').send({ slug: SLUG_ACCT, email: EMAIL_ACCT, senha: 'errada' });
      expect(r.status).toBe(401);
    }
    // próximo request cai no interceptor → 429 genérico, mesmo formato de 401
    const r = await req.post('/auth/login').send({ slug: SLUG_ACCT, email: EMAIL_ACCT, senha: SENHA });
    expect(r.status).toBe(429);
    expect(r.body.statusCode).toBe(429);
    expect(Object.keys(r.body).sort()).toEqual(['message', 'statusCode']);
    expect(r.body.message).toBeTypeOf('string');

    const { rows } = await admin.query(
      `SELECT acao, count(*)::int AS n FROM eventos_auditoria
       WHERE tenant_id=$1 AND entidade='auth' AND acao='login_block' GROUP BY acao`,
      [TEN_ACCT]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].n).toBeGreaterThanOrEqual(1);
  });

  it('CA-B-1: limite de conta e de IP não vazam qual regra acionou o 429 (mesmo formato do 401)', async () => {
    // 401 de credenciais inválidas mantém o mesmo formato de corpo do 429
    const invalida = await req.post('/auth/login').send({ slug: SLUG_ACCT, email: EMAIL_ACCT, senha: 'x' });
    // ainda bloqueado por conta— mesmo no caso de conta válida bloqueada, o corpo é genérico
    const bloqueada = await req.post('/auth/login').send({ slug: SLUG_ACCT, email: EMAIL_ACCT, senha: 'x' });
    expect(invalida.status).toBe(429); // bloqueio persistente dentro da janela
    expect(bloqueada.status).toBe(429);
    expect(Object.keys(bloqueada.body).sort()).toEqual(['message', 'statusCode']);
  });

  it('CA-B-3: janela expira e login legítimo volta a funcionar', async () => {
    await new Promise((res) => setTimeout(res, ACCT_WINDOW + 200));
    const ok = await req.post('/auth/login').send({ slug: SLUG_ACCT, email: EMAIL_ACCT, senha: SENHA });
    expect(ok.status).toBe(200);
    expect(ok.body.papel).toBe('admin');
    const c = ok.headers['set-cookie'][0];
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
  });
});

// --- CA-B-2: limite por IP -----------------------------------------------------

describe('SRV-30 · rate limit por IP (CA-B-2)', () => {
  const IP_MAX = 3;
  const IP_WINDOW = 2000;
  let app: INestApplication;
  let req: supertest.Agent;

  beforeAll(async () => {
    process.env.LOGIN_RATE_LIMIT_ACCOUNT_MAX = '10000'; // conta nunca dispara aqui
    process.env.LOGIN_RATE_LIMIT_ACCOUNT_WINDOW_MS = '600000';
    process.env.LOGIN_RATE_LIMIT_IP_MAX = String(IP_MAX);
    process.env.LOGIN_RATE_LIMIT_IP_WINDOW_MS = String(IP_WINDOW);

    admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await limpar();
    await criarOperador(TEN_IP, SLUG_IP, EMAIL_IP);

    app = await buildApp(true);
    await app.init();
    req = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await limpar();
    void admin.end();
    delete process.env.LOGIN_RATE_LIMIT_ACCOUNT_MAX;
    delete process.env.LOGIN_RATE_LIMIT_ACCOUNT_WINDOW_MS;
    delete process.env.LOGIN_RATE_LIMIT_IP_MAX;
    delete process.env.LOGIN_RATE_LIMIT_IP_WINDOW_MS;
  });

  it('CA-B-2: falhas acumulam no limite por IP (429 genérico)', async () => {
    for (let i = 0; i < IP_MAX; i++) {
      const r = await req.post('/auth/login').send({ slug: SLUG_IP, email: EMAIL_IP, senha: 'errada' });
      expect(r.status).toBe(401);
    }
    const r = await req.post('/auth/login').send({ slug: SLUG_IP, email: EMAIL_IP, senha: SENHA });
    expect(r.status).toBe(429);
    // corpo no mesmo formato do 401 — não revela se foi conta ou IP
    expect(Object.keys(r.body).sort()).toEqual(['message', 'statusCode']);
  });
});

async function limpar() {
  for (const ten of [TEN_ACCT, TEN_IP]) {
    await admin.query('DELETE FROM sessoes WHERE tenant_id=$1', [ten]);
    await admin.query('DELETE FROM eventos_auditoria WHERE tenant_id=$1', [ten]);
    await admin.query('DELETE FROM operadores WHERE tenant_id=$1', [ten]);
    await admin.query('DELETE FROM tenants WHERE id=$1', [ten]);
  }
}