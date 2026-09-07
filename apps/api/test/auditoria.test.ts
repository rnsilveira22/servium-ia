import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import pg from 'pg';

import { ADMIN_URL, APP_URL, claimJobs, completeJob, enqueue } from '@servium-ia/db';
import { FakeChannel } from '../src/motor/channel';
import { registrarMotorHandlers } from '../src/motor/handlers';
import { buildApp } from '../src/app.factory';

const TEN = 'eeee0000-0000-0000-0000-00000000aa01';
const SLUG = 'tenant-auditoria-test';
const ADMIN_EMAIL = 'admin@auditoria-test.local';
const OP_EMAIL = 'op@auditoria-test.local';
const SENHA = 'senha-' + randomBytes(8).toString('hex');

// Tenant B: usado apenas para provar isolamento cross-tenant via HTTP (CA-04-2).
const TEN_B = 'eeee0000-0000-0000-0000-00000000bb02';
const ITEM_B = 'dddd0000-0000-0000-0000-0000000000b2';

let app: INestApplication;
let req: supertest.Agent;
let admin: pg.Client;
let ctx: pg.Client;
let cookieAdmin: string;
let cookieOp: string;
let itemId: string;

const canal = new FakeChannel();
const handlers = registrarMotorHandlers({ channel: canal });

async function rodarJobs(maxIter = 30): Promise<number> {
  let n = 0;
  for (let i = 0; i < maxIter; i++) {
    const jobs = await claimJobs(admin, 10);
    if (jobs.length === 0) break;
    for (const j of jobs) {
      try {
        const h = handlers.get(j.tipo);
        if (!h) throw new Error(`sem handler ${j.tipo}`);
        await h(j, ctx);
        await completeJob(ctx, j.id);
      } catch (err) {
        await ctx.query(
          `UPDATE jobs_fila SET tentativas=tentativas+1,
             estado = CASE WHEN tentativas+1 >= max_tentativas THEN 'falha' ELSE 'pendente' END,
             disponivel_em = now(), ultimo_erro=$2 WHERE id=$1`,
          [j.id, String((err as Error).message)]
        );
      }
      n++;
    }
  }
  return n;
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await admin.query("INSERT INTO tenants (id, nome, slug) VALUES ($1,'Auditoria Test',$2)", [TEN, SLUG]);
  await admin.query(
    "INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel) VALUES ($1,'Admin',$2,$3,'admin')",
    [TEN, ADMIN_EMAIL, await (await import('@node-rs/argon2')).hash(SENHA)]
  );
  await admin.query(
    "INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel) VALUES ($1,'Operador',$2,$3,'operador')",
    [TEN, OP_EMAIL, await (await import('@node-rs/argon2')).hash(SENHA)]
  );

  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id, nome, email) VALUES ($1,'Cliente Audit','cliente@auditoria.local') RETURNING id",
    [TEN]
  );
  const { rows: tpl } = await admin.query(
    "INSERT INTO checklist_templates (tenant_id, nome) VALUES ($1,'Tpl Audit') RETURNING id",
    [TEN]
  );
  await admin.query(
    "INSERT INTO itens_template (tenant_id, template_id, descricao, tipo_esperado) VALUES ($1,$2,'Contrato social','documento')",
    [TEN, tpl[0]!.id]
  );
  const { rows: obl } = await admin.query(
    "INSERT INTO obrigacoes (tenant_id, cliente_id, descricao, template_id) VALUES ($1,$2,'Obrigação audit',$3) RETURNING id",
    [TEN, cli[0]!.id, tpl[0]!.id]
  );

  // Tenant B + evento de auditoria "de B" (nunca acessível pelo admin de A).
  await admin.query("INSERT INTO tenants (id, nome) VALUES ($1,'Auditoria B')", [TEN_B]);
  await admin.query(
    `INSERT INTO eventos_auditoria (tenant_id, actor_type, entidade, entidade_id, acao, detalhes)
     VALUES ($1,'sistema','item_ciclo',$2,'cobrar','{"rodada":1}')`,
    [TEN_B, ITEM_B]
  );

  ctx = new pg.Client({ connectionString: APP_URL });
  await ctx.connect();
  await ctx.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);

  // CA-04-1: dispara evento REAL de cobrança via motor (handlers + fila).
  const cicloId = randomUUID();
  await ctx.query("INSERT INTO ciclos (id, tenant_id, obrigacao_id) VALUES ($1,$2,$3)", [cicloId, TEN, obl[0]!.id]);
  await ctx.query(
    `UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
    [cicloId]
  );
  await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: cicloId }, idempotencyKey: `aud-ativar:${cicloId}` });
  await rodarJobs();

  const { rows: itens } = await ctx.query("SELECT id FROM itens_ciclo WHERE ciclo_id=$1", [cicloId]);
  expect(itens).toHaveLength(1);
  itemId = itens[0]!.id;

  // monta API + cookies
  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
  const loginAdmin = await req.post('/auth/login').send({ slug: SLUG, email: ADMIN_EMAIL, senha: SENHA });
  cookieAdmin = loginAdmin.headers['set-cookie'][0].split(';')[0];
  const loginOp = await req.post('/auth/login').send({ slug: SLUG, email: OP_EMAIL, senha: SENHA });
  cookieOp = loginOp.headers['set-cookie'][0].split(';')[0];
});

afterAll(async () => {
  await app.close();
  await limpar();
  void admin.end();
  void ctx.end();
});

async function limpar() {
  await admin.query('DELETE FROM eventos_auditoria WHERE tenant_id=$1', [TEN_B]);
  await admin.query('DELETE FROM tenants WHERE id=$1', [TEN_B]);
  await admin.query('DELETE FROM jobs_fila WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM eventos_auditoria WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM excecoes WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM mensagens_comunicacao WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM documentos WHERE tenant_id=$1', [TEN]);
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

describe('PRM-P0.2-A · GET /auditoria (Issue #51)', () => {
  it('CA-04-1: admin vê o evento real cobrar com rodada correta', async () => {
    const r = await req
      .get('/auditoria')
      .query({ entidade: 'item_ciclo', entidade_id: itemId, acao: 'cobrar' })
      .set('Cookie', cookieAdmin);
    expect(r.status).toBe(200);
    expect(r.body.eventos).toHaveLength(1);
    expect(r.body.tem_mais).toBe(false);
    const ev = r.body.eventos[0];
    expect(ev.entidade).toBe('item_ciclo');
    expect(ev.entidade_id).toBe(itemId);
    expect(ev.acao).toBe('cobrar');
    expect(ev.detalhes.rodada).toBe(1);
    expect(typeof ev.criado_em).toBe('string');
  });

  it('CA-04-2: admin de A não enxerga nenhum evento de B (RLS via HTTP)', async () => {
    const r = await req
      .get('/auditoria')
      .query({ entidade: 'item_ciclo', entidade_id: ITEM_B, acao: 'cobrar' })
      .set('Cookie', cookieAdmin);
    expect(r.status).toBe(200);
    expect(r.body.eventos).toEqual([]);
    expect(r.body.tem_mais).toBe(false);
  });

  it('CA-04-3: operador ⇒ 403; anônimo ⇒ 401', async () => {
    expect((await req.get('/auditoria').set('Cookie', cookieOp)).status).toBe(403);
    expect((await req.get('/auditoria')).status).toBe(401);
  });

  it('validações de entrada ⇒ 400 (impede 22P02 no SQL)', async () => {
    const casos: Record<string, string>[] = [
      { entidade_id: 'nao-e-uuid' },
      { antes_id: 'nao-e-uuid' },
      { limite: '0' },
      { limite: '201' },
      { limite: 'abc' },
      { entidade: '' },
      { antes_de: 'nao-e-timestamp', antes_id: 'dddd0000-0000-0000-0000-000000000001' },
      { antes_de: '2026-09-01T10:00:00.000Z' }, // cursor incompleto (sem antes_id)
    ];
    for (const q of casos) {
      const r = await req.get('/auditoria').query(q).set('Cookie', cookieAdmin);
      expect(r.status, JSON.stringify(q)).toBe(400);
    }
  });

  it('paginação keyset funciona pelo endpoint (cursor devolve página seguinte)', async () => {
    const p1 = await req
      .get('/auditoria')
      .query({ entidade: 'item_ciclo', entidade_id: itemId, acao: 'cobrar', limite: '1' })
      .set('Cookie', cookieAdmin);
    expect(p1.status).toBe(200);
    expect(p1.body.eventos).toHaveLength(1);
    expect(p1.body.tem_mais).toBe(false);
    const ev = p1.body.eventos[0];
    // cursor do último evento
    const p2 = await req
      .get('/auditoria')
      .query({ antes_de: ev.criado_em, antes_id: ev.id })
      .set('Cookie', cookieAdmin);
    expect(p2.status).toBe(200);
    expect(p2.body.tem_mais).toBe(false);
    // página 2 começa estritamente após o cursor (nenhum evento repetido)
    expect(p2.body.eventos.every((e: { id: string }) => e.id !== ev.id)).toBe(true);
  });
});