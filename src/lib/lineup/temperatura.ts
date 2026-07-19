import "server-only";
import { cache } from "react";
import { sbSelectAll } from "../supabase";
import type { Meta } from "../market";
import {
  PRODUCTOS_MESA,
  PRODUCTO_DISPLAY_MESA,
  CODIGOS_CRUSH,
  W_GAP,
  W_LINEUP,
  W_FARMER,
  K_MOMENTUM_DIAS,
  clasificarBanda,
  clasificarDireccion,
  accionSugerida,
  equivalentePoroto,
  indiceCalor,
  type Banda,
  type Direccion,
} from "./mesa_calor";
import { percentilEstacional, type SerieRow } from "./estacional";
import { parseFechaUTC } from "./campanas";

/**
 * temperatura.ts — Orquestación del índice de calor de mercadería (página /comercio/temperatura).
 * Lee las series históricas de las 2 patas de DEMANDA (gap de cobertura C1 = lineup_gap_hist, densidad
 * de line-up C2 = lineup_densidad_hist), calcula el percentil estacional de HOY por producto
 * (estacional.ts) y lo combina en el índice 0-100 + banda + momentum + acción (mesa_calor.ts).
 *
 * La pata de OFERTA (farmer selling C3) = avance de ventas del productor (matview compras_avance_hist:
 * comprado acumulado SUMANDO sectores / producción estimada USDA), percentil estacional. Si un producto
 * no junta ≥2 campañas de historia, degrada solo y renormaliza los pesos sobre las patas presentes —
 * exactamente como mesa_calor.indice_calor.
 */

const SOURCE = "ISA Agents · SAGyP";
const REVALIDATE = 900; // 15 min

const DIA_MS = 86_400_000;

type GapRow = {
  fecha: string;
  cod: string;
  declarado_tn: number | null;
  originado_tn: number | null;
  gap_tn: number | null;
};
type DensRow = { fecha: string; cod: string; densidad_tn: number | null };
type AvanceRow = { fecha: string; cod: string; avance: number | null };

type Punto = { fecha: Date; valor: number };

export type ProductoCalor = {
  cod: string;
  display: string;
  calor: number | null;
  banda: Banda;
  pctlGap: number | null;
  pctlDensidad: number | null;
  pctlFarmer: number | null;
  gapHoy: number | null;
  densidadHoy: number | null;
  deltaGap: number | null;
  direccion: Direccion;
  accion: string;
  explicacion: string;
  fecha: string | null;
};

export type TemperaturaData = {
  fecha: string | null;
  productos: ProductoCalor[];
  farmerDisponible: boolean;
  pesos: { gap: number; lineup: number; farmer: number };
  meta: Meta;
};

const vacia = (problema: string): TemperaturaData => ({
  fecha: null,
  productos: [],
  farmerDisponible: false,
  pesos: { gap: W_GAP, lineup: W_LINEUP, farmer: W_FARMER },
  meta: { source: SOURCE, updatedAt: null, status: "parcial", problemas: [problema] },
});

/** Última observación de una serie ordenada asc. por fecha (valor en la fecha máxima). */
function ultimo(serie: Punto[]): Punto | null {
  return serie.length ? serie[serie.length - 1] : null;
}

/** Valor del punto con la mayor fecha ≤ objetivo (la foto "de hace K días"). */
function valorAntesDe(serie: Punto[], objetivo: Date): number | null {
  let mejor: Punto | null = null;
  for (const p of serie) {
    if (p.fecha.getTime() <= objetivo.getTime()) mejor = p;
    else break; // serie ordenada asc.
  }
  return mejor ? mejor.valor : null;
}

/** Convierte una serie de puntos al esquema SerieRow (con el cod para el percentil). */
function comoSerieRow(serie: Punto[], cod: string): SerieRow[] {
  return serie.map((p) => ({ fecha: p.fecha, cod, valor: p.valor }));
}

export const getTemperatura = cache(async (): Promise<TemperaturaData> => {
  const [gapRes, densRes, avanceRes] = await Promise.all([
    sbSelectAll("lineup_gap_hist?select=fecha,cod,declarado_tn,originado_tn,gap_tn", REVALIDATE),
    sbSelectAll("lineup_densidad_hist?select=fecha,cod,densidad_tn", REVALIDATE),
    sbSelectAll("compras_avance_hist?select=fecha,cod,avance", REVALIDATE),
  ]);
  // gap y densidad son obligatorias; el avance (farmer) es opcional → si falla, el índice degrada.
  if (!gapRes.ok || !densRes.ok) {
    const unconf = gapRes.ok ? densRes : gapRes;
    return vacia(
      "reason" in unconf && unconf.reason === "unconfigured"
        ? "Supabase sin configurar"
        : "Series de temperatura no disponibles",
    );
  }
  const gap = gapRes.data as GapRow[];
  const dens = densRes.data as DensRow[];
  if (gap.length === 0 && dens.length === 0) return vacia("Sin historia de line-up/DJVE");

  // --- Series por cod (ordenadas asc. por fecha) ---
  const gapPorCod = new Map<string, Punto[]>();
  const declPorCod = new Map<string, Map<number, number>>(); // cod → (fechaMs → declarado) para el crush
  const origPorCod = new Map<string, Map<number, number>>();
  for (const r of gap) {
    const f = parseFechaUTC(r.fecha);
    if (!f) continue;
    if (r.gap_tn != null) {
      if (!gapPorCod.has(r.cod)) gapPorCod.set(r.cod, []);
      gapPorCod.get(r.cod)!.push({ fecha: f, valor: Number(r.gap_tn) });
    }
    if (!declPorCod.has(r.cod)) declPorCod.set(r.cod, new Map());
    if (!origPorCod.has(r.cod)) origPorCod.set(r.cod, new Map());
    declPorCod.get(r.cod)!.set(f.getTime(), Number(r.declarado_tn ?? 0));
    origPorCod.get(r.cod)!.set(f.getTime(), Number(r.originado_tn ?? 0));
  }
  const densPorCod = new Map<string, Punto[]>();
  const densPorCodMs = new Map<string, Map<number, number>>();
  for (const r of dens) {
    const f = parseFechaUTC(r.fecha);
    if (!f || r.densidad_tn == null) continue;
    if (!densPorCod.has(r.cod)) densPorCod.set(r.cod, []);
    densPorCod.get(r.cod)!.push({ fecha: f, valor: Number(r.densidad_tn) });
    if (!densPorCodMs.has(r.cod)) densPorCodMs.set(r.cod, new Map());
    densPorCodMs.get(r.cod)!.set(f.getTime(), Number(r.densidad_tn));
  }
  const ordenar = (m: Map<string, Punto[]>) => {
    for (const arr of m.values()) arr.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  };
  ordenar(gapPorCod);
  ordenar(densPorCod);

  // --- Series sintéticas de SOJA_CRUSH (SBM+SBO en equivalente poroto) ---
  const [cH, cA] = CODIGOS_CRUSH; // SBM, SBO
  const fechasCrush = new Set<number>();
  for (const ms of declPorCod.get(cH)?.keys() ?? []) fechasCrush.add(ms);
  for (const ms of declPorCod.get(cA)?.keys() ?? []) fechasCrush.add(ms);
  const gapCrush: Punto[] = [];
  const densCrush: Punto[] = [];
  for (const ms of [...fechasCrush].sort((a, b) => a - b)) {
    const declCrush = equivalentePoroto(declPorCod.get(cH)?.get(ms) ?? 0, declPorCod.get(cA)?.get(ms) ?? 0);
    const origCrush = equivalentePoroto(origPorCod.get(cH)?.get(ms) ?? 0, origPorCod.get(cA)?.get(ms) ?? 0);
    gapCrush.push({ fecha: new Date(ms), valor: declCrush - origCrush });
    const dCrush = equivalentePoroto(densPorCodMs.get(cH)?.get(ms) ?? 0, densPorCodMs.get(cA)?.get(ms) ?? 0);
    densCrush.push({ fecha: new Date(ms), valor: dCrush });
  }
  gapPorCod.set("SOJA_CRUSH", gapCrush);
  densPorCod.set("SOJA_CRUSH", densCrush);

  // --- Serie de avance de ventas (pata farmer selling C3) desde compras_avance_hist ---
  const avancePorCod = new Map<string, Punto[]>();
  if (avanceRes.ok) {
    for (const r of avanceRes.data as AvanceRow[]) {
      const f = parseFechaUTC(r.fecha);
      if (!f || r.avance == null) continue;
      if (!avancePorCod.has(r.cod)) avancePorCod.set(r.cod, []);
      avancePorCod.get(r.cod)!.push({ fecha: f, valor: Number(r.avance) });
    }
    ordenar(avancePorCod);
  }
  // SOJA_CRUSH comparte la oferta de poroto con SBS (mismo grano que vendió el productor).
  if (avancePorCod.has("SBS")) avancePorCod.set("SOJA_CRUSH", avancePorCod.get("SBS")!);

  // Fecha global = último snapshot con datos.
  let fechaGlobal: Date | null = null;
  for (const arr of gapPorCod.values()) {
    const u = ultimo(arr);
    if (u && (!fechaGlobal || u.fecha > fechaGlobal)) fechaGlobal = u.fecha;
  }

  const productos: ProductoCalor[] = PRODUCTOS_MESA.map((cod) => {
    const gSerie = gapPorCod.get(cod) ?? [];
    const dSerie = densPorCod.get(cod) ?? [];
    const gU = ultimo(gSerie);
    const dU = ultimo(dSerie);
    // "Hoy" del producto = la fecha más reciente entre sus dos series.
    const hoy =
      gU && dU ? (gU.fecha > dU.fecha ? gU.fecha : dU.fecha) : (gU?.fecha ?? dU?.fecha ?? null);
    const gapHoy = gU?.valor ?? null;
    const densHoy = dU?.valor ?? null;

    let pctlGap: number | null = null;
    let pctlDens: number | null = null;
    let deltaGap: number | null = null;
    if (hoy) {
      pctlGap = percentilEstacional(comoSerieRow(gSerie, cod), cod, hoy, gapHoy);
      pctlDens = percentilEstacional(comoSerieRow(dSerie, cod), cod, hoy, densHoy);
      // Momentum: gap hoy vs gap ~K días atrás (snapshot ≤ hoy−K).
      const gapPast = valorAntesDe(gSerie, new Date(hoy.getTime() - K_MOMENTUM_DIAS * DIA_MS));
      if (gapHoy != null && gapPast != null) deltaGap = gapHoy - gapPast;
    }
    // Farmer selling (C3): percentil estacional del avance de ventas, en la fecha propia de compras
    // (semanal, puede ir unos días detrás del line-up). Menos avance del normal = más calor (se invierte
    // dentro de indiceCalor). Degrada a null si el producto no junta ≥2 campañas de historia.
    let pctlFarmer: number | null = null;
    const aSerie = avancePorCod.get(cod) ?? [];
    const aU = ultimo(aSerie);
    if (aU) pctlFarmer = percentilEstacional(comoSerieRow(aSerie, cod), cod, aU.fecha, aU.valor);
    const calor = indiceCalor(pctlGap, pctlDens, pctlFarmer);
    const banda = clasificarBanda(calor);
    const direccion = clasificarDireccion(deltaGap);
    const [accion, explicacion] = accionSugerida(banda, direccion);

    return {
      cod,
      display: PRODUCTO_DISPLAY_MESA[cod] ?? cod,
      calor: calor == null ? null : Math.round(calor * 10) / 10,
      banda,
      pctlGap: pctlGap == null ? null : Math.round(pctlGap),
      pctlDensidad: pctlDens == null ? null : Math.round(pctlDens),
      pctlFarmer: pctlFarmer == null ? null : Math.round(pctlFarmer),
      gapHoy,
      densidadHoy: densHoy,
      deltaGap,
      direccion,
      accion,
      explicacion,
      fecha: hoy ? hoy.toISOString().slice(0, 10) : null,
    };
  });

  const farmerDisponible = productos.some((p) => p.pctlFarmer != null);
  const problemas = farmerDisponible
    ? []
    : ["Farmer selling (oferta) sin historia aún — índice sobre las 2 patas de demanda"];
  return {
    fecha: fechaGlobal ? fechaGlobal.toISOString().slice(0, 10) : null,
    productos,
    farmerDisponible,
    pesos: { gap: W_GAP, lineup: W_LINEUP, farmer: W_FARMER },
    meta: { source: SOURCE, updatedAt: null, status: "real", problemas },
  };
});
