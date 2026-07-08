import "server-only";
import { cache } from "react";
import { getCierresGranos } from "./futuros";
import type { Meta } from "./market";

/**
 * Pases (spreads de calendario) de futuros de granos, derivados de los cierres
 * reales de Supabase (`futuros_cierres`, fuente CEM · Matba ROFEX).
 *
 * Un "pase" es la diferencia de precio entre dos posiciones consecutivas del
 * mismo grano (vender la cercana / comprar la lejana). Se calcula sobre el
 * ajuste (settlement), el precio de liquidación oficial del día: siempre existe
 * aunque la posición no opere, así que es el más robusto.
 *
 * Columnas y su fórmula (confirmadas en `pases.ts`, hoja PASES del Excel):
 *   - ajuste  = settlement(larga) − settlement(cercana)          [US$]
 *   - directa = settlement(larga) / settlement(cercana) − 1      [% del período]
 *   - ultimo  = close(larga) − close(cercana)                    [US$, si ambas operaron]
 * La TNA del pase (× 365/días) queda pendiente: necesita los días entre
 * vencimientos de cada posición (regla de vto a confirmar con Lautaro).
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export type PaseSpread = {
  label: string; // "JUL26 / DIC26"
  ajuste: number | null; // settlement(larga) − settlement(cercana)
  directa: number | null; // settlement(larga) / settlement(cercana) − 1, en %
  ultimo: number | null; // close(larga) − close(cercana), solo si ambas operaron
};

export type PaseGrano = {
  underlying: string;
  nombre: string;
  fecha: string | null;
  spreads: PaseSpread[];
};

export type PasesData = { granos: PaseGrano[]; meta: Meta };

export const getPases = cache(async (): Promise<PasesData> => {
  const { granos, meta } = await getCierresGranos();

  const out: PaseGrano[] = [];
  for (const g of granos) {
    // Solo futuros con vencimiento (excluye disponible, venc = 0), ya en orden de vto.
    const fut = g.posiciones.filter((p) => p.venc > 0);
    const spreads: PaseSpread[] = [];
    for (let i = 0; i < fut.length - 1; i++) {
      const cercana = fut[i];
      const larga = fut[i + 1];
      if (!cercana || !larga) continue;
      const pc = cercana.settlement;
      const pl = larga.settlement;
      const ajuste = pc != null && pl != null ? round2(pl - pc) : null;
      const directa = pc != null && pc > 0 && pl != null ? round2((pl / pc - 1) * 100) : null;
      const ultimo =
        cercana.close && larga.close && cercana.close > 0 && larga.close > 0
          ? round2(larga.close - cercana.close)
          : null;
      spreads.push({ label: `${cercana.posicion} / ${larga.posicion}`, ajuste, directa, ultimo });
    }
    if (spreads.length > 0) {
      out.push({ underlying: g.underlying, nombre: g.nombre, fecha: g.fecha, spreads });
    }
  }

  const hayDatos = out.length > 0;
  return {
    granos: out,
    meta: {
      source: "CEM · Matba ROFEX (pases)",
      updatedAt: meta.updatedAt,
      status: hayDatos ? "real" : "parcial",
      problemas: hayDatos
        ? []
        : meta.problemas.length
          ? meta.problemas
          : ["Sin cierres para calcular pases"],
    },
  };
});
