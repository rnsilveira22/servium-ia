/**
 * VP-02 · Handler de fila 'resumo.diario' (consumo da infra SRV-8).
 * Fluxo: ResumoScheduler → job resumo.diario (tenant, 1 por dia) → painel (VP-01)
 * → e-mail aos ADMINS ativos do tenant pelo canal já resolvido (Gmail/Mailpit).
 *
 * Garantias:
 *  - opt-in: tenant com `resumo_diario_ativo=false` ⇒ conclui sem efeito;
 *  - idempotência por destinatário/dia (`resumo:<tenant>:<data>:<operador>`): retry
 *    após falha parcial NÃO reenvia a quem já recebeu;
 *  - falha de canal propaga (throw) ⇒ retry/backoff da fila; evento de auditoria
 *    `resumo_diario_falha` registra a ocorrência — nunca perda silenciosa;
 *  - o resumo vai SOMENTE ao responsável; nunca ao cliente final (restrição do MVP).
 */
import type pg from 'pg';

import type { Job, JobHandler } from '@servium-ia/db';
import { hojeNoFuso } from '../common/fuso';
import { consultarPainel } from '../cadastro/painel-query';
import { montarResumo } from '../cadastro/resumo-diario';
import { auditar } from '../motor/handlers';
import type { CommunicationChannel, ProviderResolver } from '../motor/channel';

export interface ResumoDiarioHandlerOptions {
  /** Canal global (fallback quando o tenant não tem canal próprio). */
  channel: CommunicationChannel;
  resolver?: ProviderResolver | null;
  remetentePadrao?: string;
  serviceId?: string;
  /** Relógio injetável (testes). */
  clock?: () => Date;
  log?: (level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) => void;
}

function defaultLog(level: 'info' | 'warn' | 'error', msg: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }));
}

export const TEMPLATE_RESUMO = 'resumo_diario';

export function createResumoDiarioHandler(opts: ResumoDiarioHandlerOptions): JobHandler {
  const log = opts.log ?? defaultLog;
  const clock = opts.clock ?? (() => new Date());

  return async (job: Job, ctx: pg.Client): Promise<void> => {
    if (job.tipo !== 'resumo.diario') {
      throw new Error(`handler resumo.diario invocado para tipo=${job.tipo}`);
    }
    const hoje = hojeNoFuso(clock());

    const { rows: tenants } = await ctx.query<{ resumo_diario_ativo: boolean; resumo_diario_enviar_vazio: boolean }>(
      'SELECT resumo_diario_ativo, resumo_diario_enviar_vazio FROM tenants WHERE id=$1',
      [job.tenant_id]
    );
    const cfg = tenants[0];
    if (!cfg?.resumo_diario_ativo) return; // opt-in: desligado ⇒ sem efeito

    const { rows: destinatarios } = await ctx.query<{ id: string; email: string }>(
      "SELECT id, email FROM operadores WHERE papel='admin' AND ativo ORDER BY email"
    );
    if (destinatarios.length === 0) {
      await auditar(ctx, job.tenant_id, 'tenant', job.tenant_id, 'resumo_diario_sem_destinatario', { data: hoje }, opts.serviceId);
      return;
    }

    const painel = await consultarPainel(ctx, hoje);
    const { rows: atv } = await ctx.query<{ cobrancas: number; respostas: number }>(
      `SELECT count(*) FILTER (WHERE direcao='envio' AND template IS DISTINCT FROM $1)::int AS cobrancas,
              count(*) FILTER (WHERE direcao='recebimento')::int AS respostas
         FROM mensagens_comunicacao
        WHERE item_ciclo_id IS NOT NULL AND criado_em > now() - interval '24 hours'`,
      [TEMPLATE_RESUMO]
    );
    const resumo = montarResumo({
      hoje,
      painel,
      atividade: { cobrancas_24h: atv[0]?.cobrancas ?? 0, respostas_24h: atv[0]?.respostas ?? 0 },
    });

    if (!resumo.precisaAtencao && !cfg.resumo_diario_enviar_vazio) {
      await auditar(ctx, job.tenant_id, 'tenant', job.tenant_id, 'resumo_diario_dispensado', { data: hoje, motivo: 'tudo em dia' }, opts.serviceId);
      return;
    }

    // Mesma resolução de canal do motor: por tenant, com fallback global.
    let canal: CommunicationChannel = opts.channel;
    let remetente = opts.remetentePadrao ?? 'assistente@servium.local';
    if (opts.resolver) {
      const resolvido = await opts.resolver.resolverCanal(job.tenant_id, ctx);
      if (resolvido) {
        canal = resolvido.canal;
        remetente = resolvido.remetente;
      }
    }

    const falhas: string[] = [];
    let enviados = 0;
    for (const op of destinatarios) {
      const chave = `resumo:${job.tenant_id}:${hoje}:${op.id}`;
      const dupe = await ctx.query('SELECT 1 FROM mensagens_comunicacao WHERE tenant_id=$1 AND idempotency_key=$2', [
        job.tenant_id,
        chave,
      ]);
      if (dupe.rowCount) continue; // já enviado hoje a este destinatário

      const res = await canal.enviar({
        destinatario: op.email,
        assunto: resumo.assunto,
        corpo: resumo.corpo,
        idempotencyKey: chave,
      });
      if (!res.ok) {
        falhas.push(`${op.email}: ${res.erro ?? 'falha desconhecida'}`);
        continue;
      }

      await ctx.query('BEGIN');
      try {
        await ctx.query(
          `INSERT INTO mensagens_comunicacao
             (tenant_id, item_ciclo_id, direcao, canal, destinatario, remetente, template, message_id, idempotency_key, status)
           VALUES ($1,NULL,'envio','email',$2,$3,$4,$5,$6,'enviado')`,
          [job.tenant_id, op.email, remetente, TEMPLATE_RESUMO, res.messageId ?? null, chave]
        );
        await auditar(
          ctx,
          job.tenant_id,
          'tenant',
          job.tenant_id,
          'resumo_diario_enviado',
          { data: hoje, operador_id: op.id, vermelhos: resumo.vermelhos, amarelos: resumo.amarelos },
          opts.serviceId
        );
        await ctx.query('COMMIT');
        enviados += 1;
      } catch (err) {
        await ctx.query('ROLLBACK');
        throw err;
      }
    }

    log('info', 'resumo.diario concluído', {
      tenant: job.tenant_id,
      data: hoje,
      enviados,
      falhas: falhas.length,
    });

    if (falhas.length > 0) {
      await auditar(ctx, job.tenant_id, 'tenant', job.tenant_id, 'resumo_diario_falha', { data: hoje, falhas: falhas.length }, opts.serviceId);
      throw new Error(`resumo.diario: falha de envio (${falhas.join('; ')})`);
    }
  };
}
