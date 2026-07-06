/** Formateo de números al estilo argentino: 1.234,5 */

export function nfmt(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Porcentaje con signo explícito: +1,2% / −0,5% */
export function pfmt(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const s = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${s}%`;
}

/** Valor con signo (para spreads en USD): +14,27 / −4,00 */
export function sfmt(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const s = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${s}`;
}

export type Dir = "up" | "down" | "flat";

export function dirOf(value: number | null | undefined): Dir {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0)
    return "flat";
  return value > 0 ? "up" : "down";
}

export function arrowOf(dir: Dir): string {
  return dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
}

/** Hora de la rueda en zona horaria de Córdoba. */
export function horaCordoba(d: Date = new Date(), withSeconds = true): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  }).format(d);
}
