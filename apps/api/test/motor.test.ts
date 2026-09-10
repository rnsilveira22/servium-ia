import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { ADMIN_URL, APP_URL, claimJobs, completeJob, enqueue } from '@servium-ia/db';
import pg from 'pg';
import { FakeChannel } from '../src/motor/channel';
import { decidirAcao, dentroHorarioComercial, podeTransicionar } from '../src/motor/engine';
import { registrarMotorHandlers, type MotorDeps } from '../src/motor/handlers';

const TEN = 'aaaa0000-0000-0000-0000-000000000001';
const SLUG = 'tenant-motor-test';
let admin: pg.Client;
let ctx: pg.Client;
const canal = new FakeChannel();
const deps: MotorDeps = { channel: canal };
const handlers = registrarMotorHandlers(deps);

let cicloId: string;
let obrigId: string;

/** Evidência por rotina executada (M1-OPS-03). */
interface ResultadoRotina {
  tipo: string;
  ok: boolean;
  tentativas: number;
  ultimo_erro: string | null;
}

async function rodarJobs(maxIter = 60): Promise<ResultadoRotina[]> {
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
      // n++ não é mais necessário — os resultados por job id resolvem o total
    }
  }
  const ok = [...resultados.values()].filter((r) => r.ok).length;
  const falha = [...resultados.values()].filter((r) => !r.ok).length;
  process.stdout.write(`[motor] ok: ${ok} falha: ${falha}\n`);
  return [...resultados.values()];
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await limpar();

  await admin.query("INSERT INTO tenants (id,nome,slug) VALUES ($1,'Motor',$2)", [TEN, SLUG]);
  const { rows: cli } = await admin.query(
    "INSERT INTO clientes (tenant_id,nome,email) VALUES ($1,'Cliente Motor','cliente@motor.local') RETURNING id",
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

describe("SRV-15 · engine puro (relógio fake)", () => {
  const cfg = { frequencia_horas: 24, tentativas_max: 3, horario_inicio: 8, horario_fim: 18 };

  it("transições legais conforme máquina de estados", () => {
    expect(podeTransicionar("pendente", "cobrado")).toBe(true);
    expect(podeTransicionar("pendente", "aguardando")).toBe(true); // síncrono
    expect(podeTransicionar("cobrado", "aguardando")).toBe(true);
    expect(podeTransicionar("aguardando", "recebido")).toBe(true);
    expect(podeTransicionar("aguardando", "excecao")).toBe(true);
    expect(podeTransicionar("recebido", "resolvido")).toBe(true);
    expect(podeTransicionar("pendente", "resolvido")).toBe(false);
    expect(podeTransicionar("resolvido", "cobrado")).toBe(false);
  });

  it("fora do horário comercial ⇒ não cobra", () => {
    expect(dentroHorarioComercial(new Date("2026-08-24T07:00:00"), cfg)).toBe(false);
    expect(dentroHorarioComercial(new Date("2026-08-24T08:00:00"), cfg)).toBe(true);
    expect(dentroHorarioComercial(new Date("2026-08-24T17:59:00"), cfg)).toBe(true);
    expect(dentroHorarioComercial(new Date("2026-08-24T18:00:00"), cfg)).toBe(false);
  });

  it("decisão respeita frequência, horário e limite social (CA-02/CA-03)", () => {
    const t = new Date("2026-08-24T10:00:00");
    expect(decidirAcao({ estado: "pendente", tentativas: 0, ultima_cobranca_em: null }, cfg, t).acao).toBe("cobrar");
    expect(decidirAcao({ estado: "aguardando", tentativas: 1, ultima_cobranca_em: new Date("2026-08-24T08:00:00") }, cfg, t).acao).toBe("nada");
    expect(decidirAcao({ estado: "aguardando", tentativas: 1, ultima_cobranca_em: new Date("2026-08-23T09:00:00") }, cfg, t).acao).toBe("cobrar");
    expect(decidirAcao({ estado: "aguardando", tentativas: 3, ultima_cobranca_em: null }, cfg, t).acao).toBe("escalar");
    expect(decidirAcao({ estado: "pendente", tentativas: 0, ultima_cobranca_em: null }, cfg, new Date("2026-08-24T22:00:00")).acao).toBe("nada");
  });
});

describe("SRV-15 · motor end-to-end (handlers diretos, canal fake)", () => {
  it("CA-01: ativar gera itens; tick cobra dentro dos limites", async () => {
    cicloId = randomUUID();
    await ctx.query("INSERT INTO ciclos (id,tenant_id,obrigacao_id) VALUES ($1,$2,$3)", [cicloId, TEN, obrigId]);
    // config full-window para ser determinístico
    await ctx.query(
      `UPDATE ciclos SET config='{"frequencia_horas":0,"tentativas_max":3,"horario_inicio":0,"horario_fim":24}' WHERE id=$1`,
      [cicloId]
    );
    await enqueue(ctx, { tipo: "ciclo.ativar", payload: { ciclo_id: cicloId }, idempotencyKey: `ativar:${cicloId}` });
    await rodarJobs();

    const { rows: itens } = await ctx.query("SELECT estado, tentativas FROM itens_ciclo WHERE ciclo_id=$1", [cicloId]);
    expect(itens).toHaveLength(2);
    expect(itens.every((i: { estado: string; tentativas: number }) => i.estado === "aguardando" && i.tentativas === 1)).toBe(true);

    expect(canal.enviadas).toHaveLength(2);
    expect(canal.enviadas[0]!.destinatario).toBe("cliente@motor.local");

    const { rows: msgs } = await ctx.query("SELECT count(*)::int AS n FROM mensagens_comunicacao WHERE direcao='envio'");
    expect(msgs[0]!.n).toBe(2);

    const { rows: aud } = await ctx.query("SELECT acao FROM eventos_auditoria WHERE acao IN ('ativar','cobrar') ORDER BY acao");
    expect(aud.map((a: { acao: string }) => a.acao).sort()).toEqual(["ativar", "cobrar", "cobrar"]);
  });

  it("CA-05: tick repetido NÃO duplica mensagens", async () => {
    const before = (await ctx.query("SELECT count(*)::int AS n FROM mensagens_comunicacao")).rows[0].n;
    await enqueue(ctx, { tipo: "ciclo.tick", payload: { ciclo_id: cicloId }, idempotencyKey: `tick-rep-${cicloId}` });
    await rodarJobs();
    const after = (await ctx.query("SELECT count(*)::int AS n FROM mensagens_comunicacao")).rows[0].n;
    expect(after).toBe(before);
  });

  it("CA-03: esgotar limite social ⇒ exceção registrada", async () => {
    await ctx.query("UPDATE itens_ciclo SET tentativas=3 WHERE ciclo_id=$1", [cicloId]);
    await enqueue(ctx, { tipo: "ciclo.tick", payload: { ciclo_id: cicloId }, idempotencyKey: `tick-limite-${cicloId}` });
    await rodarJobs();

    const { rows: exc } = await ctx.query("SELECT count(*)::int AS n FROM excecoes WHERE tipo='escalada_limite'");
    expect(exc[0]!.n).toBe(2);

    const { rows: itemExc } = await ctx.query("SELECT id FROM itens_ciclo WHERE estado=$1 LIMIT 1", ["excecao"]);
    const { rowCount } = await ctx.query("UPDATE itens_ciclo SET estado='resolvido' WHERE id=$1 AND estado=$2", [itemExc[0]!.id, "excecao"]);
    expect(rowCount).toBe(1);
  });

  it("CA-06: tick encerra ciclo quando todos os itens em estado final", async () => {
    await ctx.query("UPDATE itens_ciclo SET estado='resolvido' WHERE ciclo_id=$1", [cicloId]);
    await enqueue(ctx, { tipo: "ciclo.tick", payload: { ciclo_id: cicloId }, idempotencyKey: `tick-enc-${cicloId}` });
    await rodarJobs();
    const { rows } = await ctx.query("SELECT estado FROM ciclos WHERE id=$1", [cicloId]);
    expect(rows[0]!.estado).toBe("encerrado");
  });
});
