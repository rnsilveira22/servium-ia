/**
 * SRV-8 · Scheduler do runtime (ADR-006).
 * Detecta periodicamente os tenants com ciclos abertos e enfileira um
 * `ciclo.tick` global por tenant, com idempotencyKey ancorada na janela de
 * tempo corrente — o motor executa toda a decisão de envio/recebimento.
 *
 * Não é trigger artificial: recorre apenas do relógio + fila real; uma falha
 * de tick é reaproveitada na próxima janela por nova key.
 */
import { setTimeout as sleep } from 'node:timers/promises';

import { app, setTenant, enqueue, admin, reapStuck } from '@servium-ia/db';

export interface MotorSchedulerOptions {
  /** Intervalo entre varreduras (ms). Default 60_000. */
  tickIntervalMs?: number;
  /** Largura da janela de idempotência (ms). Default = tickIntervalMs. */
  windowMs?: number;
  /** Faz uma varredura imediatamente ao iniciar. Default true. */
  startNow?: boolean;
  /** Idade mínima de um job 'processando' para reap (min). Default 15. */
  reapOlderThanMinutes?: number;
  /** Relógio injetável (testes). */
  clock?: () => Date;
  log?: WorkerLog;
}

type WorkerLog = (level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) => void;

function defaultLog(level: 'info' | 'warn' | 'error', msg: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }));
}

interface ResolvedMotorSchedulerOptions {
  tickIntervalMs: number;
  windowMs: number;
  startNow: boolean;
  reapOlderThanMinutes: number;
  clock: () => Date;
  log: WorkerLog;
}

type TickResult = { tenants: number; jobs: number; reaprProcessados: number };

export class MotorScheduler {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private tickPromise: Promise<TickResult> | null = null;
  private opts: ResolvedMotorSchedulerOptions;

  constructor(opts: MotorSchedulerOptions = {}) {
    this.opts = {
      tickIntervalMs: opts.tickIntervalMs ?? 60_000,
      windowMs: opts.windowMs ?? opts.tickIntervalMs ?? 60_000,
      startNow: opts.startNow ?? true,
      reapOlderThanMinutes: opts.reapOlderThanMinutes ?? 15,
      clock: opts.clock ?? (() => new Date()),
      log: opts.log ?? defaultLog,
    };
  }

  /** Inicia o laço periódico. Nunca recorre de timer quando volume = 0. */
  start(): void {
    if (this.running) return;
    this.running = true;
    if (this.opts.startNow) void this.runTick().catch(() => undefined);
    this.timer = setInterval(() => void this.runTick().catch(() => undefined), Math.max(1_000, this.opts.tickIntervalMs));
    this.timer.unref();
    this.opts.log('info', 'scheduler iniciado', {
      tickIntervalMs: this.opts.tickIntervalMs,
      windowMs: this.opts.windowMs,
    });
  }

  /** Encerra: para o timer e aguarda a varredura em curso. */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.tickPromise;
    this.tickPromise = null;
    this.opts.log('info', 'scheduler encerrado');
  }

  /** Executa exatamente uma varredura (reap + um tick global por tenant). */
  async runTick(): Promise<TickResult> {
    if (this.tickPromise) return this.tickPromise;
    this.tickPromise = this.cycle();
    try {
      return await this.tickPromise;
    } finally {
      this.tickPromise = null;
    }
  }

  private async cycle(): Promise<TickResult> {
    const now = this.opts.clock();
    const windowKey = Math.floor(now.getTime() / this.opts.windowMs);
    let tenants = 0;
    let jobs = 0;

    try {
      const infra = admin();
      await infra.connect();
      let devolvidos = 0;
      try {
        const { rows } = await infra.query(
          "SELECT tenant_id FROM ciclos WHERE estado = 'aberto' GROUP BY tenant_id"
        );
        for (const { tenant_id } of rows as Array<{ tenant_id: string }>) {
          const job = await this.enfileiraTick(tenant_id, windowKey);
          if (job) jobs += 1;
          tenants += 1;
        }

        const reapOlderThanMinutes = this.opts.reapOlderThanMinutes;
        devolvidos = await reapStuck(infra, reapOlderThanMinutes);
        if (devolvidos > 0) this.opts.log('info', 'scheduler reapStuck', { devolvidos });
      } finally {
        void infra.end();
      }

      this.opts.log('info', 'tick enfileirado', { tenants, jobs, windowKey });
      return { tenants, jobs, reaprProcessados: devolvidos };
    } catch (err) {
      this.opts.log('error', 'falha na varredura do scheduler', {
        erro: String((err as Error)?.message ?? err),
      });
      throw err;
    }
  }

  private async enfileiraTick(tenant_id: string, windowKey: number): Promise<string | null> {
    const ctx = app();
    try {
      await ctx.connect();
      await setTenant(ctx, tenant_id);
      return await enqueue(ctx, {
        tipo: 'ciclo.tick',
        payload: {},
        idempotencyKey: `tick:global:${tenant_id}:${windowKey}`,
      });
    } finally {
      void ctx.end();
    }
  }
}

export const schedulerSleepMs = sleep;