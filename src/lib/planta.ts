/**
 * Calculadora "Negocios de planta": arranca de un precio (pizarra del grano
 * elegido, editable) y le va restando rubros de descuento hasta el precio final.
 * Todo en USD, aritmética local (no toca datos de mercado).
 *
 * Rubros: contra flete · secada (puntos × valor/punto, fijo 5 o "no fijo") ·
 * merma volátil (% sobre el precio de arranque) · paritaria · embolsado · otros.
 */

/** 5 USD por punto de humedad (valor fijo por defecto de la secada). */
export const VALOR_PUNTO_FIJO = 5;

export type RubrosPlanta = {
  arranque: number;
  flete: number;
  puntos: number;
  valorPunto: number;
  pctMerma: number;
  paritaria: number;
  embolsado: number;
  otros: number;
};

export type ResultadoPlanta = {
  dFlete: number;
  dSecada: number;
  dMerma: number;
  dParitaria: number;
  dEmbolsado: number;
  dOtros: number;
  totalGastos: number;
  /** arranque − totalGastos; NaN si el arranque no es un precio válido (>0). */
  final: number;
};

export function calcularPlanta(r: RubrosPlanta): ResultadoPlanta {
  const arranqueOk = Number.isFinite(r.arranque) && r.arranque > 0;
  const dSecada = r.puntos * r.valorPunto;
  const dMerma = arranqueOk ? (r.arranque * r.pctMerma) / 100 : 0;
  const totalGastos = r.flete + dSecada + dMerma + r.paritaria + r.embolsado + r.otros;
  const final = arranqueOk ? r.arranque - totalGastos : NaN;
  return {
    dFlete: r.flete,
    dSecada,
    dMerma,
    dParitaria: r.paritaria,
    dEmbolsado: r.embolsado,
    dOtros: r.otros,
    totalGastos,
    final,
  };
}
