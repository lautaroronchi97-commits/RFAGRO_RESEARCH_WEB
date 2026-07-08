import "server-only";
import { cache } from "react";
import { sbSelect } from "./supabase";
import type { Meta } from "./market";

/**
 * Cierres de futuros de granos (A3/Matba ROFEX), leídos de Supabase
 * (vista `futuros_cierres_ultimo`: último cierre por posición). Fuente original: CEM.
 */

export type CierrePos = {
  symbol: string;
  posicion: string;
  settlement: number | null;
  close: number | null;
  changePercent: number | null;
  volume: number | null;
  openInterest: number | null;
  oiChange: number | null;
  impliedRate: number | null;
  venc: number; // clave de orden por vencimiento (aaaamm; 0 = disponible)
};

export type GranoCierres = {
  underlying: string;
  nombre: string;
  fecha: string | null;
  posiciones: CierrePos[];
};

export type CierresData = { granos: GranoCierres[]; meta: Meta };

type RawRow = {
  symbol: string;
  fecha: string | null;
  underlying: string | null;
  posicion: string | null;
  settlement: number | null;
  close: number | null;
  change_percent: number | null;
  volume: number | null;
  open_interest: number | null;
  oi_change: number | null;
  implied_rate: number | null;
};

const NOMBRES: Record<string, string> = { SOJ: "Soja", MAI: "Maíz", TRI: "Trigo" };
const MESES: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

/** JUL26 → 202607 ; DISPO/DIS24 → 0 (disponible primero). */
function vencKey(posicion: string | null): number {
  if (!posicion) return 0;
  const m = posicion.toUpperCase().match(/^([A-Z]{3})(\d{2})$/);
  if (!m) return 0; // DISPO u otros
  const mes = MESES[m[1]] ?? 0;
  const anio = 2000 + Number(m[2]);
  return anio * 100 + mes;
}

const SOURCE = "CEM · Matba ROFEX";

export const getCierresGranos = cache(async (): Promise<CierresData> => {
  const res = await sbSelect(
    "futuros_cierres_ultimo?select=symbol,fecha,underlying,posicion,settlement,close,change_percent,volume,open_interest,oi_change,implied_rate&order=underlying.asc",
    900,
  );

  if (!res.ok) {
    const problema =
      res.reason === "unconfigured"
        ? "Supabase sin configurar"
        : "Fuente de cierres caída (aún sin datos ingeridos)";
    return { granos: [], meta: { source: SOURCE, updatedAt: null, status: "parcial", problemas: [problema] } };
  }

  const raw = (Array.isArray(res.data) ? res.data : []) as RawRow[];
  const byGrano = new Map<string, GranoCierres>();

  for (const r of raw) {
    const u = r.underlying;
    if (!u || !NOMBRES[u]) continue; // solo soja/maíz/trigo
    let g = byGrano.get(u);
    if (!g) {
      g = { underlying: u, nombre: NOMBRES[u], fecha: r.fecha, posiciones: [] };
      byGrano.set(u, g);
    }
    if (r.fecha && (!g.fecha || r.fecha > g.fecha)) g.fecha = r.fecha;
    g.posiciones.push({
      symbol: r.symbol,
      posicion: r.posicion ?? r.symbol,
      settlement: r.settlement,
      close: r.close,
      changePercent: r.change_percent,
      volume: r.volume,
      openInterest: r.open_interest,
      oiChange: r.oi_change,
      impliedRate: r.implied_rate,
      venc: vencKey(r.posicion),
    });
  }

  const orden = ["SOJ", "MAI", "TRI"];
  const granos = [...byGrano.values()]
    .sort((a, b) => orden.indexOf(a.underlying) - orden.indexOf(b.underlying))
    .map((g) => ({ ...g, posiciones: g.posiciones.sort((a, b) => a.venc - b.venc) }));

  const fechas = granos.map((g) => g.fecha).filter(Boolean) as string[];
  const ultima = fechas.sort().at(-1) ?? null;
  const updatedAt = ultima ? Date.parse(`${ultima}T00:00:00-03:00`) : null;

  return {
    granos,
    meta: {
      source: SOURCE,
      updatedAt: Number.isNaN(updatedAt) ? null : updatedAt,
      status: granos.length > 0 ? "real" : "parcial",
      problemas: granos.length > 0 ? [] : ["Sin cierres cargados todavía"],
    },
  };
});
