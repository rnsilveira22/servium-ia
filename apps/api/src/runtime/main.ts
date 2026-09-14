#!/usr/bin/env node
/**
 * SRV-8 · Runtime do funcionário digital (processo dedicado do piloto):
 * scheduler periódico + worker que consome os jobs do motor + B-2 recebimento
 * por tenant (ReceiveScheduler/ReceiveHandler via jobs). Composição idêntica à
 * do ambiente real (ADR-006): sem trigger artificial. Encerramento gracioso em
 * SIGINT/SIGTERM.
 */
import { buildChannelFromEnv, registerChannelProvider } from './channel';
import { MailpitProvider } from './mailpit';
import { requireServiceId } from './service-id';
import { createMotorWorker } from './worker';
import { MotorScheduler } from './scheduler';
import { EmailProviderResolver } from './provider-resolver';
import { ReceiveScheduler } from './receive-scheduler';
import { createReceiveHandler } from './receive-handler';

async function main(): Promise<void> {
  registerChannelProvider('mailpit', new MailpitProvider());
  const channel = buildChannelFromEnv();
  // PRM-P0.3-C · identidade do FD em auditoria no runtime canônico (CA-C-1 e
  // CA-C-3): eventos do motor e do recebimento são trabalho do Funcionário
  // Digital e devem gravar actor_type='servico'; bootstrap falha sem o env.
  const serviceId = requireServiceId();
  // B-2 R2 · resolução de provider por tenant (envio e recebimento).
  const resolver = new EmailProviderResolver();

  // PollWorker ÚNICO por processo: o claim da fila NÃO filtra tipo, então ter
  // dois workers consumindo a mesma fila faz um roubar o job do outro. O
  // handler de recebimento é registrado aqui (fora do createMotorWorker, cujo
  // worker-runtime.test.ts valida a lista exata do motor).
  const worker = createMotorWorker({
    channel,
    resolver,
    serviceId,
    pollMs: Number(process.env.WORKER_POLL_MS ?? 2000),
    batch: Number(process.env.WORKER_BATCH ?? 10),
    reapIntervalMs: Number(process.env.WORKER_REAP_INTERVAL_MS ?? 60_000),
    reapOlderThanMinutes: Number(process.env.WORKER_REAP_OLDER_THAN_MIN ?? 15),
  });
  worker.register('email.receber', createReceiveHandler({ resolver, serviceId }));
  const scheduler = new MotorScheduler({
    tickIntervalMs: Number(process.env.SCHEDULER_TICK_INTERVAL_MS ?? 60_000),
    windowMs: Number(process.env.SCHEDULER_WINDOW_MS ?? 60_000),
    startNow: process.env.SCHEDULER_START_NOW !== 'false',
    reapOlderThanMinutes: Number(process.env.SCHEDULER_REAP_OLDER_THAN_MIN ?? 15),
  });

  // B-2 · scheduler de recebimento por tenant. RECEBER_INTERVAL_MS (legado
  // dev/CI/E2E) continua sendo a cadência canônica de leitura.
  const receiveScheduler = new ReceiveScheduler({
    tickIntervalMs: Number(process.env.RECEBER_INTERVAL_MS ?? process.env.SCHEDULER_RECEIVER_INTERVAL_MS ?? 30_000),
    windowMs: Number(process.env.RECEIVER_WINDOW_MS ?? process.env.RECEBER_INTERVAL_MS ?? 30_000),
    startNow: process.env.RECEIVER_START_NOW !== 'false',
    reapOlderThanMinutes: Number(process.env.SCHEDULER_REAP_OLDER_THAN_MIN ?? 15),
  });

  await worker.start();
  scheduler.start();
  receiveScheduler.start();

  let encerrando = false;
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sig, () => {
      if (encerrando) return;
      encerrando = true;
      void (async () => {
        await receiveScheduler.stop();
        await scheduler.stop();
        await worker.stop();
        process.exit(0);
      })();
    });
  }
}

void main();