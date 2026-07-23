import { percentilEnSerie } from "../lineup/estacional";

/**
 * senal.ts — Señal "barcos vs camiones" (negocio/09_camiones_vs_lineup_senal.md, FASE 2).
 * Módulo PURO (sin red/DB) — recibe series ya leídas de la base y devuelve números.
 *
 * SEÑAL = percentil estacional de la densidad de line-up (bodega esperando) MENOS el percentil
 * estacional de la media móvil de camiones descargados (reposición física). NUNCA un ratio con
 * umbral fijo — la auditoría del 23/07 verificó que los umbrales fijos de cobertura.ts disparaban
 * el 74-95% de los días históricos por no estar calibrados; el diferencial de percentiles no tiene
 * ese problema porque cada pata ya está normalizada 0-100 contra su propia distribución.
 *
 * Ventana: CALENDARIO (mismo día/mes ±15 días de los últimos 5 años), no campaña-de-producto — la
 * densidad por ZONA no tiene un producto único que le fije el mes de arranque de campaña, y el
 * ejemplo real de negocio/09 ("julios 2021-2025") es justamente eso: la misma época del año, año a
 * año. Mecánica idéntica a `percentilCalendario` de `lineup/temperatura.ts` (farmer selling C3),
 * replicada acá para no acoplar este módulo nuevo al de temperatura.
 */

const DIA_MS = 86_400_000;
export const VENTANA_CALENDARIO_DIAS = 15;
export const ANIOS_HISTORIA = 5;
export const MIN_ANIOS = 2;

export type Punto = { fecha: Date; valor: number };

/**
 * Percentil (0-100) del valor de HOY contra la misma fecha (±`ventanaDias`) de los últimos
 * `nAnios` años calendario. null si no hay al menos `minAnios` años con dato en la ventana.
 */
export function percentilCalendario(
  serie: Punto[],
  hoy: Date,
  valorHoy: number | null,
  ventanaDias = VENTANA_CALENDARIO_DIAS,
  nAnios = ANIOS_HISTORIA,
  minAnios = MIN_ANIOS,
): number | null {
  if (valorHoy == null || !Number.isFinite(valorHoy)) return null;
  const valores: number[] = [];
  let anios = 0;
  for (let k = 1; k <= nAnios; k++) {
    const centro = Date.UTC(hoy.getUTCFullYear() - k, hoy.getUTCMonth(), hoy.getUTCDate());
    const desde = centro - ventanaDias * DIA_MS;
    const hasta = centro + ventanaDias * DIA_MS;
    let hubo = false;
    for (const p of serie) {
      const t = p.fecha.getTime();
      if (t >= desde && t <= hasta) {
        valores.push(p.valor);
        hubo = true;
      }
    }
    if (hubo) anios++;
  }
  if (anios < minAnios || valores.length === 0) return null;
  return percentilEnSerie(valores, valorHoy);
}

/**
 * Media móvil de los últimos `n` valores STORED de la serie (ordenada asc. por fecha), no
 * calendario — "MA7 en días hábiles" (negocio/09 FASE 2 nota 3): ni `camiones` (SAGyP descarta las
 * filas 100% en cero de domingos/feriados al ingestar) ni el backfill de Williams (que directamente
 * no tiene fila esos días) guardan ceros artificiales, así que promediar las últimas `n` filas
 * guardadas YA es promediar días hábiles, sin necesitar un calendario de feriados acá.
 */
export function mediaMovil(serie: Punto[], n = 7): Punto[] {
  const out: Punto[] = [];
  for (let i = 0; i < serie.length; i++) {
    const desde = Math.max(0, i - n + 1);
    const ventana = serie.slice(desde, i + 1);
    const valor = ventana.reduce((acc, p) => acc + p.valor, 0) / ventana.length;
    out.push({ fecha: serie[i].fecha, valor });
  }
  return out;
}

export type Lectura = "ALCISTA" | "BAJISTA" | "NEUTRO" | "SIN_DATO";

export type SenalPunto = {
  pctlLineup: number | null;
  pctlCamiones: number | null;
  diferencial: number | null;
  lectura: Lectura;
};

/**
 * Umbral de "diferencial chico = neutro" (PROVISORIO, como los umbrales de cobertura.ts hasta la
 * calibración L4 del backlog maestro — ver docs/auditoria/E7-sintesis.md §6 L4). Elegido en 10 tras
 * verificar que separa EXACTO las 5 lecturas del ejemplo real 22/07/2026 de negocio/09: trigo +19→
 * alcista, Gran Rosario −12→bajista, maíz +4/soja +8/Bahía +6→los 3 neutros (todos |diff|<10).
 */
export const UMBRAL_NEUTRO = 10;

/** Diferencial de percentiles → lectura direccional. Pura aritmética, sin red/DB. */
export function calcularSenal(
  pctlLineup: number | null,
  pctlCamiones: number | null,
  umbralNeutro = UMBRAL_NEUTRO,
): SenalPunto {
  if (pctlLineup == null || pctlCamiones == null) {
    return { pctlLineup, pctlCamiones, diferencial: null, lectura: "SIN_DATO" };
  }
  const diferencial = pctlLineup - pctlCamiones;
  const lectura: Lectura = diferencial > umbralNeutro ? "ALCISTA" : diferencial < -umbralNeutro ? "BAJISTA" : "NEUTRO";
  return { pctlLineup, pctlCamiones, diferencial, lectura };
}
