import type { Client } from 'pg';

import { montarPainel, type ResumoCliente, type ResumoClienteBruto } from './semaforo';

/**
 * Consulta o painel por cliente (somente ciclos ABERTOS) e classifica com o semáforo.
 * Compartilhada pelo endpoint `GET /ciclos/painel` e pelo resumo diário (VP-02).
 * O isolamento por tenant vem da conexão (RLS) — nenhuma cláusula de tenant aqui.
 */
export async function consultarPainel(pg: Client, hoje?: string): Promise<ResumoCliente[]> {
  const { rows } = await pg.query<ResumoClienteBruto>(
    `WITH por_ciclo AS (
       SELECT c.id, o.cliente_id, o.prazo,
              count(i.id)::int AS itens,
              count(i.id) FILTER (WHERE i.estado IN ('pendente','cobrado','aguardando','recebido'))::int AS pendentes,
              count(i.id) FILTER (WHERE i.estado='excecao')::int AS excecoes,
              count(i.id) FILTER (WHERE i.estado='resolvido')::int AS resolvidos
         FROM ciclos c
         JOIN obrigacoes o ON o.id=c.obrigacao_id
         LEFT JOIN itens_ciclo i ON i.ciclo_id=c.id
        WHERE c.estado='aberto'
        GROUP BY c.id, o.cliente_id, o.prazo
     )
     SELECT cli.id AS cliente_id, cli.nome AS cliente,
            count(pc.id)::int AS ciclos_abertos,
            coalesce(sum(pc.itens),0)::int AS itens,
            coalesce(sum(pc.resolvidos),0)::int AS resolvidos,
            coalesce(sum(pc.pendentes),0)::int AS pendentes,
            coalesce(sum(pc.excecoes),0)::int AS excecoes,
            (min(pc.prazo) FILTER (WHERE pc.pendentes + pc.excecoes > 0))::text AS prazo_proximo
       FROM clientes cli
       JOIN por_ciclo pc ON pc.cliente_id=cli.id
      GROUP BY cli.id, cli.nome`
  );
  return montarPainel(rows, hoje);
}
