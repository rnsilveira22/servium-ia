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
const SLUG_A = 'tenant-tpl-a';
const SLUG_B = 'tenant-tpl-b';
const EMAIL = 'admin@tpl-test.local';
const SENHA = 'senha-' + randomBytes(8).toString('hex');

const CORPO_OK =
  'Olá {{cliente_nome}}, precisamos de {{item_descricao}}.\n\nIdentificador: {{token_correlacao}}';

let app: INestApplication;
let req: supertest.Agent;
let admin: import('pg').Client;
let cookieA: string;
let cookieB: string;

async function seed(ten: string, slug: string) {
  await admin.query("INSERT INTO tenants (id, nome, slug) VALUES ($1,'Tpl Test',$2)", [ten, slug]);
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

async function criarChecklist(tag: string) {
  return req
    .post('/checklist-templates')
    .set('Cookie', cookieA)
    .send({
      nome: `Checklist ${tag}`,
      canal: 'email',
      itens: [{ descricao: 'Contrato social', tipo_esperado: 'documento' }],
    });
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
      'DELETE FROM obrigacoes WHERE tenant_id=$1',
      'DELETE FROM checklist_templates WHERE tenant_id=$1',
      'DELETE FROM email_templates WHERE tenant_id=$1',
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

describe('modelos de e-mail padrão', () => {
  it('CRUD básico do modelo (POST/GET/PUT/DELETE)', async () => {
    const criado = await req
      .post('/email-templates')
      .set('Cookie', cookieA)
      .send({ nome: 'Abertura de empresa', assunto: 'Documentação necessária', corpo: CORPO_OK });
    expect(criado.status).toBe(201);
    expect(criado.body.nome).toBe('Abertura de empresa');
    expect(criado.body.id).toBeDefined();

    const lista = await req.get('/email-templates').set('Cookie', cookieA);
    expect(lista.status).toBe(200);
    expect(lista.body.some((m: { id: string }) => m.id === criado.body.id)).toBe(true);

    const atualizado = await req
      .put(`/email-templates/${criado.body.id}`)
      .set('Cookie', cookieA)
      .send({ assunto: 'Assunto novo' });
    expect(atualizado.status).toBe(200);
    expect(atualizado.body.assunto).toBe('Assunto novo');
    expect(atualizado.body.corpo).toBe(CORPO_OK); // campos ausentes preservados

    const rem = await req.delete(`/email-templates/${criado.body.id}`).set('Cookie', cookieA);
    expect(rem.status).toBe(200);
    expect(rem.body.ok).toBe(true);
  });

  it('validações: corpo sem token de correlação ⇒ 400; nome vazio ⇒ 400', async () => {
    const r1 = await req
      .post('/email-templates')
      .set('Cookie', cookieA)
      .send({ nome: 'Sem token', assunto: 'X', corpo: 'sem placeholder' });
    expect(r1.status).toBe(400);
    expect(String(r1.body.message).toLowerCase()).toContain('token_correlacao');

    const r2 = await req
      .post('/email-templates')
      .set('Cookie', cookieA)
      .send({ nome: '  ', assunto: 'X', corpo: CORPO_OK });
    expect(r2.status).toBe(400);
  });

  it('isolamento RLS: modelo de A é invisível e inutilizável em B', async () => {
    const tplA = await req
      .post('/email-templates')
      .set('Cookie', cookieA)
      .send({ nome: 'Só A', assunto: 'a', corpo: CORPO_OK });
    expect(tplA.status).toBe(201);

    const listaB = await req.get('/email-templates').set('Cookie', cookieB);
    expect(listaB.body.some((m: { id: string }) => m.id === tplA.body.id)).toBe(false);

    // checklist de B não pode vincular modelo de A
    const checklistB = await req
      .post('/checklist-templates')
      .set('Cookie', cookieB)
      .send({ nome: 'Check B', itens: [{ descricao: 'Doc B' }], email_template_id: tplA.body.id });
    expect(checklistB.status).toBe(400);
  });

  it('vínculo checklist → modelo e desvínculo via PUT', async () => {
    const tpl = await req
      .post('/email-templates')
      .set('Cookie', cookieA)
      .send({ nome: 'Vincular', assunto: 'v', corpo: CORPO_OK });
    const cl = await criarChecklist('Vinculo');

    const vinculado = await req
      .put(`/checklist-templates/${cl.body.id}/vincular-email-template`)
      .set('Cookie', cookieA)
      .send({ email_template_id: tpl.body.id });
    expect(vinculado.status).toBe(200);
    expect(vinculado.body.email_template_id).toBe(tpl.body.id);
    expect(vinculado.body.email_template_nome).toBe('Vincular');

    const desvinculado = await req
      .put(`/checklist-templates/${cl.body.id}/vincular-email-template`)
      .set('Cookie', cookieA)
      .send({ email_template_id: null });
    expect(desvinculado.status).toBe(200);
    expect(desvinculado.body.email_template_id).toBeNull();
  });

  it('vincular modelo de OUTRO tenant ⇒ 400', async () => {
    const tplA = await req
      .post('/email-templates')
      .set('Cookie', cookieA)
      .send({ nome: 'Cross', assunto: 'x', corpo: CORPO_OK });
    const clB = await req
      .post('/checklist-templates')
      .set('Cookie', cookieB)
      .send({ nome: 'Check Cross', itens: [{ descricao: 'Doc' }] });
    expect(clB.status).toBe(201);

    const negado = await req
      .put(`/checklist-templates/${clB.body.id}/vincular-email-template`)
      .set('Cookie', cookieB)
      .send({ email_template_id: tplA.body.id });
    expect(negado.status).toBe(400);
  });

  it('criar checklist já vinculado ⇒ retorna email_template_nome no DTO', async () => {
    const tpl = await req
      .post('/email-templates')
      .set('Cookie', cookieA)
      .send({ nome: 'Pré-vinculado', assunto: 'p', corpo: CORPO_OK });
    const cl = await req
      .post('/checklist-templates')
      .set('Cookie', cookieA)
      .send({
        nome: 'Check Pré',
        itens: [{ descricao: 'Doc' }],
        email_template_id: tpl.body.id,
      });
    expect(cl.status).toBe(201);
    expect(cl.body.email_template_id).toBe(tpl.body.id);
    expect(cl.body.email_template_nome).toBe('Pré-vinculado');
  });
});