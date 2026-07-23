import "server-only";
import { cache } from "react";
import { sbSelect, sbSelectAll, type SbResult } from "./supabase";
import { fuenteDeId, type Fuente, type SerieCat, type SeriePuntos } from "./series-types";

/**
 * Capa de datos del panel de gráficos (/graficos). Sirve:
 *  - `getCatalogo()`: la vista `series_catalogo` (≈351 filas < 1.000 → 1 request).
 *  - `fetchSerie()`: los puntos crudos de UNA serie por su serieId. Futuros A3/CBOT
 *    = 1 request por símbolo (máx ~325 filas). Pizarra = serie continua (~1.580
 *    filas por grano) → `sbSelectAll` (pagina; esquiva el truncado de 1.000).
 * Todas las fórmulas derivadas (spread, ratio, base) se calculan client-side en
 * `derivadas.ts` — acá solo se entregan series crudas fechadas.
 */

const CAT_REVALIDATE = 3600;
const SERIE_REVALIDATE = 3600;

export type Unit = "usd" | "ars";

/* ---------------- Catálogo ---------------- */

export const getCatalogo = cache(async (): Promise<SerieCat[]> => {
  const res = await sbSelect(
    "series_catalogo?select=fuente,serie_id,raiz,grano,posicion,desde,hasta,ruedas,vol_total,vencimiento,venc_estimado" +
      "&order=fuente.asc,grano.asc,posicion.asc",
    CAT_REVALIDATE,
  );
  if (!res.ok || !Array.isArray(res.data)) return [];
  return (res.data as Record<string, unknown>[]).map((r) => ({
    fuente: r.fuente as Fuente,
    serieId: String(r.serie_id),
    raiz: r.raiz != null ? String(r.raiz) : null,
    grano: String(r.grano),
    posicion: r.posicion != null ? String(r.posicion) : null,
    desde: String(r.desde),
    hasta: String(r.hasta),
    ruedas: Number(r.ruedas) || 0,
    volTotal: r.vol_total != null ? Number(r.vol_total) : null,
    vencimiento: r.vencimiento != null ? String(r.vencimiento) : null,
    vencEstimado: Boolean(r.venc_estimado),
  }));
});

/* ---------------- Puntos de una serie ---------------- */

/** Valor de una fila numérico y finito, o null. */
function num(x: unknown): number | null {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : null;
}

/** Filas PostgREST → SeriePuntos columnar, descartando valores nulos. */
function toSerie(
  id: string,
  fuente: Fuente,
  res: SbResult,
  valCol: string,
  opts?: { estCol?: string; volCol?: string; oiCol?: string },
): SeriePuntos | null {
  if (!res.ok || !Array.isArray(res.data)) return null;
  const d: string[] = [];
  const v: number[] = [];
  const e: boolean[] = [];
  const vol: (number | null)[] = [];
  const oi: (number | null)[] = [];
  for (const row of res.data as Record<string, unknown>[]) {
    const f = row.fecha;
    const val = num(row[valCol]);
    if (typeof f !== "string" || val === null) continue;
    d.push(f);
    v.push(val);
    if (opts?.estCol) e.push(Boolean(row[opts.estCol]));
    if (opts?.volCol) vol.push(num(row[opts.volCol]));
    if (opts?.oiCol) oi.push(num(row[opts.oiCol]));
  }
  if (d.length === 0) return null;
  return {
    id, fuente, d, v,
    ...(opts?.estCol ? { e } : {}),
    ...(opts?.volCol ? { vol } : {}),
    ...(opts?.oiCol ? { oi } : {}),
  };
}

/**
 * Filtro PostgREST del símbolo. Los símbolos A3 traen `/` y `.`; se codifican con
 * encodeURIComponent (el `/` → %2F) SIN comillas: el primer `.` tras `eq` es el
 * separador y el resto es el valor literal (verificado contra PostgREST real —
 * entrecomillar rompe el match).
 */
function symEq(id: string): string {
  return `symbol=eq.${encodeURIComponent(id)}`;
}

export async function fetchSerie(
  id: string,
  from: string,
  to: string,
  unit: Unit,
): Promise<SeriePuntos | null> {
  const fuente = fuenteDeId(id);
  const rango = `&fecha=gte.${from}&fecha=lte.${to}&order=fecha.asc`;

  if (fuente === "a3") {
    const res = await sbSelect(
      `futuros_cierres?select=fecha,settlement,volume,open_interest&${symEq(id)}${rango}`,
      SERIE_REVALIDATE,
    );
    return toSerie(id, fuente, res, "settlement", { volCol: "volume", oiCol: "open_interest" });
  }

  if (fuente === "cbot") {
    const res = await sbSelect(
      `cbot_cierres?select=fecha,settlement_usd_tn,volume,open_interest&${symEq(id)}${rango}`,
      SERIE_REVALIDATE,
    );
    return toSerie(id, fuente, res, "settlement_usd_tn", { volCol: "volume", oiCol: "open_interest" });
  }

  // Pizarra: serie continua → paginar. El valor sale de precio_usd (default) o
  // precio_ars (unit=ars). Se marca es_estimativo por punto (P19). Sin volumen
  // (es una pizarra de referencia, no un contrato operado).
  const grano = id.slice("pizarra:".length);
  const col = unit === "ars" ? "precio_ars" : "precio_usd";
  const res = await sbSelectAll(
    `pizarra_historico?select=fecha,${col},es_estimativo&grano=eq.${encodeURIComponent(grano)}${rango}`,
    SERIE_REVALIDATE,
  );
  return toSerie(id, fuente, res, col, { estCol: "es_estimativo" });
}
