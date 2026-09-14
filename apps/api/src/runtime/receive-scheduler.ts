/**
 * B-2 R2 · Scheduler de RECEBIMENTO por tenant (ADR-006, mesma trinca
 * relógio + fila real + idempotencyKey por janela do MotorScheduler).
 *
 * A cada varredura enfileira um job `email.receber` para:
 *   1. tenants com integração de e-mail `receive_enabled` (produção, qq provider);
 *   2. fallback dev/CI/E2E: tenants com ciclo aberto e MAILPIT_API_URL presente
 *      (sem integração cadastrada) — preserva o comportamento do poller Mailpit.
 *
 * A chave de idempotência `recv:<tenant>:<provider>:<janela>` impede enfileirar
 * duplicado na mesma janela; o worker resolve o adapter e correlaciona.
 */
import type pg from 'pg';
import { app, setTenant, enqueue, admin, reapStuck } from '@servium-ia/db';

import type { WorkerLog } from '@servium-ia/db';

export interface ReceiveSchedulerOptions {
  /** Intervalo entre varreduras (ms). Default 30_000. */
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
  env?: NodeJS.ProcessEnv;
}

function defaultLog(level: 'info' | 'warn' | 'error', msg: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }));
}

interface AlvoRecebimento {
  tenantId: string;
  provider: string;
}

type TickResult = { tenants: number; jobs: number; reaprProcessados: number };

export class ReceiveScheduler {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private tickPromise: Promise<TickResult> | null = null;
  private opts: {
    tickIntervalMs: number;
    windowMs: number;
    startNow: boolean;
    reapOlderThanMinutes: number;
    clock: () => Date;
    log: WorkerLog;
    env: NodeJS.ProcessEnv;
  };

  constructor(opts: ReceiveSchedulerOptions = {}) {
    this.opts = {
      tickIntervalMs: opts.tickIntervalMs ?? 30_000,
      windowMs: opts.windowMs ?? opts.tickIntervalMs ?? 30_000,
      startNow: opts.startNow ?? true,
      reapOlderThanMinutes: opts.reapOlderThanMinutes ?? 15,
      clock: opts.clock ?? (() => new Date()),
      log: opts.log ?? defaultLog,
      env: opts.env ?? process.env,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    if (this.opts.startNow) void this.runTick().catch(() => undefined);
    this.timer = setInterval(() => void this.runTick().catch(() => undefined), Math.max(1_000, this.opts.tickIntervalMs));
    this.timer.unref();
    this.opts.log('info', 'receive scheduler iniciado', {
      tickIntervalMs: this.opts.tickIntervalMs,
      windowMs: this.opts.windowMs,
    });
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
    this.opts.log('info', 'receive scheduler encerrado');
  }

  /** Executa exatamente uma varredura (reap + um email.receber por alvo). */
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
        const alvos = await this.alvosRecebimento(infra);

        for (const alvo of alvos) {
          const job = await this.enfileiraRecebe(alvo, windowKey);
          if (job) jobs += 1;
          tenants += 1;
        }

        devolvidos = await reapStuck(infra, this.opts.reapOlderThanMinutes);
        if (devolvidos > 0) this.opts.log('info', 'receive scheduler reapStuck', { devolvidos });
      } finally {
        void infra.end();
      }

      this.opts.log('info', 'receive tick enfileirado', { tenants, jobs, windowKey });
      return { tenants, jobs, reaprProcessados: devolvidos };
    } catch (err) {
      this.opts.log('error', 'falha na varredura do receive scheduler', {
        erro: String((err as Error)?.message ?? err),
      });
      throw err;
    }
  }

  /** Alvos: integrações receive_enabled + fallback dev (ciclos abertos). */
  private async alvosRecebimento(infra: pg.Client): Promise<AlvoRecebimento[]> {
    const alvos = new Map<string, string>();

    const { rows } = await infra.query(
      `SELECT tenant_id, provider FROM tenant_email_integration WHERE receive_enabled = true`
    );
    for (const r of rows as Array<{ tenant_id: string; provider: string }>) {
      if (!alvos.has(r.tenant_id)) alvos.set(r.tenant_id, r.provider);
    }

    // Fallback dev/CI/E2E: Mailpit global cobre tenants com ciclo aberto.
    if (this.opts.env.MAILPIT_API_URL) {
      const { rows: abertos } = await infra.query(
        "SELECT tenant_id FROM ciclos WHERE estado = 'aberto' GROUP BY tenant_id"
      );
      for (const r of abertos as Array<{ tenant_id: string }>) {
        if (!alvos.has(r.tenant_id)) alvos.set(r.tenant_id, 'mailpit');
      }
    }

    return [...alvos.entries()].map(([tenantId, provider]) => ({ tenantId, provider }));
  }

  private async enfileiraRecebe(alvo: AlvoRecebimento, windowKey: number): Promise<string | null> {
    const ctx = app();
    try {
      await ctx.connect();
      await setTenant(ctx, alvo.tenantId);
      return await enqueue(ctx, {
        tipo: 'email.receber',
        payload: { provider: alvo.provider },
        idempotencyKey: `recv:${alvo.tenantId}:${alvo.provider}:${windowKey}`,
      });
    } finally {
      void ctx.end();
    }
  }
}