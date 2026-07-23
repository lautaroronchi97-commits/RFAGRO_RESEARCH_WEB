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

/**
 * Util única de mes/posición A3 (lote L1, auditoría E4 hallazgo #11: 9 archivos
 * tenían cada uno su copia de este dict/regex). "Posición" = ticker corto de A3,
 * ej. "JUL26" (mes abreviado ES + 2 dígitos de año). `MONTH_LETTER` (bonos AR,
 * letra única) y `EN2ES`/`EN_IDX` (meses en inglés de Yahoo) son familia
 * relacionada pero NO duplicados literales — quedan fuera de esta unificación.
 */
export const MESES_ES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
] as const;

/** "JUL" → 7 (1-indexado). 0 si no es una abreviatura válida. */
export function mesIndice(mes: string): number {
  const i = MESES_ES.indexOf(mes.toUpperCase() as (typeof MESES_ES)[number]);
  return i === -1 ? 0 : i + 1;
}

type PosicionParsed = { mon: string; mes: number; anio: number };

/**
 * "JUL26" → { mon: "JUL", mes: 7, anio: 2026 }. `mes` es 0 si las 3 letras no son
 * una abreviatura válida (ej. "DIS24" matchea el patrón pero no un mes real) —
 * mantiene el comportamiento histórico de `vencKey`/`vtoDePosicion` en curva.ts y
 * futuros.ts, que NO validaban el nombre del mes. `null` si no matchea el patrón
 * 3 letras + 2 dígitos.
 */
export function parsePosicion(pos: string | null | undefined): PosicionParsed | null {
  const m = (pos || "").toUpperCase().match(/^([A-Z]{3})(\d{2})$/);
  if (!m) return null;
  return { mon: m[1], mes: mesIndice(m[1]), anio: 2000 + Number(m[2]) };
}

/** "JUL26" → 202607 (aaaamm, para ordenar/filtrar posiciones vivas). 0 si no matchea. */
export function vencKeyDePosicion(pos: string | null | undefined): number {
  const p = parsePosicion(pos);
  return p ? p.anio * 100 + p.mes : 0;
}

/** "JUL26" → "2026-07-31" (último día del mes; suficiente para estimar el plazo). */
export function vtoDePosicion(pos: string | null | undefined): string {
  const p = parsePosicion(pos);
  if (!p || !p.mes) return "";
  const ultimo = new Date(Date.UTC(p.anio, p.mes, 0)).getUTCDate(); // día 0 del mes siguiente = último del actual
  return `${p.anio}-${String(p.mes).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`;
}

/** "2026-07-31" (o cualquier "YYYY-MM-…") → "JUL26". */
export function posicionDeFecha(iso: string): string {
  const mm = iso.slice(5, 7);
  const mes = Number(mm);
  return `${MESES_ES[mes - 1] ?? mm}${iso.slice(2, 4)}`;
}

/** Año-mes actual en zona Córdoba como clave aaaamm (para descartar posiciones muertas). */
export function hoyVencKey(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const anio = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const mes = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  return anio * 100 + mes;
}
