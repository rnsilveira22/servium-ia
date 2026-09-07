#!/usr/bin/env node
/**
 * PRM-P0.1-A · Entry point do worker do motor (processo dedicado do piloto).
 * Encerramento gracioso em SIGINT/SIGTERM.
 */
import { buildChannelFromEnv, registerChannelProvider } from './channel';
import { MailpitProvider } from './mailpit';
import { requireServiceId } from './service-id';
import { createMotorWorker } from './worker';

async function main(): Promise<void> {
  registerChannelProvider('mailpit', new MailpitProvider());
  const channel = buildChannelFromEnv();
  const worker = createMotorWorker({
    channel,
    // PRM-P0.3-C · identidade do FD em auditoria (falha clara se ausente — CA-C-3)
    serviceId: requireServiceId(),
    pollMs: Number(process.env.WORKER_POLL_MS ?? 2000),
    batch: Number(process.env.WORKER_BATCH ?? 10),
    reapIntervalMs: Number(process.env.WORKER_REAP_INTERVAL_MS ?? 60_000),
    reapOlderThanMinutes: Number(process.env.WORKER_REAP_OLDER_THAN_MIN ?? 15),
  });
  await worker.start();

  let encerrando = false;
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sig, () => {
      if (encerrando) return;
      encerrando = true;
      void worker.stop().then(() => process.exit(0));
    });
  }
}

void main();