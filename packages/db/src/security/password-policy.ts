/**
 * Política de senha ASVS/NIST — Issue #54 (PRM-P0.3-A)
 *
 * HG-PR-SEC APROVADA em 06/09/2026 com estes valores vinculantes:
 * - comprimento mínimo: 12 (NIST SP 800-63B A2.1, B2B), máximo: 64
 * - sem composição obrigatória (NIST desaconselha exigir maiúscula/símbolo)
 * - sem truncamento; espaços permitidos
 * - rejeitar blocklist de senhas comuns (v1: lista mínima incorporada)
 */

export const SENHA_MIN = 12;
export const SENHA_MAX = 64;

/**
 * Blocklist mínima de senhas amplamente conhecidas (v1).
 * Validada case-insensitive. Referência: NIST SP 800-63B A2.1 — rejeitar
 * senhas que aparecem em listas de comprometimento/conhecidas.
 */
const BLOCKLIST_SENHAS = new Set([
  '1234567890123',
  'password1234',
  'passwordpassword',
  'admin12345678',
  'oper12345678',
  'senha12345678',
  'adminsenha123',
]);

export interface ResultadoValidacao {
  ok: boolean;
  motivo?: string;
}

export function validarPoliticaSenha(senha: string): ResultadoValidacao {
  const len = [...senha].length;

  if (len < SENHA_MIN) {
    return { ok: false, motivo: `curta_${SENHA_MIN}` };
  }

  if (len > SENHA_MAX) {
    return { ok: false, motivo: `longa_${SENHA_MAX}` };
  }

  const normalizada = senha
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (BLOCKLIST_SENHAS.has(normalizada)) {
    return { ok: false, motivo: 'blocklist' };
  }

  return { ok: true };
}

export function mensagemPoliticaSenha(motivo: string): string {
  if (motivo === 'blocklist') {
    return 'A senha está em lista de senhas comuns/bloqueadas (NIST SP 800-63B)';
  }
  if (motivo === `curta_${SENHA_MIN}`) {
    return `A senha deve ter no mínimo ${SENHA_MIN} caracteres`;
  }
  if (motivo === `longa_${SENHA_MAX}`) {
    return `A senha deve ter no máximo ${SENHA_MAX} caracteres`;
  }
  return 'A senha não atende à política vigente';
}
