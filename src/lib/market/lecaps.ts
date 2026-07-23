import "server-only";
import { cache } from "react";
import type { Meta } from "./types";
import { getNotes } from "./fuentes";
import { vencFromTicker } from "./tickers";

/* ---------------- Módulo 6: LECAPs (data912) — base para sintéticos ---------------- */

export type Lecap = {
  symbol: string;
  px: number;
  varPct: number | null;
  dias: number | null;
  venc: number | null;
};

export type LecapsData = { lecaps: Lecap[]; meta: Meta };

export const getLecaps = cache(async (): Promise<LecapsData> => {
  const notes = await getNotes();
  const now = Date.now();

  const lecaps: Lecap[] = (notes ?? [])
    .filter((n) => /^S\d/.test(n.symbol) && !n.symbol.endsWith("D"))
    .map((n) => {
      const px = n.c ?? (n.px_bid !== null && n.px_ask !== null ? (n.px_bid + n.px_ask) / 2 : null);
      if (px === null || px <= 0) return null;
      const venc = vencFromTicker(n.symbol);
      const dias = venc ? Math.max(0, Math.round((venc - now) / 86400000)) : null;
      return { symbol: n.symbol, px, varPct: n.pct_change, dias, venc };
    })
    .filter((x): x is Lecap => x !== null)
    .sort((a, b) => (a.venc ?? 1e15) - (b.venc ?? 1e15));

  return {
    lecaps,
    meta: {
      source: "Mercado de deuda local",
      updatedAt: now,
      // parcial: TIR/sintético pendiente ("pago final por letra") — backlog C13
      // (PLAN_BACKLOG.md P9), NO es alcance de este lote.
      status: notes ? "parcial" : "parcial",
      problemas: notes ? ["TIR y sintético pendientes (falta pago final por letra)"] : ["data912 caído"],
    },
  };
});
