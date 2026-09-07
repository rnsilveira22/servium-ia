import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { hash } from '@node-rs/argon2';

import { ADMIN_URL, APP_URL, enqueue } from '@servium-ia/db';
import pg from 'pg';
import { FakeChannel } from '../src/motor/channel';
import { createMotorWorker } from '../src/runtime/worker';
import { resolveServiceId, requireServiceId } from '../src/runtime/service-id';
import { buildApp } from '../src/app.factory';

const TEN = 'aaaa0000-0000-0000-0000-00000000c601';
const SLUG = 'tenant-servico-test';
const SERVICE_ID = '11111111-2222-3333-4444-555555555555';
const OP_EMAIL = 'op@servico-test.local';
const OP_SENHA = 'senha-' + randomBytes(8).toString('hex');
let admin: pg.Client;
let ctx: pg.Client;

let app: INestApplication;
let req: supertest.Agent;
let canal: FakeChannel;
let worker: ReturnType<typeof createMotorWorker>;
let cicloId: string;
let obrigId: string;

async function esperar(condicao: () => Promise<boolean>, tempoMaxMs = 10_000, label = 'condição'): Promise<void> {
  const inicio = Date.now();
  while (Date.now() - inicio < tempoMaxMs) {
    if (await condicao()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`timeout aguardando ${label}`);
}

async function filaAssentou(): Promise<boolean> {
  const { rows } = await admin.query(
    "SELECT count(*)::int AS n FROM jobs_fila WHERE tenant_id=$1 AND estado IN ('pendente','processando')",
    [TEN]
  );
  return rows[0]!.n === 0;
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Servico',$2)", [TEN, SLUG]);
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Servico','cliente@servico.local') RETURNING id",
    [TEN]
  );
  const { rows: tpl } = await admin.query(
    "INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'Docs Sociais') RETURNING id",
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
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao,template_id) VALUES ($1,$2,'Entregar docs',$3) RETURNING id",
    [TEN, cli[0]!.id, tpl[0]!.id]
  );
  obrigId = obl[0]!.id;

  // operador para o teste CA-C-2 (caminho HTTP real deve gravar 'operador')
  await admin.query(
    `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel)
     VALUES ($1,'Operador',$2,$3,'operador')`,
    [TEN, OP_EMAIL, await hash(OP_SENHA)]
  );

  ctx = new pg.Client({ connectionString: APP_URL });
  await ctx.connect();
  await ctx.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);

  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
});

afterAll(async () => {
  await worker?.stop();
  await app?.close();
  await limpar();
  void admin.end();
  void ctx.end();
});

async function limpar() {
  for (const sql of [
    "DELETE FROM jobs_fila WHERE tenant_id=$1",
    "DELETE FROM eventos_auditoria WHERE tenant_id=$1",
    "DELETE FROM excecoes WHERE tenant_id=$1",
    "DELETE FROM mensagens_comunicacao WHERE tenant_id=$1",
    "DELETE FROM documentos WHERE tenant_id=$1",
    "DELETE FROM itens_ciclo WHERE tenant_id=$1",
    "DELETE FROM ciclos WHERE tenant_id=$1",
    "DELETE FROM obrigacoes WHERE tenant_id=$1",
    "DELETE FROM itens_template WHERE tenant_id=$1",
    "DELETE FROM checklist_templates WHERE tenant_id=$1",
    "DELETE FROM clientes WHERE tenant_id=$1",
    "DELETE FROM sessoes WHERE tenant_id=$1",
    "DELETE FROM operadores WHERE tenant_id=$1",
    "DELETE FROM tenants WHERE id=$1",
  ]) {
    await admin.query(sql, [TEN]);
  }
}

describe('PRM-P0.3-C · identidade de serviço do FD (Issue #56)', () => {
  it('CA-C-3: requireServiceId falha com erro claro sem SERVIUM_SERVICE_ID, e resolveServiceId dá default determinístico', () => {
    expect(() => requireServiceId({})).toThrow('SERVIUM_SERVICE_ID');
    expect(requireServiceId({ SERVIUM_SERVICE_ID: SERVICE_ID })).toBe(SERVICE_ID);
    expect(() => requireServiceId({ SERVIUM_SERVICE_ID: 'nao-e-uuid' })).toThrow('inválido');
    const d1 = resolveServiceId({ HOSTNAME: 'host-7' });
    const d2 = resolveServiceId({ HOSTNAME: 'host-7' });
    // default estável por deploy (mesmo host ⇒ mesmo uuid) e é uuid válido
    expect(d1).toBe(d2);
    expect(d1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(resolveServiceId({ SERVIUM_SERVICE_ID: SERVICE_ID })).toBe(SERVICE_ID);
  });

  it('CA-C-1: worker real grava eventos com actor_type=servico e actor_id=SERVIUM_SERVICE_ID', async () => {
    canal = new FakeChannel();
    worker = createMotorWorker({
      channel: canal,
      pollMs: 20,
      batch: 10,
      reapIntervalMs: 0,
      tenantFilter: TEN,
      serviceId: SERVICE_ID,
    });
    await worker.start();

    cicloId = randomUUID();
    await ctx.query("INSERT INTO ciclos (id,tenant_id,obrigacao_id) VALUES ($1,$2,$3)", [cicloId, TEN, obrigId]);
    await ctx.query(
      `UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
      [cicloId]
    );
    await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: cicloId }, idempotencyKey: `ativar:${cicloId}` });

    await esperar(async () => (await canal.enviadas.length) >= 2, 15_000, '2 cobranças enviadas');
    await esperar(filaAssentou, 15_000, 'fila assentar');

    const { rows: eventos } = await ctx.query(
      `SELECT actor_type, actor_id, acao FROM eventos_auditoria
        WHERE tenant_id=$1 AND acao IN ('ativar','cobrar') ORDER BY acao`,
      [TEN]
    );
    expect(eventos.length).toBeGreaterThan(0);
    for (const ev of eventos) {
      expect(ev.actor_type).toBe('servico');
      expect(ev.actor_id).toBe(SERVICE_ID);
    }
    const acoes = eventos.map((e: { acao: string }) => e.acao).sort();
    expect(acoes).toEqual(['ativar', 'cobrar', 'cobrar']);
  }, 40_000);

  it('CA-C-2: caminho HTTP real (POST /auth/login) grava evento com actor_type=operador (sem vazamento do override)', async () => {
    const r = await req.post('/auth/login').send({ slug: SLUG, email: OP_EMAIL, senha: OP_SENHA });
    expect(r.status).toBe(200);
    expect(r.body.papel).toBe('operador');
    const cookie = r.headers['set-cookie'][0].split(';')[0];

    // rota autenticada para garantir ação do operador na trilha
    expect((await req.get('/auth/me').set('Cookie', cookie)).status).toBe(200);

    const { rows: loginOp } = await admin.query(
      `SELECT actor_type, actor_id, acao FROM eventos_auditoria
        WHERE tenant_id=$1 AND entidade='auth' AND acao='login_sucesso' AND actor_type='operador'
        ORDER BY criado_em DESC LIMIT 1`,
      [TEN]
    );
    expect(loginOp[0]).toMatchObject({ actor_type: 'operador', acao: 'login_sucesso' });
    expect(loginOp[0].actor_id).not.toBe(SERVICE_ID);

    // contraste com o caminho do FD: nenhum evento deste tenant veio do servico
    // no fluxo HTTP — o override do worker não contaminou a trilha de operador.
    const { rows: onlyServico } = await admin.query(
      `SELECT count(*)::int AS n FROM eventos_auditoria
        WHERE tenant_id=$1 AND actor_type='operador' AND actor_id=$2`,
      [TEN, SERVICE_ID]
    );
    expect(onlyServico[0].n).toBe(0);
  });
});
