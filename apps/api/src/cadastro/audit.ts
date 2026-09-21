import type { Client } from 'pg';

/** Registra eventos de auditoria de operador (CA-04) — padrão compartilhado. */
export async function auditar(
  client: Client,
  tenantId: string,
  actorId: string,
  entidade: string,
  entidadeId: string,
  acao: string,
  detalhes: Record<string, unknown> = {}
): Promise<void> {
  await client.query(
    `INSERT INTO eventos_auditoria (tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)
     VALUES ($1,'operador',$2,$3,$4,$5,$6)`,
    [tenantId, actorId, entidade, entidadeId, acao, JSON.stringify(detalhes)]
  );
}