/**
 * PRM-P0.3-C · Identidade de serviço do Funcionário Digital em auditoria
 * (actor_type='servico'). A identidade NÃO é segredo (é rótulo). O schema
 * `eventos_auditoria.actor_id` é `uuid`, então SERVIUM_SERVICE_ID deve ser um
 * UUID válido. Sem ele, o bootstrap do worker falha com erro claro (CA-C-3) —
 * evita trilha sem identidade (confundiria o FD agindo com infra do sistema).
 */
import { createHash } from 'node:crypto';

/** Adapta o rótulo para o tipo uuid da coluna actor_id. */
function deterministUUID(seed: string): string {
  const hash = createHash('sha256').update(seed).digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** UUID válido (RFC 4122) — regex do tipo uuid usado pelo Postgres. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lê SERVIUM_SERVICE_ID do ambiente; default determinístico estável por deploy
 * (derivado do hostname via hash → uuid v4 estável).
 */
export function resolveServiceId(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.SERVIUM_SERVICE_ID?.trim();
  if (raw && UUID_RE.test(raw)) return raw;
  return deterministUUID(`servico:${env.HOSTNAME ?? 'default'}`);
}

/**
 * Validação de bootstrap (CA-C-3): sem SERVIUM_SERVICE_ID válido configurado,
 * lança erro claro para impedir trilha sem identidade. Assegurado no entry
 * point do worker (unique place que inicia o processo de produção).
 */
export function requireServiceId(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.SERVIUM_SERVICE_ID?.trim();
  if (!raw) {
    throw new Error(
      'SERVIUM_SERVICE_ID não configurado: defina o ID estável (uuid) do Funcionário Digital para que o worker grave eventos de auditoria com actor_type=servico (PRM-P0.3-C / Issue #56).'
    );
  }
  if (!UUID_RE.test(raw)) {
    throw new Error(`SERVIUM_SERVICE_ID inválido (esperado uuid, recebido "${raw}"): defina um uuid estável do Funcionário Digital (PRM-P0.3-C / Issue #56).`);
  }
  return raw;
}
