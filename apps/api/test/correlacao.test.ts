import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

import { ADMIN_URL, APP_URL } from '@servium-ia/db';
import { correlacionarRecebidas, extrairToken, parseToken, buscarMensagensDoMailpit } from '../src/runtime/recebimento';

const TEN = 'eeee0000-0000-0000-0000-000000000001';
const SLUG = 'tenant-correlacao-test';

let admin: pg.Client;
let ctx: pg.Client;
let itemId: string;

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Corr',$2)", [TEN, SLUG]);
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Corr','cliente-corr@local') RETURNING id",
    [TEN]
  );
  const { rows: tpl } = await admin.query(
    "INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'Docs') RETURNING id",
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
    "DELETE FROM jobs_fila WHERE tenant_id=$1",
    "DELETE FROM eventos_auditoria WHERE tenant_id=$1",
    "DELETE FROM excecoes WHERE tenant_id=$1",
    "DELETE FROM mensagens_comunicacao WHERE tenant_id=$1",
    "DELETE FROM mensagens_gmail WHERE tenant_id=$1",
    "DELETE FROM documentos WHERE tenant_id=$1",
    "DELETE FROM itens_ciclo WHERE tenant_id=$1",
    "DELETE FROM ciclos WHERE tenant_id=$1",
    "DELETE FROM obrigacoes WHERE tenant_id=$1",
    "DELETE FROM itens_template WHERE tenant_id=$1",
    "DELETE FROM checklist_templates WHERE tenant_id=$1",
    "DELETE FROM clientes WHERE tenant_id=$1",
    "DELETE FROM tenants WHERE id=$1",
  ]) {
    await admin.query(sql, [TEN]);
  }
}

describe('PRM-P0.1-E · correlação resposta ↔ item do ciclo', () => {
  it('token é emitido pelo motor e interpretável (unidade)', () => {
    const token = `t:${itemId}:r2`;
    expect(parseToken(extrairToken(`Olá, precisamos de X.\n\nIdentificador: ${token}`))).toEqual({
      itemId,
      rodada: 2,
      token,
    });
    expect(parseToken('t:invalido:r1')).toBeNull();
    expect(extrairToken('sem token')).toBeUndefined();
  });

  it('resposta tokenizada vincula o item: aguardando → recebido + registros + auditoria', async () => {
    const token = parseToken(`t:${itemId}:r1`)!;
    const res = await correlacionarRecebidas([
      {
        messageId: '<m1@mailpit>',
        remetente: 'cliente-corr@local',
        assunto: 'Re: Pendência',
        corpo: `anexo\nIdentificador: ${token.token}`,
        tokenCorrelacao: token.token,
      },
    ]);
    expect(res.processadas).toBe(1);

    const { rows: itens } = await admin.query("SELECT estado FROM itens_ciclo WHERE id=$1", [itemId]);
    expect(itens[0]!.estado).toBe('recebido');

    const { rows: com } = await admin.query(
      "SELECT direcao, remetente, token_correlacao, message_id FROM mensagens_comunicacao WHERE tenant_id=$1 AND direcao='recebimento'",
      [TEN]
    );
    expect(com).toHaveLength(1);
    expect(com[0]!).toMatchObject({ direcao: 'recebimento', remetente: 'cliente-corr@local', token_correlacao: token.token, message_id: '<m1@mailpit>' });

    const { rows: gmail } = await admin.query(
      "SELECT item_ciclo_id, direcao, token_correlacao FROM mensagens_gmail WHERE tenant_id=$1",
      [TEN]
    );
    expect(gmail[0]!).toMatchObject({ item_ciclo_id: itemId, direcao: 'recebimento', token_correlacao: token.token });

    const { rows: aud } = await admin.query(
      "SELECT acao FROM eventos_auditoria WHERE tenant_id=$1 AND entidade_id=$2 AND acao='receber'",
      [TEN, itemId]
    );
    expect(aud).toHaveLength(1);
  });

  it('mesma resposta repetida é idempotente (não duplica nem re-marca)', async () => {
    const token = parseToken(`t:${itemId}:r1`)!;
    const res = await correlacionarRecebidas([
      {
        messageId: '<m1@mailpit>',
        remetente: 'cliente-corr@local',
        assunto: 'Re: Pendência',
        corpo: `Identificador: ${token.token}`,
        tokenCorrelacao: token.token,
      },
    ]);
    expect(res.processadas).toBe(0);
    const { rows: com } = await admin.query(
      "SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE tenant_id=$1 AND direcao='recebimento'",
      [TEN]
    );
    expect(com[0]!.n).toBe(1);
    const { rows: gmail } = await admin.query(
      "SELECT count(*)::int AS n FROM mensagens_gmail WHERE tenant_id=$1",
      [TEN]
    );
    expect(gmail[0]!.n).toBe(1);
  });

  it('mensagem sem token é ignorada sem efeitos', async () => {
    const res = await correlacionarRecebidas([{ messageId: '<raw>', remetente: 'x@y', corpo: 'oi' }]);
    expect(res.semToken).toBe(1);
    expect(res.processadas).toBe(0);
  });

  it('buscarMensagensDoMailpit extrai token do corpo via REST (servidor fake)', async () => {
    const MSG_ID = 'msg-abc-123';
    const token = `t:${itemId}:r3`;
    const server: Server = createServer(async (req, res) => {
      if (req.url === '/api/v1/messages') {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ messages: [{ ID: '111', MessageID: `<${MSG_ID}>`, From: { Address: 'cliente-corr@local' }, To: [{ Address: 'assistente@servium.local' }], Subject: 'Re: Pendência' }] }));
        return;
      }
      if (req.url === '/api/v1/message/111') {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ MessageID: `<${MSG_ID}>`, From: { Address: 'cliente-corr@local' }, Subject: 'Re: Pendência', Text: `arquivo em anexo\nIdentificador: ${token}` }));
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const addr = server.address() as { port: number };
    try {
      const msgs = await buscarMensagensDoMailpit(`http://127.0.0.1:${addr.port}`, 'assistente@servium.local');
      expect(msgs).toHaveLength(1);
      expect(msgs[0]!).toMatchObject({ messageId: `<${MSG_ID}>`, remetente: 'cliente-corr@local', tokenCorrelacao: token });
    } finally {
      server.close();
    }
  }, 15_000);

  it('cobranças enviadas (token no corpo) não são lidas como resposta', async () => {
    const token = parseToken(`t:${itemId}:r9`)!.token;
    const server: Server = createServer(async (req, res) => {
      res.setHeader('content-type', 'application/json');
      if (req.url === '/api/v1/messages') {
        res.end(JSON.stringify({ messages: [{ ID: '777', MessageID: '<sent-1>', From: { Address: 'assistente@servium.local' }, To: [{ Address: 'cliente-corr@local' }], Subject: 'Pendência' }] }));
        return;
      }
      if (req.url === '/api/v1/message/777') {
        res.end(JSON.stringify({ MessageID: '<sent-1>', From: { Address: 'assistente@servium.local' }, Subject: 'Pendência', Text: `Olá\nIdentificador: ${token}` }));
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const addr = server.address() as { port: number };
    try {
      const msgs = await buscarMensagensDoMailpit(`http://127.0.0.1:${addr.port}`, 'assistente@servium.local');
      expect(msgs).toHaveLength(0);
    } finally {
      server.close();
    }
  }, 15_000);
});