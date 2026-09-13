#!/usr/bin/env node
/**
 * PRM-P0.1-A · Entry point do worker do motor (processo dedicado do piloto).
 * B-2 · também consome `email.receber` num segundo PollWorker (Send/receive
 * por tenant fora do createMotorWorker — a lista de handlers não muda).
 * Encerramento gracioso em SIGINT/SIGTERM.
 */
import { buildChannelFromEnv, registerChannelProvider } from './channel';
import { MailpitProvider } from './mailpit';
import { requireServiceId } from './service-id';
import { createMotorWorker } from './worker';
import { EmailProviderResolver } from './provider-resolver';
import { createReceiveHandler } from './receive-handler';

async function main(): Promise<void> {
  registerChannelProvider('mailpit', new MailpitProvider());
  const channel = buildChannelFromEnv();
  const serviceId = requireServiceId();
  // B-2 R2 · resolução de provider por tenant (funciona também aqui)
  const resolver = new EmailProviderResolver();
  // PollWorker ÚNICO: claim não filtra tipo → o handler de recebimento é
  // registrado no mesmo worker do motor (fora do createMotorWorker, cujo
  // worker-runtime.test.ts valida a lista exata do motor).
  const worker = createMotorWorker({
    channel,
    resolver,
    // PRM-P0.3-C · identidade do FD em auditoria (falha clara se ausente — CA-C-3)
    serviceId,
    pollMs: Number(process.env.WORKER_POLL_MS ?? 2000),
    batch: Number(process.env.WORKER_BATCH ?? 10),
    reapIntervalMs: Number(process.env.WORKER_REAP_INTERVAL_MS ?? 60_000),
    reapOlderThanMinutes: Number(process.env.WORKER_REAP_OLDER_THAN_MIN ?? 15),
  });
  worker.register('email.receber', createReceiveHandler({ resolver, serviceId }));
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