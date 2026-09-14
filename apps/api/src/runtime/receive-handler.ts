/**
 * B-2 · Handler de fila 'email.receber' (consumo da infra SRV-8).
 * Fluxo: scheduler → job email.receber (tenant) → ProviderResolver → Recebedor
 * (Gmail/Mailpit) → MensagemRecebida[] → correlacionarRecebidas → item/audit.
 *
 * NUNCA chama provider direto: a fonte é resolvida pelo contrato genérico.
 * Falha de adapter propaga (throw) → worker aplica retry/backoff SRV-8.
 */
import type pg from 'pg';

import type { Job, JobHandler } from '@servium-ia/db';
import type { ProviderResolver } from '../motor/channel';
import { correlacionarRecebidas } from './recebimento';

export interface ReceiveHandlerOptions {
  resolver: ProviderResolver;
  serviceId?: string;
  log?: (level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) => void;
}

function defaultLog(level: 'info' | 'warn' | 'error', msg: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }));
}

export function createReceiveHandler(opts: ReceiveHandlerOptions): JobHandler {
  const log = opts.log ?? defaultLog;
  return async (job: Job, ctx: pg.Client): Promise<void> => {
    if (job.tipo !== 'email.receber') {
      throw new Error(`handler email.receber invocado para tipo=${job.tipo}`);
    }
    const provider = String((job.payload as Record<string, unknown>)?.provider ?? '');

    const recebedor = await opts.resolver.resolverRecebedor(job.tenant_id, ctx);
    if (!recebedor) return; // sem integração/configuração ⇒ job conclui sem efeito

    const mensagens = await recebedor.receber({ tenantId: job.tenant_id });
    const res = await correlacionarRecebidas(mensagens, opts.serviceId);
    log('info', 'email.receber concluído', {
      tenant: job.tenant_id,
      provider: provider || undefined,
      mensagens: mensagens.length,
      processadas: res.processadas,
      semToken: res.semToken,
    });
  };
}