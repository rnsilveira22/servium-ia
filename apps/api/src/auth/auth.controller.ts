import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, BadRequestException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { Client } from 'pg';

import { APP_URL, ADMIN_URL, validarPoliticaSenha, mensagemPoliticaSenha } from '@servium/db';
import { RequireAuth, Roles, hashToken, type AuthedRequest, type RequestSession } from './auth.guard';

const SESSION_TTL_HOURS = 12;

function cookieFor(token: string, maxAgeSec: number): string {
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  return `sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: { slug?: string; email?: string; senha?: string },
    @Res({ passthrough: true }) res: Response
  ) {
    const { slug, email, senha } = body ?? {};
    if (!slug || !email || !senha) throw new UnauthorizedException();

    const admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    try {
      // lookup do operador: dados de credencial NUNCA cruzam RLS de tenant no login
      const { rows } = await admin.query(
        `SELECT o.id, o.tenant_id, o.senha_hash, o.papel
           FROM operadores o JOIN tenants t ON t.id = o.tenant_id
          WHERE t.slug = $1 AND lower(o.email) = lower($2) AND o.ativo`,
        [slug, email]
      );
      if (rows.length === 0) {
        // sem tenant conhecido não há FK válida p/ trilha; sinal vai ao log da aplicação.
        // Resposta idêntica à de senha errada ⇒ anti-enumeration (ASVS V2.5).
        throw new UnauthorizedException();
      }

      const op = rows[0];
      const { verify } = await import('@node-rs/argon2');
      const ok = await verify(op.senha_hash, senha).catch(() => false);
      if (!ok) {
        await this.auditar(admin, op.tenant_id, op.id, 'login_falha', { motivo: 'senha_invalida' });
        throw new UnauthorizedException();
      }

      const token = randomBytes(32).toString('hex'); // ASVS V3.1: 256-bit CSPRNG
      const app = new Client({ connectionString: APP_URL });
      await app.connect();
      await app.query("SELECT set_config('app.tenant_id', $1, false)", [op.tenant_id]);
      await app.query(
        `INSERT INTO sessoes (tenant_id, operador_id, token_hash, expira_em)
         VALUES ($1, $2, $3, now() + interval '${SESSION_TTL_HOURS} hours')`,
        [op.tenant_id, op.id, await hashToken(token)]
      );
      void app.end();

      await this.auditar(admin, op.tenant_id, op.id, 'login_sucesso', {});
      res.setHeader('Set-Cookie', cookieFor(token, SESSION_TTL_HOURS * 3600));
      return { papel: op.papel };
    } finally {
      void admin.end();
    }
  }

  @UseGuards(RequireAuth)
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: Response) {
    const client = req.pg as Client;
    await client.query('UPDATE sessoes SET revogado_em = now() WHERE id = $1', [req.sessao!.sessaoId]);
    await this.auditarVia(client, req.sessao!, 'logout', {});
    res.setHeader('Set-Cookie', cookieFor('', 0));
    void client.end();
  }

  @UseGuards(RequireAuth)
  @Post('trocar-senha')
  @HttpCode(204)
  async trocarSenha(
    @Body() body: { senha_atual?: string; nova_senha?: string },
    @Req() req: AuthedRequest
  ) {
    const { senha_atual, nova_senha } = body ?? {};
    if (!senha_atual || !nova_senha) {
      throw new BadRequestException('senha_atual e nova_senha são obrigatórias');
    }

    const client = req.pg as Client;
    const s = req.sessao!;

    const { rows } = await client.query('SELECT senha_hash FROM operadores WHERE id = $1', [s.operadorId]);
    if (rows.length === 0) throw new UnauthorizedException();

    // Usuário autenticado ⇒ mensagens específicas são aceitáveis (ASVS V2.1).
    const { verify } = await import('@node-rs/argon2');
    const ok = await verify(rows[0].senha_hash, senha_atual).catch(() => false);
    if (!ok) {
      await this.auditarVia(client, s, 'trocar_senha_falha', { motivo: 'senha_invalida' });
      throw new BadRequestException('Senha atual incorreta');
    }

    const politica = validarPoliticaSenha(nova_senha);
    if (!politica.ok) {
      await this.auditarVia(client, s, 'trocar_senha_falha', {
        motivo: 'politica_violada',
        motivo_detalhe: politica.motivo,
      });
      throw new BadRequestException(mensagemPoliticaSenha(politica.motivo!));
    }

    const novoHash = await hash(nova_senha); // argon2id — mesma lib do login
    try {
      await client.query('BEGIN');
      await client.query('UPDATE operadores SET senha_hash = $1 WHERE id = $2', [novoHash, s.operadorId]);
      // Revoga as demais sessões do operador, preservando a sessão corrente (ASVS V3.1).
      await client.query(
        'UPDATE sessoes SET revogado_em = now() WHERE operador_id = $1 AND id <> $2',
        [s.operadorId, s.sessaoId]
      );
      await this.auditarVia(client, s, 'trocar_senha', {});
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    }
  }

  @UseGuards(RequireAuth)
  @Get('me')
  me(@Req() req: AuthedRequest) {
    const { operadorId, tenantId, papel } = req.sessao!;
    return { operadorId, tenantId, papel };
  }

  @UseGuards(RequireAuth)
  @Roles('admin')
  @Get('admin/ping')
  adminPing() {
    return { ok: true };
  }

  private async auditar(
    admin: Client,
    tenantId: string | null,
    operadorId: string | null,
    acao: string,
    detalhes: Record<string, unknown>
  ) {
    // eventos_auditoria é append-only p/ servium_app; login usa conexão admin
    // apenas para INSERT de auditoria de credencial (nunca para dados de negócio).
    await admin.query(
      `INSERT INTO eventos_auditoria (tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)
       VALUES ($1::uuid, 'operador', $2::uuid, 'auth', $2::uuid, $3, $4)`,
      [tenantId, operadorId, acao, detalhes]
    );
  }

  private async auditarVia(client: Client, s: RequestSession, acao: string, detalhes: Record<string, unknown>) {
    await client.query(
      `INSERT INTO eventos_auditoria (tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)
       VALUES ($1::uuid, 'operador', $2::uuid, 'auth', $2::uuid, $3, $4)`,
      [s.tenantId, s.operadorId, acao, detalhes]
    );
  }
}

export { hash };
