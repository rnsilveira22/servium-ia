import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Client } from 'pg';
import { Observable, catchError, from, mergeMap, tap, throwError } from 'rxjs';

import { ADMIN_URL } from '@servium/db';
import { StructuredLogger } from '../common/logger.service';
import { LoginRateLimitService, clienteIp } from './rate-limit.service';

/**
 * Rate limit anti-automação aplicado APENAS ao `POST /auth/login`
 * (HG-PR-SEC · 2026-09-06).
 *
 * Por que interceptor (e não guard): precisa OBSERVAR o resultado do login
 * para registrar falhas (401) sem vazar qual regra acionou (anti-enumeração).
 * A instância é criada por app em `buildApp` (sem DI de parâmetros, que o
 * bundler de testes não emite) — estado in-memory por instância.
 *
 * - Pré-checagem: conta `(slug,email)` ou IP já bloqueados ⇒ 429 genérico
 *   (mesmo formato do 401 de credenciais inválidas; nunca revela o alvo).
 * - Pós-resposta: 401 ⇒ registra falha; ao cruzar o limite, audita
 *   `login_block` no tenant correto quando identificável (senão só log sem PII).
 * - 200 ⇒ login legítimo zera a janela da conta (a do IP permanece).
 */
@Injectable()
export class LoginRateLimitInterceptor implements NestInterceptor {
  private readonly rate = new LoginRateLimitService();
  private readonly logger = new StructuredLogger();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.method !== 'POST' || req.path !== '/auth/login') return next.handle();

    const body = (req.body ?? {}) as { slug?: unknown; email?: unknown };
    const slug = typeof body.slug === 'string' ? body.slug : '';
    const email = typeof body.email === 'string' ? body.email : '';
    const ip = clienteIp(req);

    if (this.rate.contaBloqueada(slug, email) || this.rate.ipBloqueado(ip)) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return next.handle().pipe(
      catchError((err: unknown) => {
        if (err instanceof UnauthorizedException) {
          this.rate.registrarFalhaConta(slug, email);
          this.rate.registrarFalhaIp(ip);
          if (this.rate.contaBloqueada(slug, email) || this.rate.ipBloqueado(ip)) {
            // cruzou o limite: aguarda a auditoria antes de repassar o 401
            return from(this.auditarBloqueio(slug, email)).pipe(mergeMap(() => throwError(() => err)));
          }
        }
        return throwError(() => err);
      }),
      tap(() => this.rate.resetConta(slug, email)),
    );
  }

  private async auditarBloqueio(slug: string, email: string): Promise<void> {
    const admin = new Client({ connectionString: ADMIN_URL });
    try {
      await admin.connect();
      // Resolução é anônima (conta/IP), mas se a conta existe auditamos no
      // tenant correto; sem tenant conhecido só há log estruturado SEM PII.
      const { rows } = await admin.query(
        `SELECT o.id, o.tenant_id
           FROM operadores o JOIN tenants t ON t.id = o.tenant_id
          WHERE t.slug = $1 AND lower(o.email) = lower($2) AND o.ativo`,
        [slug, email]
      );
      if (rows.length === 0) {
        this.logger.warn('login_block', 'LoginRateLimit', { motivo: 'limite_tentativas' });
        return;
      }
      const op = rows[0];
      await admin.query(
        `INSERT INTO eventos_auditoria (tenant_id, actor_type, actor_id, entidade, entidade_id, acao, detalhes)
         VALUES ($1::uuid, 'operador', $2::uuid, 'auth', $2::uuid, 'login_block', $3::jsonb)`,
        [op.tenant_id, op.id, { motivo: 'limite_tentativas' }]
      );
      this.logger.warn('login_block', 'LoginRateLimit', { tenantId: op.tenant_id });
    } catch (e) {
      this.logger.error('login_block', 'LoginRateLimit', { motivo: 'erro_auditoria', erro: (e as Error).message });
    } finally {
      void admin.end();
    }
  }
}