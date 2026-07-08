import "server-only";
import { cache } from "react";
import { getCierresGranos } from "./futuros";
import { getPizarra } from "./pizarra";
import type { Meta } from "./market";

/**
 * Arbitrajes disponible (pizarra CAC) vs futuro (A3/CEM). Por cada posición viva
 * del grano se compara el ajuste del futuro contra la pizarra USD del disponible.
 *
 * Fórmulas (metodología confirmada, ver docs/CONTEXTO.md):
 *   spread  = ajuste_futuro − pizarra_usd                 [US$]
 *   directa = ajuste_futuro / pizarra_usd − 1             [% del período]
 * La TNA USD (anualizar la directa por los días hasta el vto de cada posición)
 * queda PENDIENTE: falta la regla de vencimiento por posición (a definir Lautaro).
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export type ArbRow = {
  pos: string;
  ajuste: number | null; // settlement del futuro (USD)
  spread: number | null; // ajuste − pizarra
  directa: number | null; // ajuste/pizarra − 1, en %
};

export type ArbGrano = {
  underlying: string;
  nombre: string;
  fecha: string | null;
  pizarraUsd: number | null;
  pizarraArs: number | null;
  rows: ArbRow[];
};

export type ArbData = { granos: ArbGrano[]; pizarraFecha: string | null; meta: Meta };

export const getArbitrajes = cache(async (): Promise<ArbData> => {
  const [cierres, pizarra] = await Promise.all([getCierresGranos(), getPizarra()]);

  const granos: ArbGrano[] = [];
  for (const g of cierres.granos) {
    const pz = pizarra.granos[g.underlying];
    const pizarraUsd = pz?.usd ?? null;
    const fut = g.posiciones.filter((p) => p.venc > 0);
    const rows: ArbRow[] = fut.map((p) => {
      const ajuste = p.settlement;
      const spread = ajuste != null && pizarraUsd != null ? round2(ajuste - pizarraUsd) : null;
      const directa =
        ajuste != null && pizarraUsd != null && pizarraUsd > 0
          ? round2((ajuste / pizarraUsd - 1) * 100)
          : null;
      return { pos: p.posicion, ajuste, spread, directa };
    });
    if (rows.length > 0) {
      granos.push({
        underlying: g.underlying,
        nombre: g.nombre,
        fecha: g.fecha,
        pizarraUsd,
        pizarraArs: pz?.ars ?? null,
        rows,
      });
    }
  }

  const hayCierres = granos.length > 0;
  const hayPizarra = Object.keys(pizarra.granos).length > 0;
  const problemas = [...cierres.meta.problemas, ...pizarra.meta.problemas];
  if (hayCierres && !hayPizarra) problemas.push("Sin pizarra CAC (spreads no disponibles)");
  if (!hayCierres) problemas.push("Sin cierres de A3");

  return {
    granos,
    pizarraFecha: pizarra.fecha,
    meta: {
      source: "A3/CEM + CAC",
      updatedAt: cierres.meta.updatedAt,
      status: hayCierres && hayPizarra ? "real" : "parcial",
      problemas,
    },
  };
});
