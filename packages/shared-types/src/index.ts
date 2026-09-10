export interface ServiceInfo {
  name: string;
  version: string;
}

export const SERVICE_NAME = 'servium-api';
export const SERVICE_VERSION = '0.1.0';

// ===== SRV-16 · Cadastro mínimo (contratos de API) =====

export interface CriarClienteInput {
  nome: string;
  identificacao?: string;
  email: string;
}

export interface ClienteDTO {
  id: string;
  nome: string;
  identificacao: string | null;
  email: string | null;
  criado_em: string;
}

export interface CriarObrigacaoInput {
  cliente_id: string;
  descricao: string;
  prazo?: string;
  /** ID do checklist_template (mesmo tenant). Opcional — retrocompatível (M1-OPS-01). */
  template_id?: string;
}

export interface ObrigacaoDTO {
  id: string;
  cliente_id: string;
  descricao: string;
  prazo: string | null;
  template_id: string | null;
  template_nome: string | null;
  criado_em: string;
}

export const TIPOS_ESPERADOS = ['documento', 'informacao', 'assinatura'] as const;
export type TipoEsperado = (typeof TIPOS_ESPERADOS)[number];

export interface ItemTemplateInput {
  descricao: string;
  tipo_esperado?: TipoEsperado;
  tamanho_max_bytes?: number;
  ordem?: number;
}

export interface CriarChecklistTemplateInput {
  nome: string;
  canal?: string;
  itens: ItemTemplateInput[];
}

export interface ChecklistTemplateDTO {
  id: string;
  nome: string;
  canal: string;
  itens: Array<{
    id: string;
    descricao: string;
    tipo_esperado: TipoEsperado;
    tamanho_max_bytes: number | null;
    ordem: number;
  }>;
}

// ===== M1-OPS-05 · Configurações do tenant (e-mail do escritório) =====

export interface TenantConfigDTO {
  email_escritorio: string | null;
}
