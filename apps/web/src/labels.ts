import type { TipoEsperado } from '@servium-ia/shared-types';

const ESTADO_LINGUAGEM: Record<string, string> = {
  pendente: 'Ainda não iniciado',
  cobrando: 'Solicitação sendo enviada',
  cobrado: 'Solicitação enviada',
  aguardando: 'Aguardando resposta',
  recebido: 'Documento recebido',
  resolvido: 'Concluído',
  excecao: 'Precisamos de atenção',
  escalada_limite: 'Tentativas esgotadas',
  cancelado: 'Cancelado',
};

export function estadoEmLinguagem(estado: string): string {
  return ESTADO_LINGUAGEM[estado] ?? estado;
}

const TIPO_ESPERADO_LABEL: Record<TipoEsperado, string> = {
  documento: 'Documento',
  informacao: 'Informação',
  assinatura: 'Assinatura',
};

export function tipoEsperadoLabel(tipo: string): string {
  return TIPO_ESPERADO_LABEL[tipo as TipoEsperado] ?? tipo;
}

export interface MotivoExcecao {
  rotulo: string;
  explicacao: string;
}

export function motivoExcecaoEmLinguagem(tipo: string, tentativas: number): MotivoExcecao {
  if (tipo === 'escalada_limite') {
    const n = tentativas > 0 ? tentativas : 3;
    return {
      rotulo: 'Tentativas esgotadas',
      explicacao: `Nenhuma resposta após ${n} tentativa${n === 1 ? '' : 's'}.`,
    };
  }
  if (tipo === 'sem_resposta') {
    return {
      rotulo: 'Sem resposta',
      explicacao: 'O cliente não respondeu à solicitação no período esperado.',
    };
  }
  return {
    rotulo: 'Precisamos de atenção',
    explicacao: 'A Funcionária Digital precisou de atenção para concluir esta etapa.',
  };
}

export function tamanhoEmMegabytes(tamanhoMaxBytes: number | null): string {
  if (!tamanhoMaxBytes || tamanhoMaxBytes <= 0) return '';
  const mb = tamanhoMaxBytes / (1024 * 1024);
  const valor = (Math.round(mb * 100) / 100).toString();
  return ` (até ${valor} MB)`;
}