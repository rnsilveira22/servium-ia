import type pg from 'pg';

/**
 * Leitura da trilha de auditoria (PRM-P0.2-A · Issue #51).
 *
 * O isolamento cross-tenant é EXCLUSIVAMENTE via RLS (políticas
 * tenant_isolation FORCE, deny-by-default): este SQL nunca filtra por
 * tenant_id. Sem `app.tenant_id` configurado na conexão, a política
 * retorna 0 linhas.
 */

export interface FiltrosEventos {
  /** Entidade do evento (ex.: 'item_ciclo', 'ciclo', 'auth'). */
  entidade?: string;
  /** Chave da entidade (UUID). */
  entidadeId?: string;
  /** Ação (ex.: 'cobrar', 'ativar', 'decidir', 'receber'). */
  acao?: string;
  /** Máximo de eventos (default 50; clamp interno [1,200]). */
  limite?: number;
  /**
   * Cursor keyset — `criado_em` (timestamptz) da última linha da página
   * anterior. Deve vir junto com `antesId` (criado_em não é único).
   */
  antesDe?: string | Date;
  /**
   * Cursor keyset — `id` da última linha da página anterior (tiebreaker
   * para o ordenamento `(criado_em DESC, id DESC)`).
   */
  antesId?: string;
}

export interface EventoAuditoriaDTO {
  id: string;
  actor_type: 'sistema' | 'operador' | 'servico';
  actor_id: string | null;
  /** M1-OPS-07 · aditivo: nome do ator humano resolvido no controller. */
  actor_nome?: string | null;
  entidade: string;
  entidade_id: string;
  acao: string;
  detalhes: Record<string, unknown> | null;
  criado_em: Date;
}

const LIMITE_PADRAO = 50;
const LIMITE_MAXIMO = 200;

/**
 * Lista eventos de auditoria do tenant da CONEXÃO, em
 * `(criado_em DESC, id DESC)`. `tem_mais` é derivado de `LIMIT limite+1`
 * (a última linha descartada indica que existe página seguinte). Appende
 * o índice existente `idx_eventos_tenant_criado`; filtros por
 * entidade/acao/entidade_id fazem seq scan aceitável no piloto.
 */
export async function listarEventos(
  client: pg.Client,
  filtros: FiltrosEventos = {}
): Promise<{ eventos: EventoAuditoriaDTO[]; tem_mais: boolean }> {
  const params: unknown[] = [];
  const clausulas: string[] = [];

  if (filtros.entidade !== undefined) {
    params.push(filtros.entidade);
    clausulas.push(`entidade = $${params.length}`);
  }
  if (filtros.entidadeId !== undefined) {
    params.push(filtros.entidadeId);
    clausulas.push(`entidade_id = $${params.length}`);
  }
  if (filtros.acao !== undefined) {
    params.push(filtros.acao);
    clausulas.push(`acao = $${params.length}`);
  }

  const temAntesDe = filtros.antesDe !== undefined;
  const temAntesId = filtros.antesId !== undefined;
  if (temAntesDe !== temAntesId) {
    throw new Error('listarEventos: antesDe e antesId são o cursor keyset e devem vir juntos');
  }
  if (temAntesDe && temAntesId) {
    params.push(filtros.antesDe);
    const n1 = params.length;
    params.push(filtros.antesId);
    const n2 = params.length;
    clausulas.push(`(criado_em < $${n1}::timestamptz OR (criado_em = $${n1}::timestamptz AND id < $${n2}::uuid))`);
  }

  // clamp [1,200]; default 50. `LIMIT limite+1` revela se há página seguinte.
  const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Math.floor(filtros.limite ?? LIMITE_PADRAO)));

  const sql = `
    SELECT id, actor_type, actor_id, entidade, entidade_id, acao, detalhes, criado_em
      FROM eventos_auditoria
      ${clausulas.length > 0 ? 'WHERE ' + clausulas.join(' AND ') : ''}
     ORDER BY criado_em DESC, id DESC
     LIMIT ${limite + 1}`;

  const { rows } = await client.query<EventoAuditoriaDTO>(sql, params);
  const tem_mais = rows.length > limite;
  return { eventos: rows.slice(0, limite), tem_mais };
}