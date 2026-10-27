/** Fuso do escritório (MVP-01: Brasil). Centraliza "hoje"/"hora" para evitar erro de um dia perto da meia-noite. */
export const FUSO_PADRAO = 'America/Sao_Paulo';

/** Data de hoje (YYYY-MM-DD) no fuso do escritório. */
export function hojeNoFuso(agora: Date = new Date(), fuso: string = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/** Hora local (0–23) no fuso do escritório. */
export function horaNoFuso(agora: Date = new Date(), fuso: string = FUSO_PADRAO): number {
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: fuso, hour: '2-digit', hourCycle: 'h23' }).format(agora);
  return Number(h) % 24;
}
