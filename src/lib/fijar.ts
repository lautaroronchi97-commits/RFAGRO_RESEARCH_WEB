/**
 * Cotizador de negocios "a fijar": se compra a un precio y se fija contra la
 * CURVA de futuros A3 en algún plazo. Muestra en qué posición se gana y en cuál
 * se pierde, y la TNA USD implícita por plazo.
 *
 *   resultado_bruto = precio_futuro − precio_a_pagar
 *   resultado_neto  = resultado_bruto − delta_esperado   (delta positivo = MALO)
 *   TNA USD         = (precio_futuro / precio_a_pagar − 1) × 365/días
 *
 * Nota: la simulación toma el PRECIO DE FUTUROS, que puede diferir del spot al
 * momento de fijar (riesgo de base). El `delta_esperado` intenta capturar eso;
 * en producción viene del proyecto de análisis de fijaciones.
 */

export type PosCurva = { vto: string; precio: number };

export type FilaFijar = {
  vto: string;
  precio: number;
  dias: number;
  resultadoBruto: number;
  resultadoNeto: number;
  tna: number;
  gana: boolean;
};

/** `hoyMs` = epoch de hoy; `vtoMs(vto)` convierte la fecha de la posición a epoch. */
export function evaluarFijar(
  base: number,
  deltaEsperado: number,
  curva: PosCurva[],
  hoyMs: number,
  vtoMs: (vto: string) => number | null,
): FilaFijar[] {
  return curva
    .filter((p) => p.vto && Number.isFinite(p.precio) && p.precio > 0)
    .map((p) => {
      const t = vtoMs(p.vto);
      const dias = t ? Math.max(0, Math.round((t - hoyMs) / 86400000)) : 0;
      const resultadoBruto = p.precio - base;
      const resultadoNeto = resultadoBruto - deltaEsperado;
      const tna = base > 0 && dias > 0 ? (p.precio / base - 1) * (365 / dias) * 100 : NaN;
      return { vto: p.vto, precio: p.precio, dias, resultadoBruto, resultadoNeto, tna, gana: resultadoNeto > 0 };
    });
}
