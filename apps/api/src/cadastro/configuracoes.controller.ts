import { BadRequestException, Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Client } from 'pg';

import type { TenantConfigDTO } from '@servium-ia/shared-types';
import { RequireAuth, Roles, type AuthedRequest } from '../auth/auth.guard';
import { validarEmail } from '../common/email-validation';

/**
 * M1-OPS-05 · Configurações por tenant (e-mail do escritório — DD-05).
 * Rotas admin-only; isolamento por tenant via RLS da conexão (req.pg
 * já contextualizada pelo RequireAuth). Nada além do campo email_escritorio.
 */
@Controller('configuracoes')
@UseGuards(RequireAuth)
@Roles('admin')
export class ConfiguracoesController {
  private pg(req: AuthedRequest): Client {
    return req.pg as Client;
  }

  @Get()
  async obter(@Req() req: AuthedRequest): Promise<TenantConfigDTO> {
    const { rows } = await this.pg(req).query<{ email_escritorio: string | null }>(
      'SELECT email_escritorio FROM tenants WHERE id=$1',
      [req.sessao!.tenantId]
    );
    const row = rows[0];
    if (!row) throw new BadRequestException('tenant não encontrado');
    return { email_escritorio: row.email_escritorio };
  }

  @Put()
  async atualizar(@Req() req: AuthedRequest, @Body() body: { email_escritorio?: string }): Promise<TenantConfigDTO> {
    const valor = body?.email_escritorio;
    // Aceita null/'' para limpar? DD-05 nullable. Para simplicidade e
    // previsibilidade, aceitamos null explicitamente para limpar; senão
    // valida como e-mail não-vazio.
    if (valor === null || valor === undefined) {
      await this.pg(req).query('UPDATE tenants SET email_escritorio=NULL WHERE id=$1', [req.sessao!.tenantId]);
      return { email_escritorio: null };
    }
    const v = validarEmail(valor);
    if (!v.ok) throw new BadRequestException(v.motivo);
    await this.pg(req).query('UPDATE tenants SET email_escritorio=$2 WHERE id=$1', [
      req.sessao!.tenantId,
      valor.trim(),
    ]);
    return { email_escritorio: valor.trim() };
  }
}
