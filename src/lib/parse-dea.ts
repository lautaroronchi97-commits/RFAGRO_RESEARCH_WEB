/**
 * parse-dea.ts — Parser del CSV oficial de la DEA-SAGyP ("Datos de Estimaciones Agrícolas") para
 * las dos vías de ingesta: `scripts/ingest-dea.mjs` (Node 22 puede importar `.ts` sin flags) y el
 * uploader admin de `/admin/datos` (lote L5 del backlog maestro — la fuente automática quedó
 * bloqueada por IP en `datosestimaciones.magyp.gob.ar` desde 3 proveedores cloud distintos
 * (GitHub Actions, Supabase Edge en São Paulo, este sandbox); la carga pasa a ser SEMI-MANUAL:
 * Lautaro baja el CSV desde su navegador — su IP no está bloqueada — y lo sube por el panel).
 *
 * Módulo puro (sin secretos ni estado): no importa "server-only" a propósito, mismo criterio que
 * `src/lib/compras/parse-agrochat.ts` — así el unit-check puede correrlo con Node pelado.
 *
 * Formato del CSV oficial (Latin-1, separador `;`, ~11,5 MB, serie 1969/70→hoy):
 *   "ID Provincia";Provincia;"ID Departamento";Departamento;"Id Cultivo";Cultivo;"ID Campaña";
 *   Campana;"Sup. Sembrada (Ha)";"Sup. Cosechada (Ha)";"Producción (Tn)";"Rendimiento (Kg/Ha)"
 * Agregamos provincia/departamento → NACIONAL por (cultivo, campaña). La DEA guarda SOLO el valor
 * vigente (no hay vintages en origen) → cada carga SNAPSHOTEA el valor de "hoy" (o la fecha que se
 * indique) como un vintage propio.
 */

export type FilaEstimacion = {
  organismo: "DEA";
  pais: "argentina";
  grano: string;
  campania: string;
  fecha_publicacion: string;
  informe: string;
  url: string;
  variable: "produccion" | "area" | "rinde";
  valor: number;
  unidad: string;
};

// Cultivo DEA → grano normalizado. Tomamos los "total" para no sumar dos veces (1ra/2da, cervecera/forrajera).
const CULTIVO: Record<string, string> = {
  "Soja total": "soja",
  "Maíz": "maiz",
  "Trigo total": "trigo",
  "Girasol": "girasol",
  "Sorgo": "sorgo",
  "Cebada total": "cebada",
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** split de una línea CSV `;` con comillas (los nombres de provincia/depto/cultivo van entre comillas). */
export function splitSemicolon(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ";") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** CSV completo (texto ya decodificado) → filas nacionales por (grano, campaña, variable), snapshoteadas con `fecha`. */
export function parseDea(csv: string, fecha: string, sinceYear?: number | null): FilaEstimacion[] {
  const lines = csv.split(/\r?\n/);
  const agg = new Map<string, { semb: number; cos: number; prod: number }>();
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l) continue;
    const c = splitSemicolon(l);
    if (c.length < 12) continue;
    const grano = CULTIVO[c[5]];
    if (!grano) continue;
    const campania = c[7];
    if (!/^\d{4}\/\d{2}$/.test(campania)) continue;
    if (sinceYear && Number(campania.slice(0, 4)) < sinceYear) continue;
    const semb = Number(c[8]) || 0;
    const cos = Number(c[9]) || 0;
    const prod = Number(c[10]) || 0;
    const k = `${grano}|${campania}`;
    const a = agg.get(k) || { semb: 0, cos: 0, prod: 0 };
    a.semb += semb;
    a.cos += cos;
    a.prod += prod;
    agg.set(k, a);
  }

  const out: FilaEstimacion[] = [];
  for (const [k, v] of agg.entries()) {
    if (v.prod <= 0) continue;
    const [grano, campania] = k.split("|");
    const base = {
      organismo: "DEA" as const,
      pais: "argentina" as const,
      grano,
      campania,
      fecha_publicacion: fecha,
      informe: "SAGyP · Estimaciones Agrícolas",
      url: "https://datosestimaciones.magyp.gob.ar/",
    };
    out.push({ ...base, variable: "produccion", valor: round2(v.prod / 1e6), unidad: "Mt" });
    if (v.semb > 0) out.push({ ...base, variable: "area", valor: round2(v.semb / 1e6), unidad: "Mha" });
    if (v.cos > 0) out.push({ ...base, variable: "rinde", valor: round4(v.prod / v.cos), unidad: "tn/ha" });
  }
  return out;
}

/** Campañas y granos presentes en un lote de filas (para el resumen de previsualización). */
export function resumenFilas(filas: FilaEstimacion[]): { granos: string[]; campanias: string[] } {
  return {
    granos: [...new Set(filas.map((f) => f.grano))].sort(),
    campanias: [...new Set(filas.map((f) => f.campania))].sort(),
  };
}
