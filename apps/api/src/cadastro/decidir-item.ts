/**
 * SRV-17 · Decisão humana (CA-03) + HG-B1-2026-09 (validação do item recebido).
 *
 * Uma transação só grava estado válido: ou tudo (item + exceção/auditoria) ou nada.
 * Transições aceitas — fonte de verdade: docs/product/OPERATIONAL_FLOW.md:
 *   recebido → resolvido   (validação humana positiva — B-1)
 *   recebido → excecao     (encaminhamento p/ análise — B-1; abre exceção)
 *   excecao  → resolvido/cancelado (decisão humana nº2/3 existente)
 *
 * Atomicidade/concorrência: o UPDATE é condicionado ao estado vigente; quem chega
 * depois de outra decisão já commitada acerta 0 linhas e falha de forma previsível
 * (rollback total, sem auditoria duplicada). RLS por tenant via conexão contextual.
 */
import { BadRequestException } from '@nestjs/common';
import type { Client } from 'pg';

import type { EstadoItem } from '../motor/engine';

export type DesfechoItem = 'resolvido' | 'cancelado' | 'excecao';

export interface DecidirItemCtx {
  tenantId: string;
  operadorId: string;
}

/** Fontes legais por desfecho na decisão humana (nunca fora da máquina de estados). */
const DECISAO_HUMANA: Record<DesfechoItem, EstadoItem[]> = {
  resolvido: ['excecao', 'recebido'],
  cancelado: ['excecao'],
  excecao: ['recebido'],
};

export async function decidirItem(
  client: Client,
  ctx: DecidirItemCtx,
  itemId: string,
  desfecho: DesfechoItem,
  motivo?: string
): Promise<{ cicloId: string }> {
  await client.query('BEGIN');
  try {
    const { rows: atual } = await client.query<{ estado: EstadoItem }>(
      'SELECT estado FROM itens_ciclo WHERE id=$1',
      [itemId]
    );
    const origem = atual[0]?.estado;
    if (!origem || !DECISAO_HUMANA[desfecho].includes(origem)) {
      throw new BadRequestException(`transição ${origem ?? 'item desconhecido'} → ${desfecho} não permitida`);
    }

    const upd = await client.query<{ id: string; ciclo_id: string }>(
      `UPDATE itens_ciclo SET estado=$2, atualizado_em=now()
        WHERE id=$1 AND estado=$3 RETURNING id, ciclo_id`,
      [itemId, desfecho, origem]
    );
    if (upd.rowCount === 0) {
      throw new BadRequestException('transição concorrente: outro operador decidiu este item antes');
    }
    const cicloId = upd.rows[0]!.ciclo_id;

    if (desfecho === 'excecao') {
      await client.query(
        `INSERT INTO excecoes (tenant_id, item_ciclo_id, tipo, motivo, contexto)
         VALUES ($1,$2,'validacao_recebido',$3, jsonb_build_object('origem', 'recebido'))`,
        [ctx.tenantId, itemId, motivo?.trim() || 'Encaminhado para análise na validação do recebimento']
      );
    } else if (origem === 'excecao') {
      await client.query(
        `UPDATE excecoes SET desfecho=$2, decidido_por=$3, decidido_em=now()
          WHERE item_ciclo_id=$1 AND desfecho IS NULL`,
        [itemId, desfecho, ctx.operadorId]
      );
    }

    const detalhes: Record<string, unknown> = { desfecho, origem };
    if (motivo?.trim()) detalhes.motivo = motivo.trim();
    if (cicloId) detalhes.ciclo_id = cicloId;
    await client.query(
      `INSERT INTO eventos_auditoria (tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)
       VALUES ($1,'operador',$2,'item_ciclo',$3,'decidir',$4)`,
      [ctx.tenantId, ctx.operadorId, itemId, JSON.stringify(detalhes)]
    );
    await client.query('COMMIT');
    return { cicloId };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}