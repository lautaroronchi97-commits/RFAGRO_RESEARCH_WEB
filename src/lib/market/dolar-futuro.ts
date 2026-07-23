import "server-only";
import { cache } from "react";
import type { Meta } from "./types";
import { getMaeResumen, getMaeOficial } from "./fuentes";
import { parseDdf } from "./tickers";

/* ---------------- Módulo 3: Curva de dólar futuro (MAE DDF) ---------------- */

export type DFPosicion = {
  ticker: string;
  label: string; // p.ej. JUL26
  ultimo: number;
  varPct: number | null;
  volumen: number;
  fecha: number; // epoch del vencimiento (ordena la curva)
  dias: number | null;
  directaPct: number | null;
  tnaPct: number | null;
  temPct: number | null;
  teaPct: number | null;
};

export type DolarFuturoData = {
  spot: number | null; // oficial mayorista MAE
  posiciones: DFPosicion[];
  meta: Meta;
};

/**
 * Tasas implícitas — metodología A3 (spot = oficial mayorista MAE, base 365):
 *   directa = Fut/Spot − 1 · TNA = directa × 365/días
 *   TEA = (Fut/Spot)^(365/días) − 1 · TEM = (1+TEA)^(1/12) − 1
 */
export const getDolarFuturo = cache(async (): Promise<DolarFuturoData> => {
  const [ddf, mae] = await Promise.all([getMaeResumen("DDF"), getMaeOficial()]);
  const spot = mae.valor;
  const now = Date.now();

  const problemas: string[] = [];
  if (!ddf) problemas.push("MAE DDF caído");
  if (spot === null) problemas.push("oficial MAE caído (sin tasas)");

  const posiciones: DFPosicion[] = (ddf ?? [])
    .map((r): DFPosicion | null => {
      const p = parseDdf(r.ticker);
      if (!p) return null;
      const dias = Math.max(1, Math.round((p.venc.getTime() - now) / 86400000));

      let directaPct: number | null = null;
      let tnaPct: number | null = null;
      let temPct: number | null = null;
      let teaPct: number | null = null;
      if (spot && spot > 0) {
        const ratio = r.ultimo / spot;
        directaPct = (ratio - 1) * 100;
        tnaPct = (ratio - 1) * (365 / dias) * 100;
        const tea = Math.pow(ratio, 365 / dias) - 1;
        teaPct = tea * 100;
        temPct = (Math.pow(1 + tea, 1 / 12) - 1) * 100;
      }

      return {
        ticker: r.ticker,
        label: p.label,
        ultimo: r.ultimo,
        varPct: r.variacion,
        volumen: r.cantidad ?? 0,
        fecha: p.venc.getTime(),
        dias,
        directaPct,
        tnaPct,
        temPct,
        teaPct,
      };
    })
    .filter((x): x is DFPosicion => x !== null)
    .sort((a, b) => a.fecha - b.fecha);

  return {
    spot,
    posiciones,
    meta: {
      source: "MAE",
      updatedAt: now,
      status: ddf && spot !== null ? "real" : "parcial",
      problemas,
    },
  };
});
