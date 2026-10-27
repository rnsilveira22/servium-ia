/**
 * Semáforo por cliente do Painel (MVP-01).
 *
 * Regras (puras, sem I/O, fáceis de testar e de ajustar com o piloto):
 *  - VERMELHO: há exceção aberta aguardando decisão humana, OU há itens
 *    pendentes e o prazo vence em até `LIMITE_VERMELHO_DIAS` dias (ou já venceu);
 *  - AMARELO: há itens pendentes e o prazo vence em até `LIMITE_AMARELO_DIAS` dias;
 *  - VERDE: nada pendente, ou pendências com prazo confortável / sem prazo definido.
 */

import { hojeNoFuso } from '../common/fuso';

export { hojeNoFuso };

export type Semaforo = 'vermelho' | 'amarelo' | 'verde';

export const LIMITE_VERMELHO_DIAS = 2;
export const LIMITE_AMARELO_DIAS = 7;

export interface ResumoClienteBruto {
  cliente_id: string;
  cliente: string;
  ciclos_abertos: number;
  itens: number;
  resolvidos: number;
  pendentes: number;
  excecoes: number;
  /** Menor prazo (YYYY-MM-DD) entre os ciclos abertos que ainda têm trabalho a fazer. */
  prazo_proximo: string | null;
}

export interface ResumoCliente extends ResumoClienteBruto {
  semaforo: Semaforo;
  /** Dias até o prazo (negativo = vencido); null se não há prazo relevante. */
  dias_para_prazo: number | null;
  /** Frase curta em linguagem de negócio explicando a cor. */
  motivo: string;
}

const ORDEM: Record<Semaforo, number> = { vermelho: 0, amarelo: 1, verde: 2 };

export function diasEntre(hoje: string, prazo: string): number {
  const a = Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10));
  const b = Date.UTC(+prazo.slice(0, 4), +prazo.slice(5, 7) - 1, +prazo.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

function plural(n: number, singular: string, pluralTxt: string): string {
  return `${n} ${n === 1 ? singular : pluralTxt}`;
}

function descreverPrazo(dias: number): string {
  if (dias < 0) return `prazo vencido há ${plural(-dias, 'dia', 'dias')}`;
  if (dias === 0) return 'prazo vence hoje';
  if (dias === 1) return 'prazo vence amanhã';
  return `prazo em ${dias} dias`;
}

export function classificar(bruto: ResumoClienteBruto, hoje: string): ResumoCliente {
  const dias = bruto.prazo_proximo ? diasEntre(hoje, bruto.prazo_proximo) : null;
  const trabalhoRestante = bruto.pendentes > 0 || bruto.excecoes > 0;

  let semaforo: Semaforo = 'verde';
  let motivo = 'Tudo em dia';

  if (bruto.excecoes > 0) {
    semaforo = 'vermelho';
    motivo = `${plural(bruto.excecoes, 'exceção aguardando', 'exceções aguardando')} sua decisão`;
    if (dias !== null) motivo += `; ${descreverPrazo(dias)}`;
  } else if (bruto.pendentes > 0) {
    const faltam = `faltam ${plural(bruto.pendentes, 'item', 'itens')}`;
    if (dias !== null && dias <= LIMITE_VERMELHO_DIAS) {
      semaforo = 'vermelho';
      motivo = `${faltam}; ${descreverPrazo(dias)}`;
    } else if (dias !== null && dias <= LIMITE_AMARELO_DIAS) {
      semaforo = 'amarelo';
      motivo = `${faltam}; ${descreverPrazo(dias)}`;
    } else {
      motivo = dias !== null ? `${faltam}; ${descreverPrazo(dias)}` : `${faltam}; sem prazo definido`;
    }
  } else if (bruto.ciclos_abertos === 0) {
    motivo = 'Nenhum ciclo aberto';
  }

  return {
    ...bruto,
    semaforo,
    dias_para_prazo: trabalhoRestante ? dias : null,
    motivo,
  };
}

/** Classifica e ordena: vermelhos primeiro, depois amarelos; dentro da cor, prazo mais próximo primeiro. */
export function montarPainel(brutos: ResumoClienteBruto[], hoje: string = hojeNoFuso()): ResumoCliente[] {
  return brutos
    .map((b) => classificar(b, hoje))
    .sort((a, b) => {
      const porCor = ORDEM[a.semaforo] - ORDEM[b.semaforo];
      if (porCor !== 0) return porCor;
      const da = a.dias_para_prazo ?? Number.POSITIVE_INFINITY;
      const db = b.dias_para_prazo ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.cliente.localeCompare(b.cliente, 'pt-BR');
    });
}
