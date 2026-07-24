/**
 * Campañas comerciales por producto — puerto fiel de `campanas.py` de LineUps_Code.
 * Cada grano tiene su año comercial que arranca en un mes distinto (soja abr · maíz/
 * sorgo mar · trigo/cebada dic · girasol feb). Sirve para atribuir una DJVE / un buque
 * a la cosecha NUEVA vs la VIEJA según su fecha de embarque, y para alinear comparaciones
 * entre campañas.
 *
 * Espejo de la función SQL `campana_ini_year(cod, fecha)` (misma tabla de meses); si se
 * toca una, tocar la otra.
 */

/** Mes de inicio de la campaña por código de producto (día siempre 1). */
const CAMPANA_CONFIG: Record<string, number> = {
  SBS: 4, SBM: 4, SBO: 4, NSBO: 4, LECITHIN: 4, SHULLS: 4, SOJA_CRUSH: 4,
  MAIZE: 3, "CORN GLTN": 3, SORGHUM: 3,
  WHEAT: 12, MALT: 12, BARLEY: 12, WBP: 12,
  SFSEED: 2, SFO: 2, SFMP: 2,
};

const MES_DEFAULT = 1;

function mesInicio(producto: string | null): number {
  if (!producto) return MES_DEFAULT;
  return CAMPANA_CONFIG[producto.toUpperCase().trim()] ?? MES_DEFAULT;
}

/** "2026/27" a partir del año de inicio. */
export function campanaLabel(anioInicio: number): string {
  return `${anioInicio}/${String(anioInicio + 1).slice(-2)}`;
}

/** Año de inicio de la campaña a la que pertenece `fecha` para ese producto. */
export function campaniaIniYear(producto: string | null, fecha: Date): number {
  const mesIni = mesInicio(producto);
  // (mes, dia) >= (mesIni, 1) ; como el día de inicio es 1, alcanza con el mes.
  return fecha.getUTCMonth() + 1 >= mesIni ? fecha.getUTCFullYear() : fecha.getUTCFullYear() - 1;
}

/** Etiqueta de campaña ("2025/26") de una fecha para un producto. */
export function campaniaDe(producto: string | null, fecha: Date): string {
  return campanaLabel(campaniaIniYear(producto, fecha));
}

/** Las `n` campañas anteriores a la de `fechaRef` (más nueva primero). */
export function campaniasAnteriores(producto: string | null, fechaRef: Date, n = 5): string[] {
  const actual = campaniaIniYear(producto, fechaRef);
  const out: string[] = [];
  for (let i = 1; i <= n; i++) out.push(campanaLabel(actual - i));
  return out;
}

/** Parsea "2026-07-16" (o ISO con hora) a Date en UTC, robusto a null. */
export function parseFechaUTC(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DIA_MS = 86_400_000;

/**
 * Inicio y fin (UTC) de una campaña "YYYY/YY" para un producto — puerto de
 * `campanas.fechas_de_campana`. Fin = inicio del próximo período − 1 día.
 */
export function fechasDeCampana(producto: string | null, campana: string): { inicio: Date; fin: Date } {
  const mesIni = mesInicio(producto); // día de inicio siempre 1 (como campanas.py)
  const anioInicio = parseInt(campana.split("/")[0]!, 10); // split() nunca da array vacío
  const inicio = new Date(Date.UTC(anioInicio, mesIni - 1, 1));
  const fin = new Date(Date.UTC(anioInicio + 1, mesIni - 1, 1) - DIA_MS);
  return { inicio, fin };
}

/** Día transcurrido dentro de la campaña (1 = primer día) — puerto de `dia_de_campana`. */
export function diaDeCampana(producto: string | null, fecha: Date): number {
  const { inicio } = fechasDeCampana(producto, campaniaDe(producto, fecha));
  return Math.floor((fecha.getTime() - inicio.getTime()) / DIA_MS) + 1;
}

/**
 * Fecha-equivalente (mismo día-de-campaña) en la campaña destino "YYYY/YY" —
 * puerto de `fecha_equivalente`. Clampa al fin si la campaña destino es más corta.
 */
export function fechaEquivalente(producto: string | null, fechaRef: Date, campanaDest: string): Date {
  const dia = diaDeCampana(producto, fechaRef);
  const { inicio, fin } = fechasDeCampana(producto, campanaDest);
  const calc = new Date(inicio.getTime() + (dia - 1) * DIA_MS);
  return calc > fin ? fin : calc;
}
