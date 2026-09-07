/**
 * PRM-P0.1-D · Adapter de comunicação via Mailpit (SMTP local para dev/CI/E2E)
 * ADR-008: motor conhece só a porta `CommunicationChannel`; este adapter é a
 * implementação concreta com SMTP + REST do Mailpit (nunca usa Gmail real).
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import type { CommunicationChannel, MensagemSaida, ResultadoEnvio } from '../motor/channel';
import type { ChannelProvider } from './channel';

export interface MailpitConfig {
  smtpHost: string;
  smtpPort: number;
  /** Remetente usado localmente (qualquer origem é aceita pelo Mailpit). */
  from: string;
}

export class MailpitAdapter implements CommunicationChannel {
  private transporter: Transporter;

  constructor(private cfg: MailpitConfig) {
    this.transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: false,
    });
  }

  async enviar(msg: MensagemSaida): Promise<ResultadoEnvio> {
    try {
      const info = await this.transporter.sendMail({
        from: this.cfg.from,
        to: msg.destinatario,
        subject: msg.assunto,
        text: msg.corpo,
        headers: { 'X-Servium-Msg-Key': msg.idempotencyKey },
      });
      return { ok: true, messageId: info.messageId ?? undefined };
    } catch (err) {
      return { ok: false, erro: String((err as Error)?.message ?? err) };
    }
  }

  async close(): Promise<void> {
    await this.transporter.close();
  }
}

export function buildMailpitConfig(env: Record<string, string | undefined> = process.env): MailpitConfig {
  return {
    smtpHost: env.MAILPIT_SMTP_HOST ?? 'localhost',
    smtpPort: Number(env.MAILPIT_SMTP_PORT ?? 1025),
    from: env.MAILPIT_FROM ?? 'assistente@servium.local',
  };
}

export class MailpitProvider implements ChannelProvider {
  build() {
    return new MailpitAdapter(buildMailpitConfig());
  }
}