import "server-only";
import { cache } from "react";
import { getPizarra } from "../pizarra";
import type { Meta } from "./types";
import { getDolarApi, getCriptoya, getMaeResumen, getMaeOficial, type MaeResumenRow } from "./fuentes";
import { parseDdf } from "./tickers";

/* ---------------- Módulo 0: Cinta ---------------- */

export type CintaItem = {
  label: string;
  value: number | null;
  decimals: number;
  change: number | null; // variación diaria en %
  source: string;
  sample?: boolean; // true = dato de ejemplo (sin fuente automatizada aún)
};

export type CintaData = { items: CintaItem[]; meta: Meta };

export const getCintaData = cache(async (): Promise<CintaData> => {
  const [dolar, cripto, ddf, mae, pizarra] = await Promise.all([
    getDolarApi(),
    getCriptoya(),
    getMaeResumen("DDF"),
    getMaeOficial(),
    getPizarra(),
  ]);

  const problemas: string[] = [];
  if (!cripto) problemas.push("criptoya caído (oficial)");
  if (!dolar) problemas.push("dolarapi caído (MEP/CCL)");
  if (mae.valor === null) problemas.push("MAE caído (mayorista)");
  if (!ddf) problemas.push("MAE caído (dólar futuro)");
  if (Object.keys(pizarra.granos).length < 3) problemas.push("CAC caído (pizarra)");

  const byCasa = (casa: string) => dolar?.find((d) => d.casa === casa) ?? null;

  // Posición de dólar futuro más cercana (a hoy) del resumen DDF
  const now = Date.now();
  const fut = (ddf ?? [])
    .map((r) => ({ row: r, p: parseDdf(r.ticker) }))
    .filter((x): x is { row: MaeResumenRow; p: { label: string; venc: Date } } => x.p !== null)
    .filter((x) => x.p.venc.getTime() >= now - 40 * 86400000)
    .sort((a, b) => a.p.venc.getTime() - b.p.venc.getTime())[0];

  const items: CintaItem[] = [
    {
      label: "Oficial",
      value: cripto?.oficial?.price ?? null,
      decimals: 2,
      change: cripto?.oficial?.variation ?? null,
      source: "Mercado de cambios",
    },
    {
      label: "Mayorista",
      value: mae.valor,
      decimals: 2,
      change: mae.varPct,
      source: "MAE",
    },
    { label: "MEP", value: byCasa("bolsa")?.venta ?? null, decimals: 2, change: null, source: "Mercado de cambios" },
    { label: "CCL", value: byCasa("contadoconliqui")?.venta ?? null, decimals: 2, change: null, source: "Mercado de cambios" },
    {
      label: fut ? `Fut ${fut.p.label}` : "Dólar futuro",
      value: fut?.row.ultimo ?? null,
      decimals: 2,
      change: fut?.row.variacion ?? null,
      source: "MAE",
    },
    // Pizarra (disponible) USD de CAC-BCR, ya real (`pizarra.ts`). Sin variación diaria
    // disponible en la fuente → change null (E3 H4). Degrada a "—" si CAC no responde.
    { label: "Soja pizarra USD", value: pizarra.granos.SOJ?.usd ?? null, decimals: 1, change: null, source: "Bolsa de Comercio de Rosario" },
    { label: "Maíz pizarra USD", value: pizarra.granos.MAI?.usd ?? null, decimals: 1, change: null, source: "Bolsa de Comercio de Rosario" },
    { label: "Trigo pizarra USD", value: pizarra.granos.TRI?.usd ?? null, decimals: 1, change: null, source: "Bolsa de Comercio de Rosario" },
  ];

  return {
    items,
    meta: {
      source: "Mercado de cambios",
      updatedAt: Date.now(),
      status: problemas.length === 0 ? "real" : "parcial",
      problemas,
    },
  };
});
