import { BadRequestException, Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Client } from 'pg';

import type { ResumoDiarioConfigDTO } from '@servium-ia/shared-types';
import { RequireAuth, Roles, type AuthedRequest } from '../auth/auth.guard';

interface Linha {
  resumo_diario_ativo: boolean;
  resumo_diario_hora: number;
  resumo_diario_enviar_vazio: boolean;
}

function mapear(l: Linha): ResumoDiarioConfigDTO {
  return { ativo: l.resumo_diario_ativo, hora: l.resumo_diario_hora, enviar_vazio: l.resumo_diario_enviar_vazio };
}

/**
 * VP-02 · Configuração do resumo diário por e-mail (admin-only).
 * Atualização parcial: apenas os campos enviados mudam. Toda alteração é auditada.
 */
@Controller('configuracoes/resumo-diario')
@UseGuards(RequireAuth)
@Roles('admin')
export class ResumoDiarioController {
  private pg(req: AuthedRequest): Client {
    return req.pg as Client;
  }

  private async ler(req: AuthedRequest): Promise<Linha> {
    const { rows } = await this.pg(req).query<Linha>(
      'SELECT resumo_diario_ativo, resumo_diario_hora, resumo_diario_enviar_vazio FROM tenants WHERE id=$1',
      [req.sessao!.tenantId]
    );
    if (!rows[0]) throw new BadRequestException('tenant não encontrado');
    return rows[0];
  }

  @Get()
  async obter(@Req() req: AuthedRequest): Promise<ResumoDiarioConfigDTO> {
    return mapear(await this.ler(req));
  }

  @Put()
  async atualizar(
    @Req() req: AuthedRequest,
    @Body() body: Partial<ResumoDiarioConfigDTO>
  ): Promise<ResumoDiarioConfigDTO> {
    const atual = mapear(await this.ler(req));
    const b = body ?? {};

    if (b.ativo !== undefined && typeof b.ativo !== 'boolean') throw new BadRequestException('ativo deve ser booleano');
    if (b.enviar_vazio !== undefined && typeof b.enviar_vazio !== 'boolean') {
      throw new BadRequestException('enviar_vazio deve ser booleano');
    }
    if (b.hora !== undefined && (!Number.isInteger(b.hora) || b.hora < 0 || b.hora > 23)) {
      throw new BadRequestException('hora deve ser um inteiro entre 0 e 23');
    }

    const novo: ResumoDiarioConfigDTO = {
      ativo: b.ativo ?? atual.ativo,
      hora: b.hora ?? atual.hora,
      enviar_vazio: b.enviar_vazio ?? atual.enviar_vazio,
    };

    const client = this.pg(req);
    await client.query(
      `UPDATE tenants
          SET resumo_diario_ativo=$2, resumo_diario_hora=$3, resumo_diario_enviar_vazio=$4
        WHERE id=$1`,
      [req.sessao!.tenantId, novo.ativo, novo.hora, novo.enviar_vazio]
    );
    await client.query(
      `INSERT INTO eventos_auditoria (tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)
       VALUES ($1,'operador',$2,'tenant',$1,'configurar_resumo_diario',$3)`,
      [req.sessao!.tenantId, req.sessao!.operadorId, JSON.stringify({ de: atual, para: novo })]
    );
    return novo;
  }
}
