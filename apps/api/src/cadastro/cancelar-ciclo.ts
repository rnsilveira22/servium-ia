/**
 * SRV · Cancelamento de ciclo ativo (#73) atômico:
 * UPDATE condicional (estado='aberto' → 'cancelado') + auditoria transacionam juntos.
 * Idempotente: cancelar um ciclo já cancelado/encerrado não encontra a linha alvo.
 */
import type { Client } from 'pg';

export interface CancelarCicloCtx {
  tenantId: string;
  operadorId: string;
}

export interface ResultadoCancelar {
  cancelado: boolean;
}

export async function cancelarCiclo(
  client: Client,
  ctx: CancelarCicloCtx,
  cicloId: string,
  motivo?: string
): Promise<ResultadoCancelar> {
  await client.query('BEGIN');
  try {
    const { rows } = await client.query<{ id: string }>(
      `UPDATE ciclos SET estado='cancelado', encerrado_em=now()
        WHERE id=$1 AND estado='aberto' RETURNING id`,
      [cicloId]
    );
    if (rows.length === 0) {
      await client.query('COMMIT');
      return { cancelado: false };
    }
    await client.query(
      `INSERT INTO eventos_auditoria (tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)
       VALUES ($1,'operador',$2,'ciclo',$3,'cancelar',$4)`,
      [ctx.tenantId, ctx.operadorId, cicloId, JSON.stringify({ de_estado: 'aberto', para_estado: 'cancelado', ...(motivo ? { motivo } : {}) })]
    );
    await client.query('COMMIT');
    return { cancelado: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}
