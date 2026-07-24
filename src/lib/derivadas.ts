import type { SeriePuntos } from "./series-types";
import { parsePosicion } from "./dates";

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

/** Mes de una posición A3/CBOT ("ABR27" → 4). 0 si no matchea. */
export function mesDePosicion(pos: string | null | undefined): number {
  return parsePosicion(pos)?.mes ?? 0;
}

/**
 * Empareja `s.d[i]`/`s.v[i]` (arrays paralelos por contrato de `SeriePuntos` — la API siempre
 * los manda del mismo largo) en `{f,y}[]`. Defensivo por diseño: si algún día llegaran
 * desalineados, el punto sin `y` se DESCARTA en vez de colar un `y` corrupto al chart (mismo
 * criterio "nunca un número inventado" del resto del repo) — nunca se ejercita hoy, verificado
 * con los datos reales de /api/series.
 */
export function zipSerie(s: SeriePuntos): { f: string; y: number }[] {
  const out: { f: string; y: number }[] = [];
  for (let i = 0; i < s.d.length; i++) {
    const f = s.d[i];
    const y = s.v[i];
    if (f !== undefined && y !== undefined) out.push({ f, y });
  }
  return out;
}

type Join = { f: string; va: number; vb: number };

/**
 * Une dos series por fecha con forward-fill acotado a `maxGap` ruedas (P18).
 * Cada lado arrastra su último valor mientras no supere `maxGap` fechas de la
 * grilla combinada; si lo supera, queda "vencido" y ese punto no se emite.
 * Con dos patas del mismo mercado (A3 vs A3) las fechas coinciden → sin relleno.
 */
export function joinFfill(a: SeriePuntos, b: SeriePuntos, maxGap = 3): Join[] {
  const mapA = new Map(zipSerie(a).map((p) => [p.f, p.y]));
  const mapB = new Map(zipSerie(b).map((p) => [p.f, p.y]));
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
 *
 * `pct` (P6 del backlog maestro, "ratio/base en %"): en vez del valor absoluto,
 * expresa la métrica como porcentaje — ratio×100 (ej. "58%" en vez de "0,58") o,
 * para spread, (vb/va − 1)×100 (ej. base pizarra/futuro − 1, la misma fórmula que
 * ya se usa para "capacidad de pago" y afines). Nunca cambia el signo/orden ya
 * decidido, solo la unidad de salida.
 */
export function metricaDiaria(join: Join[], metric: Metric, pct = false): { f: string; y: number }[] {
  const out: { f: string; y: number }[] = [];
  for (const j of join) {
    let y: number;
    if (metric === "ratio") {
      if (j.vb === 0) continue;
      y = j.va / j.vb;
      if (pct) y *= 100;
    } else if (pct) {
      if (j.va === 0) continue;
      y = (j.vb / j.va - 1) * 100; // base en % (ej. pizarra/futuro − 1)
    } else {
      y = j.vb - j.va; // spread
    }
    out.push({ f: j.f, y });
  }
  return out;
}

/**
 * Media móvil simple sobre una serie diaria YA calculada (spread/ratio), en
 * cantidad de RUEDAS (no días calendario) — decisión de Lautaro (P15): "sobre
 * el spread ya calculado, 5 ruedas" (ventana elegible en el panel, default 5).
 * Solo emite un punto una vez que hay `ventana` observaciones previas completas
 * (sin promedios parciales al arranque de la serie).
 */
export function mediaMovil(serie: { f: string; y: number }[], ventana: number): { f: string; y: number }[] {
  if (ventana < 2) return serie.map((p) => ({ ...p }));
  const out: { f: string; y: number }[] = [];
  for (let i = ventana - 1; i < serie.length; i++) {
    let suma = 0;
    // Invariante del propio for: k va de (i-ventana+1) a i, con i<serie.length e i-ventana+1>=0
    // (i arranca en ventana-1) → k SIEMPRE es un índice válido de `serie`.
    for (let k = i - ventana + 1; k <= i; k++) suma += serie[k]!.y;
    out.push({ f: serie[i]!.f, y: suma / ventana });
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
export function alinear<T extends { f: string; y: number }>(
  serie: T[],
  vtoISO: string,
  eje: Eje,
  ventanaDias = 365,
): (T & { x: number })[] {
  const desde = restarDias(vtoISO, ventanaDias);
  const win = serie.filter((p) => p.f >= desde && p.f <= vtoISO);
  if (win.length === 0) return [];

  if (eje === "vto") {
    // x = índice de rueda ANCLADO al vencimiento (no al último dato). Para
    // campañas cerradas la última rueda ≈ vto → offset 0. Para la campaña EN
    // CURSO (vto futuro, todavía sin datos hasta el vto) se corre a la izquierda
    // las ruedas hábiles que faltan para el vto, para que quede a la misma altura
    // que las históricas a esa distancia del vencimiento.
    const n = win.length;
    // win.length===0 ya devolvió [] arriba → n>=1, win[n-1] siempre existe.
    const offset = ruedasHasta(win[n - 1]!.f, vtoISO);
    return win.map((p, i) => ({ ...p, x: i - (n - 1) - offset }));
  }

  // Calendario: mes ancla = mes del vto + 1 (la temporada arranca ahí).
  const anchor = ((mesDeISO(vtoISO) % 12) + 1); // 1..12, mes siguiente al vto
  return win.map((p) => ({ ...p, x: diaDeTemporada(p.f, anchor) }));
}

/**
 * Ruedas hábiles (L-V) aproximadas entre dos fechas ISO (0 si `hasta` ≤ `desde`).
 * Proxy sin tabla de feriados: suficiente para anclar el eje al vencimiento de la
 * campaña en curso. Cuenta días de lunes a viernes posteriores a `desde`.
 */
export function ruedasHasta(desdeISO: string, hastaISO: string): number {
  let d = Date.parse(`${desdeISO}T12:00:00-03:00`);
  const end = Date.parse(`${hastaISO}T12:00:00-03:00`);
  if (!(end > d)) return 0;
  let count = 0;
  d += 86_400_000;
  while (d <= end) {
    const dow = new Date(d).getUTCDay(); // mediodía ART → 15:00 UTC, mismo día
    if (dow !== 0 && dow !== 6) count++;
    d += 86_400_000;
  }
  return count;
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
  const offMes = Math.floor(x / 31);
  const mes = ((anchorMes - 1 + offMes) % 12);
  return MES_NOMBRE[mes] ?? "";
}

export const MES_NOMBRE = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

/** Nombre del mes de una fecha ISO ("2024-04-15" → "ABR"). */
export function mesDeFecha(iso: string): string {
  return MES_NOMBRE[Number(iso.slice(5, 7)) - 1] ?? "";
}

/**
 * Mes calendario a `ruedas` ruedas hábiles ANTES del vencimiento. Sirve para
 * rotular el eje días-al-vto con el mes real proyectando desde el vto (aunque la
 * campaña vigente todavía no haya llegado a esa altura). ruedas ≥ 0.
 */
export function mesEnRuedasAlVto(vtoISO: string, ruedas: number): string {
  let d = Date.parse(`${vtoISO}T12:00:00-03:00`);
  let cnt = 0;
  while (cnt < ruedas) {
    d -= 86_400_000;
    const dow = new Date(d).getUTCDay();
    if (dow !== 0 && dow !== 6) cnt++;
  }
  return MES_NOMBRE[new Date(d).getUTCMonth()] ?? "";
}

/** Mediana de una muestra (NaN si vacía). */
export function mediana(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  // s.length>=1 (guard arriba) → m está en [0, length-1]; en el caso par, m-1>=0 también
  // (length par y >=1 implica length>=2, así que m>=1).
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/**
 * Percentil (0..100) de `v` dentro de `muestra`: fracción de la muestra ≤ v.
 * Ej. v mayor que 3 de 4 valores previos → 75%. NaN si la muestra está vacía.
 */
export function percentil(v: number, muestra: number[]): number {
  if (muestra.length === 0) return NaN;
  const menores = muestra.filter((x) => x <= v).length;
  return (menores / muestra.length) * 100;
}

/** Punto de banda histórica: rango min–máx + mediana a una altura x del eje. */
export type BandaPunto = { x: number; min: number; max: number; med: number };

/**
 * Posición en el eje calendario ene→dic de una fecha ISO: (mes−1)×31 + día.
 * Da un x monótono 0..~372 que, con `etiquetaCalendario(x, 1)`, rotula por mes.
 * Se usa en el modo Período (eje calendario real del año).
 */
export function posCalendario(iso: string): number {
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  return (mes - 1) * 31 + dia;
}
