import "server-only";
import { cache } from "react";
import { getPizarra } from "./pizarra";
import type { Meta } from "./market";

/**
 * Capacidad de pago (FAS Teórico) de granos, desde BCR. Es el precio teórico que
 * el exportador puede pagar por la mercadería: FOB − retenciones − gastos.
 *
 * Fuente: BCR "Precios FOB/FAS Argentina"
 *   https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-1
 * (planilla `#sheet`, fila "FAS Teórico en u$s" por grano). Los valores van en
 * orden de puerto (SAGyP, Up River, …); se toma el SEGUNDO = **Up River (Rosario)**,
 * la referencia del Gran Rosario. Si solo hay uno, cae a ese. Parser verificado
 * contra el HTML real.
 *
 * Es la BASE de BCR; el modelo propio de Lautaro se pisa con `CAPACIDAD_OVERRIDE`
 * (JSON `{"SOJ":320,"MAI":175,"TRI":200}`). Se muestra la pizarra CAC al lado
 * como contexto de mercado (no se calcula ninguna brecha, para no confundir).
 */

const URL_BCR =
  "https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-1";
const SOURCE = "Bolsa de Comercio de Rosario";
const NOMBRES: Record<string, string> = { SOJ: "Soja", MAI: "Maíz", TRI: "Trigo" };
const GRANOS: Record<string, string> = { Trigo: "TRI", Maíz: "MAI", Maiz: "MAI", Soja: "SOJ" };

export type CapGrano = {
  underlying: string;
  nombre: string;
  fas: number | null; // FAS teórico USD/tn (capacidad de pago)
  pizarra: number | null; // disponible USD (CAC), como contexto
};
export type CapData = { granos: CapGrano[]; fecha: string | null; meta: Meta };

function arNum(s: string): number | null {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function overrides(): Record<string, number> {
  try {
    const o = JSON.parse(process.env.CAPACIDAD_OVERRIDE ?? "{}");
    return o && typeof o === "object" ? (o as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** Extrae el FAS teórico Up River (2º valor de la fila; el 1º es SAGyP) por grano + fecha de la planilla. */
function parseFas(html: string): { fas: Record<string, number>; fecha: string | null } {
  const i = html.indexOf("sheet-wrapper");
  if (i < 0) return { fas: {}, fecha: null };
  let seg = html.slice(i, i + 60_000).replace(/<style>[\s\S]*?<\/style>/g, " ");
  const cut = seg.indexOf("Industria Aceitera"); // corta antes del complejo aceitero
  if (cut > 0) seg = seg.slice(0, cut);

  const fm = seg.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const fecha = fm ? `${fm[3]}-${fm[2]}-${fm[1]}` : null;

  const fas: Record<string, number> = {};
  let cur: string | null = null;
  for (const rowHtml of seg.split(/<\/tr>/)) {
    const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim())
      .filter(Boolean);
    if (cells.length === 0) continue;
    const head = cells[0];
    if (head.startsWith("Commodity")) {
      cur = null;
      for (const c of cells.slice(1)) {
        const key = c.split("/")[0].trim();
        if (GRANOS[key]) {
          cur = GRANOS[key];
          break;
        }
      }
    } else if (head.startsWith("FAS Teórico") && cur && !(cur in fas)) {
      const nums: number[] = [];
      for (const c of cells.slice(1)) {
        const v = arNum(c);
        // null solo si la celda no parsea; el 0 se conserva para no correr el índice de columnas.
        if (v != null && Number.isFinite(v)) nums.push(v);
      }
      // El orden de columnas es SAGyP, Up River, …: el 2º = Up River (Rosario).
      const val = nums.length >= 2 ? nums[1] : nums[0];
      if (val != null && Number.isFinite(val)) fas[cur] = val;
    }
  }
  return { fas, fecha };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const getCapacidad = cache(async (): Promise<CapData> => {
  const ov = overrides();
  let html = "";
  let caida = false;
  try {
    const res = await fetch(URL_BCR, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "Mozilla/5.0 (RFAGRO research)" },
    });
    if (res.ok) html = await res.text();
    else caida = true;
  } catch {
    caida = true;
  }

  const { fas, fecha } = parseFas(html);
  const pizarra = await getPizarra();

  const granos: CapGrano[] = (["SOJ", "MAI", "TRI"] as const)
    .map((u) => {
      const ovVal = ov[u];
      const fasVal = ovVal != null && Number.isFinite(ovVal) ? round2(ovVal) : (fas[u] ?? null);
      const pz = pizarra.granos[u]?.usd ?? null;
      return { underlying: u, nombre: NOMBRES[u], fas: fasVal, pizarra: pz };
    })
    .filter((g) => g.fas != null || g.pizarra != null);

  const n = granos.filter((g) => g.fas != null).length;
  const problemas: string[] = [];
  if (caida) problemas.push("BCR no respondió");
  else if (n < 3) problemas.push("BCR: faltan granos en el FAS teórico");

  const updatedAtRaw = fecha ? Date.parse(`${fecha}T00:00:00-03:00`) : null;
  const updatedAt = updatedAtRaw !== null && !Number.isNaN(updatedAtRaw) ? updatedAtRaw : null;

  return {
    granos,
    fecha,
    meta: {
      source: SOURCE,
      updatedAt,
      status: n === 3 && !caida ? "real" : n > 0 ? "parcial" : "parcial",
      problemas,
    },
  };
});
