/**
 * estacional.ts — Motor de percentiles estacionales del índice de temperatura MESA.
 * Puerto 1:1 de `estacional.py` de LineUps_Code (Fase 4 — docs/PLAN_PUERTOS.md §5).
 *
 * Para decir si un producto está "caliente" hoy no sirve un umbral absoluto: un gap de 300 kt puede
 * ser altísimo en agosto y normal en cosecha. Lo que importa es cómo se compara el valor de HOY contra
 * la MISMA época de las campañas anteriores. Este módulo toma la serie histórica de una métrica (gap de
 * cobertura, densidad de line-up, avance de ventas) y devuelve el percentil 0-100 del valor actual
 * dentro de su ventana estacional.
 *
 * Alineación por SEMANA DE CAMPAÑA (no calendario): usa `campanas.ts` para comparar el día-de-campaña
 * actual con el mismo día-de-campaña de años previos (la soja arranca 1-abr, el maíz 1-mar, etc.).
 *
 * Módulo PURO: recibe la serie histórica y devuelve números/null. Sin red ni DB.
 */

import { campaniasAnteriores, fechaEquivalente } from "./campanas";

// ±días alrededor de la fecha-equivalente que cuentan como "la misma época" (ventana de 31 días).
export const VENTANA_ESTACIONAL_DIAS = 15;
// Campañas previas a mirar y mínimo para emitir un percentil.
export const CAMPANAS_HISTORIA = 5;
export const MIN_CAMPANAS = 2;

const DIA_MS = 86_400_000;

/** Una fila de la serie histórica de una métrica (gap/densidad/avance) por producto. */
export type SerieRow = { fecha: Date; cod: string; valor: number };

/**
 * Para cada campaña previa, la ventana [equiv−15, equiv+15] de la fecha-equivalente — puerto de
 * `fechas_estacionales`. De más reciente a más antigua.
 */
export function fechasEstacionales(
  producto: string,
  fechaActual: Date,
  ventanaDias = VENTANA_ESTACIONAL_DIAS,
  nCampanas = CAMPANAS_HISTORIA,
): { campana: string; desde: Date; hasta: Date }[] {
  const previas = campaniasAnteriores(producto, fechaActual, nCampanas);
  return previas.map((camp) => {
    const equiv = fechaEquivalente(producto, fechaActual, camp);
    return {
      campana: camp,
      desde: new Date(equiv.getTime() - ventanaDias * DIA_MS),
      hasta: new Date(equiv.getTime() + ventanaDias * DIA_MS),
    };
  });
}

/**
 * Percentil (0-100) de `valorActual` dentro de `valores` (rango débil) — puerto de
 * `percentil_en_serie`: 100 × (#valores ≤ valorActual) / total. NaN si la lista está vacía.
 */
export function percentilEnSerie(valores: number[], valorActual: number): number {
  const n = valores.length;
  if (n === 0) return NaN;
  const menoresIguales = valores.reduce((acc, v) => acc + (v <= valorActual ? 1 : 0), 0);
  return (100 * menoresIguales) / n;
}

/**
 * Percentil estacional 0-100 del valor actual contra su historia — puerto de `percentil_estacional`.
 *
 * @param serie      Serie histórica de la métrica (filas {fecha, cod, valor}).
 * @param producto   Código de producto (ej "MAIZE").
 * @param fechaActual Fecha de referencia (hoy).
 * @param valorActual Valor de la métrica hoy. null → devuelve null.
 * Devuelve null si no hay historia suficiente (menos de `minCampanas` campañas con dato en la ventana).
 */
export function percentilEstacional(
  serie: SerieRow[],
  producto: string,
  fechaActual: Date,
  valorActual: number | null,
  ventanaDias = VENTANA_ESTACIONAL_DIAS,
  nCampanas = CAMPANAS_HISTORIA,
  minCampanas = MIN_CAMPANAS,
): number | null {
  if (valorActual == null || Number.isNaN(valorActual)) return null;
  if (!serie || serie.length === 0) return null;

  const delProducto = serie.filter((r) => r.cod === producto && Number.isFinite(r.valor));
  if (delProducto.length === 0) return null;

  const ventanas = fechasEstacionales(producto, fechaActual, ventanaDias, nCampanas);
  const valores: number[] = [];
  let campanasConDato = 0;
  for (const { desde, hasta } of ventanas) {
    const enVentana = delProducto.filter((r) => r.fecha >= desde && r.fecha <= hasta);
    if (enVentana.length > 0) {
      campanasConDato += 1;
      for (const r of enVentana) valores.push(r.valor);
    }
  }
  if (campanasConDato < minCampanas || valores.length === 0) return null;
  return percentilEnSerie(valores, valorActual);
}
