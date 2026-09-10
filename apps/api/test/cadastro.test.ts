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
      // obrigacoes referencia checklist_templates via FK (template_id) — deletar antes
      'DELETE FROM obrigacoes WHERE tenant_id=$1',
      'DELETE FROM checklist_templates WHERE tenant_id=$1',
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
      await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Só A', email: 'so-a@acme.local' })
    ).body;
    const listaB = await req.get('/clientes').set('Cookie', cookieB);
    expect(listaB.body.some((x: { id: string }) => x.id === c.id)).toBe(false);
  });

  it('obrigação exige cliente do MESMO tenant (FK não vaza por RLS)', async () => {
    const cA = (await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Cliente A', email: 'clienteA@acme.local' })).body;
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
    expect(ok.body.template_id).toBeNull(); // retrocompat: sem template
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
    const c = (await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Auditado', email: 'auditado@acme.local' })).body;
    const { rows } = await admin.query(
      "SELECT acao, actor_type FROM eventos_auditoria WHERE entidade='cliente' AND entidade_id=$1",
      [c.id]
    );
    expect(rows[0]).toMatchObject({ acao: 'criar', actor_type: 'operador' });
  });
});

describe('M1-OPS-04A · e-mail obrigatório e validado em POST /clientes (novos)', () => {
  it('sem email ⇒ 400 orientativo e NÃO cria cliente', async () => {
    const r = await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Sem Email' });
    expect(r.status).toBe(400);
    expect(String(r.body.message).toLowerCase()).toContain('email');
    const lista = await req.get('/clientes').set('Cookie', cookieA);
    expect(lista.body.some((c: { nome: string }) => c.nome === 'Sem Email')).toBe(false);
  });

  it('email inválido ou com CRLF/linha nova ⇒ 400 e NÃO cria (anti injeção)', async () => {
    const invalidos = ['nao-e-email', 'a@b', 'foo@bar.com\r\nBcc: x@y.com', 'foo@bar.com\ninject'];
    for (const email of invalidos) {
      const r = await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Inject', email });
      expect(r.status, `email=${JSON.stringify(email)}`).toBe(400);
    }
    const lista = await req.get('/clientes').set('Cookie', cookieA);
    expect(lista.body.some((c: { nome: string }) => c.nome === 'Inject')).toBe(false);
  });

  it('email válido ⇒ 201 e persistido', async () => {
    const r = await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Com Email', email: 'com.email@acme.local' });
    expect(r.status).toBe(201);
    expect(r.body.email).toBe('com.email@acme.local');
  });

  it('legados intocados: tentativas inválidas não alteram/não adicionam linhas', async () => {
    const antes = await req.get('/clientes').set('Cookie', cookieA);
    const countAntes = antes.body.length;
    await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Tentativa', email: 'bad\r\nBcc: x' });
    await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Tentativa' });
    const depois = await req.get('/clientes').set('Cookie', cookieA);
    expect(depois.body.length).toBe(countAntes);
    expect(depois.body.some((c: { nome: string }) => c.nome === 'Tentativa')).toBe(false);
  });
});

describe('M1-OPS-01 · template_id em obrigação via API (contrato DTO+rota)', () => {
  it('criar com template válido do mesmo tenant ⇒ 201 expõe template_id + template_nome', async () => {
    const cli = (
      await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Tpl Cliente', email: 'tplcliente@acme.local' })
    ).body;
    const tpl = await req.post('/checklist-templates').set('Cookie', cookieA).send({
      nome: 'OPS01',
      itens: [{ descricao: 'Doc 1' }],
    });
    expect(tpl.status).toBe(201);
    const criada = await req
      .post('/obrigacoes')
      .set('Cookie', cookieA)
      .send({ cliente_id: cli.id, descricao: 'Com template', template_id: tpl.body.id });
    expect(criada.status).toBe(201);
    expect(criada.body.template_id).toBe(tpl.body.id);
    expect(criada.body.template_nome).toBe('OPS01');
  });

  it('template de OUTRO tenant ⇒ 404 orientativo e NÃO cria obrigação', async () => {
    const cliB = (
      await req.post('/clientes').set('Cookie', cookieB).send({ nome: 'Tpl B', email: 'tplb@acme.local' })
    ).body;
    const tplA = await req.post('/checklist-templates').set('Cookie', cookieA).send({
      nome: 'OPS01-B',
      itens: [{ descricao: 'Doc B' }],
    });
    const negada = await req
      .post('/obrigacoes')
      .set('Cookie', cookieB)
      .send({ cliente_id: cliB.id, descricao: 'cross tenant', template_id: tplA.body.id });
    expect(negada.status).toBe(404);
    expect(String(negada.body.message).toLowerCase()).toContain('template');
    const listaB = await req.get('/obrigacoes').set('Cookie', cookieB);
    expect(listaB.body.some((o: { descricao: string }) => o.descricao === 'cross tenant')).toBe(false);
  });

  it('template inexistente ⇒ 404 orientativo e NÃO cria', async () => {
    const cli = (
      await req.post('/clientes').set('Cookie', cookieA).send({ nome: 'Tpl X', email: 'tplx@acme.local' })
    ).body;
    const r = await req
      .post('/obrigacoes')
      .set('Cookie', cookieA)
      .send({ cliente_id: cli.id, descricao: 'nao existe', template_id: '00000000-0000-0000-0000-000000000000' });
    expect(r.status).toBe(404);
    expect(String(r.body.message).toLowerCase()).toContain('template');
  });

  it('GET /obrigacoes lista template_id e template_nome via LEFT JOIN', async () => {
    const lista = await req.get('/obrigacoes').set('Cookie', cookieA);
    const comTpl = lista.body.find((o: { template_nome: string | null }) => o.template_nome === 'OPS01');
    expect(comTpl).toBeTruthy();
    expect(comTpl.template_id).toBeTruthy();
  });
});
