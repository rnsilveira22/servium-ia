#!/usr/bin/env node
/**
 * SRV-8 · Runtime do funcionário digital (processo dedicado do piloto):
 * scheduler periódico + worker que consome os jobs do motor.
 * Composição idêntica à do ambiente real (ADR-006): sem trigger artificial.
 * Encerramento gracioso em SIGINT/SIGTERM.
 */
import { buildChannelFromEnv, registerChannelProvider } from './channel';
import { MailpitProvider } from './mailpit';
import { requireServiceId } from './service-id';
import { createMotorWorker } from './worker';
import { MotorScheduler } from './scheduler';
import { RecebedorPeriodico } from './recebimento';

async function main(): Promise<void> {
  registerChannelProvider('mailpit', new MailpitProvider());
  const channel = buildChannelFromEnv();
  // PRM-P0.3-C · identidade do FD em auditoria no runtime canônico (CA-C-1 e
  // CA-C-3): eventos do motor e do recebimento são trabalho do Funcionário
  // Digital e devem gravar actor_type='servico'; bootstrap falha sem o env.
  const serviceId = requireServiceId();
  const worker = createMotorWorker({
    channel,
    serviceId,
    pollMs: Number(process.env.WORKER_POLL_MS ?? 2000),
    batch: Number(process.env.WORKER_BATCH ?? 10),
    reapIntervalMs: Number(process.env.WORKER_REAP_INTERVAL_MS ?? 60_000),
    reapOlderThanMinutes: Number(process.env.WORKER_REAP_OLDER_THAN_MIN ?? 15),
  });
  const scheduler = new MotorScheduler({
    tickIntervalMs: Number(process.env.SCHEDULER_TICK_INTERVAL_MS ?? 60_000),
    windowMs: Number(process.env.SCHEDULER_WINDOW_MS ?? 60_000),
    startNow: process.env.SCHEDULER_START_NOW !== 'false',
    reapOlderThanMinutes: Number(process.env.SCHEDULER_REAP_OLDER_THAN_MIN ?? 15),
  });

  await worker.start();
  scheduler.start();

  // PRM-P0.1-E · correlaciona respostas do cliente (Mailpit em dev/CI/E2E)
  const apiUrl = process.env.MAILPIT_API_URL;
  const caixa = process.env.MAILPIT_AGENT_EMAIL ?? 'assistente@servium.local';
  const recebedor = apiUrl
    ? new RecebedorPeriodico({
        apiUrl,
        caixa,
        serviceId,
        receberIntervalMs: Number(process.env.RECEBER_INTERVAL_MS ?? 30_000),
      })
    : null;
  recebedor?.start();

  let encerrando = false;
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sig, () => {
      if (encerrando) return;
      encerrando = true;
      void (async () => {
        await recebedor?.stop();
        scheduler.stop();
        await worker.stop();
        process.exit(0);
      })();
    });
  }
}

void main();