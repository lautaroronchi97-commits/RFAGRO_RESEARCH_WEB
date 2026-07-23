import "server-only";
import { cache } from "react";
import { sbSelect } from "./supabase";
import { getVencimientos } from "./vencimientos";
import type { Meta } from "./market";
import type { GranoCurva } from "./curva-types";
import { vencKeyDePosicion, vtoDePosicion, hoyVencKey } from "./dates";

/**
 * Curva de futuros de granos (último cierre por posición), para autocompletar
 * las calculadoras con precios reales de A3. Lee la vista `futuros_cierres_ultimo`.
 * Mantiene la misma lógica que `futuros.ts`: descarta posiciones ya vencidas
 * (la vista trae el último cierre de CADA símbolo histórico, incluidas las muertas).
 * El vto autocompletado es el REAL de la tabla `vencimientos` (mismo dato que el
 * panel Arbitrajes — decisión de Lautaro, auditoría E2 21/07/2026); si falta,
 * degrada al último día del mes de la posición.
 */

export type { PosCurva, GranoCurva } from "./curva-types";
export type CurvaData = { granos: GranoCurva[]; meta: Meta };

const NOMBRES: Record<string, string> = { SOJ: "Soja", MAI: "Maíz", TRI: "Trigo" };
const vencKey = vencKeyDePosicion;

type RawRow = { symbol: string; underlying: string | null; posicion: string | null; settlement: number | null };

export const getCurvaGranos = cache(async (): Promise<CurvaData> => {
  const [res, vencs] = await Promise.all([
    sbSelect(
      "futuros_cierres_ultimo?select=symbol,underlying,posicion,settlement&order=underlying.asc",
      900,
    ),
    getVencimientos(),
  ]);
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
    const vto = vencs.get(r.symbol) ?? vtoDePosicion(r.posicion);
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
