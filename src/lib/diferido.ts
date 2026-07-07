/**
 * Cotizador de pago diferido (confirmado con Lautaro, 07/07/2026).
 *
 * Convención:
 *  - El DIFERIDO cobra MÁS; el pago (cobro anticipado) DESCUENTA.
 *  - Interés SIMPLE, base 365.
 *  - `dias` = días de financiación = SOLO EL EXCEDENTE por encima del pago
 *    estándar (5 días hábiles). Ese cálculo de fechas lo hace habiles.ts.
 *
 *  diferido      = conPago × (1 + tasa/100 × dias/365)
 *  conPago       = diferido / (1 + tasa/100 × dias/365)
 *  tasaImplícita = (diferido/conPago − 1) × 365/dias × 100
 *  dias          = (diferido/conPago − 1) × 365 / (tasa/100)
 */

export const BASE = 365;

/** Factor de capitalización simple por `dias` de financiación. */
export function factor(tasaPct: number, dias: number): number {
  return 1 + (tasaPct / 100) * (dias / BASE);
}

/** Precio diferido a partir del precio con pago (cobra más). */
export function precioDiferido(conPago: number, tasaPct: number, dias: number): number {
  return conPago * factor(tasaPct, dias);
}

/** Precio con pago a partir del diferido (descuenta). */
export function precioConPago(diferido: number, tasaPct: number, dias: number): number {
  const f = factor(tasaPct, dias);
  return f === 0 ? NaN : diferido / f;
}

/** Tasa implícita anual (%) entre el precio con pago y el diferido. */
export function tasaImplicita(conPago: number, diferido: number, dias: number): number {
  if (conPago <= 0 || dias <= 0) return NaN;
  return (diferido / conPago - 1) * (BASE / dias) * 100;
}

/** Días de financiación necesarios para pasar de conPago a diferido a esa tasa. */
export function diasDesdeTasa(conPago: number, diferido: number, tasaPct: number): number {
  if (conPago <= 0 || tasaPct <= 0) return NaN;
  return (diferido / conPago - 1) * (BASE / (tasaPct / 100));
}
