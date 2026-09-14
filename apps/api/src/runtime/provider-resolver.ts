/**
 * B-2 R2 · Resolução de provider por tenant (contrato: motor/channel.ts).
 * O Core depende apenas da interface `ProviderResolver`; esta implementação
 * concreta vive no runtime e decide, para cada tenant, qual adapter usar:
 *
 *   Tenant A → Gmail  (integração + gmail_tokens + GMAIL_CLIENT_*)
 *   Tenant B → Mailpit (integração mailpit OU fallback dev/CI com MAILPIT_API_URL)
 *
 * Segredos NUNCA transitam pelo core: o adapter Gmail lê `gmail_tokens` na
 * conexão tenanteada (RLS FORCE). A integração guarda apenas referência.
 */
import type pg from 'pg';

import { app, setTenant } from '@servium-ia/db';
import type { CanalResolvido, EmailIntegration, ProviderResolver, Recebedor } from '../motor/channel';
import { GmailAdapter, buildGmailConfigFromEnv, type GmailConfig } from '../email/gmail-adapter';
import { MailpitRecebedor } from './recebimento';

export type ResolverLog = (level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) => void;

export interface EmailProviderResolverOptions {
  env?: NodeJS.ProcessEnv;
  log?: ResolverLog;
}

const INTEGRACAO_COLS = `tenant_id, provider, sender_email, mailbox_email, auth_type,
                         credential_reference, send_enabled, receive_enabled, status`;

interface IntegracaoRow {
  tenant_id: string;
  provider: string;
  sender_email: string | null;
  mailbox_email: string | null;
  auth_type: string;
  credential_reference: string | null;
  send_enabled: boolean;
  receive_enabled: boolean;
  status: string;
}

function mapIntegracao(row: IntegracaoRow): EmailIntegration {
  return {
    tenantId: row.tenant_id,
    provider: row.provider as EmailIntegration['provider'],
    senderEmail: row.sender_email,
    mailboxEmail: row.mailbox_email,
    authType: (row.auth_type === 'oauth2' ? 'oauth2' : 'none') as EmailIntegration['authType'],
    credentialReference: row.credential_reference,
    sendEnabled: row.send_enabled,
    receiveEnabled: row.receive_enabled,
    status: row.status,
  };
}

export class EmailProviderResolver implements ProviderResolver {
  private env: NodeJS.ProcessEnv;
  private log: ResolverLog;

  constructor(opts: EmailProviderResolverOptions = {}) {
    this.env = opts.env ?? process.env;
    this.log = opts.log ?? (() => undefined);
  }

  async obterIntegracao(tenantId: string, ctx?: pg.Client): Promise<EmailIntegration | null> {
    const proprios = !ctx;
    const conexao = ctx ?? app();
    try {
      if (proprios) {
        await conexao.connect();
        await setTenant(conexao, tenantId);
      }
      const { rows } = await conexao.query<IntegracaoRow>(
        `SELECT ${INTEGRACAO_COLS} FROM tenant_email_integration WHERE tenant_id=$1 ORDER BY provider LIMIT 1`,
        [tenantId]
      );
      return rows[0] ? mapIntegracao(rows[0]) : null;
    } finally {
      if (proprios) void conexao.end();
    }
  }

  async resolverCanal(tenantId: string, ctx: pg.Client): Promise<CanalResolvido | null> {
    const integracao = await this.obterIntegracao(tenantId, ctx);
    if (!integracao || !integracao.sendEnabled) return null;
    if (integracao.provider !== 'gmail') return null; // mailpit/global fica no fallback dev

    const cfg = buildGmailConfigFromEnv(this.env);
    if (!cfg) {
      this.log('warn', 'integração gmail sem credencial (GMAIL_CLIENT_ID/SECRET ausentes) — canal global usado', {
        tenantId,
      });
      return null;
    }
    const adapter = await this.tentarAdapterGmail(ctx, tenantId, cfg, integracao.senderEmail);
    if (!adapter) return null;
    return {
      canal: adapter,
      remetente: integracao.senderEmail ?? integracao.mailboxEmail ?? 'assistente@servium.local',
    };
  }

  async resolverRecebedor(tenantId: string, ctx: pg.Client): Promise<Recebedor | null> {
    const integracao = await this.obterIntegracao(tenantId, ctx);
    if (integracao?.receiveEnabled) {
      if (integracao.provider === 'gmail') {
        const cfg = buildGmailConfigFromEnv(this.env);
        if (!cfg) {
          this.log('warn', 'integração gmail sem credencial (GMAIL_CLIENT_ID/SECRET ausentes) — recebimento inativo', {
            tenantId,
          });
          return null;
        }
        return this.tentarAdapterGmail(ctx, tenantId, cfg, integracao.senderEmail);
      }
      if (integracao.provider === 'mailpit') return this.mailpitRecebedor(integracao);
      return null;
    }

    // Fallback dev/CI/E2E: sem integração habilitada, Mailpit coleta da caixa do agente.
    if (this.env.MAILPIT_API_URL) {
      return new MailpitRecebedor({
        apiUrl: this.env.MAILPIT_API_URL,
        caixa: this.env.MAILPIT_AGENT_EMAIL ?? this.env.MAILPIT_FROM,
      });
    }
    return null;
  }

  /** Cria o adapter Gmail SOMENTE se houver token OAuth para o tenant (evita
   *  fail/retry infinito de jobs e NUNCA vaza segredo em log). */
  private async tentarAdapterGmail(
    ctx: pg.Client,
    tenantId: string,
    cfg: GmailConfig,
    senderEmail: string | null
  ): Promise<GmailAdapter | null> {
    const { rows } = await ctx.query('SELECT 1 FROM gmail_tokens WHERE tenant_id=$1 LIMIT 1', [tenantId]);
    if (rows.length === 0) {
      this.log('warn', 'tenant com integração gmail sem token OAuth — provider inativo', { tenantId });
      return null;
    }
    return new GmailAdapter(ctx, tenantId, cfg, senderEmail ?? 'assistente@servium.local');
  }

  private mailpitRecebedor(integracao: EmailIntegration): MailpitRecebedor | null {
    const apiUrl = this.env.MAILPIT_API_URL;
    if (!apiUrl) return null;
    return new MailpitRecebedor({
      apiUrl,
      caixa: integracao.senderEmail ?? this.env.MAILPIT_AGENT_EMAIL ?? this.env.MAILPIT_FROM,
    });
  }
}