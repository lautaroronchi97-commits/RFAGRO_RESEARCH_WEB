import "server-only";
import { cache } from "react";
import type { Meta } from "./market";

/**
 * Serie larga del dólar oficial (BCRA A3500, variable 5) — P2 del backlog maestro: cierre de
 * cada semana + variación % semana a semana (para el combo del gráfico principal) y DOS series
 * de volatilidad — semanal (la primera que se construyó) y diaria (agregada después, a pedido de
 * Lautaro: "quiero que la volatilidad esté calculada con el dato día por día no semana" — pero
 * pidió conservar la semanal también, con un toggle en el chart para elegir una u otra). Distinto
 * de `getVariacionSemanalDolarOficial` en `informe-semanal.ts` (esa trae solo ~13 días, un único
 * delta "hoy vs hace ~7 días" para el informe semanal — NO se toca, MP2 depende de su forma
 * exacta) — acá se pide una ventana mucho más larga para graficar con contexto.
 *
 * Fuente y ventana móvil (decisión de Lautaro, 23/07): (a) BCRA API v4 var. 5 directa, no el
 * espejo de CEM `/spot-prices?spot=BCRA` (mismos valores, pero es un puente — ver research en
 * el doc de sesión); (b) en vivo cacheada varias horas, sin tabla propia ni cron (el BCRA publica
 * ~1 vez por día hábil; si algún día no alcanza, el fallback documentado es un patrón tipo
 * `compras_bcra`); (c) volatilidad semanal = desvío rolling de 12 semanas de la variación %
 * SEMANAL, anualizado ×√52; volatilidad diaria = desvío rolling de 60 ruedas de la variación %
 * DIARIA, anualizado ×√252 (252 ruedas hábiles/año, la convención de mercado — no 365).
 */

const API = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/5";
const UA = "Mozilla/5.0 (RFAGRO research)";
const REVALIDATE = 6 * 3600; // el BCRA publica ~1 vez por día hábil, no hace falta más seguido
const SOURCE = "BCRA (API v4, var. 5 — A3500)";

export const SEMANAS_VISIBLES = 26; // ~6 meses, decisión de Lautaro 23/07
const RUEDAS_VISIBLES_VOL = 130; // ~26 semanas de ruedas, mismo horizonte que el combo semanal
const VENTANA_VOL_SEMANAS = 12; // decisión de Lautaro 23/07
const VENTANA_VOL_RUEDAS = 60; // ~12 semanas hábiles, decisión de Lautaro 23/07
const DIAS_FETCH = 500; // ventanas visibles + colchón de lookback para la 1ª vol + feriados

export type PuntoSemanalDolar = {
  semana: string; // clave ISO "AAAA-Wss"
  fecha: string; // fecha (ISO) del último dato hábil de esa semana
  valor: number; // A3500 de cierre de esa semana
  deltaPct: number | null; // variación % vs la semana anterior
};

/** Forma común de los puntos de volatilidad (semanal o diaria) — el chart alterna entre las dos. */
export type PuntoVolDolar = {
  fecha: string; // fecha (ISO): último dato hábil de la semana, o la rueda misma
  deltaPct: number | null; // variación % vs el período anterior (semana o rueda, según la serie)
  volAnualizada: number | null; // desvío rolling de la ventana correspondiente, anualizado (%)
};

export type DolarOficialHistorico = {
  semanas: PuntoSemanalDolar[];
  volatilidadSemanal: PuntoVolDolar[];
  volatilidadDiaria: PuntoVolDolar[];
  meta: Meta;
};

const vacio = (problema: string): DolarOficialHistorico => ({
  semanas: [],
  volatilidadSemanal: [],
  volatilidadDiaria: [],
  meta: { source: SOURCE, updatedAt: null, status: "parcial", problemas: [problema] },
});

/** ISO 8601: semana del jueves más cercano (algoritmo estándar, sin dependencias). */
function isoWeekKey(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-").map(Number) as [number, number, number]; // fecha BCRA, siempre YYYY-MM-DD
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function stdev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

export const getDolarOficialHistorico = cache(async (): Promise<DolarOficialHistorico> => {
  const hasta = new Date().toISOString().slice(0, 10);
  const desde = new Date(Date.now() - DIAS_FETCH * 86400000).toISOString().slice(0, 10);

  let detalle: { fecha: string; valor: number }[];
  try {
    const res = await fetch(`${API}?desde=${desde}&hasta=${hasta}&limit=3000`, {
      next: { revalidate: REVALIDATE },
      headers: { "user-agent": UA, accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return vacio(`BCRA HTTP ${res.status}`);
    const json = (await res.json()) as { results?: { detalle?: { fecha: string; valor: number }[] }[] };
    detalle = json.results?.[0]?.detalle ?? [];
  } catch {
    return vacio("BCRA sin responder");
  }
  if (detalle.length === 0) return vacio("Sin datos en la ventana pedida");

  // Cierre semanal: el último dato (por fecha) dentro de cada semana ISO pisa a los anteriores.
  const ordenado = [...detalle]
    .filter((d) => typeof d.fecha === "string" && Number.isFinite(d.valor))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const porSemana = new Map<string, { fecha: string; valor: number }>();
  for (const d of ordenado) porSemana.set(isoWeekKey(d.fecha), { fecha: d.fecha, valor: d.valor });
  const semanasOrdenadas = [...porSemana.entries()].sort(([a], [b]) => (a < b ? -1 : 1));

  const semanas: PuntoSemanalDolar[] = semanasOrdenadas.map(([semana, p], i) => {
    const prev = i > 0 ? semanasOrdenadas[i - 1]![1].valor : null; // i>0 recién chequeado
    const deltaPct = prev != null && prev > 0 ? (p.valor / prev - 1) * 100 : null;
    return { semana, fecha: p.fecha, valor: p.valor, deltaPct };
  });
  const semanasVisibles = semanas.slice(-SEMANAS_VISIBLES);

  // Volatilidad semanal (la primera que se construyó): desvío estándar rolling de las últimas
  // VENTANA_VOL_SEMANAS variaciones % SEMANALES, anualizado ×√52.
  const volatilidadSemanal: PuntoVolDolar[] = semanas
    .map((p, i) => {
      const winStart = Math.max(0, i - VENTANA_VOL_SEMANAS + 1);
      const ventana = semanas
        .slice(winStart, i + 1)
        .map((x) => x.deltaPct)
        .filter((v): v is number => v != null);
      const sd = ventana.length >= VENTANA_VOL_SEMANAS ? stdev(ventana) : null;
      return { fecha: p.fecha, deltaPct: p.deltaPct, volAnualizada: sd != null ? sd * Math.sqrt(52) : null };
    })
    .slice(-SEMANAS_VISIBLES);

  // Volatilidad diaria (agregada después, pedido de Lautoro): variación % rueda a rueda (no
  // semana a semana), desvío estándar rolling de VENTANA_VOL_RUEDAS ruedas, anualizado ×√252 (252
  // ruedas hábiles/año, la convención de mercado — no √365). Ambas series solo se completan
  // cuando hay la ventana llena de variaciones reales, nunca con menos.
  const conDeltaDiario = ordenado.map((p, i) => {
    const prev = i > 0 ? ordenado[i - 1]!.valor : null; // i>0 recién chequeado
    const deltaPct = prev != null && prev > 0 ? (p.valor / prev - 1) * 100 : null;
    return { fecha: p.fecha, deltaPct };
  });
  const volatilidadDiaria: PuntoVolDolar[] = conDeltaDiario
    .map((p, i) => {
      const winStart = Math.max(0, i - VENTANA_VOL_RUEDAS + 1);
      const ventana = conDeltaDiario
        .slice(winStart, i + 1)
        .map((x) => x.deltaPct)
        .filter((v): v is number => v != null);
      const sd = ventana.length >= VENTANA_VOL_RUEDAS ? stdev(ventana) : null;
      return { fecha: p.fecha, deltaPct: p.deltaPct, volAnualizada: sd != null ? sd * Math.sqrt(252) : null };
    })
    .slice(-RUEDAS_VISIBLES_VOL);

  const ultimaFecha = ordenado[ordenado.length - 1]?.fecha ?? null;

  return {
    semanas: semanasVisibles,
    volatilidadSemanal,
    volatilidadDiaria,
    meta: {
      source: SOURCE,
      updatedAt: ultimaFecha ? Date.parse(`${ultimaFecha}T00:00:00-03:00`) : null,
      status: "real",
      problemas: [],
    },
  };
});
