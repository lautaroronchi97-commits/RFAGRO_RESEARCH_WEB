/**
 * FAS Teórico RF AGRO — el cálculo PROPIO de capacidad de pago (paralelo al de BCR).
 *
 * Sigue la misma estructura que la metodología de BCR ("Metodología de FAS teórico
 * EXPORTACIÓN y FAS Teórico INDUSTRIA", Dirección de Informaciones y Estudios Económicos,
 * BCR, 26/10/2021):
 *
 *   FAS teórico = FOB oficial − Derechos de exportación + Reintegro
 *                 − Gastos portuarios (fobbing) − Gastos comerciales − Margen de riesgo
 *
 * Research previo (docs/sesiones/2026-07-24-c16-capacidad-pago.md) confirmó, con fuentes:
 * - Los derechos de exportación se calculan LEGALMENTE sobre el FOB OFICIAL (no sobre el FOB
 *   de mercado/broker que usa BCR para su columna "Up River") → acá el FOB de entrada es
 *   SIEMPRE el oficial de SAGyP/MAGyP (`fob-oficial.ts`), la misma base que usa la columna
 *   "SAGyP" de la propia planilla de BCR.
 * - No hay reintegro vigente para granos sin procesar (ni en el Anexo 1 del PDF de BCR, que
 *   no lo aplica en su ejemplo, ni en la normativa general de reintegros — orientada a
 *   manufacturas). Default 0%, pero queda como parámetro por si algún día se reactiva.
 * - BCR explícitamente NO contempla "márgenes o primas por incertidumbre o riesgo que cada
 *   empresa pueda tomar" (PDF, pág. 1) — es la explicación #1 de por qué el FAS teórico y lo
 *   que paga el mercado difieren (competencia por originar, expectativa de baja de
 *   retenciones, riesgo cambiario). Acá se deja ese término EXPLÍCITO (`margenRiesgoUsd`,
 *   default 0) en vez de dejarlo escondido en la brecha — es la controversia hecha perilla.
 *
 * Los defaults de gastos portuarios/comerciales se siembran, en `capacidad.ts`, desde los
 * mismos b)/c) que hoy publica BCR en su planilla en vivo (es la única fuente pública con
 * el desglose actualizado — se ajusta 1x/año por encuesta a exportadoras, PDF pág. 1) — así
 * el día 1 "Nuestro" arranca calibrado contra el estándar de mercado y Lautaro lo edita a
 * mano si consigue mejores números.
 */

export type CapacidadModeloCfg = {
  /** Alícuota de derechos de exportación (fracción, ej 0.24 = 24%). */
  alicuotaDex: number;
  /** Reintegro a la exportación (fracción). Default 0 (sin reintegro vigente para grano sin procesar). */
  reintegro: number;
  /** Gastos portuarios / "fobbing" (elevación, SENASA, surveyor, despachante, corretaje FOB, estibaje), USD/tn. */
  gastosPortuariosUsd: number;
  /** Gastos comerciales (sellos, transferencias, registro, corretaje FAS, prefinanciación, IVA, calidad), fracción del FOB. */
  gastosComercialesPct: number;
  /** Margen/prima de riesgo del exportador que BCR no modela, USD/tn. Default 0 (perilla explícita). */
  margenRiesgoUsd: number;
};

/** Vigentes al 18/07/2026 (Decreto 877/2025 + cronograma Decreto 423/2026, ver docs/negocio/05). */
export const ALICUOTAS_DEX_VIGENTES: Record<string, number> = {
  SOJ: 0.24,
  MAI: 0.085,
  TRI: 0.055,
  SOR: 0.085,
  GIR: 0.045,
};

/**
 * Defaults de fobbing/comerciales cuando BCR no está disponible para sembrarlos (caída de
 * la fuente): orden de magnitud del Anexo 1 del PDF BCR (26/10/2021), la única apertura
 * pública ítem por ítem — desactualizados en el detalle pero razonables como piso.
 */
export const GASTOS_FALLBACK: Record<string, { portuariosUsd: number; comercialesPct: number }> = {
  SOJ: { portuariosUsd: 7.5, comercialesPct: 0.0276 },
  MAI: { portuariosUsd: 5.5, comercialesPct: 0.0276 },
  TRI: { portuariosUsd: 5.5, comercialesPct: 0.0276 },
  SOR: { portuariosUsd: 6.5, comercialesPct: 0.0276 },
  GIR: { portuariosUsd: 8.5, comercialesPct: 0.179 }, // girasol: "diferencia por calidad" mucho mayor (Anexo 1)
};

export function cfgDefault(underlying: string): CapacidadModeloCfg {
  return {
    alicuotaDex: ALICUOTAS_DEX_VIGENTES[underlying] ?? 0,
    reintegro: 0,
    gastosPortuariosUsd: GASTOS_FALLBACK[underlying]?.portuariosUsd ?? 6,
    gastosComercialesPct: GASTOS_FALLBACK[underlying]?.comercialesPct ?? 0.0276,
    margenRiesgoUsd: 0,
  };
}

/** Subconjunto de `FilaBcr` (capacidad-bcr-parse.ts) que hace falta para sembrar la config. */
export type FilaBcrGastos = { fob: number | null; gastosPuertos: number | null; gastosComerc: number | null };

/**
 * Config del modelo propio sembrada desde los b)/c) que hoy publica BCR (si están disponibles);
 * si no, cae al fallback fijo de `cfgDefault`. `gastosComerc` viene en USD/tn (igual que
 * `gastosPuertos`) — se lo pasa a FRACCIÓN del FOB dividiendo por `fob` (bug real corregido acá:
 * quedar en unidades de "USD/tn" en vez de "fracción" hacía que el factor de la fórmula se
 * fuera negativo por completo — ver docs/sesiones/2026-07-24-c16-capacidad-pago.md).
 */
export function cfgSembrada(underlying: string, filaBcr: FilaBcrGastos | undefined): CapacidadModeloCfg {
  const base = cfgDefault(underlying);
  if (!filaBcr) return base;
  const gastosPortuariosUsd = filaBcr.gastosPuertos ?? base.gastosPortuariosUsd;
  const gastosComercialesPct =
    filaBcr.gastosComerc != null && filaBcr.fob != null && filaBcr.fob > 0
      ? Math.round((filaBcr.gastosComerc / filaBcr.fob) * 10000) / 10000 // fracción, no %
      : base.gastosComercialesPct;
  return { ...base, gastosPortuariosUsd, gastosComercialesPct };
}

/**
 * FAS Teórico RF AGRO = FOB oficial × (1 − alícuota DEX + reintegro − % comerciales)
 *                        − gastos portuarios − margen de riesgo
 * `null` si falta el FOB oficial (no inventa un valor).
 */
export function calcularFasTeorico(fobOficial: number | null, cfg: CapacidadModeloCfg): number | null {
  if (fobOficial == null || !Number.isFinite(fobOficial) || fobOficial <= 0) return null;
  const factor = 1 - cfg.alicuotaDex + cfg.reintegro - cfg.gastosComercialesPct;
  const fas = fobOficial * factor - cfg.gastosPortuariosUsd - cfg.margenRiesgoUsd;
  return Number.isFinite(fas) ? Math.round(fas * 100) / 100 : null;
}

/** Diferencial pizarra vs FAS teórico: + = el mercado paga por encima de lo teórico ("sobrepagado" para el exportador,
 *  bueno para el productor); − = el mercado paga por debajo ("subpagado", hay margen sin trasladar). */
export function diferencialVsPizarra(
  pizarra: number | null,
  fasTeorico: number | null,
): { usd: number | null; pct: number | null } {
  if (pizarra == null || fasTeorico == null || !Number.isFinite(pizarra) || !Number.isFinite(fasTeorico) || fasTeorico === 0) {
    return { usd: null, pct: null };
  }
  const usd = Math.round((pizarra - fasTeorico) * 100) / 100;
  const pct = Math.round(((pizarra - fasTeorico) / fasTeorico) * 10000) / 100;
  return { usd, pct };
}
