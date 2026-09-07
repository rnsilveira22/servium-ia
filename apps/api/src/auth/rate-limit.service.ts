import { Injectable } from '@nestjs/common';

/**
 * Rate limiting anti-automação do `POST /auth/login` (HG-PR-SEC · 2026-09-06).
 *
 * Fixed-window in-memory por (a) conta `(slug,email)` e (b) IP. As janelas são
 * trocadas por bucket (floor(now/janela)), então expiram sozinhas e o login
 * legítimo volta a funcionar — sem estado persistente corrompido (CA-B-3).
 *
 * Configurável via env para CI/testes:
 *   - LOGIN_RATE_LIMIT_ACCOUNT_MAX / LOGIN_RATE_LIMIT_ACCOUNT_WINDOW_MS
 *   - LOGIN_RATE_LIMIT_IP_MAX / LOGIN_RATE_LIMIT_IP_WINDOW_MS
 *
 * Limitação de escala (documentada em docs/security/RATE_LIMIT_POLICY.md):
 * o estado vive em memória por instância; multi-instância exigiria store
 * compartilhado (ex.: Redis). Aceito como v1 por ser aplicação single-instance.
 *
 * Esta classe NUNCA deve expor qual regra acionou o bloqueio (anti-enumeração):
 * a interceptor só decide 'bloqueado ou não', e a resposta é sempre o 429 genérico.
 */

interface Janela {
  bucket: number;
  contagem: number;
  ultimoAcesso: number;
}

export interface Regra {
  max: number;
  janelaMs: number;
}

function parseAmount(valor: string | undefined, padrao: number): number {
  if (valor === undefined) return padrao;
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : padrao;
}

function parseWindow(valor: string | undefined, padrao: number): number {
  if (valor === undefined) return padrao;
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

const DEFAULT_ACCOUNT_MAX = 5;
const DEFAULT_ACCOUNT_WINDOW_MS = 15 * 60_000; // 15 min
const DEFAULT_IP_MAX = 30;
const DEFAULT_IP_WINDOW_MS = 5 * 60_000; // 5 min
const SWEEP_A_CADA = 512;

function chaveConta(slug: string, email: string): string {
  return `${slug.trim().toLowerCase()}::${email.trim().toLowerCase()}`;
}

@Injectable()
export class LoginRateLimitService {
  private readonly contas = new Map<string, Janela>();
  private readonly ips = new Map<string, Janela>();
  private acessos = 0;

  config(): { conta: Regra; ip: Regra } {
    return {
      conta: {
        max: parseAmount(process.env.LOGIN_RATE_LIMIT_ACCOUNT_MAX, DEFAULT_ACCOUNT_MAX),
        janelaMs: parseWindow(process.env.LOGIN_RATE_LIMIT_ACCOUNT_WINDOW_MS, DEFAULT_ACCOUNT_WINDOW_MS),
      },
      ip: {
        max: parseAmount(process.env.LOGIN_RATE_LIMIT_IP_MAX, DEFAULT_IP_MAX),
        janelaMs: parseWindow(process.env.LOGIN_RATE_LIMIT_IP_WINDOW_MS, DEFAULT_IP_WINDOW_MS),
      },
    };
  }

  contaBloqueada(slug: string, email: string): boolean {
    const conta = this.config().conta;
    return this.estaBloqueado(this.contas, chaveConta(slug, email), conta);
  }

  ipBloqueado(ip: string): boolean {
    const ipRegra = this.config().ip;
    return this.estaBloqueado(this.ips, ip, ipRegra);
  }

  /** Registra falha da conta e devolve true quando a janela cruza o limite. */
  registrarFalhaConta(slug: string, email: string): boolean {
    const conta = this.config().conta;
    const j = this.tocar(this.contas, chaveConta(slug, email), conta);
    return j.contagem >= conta.max;
  }

  /** Registra falha do IP e devolve true quando a janela cruza o limite. */
  registrarFalhaIp(ip: string): boolean {
    const ipRegra = this.config().ip;
    const j = this.tocar(this.ips, ip, ipRegra);
    return j.contagem >= ipRegra.max;
  }

  limpar(): void {
    this.contas.clear();
    this.ips.clear();
    this.acessos = 0;
  }

  /** Sucesso não é falha: zera a janela da conta (mantendo a do IP). */
  resetConta(slug: string, email: string): void {
    this.contas.delete(chaveConta(slug, email));
  }

  private estaBloqueado(mapa: Map<string, Janela>, chave: string, regra: Regra): boolean {
    const now = Date.now();
    const bucket = Math.floor(now / regra.janelaMs);
    const j = mapa.get(chave);
    if (!j || j.bucket !== bucket) return false;
    return j.contagem >= regra.max;
  }

  private tocar(mapa: Map<string, Janela>, chave: string, regra: Regra): Janela {
    const now = Date.now();
    const bucket = Math.floor(now / regra.janelaMs);
    let j = mapa.get(chave);
    if (!j || j.bucket !== bucket) {
      j = { bucket, contagem: 0, ultimoAcesso: now };
      mapa.set(chave, j);
    }
    j.contagem += 1;
    j.ultimoAcesso = now;
    this.acessos += 1;
    if (this.acessos % SWEEP_A_CADA === 0) this.varre(stale(now));
    return j;
  }

  // Varredura leve: remove janelas vencidas há mais de 2× a maior janela
  // configurada, limitando o crescimento do Map sem laço/intervalo de timer.
  private varre(limite: number): void {
    for (const [chave, j] of this.contas) {
      if (j.ultimoAcesso < limite) this.contas.delete(chave);
    }
    for (const [chave, j] of this.ips) {
      if (j.ultimoAcesso < limite) this.ips.delete(chave);
    }
  }
}

function stale(now: number): number {
  const maiorJanela = Math.max(
    parseWindow(process.env.LOGIN_RATE_LIMIT_ACCOUNT_WINDOW_MS, DEFAULT_ACCOUNT_WINDOW_MS),
    parseWindow(process.env.LOGIN_RATE_LIMIT_IP_WINDOW_MS, DEFAULT_IP_WINDOW_MS),
  );
  return now - maiorJanela * 2;
}

export function clienteIp(req: { ip?: string; socket?: { remoteAddress?: string } }): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}