/**
 * Sintéticos LECAP + dólar futuro (módulo 6 / backlog C13, PROMPT P9 de PLAN_BACKLOG.md).
 * PURO y sin `server-only` (a propósito, para poder testearlo — mismo criterio que
 * `derivadas.ts`/`fijar.ts`): la ingesta vive en `src/lib/market/sinteticos.ts`, que arma
 * los inputs desde las fuentes reales y llama a estas funciones.
 *
 * Fórmula (validada por Lautaro por chat + reproducida 1:1 contra su Excel "REAL_TIME v2.5",
 * hoja "DOLAR SINTETICO"):
 *   sintéticoAFinish = dólarSpot × (pagoFinalLetra / precioHoyLetra)
 *   tasaDirecta      = sintéticoAFinish / dólarFuturo − 1
 *   TNA              = tasaDirecta × 365 / díasHastaVto     (act/365, criterio del resto del proyecto)
 *
 * El "sintético" arma un dólar a término comprando la letra (que paga `pagoFinal` a su
 * vencimiento) y comparándolo contra vender el dólar futuro de esa misma posición: si la TNA
 * del sintético supera la del futuro directo, conviene el sintético.
 */

export type SinteticoCalc = {
  sinteticoAFinish: number;
  tasaDirecta: number;
  /** TNA en USD (fracción, no %). NaN si díasHastaVto ≤ 0 (letra ya vencida). */
  tna: number;
};

/**
 * Núcleo de la fórmula. `dolarFuturo` es el precio de la posición de dólar futuro emparejada
 * (en el Excel es el AJUSTE; en producción usamos el último/referencia de MAE para esa
 * posición — lo que la web ya trata como el precio del dólar futuro). Todo en las mismas
 * unidades de moneda; `letraPx`/`letraPagoFinal` en la misma base entre sí (VN 100).
 */
export function calcularSintetico(
  dolarSpot: number,
  letraPx: number,
  letraPagoFinal: number,
  dolarFuturo: number,
  diasHastaVto: number,
): SinteticoCalc {
  const sinteticoAFinish = dolarSpot * (letraPagoFinal / letraPx);
  const tasaDirecta = sinteticoAFinish / dolarFuturo - 1;
  const tna = diasHastaVto > 0 ? (tasaDirecta * 365) / diasHastaVto : NaN;
  return { sinteticoAFinish, tasaDirecta, tna };
}

/* ---------------- emparejamiento letra ↔ posición de dólar futuro ---------------- */

export type LetraIn = {
  symbol: string;
  px: number;
  /** epoch ms del vencimiento de la letra (de su ticker). null si no se pudo inferir. */
  vencMs: number | null;
  /** días calendario hasta el vencimiento de la letra (referencia de la TNA). */
  dias: number | null;
};

export type PosicionIn = {
  label: string; // p.ej. JUL26
  /** precio del dólar futuro de esa posición (último/ajuste MAE). */
  precio: number;
  vencMs: number;
  /** TNA directa del dólar futuro solo (fracción de %, ya en %). */
  tnaPct: number | null;
};

export type SinteticoRow = {
  letra: string;
  vto: string | null; // ISO YYYY-MM-DD de la letra
  dias: number | null;
  letraPx: number;
  pagoFinal: number | null;
  posicion: string | null; // label del dólar futuro emparejado
  dolarFuturo: number | null;
  sinteticoAFinish: number | null;
  tasaDirectaPct: number | null;
  /** TNA del sintético (%). */
  tnaPct: number | null;
  /** TNA del dólar futuro directo (%), para comparar. */
  futTnaPct: number | null;
  /** ventaja del sintético vs futuro directo (pp): tnaPct − futTnaPct. */
  ventajaPct: number | null;
};

function isoDeMs(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms)) return null;
  // Mediodía Córdoba (UTC−3) ya viene implícito en el epoch de la letra; basta con la fecha UTC.
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Empareja cada letra (que tiene vencimiento) con la posición de dólar futuro cuyo vencimiento
 * cae en la misma fecha o la más cercana, dentro de `toleranciaDias`. Criterio del Excel de
 * Lautaro: la letra se compara contra la posición de DLR de su mismo mes de vencimiento
 * (S31L6 ↔ DLR/JUL26, ambas 31/07). Sin match dentro de la tolerancia, la letra no tiene un
 * dólar futuro con el cual armar el sintético → se excluye.
 *
 * Devuelve las filas ordenadas por vencimiento de la letra (orden natural de curva). El pago
 * final se toma de `pagoFinalPorTicker`; si falta, la fila igual se muestra pero con el
 * sintético en null (degradación honesta, no se inventa).
 */
export function emparejarSinteticos(
  spot: number | null,
  letras: LetraIn[],
  posiciones: PosicionIn[],
  pagoFinalPorTicker: Record<string, number>,
  toleranciaDias = 31,
): SinteticoRow[] {
  const tolMs = toleranciaDias * 86_400_000;
  const rows: SinteticoRow[] = [];

  for (const l of letras) {
    if (l.vencMs === null) continue;

    // posición de dólar futuro más cercana por vencimiento
    let mejor: PosicionIn | null = null;
    let mejorDiff = Infinity;
    for (const p of posiciones) {
      const diff = Math.abs(p.vencMs - l.vencMs);
      if (diff < mejorDiff) {
        mejorDiff = diff;
        mejor = p;
      }
    }
    if (!mejor || mejorDiff > tolMs) continue; // sin dólar futuro emparejable

    const pagoFinal = pagoFinalPorTicker[l.symbol] ?? null;

    let sinteticoAFinish: number | null = null;
    let tasaDirectaPct: number | null = null;
    let tnaPct: number | null = null;
    if (spot && spot > 0 && pagoFinal !== null && pagoFinal > 0 && l.px > 0 && l.dias && l.dias > 0) {
      const c = calcularSintetico(spot, l.px, pagoFinal, mejor.precio, l.dias);
      sinteticoAFinish = c.sinteticoAFinish;
      tasaDirectaPct = c.tasaDirecta * 100;
      tnaPct = Number.isNaN(c.tna) ? null : c.tna * 100;
    }

    const futTnaPct = mejor.tnaPct;
    const ventajaPct = tnaPct !== null && futTnaPct !== null ? tnaPct - futTnaPct : null;

    rows.push({
      letra: l.symbol,
      vto: isoDeMs(l.vencMs),
      dias: l.dias,
      letraPx: l.px,
      pagoFinal,
      posicion: mejor.label,
      dolarFuturo: mejor.precio,
      sinteticoAFinish,
      tasaDirectaPct,
      tnaPct,
      futTnaPct,
      ventajaPct,
    });
  }

  rows.sort((a, b) => {
    const ka = a.vto ?? "9999";
    const kb = b.vto ?? "9999";
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return rows;
}
