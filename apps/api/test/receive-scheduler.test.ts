import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

import { ADMIN_URL } from '@servium-ia/db';
import { ReceiveScheduler } from '../src/runtime/receive-scheduler';

/**
 * B-2 · ReceiveScheduler: enfileira UM email.receber por tenant+provider por
 * janela (idempotencyKey recv:<tenant>:<provider>:<janela>). Alvos:
 * integrações receive_enabled + fallback dev (MAILPIT_API_URL + ciclo aberto).
 */
const TEN_A = 'aaaa0000-0000-0000-0000-0000bb220001'; // ciclo aberto, sem integração (fallback)
const TEN_C = 'aaaa0000-0000-0000-0000-0000bb2200c1'; // integração gmail receive_enabled
const SLUG = 'tenant-receive-scheduler';

let admin: pg.Client;

async function seedCicloAberto(tenantId: string, slug: string, clienteEmail: string): Promise<void> {
  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Sched',$2)", [tenantId, slug]);
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Sched',$2) RETURNING id",
    [tenantId, clienteEmail]
  );
  const { rows: tpl } = await admin.query(
    "INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'Docs Sched') RETURNING id",
    [tenantId]
  );
  const { rows: itpl } = await admin.query(
    "INSERT INTO itens_template (tenant_id,template_id,descricao,tipo_esperado) VALUES ($1,$2,'Contrato','documento') RETURNING id",
    [tenantId, tpl[0]!.id]
  );
  const { rows: obl } = await admin.query(
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao,template_id) VALUES ($1,$2,'Entregar docs',$3) RETURNING id",
    [tenantId, cli[0]!.id, tpl[0]!.id]
  );
  const { rows: ciclo } = await admin.query(
    "INSERT INTO ciclos (tenant_id,obrigacao_id) VALUES ($1,$2) RETURNING id",
    [tenantId, obl[0]!.id]
  );
  void itpl;
  void ciclo;
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await seedCicloAberto(TEN_A, `${SLUG}-a`, 'cliente-a@local');
  // TEN_C: sem ciclo aberto, mas integração gmail receive_enabled ⇒ alvo por integração
  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Sched-C',$2)", [TEN_C, `${SLUG}-c`]);
  await admin.query(
    `INSERT INTO tenant_email_integration
       (tenant_id, provider, sender_email, auth_type, send_enabled, receive_enabled, status)
     VALUES ($1,'gmail','financeiro@c.local','oauth2',true,true,'configurado')`,
    [TEN_C]
  );
});

afterAll(async () => {
  await limpar();
  void admin.end();
});

async function limpar(): Promise<void> {
  for (const t of [TEN_A, TEN_C]) {
    await admin.query('DELETE FROM tenant_email_integration WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM jobs_fila WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM itens_ciclo WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM ciclos WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM obrigacoes WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM itens_template WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM checklist_templates WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM clientes WHERE tenant_id=$1', [t]);
    await admin.query('DELETE FROM tenants WHERE id=$1', [t]);
  }
}

describe('B-2 · ReceiveScheduler', () => {
  it('enfileira um email.receber por tenant alvo na janela (chaves recv:…)', async () => {
    const scheduler = new ReceiveScheduler({
      tickIntervalMs: 1000,
      windowMs: 1000,
      startNow: false,
      clock: () => new Date('2026-01-10T10:00:00Z'),
      env: {
        MAILPIT_API_URL: 'http://localhost:8025',
        MAILPIT_AGENT_EMAIL: 'assistente@servium.local',
      },
    });
    const res = await scheduler.runTick();
    expect(res.tenants).toBe(2);
    expect(res.jobs).toBe(2);

    const { rows } = await admin.query(
      "SELECT tenant_id, idempotency_key FROM jobs_fila WHERE tipo='email.receber' ORDER BY tenant_id"
    );
    const janela = Math.floor(new Date('2026-01-10T10:00:00Z').getTime() / 1000);
    const chaves = rows.map((r) => `${r.tenant_id}::${r.idempotency_key}`);
    expect(chaves).toContain(`${TEN_A}::recv:${TEN_A}:mailpit:${janela}`);
    expect(chaves).toContain(`${TEN_C}::recv:${TEN_C}:gmail:${janela}`);
  });

  it('mesma janela não enfileira duplicado (idempotência)', async () => {
    const scheduler = new ReceiveScheduler({
      tickIntervalMs: 1000,
      windowMs: 1000,
      startNow: false,
      clock: () => new Date('2026-01-10T10:00:00Z'),
      env: { MAILPIT_API_URL: 'http://localhost:8025' },
    });
    await scheduler.runTick();
    const res = await scheduler.runTick();
    expect(res.jobs).toBe(0); // chaves iguais ⇒ ON CONFLICT DO NOTHING

    const { rows } = await admin.query(
      "SELECT count(*)::int AS n FROM jobs_fila WHERE tipo='email.receber' AND tenant_id = ANY($1::uuid[])",
      [[TEN_A, TEN_C]]
    );
    expect(rows[0].n).toBe(2); // sem duplicatas entre varreduras
  });

  it('sem MAILPIT_API_URL e sem integração ⇒ tenantee sem alvo não enfileira', async () => {
    const semFallback = new ReceiveScheduler({
      tickIntervalMs: 1000,
      windowMs: 1000,
      startNow: false,
      clock: () => new Date('2026-01-10T10:00:01Z'),
      env: {}, // sem Mailpit
    });
    const res = await semFallback.runTick();
    expect(res.tenants).toBe(1); // apenas TEN_C (integração gmail receive_enabled)
    expect(res.jobs).toBe(1);
  });

  it('start()/stop() com startNow=false não dispara varredura imediata', async () => {
    const antes = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM jobs_fila WHERE tipo='email.receber'"
    );
    const scheduler = new ReceiveScheduler({
      tickIntervalMs: 1000,
      windowMs: 1000,
      startNow: false,
      env: { MAILPIT_API_URL: 'http://localhost:8025' },
    });
    scheduler.start();
    await new Promise((r) => setTimeout(r, 100));
    await scheduler.stop();
    const depois = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM jobs_fila WHERE tipo='email.receber'"
    );
    expect(depois.rows[0].n).toBe(antes.rows[0].n);
  });
});