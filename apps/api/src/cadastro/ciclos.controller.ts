import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Client } from 'pg';

import { enqueue } from '@servium-ia/db';
import { RequireAuth, Roles, type AuthedRequest } from '../auth/auth.guard';
import { decidirItem as decidirItemTxn, type DesfechoItem } from './decidir-item';

@Controller('ciclos')
@UseGuards(RequireAuth)
export class CiclosController {
  private pg(req: AuthedRequest): Client {
    return req.pg as Client;
  }

  /** Ponto formal de intervenção humana nº1: ativação do ciclo. */
  @Post()
  @Roles('admin', 'operador')
  async ativar(@Req() req: AuthedRequest, @Body() body: { obrigacao_id?: string }) {
    if (!body?.obrigacao_id) throw new BadRequestException('obrigacao_id obrigatório');
    const client = this.pg(req);
    const dono = await client.query('SELECT 1 FROM obrigacoes WHERE id=$1', [body.obrigacao_id]);
    if (dono.rowCount === 0) throw new BadRequestException('obrigação não encontrada neste tenant');

    const { rows } = await client.query<{ id: string; estado: string }>(
      `INSERT INTO ciclos (tenant_id, obrigacao_id, ativado_por) VALUES ($1,$2,$3) RETURNING id, estado`,
      [req.sessao!.tenantId, body.obrigacao_id, req.sessao!.operadorId]
    );
    const ciclo = rows[0]!;
    await enqueue(client, {
      tipo: 'ciclo.ativar',
      payload: { ciclo_id: ciclo.id },
      idempotencyKey: `ativar:${ciclo.id}`,
    });
    await enqueue(client, {
      tipo: 'ciclo.tick',
      payload: {},
      idempotencyKey: `tick:${ciclo.id}:0`,
    });
    await client.query(
      `INSERT INTO eventos_auditoria (tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)
       VALUES ($1,'operador',$2,'ciclo',$3,'ativar',$4)`,
      [req.sessao!.tenantId, req.sessao!.operadorId, ciclo.id, JSON.stringify({ obrigacao_id: body.obrigacao_id })]
    );
    return ciclo;
  }

  @Get()
  @Roles('admin', 'operador')
  async listar(@Req() req: AuthedRequest) {
    const { rows } = await this.pg(req).query(
      `SELECT c.id, c.estado, c.criado_em,
              o.descricao AS obrigacao, cli.nome AS cliente,
              count(i.id)::int AS itens,
              count(i.id) FILTER (WHERE i.estado='resolvido')::int AS resolvidos,
              count(i.id) FILTER (WHERE i.estado='excecao')::int AS excecoes
         FROM ciclos c
         LEFT JOIN itens_ciclo i ON i.ciclo_id=c.id
         JOIN obrigacoes o ON o.id=c.obrigacao_id
         JOIN clientes cli ON cli.id=o.cliente_id
        GROUP BY c.id, o.descricao, cli.nome
        ORDER BY c.criado_em DESC`
    );
    return rows;
  }

  /** Detalhe de um ciclo em linguagem de negócio (acompanhamento do Funcionário Digital). */
  @Get(':cicloId')
  @Roles('admin', 'operador')
  async detalhe(@Req() req: AuthedRequest, @Param('cicloId') cicloId: string) {
    const pg = this.pg(req);

    const { rows: ciclos } = await pg.query(
      `SELECT c.id, c.estado, c.criado_em, c.encerrado_em,
              o.id AS obrigacao_id, o.descricao AS obrigacao,
              cli.id AS cliente_id, cli.nome AS cliente
         FROM ciclos c
         JOIN obrigacoes o ON o.id=c.obrigacao_id
         JOIN clientes cli ON cli.id=o.cliente_id
        WHERE c.id=$1`,
      [cicloId]
    );
    if (ciclos.length === 0) throw new NotFoundException('ciclo não encontrado');
    const ciclo = ciclos[0]!;

    const { rows: itens } = await pg.query(
      `SELECT id, descricao, estado, tentativas, atualizado_em, excecao_id, excecao_tipo,
              excecao_motivo, excecao_contexto, excecao_criado_em
         FROM (
           SELECT DISTINCT ON (i.id)
                  i.id, i.estado, i.tentativas, i.atualizado_em,
                  t.descricao, t.ordem,
                  e.id AS excecao_id, e.tipo AS excecao_tipo, e.motivo AS excecao_motivo,
                  e.contexto AS excecao_contexto, e.criado_em AS excecao_criado_em
             FROM itens_ciclo i
             JOIN itens_template t ON t.id=i.item_template_id
             LEFT JOIN excecoes e ON e.item_ciclo_id=i.id AND e.desfecho IS NULL
            WHERE i.ciclo_id=$1
            ORDER BY i.id, e.criado_em DESC
         ) sub
        ORDER BY sub.ordem`,
      [cicloId]
    );

    const { rows: comunicacoes } = await pg.query(
      `SELECT id, item_ciclo_id, direcao, canal, destinatario, remetente, template, status, criado_em
         FROM mensagens_comunicacao
        WHERE item_ciclo_id IN (SELECT id FROM itens_ciclo WHERE ciclo_id=$1)
          AND status <> 'novo'
        ORDER BY criado_em DESC
        LIMIT 50`,
      [cicloId]
    );

    return {
      ...ciclo,
      itens: itens.map((i) => ({
        id: i.id,
        descricao: i.descricao,
        estado: i.estado,
        tentativas: i.tentativas,
        atualizado_em: i.atualizado_em,
        excecao: i.excecao_id
          ? {
              id: i.excecao_id,
              tipo: i.excecao_tipo,
              motivo: i.excecao_motivo,
              contexto: i.excecao_contexto,
              criado_em: i.excecao_criado_em,
            }
          : null,
      })),
      comunicacoes,
    };
  }

  /** Listar exceções abertas de um ciclo (CA-02). */
  @Get(':cicloId/excecoes')
  @Roles('admin', 'operador')
  async listarExcecoes(@Req() req: AuthedRequest, @Param('cicloId') cicloId: string) {
    const { rows } = await this.pg(req).query(
      `SELECT e.id, e.tipo, e.motivo, e.contexto, e.criado_em,
              i.id AS item_id, i.tentativas,
              it.descricao AS item_descricao,
              cli.nome AS cliente_nome
         FROM excecoes e
         JOIN itens_ciclo i ON i.id = e.item_ciclo_id
         LEFT JOIN itens_template it ON it.id = i.item_template_id
         JOIN ciclos c ON c.id = i.ciclo_id
         JOIN obrigacoes o ON o.id = c.obrigacao_id
         JOIN clientes cli ON cli.id = o.cliente_id
        WHERE c.id = $1 AND e.desfecho IS NULL
        ORDER BY e.criado_em DESC`,
      [cicloId]
    );
    return rows;
  }

  /** Intervenção humana nº2/3: resolver/cancelar item em exceção. */
  @Post('itens/:itemId/decidir')
  @Roles('admin')
  async decidirItem(@Req() req: AuthedRequest, @Param('itemId') itemId: string, @Body() body: { desfecho?: string }) {
    if (!['resolvido', 'cancelado'].includes(body?.desfecho ?? '')) {
      throw new BadRequestException("desfecho deve ser 'resolvido' ou 'cancelado'");
    }
    await decidirItemTxn(
      this.pg(req),
      { tenantId: req.sessao!.tenantId, operadorId: req.sessao!.operadorId },
      itemId,
      body.desfecho as DesfechoItem
    );
    return { ok: true };
  }

  /** Intervenção humana nº2/3: reenviar (CA-06 — respeita limites configurados). */
  @Post('itens/:itemId/reenviar')
  @Roles('admin')
  async reenviarItem(@Req() req: AuthedRequest, @Param('itemId') itemId: string) {
    const client = this.pg(req);
    const { rows: item } = await client.query<{ ciclo_id: string }>(
      `SELECT ciclo_id FROM itens_ciclo WHERE id=$1 AND estado='excecao'`,
      [itemId]
    );
    if (item.length === 0) throw new BadRequestException('item não está em exceção');

    await client.query('BEGIN');
    try {
      // fecha exceção aberta com desfecho reenviado
      await client.query(
        `UPDATE excecoes SET desfecho='reenviado', decidido_por=$2, decidido_em=now()
          WHERE item_ciclo_id=$1 AND desfecho IS NULL`,
        [itemId, req.sessao!.operadorId]
      );
      // volta ao fluxo motor (aguardando); motor decide se cobra ou escala novamente
      await client.query(
        `UPDATE itens_ciclo SET estado='aguardando', atualizado_em=now() WHERE id=$1`,
        [itemId]
      );
      await client.query(
        `INSERT INTO eventos_auditoria (tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)
         VALUES ($1,'operador',$2,'item_ciclo',$3,'reenviar','{}'::jsonb)`,
        [req.sessao!.tenantId, req.sessao!.operadorId, itemId]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    // enfileira tick para processar o item reenviado
    await enqueue(client, {
      tipo: 'ciclo.tick',
      payload: { ciclo_id: item[0]!.ciclo_id },
      idempotencyKey: `tick-reenvio:${itemId}:${Date.now()}`,
    });
    return { ok: true };
  }
}
