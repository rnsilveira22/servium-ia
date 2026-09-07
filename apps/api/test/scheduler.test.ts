import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

import { ADMIN_URL } from '@servium-ia/db';
import { MotorScheduler } from '../src/runtime/scheduler';

const TEN_A = 'cccc0000-0000-0000-0000-000000000001';
const TEN_F = 'dddd0000-0000-0000-0000-000000000001';
const SLUG_A = 'tenant-sched-aberto';
const SLUG_F = 'tenant-sched-fechado';

let admin: pg.Client;
let relogio: { agora: Date };

const noopLog = () => undefined;

async function esperar(condicao: () => Promise<boolean>, tempoMaxMs = 10_000, label = 'condição'): Promise<void> {
  const inicio = Date.now();
  while (Date.now() - inicio < tempoMaxMs) {
    if (await condicao()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`timeout aguardando ${label}`);
}

async function contaJobs(tenantId: string): Promise<Array<{ idempotency_key: string; tipo: string; estado: string }>> {
  const { rows } = await admin.query(
    "SELECT idempotency_key, tipo, estado FROM jobs_fila WHERE tenant_id=$1 ORDER BY idempotency_key",
    [tenantId]
  );
  return rows;
}

async function limpar(tenantId: string): Promise<void> {
  for (const sql of [
    "DELETE FROM jobs_fila WHERE tenant_id=$1",
    "DELETE FROM excecoes WHERE tenant_id=$1",
    "DELETE FROM mensagens_comunicacao WHERE tenant_id=$1",
    "DELETE FROM itens_ciclo WHERE tenant_id=$1",
    "DELETE FROM ciclos WHERE tenant_id=$1",
    "DELETE FROM obrigacoes WHERE tenant_id=$1",
    "DELETE FROM clientes WHERE tenant_id=$1",
    "DELETE FROM tenants WHERE id=$1",
  ]) {
    await admin.query(sql, [tenantId]);
  }
}

async function preparaTenant(id: string, _slug: string, estado: 'aberto' | 'encerrado'): Promise<void> {
  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Sched',$2) ON CONFLICT (id) DO NOTHING", [id, _slug]);
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Sched','sched@worker.local') RETURNING id",
    [id]
  );
  const { rows: obl } = await admin.query(
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao) VALUES ($1,$2,'Obrigacao sched') RETURNING id",
    [id, cli[0]!.id]
  );
  await admin.query(
    "INSERT INTO ciclos (tenant_id,obrigacao_id,estado) VALUES ($1,$2,$3)",
    [id, obl[0]!.id, estado]
  );
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  for (const [id] of [[TEN_A, SLUG_A], [TEN_F, SLUG_F]] as const) {
    await limpar(id);
  }
  await preparaTenant(TEN_A, SLUG_A, 'aberto');
  await preparaTenant(TEN_F, SLUG_F, 'encerrado');
  relogio = { agora: new Date('2026-08-30T12:00:00.000Z') };
});

afterAll(async () => {
  for (const id of [TEN_A, TEN_F]) await limpar(id);
  void admin.end();
});

describe('PRM-P0.1-B · scheduler enfileira tick global por tenant', () => {
  it('enfileira ciclo.tick por tenant aberto e ignora encerrado (mesma janela, key estável)', async () => {
    const sched = new MotorScheduler({ tickIntervalMs: 60_000, windowMs: 60_000, startNow: false, clock: () => relogio.agora, log: noopLog });
    const W = Math.floor(relogio.agora.getTime() / 60_000);
    const res = await sched.runTick();
    expect(res.jobs).toBe(1);
    expect(res.tenants).toBe(1);
    expect(res.reaprProcessados).toBeGreaterThanOrEqual(0);

    const jobsA = await contaJobs(TEN_A);
    expect(jobsA).toEqual([{ idempotency_key: `tick:global:${TEN_A}:${W}`, tipo: 'ciclo.tick', estado: 'pendente' }]);
    expect(await contaJobs(TEN_F)).toEqual([]);
  });

  it('mesma janela é idempotente (não duplica o tick)', async () => {
    const sched = new MotorScheduler({ tickIntervalMs: 60_000, windowMs: 60_000, startNow: false, clock: () => relogio.agora, log: noopLog });
    const res = await sched.runTick();
    expect(res.jobs).toBe(0);
    expect((await contaJobs(TEN_A)).filter((j) => j.estado === 'pendente')).toHaveLength(1);
  });

  it('nova janela recupera o tick (job novo após avanço de janela)', async () => {
    const sched = new MotorScheduler({ tickIntervalMs: 60_000, windowMs: 60_000, startNow: false, clock: () => relogio.agora, log: noopLog });
    relogio.agora = new Date(relogio.agora.getTime() + 61_000);
    const W2 = Math.floor(relogio.agora.getTime() / 60_000);
    const res = await sched.runTick();
    expect(res.jobs).toBe(1);
    const chaves = (await contaJobs(TEN_A)).map((j) => j.idempotency_key);
    expect(chaves).toContain(`tick:global:${TEN_A}:${W2}`);
    expect(chaves).toHaveLength(2);
  });

  it('reap devolve a fila job preso em processando (worker morto)', async () => {
    const sched = new MotorScheduler({ tickIntervalMs: 60_000, windowMs: 60_000, startNow: false, clock: () => relogio.agora, log: noopLog, reapOlderThanMinutes: 15 });
    const k = `circular:${Date.now()}`;
    await admin.query(
      "INSERT INTO jobs_fila (tenant_id,tipo,payload,estado,idempotency_key,disponivel_em) VALUES ($1,'ciclo.tick','{}','processando',$2, now() - interval '30 minutes')",
      [TEN_A, k]
    );
    const res = await sched.runTick();
    expect(res.reaprProcessados).toBeGreaterThanOrEqual(1);
    const { rows } = await admin.query("SELECT estado FROM jobs_fila WHERE tenant_id=$1 AND idempotency_key=$2", [TEN_A, k]);
    expect(rows[0]!.estado).toBe('pendente');
  });

  it('start dispara varredura e stop interrompe novos ticks', async () => {
    const sched = new MotorScheduler({ tickIntervalMs: 4_000_000, startNow: true, windowMs: 60_000, clock: () => relogio.agora, log: noopLog });
    sched.start();
    await esperar(async () => (await contaJobs(TEN_A)).some((j) => j.tipo === 'ciclo.tick'), 5_000, 'tick imediato do start');
    const antes = (await contaJobs(TEN_A)).length;
    await sched.stop();

    relogio.agora = new Date(relogio.agora.getTime() + 61_000);
    await new Promise((r) => setTimeout(r, 400));
    expect((await contaJobs(TEN_A)).length).toBe(antes);
  });
});