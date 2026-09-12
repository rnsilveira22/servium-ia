import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import pg from 'pg';

import { ADMIN_URL, APP_URL, type Job } from '@servium-ia/db';
import { FakeChannel } from '../src/motor/channel';
import { registrarMotorHandlers } from '../src/motor/handlers';
import { decidirItem } from '../src/cadastro/decidir-item';
import { buildApp } from '../src/app.factory';

const TEN = 'f5b10000-0000-0000-0000-000000000001';
const SLUG = 'tenant-b1-recebido-test';
const ADMIN_EMAIL = 'admin@b1-recebido.local';
const OP_EMAIL = 'op@b1-recebido.local';
const SENHA = 'senha-' + randomBytes(8).toString('hex');

let app: INestApplication;
let req: supertest.Agent;
let admin: pg.Client;
let ctx: pg.Client;
let cookieAdmin: string;
let cookieOp: string;
let obrigacaoId: string;
let operadorId: string;
let adminOperadorId: string;

const canal = new FakeChannel();
const handlers = registrarMotorHandlers({ channel: canal });

function job(tipo: string, payload: Record<string, unknown>): Job {
  return { id: randomUUID(), tenant_id: TEN, tipo, payload, tentativas: 0, max_tentativas: 3 };
}

/** Cria ciclo ativo com 2 itens via motor e devolve os ids dos itens. */
async function criarCicloComItens(): Promise<{ cicloId: string; itens: string[] }> {
  const cicloId = randomUUID();
  await ctx.query('INSERT INTO ciclos (id,tenant_id,obrigacao_id) VALUES ($1,$2,$3)', [cicloId, TEN, obrigacaoId]);
  await ctx.query(`UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`, [cicloId]);
  await handlers.get('ciclo.ativar')!(job('ciclo.ativar', { ciclo_id: cicloId }), ctx);
  const { rows } = await ctx.query(
    "SELECT id FROM itens_ciclo WHERE ciclo_id=$1 AND estado='pendente' ORDER BY id",
    [cicloId]
  );
  return { cicloId, itens: rows.map((r) => r.id) };
}

/** Coloca um item em 'recebido' como o runtime faria após resposta correlacionada. */
async function emRecebido(itemId: string): Promise<void> {
  await ctx.query("UPDATE itens_ciclo SET estado='recebido', atualizado_em=now() WHERE id=$1", [itemId]);
}

/** Item escalado pelo motor (excecao + exceção aberta) — fluxo existente CA-03. */
async function emExcecaoPeloMotor(): Promise<string> {
  const { itens } = await criarCicloComItens();
  await ctx.query("UPDATE itens_ciclo SET estado='aguardando', tentativas=3 WHERE id=$1", [itens[0]]);
  await handlers.get('item.cobrar')!(job('item.cobrar', { item_ciclo_id: itens[0]! }), ctx);
  const { rows } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itens[0]]);
  expect(rows[0]!.estado).toBe('excecao');
  return itens[0]!;
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'B1 Recebido',$2)", [TEN, SLUG]);
  const { rows: adminOp } = await admin.query<{ id: string }>(
    "INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel) VALUES ($1,'Admin B1',$2,$3,'admin') RETURNING id",
    [TEN, ADMIN_EMAIL, await (await import('@node-rs/argon2')).hash(SENHA)]
  );
  const { rows: op } = await admin.query<{ id: string }>(
    "INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel) VALUES ($1,'Op B1',$2,$3,'operador') RETURNING id",
    [TEN, OP_EMAIL, await (await import('@node-rs/argon2')).hash(SENHA)]
  );
  adminOperadorId = adminOp[0]!.id;
  operadorId = op[0]!.id;
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente B1','b1@b1.local') RETURNING id",
    [TEN]
  );
  const { rows: tpl } = await admin.query(
    "INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'Tpl B1') RETURNING id",
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
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao,template_id) VALUES ($1,$2,'Obrigacao B1',$3) RETURNING id",
    [TEN, cli[0]!.id, tpl[0]!.id]
  );
  obrigacaoId = obl[0]!.id;

  ctx = new pg.Client({ connectionString: APP_URL });
  await ctx.connect();
  await ctx.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);

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
    'DELETE FROM mensagens_gmail WHERE tenant_id=$1',
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

async function limparTenantId(tenantId: string) {
  for (const sql of [
    'DELETE FROM jobs_fila WHERE tenant_id=$1',
    'DELETE FROM eventos_auditoria WHERE tenant_id=$1',
    'DELETE FROM excecoes WHERE tenant_id=$1',
    'DELETE FROM mensagens_comunicacao WHERE tenant_id=$1',
    'DELETE FROM mensagens_gmail WHERE tenant_id=$1',
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
    await admin.query(sql, [tenantId]);
  }
}

describe('HG-B1-2026-09 · validação humana do item recebido (AC-B1)', () => {
  it('AC-B1-01/AC-B1-02: item recebido é validado por admin ⇒ resolvido + auditoria', async () => {
    const { itens } = await criarCicloComItens();
    await emRecebido(itens[0]!);

    const r = await req.post(`/ciclos/itens/${itens[0]}/decidir`).set('Cookie', cookieAdmin).send({ desfecho: 'resolvido' });
    expect(r.status).toBe(201);

    const { rows: pos } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itens[0]]);
    expect(pos[0]!.estado).toBe('resolvido');

    const { rows: aud } = await ctx.query(
      "SELECT actor_id, detalhes FROM eventos_auditoria WHERE entidade='item_ciclo' AND entidade_id=$1 AND acao='decidir'",
      [itens[0]]
    );
    expect(aud).toHaveLength(1);
    expect(aud[0]!.detalhes.desfecho).toBe('resolvido');
    expect(aud[0]!.detalhes.origem).toBe('recebido');
    expect(aud[0]!.detalhes.ciclo_id).toBeDefined();
    expect(aud[0]!.actor_id).toBe(adminOperadorId);

    const { rows: exc } = await ctx.query('SELECT count(*)::int AS n FROM excecoes WHERE item_ciclo_id=$1', [itens[0]]);
    expect(exc[0]!.n).toBe(0);
  });

  it('AC-B1-01 RBAC: operador NÃO pode validar item recebido (só admin)', async () => {
    const { itens } = await criarCicloComItens();
    await emRecebido(itens[0]!);
    const r = await req.post(`/ciclos/itens/${itens[0]}/decidir`).set('Cookie', cookieOp).send({ desfecho: 'resolvido' });
    expect(r.status).toBe(403);
  });

  it('AC-B1-03: recebido → excecao cria exceção (motivo) e entra no fluxo de decisão humana', async () => {
    const { itens } = await criarCicloComItens();
    await emRecebido(itens[0]!);

    const r = await req
      .post(`/ciclos/itens/${itens[0]}/decidir`)
      .set('Cookie', cookieAdmin)
      .send({ desfecho: 'excecao', motivo: 'documento divergente' });
    expect(r.status).toBe(201);

    const { rows: pos } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itens[0]]);
    expect(pos[0]!.estado).toBe('excecao');

    const { rows: exc } = await ctx.query(
      'SELECT tipo, motivo, desfecho, contexto FROM excecoes WHERE item_ciclo_id=$1 ORDER BY criado_em DESC LIMIT 1',
      [itens[0]]
    );
    expect(exc[0]!.tipo).toBe('validacao_recebido');
    expect(exc[0]!.motivo).toBe('documento divergente');
    expect(exc[0]!.desfecho).toBeNull();
    expect(exc[0]!.contexto.origem).toBe('recebido');

    const { rows: aud } = await ctx.query(
      "SELECT detalhes FROM eventos_auditoria WHERE entidade='item_ciclo' AND entidade_id=$1 AND acao='decidir'",
      [itens[0]]
    );
    expect(aud).toHaveLength(1);
    expect(aud[0]!.detalhes.desfecho).toBe('excecao');
    expect(aud[0]!.detalhes.motivo).toBe('documento divergente');

    // continuidade: a exceção entra no fluxo existente de decisão humana (nº2/3)
    const { rows: cicloId } = await ctx.query('SELECT ciclo_id FROM itens_ciclo WHERE id=$1', [itens[0]]);
    const l2 = await req.get(`/ciclos/${cicloId[0]!.ciclo_id}/excecoes`).set('Cookie', cookieAdmin);
    expect(l2.status).toBe(200);
    const excListada = l2.body.find((e: { item_id: string }) => e.item_id === itens[0]);
    expect(excListada?.tipo).toBe('validacao_recebido');
    expect(excListada?.motivo).toBe('documento divergente');
    expect(excListada?.desfecho == null).toBe(true);

    const r2 = await req.post(`/ciclos/itens/${itens[0]}/decidir`).set('Cookie', cookieAdmin).send({ desfecho: 'resolvido' });
    expect(r2.status).toBe(201);

    const { rows: pos2 } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itens[0]]);
    expect(pos2[0]!.estado).toBe('resolvido');

    const { rows: exc2 } = await ctx.query(
      'SELECT desfecho FROM excecoes WHERE item_ciclo_id=$1 ORDER BY criado_em DESC LIMIT 1',
      [itens[0]]
    );
    expect(exc2[0]!.desfecho).toBe('resolvido');
  });

  it('AC-B1-04: fluxo existente de exceção continua funcionando (decisão + cancelamento)', async () => {
    const itemId = await emExcecaoPeloMotor();

    const r = await req.post(`/ciclos/itens/${itemId}/decidir`).set('Cookie', cookieAdmin).send({ desfecho: 'resolvido' });
    expect(r.status).toBe(201);
    const { rows: pos } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemId]);
    expect(pos[0]!.estado).toBe('resolvido');

    const item2 = await emExcecaoPeloMotor();
    const r2 = await req.post(`/ciclos/itens/${item2}/decidir`).set('Cookie', cookieAdmin).send({ desfecho: 'cancelado' });
    expect(r2.status).toBe(201);
    const { rows: pos2 } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [item2]);
    expect(pos2[0]!.estado).toBe('cancelado');
  });

  it('AC-B1-06: item finalizado não pode ser decidido novamente', async () => {
    const { itens } = await criarCicloComItens();
    await emRecebido(itens[0]!);
    await req.post(`/ciclos/itens/${itens[0]}/decidir`).set('Cookie', cookieAdmin).send({ desfecho: 'resolvido' });

    const r = await req.post(`/ciclos/itens/${itens[0]}/decidir`).set('Cookie', cookieAdmin).send({ desfecho: 'resolvido' });
    expect(r.status).toBe(400);

    const { rows: aud } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='item_ciclo' AND entidade_id=$1 AND acao='decidir'",
      [itens[0]]
    );
    expect(aud[0]!.n).toBe(1);
  });

  it('transições arbitrárias bloqueadas (aguardando → resolvido falha)', async () => {
    const { itens } = await criarCicloComItens();
    const r = await req.post(`/ciclos/itens/${itens[0]}/decidir`).set('Cookie', cookieAdmin).send({ desfecho: 'resolvido' });
    expect(r.status).toBe(400);
    const { rows: pos } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itens[0]]);
    expect(pos[0]!.estado).toBe('pendente');
  });

  it('AC-B1-07: IA isolamento multi-tenant — item de outro tenant não pode ser decidido', async () => {
    const TEN2 = 'f5b20000-0000-0000-0000-000000000001';
    const SLUG2 = 'tenant-b1-outro';
    await limparTenantId(TEN2); // idempotente entre execuções/retries
    await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Outro Tenant',$2)", [TEN2, SLUG2]);
    const { rows: cli2 } = await admin.query(
      "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Outro','outro@outro.local') RETURNING id",
      [TEN2]
    );
    const { rows: tpl2 } = await admin.query(
      "INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'Tpl Outro') RETURNING id",
      [TEN2]
    );
    const { rows: it2 } = await admin.query<{ id: string }>(
      "INSERT INTO itens_template (tenant_id,template_id,descricao,tipo_esperado) VALUES ($1,$2,'Doc Outro','documento') RETURNING id",
      [TEN2, tpl2[0]!.id]
    );
    const { rows: obl2 } = await admin.query(
      "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao,template_id) VALUES ($1,$2,'Obrigacao Outro',$3) RETURNING id",
      [TEN2, cli2[0]!.id, tpl2[0]!.id]
    );
    const { rows: ciclo2 } = await admin.query(
      "INSERT INTO ciclos (id,tenant_id,obrigacao_id) VALUES ($1,$2,$3) RETURNING id",
      [randomUUID(), TEN2, obl2[0]!.id]
    );
    const { rows: itemFora } = await admin.query(
      "INSERT INTO itens_ciclo (tenant_id,ciclo_id,item_template_id,estado) VALUES ($1,$2,$3,'recebido') RETURNING id",
      [TEN2, ciclo2[0]!.id, it2[0]!.id]
    );

    const r = await req
      .post(`/ciclos/itens/${itemFora[0]!.id}/decidir`)
      .set('Cookie', cookieAdmin)
      .send({ desfecho: 'resolvido' });
    expect(r.status).toBe(400);

    const { rows: fora } = await admin.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemFora[0]!.id]);
    expect(fora[0]!.estado).toBe('recebido'); // intacto

    for (const sql of [
      'DELETE FROM eventos_auditoria WHERE tenant_id=$1',
      'DELETE FROM excecoes WHERE tenant_id=$1',
      'DELETE FROM mensagens_comunicacao WHERE tenant_id=$1',
      'DELETE FROM mensagens_gmail WHERE tenant_id=$1',
      'DELETE FROM documentos WHERE tenant_id=$1',
      'DELETE FROM itens_ciclo WHERE tenant_id=$1',
      'DELETE FROM ciclos WHERE tenant_id=$1',
      'DELETE FROM obrigacoes WHERE tenant_id=$1',
      'DELETE FROM itens_template WHERE tenant_id=$1',
      'DELETE FROM checklist_templates WHERE tenant_id=$1',
      'DELETE FROM clientes WHERE tenant_id=$1',
      'DELETE FROM tenants WHERE id=$1',
    ]) {
      await admin.query(sql, [TEN2]);
    }
  });

  it('concorrência (§14): uma validação vence, a outra é rejeitada, auditoria única', async () => {
    const { itens } = await criarCicloComItens();
    await emRecebido(itens[0]!);

    const ctx2 = new pg.Client({ connectionString: APP_URL });
    await ctx2.connect();
    await ctx2.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);

    const resultados = await Promise.allSettled([
      decidirItem(ctx, { tenantId: TEN, operadorId }, itens[0]!, 'resolvido'),
      decidirItem(ctx2, { tenantId: TEN, operadorId }, itens[0]!, 'resolvido'),
    ]);
    await ctx2.end();

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);

    const { rows: pos } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itens[0]]);
    expect(pos[0]!.estado).toBe('resolvido');

    const { rows: aud } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='item_ciclo' AND entidade_id=$1 AND acao='decidir'",
      [itens[0]]
    );
    expect(aud[0]!.n).toBe(1);
  });

  it('AC-B1-08: ciclo é encerrado quando todos os itens chegam a estados finais válidos', async () => {
    const cicloId = randomUUID();
    await ctx.query('INSERT INTO ciclos (id,tenant_id,obrigacao_id) VALUES ($1,$2,$3)', [cicloId, TEN, obrigacaoId]);
    await ctx.query(`UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`, [cicloId]);
    await handlers.get('ciclo.ativar')!(job('ciclo.ativar', { ciclo_id: cicloId }), ctx);

    const { rows: itens } = await ctx.query('SELECT id FROM itens_ciclo WHERE ciclo_id=$1', [cicloId]);
    for (const i of itens) {
      await emRecebido(i.id);
      await decidirItem(ctx, { tenantId: TEN, operadorId }, i.id, 'resolvido');
    }

    await handlers.get('ciclo.encerrar')!(job('ciclo.encerrar', { ciclo_id: cicloId }), ctx);

    const { rows: ciclo } = await ctx.query('SELECT estado, encerrado_em FROM ciclos WHERE id=$1', [cicloId]);
    expect(ciclo[0]!.estado).toBe('encerrado');
    expect(ciclo[0]!.encerrado_em).not.toBeNull();

    const { rows: ev } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='ciclo' AND entidade_id=$1 AND acao='encerrar'",
      [cicloId]
    );
    expect(ev[0]!.n).toBe(1);
  });
});