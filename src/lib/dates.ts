/**
 * Utilidades de fechas en zona Argentina/Córdoba. Se usan al mediodía (UTC-3)
 * para evitar corrimientos por huso horario al contar días calendario.
 */

/** Hoy en Córdoba como 'YYYY-MM-DD'. */
export function hoyCordobaISO(): string {
  // en-CA formatea como 'YYYY-MM-DD'.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Días calendario entre dos fechas 'YYYY-MM-DD' (hasta − desde). NaN si inválidas. */
export function diasEntre(desdeISO: string, hastaISO: string): number {
  const a = Date.parse(`${desdeISO}T12:00:00-03:00`);
  const b = Date.parse(`${hastaISO}T12:00:00-03:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  return Math.round((b - a) / 86_400_000);
}

/** Días desde hoy (Córdoba) hasta la fecha dada. */
export function diasHasta(hastaISO: string): number {
  return diasEntre(hoyCordobaISO(), hastaISO);
}
