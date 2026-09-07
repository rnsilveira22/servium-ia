import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Client } from 'pg';

import { RequireAuth, Roles, type AuthedRequest } from '../auth/auth.guard';
import { GmailConfig, buildAuthUrl, exchangeCode } from './gmail-adapter';

function getConfig(): GmailConfig {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI ?? 'http://localhost:3000/auth/gmail/callback';
  if (!clientId || !clientSecret) throw new Error('GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET devem estar configurados');
  return { clientId, clientSecret, redirectUri };
}

@Controller('auth/gmail')
@UseGuards(RequireAuth)
export class EmailController {
  private pg(req: AuthedRequest): Client {
    return req.pg as Client;
  }

  /** Passo 1: gerar URL de consentimento OAuth. */
  @Get('authorize')
  @Roles('admin')
  authorize(@Req() req: AuthedRequest) {
    const state = `${req.sessao!.tenantId}:${req.sessao!.operadorId}`;
    return { url: buildAuthUrl(getConfig(), state) };
  }

  /** Passo 2: callback do Google — troca code por tokens. */
  @Get('callback')
  async callback(@Query() query: { code?: string; state?: string }) {
    if (!query.code || !query.state) throw new BadRequestException('code e state obrigatórios');
    const [tenantId] = query.state.split(':');
    if (!tenantId) throw new BadRequestException('state inválido');

    // Conexão admin para gravar tokens (tenant_id validado pelo state)
    const { Client } = await import('pg');
    const { ADMIN_URL } = await import('@servium-ia/db');
    const admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    try {
      await admin.query('SELECT set_config($1,$2,false)', ['app.tenant_id', tenantId]);
      const { email } = await exchangeCode(getConfig(), query.code, admin, tenantId);
      return { ok: true, email };
    } finally {
      void admin.end();
    }
  }

  /** Listar tokens configurados (sem expor credenciais). */
  @Get('tokens')
  @Roles('admin')
  async listarTokens(@Req() req: AuthedRequest) {
    const { rows } = await this.pg(req).query(
      'SELECT user_email, scopes, expires_at, criado_em FROM gmail_tokens WHERE tenant_id=$1',
      [req.sessao!.tenantId]
    );
    return rows;
  }
}
