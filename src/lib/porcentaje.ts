/**
 * Negocios "a fijar por relación de otro producto" (ej. "180% pizarra maíz",
 * "57% soja julio"). El precio del negocio se define como un porcentaje del
 * precio de una posición/producto de referencia.
 *
 *   porcentaje  = precio_negocio / precio_referencia × 100
 *   precio      = porcentaje/100 × precio_referencia
 *
 * El plazo se estima del vencimiento de la posición de referencia.
 */

export function porcentaje(precioNegocio: number, precioRef: number): number {
  return precioRef > 0 ? (precioNegocio / precioRef) * 100 : NaN;
}

export function precioDesdePct(pct: number, precioRef: number): number {
  return (pct / 100) * precioRef;
}
