/**
 * Validação server-side de e-mail (M1-OPS-04A / M1-OPS-05).
 *
 * Regras:
 * - campo obrigatório presente e não-vazio;
 * - sem quebras de linha / CRLF (anti injeção de cabeçalho de e-mail);
 * - formato básico: local@domínio com domínio contendo ponto.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ResultadoValidacaoEmail {
  ok: boolean;
  /** Motivo orientativo p/ a UI (campo + motivo), vazio quando ok. */
  motivo?: string;
}

/** Rejeita \r, \n e qualquer caractere de controle de linha/verticais. */
export function contemQuebraDeLinha(valor: string): boolean {
  return /[\r\n\u0000-\u0008\u000B\u000C\u000E-\u001A\u001C-\u001F\u2028\u2029]/.test(valor);
}

export function validarEmail(valor: unknown): ResultadoValidacaoEmail {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return { ok: false, motivo: 'email: e-mail é obrigatório' };
  }
  if (valor !== valor.trim()) {
    return { ok: false, motivo: 'email: não deve conter espaços nas bordas' };
  }
  if (contemQuebraDeLinha(valor)) {
    return { ok: false, motivo: 'email: não deve conter quebras de linha (anti injeção de cabeçalho)' };
  }
  if (!EMAIL_RE.test(valor)) {
    return { ok: false, motivo: 'email: formato de e-mail inválido' };
  }
  return { ok: true };
}
