/**
 * VP-02 · Scheduler do resumo diário (ADR-006: relógio + fila real + idempotencyKey).
 *
 * A cada varredura, para cada tenant com `resumo_diario_ativo` cuja hora local
 * (America/Sao_Paulo) já alcançou `resumo_diario_hora`, enfileira UM job
 * `resumo.diario` por tenant/dia — a chave `resumo:<tenant>:<data>` impede
 * duplicata mesmo com varreduras a cada minuto ou reinício do processo.
 * Se o runtime estiver fora do ar na hora marcada, o resumo sai assim que voltar
 * (no mesmo dia); nunca se acumulam resumos de dias anteriores.
 */
import { app, setTenant, enqueue, admin } from '@servium-ia/db';
import type { WorkerLog } from '@servium-ia/db';

import { hojeNoFuso, horaNoFuso } from '../common/fuso';

export interface ResumoSchedulerOptions {
  /** Intervalo entre varreduras (ms). Default 60_000. */
  tickIntervalMs?: number;
  /** Faz uma varredura imediatamente ao iniciar. Default true. */
  startNow?: boolean;
  /** Relógio injetável (testes). */
  clock?: () => Date;
  log?: WorkerLog;
}

function defaultLog(level: 'info' | 'warn' | 'error', msg: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }));
}

export type ResumoTickResult = { elegiveis: number; jobs: number };

export class ResumoScheduler {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private tickPromise: Promise<ResumoTickResult> | null = null;
  private opts: { tickIntervalMs: number; startNow: boolean; clock: () => Date; log: WorkerLog };

  constructor(opts: ResumoSchedulerOptions = {}) {
    this.opts = {
      tickIntervalMs: opts.tickIntervalMs ?? 60_000,
      startNow: opts.startNow ?? true,
      clock: opts.clock ?? (() => new Date()),
      log: opts.log ?? defaultLog,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    if (this.opts.startNow) void this.runTick().catch(() => undefined);
    this.timer = setInterval(() => void this.runTick().catch(() => undefined), Math.max(1_000, this.opts.tickIntervalMs));
    this.timer.unref();
    this.opts.log('info', 'resumo scheduler iniciado', { tickIntervalMs: this.opts.tickIntervalMs });
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.tickPromise;
    this.tickPromise = null;
    this.opts.log('info', 'resumo scheduler encerrado');
  }

  /** Executa exatamente uma varredura. */
  async runTick(): Promise<ResumoTickResult> {
    if (this.tickPromise) return this.tickPromise;
    this.tickPromise = this.cycle();
    try {
      return await this.tickPromise;
    } finally {
      this.tickPromise = null;
    }
  }

  private async cycle(): Promise<ResumoTickResult> {
    const agora = this.opts.clock();
    const hoje = hojeNoFuso(agora);
    const hora = horaNoFuso(agora);
    let elegiveis = 0;
    let jobs = 0;

    try {
      const infra = admin();
      await infra.connect();
      let alvos: string[] = [];
      try {
        const { rows } = await infra.query<{ id: string }>(
          'SELECT id FROM tenants WHERE resumo_diario_ativo AND resumo_diario_hora <= $1',
          [hora]
        );
        alvos = rows.map((r) => r.id);
      } finally {
        void infra.end();
      }

      for (const tenantId of alvos) {
        elegiveis += 1;
        if (await this.enfileira(tenantId, hoje)) jobs += 1;
      }
      if (jobs > 0) this.opts.log('info', 'resumo.diario enfileirado', { elegiveis, jobs, data: hoje });
      return { elegiveis, jobs };
    } catch (err) {
      this.opts.log('error', 'falha na varredura do resumo scheduler', {
        erro: String((err as Error)?.message ?? err),
      });
      throw err;
    }
  }

  private async enfileira(tenantId: string, hoje: string): Promise<string | null> {
    const ctx = app();
    try {
      await ctx.connect();
      await setTenant(ctx, tenantId);
      return await enqueue(ctx, {
        tipo: 'resumo.diario',
        payload: { data: hoje },
        idempotencyKey: `resumo:${tenantId}:${hoje}`,
      });
    } finally {
      void ctx.end();
    }
  }
}
