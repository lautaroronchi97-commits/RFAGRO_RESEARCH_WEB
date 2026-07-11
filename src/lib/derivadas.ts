import type { SeriePuntos } from "./series-types";

/**
 * Motor de transformaciones del panel de gráficos (PURO, client-side). Ninguna
 * fórmula nueva vive acá sin confirmarla con Lautaro: por ahora solo lo validado.
 *
 * Pipeline por campaña:
 *   1. join de las 2 patas por fecha, con forward-fill acotado (P18: máx 3 ruedas)
 *   2. métrica diaria (spread lejana−cercana / ratio) — decisiones P7, P8
 *   3. recorte a la ventana [vto − ventana, vto] (P3: 12 meses default)
 *   4. alineación del eje X: días al vto por índice de rueda (P1, default) o calendario
 */

export type Metric = "spread" | "ratio" | "crudo";
export type Eje = "vto" | "cal";

/** Punto ya listo para el chart: x (eje), y (valor), f (fecha real, para tooltip). */
export type PuntoXY = { x: number; y: number; f: string };

const MESES3: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

/** Días calendario entre dos fechas ISO (b − a). Usa mediodía ART (sin DST en AR). */
export function difDias(aISO: string, bISO: string): number {
  const a = Date.parse(`${aISO}T12:00:00-03:00`);
  const b = Date.parse(`${bISO}T12:00:00-03:00`);
  return Math.round((b - a) / 86_400_000);
}

/** Mes de una posición A3/CBOT ("ABR27" → 4). 0 si no matchea. */
export function mesDePosicion(pos: string | null | undefined): number {
  if (!pos) return 0;
  const m = pos.toUpperCase().match(/^([A-Z]{3})\d{2}$/);
  return m ? MESES3[m[1]] ?? 0 : 0;
}

type Join = { f: string; va: number; vb: number };

/**
 * Une dos series por fecha con forward-fill acotado a `maxGap` ruedas (P18).
 * Cada lado arrastra su último valor mientras no supere `maxGap` fechas de la
 * grilla combinada; si lo supera, queda "vencido" y ese punto no se emite.
 * Con dos patas del mismo mercado (A3 vs A3) las fechas coinciden → sin relleno.
 */
export function joinFfill(a: SeriePuntos, b: SeriePuntos, maxGap = 3): Join[] {
  const mapA = new Map(a.d.map((f, i) => [f, a.v[i]]));
  const mapB = new Map(b.d.map((f, i) => [f, b.v[i]]));
  const fechas = [...new Set([...a.d, ...b.d])].sort();

  const out: Join[] = [];
  let lastA: number | null = null;
  let ageA = Infinity;
  let lastB: number | null = null;
  let ageB = Infinity;

  for (const f of fechas) {
    if (mapA.has(f)) { lastA = mapA.get(f)!; ageA = 0; } else { ageA++; }
    if (mapB.has(f)) { lastB = mapB.get(f)!; ageB = 0; } else { ageB++; }
    if (lastA !== null && lastB !== null && ageA <= maxGap && ageB <= maxGap) {
      out.push({ f, va: lastA, vb: lastB });
    }
  }
  return out;
}

/**
 * Métrica diaria a partir del join. Convención (decisiones de Lautaro):
 *  - spread = vb − va  → el cliente ordena las patas para que B sea la "lejana"
 *    (vto más lejano; en empate, la más cara). Ej. soja − maíz (P7).
 *  - ratio = va / vb   → el cliente ordena para que arranque maíz/soja (P8).
 *  - crudo: no aplica acá (se grafican las dos series por separado).
 */
export function metricaDiaria(join: Join[], metric: Metric): { f: string; y: number }[] {
  const out: { f: string; y: number }[] = [];
  for (const j of join) {
    let y: number;
    if (metric === "ratio") {
      if (j.vb === 0) continue;
      y = j.va / j.vb;
    } else {
      y = j.vb - j.va; // spread
    }
    out.push({ f: j.f, y });
  }
  return out;
}

/**
 * Recorta a la ventana [vto − ventanaDias, vto] y alinea el eje X.
 *  - eje "vto": x = índice de rueda desde el final (última rueda = 0, hacia atrás
 *    −1, −2…). Es lo que hace el Excel de Lautaro; inmune a feriados entre años.
 *  - eje "cal": x = día dentro de la temporada, anclado al mes siguiente al vto
 *    (P2), para que ventanas que cruzan el año no se partan.
 */
export function alinear(
  serie: { f: string; y: number }[],
  vtoISO: string,
  eje: Eje,
  ventanaDias = 365,
): PuntoXY[] {
  const desde = restarDias(vtoISO, ventanaDias);
  const win = serie.filter((p) => p.f >= desde && p.f <= vtoISO);
  if (win.length === 0) return [];

  if (eje === "vto") {
    const n = win.length;
    return win.map((p, i) => ({ x: i - (n - 1), y: p.y, f: p.f }));
  }

  // Calendario: mes ancla = mes del vto + 1 (la temporada arranca ahí).
  const anchor = ((mesDeISO(vtoISO) % 12) + 1); // 1..12, mes siguiente al vto
  return win.map((p) => ({ x: diaDeTemporada(p.f, anchor), y: p.y, f: p.f }));
}

/** Resta días a una fecha ISO y devuelve ISO. */
function restarDias(iso: string, dias: number): string {
  const t = Date.parse(`${iso}T12:00:00-03:00`) - dias * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

function mesDeISO(iso: string): number {
  return Number(iso.slice(5, 7));
}

/**
 * Posición en la "temporada" que arranca en `anchorMes` (1..12). Devuelve un
 * número monótono 0..~372 = (meses desde el ancla) × 31 + día, para que las
 * campañas se superpongan por posición calendario sin partirse en el año nuevo.
 */
function diaDeTemporada(iso: string, anchorMes: number): number {
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  const offMes = (mes - anchorMes + 12) % 12;
  return offMes * 31 + dia;
}

/** Etiqueta del eje calendario: convierte x de temporada a "MMM". */
export function etiquetaCalendario(x: number, anchorMes: number): string {
  const nombres = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  const offMes = Math.floor(x / 31);
  const mes = ((anchorMes - 1 + offMes) % 12);
  return nombres[mes] ?? "";
}
