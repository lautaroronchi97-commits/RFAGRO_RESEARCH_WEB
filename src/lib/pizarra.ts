import "server-only";
import { cache } from "react";
import type { Meta } from "./market";

/**
 * Pizarra (disponible) de granos en USD, desde CAC-BCR (Cámara Arbitral de
 * Cereales de la BCR). Es el precio de referencia del disponible que se usa
 * como "spot" en los arbitrajes vs los futuros de A3.
 *
 * Fuente: https://www.cac.bcr.com.ar/es/precios-de-pizarra — HTML estático,
 * un bloque `<div class="board board-{grano}">` por grano con `.price` (ARS) y
 * el valor en `US$`. Parser verificado contra el HTML real.
 *
 * Override manual (metodología del proyecto): si `PIZARRA_OVERRIDE` está seteado
 * (JSON `{"SOJ":325.5,"MAI":182,"TRI":197}`), ese valor USD pisa al de CAC. Sirve
 * para cuando Lautaro quiere fijar la referencia o si CAC se cae.
 */

const URL_CAC = "https://www.cac.bcr.com.ar/es/precios-de-pizarra";
const SOURCE = "Bolsa de Comercio de Rosario";
const CLASES: Record<string, string> = { SOJ: "soja", MAI: "maiz", TRI: "trigo" };

export type PizarraGrano = { underlying: string; usd: number; ars: number | null; estimativo: boolean };
export type PizarraData = {
  granos: Record<string, PizarraGrano>;
  fecha: string | null;
  tcBna: number | null;
  meta: Meta;
};

/** "480.500,00" → 480500 ; "325,21" → 325.21 */
function arNum(s: string): number {
  return Number(s.replace(/\./g, "").replace(",", "."));
}

function parseGrano(html: string, cls: string): { usd: number; ars: number; estimativo: boolean } | null {
  // CAC marca la pizarra estimativa (días sin fijación, Dto. 1058/99) con la
  // clase `estimative` en el div del board: `<div class="board board-soja estimative">`.
  // Capturamos el resto de la clase (grupo 1) para detectarlo.
  const re = new RegExp(
    `board-${cls}\\b([^"]*)"[\\s\\S]*?<div class="price">\\s*\\$([\\d.]+,\\d{2})[\\s\\S]*?US\\$<\\/strong>\\s*([\\d.]+,\\d{2})`,
  );
  const m = html.match(re);
  return m ? { estimativo: /\bestimative\b/.test(m[1]), ars: arNum(m[2]), usd: arNum(m[3]) } : null;
}

function overrides(): Record<string, number> {
  try {
    const o = JSON.parse(process.env.PIZARRA_OVERRIDE ?? "{}");
    return o && typeof o === "object" ? (o as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export const getPizarra = cache(async (): Promise<PizarraData> => {
  const ov = overrides();
  let html = "";
  let caida = false;
  try {
    const res = await fetch(URL_CAC, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "Mozilla/5.0 (RFAGRO research)" },
    });
    if (res.ok) html = await res.text();
    else caida = true;
  } catch {
    caida = true;
  }

  const granos: Record<string, PizarraGrano> = {};
  for (const [u, cls] of Object.entries(CLASES)) {
    const p = html ? parseGrano(html, cls) : null;
    const usdOverride = ov[u];
    if (usdOverride != null && Number.isFinite(usdOverride)) {
      // El override manual fija la referencia → deja de ser estimativa.
      granos[u] = { underlying: u, usd: usdOverride, ars: p?.ars ?? null, estimativo: false };
    } else if (p) {
      granos[u] = { underlying: u, usd: p.usd, ars: p.ars, estimativo: p.estimativo };
    }
  }

  const fechaM = html.match(/Comprador\s+(\d{2})\/(\d{2})\/(\d{4})/);
  const fecha = fechaM ? `${fechaM[3]}-${fechaM[2]}-${fechaM[1]}` : null;
  const tcM = html.match(/Comprador\s+\d{2}\/\d{2}\/\d{4}:\s*<strong>\$\s*([\d.]+,\d{2})/);
  const tcBna = tcM ? arNum(tcM[1]) : null;

  const n = Object.keys(granos).length;
  const updatedAtRaw = fecha ? Date.parse(`${fecha}T00:00:00-03:00`) : null;
  const updatedAt = updatedAtRaw !== null && !Number.isNaN(updatedAtRaw) ? updatedAtRaw : null;

  const problemas: string[] = [];
  if (caida) problemas.push("CAC no respondió");
  else if (n < 3) problemas.push("CAC: faltan granos en la pizarra");

  return {
    granos,
    fecha,
    tcBna,
    meta: {
      source: SOURCE,
      updatedAt,
      status: n === 3 && !caida ? "real" : n > 0 ? "parcial" : "parcial",
      problemas,
    },
  };
});
