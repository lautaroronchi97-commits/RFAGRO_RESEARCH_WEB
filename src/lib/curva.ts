import "server-only";
import { cache } from "react";
import { sbSelect } from "./supabase";
import type { Meta } from "./market";
import type { GranoCurva } from "./curva-types";

/**
 * Curva de futuros de granos (último cierre por posición), para autocompletar
 * las calculadoras con precios reales de A3. Lee la vista `futuros_cierres_ultimo`.
 * Mantiene la misma lógica que `futuros.ts`: descarta posiciones ya vencidas
 * (la vista trae el último cierre de CADA símbolo histórico, incluidas las muertas).
 */

export type { PosCurva, GranoCurva } from "./curva-types";
export type CurvaData = { granos: GranoCurva[]; meta: Meta };

const NOMBRES: Record<string, string> = { SOJ: "Soja", MAI: "Maíz", TRI: "Trigo" };
const MESES: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

/** "JUL26" → "2026-07-31" (último día del mes; suficiente para estimar el plazo). */
function vtoDePosicion(posicion: string): string {
  const m = (posicion || "").toUpperCase().match(/^([A-Z]{3})(\d{2})$/);
  if (!m) return "";
  const mes = MESES[m[1]] ?? 0;
  const anio = 2000 + Number(m[2]);
  if (!mes) return "";
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate(); // día 0 del mes siguiente = último del actual
  return `${anio}-${String(mes).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`;
}

/** "JUL26" → 202607 (para ordenar y filtrar vivas). 0 si no matchea. */
function vencKey(posicion: string): number {
  const m = (posicion || "").toUpperCase().match(/^([A-Z]{3})(\d{2})$/);
  if (!m) return 0;
  return (2000 + Number(m[2])) * 100 + (MESES[m[1]] ?? 0);
}

/** Año-mes actual en zona Córdoba como clave aaaamm (para descartar posiciones muertas). */
function hoyVencKey(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const anio = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const mes = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  return anio * 100 + mes;
}

type RawRow = { symbol: string; underlying: string | null; posicion: string | null; settlement: number | null };

export const getCurvaGranos = cache(async (): Promise<CurvaData> => {
  const res = await sbSelect(
    "futuros_cierres_ultimo?select=symbol,underlying,posicion,settlement&order=underlying.asc",
    900,
  );
  if (!res.ok) {
    return { granos: [], meta: { source: "Matba Rofex", updatedAt: null, status: "parcial", problemas: ["Sin curva A3 cargada"] } };
  }
  const raw = (Array.isArray(res.data) ? res.data : []) as RawRow[];
  const hoyYM = hoyVencKey();
  const byGrano = new Map<string, GranoCurva>();
  for (const r of raw) {
    const u = r.underlying;
    if (!u || !NOMBRES[u] || r.settlement == null || !r.posicion) continue;
    const vk = vencKey(r.posicion);
    if (vk === 0 || vk < hoyYM) continue; // solo posiciones vivas (mes actual o futuro)
    const vto = vtoDePosicion(r.posicion);
    if (!vto) continue;
    let g = byGrano.get(u);
    if (!g) { g = { underlying: u, nombre: NOMBRES[u], posiciones: [] }; byGrano.set(u, g); }
    g.posiciones.push({ symbol: r.symbol, posicion: r.posicion, precio: r.settlement, vto });
  }
  const orden = ["SOJ", "MAI", "TRI"];
  const granos = [...byGrano.values()]
    .sort((a, b) => orden.indexOf(a.underlying) - orden.indexOf(b.underlying))
    .map((g) => ({ ...g, posiciones: g.posiciones.sort((a, b) => vencKey(a.posicion) - vencKey(b.posicion)) }))
    .filter((g) => g.posiciones.length > 0);

  return {
    granos,
    meta: {
      source: "Matba Rofex",
      updatedAt: Date.now(),
      status: granos.length > 0 ? "real" : "parcial",
      problemas: granos.length > 0 ? [] : ["Sin curva A3 cargada todavía"],
    },
  };
});
