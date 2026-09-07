import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { hash } from '@node-rs/argon2';

import { ADMIN_URL } from '@servium-ia/db';
import { buildApp } from '../src/app.factory';

// Tenants EXCLUSIVOS deste arquivo (paralelismo vitest — lição SRV-7)
const TEN_A = '99999999-9999-9999-9999-999999999991';
const TEN_B = '99999999-9999-9999-9999-999999999992';
const SLUG_A = 'tenant-cad-a';
const SLUG_B = 'tenant-cad-b';
const EMAIL = 'admin@cad-test.local';
const SENHA = 'senha-' + randomBytes(8).toString('hex');

let app: INestApplication;
let req: supertest.Agent;
let admin: import('pg').Client;
let cookieA: string;
let cookieB: string;

async function seed(ten: string, slug: string) {
  await admin.query("INSERT INTO tenants (id, nome, slug) VALUES ($1,'Cad Test',$2)", [ten, slug]);
  await admin.query(
    `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel)
     VALUES ($1,'Admin',$2,$3,'admin')`,
    [ten, EMAIL, await hash(SENHA)]
  );
}

async function login(slug: string): Promise<string> {
  const r = await req.post('/auth/login').send({ slug, email: EMAIL, senha: SENHA });
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

  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
  cookieA = await login(SLUG_A);
  cookieB = await login(SLUG_B);
});

afterAll(async () => {
  await app.close();
  await limpar();
  void admin.end();
});

async function limpar() {
  for (const ten of [TEN_A, TEN_B]) {
    for (const sql of [
      'DELETE FROM itens_template WHERE tenant_id=$1',
      'DELETE FROM checklist_templates WHERE tenant_id=$1',
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

describe('SRV-16 · cadastro mínimo', () => {
  it('POST/GET /clientes cria e lista no contexto do tenant', async () => {
    const r = await req.post('/clientes').set('Cookie', cookieA).send({ nome: ' Acme ', email: 'a@acme.local' });
    expect(r.status).toBe(201);
    expect(r.body.nome).toBe('Acme');
    const lista = await req.get('/clientes').set('Cookie', cookieA);
    expect(lista.status).toBe(200);
    expect(lista.body.some((c: { id: string }) => c.id === r.body.id)).toBe(true);
  });

  it('sem autenticação ⇒ 401', async () => {
    expect((await req.post('/clientes').send({ nome: 'x' })).status).toBe(401);
    expect((await req.get('/clientes')).status).toBe(401);
  });

  it('validação de DTO ⇒ 400 (nome vazio)', async () => {
    expect((await req.post('/clientes').set('Cookie', cookieA).send({ nome: '  ' })).status).toBe(400);
  });

  it('isolamento: cliente de A é invisível para B', async () => {
    const c = (
      await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Só A' })
    ).body;
    const listaB = await req.get('/clientes').set('Cookie', cookieB);
    expect(listaB.body.some((x: { id: string }) => x.id === c.id)).toBe(false);
  });

  it('obrigação exige cliente do MESMO tenant (FK não vaza por RLS)', async () => {
    const cA = (await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Cliente A' })).body;
    const negada = await req
      .post('/obrigacoes')
      .set('Cookie', cookieB)
      .send({ cliente_id: cA.id, descricao: 'contrato' });
    expect(negada.status).toBe(400);

    const ok = await req
      .post('/obrigacoes')
      .set('Cookie', cookieA)
      .send({ cliente_id: cA.id, descricao: 'Contrato social', prazo: '2026-09-30' });
    expect(ok.status).toBe(201);
    expect(ok.body.prazo).toBe('2026-09-30');
  });

  it('template + itens atômicos; item inválido desfaz TUDO', async () => {
    const ruim = await req.post('/checklist-templates').set('Cookie', cookieA).send({
      nome: 'Ruim',
      itens: [{ descricao: 'doc ok' }, { descricao: 'tipo errado', tipo_esperado: 'video' }],
    });
    expect(ruim.status).toBe(400);
    const vazios = await req.get('/checklist-templates').set('Cookie', cookieA);
    expect(vazios.body.filter((t: { nome: string }) => t.nome === 'Ruim')).toHaveLength(0); // rollback

    const bom = await req.post('/checklist-templates').set('Cookie', cookieA).send({
      nome: 'Fiscalização',
      canal: 'email',
      itens: [
        { descricao: 'Contrato social', tipo_esperado: 'documento', tamanho_max_bytes: 10485760 },
        { descricao: 'CNPJ', tipo_esperado: 'informacao', ordem: 2 },
        { descricao: 'Assinatura digital', tipo_esperado: 'assinatura' },
      ],
    });
    expect(bom.status).toBe(201);
    expect(bom.body.itens).toHaveLength(3);
    expect(bom.body.itens[0].ordem).toBe(1);
    expect(bom.body.itens[2].tipo_esperado).toBe('assinatura');

    // template de A não aparece para B (RLS)
    const tplsB = await req.get('/checklist-templates').set('Cookie', cookieB);
    expect(tplsB.body.some((t: { id: string }) => t.id === bom.body.id)).toBe(false);
  });

  it('auditoria registrar criar_* com actor operador', async () => {
    const c = (await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Auditado' })).body;
    const { rows } = await admin.query(
      "SELECT acao, actor_type FROM eventos_auditoria WHERE entidade='cliente' AND entidade_id=$1",
      [c.id]
    );
    expect(rows[0]).toMatchObject({ acao: 'criar', actor_type: 'operador' });
  });
});
