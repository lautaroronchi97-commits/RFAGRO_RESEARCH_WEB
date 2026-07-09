/**
 * Días hábiles y feriados de Argentina, para calcular fechas de pago de negocios.
 * Se opera con fechas a mediodía UTC para evitar corrimientos por zona horaria.
 *
 * FERIADOS_AR es EDITABLE: los feriados trasladables y los "con fines turísticos"
 * los fija el PEN cada año — conviene que Lautaro valide/complete la lista.
 */

export const FERIADOS_AR = new Set<string>([
  // 2025
  "2025-01-01", "2025-03-03", "2025-03-04", "2025-03-24", "2025-04-02", "2025-04-18",
  "2025-05-01", "2025-05-25", "2025-06-16", "2025-06-20", "2025-07-09", "2025-08-18",
  "2025-10-12", "2025-11-24", "2025-12-08", "2025-12-25",
  // 2026
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-03-24", "2026-04-02", "2026-04-03",
  "2026-05-01", "2026-05-25", "2026-06-15", "2026-06-20", "2026-07-09", "2026-08-17",
  "2026-10-12", "2026-11-20", "2026-12-08", "2026-12-25",
  // 2027 (estimado — revisar)
  "2027-01-01", "2027-02-08", "2027-02-09", "2027-03-24", "2027-03-26", "2027-04-02",
  "2027-05-01", "2027-05-25", "2027-06-21", "2027-06-20", "2027-07-09", "2027-08-16",
  "2027-10-11", "2027-11-22", "2027-12-08", "2027-12-25",
]);

/** Date → "YYYY-MM-DD" (en UTC). */
export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Hoy en zona horaria de Córdoba, como "YYYY-MM-DD". */
export function hoyCordoba(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "YYYY-MM-DD" → Date a mediodía UTC (estable ante zonas horarias). */
export function parseYmd(s: string): Date {
  return new Date(`${s}T12:00:00Z`);
}

export function esFinde(d: Date): boolean {
  const g = d.getUTCDay();
  return g === 0 || g === 6;
}

export function esHabil(d: Date): boolean {
  return !esFinde(d) && !FERIADOS_AR.has(ymd(d));
}

/** Suma n días hábiles a una fecha (n≥0). */
export function sumarHabiles(desde: Date, n: number): Date {
  const d = new Date(desde);
  let contados = 0;
  while (contados < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (esHabil(d)) contados++;
  }
  return d;
}

/** Días corridos entre dos fechas (b − a). */
export function diasCorridos(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Suma n días corridos. */
export function sumarCorridos(desde: Date, n: number): Date {
  const d = new Date(desde);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/** Formato local es-AR: "lun 06/07/2026". */
export function fmtFecha(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
