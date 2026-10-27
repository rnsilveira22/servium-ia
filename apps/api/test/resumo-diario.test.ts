import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import pg from 'pg';
import supertest from 'supertest';
import { hash } from '@node-rs/argon2';

import { ADMIN_URL, APP_URL, setTenant, type Job } from '@servium-ia/db';
import { buildApp } from '../src/app.factory';
import { FakeChannel } from '../src/motor/channel';
import { createResumoDiarioHandler } from '../src/runtime/resumo-diario';
import { ResumoScheduler } from '../src/runtime/resumo-scheduler';

// Tenants EXCLUSIVOS deste arquivo (paralelismo vitest — lição SRV-7)
const TEN = 'acac0000-0000-0000-0000-00000000b201';
const TEN_B = 'acac0000-0000-0000-0000-00000000b202';
const SLUG = 'tenant-resumo-a';
const SLUG_B = 'tenant-resumo-b';
const SENHA = 'senha-' + randomBytes(8).toString('hex');
const EMAIL_ADMIN = 'admin@resumo-test.local';
const EMAIL_ADMIN2 = 'admin2@resumo-test.local';
const EMAIL_OPER = 'oper@resumo-test.local';

// 27/10/2026 11:00 UTC = 08:00 em Brasília
const AGORA = new Date('2026-10-27T11:00:00Z');
const HOJE = '2026-10-27';

let admin: pg.Client;
let ctx: pg.Client;
let app: INestApplication;
let req: supertest.Agent;
let cookieAdmin: string;
let cookieOper: string;

async function limpar() {
  for (const ten of [TEN, TEN_B]) {
    for (const sql of [
      'DELETE FROM eventos_auditoria WHERE tenant_id=$1',
      'DELETE FROM excecoes WHERE tenant_id=$1',
      'DELETE FROM mensagens_comunicacao WHERE tenant_id=$1',
      'DELETE FROM jobs_fila WHERE tenant_id=$1',
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
      await admin.query(sql, [ten]);
    }
  }
}

/** Cliente com prazo em `dias` e itens nos estados dados (ciclo aberto). */
async function semearCliente(ten: string, nome: string, dias: number, estados: string[]) {
  const prazo = new Date(AGORA.getTime() + dias * 86_400_000).toISOString().slice(0, 10);
  const cli = await admin.query<{ id: string }>('INSERT INTO clientes (tenant_id,nome) VALUES ($1,$2) RETURNING id', [ten, nome]);
  const obr = await admin.query<{ id: string }>(
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao,prazo) VALUES ($1,$2,'Folha',$3) RETURNING id",
    [ten, cli.rows[0]!.id, prazo]
  );
  const tpl = await admin.query<{ id: string }>("INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'T') RETURNING id", [ten]);
  const ciclo = await admin.query<{ id: string }>('INSERT INTO ciclos (tenant_id,obrigacao_id) VALUES ($1,$2) RETURNING id', [
    ten,
    obr.rows[0]!.id,
  ]);
  let ordem = 1;
  for (const estado of estados) {
    const it = await admin.query<{ id: string }>(
      'INSERT INTO itens_template (tenant_id,template_id,descricao,ordem) VALUES ($1,$2,$3,$4) RETURNING id',
      [ten, tpl.rows[0]!.id, `Item ${ordem}`, ordem]
    );
    await admin.query('INSERT INTO itens_ciclo (tenant_id,ciclo_id,item_template_id,estado) VALUES ($1,$2,$3,$4)', [
      ten,
      ciclo.rows[0]!.id,
      it.rows[0]!.id,
      estado,
    ]);
    ordem += 1;
  }
}

async function configurar(ten: string, ativo: boolean, hora = 8, enviarVazio = false) {
  await admin.query(
    'UPDATE tenants SET resumo_diario_ativo=$2, resumo_diario_hora=$3, resumo_diario_enviar_vazio=$4 WHERE id=$1',
    [ten, ativo, hora, enviarVazio]
  );
}

function job(ten = TEN): Job {
  return { id: 'job-resumo-1', tenant_id: ten, tipo: 'resumo.diario', payload: { data: HOJE }, tentativas: 1, max_tentativas: 3 };
}

async function conectarTenant(ten: string): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: APP_URL });
  await c.connect();
  await setTenant(c, ten);
  return c;
}

async function auditoria(acao: string): Promise<number> {
  const { rows } = await admin.query('SELECT 1 FROM eventos_auditoria WHERE tenant_id=$1 AND acao=$2', [TEN, acao]);
  return rows.length;
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();
  for (const [ten, slug] of [
    [TEN, SLUG],
    [TEN_B, SLUG_B],
  ] as const) {
    await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Resumo',$2)", [ten, slug]);
  }
  const senhaHash = await hash(SENHA);
  const ops: Array<[string, string, string, string, boolean]> = [
    [TEN, 'Admin', EMAIL_ADMIN, 'admin', true],
    [TEN, 'Admin 2', EMAIL_ADMIN2, 'admin', true],
    [TEN, 'Operador', EMAIL_OPER, 'operador', true],
    [TEN, 'Admin Inativo', 'inativo@resumo-test.local', 'admin', false],
    [TEN_B, 'Admin B', 'admin-b@resumo-test.local', 'admin', true],
  ];
  for (const [ten, nome, email, papel, ativo] of ops) {
    await admin.query(
      'INSERT INTO operadores (tenant_id,nome,email,senha_hash,papel,ativo) VALUES ($1,$2,$3,$4,$5,$6)',
      [ten, nome, email, senhaHash, papel, ativo]
    );
  }
  app = await buildApp(true);
  await app.init();
  req = supertest(app.getHttpServer());
  const login = async (email: string) => {
    const r = await req.post('/auth/login').send({ slug: SLUG, email, senha: SENHA });
    expect(r.status).toBe(200);
    return r.headers['set-cookie'][0].split(';')[0] as string;
  };
  cookieAdmin = await login(EMAIL_ADMIN);
  cookieOper = await login(EMAIL_OPER);
  ctx = await conectarTenant(TEN);
});

beforeEach(async () => {
  for (const sql of [
    'DELETE FROM eventos_auditoria WHERE tenant_id=$1',
    'DELETE FROM mensagens_comunicacao WHERE tenant_id=$1',
    'DELETE FROM jobs_fila WHERE tenant_id=$1',
    'DELETE FROM itens_ciclo WHERE tenant_id=$1',
    'DELETE FROM ciclos WHERE tenant_id=$1',
    'DELETE FROM obrigacoes WHERE tenant_id=$1',
    'DELETE FROM itens_template WHERE tenant_id=$1',
    'DELETE FROM checklist_templates WHERE tenant_id=$1',
    'DELETE FROM clientes WHERE tenant_id=$1',
  ]) {
    await admin.query(sql, [TEN]);
  }
  await configurar(TEN, true);
});

afterAll(async () => {
  void ctx.end();
  await app.close();
  await limpar();
  void admin.end();
});

describe('VP-02 · handler resumo.diario', () => {
  it('envia o resumo a cada admin ATIVO (não a operador nem inativo) e registra mensagem + auditoria', async () => {
    await semearCliente(TEN, 'Cliente Urgente', 1, ['aguardando', 'pendente']);
    const canal = new FakeChannel();
    await createResumoDiarioHandler({ channel: canal, clock: () => AGORA, log: () => undefined })(job(), ctx);

    expect(canal.enviadas.map((m) => m.destinatario).sort()).toEqual([EMAIL_ADMIN, EMAIL_ADMIN2].sort());
    const m = canal.enviadas[0]!;
    expect(m.assunto).toContain('1 cliente precisa de atenção');
    expect(m.corpo).toContain('Cliente Urgente');
    expect(m.tokenCorrelacao).toBeUndefined(); // não é cobrança ao cliente final

    const { rows } = await admin.query(
      "SELECT destinatario, template, item_ciclo_id, status FROM mensagens_comunicacao WHERE tenant_id=$1 ORDER BY destinatario",
      [TEN]
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.template === 'resumo_diario' && r.item_ciclo_id === null && r.status === 'enviado')).toBe(true);
    expect(await auditoria('resumo_diario_enviado')).toBe(2);
  });

  it('idempotente: reexecutar no mesmo dia não reenvia a quem já recebeu', async () => {
    await semearCliente(TEN, 'Cliente Urgente', 1, ['aguardando']);
    const canal = new FakeChannel();
    const handler = createResumoDiarioHandler({ channel: canal, clock: () => AGORA, log: () => undefined });
    await handler(job(), ctx);
    await handler(job(), ctx);
    expect(canal.enviadas).toHaveLength(2);
  });

  it('retry após falha parcial reenvia SOMENTE a quem não recebeu e registra a falha', async () => {
    await semearCliente(TEN, 'Cliente Urgente', 1, ['aguardando']);
    const canal = new FakeChannel();
    canal.falharProximas = 1; // o 1º destinatário falha, o 2º entrega
    const handler = createResumoDiarioHandler({ channel: canal, clock: () => AGORA, log: () => undefined });

    await expect(handler(job(), ctx)).rejects.toThrow(/falha de envio/);
    expect(canal.enviadas).toHaveLength(1);
    expect(await auditoria('resumo_diario_falha')).toBe(1);

    await handler(job(), ctx); // retry da fila
    expect(canal.enviadas).toHaveLength(2);
    expect(new Set(canal.enviadas.map((m) => m.destinatario)).size).toBe(2); // ninguém recebeu duas vezes
  });

  it('opt-in: tenant com resumo desligado não envia nada', async () => {
    await configurar(TEN, false);
    await semearCliente(TEN, 'Cliente Urgente', 1, ['aguardando']);
    const canal = new FakeChannel();
    await createResumoDiarioHandler({ channel: canal, clock: () => AGORA, log: () => undefined })(job(), ctx);
    expect(canal.enviadas).toHaveLength(0);
  });

  it('tudo em dia: dispensa o envio (auditado) a menos que enviar_vazio esteja ligado', async () => {
    await semearCliente(TEN, 'Cliente Folgado', 40, ['aguardando']);
    const canal = new FakeChannel();
    const handler = createResumoDiarioHandler({ channel: canal, clock: () => AGORA, log: () => undefined });
    await handler(job(), ctx);
    expect(canal.enviadas).toHaveLength(0);
    expect(await auditoria('resumo_diario_dispensado')).toBe(1);

    await configurar(TEN, true, 8, true);
    await handler(job(), ctx);
    expect(canal.enviadas).toHaveLength(2);
    expect(canal.enviadas[0]!.assunto).toContain('tudo em dia');
  });

  it('conta só cobranças a clientes e respostas das últimas 24 h; resumos e mensagens antigas ficam de fora', async () => {
    await semearCliente(TEN, 'Cliente Urgente', 1, ['aguardando']);
    const { rows } = await admin.query<{ id: string }>('SELECT id FROM itens_ciclo WHERE tenant_id=$1', [TEN]);
    const itemId = rows[0]!.id;
    const msg = (dir: string, item: string | null, chave: string, template: string | null, quando: string) =>
      admin.query(
        `INSERT INTO mensagens_comunicacao (tenant_id,item_ciclo_id,direcao,canal,template,idempotency_key,status,criado_em)
         VALUES ($1,$2,$3,'email',$4,$5,'enviado',now() - $6::interval)`,
        [TEN, item, dir, template, chave, quando]
      );
    await msg('envio', itemId, 'cobranca-recente', null, '2 hours'); // conta
    await msg('recebimento', itemId, 'resposta-recente', null, '3 hours'); // conta
    await msg('envio', itemId, 'cobranca-antiga', null, '30 hours'); // fora da janela
    await msg('envio', null, 'resumo-de-ontem', 'resumo_diario', '1 hour'); // resumo: nunca conta como cobrança

    const canal = new FakeChannel();
    await createResumoDiarioHandler({ channel: canal, clock: () => AGORA, log: () => undefined })(job(), ctx);
    expect(canal.enviadas[0]!.corpo).toContain('1 cobrança enviada e 1 resposta de cliente recebida');
  });

  it('isolamento: o resumo do tenant A nunca traz clientes nem destinatários do tenant B', async () => {
    await semearCliente(TEN, 'Cliente A', 1, ['aguardando']);
    await semearCliente(TEN_B, 'Cliente Secreto B', 1, ['aguardando']);
    const canal = new FakeChannel();
    await createResumoDiarioHandler({ channel: canal, clock: () => AGORA, log: () => undefined })(job(), ctx);
    expect(canal.enviadas.every((m) => !m.corpo.includes('Cliente Secreto B'))).toBe(true);
    expect(canal.enviadas.every((m) => !m.destinatario.includes('admin-b@'))).toBe(true);
    await admin.query('DELETE FROM itens_ciclo WHERE tenant_id=$1', [TEN_B]);
  });

  it('usa o canal resolvido do tenant e o remetente dele, quando houver', async () => {
    await semearCliente(TEN, 'Cliente Urgente', 1, ['aguardando']);
    const global = new FakeChannel();
    const doTenant = new FakeChannel();
    const resolver = {
      obterIntegracao: async () => null,
      resolverRecebedor: async () => null,
      resolverCanal: async () => ({ canal: doTenant, remetente: 'escritorio@tenant.test' }),
    };
    await createResumoDiarioHandler({ channel: global, resolver, clock: () => AGORA, log: () => undefined })(job(), ctx);
    expect(global.enviadas).toHaveLength(0);
    expect(doTenant.enviadas).toHaveLength(2);
    const { rows } = await admin.query('SELECT DISTINCT remetente FROM mensagens_comunicacao WHERE tenant_id=$1', [TEN]);
    expect(rows.map((r) => r.remetente)).toEqual(['escritorio@tenant.test']);
  });
});

describe('VP-02 · ResumoScheduler', () => {
  async function jobsDoDia(): Promise<number> {
    const { rows } = await admin.query("SELECT 1 FROM jobs_fila WHERE tenant_id=$1 AND tipo='resumo.diario'", [TEN]);
    return rows.length;
  }

  it('enfileira 1 job/dia/tenant na hora configurada e é idempotente entre varreduras', async () => {
    const sched = new ResumoScheduler({ clock: () => AGORA, log: () => undefined });
    await sched.runTick();
    await sched.runTick();
    await sched.runTick();
    expect(await jobsDoDia()).toBe(1);
  });

  it('não enfileira antes da hora configurada', async () => {
    await configurar(TEN, true, 9); // 09h; agora são 08h em Brasília
    await new ResumoScheduler({ clock: () => AGORA, log: () => undefined }).runTick();
    expect(await jobsDoDia()).toBe(0);
  });

  it('recupera o dia se o runtime voltar depois da hora marcada', async () => {
    const tarde = new Date('2026-10-27T17:30:00Z'); // 14h30 em Brasília
    await new ResumoScheduler({ clock: () => tarde, log: () => undefined }).runTick();
    expect(await jobsDoDia()).toBe(1);
  });

  it('um novo dia gera um novo job', async () => {
    await new ResumoScheduler({ clock: () => AGORA, log: () => undefined }).runTick();
    const amanha = new Date(AGORA.getTime() + 86_400_000);
    await new ResumoScheduler({ clock: () => amanha, log: () => undefined }).runTick();
    expect(await jobsDoDia()).toBe(2);
  });

  it('tenant com resumo desligado nunca é enfileirado (opt-in)', async () => {
    await configurar(TEN, false);
    await new ResumoScheduler({ clock: () => AGORA, log: () => undefined }).runTick();
    expect(await jobsDoDia()).toBe(0);
  });
});

describe('VP-02 · GET/PUT /configuracoes/resumo-diario', () => {
  it('padrão de um tenant novo: desligado, 08h, sem enviar vazio', async () => {
    await admin.query(
      "UPDATE tenants SET resumo_diario_ativo=DEFAULT, resumo_diario_hora=DEFAULT, resumo_diario_enviar_vazio=DEFAULT WHERE id=$1",
      [TEN]
    );
    const r = await req.get('/configuracoes/resumo-diario').set('Cookie', cookieAdmin);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ativo: false, hora: 8, enviar_vazio: false });
  });

  it('PUT parcial altera só o enviado, persiste e audita', async () => {
    await configurar(TEN, false, 8, false);
    const r = await req.put('/configuracoes/resumo-diario').set('Cookie', cookieAdmin).send({ ativo: true, hora: 7 });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ativo: true, hora: 7, enviar_vazio: false });
    expect((await req.get('/configuracoes/resumo-diario').set('Cookie', cookieAdmin)).body).toEqual(r.body);
    expect(await auditoria('configurar_resumo_diario')).toBe(1);
  });

  it.each([
    [{ hora: 24 }],
    [{ hora: -1 }],
    [{ hora: 7.5 }],
    [{ hora: '8' }],
    [{ ativo: 'sim' }],
    [{ enviar_vazio: 1 }],
  ])('valor inválido %j ⇒ 400 e NÃO persiste', async (corpo) => {
    await configurar(TEN, true, 8, false);
    const r = await req.put('/configuracoes/resumo-diario').set('Cookie', cookieAdmin).send(corpo);
    expect(r.status).toBe(400);
    expect((await req.get('/configuracoes/resumo-diario').set('Cookie', cookieAdmin)).body).toEqual({
      ativo: true,
      hora: 8,
      enviar_vazio: false,
    });
  });

  it('RBAC: operador ⇒ 403; anônimo ⇒ 401', async () => {
    expect((await req.get('/configuracoes/resumo-diario').set('Cookie', cookieOper)).status).toBe(403);
    expect((await req.put('/configuracoes/resumo-diario').set('Cookie', cookieOper).send({ ativo: true })).status).toBe(403);
    expect((await req.get('/configuracoes/resumo-diario')).status).toBe(401);
  });
});
