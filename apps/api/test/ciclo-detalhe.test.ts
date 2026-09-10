import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { hash } from '@node-rs/argon2';

import { ADMIN_URL } from '@servium-ia/db';
import { buildApp } from '../src/app.factory';

// Tenants EXCLUSIVOS deste arquivo (paralelismo vitest — lição SRV-7)
const TEN_A = '99999999-9999-9999-9999-999999999981';
const TEN_B = '99999999-9999-9999-9999-999999999982';
const SLUG_A = 'tenant-detalhe-a';
const SLUG_B = 'tenant-detalhe-b';
const EMAIL = 'admin@detalhe-test.local';
const EMAIL_OPER = 'oper@detalhe-test.local';
const SENHA = 'senha-' + randomBytes(8).toString('hex');

let app: INestApplication;
let req: supertest.Agent;
let admin: import('pg').Client;
let cookieAdminA: string;
let cookieOperA: string;
let cookieB: string;

async function seed(ten: string, slug: string) {
  await admin.query("INSERT INTO tenants (id, nome, slug) VALUES ($1,'Detalhe Test',$2)", [ten, slug]);
  await admin.query(
    `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel)
     VALUES ($1,'Admin',$2,$3,'admin')`,
    [ten, EMAIL, await hash(SENHA)]
  );
}

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
  await seed(TEN_A, SLUG_A);
  await seed(TEN_B, SLUG_B);
  await admin.query(
    `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel)
     VALUES ($1,'Operador',$2,$3,'operador')`,
    [TEN_A, EMAIL_OPER, await hash(SENHA)]
  );

  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
  cookieAdminA = await login(SLUG_A, EMAIL);
  cookieOperA = await login(SLUG_A, EMAIL_OPER);
  cookieB = await login(SLUG_B, EMAIL);
});

afterAll(async () => {
  await app.close();
  await limpar();
  void admin.end();
});

async function limpar() {
  for (const ten of [TEN_A, TEN_B]) {
    for (const sql of [
      'DELETE FROM excecoes WHERE tenant_id=$1',
      'DELETE FROM mensagens_comunicacao WHERE tenant_id=$1',
      'DELETE FROM itens_ciclo WHERE tenant_id=$1',
      'DELETE FROM ciclos WHERE tenant_id=$1',
      'DELETE FROM itens_template WHERE tenant_id=$1',
      'DELETE FROM checklist_templates WHERE tenant_id=$1',
      'DELETE FROM jobs_fila WHERE tenant_id=$1',
      'DELETE FROM obrigacoes WHERE tenant_id=$1',
      'DELETE FROM clientes WHERE tenant_id=$1',
      'DELETE FROM eventos_auditoria WHERE tenant_id=$1',
      'DELETE FROM sessoes WHERE tenant_id=$1',
      'DELETE FROM operadores WHERE tenant_id=$1',
      'DELETE FROM tenants WHERE id=$1',
    ]) {
      await admin.query(sql, [ten]);
    }
  }
}

async function criaCicloA(): Promise<string> {
  const c = await req.post('/clientes').set('Cookie', cookieAdminA).send({ nome: 'Cliente Detalhe', email: 'detalhe@local.test' });
  expect(c.status).toBe(201);
  const o = await req
    .post('/obrigacoes')
    .set('Cookie', cookieAdminA)
    .send({ cliente_id: c.body.id, descricao: 'Entrega de CNH' });
  expect(o.status).toBe(201);
  const r = await req.post('/ciclos').set('Cookie', cookieAdminA).send({ obrigacao_id: o.body.id });
  expect(r.status).toBe(201);
  return r.body.id;
}

describe('SRV · GET /ciclos/:cicloId — detalhe legível', () => {
  it('sem autenticação ⇒ 401', async () => {
    expect((await req.get('/ciclos/00000000-0000-0000-0000-000000000001')).status).toBe(401);
  });

  it('ciclo inexistente ⇒ 404', async () => {
    const r = await req
      .get('/ciclos/00000000-0000-0000-0000-000000000001')
      .set('Cookie', cookieAdminA);
    expect(r.status).toBe(404);
    expect(r.body.message).toBe('ciclo não encontrado');
  });

  it('admin acessa ciclo do próprio tenant com dados legíveis', async () => {
    const cicloId = await criaCicloA();
    const r = await req.get(`/ciclos/${cicloId}`).set('Cookie', cookieAdminA);
    expect(r.status).toBe(200);
    expect(r.body.estado).toBe('aberto');
    expect(r.body.cliente).toBe('Cliente Detalhe');
    expect(r.body.obrigacao).toBe('Entrega de CNH');
    expect(Array.isArray(r.body.itens)).toBe(true);
    expect(Array.isArray(r.body.comunicacoes)).toBe(true);
  });

  it('operador permitido acessa conforme RBAC de leitura', async () => {
    const cicloId = await criaCicloA();
    const r = await req.get(`/ciclos/${cicloId}`).set('Cookie', cookieOperA);
    expect(r.status).toBe(200);
    expect(r.body.obrigacao).toBe('Entrega de CNH');
  });

  it('ciclo de outro tenant ⇒ 404 (não vaza por RLS)', async () => {
    const cicloId = await criaCicloA();
    const r = await req.get(`/ciclos/${cicloId}`).set('Cookie', cookieB);
    expect(r.status).toBe(404);
  });

  it('itens + exceção aberta + comunicações retornados na ordem do template', async () => {
    const cicloId = await criaCicloA();
    const template = await admin.query(
      `INSERT INTO checklist_templates (tenant_id, nome) VALUES ($1,'CNH') RETURNING id`,
      [TEN_A]
    );
    const tplId = template.rows[0].id;
    const itensTpl: { id: string; ordem: number }[] = [];
    for (const [desc, ordem] of [
      ['Frente da CNH', 1],
      ['Verso da CNH', 2],
    ] as const) {
      const it = await admin.query(
        `INSERT INTO itens_template (tenant_id, template_id, descricao, ordem)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [TEN_A, tplId, desc, ordem]
      );
      itensTpl.push({ id: it.rows[0].id, ordem });
    }
    const item1 = (
      await admin.query(
        `INSERT INTO itens_ciclo (tenant_id, ciclo_id, item_template_id, estado, tentativas)
         VALUES ($1,$2,$3,'cobrado',1) RETURNING id`,
        [TEN_A, cicloId, itensTpl[0]!.id]
      )
    ).rows[0].id;
    const item2 = (
      await admin.query(
        `INSERT INTO itens_ciclo (tenant_id, ciclo_id, item_template_id, estado, tentativas)
         VALUES ($1,$2,$3,'excecao',3) RETURNING id`,
        [TEN_A, cicloId, itensTpl[1]!.id]
      )
    ).rows[0].id;
    await admin.query(
      `INSERT INTO excecoes (tenant_id, item_ciclo_id, tipo, motivo, contexto)
       VALUES ($1,$2,'sem_resposta','Cliente não respondeu','{}'::jsonb)`,
      [TEN_A, item2]
    );
    await admin.query(
      `INSERT INTO mensagens_comunicacao (tenant_id, item_ciclo_id, direcao, canal, destinatario, remetente, status, idempotency_key)
       VALUES ($1,$2,'envio','email','cliente@x.local','servium@x.local','enviado','detalhe-test-1')`,
      [TEN_A, item1]
    );

    const r = await req.get(`/ciclos/${cicloId}`).set('Cookie', cookieAdminA);
    expect(r.status).toBe(200);
    expect(r.body.itens).toHaveLength(2);
    expect(r.body.itens[0]).toMatchObject({ descricao: 'Frente da CNH', estado: 'cobrado', tentativas: 1 });
    expect(r.body.itens[0].excecao).toBeNull();
    expect(r.body.itens[1]).toMatchObject({ descricao: 'Verso da CNH', estado: 'excecao', tentativas: 3 });
    expect(r.body.itens[1].excecao).toMatchObject({ tipo: 'sem_resposta', motivo: 'Cliente não respondeu' });
    expect(r.body.comunicacoes).toHaveLength(1);
    expect(r.body.comunicacoes[0]).toMatchObject({ direcao: 'envio', status: 'enviado', destinatario: 'cliente@x.local' });
  });
});