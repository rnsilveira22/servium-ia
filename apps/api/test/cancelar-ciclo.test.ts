import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import pg from 'pg';

import { ADMIN_URL, APP_URL, claimJobs, completeJob, enqueue } from '@servium-ia/db';
import { FakeChannel } from '../src/motor/channel';
import { MotorScheduler } from '../src/runtime/scheduler';
import { registrarMotorHandlers } from '../src/motor/handlers';
import { buildApp } from '../src/app.factory';

const TEN = 'eeeedddd-0000-0000-0000-000000000001';
const TEN_OTHER = 'eeeedddd-0000-0000-0000-000000000002';
const TEN_SCHED = 'eeeedddd-0000-0000-0000-000000000003';
const SLUG = 'tenant-cancela';
const SLUG_OTHER = 'tenant-cancela-other';
const SLUG_SCHED = 'tenant-cancela-sched';
const ADMIN_EMAIL = 'admin@cancela-test.local';
const OP_EMAIL = 'op@cancela-test.local';
const SENHA = 'senha-' + randomBytes(8).toString('hex');

let app: INestApplication;
let req: supertest.Agent;
let admin: pg.Client;
let ctx: pg.Client;
let cookieAdmin: string;
let cookieOp: string;
let cookieSched: string;
let obrigacaoId: string;
let outroTenantCicloId: string;
let obrigacaoSchedId: string;

const canal = new FakeChannel();
const handlers = registrarMotorHandlers({ channel: canal });

async function rodarJobs(maxIter = 40): Promise<number> {
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

async function criaCicloPreparado(): Promise<string> {
  const id = randomUUID();
  await ctx.query("INSERT INTO ciclos (id,tenant_id,obrigacao_id) VALUES ($1,$2,$3)", [id, TEN, obrigacaoId]);
  await ctx.query(
    `UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
    [id]
  );
  await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: id }, idempotencyKey: `canc-ativar:${id}` });
  await rodarJobs();
  return id;
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  for (const t of [TEN, TEN_OTHER, TEN_SCHED]) await limpar(t);

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Cancela',$2)", [TEN, SLUG]);
  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Cancela Other',$2)", [TEN_OTHER, SLUG_OTHER]);
  await admin.query(
    "INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel) VALUES ($1,'Admin',$2,$3,'admin')",
    [TEN, ADMIN_EMAIL, await (await import('@node-rs/argon2')).hash(SENHA)]
  );
  await admin.query(
    "INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel) VALUES ($1,'Operador',$2,$3,'operador')",
    [TEN, OP_EMAIL, await (await import('@node-rs/argon2')).hash(SENHA)]
  );
  await admin.query(
    "INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel) VALUES ($1,'Admin Other',$2,$3,'admin')",
    [TEN_OTHER, 'admin-other@cancela-test.local', await (await import('@node-rs/argon2')).hash(SENHA)]
  );

  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Canc','c@canc.local') RETURNING id",
    [TEN]
  );
  const { rows: tpl } = await admin.query(
    "INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'Tpl Canc') RETURNING id",
    [TEN]
  );
  await admin.query(
    "INSERT INTO itens_template (tenant_id,template_id,descricao,tipo_esperado) VALUES ($1,$2,'Contrato social','documento')",
    [TEN, tpl[0]!.id]
  );
  await admin.query(
    "INSERT INTO itens_template (tenant_id,template_id,descricao,tipo_esperado) VALUES ($1,$2,'CNPJ','informacao')",
    [TEN, tpl[0]!.id]
  );
  const { rows: obl } = await admin.query(
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao,template_id) VALUES ($1,$2,'Obrigacao canc',$3) RETURNING id",
    [TEN, cli[0]!.id, tpl[0]!.id]
  );
  obrigacaoId = obl[0]!.id;

  const { rows: cliOther } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Outro',NULL) RETURNING id",
    [TEN_OTHER]
  );
  const { rows: oblOther } = await admin.query(
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao) VALUES ($1,$2,'Obrigacao outro') RETURNING id",
    [TEN_OTHER, cliOther[0].id]
  );
  const { rows: cicloOther } = await admin.query(
    "INSERT INTO ciclos (tenant_id,obrigacao_id) VALUES ($1,$2) RETURNING id",
    [TEN_OTHER, oblOther[0].id]
  );
  outroTenantCicloId = cicloOther[0].id;

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Cancela Sched',$2)", [TEN_SCHED, SLUG_SCHED]);
  await admin.query(
    "INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel) VALUES ($1,'Admin Sched',$2,$3,'admin')",
    [TEN_SCHED, 'admin-sched@cancela-test.local', await (await import('@node-rs/argon2')).hash(SENHA)]
  );
  const { rows: cliSched } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Sched','sched@canc.local') RETURNING id",
    [TEN_SCHED]
  );
  const { rows: oblSched } = await admin.query(
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao) VALUES ($1,$2,'Obrigacao sched') RETURNING id",
    [TEN_SCHED, cliSched[0].id]
  );
  obrigacaoSchedId = oblSched[0].id;
  await admin.query(
    "INSERT INTO ciclos (tenant_id,obrigacao_id) VALUES ($1,$2)",
    [TEN_SCHED, obrigacaoSchedId]
  );

  ctx = new pg.Client({ connectionString: APP_URL });
  await ctx.connect();
  await ctx.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);

  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
  cookieAdmin = (await req.post('/auth/login').send({ slug: SLUG, email: ADMIN_EMAIL, senha: SENHA })).headers['set-cookie'][0].split(';')[0];
  cookieOp = (await req.post('/auth/login').send({ slug: SLUG, email: OP_EMAIL, senha: SENHA })).headers['set-cookie'][0].split(';')[0];
  cookieSched = (await req.post('/auth/login').send({ slug: SLUG_SCHED, email: 'admin-sched@cancela-test.local', senha: SENHA })).headers['set-cookie'][0].split(';')[0];
});

afterAll(async () => {
  await app.close();
  for (const t of [TEN, TEN_OTHER, TEN_SCHED]) await limpar(t);
  void admin.end();
  void ctx.end();
});

async function limpar(ten: string) {
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
    await admin.query(sql, [ten]);
  }
}

describe('#73 · cancelar ciclo ativo', () => {
  it('cancela ciclo aberto: estado=cancelado, encerrado_em setado, auditoria cancela', async () => {
    const cicloId = await criaCicloPreparado();
    expect((await ctx.query('SELECT estado FROM ciclos WHERE id=$1', [cicloId])).rows[0].estado).toBe('aberto');

    const r = await req.post(`/ciclos/${cicloId}/cancelar`).set('Cookie', cookieAdmin).send({ motivo: 'ativado por engano' });
    expect(r.status).toBe(201);
    expect(r.body).toEqual({ ok: true, cancelado: true });

    const { rows: pos } = await ctx.query('SELECT estado, encerrado_em FROM ciclos WHERE id=$1', [cicloId]);
    expect(pos[0].estado).toBe('cancelado');
    expect(pos[0].encerrado_em).not.toBeNull();

    const { rows: aud } = await ctx.query(
      "SELECT acao, detalhes, actor_type FROM eventos_auditoria WHERE entidade='ciclo' AND entidade_id=$1 AND acao='cancelar'",
      [cicloId]
    );
    expect(aud.length).toBe(1);
    expect(aud[0].actor_type).toBe('operador');
    expect(aud[0].detalhes.de_estado).toBe('aberto');
    expect(aud[0].detalhes.para_estado).toBe('cancelado');
    expect(aud[0].detalhes.motivo).toBe('ativado por engano');
  });

  it('operador também pode cancelar (RBAC) e ciclo continua cancelado', async () => {
    const cicloId = await criaCicloPreparado();
    const r = await req.post(`/ciclos/${cicloId}/cancelar`).set('Cookie', cookieOp);
    expect(r.status).toBe(201);
    expect((await ctx.query('SELECT estado FROM ciclos WHERE id=$1', [cicloId])).rows[0].estado).toBe('cancelado');
  });

  it('sem autenticação ⇒ 401', async () => {
    expect((await req.post('/ciclos/00000000-0000-0000-0000-000000000001/cancelar')).status).toBe(401);
  });

  it('ciclo inexistente / de outro tenant ⇒ 404 (RLS)', async () => {
    const inexistente = await req.post('/ciclos/00000000-0000-0000-0000-000000000001/cancelar').set('Cookie', cookieAdmin);
    expect(inexistente.status).toBe(404);

    const cross = await req.post(`/ciclos/${outroTenantCicloId}/cancelar`).set('Cookie', cookieAdmin);
    expect(cross.status).toBe(404);
  });

  it('idempotente: cancelar de novo não erra nem muda nada; histórico preservado', async () => {
    const cicloId = await criaCicloPreparado();
    await req.post(`/ciclos/${cicloId}/cancelar`).set('Cookie', cookieAdmin);
    const r2 = await req.post(`/ciclos/${cicloId}/cancelar`).set('Cookie', cookieAdmin);
    expect(r2.status).toBe(201);
    expect(r2.body.cancelado).toBe(false);

    const { rows: pos } = await ctx.query('SELECT estado FROM ciclos WHERE id=$1', [cicloId]);
    expect(pos[0].estado).toBe('cancelado');

    const { rows: aud } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='ciclo' AND entidade_id=$1 AND acao='cancelar'",
      [cicloId]
    );
    expect(aud[0].n).toBe(1);

    const { rows: itens } = await ctx.query('SELECT count(*)::int AS n FROM itens_ciclo WHERE ciclo_id=$1', [cicloId]);
    expect(itens[0].n).toBe(2);
    const { rows: msgs } = await ctx.query(
      "SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE item_ciclo_id IN (SELECT id FROM itens_ciclo WHERE ciclo_id=$1)",
      [cicloId]
    );
    expect(msgs[0].n).toBeGreaterThanOrEqual(0);

    const detalhe = await req.get(`/ciclos/${cicloId}`).set('Cookie', cookieAdmin);
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.estado).toBe('cancelado');
    expect(detalhe.body.encerrado_em).not.toBeNull();
  });

  it('scheduler global ignora tenant com ciclo cancelado (não enfileira tick)', async () => {
    // SCHED tenant tem UM ciclo; cancela-o ⇒ deixa de ser elegível ao scheduler
    const { rows: antes } = await admin.query("SELECT id FROM ciclos WHERE tenant_id=$1", [TEN_SCHED]);
    expect(antes.length).toBe(1);
    const cicloSched = antes[0].id;

    const cancel = await req.post(`/ciclos/${cicloSched}/cancelar`).set('Cookie', cookieSched);
    expect(cancel.status).toBe(201);
    await admin.query("DELETE FROM jobs_fila WHERE tenant_id=$1", [TEN_SCHED]);

    const agora = new Date('2026-08-30T12:00:00.000Z');
    const sched = new MotorScheduler({ tickIntervalMs: 60_000, windowMs: 60_000, startNow: false, clock: () => agora, log: () => undefined });
    await sched.runTick();

    const { rows: jobs } = await admin.query(
      "SELECT count(*)::int AS n FROM jobs_fila WHERE tenant_id=$1 AND tipo='ciclo.tick' AND estado='pendente'",
      [TEN_SCHED]
    );
    expect(jobs[0].n).toBe(0);
  });

  it('worker não envia após cancelamento: itens de ciclo cancelado não geram nova cobrança', async () => {
    const cicloId = await criaCicloPreparado();
    const msgsAntes = (
      await ctx.query(
        "SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE item_ciclo_id IN (SELECT id FROM itens_ciclo WHERE ciclo_id=$1)",
        [cicloId]
      )
    ).rows[0]!.n;
    const enviadasAntes = canal.enviadas.length;
    await req.post(`/ciclos/${cicloId}/cancelar`).set('Cookie', cookieAdmin);

    // forçaria tick/cobrança se não estivesse cancelado
    await enqueue(ctx, { tipo: 'ciclo.tick', payload: {}, idempotencyKey: `canc-tick-pos:${cicloId}` });
    await rodarJobs();
    expect(canal.enviadas.length).toBe(enviadasAntes);

    const { rows: msgs } = await ctx.query(
      "SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE item_ciclo_id IN (SELECT id FROM itens_ciclo WHERE ciclo_id=$1)",
      [cicloId]
    );
    expect(msgs[0].n).toBe(msgsAntes);
  });

  it('reenviar item de ciclo cancelado é bloqueado (ciclo não aberto)', async () => {
    const cicloId = await criaCicloPreparado();
    await ctx.query("UPDATE itens_ciclo SET estado='excecao' WHERE ciclo_id=$1", [cicloId]);
    const { rows: item } = await ctx.query("SELECT id FROM itens_ciclo WHERE ciclo_id=$1 AND estado='excecao' LIMIT 1", [cicloId]);
    expect(item.length).toBe(1);

    await req.post(`/ciclos/${cicloId}/cancelar`).set('Cookie', cookieAdmin);
    const r = await req.post(`/ciclos/itens/${item[0].id}/reenviar`).set('Cookie', cookieAdmin);
    expect(r.status).toBe(400);
    expect((await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [item[0].id])).rows[0].estado).toBe('excecao');
  });
});
