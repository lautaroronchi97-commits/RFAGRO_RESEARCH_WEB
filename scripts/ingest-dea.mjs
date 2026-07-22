#!/usr/bin/env node
/**
 * Ingesta de estimaciones de producción de la DEA — SAGyP (Argentina, oficial) a Supabase
 * (tabla estimaciones_produccion). Módulo "Calendario + estimaciones" — docs/PLAN_CALENDARIO_PRODUCCION.md (sesión C).
 *
 * Fuente: exportación CSV completa por POST, sin auth (Datos de Estimaciones Agrícolas):
 *   POST https://datosestimaciones.magyp.gob.ar/reportes.php?reporte=Estimaciones   body: Dataset=Dataset
 *   CSV Latin-1, separador ';', ~11,5 MB (serie 1969/70 → hoy). Columnas:
 *     "ID Provincia";Provincia;"ID Departamento";Departamento;"Id Cultivo";Cultivo;"ID Campaña";
 *     Campana;"Sup. Sembrada (Ha)";"Sup. Cosechada (Ha)";"Producción (Tn)";"Rendimiento (Kg/Ha)"
 *
 * Agregamos provincia/departamento → NACIONAL por (cultivo, campaña). La DEA guarda SOLO el valor
 * vigente (no hay vintages en origen) → cada corrida SNAPSHOTEA el valor de hoy como un vintage propio
 * (fecha_publicacion = fecha de corrida). Así, semana a semana, se arma la evolución de la estimación.
 *   - produccion = Σ Producción(Tn) → Mt
 *   - area       = Σ Sup. Sembrada(Ha) → Mha   (misma base "sembrada" que GEA/CONAB)
 *   - rinde      = Σ Producción(Tn) / Σ Sup. Cosechada(Ha) → tn/ha  (rinde nacional realizado)
 * La campaña ya viene "YYYY/YY" en origen → no hay que normalizar.
 *
 * Cultivos "total" para no doblar (Soja total, Trigo total, Cebada total; Maíz/Girasol/Sorgo son únicos).
 *
 * Uso:
 *   node scripts/ingest-dea.mjs                     # cron: snapshot de las últimas 3 campañas
 *   node scripts/ingest-dea.mjs --since 2019        # snapshot de campañas desde 2019/20 (base histórica)
 *   node scripts/ingest-dea.mjs --full              # todas las campañas del CSV (1969/70 → hoy)
 *   node scripts/ingest-dea.mjs --out filas.json    # dry-run: escribe JSON, no sube nada
 *   node scripts/ingest-dea.mjs --date 2026-07-12   # forzar la fecha del snapshot (para backfill puntual)
 *
 * Requiere en el entorno (NO en el repo), salvo en modo --out:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; solo en el cron, nunca en la web)
 */

import { writeFileSync } from "node:fs";

const URL_DEA = "https://datosestimaciones.magyp.gob.ar/reportes.php?reporte=Estimaciones";
const UA = "Mozilla/5.0 (RFAGRO research)";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}
function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

// Cultivo DEA → grano normalizado. Tomamos los "total" para no sumar dos veces (1ra/2da, cervecera/forrajera).
const CULTIVO = {
  "Soja total": "soja",
  "Maíz": "maiz",
  "Trigo total": "trigo",
  "Girasol": "girasol",
  "Sorgo": "sorgo",
  "Cebada total": "cebada",
};

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

/** split de una línea CSV `;` con comillas (los nombres de provincia/depto/cultivo van entre comillas). */
function splitSemicolon(line) {
  const out = [];
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

async function fetchCsv() {
  // MAGyP filtra las IPs de GitHub Actions (ConnectTimeout persistente, E5 #8) → con creds
  // vamos vía la Edge Function `dea-fetch` (sa-east-1, misma solución que lineup/ISA).
  // Sin creds (dry-run local con --out) se pega directo a la fuente.
  const viaEdge = SUPABASE_URL && SERVICE_KEY;
  const res = viaEdge
    ? await fetch(`${SUPABASE_URL}/functions/v1/dea-fetch`, {
        headers: { authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
        signal: AbortSignal.timeout(180000),
      })
    : await fetch(URL_DEA, {
        method: "POST",
        headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded" },
        body: "Dataset=Dataset",
        signal: AbortSignal.timeout(180000),
      });
  if (!res.ok) throw new Error(`DEA CSV${viaEdge ? " (via dea-fetch)" : ""}: HTTP ${res.status} ${await res.text().catch(() => "")}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return new TextDecoder("latin1").decode(buf);
}

/** CSV → filas nacionales por (grano, campaña, variable), snapshoteadas con `fecha`. */
function parse(csv, fecha, sinceYear) {
  const lines = csv.split(/\r?\n/);
  // clave = grano|campaña → { semb, cos, prod }
  const agg = new Map();
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

  const out = [];
  for (const [k, v] of agg.entries()) {
    if (v.prod <= 0) continue;
    const [grano, campania] = k.split("|");
    const base = {
      organismo: "DEA",
      pais: "argentina",
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

async function upsert(rows) {
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/estimaciones_produccion`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`upsert lote ${i}: HTTP ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const outFile = arg("out", null);
  if (!outFile && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY (o usá --out para dry-run).");
    process.exit(1);
  }
  const fecha = arg("date", new Date().toISOString().slice(0, 10));
  // En el cron alcanza con snapshotear las campañas que aún se revisan (las viejas ya están cerradas).
  let sinceYear;
  if (hasFlag("full")) sinceYear = null;
  else if (arg("since", null)) sinceYear = Number(arg("since", null));
  else sinceYear = new Date().getUTCFullYear() - 2;

  console.log(`Ingesta DEA snapshot ${fecha}${sinceYear ? ` (campañas desde ${sinceYear}/…)` : " (todas)"}`);
  const csv = await fetchCsv();
  const rows = parse(csv, fecha, sinceYear);
  console.log(`${rows.length} filas nacionales (grano × campaña × variable).`);

  if (outFile) {
    writeFileSync(outFile, JSON.stringify(rows, null, 0));
    console.log(`Escrito ${outFile} (dry-run, no se subió nada).`);
    return;
  }
  // Guard anti "falso verde": el CSV oficial siempre trae las campañas vigentes; 0 filas = cambió
  // el export de SAGyP o cayó la fuente. No pasar en verde sin insertar.
  if (rows.length === 0) {
    console.error("ERROR: DEA devolvió 0 filas (cambió el CSV oficial de SAGyP o cayó la fuente). No se da por bueno.");
    process.exit(1);
  }
  console.log("Upsert a estimaciones_produccion...");
  await upsert(rows);
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
