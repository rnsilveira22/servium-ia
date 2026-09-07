import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

import { ADMIN_URL, APP_URL, type Job } from '@servium-ia/db';
import { decidirItem } from '../src/cadastro/decidir-item';
import { FakeChannel } from '../src/motor/channel';
import { registrarMotorHandlers } from '../src/motor/handlers';
import { sabotarQuery } from './helpers/sabotar-query';

const TEN = 'cccc0000-0000-0000-0000-000000000001';
const SLUG = 'tenant-atomicidade-test';

let admin: pg.Client;
let ctx: pg.Client;
let obrigacaoId: string;
let operadorId: string;

const canal = new FakeChannel();
const handlers = registrarMotorHandlers({ channel: canal });

function job(tipo: string, payload: Record<string, unknown>): Job {
  return { id: randomUUID(), tenant_id: TEN, tipo, payload, tentativas: 0, max_tentativas: 3 };
}

async function criarCiclo(): Promise<string> {
  const id = randomUUID();
  await ctx.query('INSERT INTO ciclos (id,tenant_id,obrigacao_id) VALUES ($1,$2,$3)', [id, TEN, obrigacaoId]);
  await ctx.query(`UPDATE ciclos SET config=$2::jsonb WHERE id=$1`, [
    id,
    JSON.stringify({ frequencia_horas: 0, tentativas_max: 1, horario_inicio: 0, horario_fim: 24 }),
  ]);
  return id;
}

/** Ativa o ciclo (gera itens) e devolve o id do primeiro item. */
async function ativarEPrimeiroItem(cicloId: string): Promise<string> {
  await handlers.get('ciclo.ativar')!(job('ciclo.ativar', { ciclo_id: cicloId }), ctx);
  const { rows: itens } = await ctx.query(
    "SELECT id FROM itens_ciclo WHERE ciclo_id=$1 AND estado='pendente' ORDER BY id LIMIT 1",
    [cicloId]
  );
  return itens[0]!.id;
}

/** Item aguardando no limite social ⇒ o motor decide escalar. */
async function itemAguardandoNoLimite(): Promise<{ cicloId: string; itemId: string }> {
  const cicloId = await criarCiclo();
  const itemId = await ativarEPrimeiroItem(cicloId);
  await ctx.query("UPDATE itens_ciclo SET estado='aguardando', tentativas=1 WHERE id=$1", [itemId]);
  return { cicloId, itemId };
}

/** Item já escalado (excecao + exceção aberta) para testar decidirItem. */
async function itemEmExcecao(): Promise<{ cicloId: string; itemId: string }> {
  const { cicloId, itemId } = await itemAguardandoNoLimite();
  await handlers.get('item.cobrar')!(job('item.cobrar', { item_ciclo_id: itemId }), ctx);
  const { rows: pos } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemId]);
  expect(pos[0]!.estado).toBe('excecao');
  return { cicloId, itemId };
}

async function cicloComTodosResolvidos(): Promise<string> {
  const cicloId = await criarCiclo();
  await handlers.get('ciclo.ativar')!(job('ciclo.ativar', { ciclo_id: cicloId }), ctx);
  await ctx.query("UPDATE itens_ciclo SET estado='resolvido' WHERE ciclo_id=$1", [cicloId]);
  return cicloId;
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Atomicidade',$2)", [TEN, SLUG]);
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Atomicidade','cliente@atomicidade.local') RETURNING id",
    [TEN]
  );
  const { rows: tpl } = await admin.query(
    "INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'Docs Atomicidade') RETURNING id",
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
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao,template_id) VALUES ($1,$2,'Obrigação atomicidade',$3) RETURNING id",
    [TEN, cli[0]!.id, tpl[0]!.id]
  );
  obrigacaoId = obl[0]!.id;
  const { rows: op } = await admin.query(
    "INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel) VALUES ($1,'Decisor','decisor@atomicidade.local','hash-teste','admin') RETURNING id",
    [TEN]
  );
  operadorId = op[0]!.id;

  ctx = new pg.Client({ connectionString: APP_URL });
  await ctx.connect();
  await ctx.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);
});

afterAll(async () => {
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

describe('PRM-P0.2-B · atomicidade dos eventos de auditoria (CA-03 #52)', () => {
  it("CA-03-1: falha na auditoria de 'ativar' ⇒ rollback total em ativarCiclo", async () => {
    const cicloId = await criarCiclo();
    const sab = sabotarQuery(ctx, /INSERT INTO eventos_auditoria/);
    try {
      await expect(handlers.get('ciclo.ativar')!(job('ciclo.ativar', { ciclo_id: cicloId }), ctx)).rejects.toThrow();
    } finally {
      sab.desfazer();
    }

    const { rows: itens } = await ctx.query('SELECT count(*)::int AS n FROM itens_ciclo WHERE ciclo_id=$1', [cicloId]);
    expect(itens[0]!.n).toBe(0);

    const { rows: ev } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='ciclo' AND entidade_id=$1 AND acao='ativar'",
      [cicloId]
    );
    expect(ev[0]!.n).toBe(0);

    const { rows: jobs } = await ctx.query(
      "SELECT count(*)::int AS n FROM jobs_fila WHERE tenant_id=$1 AND tipo='ciclo.tick' AND estado='pendente' AND payload->>'ciclo_id'=$2",
      [TEN, cicloId]
    );
    expect(jobs[0]!.n).toBe(0);

    const { rows: ciclo } = await ctx.query('SELECT estado, encerrado_em FROM ciclos WHERE id=$1', [cicloId]);
    expect(ciclo[0]!.estado).toBe('aberto');
    expect(ciclo[0]!.encerrado_em).toBeNull();
    expect(sab.disparos).toBeGreaterThanOrEqual(1);
  });

  it("CA-03-1b: sem falha, ativarCiclo persiste itens + evento + job tick", async () => {
    const cicloId = await criarCiclo();
    await handlers.get('ciclo.ativar')!(job('ciclo.ativar', { ciclo_id: cicloId }), ctx);

    const { rows: itens } = await ctx.query('SELECT count(*)::int AS n FROM itens_ciclo WHERE ciclo_id=$1', [cicloId]);
    expect(itens[0]!.n).toBe(2);

    const { rows: ev } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='ciclo' AND entidade_id=$1 AND acao='ativar'",
      [cicloId]
    );
    expect(ev[0]!.n).toBe(1);

    const { rows: jobs } = await ctx.query(
      "SELECT count(*)::int AS n FROM jobs_fila WHERE tenant_id=$1 AND tipo='ciclo.tick'",
      [TEN]
    );
    expect(jobs[0]!.n).toBe(1);
  });

  it("CA-03-2: falha no INSERT de exceção no ramo escalar ⇒ rollback total", async () => {
    const { itemId } = await itemAguardandoNoLimite();
    const sab = sabotarQuery(ctx, /INSERT INTO excecoes/);
    try {
      await expect(handlers.get('item.cobrar')!(job('item.cobrar', { item_ciclo_id: itemId }), ctx)).rejects.toThrow();
    } finally {
      sab.desfazer();
    }

    const { rows: pos } = await ctx.query('SELECT estado, tentativas FROM itens_ciclo WHERE id=$1', [itemId]);
    expect(pos[0]!.estado).toBe('aguardando');

    const { rows: exc } = await ctx.query('SELECT count(*)::int AS n FROM excecoes WHERE item_ciclo_id=$1', [itemId]);
    expect(exc[0]!.n).toBe(0);

    const { rows: ev } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='item_ciclo' AND entidade_id=$1 AND acao='escalar'",
      [itemId]
    );
    expect(ev[0]!.n).toBe(0);
    expect(sab.disparos).toBeGreaterThanOrEqual(1);
  });

  it("CA-03-3a: falha no UPDATE de exceções ao decidir ⇒ rollback total", async () => {
    const { itemId } = await itemEmExcecao();
    const sab = sabotarQuery(ctx, /UPDATE excecoes/);
    try {
      await expect(decidirItem(ctx, { tenantId: TEN, operadorId }, itemId, 'resolvido')).rejects.toThrow();
    } finally {
      sab.desfazer();
    }

    const { rows: pos } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemId]);
    expect(pos[0]!.estado).toBe('excecao');

    const { rows: exc } = await ctx.query(
      'SELECT count(*)::int AS n FROM excecoes WHERE item_ciclo_id=$1 AND desfecho IS NULL',
      [itemId]
    );
    expect(exc[0]!.n).toBe(1);

    const { rows: ev } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='item_ciclo' AND entidade_id=$1 AND acao='decidir'",
      [itemId]
    );
    expect(ev[0]!.n).toBe(0);
    expect(sab.disparos).toBeGreaterThanOrEqual(1);
  });

  it("CA-03-3b: falha na auditoria ao decidir ⇒ rollback total", async () => {
    const { itemId } = await itemEmExcecao();
    const sab = sabotarQuery(ctx, /INSERT INTO eventos_auditoria/);
    try {
      await expect(decidirItem(ctx, { tenantId: TEN, operadorId }, itemId, 'cancelado')).rejects.toThrow();
    } finally {
      sab.desfazer();
    }

    const { rows: pos } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemId]);
    expect(pos[0]!.estado).toBe('excecao');

    const { rows: exc } = await ctx.query(
      'SELECT count(*)::int AS n FROM excecoes WHERE item_ciclo_id=$1 AND desfecho IS NULL',
      [itemId]
    );
    expect(exc[0]!.n).toBe(1);

    const { rows: ev } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='item_ciclo' AND entidade_id=$1 AND acao='decidir'",
      [itemId]
    );
    expect(ev[0]!.n).toBe(0);
    expect(sab.disparos).toBeGreaterThanOrEqual(1);
  });

  it("CA-03-4a: falha na auditoria de 'encerrar' em encerrarCiclo ⇒ rollback", async () => {
    const cicloId = await cicloComTodosResolvidos();
    const sab = sabotarQuery(ctx, /INSERT INTO eventos_auditoria/);
    try {
      await expect(handlers.get('ciclo.encerrar')!(job('ciclo.encerrar', { ciclo_id: cicloId }), ctx)).rejects.toThrow();
    } finally {
      sab.desfazer();
    }

    const { rows: ciclo } = await ctx.query('SELECT estado, encerrado_em FROM ciclos WHERE id=$1', [cicloId]);
    expect(ciclo[0]!.estado).toBe('aberto');
    expect(ciclo[0]!.encerrado_em).toBeNull();

    const { rows: ev } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='ciclo' AND entidade_id=$1 AND acao='encerrar'",
      [cicloId]
    );
    expect(ev[0]!.n).toBe(0);
    expect(sab.disparos).toBeGreaterThanOrEqual(1);
  });

  it("CA-03-4b: falha na auditoria de 'encerrar' no bloco final de tickCiclos ⇒ rollback", async () => {
    const cicloId = await cicloComTodosResolvidos();
    // tickCiclos varre o tenant inteiro na busca por elegíveis (agendou ignora o
    // encerramento): neutraliza itens pendentes/aguardando de testes anteriores.
    await ctx.query("UPDATE itens_ciclo SET estado='resolvido' WHERE tenant_id=$1 AND ciclo_id <> $2", [TEN, cicloId]);
    const sab = sabotarQuery(ctx, /INSERT INTO eventos_auditoria/);
    try {
      await expect(handlers.get('ciclo.tick')!(job('ciclo.tick', { ciclo_id: cicloId }), ctx)).rejects.toThrow();
    } finally {
      sab.desfazer();
    }

    const { rows: ciclo } = await ctx.query('SELECT estado, encerrado_em FROM ciclos WHERE id=$1', [cicloId]);
    expect(ciclo[0]!.estado).toBe('aberto');
    expect(ciclo[0]!.encerrado_em).toBeNull();

    const { rows: ev } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='ciclo' AND entidade_id=$1 AND acao='encerrar'",
      [cicloId]
    );
    expect(ev[0]!.n).toBe(0);
    expect(sab.disparos).toBeGreaterThanOrEqual(1);
  });

  it('corrida: 2 cobrarItem concorrentes no ramo escalar ⇒ uma única exceção', async () => {
    const { itemId } = await itemAguardandoNoLimite();

    const ctx2 = new pg.Client({ connectionString: APP_URL });
    await ctx2.connect();
    await ctx2.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);

    const h = handlers.get('item.cobrar')!;
    const j = job('item.cobrar', { item_ciclo_id: itemId });
    const resultados = await Promise.allSettled([h(j, ctx), h(j, ctx2)]);
    await ctx2.end();

    const { rows: exc } = await ctx.query('SELECT count(*)::int AS n FROM excecoes WHERE item_ciclo_id=$1', [itemId]);
    expect(exc[0]!.n).toBe(1);

    const { rows: ev } = await ctx.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE entidade='item_ciclo' AND entidade_id=$1 AND acao='escalar'",
      [itemId]
    );
    expect(ev[0]!.n).toBe(1);

    const { rows: pos } = await ctx.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemId]);
    expect(pos[0]!.estado).toBe('excecao');
    expect(resultados.some((r) => r.status === 'fulfilled')).toBe(true);
    expect(resultados.some((r) => r.status === 'rejected')).toBe(false);
  });
});