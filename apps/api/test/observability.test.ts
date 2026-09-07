import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { Client } from 'pg';

import { ADMIN_URL } from '@servium-ia/db';
import { buildApp } from '../src/app.factory';

const TEN = '77777777-7777-7777-7777-777777777777';

let app: INestApplication;
let req: supertest.Agent;
let admin: Client;

beforeAll(async () => {
  admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
});

afterAll(async () => {
  await app.close();
  await limpar();
  void admin.end();
});

async function limpar() {
  await admin.query('DELETE FROM sessoes WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM eventos_auditoria WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM operadores WHERE tenant_id=$1', [TEN]);
  await admin.query('DELETE FROM tenants WHERE id=$1', [TEN]);
}

describe('SRV-9 · auditoria e observabilidade', () => {
  it('GET /health retorna 200 com db: true e timestamp', async () => {
    const r = await req.get('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
    expect(r.body.db).toBe(true);
    expect(typeof r.body.timestamp).toBe('string');
    expect(r.body.timestamp.length).toBeGreaterThan(0);
  });

  it('correlation ID propagado no response header', async () => {
    const r = await req.get('/health');
    expect(r.headers['x-request-id']).toBeDefined();
    expect(r.headers['x-request-id'].length).toBeGreaterThan(0);
  });

  it('correlation ID do client é preservado', async () => {
    const customId = 'test-cid-abc-123';
    const r = await req.get('/health').set('X-Request-ID', customId);
    expect(r.headers['x-request-id']).toBe(customId);
  });

  it('métricas incrementam a cada request', async () => {
    const before = await req.get('/metrics');
    expect(before.status).toBe(200);
    const getCount = (name: string): number => before.body[name] ?? 0;

    const countBefore = getCount('request:GET');
    await req.get('/health');
    const after = await req.get('/metrics');
    expect(after.body['request:GET']).toBeGreaterThanOrEqual(countBefore + 1);
  });
});
