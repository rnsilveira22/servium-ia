import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { hash } from '@node-rs/argon2';

import { ADMIN_URL } from '@servium-ia/db';
import { buildApp } from '../src/app.factory';

// Tenants EXCLUSIVOS deste arquivo (paralelismo vitest — lição SRV-7)
const TEN_A = '99999999-9999-9999-9999-999999999991';
const TEN_B = '99999999-9999-9999-9999-999999999992';
const SLUG_A = 'tenant-painel-a';
const SLUG_B = 'tenant-painel-b';
const EMAIL = 'admin@painel-test.local';
const SENHA = 'senha-' + randomBytes(8).toString('hex');

let app: INestApplication;
let req: supertest.Agent;
let admin: import('pg').Client;
let cookieA: string;
let cookieB: string;

/** Data (YYYY-MM-DD) a `dias` de hoje, no mesmo fuso usado pela API. */
function dataEm(dias: number): string {
  const d = new Date(Date.now() + dias * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

async function limpar() {
  for (const ten of [TEN_A, TEN_B]) {
    for (const sql of [
      'DELETE FROM excecoes WHERE tenant_id=$1',
      'DELETE FROM mensagens_comunicacao WHERE tenant_id=$1',
      'DELETE FROM itens_ciclo WHERE tenant_id=$1',
      'DELETE FROM ciclos WHERE tenant_id=$1',
      'DELETE FROM itens_template WHERE tenant_id=$1',
      'DELETE FROM checklist_templates WHERE tenant_id=$1',
      'DELETE FROM jobs_fila WHERE tenant_id=$1',
      'DELETE FROM obrigacoes WHERE tenant_id=$1',
      'DELETE FROM clientes WHERE tenant_id=$1',
      'DELETE FROM eventos_auditoria WHERE tenant_id=$1',
      'DELETE FROM sessoes WHERE tenant_id=$1',
      'DELETE FROM operadores WHERE tenant_id=$1',
      'DELETE FROM tenants WHERE id=$1',
    ]) {
      await admin.query(sql, [ten]);
    }
  }
}

async function login(slug: string): Promise<string> {
  const r = await req.post('/auth/login').send({ slug, email: EMAIL, senha: SENHA });
  expect(r.status).toBe(200);
  return r.headers['set-cookie'][0].split(';')[0];
}

/** Cria cliente + obrigação (com prazo) + ciclo aberto + itens nos estados informados. */
async function semear(
  ten: string,
  nomeCliente: string,
  prazo: string | null,
  estados: string[],
  estadoCiclo = 'aberto'
) {
  const cli = await admin.query<{ id: string }>(
    `INSERT INTO clientes (tenant_id, nome) VALUES ($1,$2) RETURNING id`,
    [ten, nomeCliente]
  );
  const obr = await admin.query<{ id: string }>(
    `INSERT INTO obrigacoes (tenant_id, cliente_id, descricao, prazo) VALUES ($1,$2,'Folha',$3) RETURNING id`,
    [ten, cli.rows[0]!.id, prazo]
  );
  const tpl = await admin.query<{ id: string }>(
    `INSERT INTO checklist_templates (tenant_id, nome) VALUES ($1,'T') RETURNING id`,
    [ten]
  );
  const ciclo = await admin.query<{ id: string }>(
    `INSERT INTO ciclos (tenant_id, obrigacao_id, estado) VALUES ($1,$2,$3) RETURNING id`,
    [ten, obr.rows[0]!.id, estadoCiclo]
  );
  let ordem = 1;
  for (const estado of estados) {
    const it = await admin.query<{ id: string }>(
      `INSERT INTO itens_template (tenant_id, template_id, descricao, ordem) VALUES ($1,$2,$3,$4) RETURNING id`,
      [ten, tpl.rows[0]!.id, `Item ${ordem}`, ordem]
    );
    await admin.query(
      `INSERT INTO itens_ciclo (tenant_id, ciclo_id, item_template_id, estado) VALUES ($1,$2,$3,$4)`,
      [ten, ciclo.rows[0]!.id, it.rows[0]!.id, estado]
    );
    ordem += 1;
  }
}

beforeAll(async () => {
  const pg = await import('pg');
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();
  for (const [ten, slug] of [
    [TEN_A, SLUG_A],
    [TEN_B, SLUG_B],
  ] as const) {
    await admin.query("INSERT INTO tenants (id, nome, slug) VALUES ($1,'Painel Test',$2)", [ten, slug]);
    await admin.query(
      `INSERT INTO operadores (tenant_id, nome, email, senha_hash, papel) VALUES ($1,'Admin',$2,$3,'admin')`,
      [ten, EMAIL, await hash(SENHA)]
    );
  }

  await semear(TEN_A, 'Cliente Vermelho', dataEm(10), ['resolvido', 'excecao']);
  await semear(TEN_A, 'Cliente Amarelo', dataEm(5), ['resolvido', 'aguardando', 'cobrado']);
  await semear(TEN_A, 'Cliente Verde', dataEm(30), ['resolvido', 'resolvido']);
  await semear(TEN_A, 'Cliente Encerrado', dataEm(1), ['pendente'], 'encerrado');
  await semear(TEN_B, 'Cliente Outro Tenant', dataEm(1), ['excecao']);

  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
  cookieA = await login(SLUG_A);
  cookieB = await login(SLUG_B);
});

afterAll(async () => {
  await app.close();
  await limpar();
  void admin.end();
});

describe('GET /ciclos/painel — semáforo por cliente', () => {
  it('sem autenticação ⇒ 401', async () => {
    expect((await req.get('/ciclos/painel')).status).toBe(401);
  });

  it('não é confundido com GET /ciclos/:cicloId', async () => {
    const r = await req.get('/ciclos/painel').set('Cookie', cookieA);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('classifica e ordena: vermelho, amarelo, verde; ignora ciclos encerrados', async () => {
    const r = await req.get('/ciclos/painel').set('Cookie', cookieA);
    expect(r.body.map((c: { cliente: string }) => c.cliente)).toEqual([
      'Cliente Vermelho',
      'Cliente Amarelo',
      'Cliente Verde',
    ]);
    expect(r.body.map((c: { semaforo: string }) => c.semaforo)).toEqual(['vermelho', 'amarelo', 'verde']);
  });

  it('traz contagens, prazo e motivo em linguagem de negócio', async () => {
    const r = await req.get('/ciclos/painel').set('Cookie', cookieA);
    const [vermelho, amarelo] = r.body;
    expect(vermelho).toMatchObject({ excecoes: 1, pendentes: 0, resolvidos: 1, itens: 2, ciclos_abertos: 1 });
    expect(vermelho.motivo).toContain('1 exceção aguardando sua decisão');
    expect(amarelo).toMatchObject({ pendentes: 2, excecoes: 0, prazo_proximo: dataEm(5) });
    expect(amarelo.motivo).toBe('faltam 2 itens; prazo em 5 dias');
  });

  it('isolamento por tenant: não enxerga clientes de outro tenant (RLS)', async () => {
    const a = await req.get('/ciclos/painel').set('Cookie', cookieA);
    expect(a.body.map((c: { cliente: string }) => c.cliente)).not.toContain('Cliente Outro Tenant');
    const b = await req.get('/ciclos/painel').set('Cookie', cookieB);
    expect(b.body.map((c: { cliente: string }) => c.cliente)).toEqual(['Cliente Outro Tenant']);
  });
});
