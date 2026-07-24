/**
 * FAS Teórico INDUSTRIA — capacidad de pago de la industria aceitera exportadora (complejo
 * soja: aceite + harina/pellets), la OTRA metodología de BCR (Anexo 2 del PDF de metodología),
 * distinta de la de grano sin procesar (`capacidad-modelo.ts`). Es la que de verdad mueve el
 * precio que le pagan al productor de soja en Argentina: casi toda la soja se cruza acá, muy
 * poca se exporta como poroto entero.
 *
 * Insumo real: modelo propio de un tercero que entiende la materia (parámetros "vigente
 * 04/2026", verificado en la sesión — docs/sesiones/2026-07-24-c16-capacidad-pago.md §Industria).
 * Se reprodujo la fórmula EXACTA de ese modelo, verificada línea por línea contra sus propios
 * números de ejemplo:
 *
 *   FAS producto = FOB mercado producto − fobbing producto − (alícuota DEX producto × FOB oficial producto)
 *   Precio compuesto = Σ FAS producto × rinde de molienda del producto (aceite + harina)
 *   FAS sin costo industrialización = Precio compuesto − (% gastos comerciales × pizarra/A3 soja)
 *   FAS Teórico INDUSTRIA = FAS sin costo industrialización − costo de industrialización − margen de riesgo
 *
 * Diferencia real con `capacidad-modelo.ts` (grano): acá los gastos comerciales se calculan
 * sobre la PIZARRA/A3 de soja (no sobre el FOB) — así lo define el propio modelo de referencia
 * ("GASTOS COMERCIALES % sobre A3"), y no se tocó la fórmula de grano ya en producción para no
 * cambiarle el comportamiento sin que nadie lo pidiera.
 *
 * Cáscara (6% del rinde de molienda) queda AFUERA del cálculo: no se encontró una posición NCM
 * de FOB oficial propia para pellets de cáscara de soja (ni en la API de SAGyP ni en la
 * planilla en vivo de BCR, que solo publica aceite y harina/pellets en la sección Industria) —
 * incluirla con un FOB inventado sería peor que omitirla. Subestima el precio compuesto en
 * ~6-8 USD/tn (el propio ejemplo del modelo de referencia: cáscara aporta ~7,5 USD/tn de 355,8).
 */

export type CapacidadIndustriaCfg = {
  /** Alícuota de derechos de exportación del aceite de soja (fracción, ej. 0.225 = 22,5%). */
  alicuotaDexAceite: number;
  /** Alícuota de derechos de exportación de la harina/pellets de soja (fracción). */
  alicuotaDexHarina: number;
  /** Fobbing del aceite (USD/tn de aceite). */
  fobbingAceiteUsd: number;
  /** Fobbing de la harina/pellets (USD/tn de harina). */
  fobbingHarinaUsd: number;
  /** Rinde de molienda: aceite (fracción sobre 1 tn de poroto). */
  rindeAceite: number;
  /** Rinde de molienda: harina/pellets (fracción sobre 1 tn de poroto). */
  rindeHarina: number;
  /** Gastos comerciales, fracción de la pizarra/A3 de soja (no del FOB — así lo define el modelo de referencia). */
  gastosComercialesPct: number;
  /** Costo de industrialización (molienda), USD/tn de poroto procesado. */
  costoIndustrializacionUsd: number;
  /** Margen/prima de riesgo explícito, USD/tn (default 0, misma perilla que el modelo de grano). */
  margenRiesgoUsd: number;
};

/**
 * Defaults "vigente 04/2026" del modelo de referencia (rindes cross-validados contra el Anexo 2
 * del PDF de metodología de BCR 26/10/2021: 19,5%/71,2%, coinciden casi al decimal).
 */
export const CFG_INDUSTRIA_DEFAULT: CapacidadIndustriaCfg = {
  alicuotaDexAceite: 0.225,
  alicuotaDexHarina: 0.225,
  fobbingAceiteUsd: 12.5,
  fobbingHarinaUsd: 9.5,
  rindeAceite: 0.195,
  rindeHarina: 0.712,
  gastosComercialesPct: 0.0336,
  costoIndustrializacionUsd: 24.0,
  margenRiesgoUsd: 0,
};

function fasProducto(
  fobMercado: number | null,
  fobOficial: number | null,
  fobbingUsd: number,
  alicuotaDex: number,
): number | null {
  if (fobMercado == null || !Number.isFinite(fobMercado)) return null;
  if (fobOficial == null || !Number.isFinite(fobOficial)) return null;
  return fobMercado - fobbingUsd - fobOficial * alicuotaDex;
}

/**
 * FAS Teórico Industria (soja). `null` si falta cualquier FOB de entrada (no inventa un valor).
 * `fobMercadoAceite/Harina`: precio de mercado (broker), usado para el FAS de cada producto.
 * `fobOficialAceite/Harina`: FOB oficial SAGyP/MAGyP, usado SOLO para la base de los derechos.
 * `pizarraSoja`: disponible/A3 de soja, base de los gastos comerciales.
 */
export function calcularFasIndustria(
  fobMercadoAceite: number | null,
  fobOficialAceite: number | null,
  fobMercadoHarina: number | null,
  fobOficialHarina: number | null,
  pizarraSoja: number | null,
  cfg: CapacidadIndustriaCfg,
): number | null {
  const fasAceite = fasProducto(fobMercadoAceite, fobOficialAceite, cfg.fobbingAceiteUsd, cfg.alicuotaDexAceite);
  const fasHarina = fasProducto(fobMercadoHarina, fobOficialHarina, cfg.fobbingHarinaUsd, cfg.alicuotaDexHarina);
  if (fasAceite == null || fasHarina == null) return null;

  const precioCompuesto = fasAceite * cfg.rindeAceite + fasHarina * cfg.rindeHarina;
  const gastosComerciales =
    pizarraSoja != null && Number.isFinite(pizarraSoja) ? cfg.gastosComercialesPct * pizarraSoja : 0;
  const fasSinCostoIndustrializacion = precioCompuesto - gastosComerciales;
  const fas = fasSinCostoIndustrializacion - cfg.costoIndustrializacionUsd - cfg.margenRiesgoUsd;
  return Number.isFinite(fas) ? Math.round(fas * 100) / 100 : null;
}
