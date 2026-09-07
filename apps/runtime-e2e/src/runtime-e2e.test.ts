import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

import {
  ADMIN_URL,
  AGENTE,
  API_PORT,
  MAILPIT_API,
  MAILPIT_SMTP,
  aguardar,
  aguardarApi,
  encerrar,
  garantirBuildApi,
  iniciarProcesso,
  limparTenant,
  responderComoCliente,
  semear,
  type SeedDados,
  type Processo,
} from './helpers';

let admin: pg.Client;
let seed: SeedDados;
let api: Processo | null = null;
let runtime: Processo | null = null;
let cicloId: string;

beforeAll(async () => {
  await garantirBuildApi();
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();

  seed = await semear(admin);

  api = iniciarProcesso(
    'node',
    ['apps/api/dist/main.js'],
    { PORT: String(API_PORT) },
    'api'
  );
  await aguardarApi(API_PORT);

  runtime = iniciarProcesso(
    'node',
    ['apps/api/dist/runtime/main.js'],
    {
      COMMUNICATION_ADAPTER: 'mailpit',
      MAILPIT_SMTP_HOST: MAILPIT_SMTP.host,
      MAILPIT_SMTP_PORT: String(MAILPIT_SMTP.port),
      MAILPIT_API_URL: MAILPIT_API,
      MAILPIT_AGENT_EMAIL: AGENTE,
      WORKER_POLL_MS: '200',
      WORKER_BATCH: '10',
      SCHEDULER_TICK_INTERVAL_MS: '1000',
      SCHEDULER_WINDOW_MS: '1000',
      RECEBER_INTERVAL_MS: '1000',
      SERVIUM_SERVICE_ID: '11111111-2222-3333-4444-555555555555',
    },
    'runtime'
  );
  await aguardar(async () => runtime!.saida.includes('scheduler iniciado'), 30_000, 'runtime pronto');
}, 120_000);

afterAll(async () => {
  if (runtime) encerrar(runtime.proc);
  if (api) encerrar(api.proc);
  if (admin) {
    await limparTenant(admin, seed.ten);
    void admin.end();
  }
}, 30_000);

async function contarEnvios(): Promise<number> {
  const { rows } = await admin.query(
    "SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE tenant_id=$1 AND direcao='envio'",
    [seed.ten]
  );
  return rows[0]!.n;
}

async function itensDoCiclo(): Promise<Array<{ id: string; estado: string; tentativas: number }>> {
  const { rows } = await admin.query(
    'SELECT id, estado, tentativas FROM itens_ciclo WHERE ciclo_id=$1 ORDER BY id',
    [cicloId]
  );
  return rows;
}

async function tokensPorItem(): Promise<Map<string, string>> {
  const { rows } = await admin.query<{ item_ciclo_id: string; token_correlacao: string }>(
    "SELECT item_ciclo_id, token_correlacao FROM mensagens_comunicacao WHERE tenant_id=$1 AND direcao='envio' AND token_correlacao IS NOT NULL",
    [seed.ten]
  );
  return new Map(rows.map((r) => [r.item_ciclo_id, r.token_correlacao]));
}

describe('gate-acess-runtime-piloto', () => {
  it('ciclo evolui sozinho: POST /ciclos → cobranças → respostas → itens recebidos (sem trigger artificial)', async () => {
    const criacao = await fetch(`http://localhost:${API_PORT}/ciclos`, {
      method: 'POST',
      headers: { cookie: seed.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ obrigacao_id: seed.obrigacaoId }),
    });
    expect(criacao.status).toBe(201);
    cicloId = ((await criacao.json()) as { id: string }).id;
    await admin.query(
      `UPDATE ciclos SET config='{"frequencia_horas":24,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
      [cicloId]
    );

    await aguardar(async () => (await contarEnvios()) === 2, 60_000, 'duas cobranças enviadas ao Mailpit');

    const itens1 = await itensDoCiclo();
    expect(itens1).toHaveLength(2);
    expect(itens1.every((i) => i.estado === 'aguardando' && i.tentativas === 1)).toBe(true);

    const { rows: aud } = await admin.query(
      "SELECT acao FROM eventos_auditoria WHERE tenant_id=$1 AND acao='cobrar'",
      [seed.ten]
    );
    expect(aud).toHaveLength(2);

    const { rows: jobsAbertos } = await admin.query(
      "SELECT count(*)::int AS n FROM jobs_fila WHERE tenant_id=$1 AND estado IN ('pendente','processando')",
      [seed.ten]
    );
    expect(jobsAbertos[0]!.n).toBe(0);

    const tokens = await tokensPorItem();
    expect(tokens.size).toBe(2);

    for (const token of tokens.values()) {
      await responderComoCliente(seed.clienteEmail, token);
    }

    await aguardar(
      async () => (await itensDoCiclo()).every((i) => i.estado === 'recebido'),
      60_000,
      'itens recebidos após respostas'
    );

    const { rows: recebimentos } = await admin.query(
      "SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE tenant_id=$1 AND direcao='recebimento'",
      [seed.ten]
    );
    expect(recebimentos[0]!.n).toBe(2);

    const { rows: auditoriaReceber } = await admin.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE tenant_id=$1 AND acao='receber'",
      [seed.ten]
    );
    expect(auditoriaReceber[0]!.n).toBe(2);
  }, 120_000);

  it('próximas janelas não re-cobram e não duplicam (idempotência/estabilidade)', async () => {
    const envios = await contarEnvios();
    const itens = await itensDoCiclo();

    await new Promise((r) => setTimeout(r, 2_500)); // >= 2 janelas do scheduler

    expect(await contarEnvios()).toBe(envios);
    const itensApos = await itensDoCiclo();
    expect(itensApos.map((i) => `${i.id}:${i.estado}`)).toEqual(itens.map((i) => `${i.id}:${i.estado}`));

    const { rows: falhas } = await admin.query(
      "SELECT count(*)::int AS n FROM jobs_fila WHERE tenant_id=$1 AND estado='falha'",
      [seed.ten]
    );
    expect(falhas[0]!.n).toBe(0);
  }, 60_000);
});