/**
 * PRM-P0.1-A · Registro dos handlers reais do motor (apps/api/src/motor) no
 * worker genérico da fila (SRV-8 / packages/db). O worker roda como processo
 * dedicado do piloto: claim atômico por SKIP LOCKED, execução contextual por
 * tenant (RLS) e retry/backoff — regras do motor em handler.ts intactas.
 */
import { PollWorker, type JobHandler } from '@servium-ia/db';

import { registrarMotorHandlers, type MotorDeps } from '../motor/handlers';

export interface MotorWorkerOptions {
  channel: MotorDeps['channel'];
  pollMs?: number;
  batch?: number;
  reapIntervalMs?: number;
  reapOlderThanMinutes?: number;
  /** Isolamento opcional por tenant (testes/multi-instância). */
  tenantFilter?: string;
}

/** Compõe o worker do motor com os handlers reais e um canal injetado. */
export function createMotorWorker(opts: MotorWorkerOptions): PollWorker {
  const deps: MotorDeps = {
    channel: opts.channel,
    remetentePadrao: process.env.MAIL_FROM ?? 'assistente@servium.local',
  };
  const worker = new PollWorker({
    pollMs: opts.pollMs,
    batch: opts.batch,
    reapIntervalMs: opts.reapIntervalMs,
    reapOlderThanMinutes: opts.reapOlderThanMinutes,
    tenantFilter: opts.tenantFilter,
  });
  for (const [tipo, handler] of registrarMotorHandlers(deps)) {
    worker.register(tipo, handler as JobHandler);
  }
  return worker;
}