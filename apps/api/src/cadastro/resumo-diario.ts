/**
 * VP-02 · Conteúdo do resumo diário enviado ao RESPONSÁVEL do escritório (nunca ao cliente final).
 * Função pura: sem I/O, "hoje" injetado ⇒ testável. Reaproveita a classificação do painel (VP-01).
 */
import type { ResumoCliente } from './semaforo';

/** Máximo de clientes listados por seção; o restante vira "e mais N". */
export const LIMITE_LISTA = 15;

export interface AtividadeRecente {
  /** Cobranças enviadas aos clientes nas últimas 24 h. */
  cobrancas_24h: number;
  /** Respostas de clientes recebidas nas últimas 24 h. */
  respostas_24h: number;
}

export interface EntradaResumo {
  hoje: string; // YYYY-MM-DD
  painel: ResumoCliente[];
  atividade: AtividadeRecente;
}

export interface Resumo {
  assunto: string;
  corpo: string;
  /** true quando há ao menos um cliente vermelho ou amarelo. */
  precisaAtencao: boolean;
  vermelhos: number;
  amarelos: number;
}

function dataCurta(hoje: string): string {
  return `${hoje.slice(8, 10)}/${hoje.slice(5, 7)}`;
}

function dataLonga(hoje: string): string {
  const d = new Date(`${hoje}T12:00:00Z`);
  const dia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(d);
  return `${dia}, ${hoje.slice(8, 10)}/${hoje.slice(5, 7)}/${hoje.slice(0, 4)}`;
}

function plural(n: number, singular: string, pluralTxt: string): string {
  return `${n} ${n === 1 ? singular : pluralTxt}`;
}

function secao(titulo: string, itens: ResumoCliente[]): string[] {
  const linhas = [`${titulo} (${itens.length}):`];
  for (const c of itens.slice(0, LIMITE_LISTA)) {
    linhas.push(`  • ${c.cliente} — ${c.motivo}`);
  }
  if (itens.length > LIMITE_LISTA) linhas.push(`  • …e mais ${itens.length - LIMITE_LISTA}`);
  return linhas;
}

export function montarResumo({ hoje, painel, atividade }: EntradaResumo): Resumo {
  const vermelhos = painel.filter((c) => c.semaforo === 'vermelho');
  const amarelos = painel.filter((c) => c.semaforo === 'amarelo');
  const precisaAtencao = vermelhos.length + amarelos.length > 0;

  const linhas: string[] = [`Bom dia! Resumo de ${dataLonga(hoje)}.`, ''];

  if (precisaAtencao) {
    if (vermelhos.length > 0) linhas.push(...secao('Precisam de você hoje', vermelhos), '');
    if (amarelos.length > 0) linhas.push(...secao('Para acompanhar', amarelos), '');
  } else if (painel.length === 0) {
    linhas.push('Nenhum ciclo aberto no momento.', '');
  } else {
    linhas.push(`Tudo em dia: ${plural(painel.length, 'cliente', 'clientes')} sem pendência urgente.`, '');
  }

  linhas.push(
    `Nas últimas 24 horas: ${plural(atividade.cobrancas_24h, 'cobrança enviada', 'cobranças enviadas')} ` +
      `e ${plural(atividade.respostas_24h, 'resposta de cliente recebida', 'respostas de clientes recebidas')}.`,
    '',
    '—',
    'Servium IA · mensagem automática para o responsável do escritório. Nenhum cliente recebe este resumo.'
  );

  const assunto = precisaAtencao
    ? `Servium IA — resumo de ${dataCurta(hoje)}: ${plural(vermelhos.length + amarelos.length, 'cliente precisa', 'clientes precisam')} de atenção`
    : `Servium IA — resumo de ${dataCurta(hoje)}: tudo em dia`;

  return { assunto, corpo: linhas.join('\n'), precisaAtencao, vermelhos: vermelhos.length, amarelos: amarelos.length };
}
