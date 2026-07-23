import "server-only";
import { cache } from "react";
import type { Meta } from "./types";
import { getNotes, getDolarApi, getMaeOficial } from "./fuentes";
import { vencFromTicker } from "./tickers";

/* ---------------- Módulo 4: Dólar linked (data912) ---------------- */

export type DLBono = {
  symbol: string;
  px: number;
  tcImpl: number;
  difMep: number | null;
  spreadOficial: number | null; // Oficial MAE − TC implícito
  varPct: number | null;
  dias: number | null;
  tnaPct: number | null;
  temPct: number | null;
  teaPct: number | null;
};

export type DolarLinkedData = {
  mep: number | null;
  oficial: number | null; // oficial mayorista MAE
  bonos: DLBono[];
  meta: Meta;
};

export const getDolarLinked = cache(async (): Promise<DolarLinkedData> => {
  const [notes, dolar, mae] = await Promise.all([getNotes(), getDolarApi(), getMaeOficial()]);

  const mep = dolar?.find((d) => d.casa === "bolsa")?.venta ?? null;
  const oficial = mae.valor;
  const now = Date.now();

  const problemas: string[] = [];
  if (!notes) problemas.push("data912 caído");
  if (oficial === null) problemas.push("oficial MAE caído (sin tasas)");
  if (mep === null) problemas.push("dolarapi caído (sin dif. MEP)");

  const bonos: DLBono[] = (notes ?? [])
    .filter((n) => /^D\d/.test(n.symbol))
    .map((n) => {
      const px = n.c ?? (n.px_bid !== null && n.px_ask !== null ? (n.px_bid + n.px_ask) / 2 : null);
      if (px === null || px <= 0) return null;
      const tcImpl = px / 100;
      const venc = vencFromTicker(n.symbol);
      const dias = venc ? Math.max(1, Math.round((venc - now) / 86400000)) : null;

      let tnaPct: number | null = null;
      let temPct: number | null = null;
      let teaPct: number | null = null;
      if (oficial && oficial > 0 && dias) {
        const directa = oficial / tcImpl - 1;
        tnaPct = directa * (365 / dias) * 100;
        const tea = Math.pow(oficial / tcImpl, 365 / dias) - 1;
        teaPct = tea * 100;
        temPct = (Math.pow(1 + tea, 1 / 12) - 1) * 100;
      }

      return {
        symbol: n.symbol,
        px,
        tcImpl,
        difMep: mep !== null ? mep - tcImpl : null,
        spreadOficial: oficial !== null ? oficial - tcImpl : null,
        varPct: n.pct_change,
        dias,
        tnaPct,
        temPct,
        teaPct,
      };
    })
    .filter((x): x is DLBono => x !== null)
    .sort((a, b) => (a.dias ?? 1e12) - (b.dias ?? 1e12));

  return {
    mep,
    oficial,
    bonos,
    meta: {
      source: "Mercado de deuda local",
      updatedAt: now,
      status: notes && oficial !== null ? "real" : "parcial",
      problemas,
    },
  };
});
