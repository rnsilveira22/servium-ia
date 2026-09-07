import 'reflect-metadata';
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import { Client } from 'pg';
import { APP_URL, ADMIN_URL } from '@servium-ia/db';

export const ROLES_KEY = 'papeis';

export interface RequestSession {
  sessaoId: string;
  operadorId: string;
  tenantId: string;
  papel: 'admin' | 'operador';
}

export interface AuthedRequest extends Request {
  sessao?: RequestSession;
  pg?: Client;
}

/**
 * Guard deny-by-default: sem cookie válido ⇒ 401.
 * Sessão válida define app.tenant_id na conexão pg da requisição (ADR-005).
 */
@Injectable()
export class RequireAuth implements CanActivate {
  // Sem DI de Reflector: bundlers (esbuild/vite) não emitem design:paramtypes.
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const papeis =
      Reflect.getMetadata(ROLES_KEY, ctx.getHandler()) ??
      Reflect.getMetadata(ROLES_KEY, ctx.getClass());
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();

    const token = readCookie(req.headers.cookie, 'sid');
    if (!token) throw new UnauthorizedException();

    // Validação de SESSÃO é infraestrutura de credencial (fronteira documentada):
    // usa conexão admin porque o tenant só fica conhecido DEPOIS do lookup.
    // Dados de NEGÓCIO continuam sempre via servium_app + contexto (req.pg).
    const adminConn = new Client({ connectionString: ADMIN_URL });
    let appConn: Client | null = null;
    try {
      await adminConn.connect();
      const tokenHash = await hashToken(token);
      const { rows } = await adminConn.query(
        `SELECT s.id, s.operador_id, s.tenant_id, o.papel
           FROM sessoes s JOIN operadores o ON o.id = s.operador_id
          WHERE s.token_hash = $1
            AND s.revogado_em IS NULL
            AND s.expira_em > now()
            AND o.ativo`,
        [tokenHash]
      );
      if (rows.length === 0) throw new UnauthorizedException();

      const r = rows[0];
      if (papeis && !papeis.includes(r.papel)) {
        await adminConn.end();
        return false; // RBAC: nega sem revelar
      }

      req.sessao = {
        sessaoId: r.id,
        operadorId: r.operador_id,
        tenantId: r.tenant_id,
        papel: r.papel,
      };

      appConn = new Client({ connectionString: APP_URL });
      await appConn.connect();
      await appConn.query('SELECT set_config($1, $2, false)', ['app.tenant_id', r.tenant_id]);
      req.pg = appConn;
      void adminConn.end();
      // Fecha o req.pg quando a resposta for entregue — evita pool de
      // conexões servium_app idle acumulando até esgotar o postgres.
      const res = ctx.switchToHttp().getResponse();
      let encerrado = false;
      const fechar = () => {
        if (encerrado) return;
        encerrado = true;
        void appConn!.end().catch(() => undefined);
      };
      res.once('finish', fechar);
      res.once('close', fechar);
      return true;
    } catch (e) {
      await adminConn.end().catch(() => undefined);
      await appConn?.end().catch(() => undefined);
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException();
    }
  }
}

export const Roles = (...papeis: string[]) => SetMetadata(ROLES_KEY, papeis);

export function readCookie(header: unknown, name: string): string | null {
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export async function hashToken(token: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(token).digest('hex');
}
