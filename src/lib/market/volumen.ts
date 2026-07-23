import "server-only";
import { cache } from "react";
import type { Meta } from "./types";
import { fetchJson, asArr, asObj, asNum, asStr } from "./http";
import { getMaeOficial } from "./fuentes";

/* ---------------- Módulo 7: Panel cambiario / volumen (MAE) ---------------- */

export type VolCat = { nombre: string; grupo: string; volumenUsd: number; share: number };

export type VolumenData = {
  cats: VolCat[];
  oficial: number | null;
  oficialVarPct: number | null;
  meta: Meta;
};

export const getVolumenCambiario = cache(async (): Promise<VolumenData> => {
  const [r, mae] = await Promise.all([
    fetchJson("https://api.marketdata.mae.com.ar/api/mercado/volumen-categoria/USD"),
    getMaeOficial(),
  ]);

  const problemas: string[] = [];
  const cats: VolCat[] = [];
  if (r.ok) {
    const arr = asArr(r.data) ?? [];
    for (const it of arr) {
      const o = asObj(it);
      if (!o) continue;
      const nombre = asStr(o.nombre);
      const grupo = asStr(o.grupo);
      const volumen = asNum(o.volumen);
      const share = asNum(o.share);
      if (nombre && grupo && volumen !== null && share !== null) {
        cats.push({ nombre, grupo, volumenUsd: volumen, share });
      }
    }
  }
  if (cats.length === 0) problemas.push("MAE volumen caído");
  if (mae.valor === null) problemas.push("oficial MAE caído");

  return {
    cats,
    oficial: mae.valor,
    oficialVarPct: mae.varPct,
    meta: {
      source: "MAE",
      updatedAt: Date.now(),
      status: cats.length > 0 ? "real" : "parcial",
      problemas,
    },
  };
});
