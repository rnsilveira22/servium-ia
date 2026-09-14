import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

import { ADMIN_URL, APP_URL, type Job } from '@servium-ia/db';
import type { MensagemRecebida, ProviderResolver, Recebedor } from '../src/motor/channel';
import { createReceiveHandler } from '../src/runtime/receive-handler';

/**
 * B-2 · email.receber: o handler resolve a fonte de recebimento pelo tenant
 * (nunca chama provider direto), correlaciona e — sem fonte/configuração —
 * conclui sem efeito (job não entra em loop de retry).
 */
const TEN = 'acac0000-0000-0000-0000-00000000a101';
const SLUG = 'tenant-receive-handler';

let admin: pg.Client;
let ctx: pg.Client;
let itemId: string;

class StubRecebedor implements Recebedor {
  constructor(public mensagens: MensagemRecebida[]) {}
  async receber(): Promise<MensagemRecebida[]> {
    return [...this.mensagens];
  }
}

class ResolverStub implements ProviderResolver {
  constructor(private fonte: Recebedor | null) {}
  async obterIntegracao() { return null; }
  async resolverCanal() { return null; }
  async resolverRecebedor() { return this.fonte; }
}

function jobEmailReceber(payload = { provider: 'mailpit' }): Job {
  return {
    id: 'job-recv-1',
    tenant_id: TEN,
    tipo: 'email.receber',
    payload,
    tentativas: 0,
    max_tentativas: 3,
  };
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Recv',$2)", [TEN, SLUG]);
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Recv','cliente-recv@local') RETURNING id",
    [TEN]
  );
  const { rows: tpl } = await admin.query(
    "INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'Docs Recv') RETURNING id",
    [TEN]
  );
  const { rows: itpl } = await admin.query(
    "INSERT INTO itens_template (tenant_id,template_id,descricao,tipo_esperado) VALUES ($1,$2,'Contrato','documento') RETURNING id",
    [TEN, tpl[0]!.id]
  );
  const { rows: obl } = await admin.query(
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao,template_id) VALUES ($1,$2,'Entregar docs',$3) RETURNING id",
    [TEN, cli[0]!.id, tpl[0]!.id]
  );
  const { rows: ciclo } = await admin.query(
    "INSERT INTO ciclos (tenant_id,obrigacao_id) VALUES ($1,$2) RETURNING id",
    [TEN, obl[0]!.id]
  );
  const { rows: item } = await admin.query(
    "INSERT INTO itens_ciclo (tenant_id,ciclo_id,item_template_id,estado,tentativas) VALUES ($1,$2,$3,'aguardando',1) RETURNING id",
    [TEN, ciclo[0]!.id, itpl[0]!.id]
  );
  itemId = item[0]!.id;

  ctx = new pg.Client({ connectionString: APP_URL });
  await ctx.connect();
  await ctx.query("SELECT set_config($1,$2,false)", ['app.tenant_id', TEN]);
});

afterAll(async () => {
  await limpar();
  void admin.end();
  void ctx.end();
});

async function limpar(): Promise<void> {
  for (const sql of [
    'DELETE FROM eventos_auditoria WHERE tenant_id=$1',
    'DELETE FROM mensagens_comunicacao WHERE tenant_id=$1',
    'DELETE FROM mensagens_gmail WHERE tenant_id=$1',
    'DELETE FROM itens_ciclo WHERE tenant_id=$1',
    'DELETE FROM ciclos WHERE tenant_id=$1',
    'DELETE FROM obrigacoes WHERE tenant_id=$1',
    'DELETE FROM itens_template WHERE tenant_id=$1',
    'DELETE FROM checklist_templates WHERE tenant_id=$1',
    'DELETE FROM clientes WHERE tenant_id=$1',
    'DELETE FROM tenants WHERE id=$1',
  ]) {
    await admin.query(sql, [TEN]);
  }
}

describe('B-2 · createReceiveHandler (email.receber)', () => {
  it('sem fonte configurada ⇒ job conclui sem efeito (item segue aguardando)', async () => {
    const handler = createReceiveHandler({ resolver: new ResolverStub(null) });
    await handler(jobEmailReceber(), ctx);

    const { rows: est } = await admin.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemId]);
    expect(est[0].estado).toBe('aguardando');
    const { rows: com } = await admin.query(
      "SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE tenant_id=$1",
      [TEN]
    );
    expect(com[0].n).toBe(0);
  });

  it('fonte devolve resposta tokenizada ⇒ item recebido + comunicação + auditoria', async () => {
    const token = `t:${itemId}:r1`;
    const recebedor = new StubRecebedor([
      {
        provider: 'mailpit',
        providerMessageId: '<recv-handler@mailpit>',
        from: 'cliente-recv@local',
        to: ['assistente@servium.local'],
        subject: 'Re: Pendência',
        bodyText: `anexo\nIdentificador: ${token}`,
        receivedAt: new Date(),
        correlationToken: token,
      },
    ]);
    const handler = createReceiveHandler({ resolver: new ResolverStub(recebedor) });
    await handler(jobEmailReceber(), ctx);

    const { rows: est } = await admin.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemId]);
    expect(est[0].estado).toBe('recebido');
    const { rows: com } = await admin.query(
      "SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE tenant_id=$1 AND direcao='recebimento'",
      [TEN]
    );
    expect(com[0].n).toBe(1);
    const { rows: aud } = await admin.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE tenant_id=$1 AND entidade_id=$2 AND acao='receber'",
      [TEN, itemId]
    );
    expect(aud[0].n).toBe(1);
  });
});