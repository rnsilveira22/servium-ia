import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import pg from 'pg';

import { ADMIN_URL, APP_URL, claimJobs, completeJob, enqueue } from '@servium-ia/db';
import { FakeChannel } from '../src/motor/channel';
import { registrarMotorHandlers } from '../src/motor/handlers';
import { buildApp } from '../src/app.factory';

const TEN = 'bbbb0000-0000-0000-0000-000000000001';
const SLUG = 'tenant-exc-test';
const ADMIN_EMAIL = 'admin@exc-test.local';
const OP_EMAIL = 'op@exc-test.local';
const SENHA = 'senha-' + randomBytes(8).toString('hex');

let app: INestApplication;
let req: supertest.Agent;
let admin: pg.Client;
let ctx: pg.Client;
let cookieAdmin: string;
let cookieOp: string;
let cicloId: string;
let itemExcId: string;

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

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Exc Test',$2)", [TEN, SLUG]);
  await admin.query(
    "INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel) VALUES ($1,'Admin',$2,$3,'admin')",
    [TEN, ADMIN_EMAIL, await (await import('@node-rs/argon2')).hash(SENHA)]
  );
  await admin.query(
    "INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel) VALUES ($1,'Operador',$2,$3,'operador')",
    [TEN, OP_EMAIL, await (await import('@node-rs/argon2')).hash(SENHA)]
  );
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Exc','exc@exc.local') RETURNING id",
    [TEN]
  );
  const { rows: tpl } = await admin.query(
    "INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'Tpl Exc') RETURNING id",
    [TEN]
  );
  for (const [desc, tipo] of [
    ['Contrato social', 'documento'],
    ['CNPJ', 'informacao'],
  ] as const) {
    await admin.query(
      "INSERT INTO itens_template (tenant_id,template_id,descricao,tipo_esperado) VALUES ($1,$2,$3,$4)",
      [TEN, tpl[0]!.id, desc, tipo]
    );
  }
  const { rows: obl } = await admin.query(
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao,template_id) VALUES ($1,$2,'Obrigação exc',$3) RETURNING id",
    [TEN, cli[0]!.id, tpl[0]!.id]
  );

  ctx = new pg.Client({ connectionString: APP_URL });
  await ctx.connect();
  await ctx.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);

  // cria ciclo + força exceção via motor
  cicloId = randomUUID();
  await ctx.query("INSERT INTO ciclos (id,tenant_id,obrigacao_id) VALUES ($1,$2,$3)", [cicloId, TEN, obl[0]!.id]);
  await ctx.query(
    `UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":1,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
    [cicloId]
  );
  await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: cicloId }, idempotencyKey: `exc-ativar:${cicloId}` });
  await rodarJobs();

  // força tentativa acima do limite (1) para gerar exceção
  await ctx.query('UPDATE itens_ciclo SET tentativas=1 WHERE ciclo_id=$1', [cicloId]);
  await enqueue(ctx, { tipo: 'ciclo.tick', payload: { ciclo_id: cicloId }, idempotencyKey: `exc-tick:${cicloId}` });
  await rodarJobs();

  const { rows: exc } = await ctx.query("SELECT id FROM excecoes WHERE tipo='escalada_limite' LIMIT 1");
  itemExcId = exc[0]?.id ? (await ctx.query("SELECT id FROM itens_ciclo WHERE ciclo_id=$1 AND estado='excecao' LIMIT 1", [cicloId])).rows[0]!.id : '';

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
  for (const sql of [
    'DELETE FROM jobs_fila WHERE tenant_id=$1',
    'DELETE FROM eventos_auditoria WHERE tenant_id=$1',
    'DELETE FROM excecoes WHERE tenant_id=$1',
    'DELETE FROM mensagens_comunicacao WHERE tenant_id=$1',
    'DELETE FROM documentos WHERE tenant_id=$1',
    'DELETE FROM itens_ciclo WHERE tenant_id=$1',
    'DELETE FROM ciclos WHERE tenant_id=$1',
    'DELETE FROM obrigacoes WHERE tenant_id=$1',
    'DELETE FROM itens_template WHERE tenant_id=$1',
    'DELETE FROM checklist_templates WHERE tenant_id=$1',
    'DELETE FROM clientes WHERE tenant_id=$1',
    'DELETE FROM sessoes WHERE tenant_id=$1',
    'DELETE FROM operadores WHERE tenant_id=$1',
    'DELETE FROM tenants WHERE id=$1',
  ]) {
    await admin.query(sql, [TEN]);
  }
}

describe('SRV-17 · fila de exceções e intervenção humana', () => {
  it('CA-01/CA-02: listar exceções abertas com contexto (item, ciclo, tenant)', async () => {
    const r = await req.get(`/ciclos/${cicloId}/excecoes`).set('Cookie', cookieAdmin);
    expect(r.status).toBe(200);
    expect(r.body.length).toBeGreaterThanOrEqual(1);
    const exc = r.body.find((e: { item_id: string }) => e.item_id === itemExcId);
    expect(exc).toBeDefined();
    expect(exc.tipo).toBe('escalada_limite');
    expect(exc.item_descricao).toBeDefined();
    expect(exc.cliente_nome).toBeDefined();
    expect(exc.desfecho == null).toBe(true);
  });

  it('operador também pode listar exceções', async () => {
    const r = await req.get(`/ciclos/${cicloId}/excecoes`).set('Cookie', cookieOp);
    expect(r.status).toBe(200);
  });

  it('sem autenticação ⇒ 401', async () => {
    expect((await req.get(`/ciclos/${cicloId}/excecoes`)).status).toBe(401);
  });

  it('CA-03/CA-05: resolver item em exceção + auditoria', async () => {
    const { rows: alvo } = await ctx.query(
      "SELECT i.id FROM itens_ciclo i JOIN excecoes e ON e.item_ciclo_id=i.id WHERE e.desfecho IS NULL LIMIT 1"
    );
    expect(alvo.length).toBe(1);
    const id = alvo[0]!.id;

    const r = await req.post(`/ciclos/itens/${id}/decidir`).set('Cookie', cookieAdmin).send({ desfecho: 'resolvido' });
    expect(r.status).toBe(201);

    const { rows: pos } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [id]);
    expect(pos[0].estado).toBe('resolvido');

    const { rows: aud } = await ctx.query(
      "SELECT acao, detalhes FROM eventos_auditoria WHERE entidade='item_ciclo' AND entidade_id=$1 AND acao='decidir'",
      [id]
    );
    expect(aud.length).toBe(1);
    expect(aud[0].detalhes.desfecho).toBe('resolvido');
  });

  it('CA-04: operador NÃO pode decidir (só admin)', async () => {
    const r = await req.post(`/ciclos/itens/${itemExcId}/decidir`).set('Cookie', cookieOp).send({ desfecho: 'cancelado' });
    expect(r.status).toBe(403);
  });

  it('CA-03: reenviar devolve item ao fluxo do motor + fecha exceção', async () => {
    // cria nova exceção para testar reenvio
    const { rows: ciclo2 } = await ctx.query("INSERT INTO ciclos (id,tenant_id,obrigacao_id) VALUES ($1,$2,$3) RETURNING id", [
      randomUUID(), TEN, (await ctx.query("SELECT id FROM obrigacoes LIMIT 1")).rows[0].id,
    ]);
    await ctx.query(
      `UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":1,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
      [ciclo2[0].id]
    );
    await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: ciclo2[0].id }, idempotencyKey: `exc-ativar2:${ciclo2[0].id}` });
    await rodarJobs();
    await ctx.query('UPDATE itens_ciclo SET tentativas=1 WHERE ciclo_id=$1', [ciclo2[0].id]);
    await enqueue(ctx, { tipo: 'ciclo.tick', payload: { ciclo_id: ciclo2[0].id }, idempotencyKey: `exc-tick2:${ciclo2[0].id}` });
    await rodarJobs();

    const { rows: novos } = await ctx.query("SELECT id FROM itens_ciclo WHERE ciclo_id=$1 AND estado='excecao'", [ciclo2[0].id]);
    expect(novos.length).toBeGreaterThanOrEqual(1);

    const r = await req.post(`/ciclos/itens/${novos[0].id}/reenviar`).set('Cookie', cookieAdmin);
    expect(r.status).toBe(201);

    const { rows: pos } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [novos[0].id]);
    expect(pos[0].estado).toBe('aguardando');

    const { rows: fechada } = await ctx.query(
      "SELECT desfecho FROM excecoes WHERE item_ciclo_id=$1 ORDER BY criado_em DESC LIMIT 1",
      [novos[0].id]
    );
    expect(fechada[0].desfecho).toBe('reenviado');

    const { rows: aud } = await ctx.query(
      "SELECT acao FROM eventos_auditoria WHERE entidade='item_ciclo' AND entidade_id=$1 AND acao='reenviar'",
      [novos[0].id]
    );
    expect(aud.length).toBe(1);
  });

});
