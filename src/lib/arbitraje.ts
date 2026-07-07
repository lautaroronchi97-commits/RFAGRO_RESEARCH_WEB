/**
 * Arbitraje disponible ↔ futuro (carry de granos). Fórmulas del Excel real de
 * Lautaro (hoja ARBITRAJES), ver docs/FORMULAS_EXCEL.md.
 *
 *   tasa directa = precio_futuro / pizarra − 1
 *   TNA USD      = (precio_futuro / pizarra − 1) × 365 / días   [INTRATE act/365]
 *   spread       = precio_futuro − pizarra
 *
 * Lectura: TNA USD positiva → comprar spot + vender diferido (capturar tasa);
 * negativa → vender spot + recomprar futuros.
 */

export function tasaDirecta(precioFuturo: number, pizarra: number): number {
  if (!(pizarra > 0)) return NaN;
  return precioFuturo / pizarra - 1;
}

/** TNA USD anualizada (%) — base actual/365. */
export function tnaUSD(precioFuturo: number, pizarra: number, dias: number): number {
  if (!(pizarra > 0) || !(dias > 0)) return NaN;
  return (precioFuturo / pizarra - 1) * (365 / dias) * 100;
}

export function spread(precioFuturo: number, pizarra: number): number {
  return precioFuturo - pizarra;
}

/** TEA USD (%) equivalente, para comparar con otras tasas efectivas. */
export function teaUSD(precioFuturo: number, pizarra: number, dias: number): number {
  if (!(pizarra > 0) || !(dias > 0)) return NaN;
  return (Math.pow(precioFuturo / pizarra, 365 / dias) - 1) * 100;
}
