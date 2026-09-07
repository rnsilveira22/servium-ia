import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { ADMIN_URL, APP_URL, enqueue } from '@servium-ia/db';
import pg from 'pg';
import { FakeChannel } from '../src/motor/channel';
import { createMotorWorker } from '../src/runtime/worker';

const TEN = 'aaaa0000-0000-0000-0000-000000000002';
const SLUG = 'tenant-worker-test';
let admin: pg.Client;
let ctx: pg.Client;

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

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Worker',$2)", [TEN, SLUG]);
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Worker','cliente@worker.local') RETURNING id",
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

  ctx = new pg.Client({ connectionString: APP_URL });
  await ctx.connect();
  await ctx.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);
});

afterAll(async () => {
  await worker?.stop();
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

describe("PRM-P0.1-A · worker real consome handlers reais do motor", () => {
  it("registra os handlers do motor e consome jobs reais (ativação → tick → cobrança)", async () => {
    canal = new FakeChannel();
    worker = createMotorWorker({ channel: canal, pollMs: 20, batch: 10, reapIntervalMs: 0, tenantFilter: TEN });

    expect(worker.registrados.sort()).toEqual(
      ['ciclo.ativar', 'ciclo.encerrar', 'ciclo.tick', 'item.cobrar'].sort()
    );

    await worker.start();
    expect(worker.registrados).toContain('item.cobrar');

    cicloId = randomUUID();
    await ctx.query("INSERT INTO ciclos (id,tenant_id,obrigacao_id) VALUES ($1,$2,$3)", [cicloId, TEN, obrigId]);
    await ctx.query(
      `UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
      [cicloId]
    );
    await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: cicloId }, idempotencyKey: `ativar:${cicloId}` });

    await esperar(async () => (await canal.enviadas.length) >= 2, 15_000, '2 cobranças enviadas');
    await esperar(filaAssentou, 15_000, 'fila assentar');

    const { rows: itens } = await ctx.query("SELECT estado, tentativas FROM itens_ciclo WHERE ciclo_id=$1", [cicloId]);
    expect(itens).toHaveLength(2);
    expect(itens.every((i: { estado: string; tentativas: number }) => i.estado === 'aguardando' && i.tentativas === 1)).toBe(true);

    expect(canal.enviadas.map((m) => m.destinatario)).toEqual(['cliente@worker.local', 'cliente@worker.local']);

    const { rows: msgs } = await ctx.query("SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE direcao='envio'");
    expect(msgs[0]!.n).toBe(2);

    const { rows: aud } = await ctx.query(
      "SELECT acao FROM eventos_auditoria WHERE tenant_id=$1 AND acao IN ('ativar','cobrar') ORDER BY acao",
      [TEN]
    );
    expect(aud.map((a: { acao: string }) => a.acao)).toEqual(['ativar', 'cobrar', 'cobrar']);

    const { rows: jobs } = await admin.query(
      "SELECT estado, count(*)::int AS n FROM jobs_fila WHERE tenant_id=$1 GROUP BY estado",
      [TEN]
    );
    expect(jobs.find((j: { estado: string }) => j.estado === 'concluido')?.n ?? 0).toBeGreaterThanOrEqual(3);
    expect(jobs.some((j: { estado: string }) => j.estado === 'falha')).toBe(false);
  }, 40_000);

  it("idempotência: tick repetido no mesmo ciclo não duplica mensagens", async () => {
    const before = (await ctx.query("SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE direcao='envio'")).rows[0]!.n;
    await enqueue(ctx, { tipo: 'ciclo.tick', payload: { ciclo_id: cicloId }, idempotencyKey: `tick-rep-w-${cicloId}` });
    await esperar(filaAssentou, 15_000, 'fila assentar após tick repetido');
    const after = (await ctx.query("SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE direcao='envio'")).rows[0]!.n;
    expect(after).toBe(before);
  }, 40_000);

  it("job de tipo sem handler registrado vai a falha após esgotar tentativas", async () => {
    const antes = canal.enviadas.length;
    await enqueue(ctx, {
      tipo: 'tipo.desconhecido',
      payload: {},
      idempotencyKey: `desconhecido-${randomUUID()}`,
      maxTentativas: 1,
    });
    await esperar(async () => {
      const { rows } = await admin.query(
        "SELECT estado FROM jobs_fila WHERE tenant_id=$1 AND tipo='tipo.desconhecido'",
        [TEN]
      );
      return rows[0]?.estado === 'falha';
    }, 15_000, 'job desconhecido em falha');
    expect(canal.enviadas.length).toBe(antes);
  }, 40_000);
});