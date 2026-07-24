import "server-only";
import { cache } from "react";
import { sbSelectAll } from "../supabase";
import type { Meta } from "../market";
import { PRODUCTOS_NEGOCIADO, DISPLAY_NEGOCIADO } from "./negociado-productos";

export { PRODUCTOS_NEGOCIADO, DISPLAY_NEGOCIADO };

/**
 * negociado.ts — Capa de datos de /comercio/negociado (volumen negociado por producto).
 *
 * Lee la tabla `compras` CRUDA (serie semanal de comercialización, base SIO Granos) SIN
 * filtrar por `fuente`: hoy toda la serie es del export de Agrochat, pero cuando el cron
 * de MAGyP (ingest-compras.mjs) sume semanas nuevas hacia adelante, la página las tiene
 * que mostrar sin tocar código. La matview `compras_avance_hist` (que sí filtra AGROCHAT
 * y limpia el acumulado) se usa SOLO para el % sobre cosecha (producción USDA AR).
 *
 * El dato es SEMANAL (SIO Granos publica el corte semanal, no diario).
 */

const SOURCE = "SIO Granos";
const REVALIDATE = 900; // 15 min

/** Semanas de historia que se mandan al histograma (~30 meses: cubre 52 sem. y 24 meses). */
const SEMANAS_HISTO = 130;

type CompraRow = {
  fecha: string;
  codigo_interno: string;
  campana: string;
  sector: string;
  toneladas: number | null;
  semanal_tn: number | null;
  precio_hecho_tn: number | null;
  fijado_tn: number | null;
  saldo_a_fijar_tn: number | null;
};

type AvanceRow = { cod: string; fecha: string; campana: string; avance: number | null };

/** Una fila por (producto, campaña, sector) en el último dato del producto. */
export type FilaSector = {
  cod: string;
  display: string;
  campana: string;
  sector: string;
  fecha: string; // último dato del producto
  semanal: number | null;
  semanalPrev: number | null; // semana anterior (para el Δ)
  acumulado: number | null; // toneladas (acumulado de campaña, fuente de verdad)
  precioHecho: number | null;
  fijado: number | null;
  saldoAFijar: number | null;
  activa: boolean; // campaña activa del producto (mayor venta semanal)
};

/** Punto del histograma: venta semanal por producto y sector (sumadas las campañas). */
export type PuntoHisto = { fecha: string; cod: string; sector: string; tn: number };

export type NegociadoData = {
  fecha: string | null; // última semana global
  filas: FilaSector[];
  /** "cod|campana" → avance sobre cosecha (0-1, matview con producción USDA AR). */
  avance: Record<string, number>;
  serie: PuntoHisto[];
  totalSemanal: number | null; // suma semanal de todos los granos en la última semana
  liderCod: string | null; // grano con mayor venta semanal en la última semana
  liderTn: number | null;
  meta: Meta;
};

const vacia = (problema: string): NegociadoData => ({
  fecha: null,
  filas: [],
  avance: {},
  serie: [],
  totalSemanal: null,
  liderCod: null,
  liderTn: null,
  meta: { source: SOURCE, updatedAt: null, status: "parcial", problemas: [problema] },
});

const n = (v: number | null | undefined): number | null => (v == null ? null : Number(v));

export const getNegociado = cache(async (): Promise<NegociadoData> => {
  const [comprasRes, avanceRes] = await Promise.all([
    sbSelectAll(
      "compras?select=fecha,codigo_interno,campana,sector,toneladas,semanal_tn,precio_hecho_tn,fijado_tn,saldo_a_fijar_tn" +
        "&order=fecha.asc,codigo_interno.asc,campana.asc,sector.asc",
      REVALIDATE,
    ),
    sbSelectAll("compras_avance_hist?select=cod,fecha,campana,avance", REVALIDATE),
  ]);
  if (!comprasRes.ok) {
    return vacia(comprasRes.reason === "unconfigured" ? "Supabase sin configurar" : "Serie de compras no disponible");
  }
  const rows = comprasRes.data as CompraRow[];
  if (rows.length === 0) return vacia("La serie de compras está vacía (cargala desde /admin/datos)");

  const problemas: string[] = [];

  // --- Fechas ordenadas (todas las semanas con dato) ---
  const fechasSet = new Set<string>();
  for (const r of rows) fechasSet.add(r.fecha);
  const fechas = [...fechasSet].sort();
  const fechaGlobal = fechas[fechas.length - 1]!; // rows.length===0 ya salió arriba → fechas no vacío

  // --- Última fecha y fecha previa POR PRODUCTO (un grano puede venir más atrasado) ---
  const fechasPorCod = new Map<string, string[]>();
  for (const r of rows) {
    if (!fechasPorCod.has(r.codigo_interno)) fechasPorCod.set(r.codigo_interno, []);
    const arr = fechasPorCod.get(r.codigo_interno)!;
    if (arr[arr.length - 1] !== r.fecha) arr.push(r.fecha); // rows vienen ordenadas por fecha asc
  }
  for (const arr of fechasPorCod.values()) arr.sort();

  // --- Filas del último dato por (cod, campana, sector) + semana previa ---
  type Clave = string; // cod|campana|sector
  const ultimaFila = new Map<Clave, CompraRow>();
  const prevSemanal = new Map<Clave, number | null>();
  for (const r of rows) {
    const fcod = fechasPorCod.get(r.codigo_interno)!;
    const ult = fcod[fcod.length - 1];
    const prev = fcod.length > 1 ? fcod[fcod.length - 2] : null;
    const k = `${r.codigo_interno}|${r.campana}|${r.sector}`;
    if (r.fecha === ult) ultimaFila.set(k, r);
    else if (prev !== null && r.fecha === prev) prevSemanal.set(k, n(r.semanal_tn));
  }

  // --- Campaña activa por producto = mayor venta semanal (sumando sectores) en su último dato ---
  const semanalPorCodCamp = new Map<string, Map<string, number>>();
  for (const r of ultimaFila.values()) {
    if (!semanalPorCodCamp.has(r.codigo_interno)) semanalPorCodCamp.set(r.codigo_interno, new Map());
    const m = semanalPorCodCamp.get(r.codigo_interno)!;
    m.set(r.campana, (m.get(r.campana) ?? 0) + (n(r.semanal_tn) ?? 0));
  }
  const activaPorCod = new Map<string, string>();
  for (const [cod, m] of semanalPorCodCamp) {
    let mejor: string | null = null;
    let mejorTn = -1;
    for (const [camp, tn] of m) {
      if (tn > mejorTn || (tn === mejorTn && (mejor === null || camp > mejor))) {
        mejor = camp;
        mejorTn = tn;
      }
    }
    if (mejor !== null) activaPorCod.set(cod, mejor);
  }

  // --- Filas de la tabla: campaña activa siempre + otras campañas vivas con movimiento ---
  const filas: FilaSector[] = [];
  for (const r of ultimaFila.values()) {
    const activa = activaPorCod.get(r.codigo_interno) === r.campana;
    const movimiento = (semanalPorCodCamp.get(r.codigo_interno)?.get(r.campana) ?? 0) > 0;
    if (!activa && !movimiento) continue;
    const k = `${r.codigo_interno}|${r.campana}|${r.sector}`;
    filas.push({
      cod: r.codigo_interno,
      display: DISPLAY_NEGOCIADO[r.codigo_interno] ?? r.codigo_interno,
      campana: r.campana,
      sector: r.sector,
      fecha: r.fecha,
      semanal: n(r.semanal_tn),
      semanalPrev: prevSemanal.get(k) ?? null,
      acumulado: n(r.toneladas),
      precioHecho: n(r.precio_hecho_tn),
      fijado: n(r.fijado_tn),
      saldoAFijar: n(r.saldo_a_fijar_tn),
      activa,
    });
  }
  const orden = new Map<string, number>(PRODUCTOS_NEGOCIADO.map((c, i) => [c, i]));
  filas.sort(
    (a, b) =>
      (orden.get(a.cod) ?? 99) - (orden.get(b.cod) ?? 99) ||
      Number(b.activa) - Number(a.activa) ||
      a.campana.localeCompare(b.campana) ||
      a.sector.localeCompare(b.sector),
  );

  // --- % sobre cosecha: último avance de la matview por (cod, campana) ---
  const avance: Record<string, number> = {};
  if (avanceRes.ok) {
    const ultimaAv = new Map<string, { fecha: string; avance: number }>();
    for (const r of avanceRes.data as AvanceRow[]) {
      if (r.avance == null) continue;
      const k = `${r.cod}|${r.campana}`;
      const prev = ultimaAv.get(k);
      if (!prev || r.fecha > prev.fecha) ultimaAv.set(k, { fecha: r.fecha, avance: Number(r.avance) });
    }
    for (const [k, v] of ultimaAv) avance[k] = v.avance;
  } else {
    problemas.push("Avance sobre cosecha no disponible (matview)");
  }

  // --- KPIs de la última semana global ---
  let totalSemanal: number | null = null;
  const semanalPorCodHoy = new Map<string, number>();
  for (const r of rows) {
    if (r.fecha !== fechaGlobal || r.semanal_tn == null) continue;
    totalSemanal = (totalSemanal ?? 0) + Number(r.semanal_tn);
    semanalPorCodHoy.set(r.codigo_interno, (semanalPorCodHoy.get(r.codigo_interno) ?? 0) + Number(r.semanal_tn));
  }
  let liderCod: string | null = null;
  let liderTn: number | null = null;
  for (const [cod, tn] of semanalPorCodHoy) {
    if (liderTn === null || tn > liderTn) {
      liderCod = cod;
      liderTn = tn;
    }
  }

  // --- Serie del histograma: semanal por (fecha, cod, sector) sumando campañas ---
  const desdeHisto = fechas[Math.max(0, fechas.length - SEMANAS_HISTO)]!; // fechas no vacío (idem)
  const serieMap = new Map<string, number>();
  for (const r of rows) {
    if (r.fecha < desdeHisto || r.semanal_tn == null) continue;
    const k = `${r.fecha}|${r.codigo_interno}|${r.sector}`;
    serieMap.set(k, (serieMap.get(k) ?? 0) + Number(r.semanal_tn));
  }
  const serie: PuntoHisto[] = [...serieMap.entries()].map(([k, tn]) => {
    // k = `${r.fecha}|${r.codigo_interno}|${r.sector}` (armado arriba, ninguno trae "|") → split
    // siempre da los 3.
    const [fecha, cod, sector] = k.split("|") as [string, string, string];
    return { fecha, cod, sector, tn };
  });
  serie.sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    fecha: fechaGlobal,
    filas,
    avance,
    serie,
    totalSemanal,
    liderCod,
    liderTn,
    meta: { source: SOURCE, updatedAt: null, status: "real", problemas },
  };
});
