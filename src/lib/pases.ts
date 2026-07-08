/**
 * Cotizador de pases (spread entre dos posiciones de un mismo grano).
 * Fórmulas del Excel real (hoja PASES DE GRANOS): pase = precio_larga − precio_corta.
 *
 *   pase          = precio_larga − precio_corta
 *   tasa directa  = precio_larga / precio_corta − 1                 (× 100)
 *   TNA USD       = (precio_larga / precio_corta − 1) × 365/días    (días entre posiciones)
 */

export function pase(precioCorta: number, precioLarga: number): number {
  return precioLarga - precioCorta;
}

export function tasaDirectaPase(precioCorta: number, precioLarga: number): number {
  return precioCorta > 0 ? (precioLarga / precioCorta - 1) * 100 : NaN;
}

export function tnaPase(precioCorta: number, precioLarga: number, dias: number): number {
  return precioCorta > 0 && dias > 0 ? (precioLarga / precioCorta - 1) * (365 / dias) * 100 : NaN;
}
