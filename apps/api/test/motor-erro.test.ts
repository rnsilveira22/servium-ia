import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ADMIN_URL, APP_URL, claimJobs, completeJob, enqueue } from '@servium-ia/db';
import pg from 'pg';
import { FakeChannel } from '../src/motor/channel';
import { registrarMotorHandlers, type MotorDeps } from '../src/motor/handlers';
import { correlacionarRecebidas } from '../src/runtime/recebimento';
import { sabotarQuery } from './helpers/sabotar-query';

/**
 * M1-OPS-03 · Evidências de sucesso E erro nas rotinas do motor.
 * Matriz coberta: ativarCiclo, cobrarItem, tickCiclos, encerrarCiclo e
 * recebimento/correlação. Todo cenário faz os dois lados: caminho feliz e
 * injeção de falha (FakeChannel.falharProximas / sabotar-query), com asserts
 * em jobs_fila (concluido/falha), estado de item, mensagens_comunicacao,
 * ausência de duplicatas e idempotência por message_id.
 */

const TEN = 'aaaa0000-0000-0000-0000-0000aa0e0003';
const SLUG = 'tenant-motor-erro';
let admin: pg.Client;
let ctx: pg.Client;

const canal = new FakeChannel();
const deps: MotorDeps = { channel: canal };
const handlers = registrarMotorHandlers(deps);

let clienteId: string;
let templateId: string;
let itemTemplateIds: string[];
let obrigId: string;

interface ResultadoRotina {
  tipo: string;
  ok: boolean;
  tentativas: number;
  ultimo_erro: string | null;
}

/** Executa a fila até esgotar jobs disponíveis; devolve evidência por rotina. */
async function rodarJobs(maxIter = 80): Promise<ResultadoRotina[]> {
  const resultados = new Map<string, ResultadoRotina>();
  for (let i = 0; i < maxIter; i++) {
    const jobs = await claimJobs(admin, 10);
    if (jobs.length === 0) break;
    for (const j of jobs) {
      try {
        const h = handlers.get(j.tipo);
        if (!h) throw new Error(`sem handler ${j.tipo}`);
        await h(j, ctx);
        await completeJob(ctx, j.id);
        resultados.set(j.id, { tipo: j.tipo, ok: true, tentativas: j.tentativas, ultimo_erro: null });
      } catch (err) {
        const msg = String((err as Error).message);
        // claimJobs já incrementou tentativas; retry/limite usam o valor corrente.
        const { rows } = await ctx.query<{ estado: string; tentativas: number; ultimo_erro: string | null }>(
          `UPDATE jobs_fila
              SET estado = CASE WHEN tentativas >= max_tentativas THEN 'falha' ELSE 'pendente' END,
                  ultimo_erro = $2,
                  disponivel_em = now()
            WHERE id = $1 AND estado = 'processando'
            RETURNING estado, tentativas, ultimo_erro`,
          [j.id, msg]
        );
        const r = rows[0];
        resultados.set(j.id, {
          tipo: j.tipo,
          ok: false,
          tentativas: r?.tentativas ?? j.tentativas,
          ultimo_erro: r?.ultimo_erro ?? msg,
        });
      }
    }
  }
  const ok = [...resultados.values()].filter((r) => r.ok).length;
  const falha = [...resultados.values()].filter((r) => !r.ok).length;
  process.stdout.write(`[motor] ok: ${ok} falha: ${falha}\n`);
  return [...resultados.values()];
}

async function novoCicloIds(): Promise<{ cicloId: string }> {
  const { rows } = await ctx.query<{ id: string }>(
    "INSERT INTO ciclos (tenant_id, obrigacao_id) VALUES ($1,$2) RETURNING id",
    [TEN, obrigId]
  );
  return { cicloId: rows[0]!.id };
}

async function itemDe(cicloId: string): Promise<{ id: string }[]> {
  const { rows } = await ctx.query<{ id: string }>(
    'SELECT id FROM itens_ciclo WHERE ciclo_id=$1 ORDER BY id',
    [cicloId]
  );
  return rows;
}

async function estadoCiclo(cicloId: string): Promise<string> {
  const { rows } = await ctx.query<{ estado: string }>('SELECT estado FROM ciclos WHERE id=$1', [cicloId]);
  return rows[0]!.estado;
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Motor Erro',$2)", [TEN, SLUG]);
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Err','cliente-err@local') RETURNING id",
    [TEN]
  );
  clienteId = cli[0]!.id;
  const { rows: tpl } = await admin.query(
    "INSERT INTO checklist_templates (tenant_id,nome) VALUES ($1,'Docs Err') RETURNING id",
    [TEN]
  );
  templateId = tpl[0]!.id;
  const itens: string[] = [];
  for (const [desc, tipo] of [
    ['Contrato', 'documento'],
    ['CNPJ', 'informacao'],
  ] as const) {
    const { rows } = await admin.query(
      "INSERT INTO itens_template (tenant_id,template_id,descricao,tipo_esperado) VALUES ($1,$2,$3,$4) RETURNING id",
      [TEN, templateId, desc, tipo]
    );
    itens.push(rows[0]!.id);
  }
  itemTemplateIds = itens;
  const { rows: obl } = await admin.query(
    "INSERT INTO obrigacoes (tenant_id,cliente_id,descricao,template_id) VALUES ($1,$2,'Obrig err',$3) RETURNING id",
    [TEN, clienteId, templateId]
  );
  obrigId = obl[0]!.id;

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
  const apagar = (sql: string) => admin.query(sql, [TEN]);
  await apagar("DELETE FROM jobs_fila WHERE tenant_id=$1");
  await apagar("DELETE FROM eventos_auditoria WHERE tenant_id=$1");
  await apagar("DELETE FROM excecoes WHERE tenant_id=$1");
  await apagar("DELETE FROM mensagens_comunicacao WHERE tenant_id=$1");
  await apagar("DELETE FROM mensagens_gmail WHERE tenant_id=$1");
  await apagar("DELETE FROM documentos WHERE tenant_id=$1");
  await apagar("DELETE FROM itens_ciclo WHERE tenant_id=$1");
  await apagar("DELETE FROM ciclos WHERE tenant_id=$1");
  await apagar("DELETE FROM obrigacoes WHERE tenant_id=$1");
  await apagar("DELETE FROM itens_template WHERE tenant_id=$1");
  await apagar("DELETE FROM checklist_templates WHERE tenant_id=$1");
  await apagar("DELETE FROM clientes WHERE tenant_id=$1");
  await apagar("DELETE FROM tenants WHERE id=$1");
}

describe('M1-OPS-03 · ativarCiclo — sucesso e erro', () => {
  it('sucesso: materializa 2 itens (aguardando) + jobs concluido; re-ativar não duplica', async () => {
    canal.enviadas = [];
    const { cicloId } = await novoCicloIds();
    await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: cicloId }, idempotencyKey: `err-ativar:${cicloId}` });
    const res = await rodarJobs();
    const ativar = res.filter((r) => r.tipo === 'ciclo.ativar');
    expect(ativar.some((r) => r.ok)).toBe(true);

    const itens = await itemDe(cicloId);
    expect(itens).toHaveLength(2); // itens materializados, sem duplicata
    // jobs_fila concluido no caminho feliz
    const { rows: jobs } = await admin.query("SELECT estado FROM jobs_fila WHERE tenant_id=$1 AND tipo='ciclo.ativar'", [TEN]);
    expect(jobs.every((j: { estado: string }) => j.estado === 'concluido')).toBe(true);

    // re-enfileira ativar para o MESMO ciclo ⇒ idempotente, não duplica itens
    await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: cicloId }, idempotencyKey: `err-ativar2:${cicloId}` });
    await rodarJobs();
    const itens2 = await itemDe(cicloId);
    expect(itens2).toHaveLength(2);
  });

  it('erro (sabotar insert): job falha + ultimo_erro; NENHUM item duplicado', async () => {
    const { cicloId } = await novoCicloIds();
    await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: cicloId }, idempotencyKey: `err-ativar-fail:${cicloId}` });
    const s = sabotarQuery(ctx, /INSERT INTO itens_ciclo/i);
    const res = await rodarJobs();
    s.desfazer();

    const ativar = res.filter((r) => r.tipo === 'ciclo.ativar' && !r.ok);
    expect(ativar.length).toBeGreaterThan(0);
    expect(ativar[0]!.ultimo_erro).toBeTruthy();
    const { rows: jobs } = await admin.query(
      "SELECT estado, ultimo_erro FROM jobs_fila WHERE tenant_id=$1 AND tipo='ciclo.ativar' AND estado='falha'",
      [TEN]
    );
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0]!.ultimo_erro).toBeTruthy();
    // transação atômica ⇒ rollback ⇒ nenhuma duplicata materializada
    const itens = await itemDe(cicloId);
    expect(itens).toHaveLength(0);
  });
});

describe('M1-OPS-03 · cobrarItem — sucesso, retry e escalada_limite', () => {
  it('sucesso: mensagem envio + auditoria cobrar; item aguardando', async () => {
    canal.enviadas = [];
    const { cicloId } = await novoCicloIds();
    await ctx.query(
      `UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
      [cicloId]
    );
    await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: cicloId }, idempotencyKey: `cobrar-ativar:${cicloId}` });
    await rodarJobs();
    const itens = await itemDe(cicloId);
    expect(itens).toHaveLength(2);
    const itemId = itens[0]!.id;
    await enqueue(ctx, { tipo: 'item.cobrar', payload: { item_ciclo_id: itemId }, idempotencyKey: `cobrar-run:${itemId}` });
    await rodarJobs();

    const { rows: msgs } = await admin.query(
      "SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE tenant_id=$1 AND item_ciclo_id=$2 AND direcao='envio'",
      [TEN, itemId]
    );
    expect(msgs[0]!.n).toBe(1);
    const { rows: aud } = await admin.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE tenant_id=$1 AND entidade_id=$2 AND acao='cobrar'",
      [TEN, itemId]
    );
    expect(aud[0]!.n).toBe(1);
    const { rows } = await admin.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemId]);
    expect(rows[0]!.estado).toBe('aguardando');
  });

  it('erro transitório (FakeChannel.falharProximas): retry respeitado até concluir', async () => {
    canal.enviadas = [];
    const { cicloId } = await novoCicloIds();
    await ctx.query(
      `UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
      [cicloId]
    );
    await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: cicloId }, idempotencyKey: `retry-ativar:${cicloId}` });
    await rodarJobs();
    const itens = await itemDe(cicloId);
    const itemId = itens[0]!.id;

    canal.falharProximas = 2; // as 2 primeiras tentativas falham; a 3ª (última) vence
    await enqueue(ctx, { tipo: 'item.cobrar', payload: { item_ciclo_id: itemId }, idempotencyKey: `retry-cobrar:${itemId}` });
    const res = await rodarJobs();
    canal.falharProximas = 0;
    expect(res.some((r) => r.tipo === 'item.cobrar' && r.ok)).toBe(true);
    // retry respeitado: job que terminou concluido chegou a tentativas>1 antes de vencer
    const { rows } = await admin.query(
      "SELECT estado,tentativas FROM jobs_fila WHERE tenant_id=$1 AND tipo='item.cobrar' AND idempotency_key LIKE 'retry-cobrar%'",
      [TEN]
    );
    expect(rows[0]!.estado).toBe('concluido');
    expect(rows[0]!.tentativas).toBeGreaterThanOrEqual(3); // 2 falhas + sucesso
    expect(canal.enviadas.some((m) => m.destinatario === 'cliente-err@local')).toBe(true);
  });

  it('limite social esgotado ⇒ exceção escalada_limite e item em excecao', async () => {
    const { cicloId } = await novoCicloIds();
    // full-window p/ decisão determinística independente do horário do relógio
    await ctx.query(
      `UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
      [cicloId]
    );
    const itemId = await (async () => {
      const { rows } = await admin.query(
        "INSERT INTO itens_ciclo (tenant_id,ciclo_id,item_template_id,estado,tentativas) VALUES ($1,$2,$3,'aguardando',3) RETURNING id",
        [TEN, cicloId, itemTemplateIds[0]!]
      );
      return rows[0]!.id;
    })();
    await enqueue(ctx, { tipo: 'item.cobrar', payload: { item_ciclo_id: itemId }, idempotencyKey: `escalar:${itemId}` });
    await rodarJobs();
    const { rows: exc } = await admin.query(
      "SELECT count(*)::int AS n FROM excecoes WHERE tenant_id=$1 AND item_ciclo_id=$2 AND tipo='escalada_limite'",
      [TEN, itemId]
    );
    expect(exc[0]!.n).toBe(1);
    const { rows } = await admin.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemId]);
    expect(rows[0]!.estado).toBe('excecao');
  });
});

describe('M1-OPS-03 · tickCiclos — encerramento e rollback', () => {
  it('sucesso: tick idempotente (CA-05) — mesma chave não duplica o job', async () => {
    const { cicloId } = await novoCicloIds();
    await ctx.query(
      `UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
      [cicloId]
    );
    await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: cicloId }, idempotencyKey: `tickid-ativar:${cicloId}` });
    await rodarJobs();
    expect(await itemDe(cicloId)).toHaveLength(2);

    // MESMA idempotency_key enfileirada duas vezes ⇒ ON CONFLICT deduplica
    const chaveTick = `tick-dup:${cicloId}`;
    await enqueue(ctx, { tipo: 'ciclo.tick', payload: { ciclo_id: cicloId }, idempotencyKey: chaveTick });
    await enqueue(ctx, { tipo: 'ciclo.tick', payload: { ciclo_id: cicloId }, idempotencyKey: chaveTick });
    await rodarJobs();

    const { rows: ticks } = await admin.query(
      "SELECT count(*)::int AS n FROM jobs_fila WHERE tenant_id=$1 AND tipo='ciclo.tick' AND idempotency_key=$2",
      [TEN, chaveTick]
    );
    expect(ticks[0]!.n).toBe(1);
    const { rows: st } = await admin.query(
      "SELECT estado FROM jobs_fila WHERE tenant_id=$1 AND tipo='ciclo.tick' AND idempotency_key=$2",
      [TEN, chaveTick]
    );
    expect(st[0]!.estado).toBe('concluido');
  });

  it('erro (sabotar encerrar): rollback ⇒ ciclo permanece aberto', async () => {
    const { cicloId } = await novoCicloIds();
    await admin.query(
      "INSERT INTO itens_ciclo (tenant_id,ciclo_id,item_template_id,estado) VALUES ($1,$2,$3,'resolvido')",
      [TEN, cicloId, itemTemplateIds[0]!]
    );
    await enqueue(ctx, { tipo: 'ciclo.tick', payload: { ciclo_id: cicloId }, idempotencyKey: `tick-fail:${cicloId}` });
    const s = sabotarQuery(ctx, /UPDATE ciclos SET estado='encerrado'/i);
    await rodarJobs();
    s.desfazer();
    expect(await estadoCiclo(cicloId)).toBe('aberto');
    const { rows: aud } = await admin.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE tenant_id=$1 AND entidade_id=$2 AND acao='encerrar'",
      [TEN, cicloId]
    );
    expect(aud[0]!.n).toBe(0); // rollback ⇒ evento não gravado
  });
});

describe('M1-OPS-03 · encerrarCiclo — sucesso e rollback por falha de auditoria', () => {
  it('sucesso: ciclo.encerrar → encerrado quando todos em estado final', async () => {
    const { cicloId } = await novoCicloIds();
    await admin.query(
      "INSERT INTO itens_ciclo (tenant_id,ciclo_id,item_template_id,estado) VALUES ($1,$2,$3,'resolvido')",
      [TEN, cicloId, itemTemplateIds[0]!]
    );
    await enqueue(ctx, { tipo: 'ciclo.encerrar', payload: { ciclo_id: cicloId }, idempotencyKey: `enc-ok:${cicloId}` });
    await rodarJobs();
    expect(await estadoCiclo(cicloId)).toBe('encerrado');
  });

  it('erro (sabotar auditoria): rollback ⇒ ciclo permanece aberto e sem evento encerrar', async () => {
    const { cicloId } = await novoCicloIds();
    await admin.query(
      "INSERT INTO itens_ciclo (tenant_id,ciclo_id,item_template_id,estado) VALUES ($1,$2,$3,'resolvido')",
      [TEN, cicloId, itemTemplateIds[0]!]
    );
    await enqueue(ctx, { tipo: 'ciclo.encerrar', payload: { ciclo_id: cicloId }, idempotencyKey: `enc-fail:${cicloId}` });
    const s = sabotarQuery(ctx, /INSERT INTO eventos_auditoria/i);
    await rodarJobs();
    s.desfazer();
    expect(await estadoCiclo(cicloId)).toBe('aberto');
    const { rows: aud } = await admin.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE tenant_id=$1 AND entidade_id=$2 AND acao='encerrar'",
      [TEN, cicloId]
    );
    expect(aud[0]!.n).toBe(0);
  });
});

describe('M1-OPS-03 · recebimento/correlação — sucesso, idempotência por message_id e sem token', () => {
  async function cicloComItemAguardando(): Promise<{ cicloId: string; itemId: string }> {
    const { cicloId } = await novoCicloIds();
    const { rows } = await admin.query(
      "INSERT INTO itens_ciclo (tenant_id,ciclo_id,item_template_id,estado,tentativas) VALUES ($1,$2,$3,'aguardando',1) RETURNING id",
      [TEN, cicloId, itemTemplateIds[0]!]
    );
    return { cicloId, itemId: rows[0]!.id };
  }

  it('token válido ⇒ aguardando→recebido + comunicação + auditoria receber', async () => {
    const { itemId } = await cicloComItemAguardando();
    const token = `t:${itemId}:r1`;
    const res = await correlacionarRecebidas([
      { messageId: '<recv-1@mailpit>', remetente: 'cliente-err@local', corpo: `anexo\nIdentificador: ${token}`, tokenCorrelacao: token },
    ]);
    expect(res.processadas).toBe(1);
    const { rows: est } = await admin.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemId]);
    expect(est[0]!.estado).toBe('recebido');
    const { rows: com } = await admin.query(
      "SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE tenant_id=$1 AND item_ciclo_id=$2 AND direcao='recebimento'",
      [TEN, itemId]
    );
    expect(com[0]!.n).toBe(1);
    const { rows: aud } = await admin.query(
      "SELECT count(*)::int AS n FROM eventos_auditoria WHERE tenant_id=$1 AND entidade_id=$2 AND acao='receber'",
      [TEN, itemId]
    );
    expect(aud[0]!.n).toBe(1);
  });

  it('mesma message_id repetida ⇒ idempotente (0 novas processadas, sem re-marcar)', async () => {
    const { itemId } = await cicloComItemAguardando();
    const token = `t:${itemId}:r1`;
    const msg = { messageId: '<recv-dup@mailpit>', remetente: 'cliente-err@local', corpo: `Identificador: ${token}`, tokenCorrelacao: token };
    await correlacionarRecebidas([msg]);
    const res2 = await correlacionarRecebidas([msg]);
    expect(res2.processadas).toBe(0);
    const { rows: com } = await admin.query(
      "SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE tenant_id=$1 AND item_ciclo_id=$2 AND direcao='recebimento'",
      [TEN, itemId]
    );
    expect(com[0]!.n).toBe(1); // sem duplicação
  });

  it('sem token: semToken>0 e item permanece aguardando', async () => {
    const { itemId } = await cicloComItemAguardando();
    const res = await correlacionarRecebidas([{ messageId: '<raw>', remetente: 'x@y', corpo: 'oi' }]);
    expect(res.semToken).toBe(1);
    expect(res.processadas).toBe(0);
    const { rows: est } = await admin.query('SELECT estado FROM itens_ciclo WHERE id=$1', [itemId]);
    expect(est[0]!.estado).toBe('aguardando');
  });

  it('tick idempotente: mesmo tick re-enfileirado não gera job duplicado', async () => {
    const { cicloId } = await novoCicloIds();
    await enqueue(ctx, { tipo: 'ciclo.ativar', payload: { ciclo_id: cicloId }, idempotencyKey: `tic-ativar:${cicloId}` });
    await rodarJobs();
    const itens = await itemDe(cicloId);
    expect(itens).toHaveLength(2);
    // mesmo tick (mesma idempotency_key): a 2ª chamada não insere job novo
    const chave = `tic-rep:${cicloId}`;
    await enqueue(ctx, { tipo: 'ciclo.tick', payload: { ciclo_id: cicloId }, idempotencyKey: chave });
    const duplicado = await enqueue(ctx, { tipo: 'ciclo.tick', payload: { ciclo_id: cicloId }, idempotencyKey: chave });
    expect(duplicado).toBeNull();
    const { rows } = await admin.query(
      "SELECT count(*)::int AS n FROM jobs_fila WHERE tenant_id=$1 AND idempotency_key=$2",
      [TEN, chave]
    );
    expect(rows[0]!.n).toBe(1); // sem duplicidade na fila
  });
});
