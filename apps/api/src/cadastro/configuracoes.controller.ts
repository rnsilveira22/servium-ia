import { BadRequestException, Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Client } from 'pg';

import {
  EMAIL_AUTH_TYPES,
  EMAIL_PROVIDERS,
  type TenantConfigDTO,
  type TenantEmailIntegrationDTO,
} from '@servium-ia/shared-types';
import { RequireAuth, Roles, type AuthedRequest } from '../auth/auth.guard';
import { validarEmail } from '../common/email-validation';

export interface IntegracaoEmailRow {
  provider: string;
  sender_email: string | null;
  mailbox_email: string | null;
  auth_type: string;
  credential_reference: string | null;
  send_enabled: boolean;
  receive_enabled: boolean;
  status: string;
}

function mapIntegracao(row: IntegracaoEmailRow): TenantEmailIntegrationDTO {
  return {
    provider: row.provider as TenantEmailIntegrationDTO['provider'],
    sender_email: row.sender_email,
    mailbox_email: row.mailbox_email,
    auth_type: row.auth_type as TenantEmailIntegrationDTO['auth_type'],
    credential_reference: row.credential_reference,
    send_enabled: row.send_enabled,
    receive_enabled: row.receive_enabled,
    status: row.status,
  };
}

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

  /**
   * B-2 R3 · integração de e-mail por tenant. Provider-agnóstico; NUNCA trata
   * segredos — apenas configuração + referência de credencial. A conexão é a
   * do tenant (RLS FORCE em tenant_email_integration), então o upsert abaixo
   * já escreve na linha correta e nunca vaza outro tenant.
   */
  @Get('integracao-email')
  async obterIntegracao(@Req() req: AuthedRequest): Promise<{ integracao: TenantEmailIntegrationDTO | null }> {
    const { rows } = await this.pg(req).query<IntegracaoEmailRow>(
      `SELECT provider, sender_email, mailbox_email, auth_type, credential_reference, send_enabled, receive_enabled, status
         FROM tenant_email_integration WHERE tenant_id=$1 ORDER BY provider LIMIT 1`,
      [req.sessao!.tenantId]
    );
    return { integracao: rows[0] ? mapIntegracao(rows[0]) : null };
  }

  @Put('integracao-email')
  async atualizarIntegracao(
    @Req() req: AuthedRequest,
    @Body() body: Partial<TenantEmailIntegrationDTO>
  ): Promise<TenantEmailIntegrationDTO> {
    const tenantId = req.sessao!.tenantId;
    const provider = body?.provider;
    if (!provider || !(EMAIL_PROVIDERS as readonly string[]).includes(provider)) {
      throw new BadRequestException(`provider inválido (esperado: ${EMAIL_PROVIDERS.join('|')})`);
    }
    if (body?.auth_type && !(EMAIL_AUTH_TYPES as readonly string[]).includes(body.auth_type)) {
      throw new BadRequestException(`auth_type inválido (esperado: ${EMAIL_AUTH_TYPES.join('|')})`);
    }
    for (const campo of ['sender_email', 'mailbox_email'] as const) {
      const valor = body?.[campo];
      if (valor === undefined || valor === null || valor === '') continue;
      const v = validarEmail(valor);
      if (!v.ok) throw new BadRequestException(`${campo}: ${v.motivo}`);
    }

    const sender = body?.sender_email === undefined ? null : body.sender_email?.trim() ?? null;
    const mailbox = body?.mailbox_email === undefined ? null : body.mailbox_email?.trim() ?? null;
    const sendEnabled = body?.send_enabled ?? true;
    const receiveEnabled = body?.receive_enabled ?? true;
    const authType = body?.auth_type ?? 'oauth2';
    const status = body?.status ?? 'configurado';

    await this.pg(req).query(
      `INSERT INTO tenant_email_integration
         (tenant_id, provider, sender_email, mailbox_email, auth_type, credential_reference, send_enabled, receive_enabled, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (tenant_id, provider) DO UPDATE SET
         sender_email = EXCLUDED.sender_email,
         mailbox_email = EXCLUDED.mailbox_email,
         auth_type = EXCLUDED.auth_type,
         credential_reference = EXCLUDED.credential_reference,
         send_enabled = EXCLUDED.send_enabled,
         receive_enabled = EXCLUDED.receive_enabled,
         status = EXCLUDED.status,
         updated_at = now()`,
      [
        tenantId,
        provider,
        sender,
        mailbox,
        authType,
        body?.credential_reference?.trim() ?? null,
        sendEnabled,
        receiveEnabled,
        status,
      ]
    );
    const atualizado = await this.pg(req).query<IntegracaoEmailRow>(
      `SELECT provider, sender_email, mailbox_email, auth_type, credential_reference, send_enabled, receive_enabled, status
         FROM tenant_email_integration WHERE tenant_id=$1 AND provider=$2`,
      [tenantId, provider]
    );
    return mapIntegracao(atualizado.rows[0]!);
  }
}
