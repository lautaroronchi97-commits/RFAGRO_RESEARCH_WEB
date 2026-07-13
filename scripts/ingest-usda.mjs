#!/usr/bin/env node
/**
 * Ingesta de estimaciones de producción de USDA a Supabase (tabla estimaciones_produccion).
 * Módulo "Calendario + estimaciones de producción" — docs/PLAN_CALENDARIO_PRODUCCION.md (sesión B).
 *
 * DOS fuentes complementarias (USDA publica el mismo día del WASDE):
 *
 *  1) WASDE (OCE) — CSV tidy oficial, UNO POR EDICIÓN desde 2010, "as it was reported".
 *     https://www.usda.gov/sites/default/files/documents/oce-wasde-report-data-YYYY-MM.csv
 *     Trae PRODUCCIÓN por país (Argentina/Brazil/United States/World) de soja/maíz/trigo →
 *     es la vía de los VINTAGES históricos + del total MUNDIAL (PSD bulk no trae "mundo").
 *     Un archivo = un vintage (fecha_publicacion = ReleaseDate, informe = "WASDE #NNN").
 *
 *  2) PSD (FAS) — bulk ZIP sin auth, se regenera el día del WASDE.
 *     https://apps.fas.usda.gov/psdonline/downloads/psd_grains_pulses_csv.zip  (+ _oilseeds_)
 *     La base guarda SOLO el valor vigente (no hay vintages) → snapshoteamos el valor de hoy
 *     como un vintage propio (fecha_publicacion = Last-Modified del ZIP). Aporta lo que al WASDE
 *     le falta por país: ÁREA + RINDE de los 6 granos y la PRODUCCIÓN de girasol/sorgo/cebada.
 *     PRIORIDAD del plan: cada mes sin snapshotear es un vintage de girasol/sorgo/cebada perdido.
 *
 * Para no pisarse entre sí (misma PK organismo+país+grano+campaña+variable+fecha):
 *   - WASDE escribe SOLO producción de soja/maíz/trigo (+ mundo).
 *   - PSD escribe área/rinde de los 6 granos + producción de girasol/sorgo/cebada (AR/BR/US).
 *
 * Uso:
 *   node scripts/ingest-usda.mjs                          # cron: WASDE del mes + PSD snapshot
 *   node scripts/ingest-usda.mjs --backfill-wasde --from 2020-01 --to 2026-07
 *   node scripts/ingest-usda.mjs --no-psd                 # solo WASDE (más liviano)
 *   node scripts/ingest-usda.mjs --out filas.json         # dry-run: escribe JSON, no sube nada
 *
 * Requiere en el entorno (NO en el repo), salvo en modo --out:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; solo en el cron, nunca en la web)
 */

import zlib from "node:zlib";
import { writeFileSync } from "node:fs";

const UA = "Mozilla/5.0 (RFAGRO research)";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const WASDE_CSV = (ym) =>
  `https://www.usda.gov/sites/default/files/documents/oce-wasde-report-data-${ym}.csv`;
const PSD_GRAINS = "https://apps.fas.usda.gov/psdonline/downloads/psd_grains_pulses_csv.zip";
const PSD_OILSEEDS = "https://apps.fas.usda.gov/psdonline/downloads/psd_oilseeds_csv.zip";

/* ---- args ---- */
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}
function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

/* ---- CSV real (comillas + comas embebidas; el CSV de PSD/WASDE las tiene) ---- */
function parseCsvLine(line) {
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
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

/* ---- ZIP mínimo: central directory + inflate raw (sin dependencias) ---- */
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP: no encuentro End Of Central Directory");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error("ZIP: firma de central directory mala");
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.slice(off + 46, off + 46 + nameLen).toString("utf8");
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const comp = buf.slice(dataStart, dataStart + compSize);
    files[name] = method === 0 ? comp : zlib.inflateRawSync(comp);
    off += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

/* ---- mapeos ---- */
// WASDE: commodity exacto (¡"Oilseed, Soybean" NO includes 'Soybean', que también matchea
// Soybean Meal / Soybean Oil!) → grano. Solo estos 3 salen por país en el WASDE.
const WASDE_GRANO = {
  "Oilseed, Soybean": "soja",
  Corn: "maiz",
  Wheat: "trigo",
};
const WASDE_REGION = {
  Argentina: "argentina",
  Brazil: "brasil",
  "United States": "eeuu",
  World: "mundo",
};

// PSD: código de commodity → grano. grains_pulses.zip: maíz/trigo/sorgo/cebada; oilseeds.zip: soja/girasol.
const PSD_GRANO = {
  "2222000": "soja",
  "2224000": "girasol",
  "0440000": "maiz",
  "0410000": "trigo",
  "0459200": "sorgo",
  "0430000": "cebada",
};
const PSD_COUNTRY = { AR: "argentina", BR: "brasil", US: "eeuu" };
// atributos PSD → (variable, factor a unidad normalizada)
//   028 Producción  (1000 MT)  → Mt  = /1000
//   004 Área cosech.(1000 HA)  → Mha = /1000
//   184 Rinde       (MT/HA)    → tn/ha = ×1
const PSD_ATTR = {
  "028": { variable: "produccion", unidad: "Mt", factor: 1 / 1000 },
  "004": { variable: "area", unidad: "Mha", factor: 1 / 1000 },
  "184": { variable: "rinde", unidad: "tn/ha", factor: 1 },
};
// Del PSD tomamos producción SOLO de los granos que el WASDE no da por país; área/rinde de los 6.
const PSD_SOLO_AREA_RINDE = new Set(["soja", "maiz", "trigo"]);

/* ---- helpers ---- */
const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;
/** PSD Market_Year N (año calendario) → campaña "N/N+1". */
function psdCampania(my) {
  const y = Number(my);
  return `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
}

/* ---- WASDE (una edición = un vintage) ---- */
async function fetchWasde(ym) {
  // Ediciones corregidas llevan sufijo -V2. Probamos base y, si 404, -V2.
  for (const url of [WASDE_CSV(ym), WASDE_CSV(`${ym}-V2`)]) {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(45000) });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`WASDE ${ym}: HTTP ${res.status}`);
    return await res.text();
  }
  return null; // no existió esa edición (ej. oct-2025 por el shutdown)
}

function parseWasde(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const H = parseCsvLine(lines[0]).map((s) => s.replace(/^"|"$/g, ""));
  const I = Object.fromEntries(H.map((h, i) => [h, i]));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const r = parseCsvLine(lines[i]);
    const grano = WASDE_GRANO[r[I.Commodity]];
    const pais = WASDE_REGION[r[I.Region]];
    if (!grano || !pais) continue;
    if (r[I.Attribute] !== "Production") continue; // solo producción por país (área/rinde vienen del PSD)
    // TRAMPA: EEUU se publica en la tabla "U.S. Supply and Use" en Millones de BUSHELS, y las tablas
    // "Reliability of Projections" repiten la producción con campaña vacía. La tabla "World X Supply and
    // Use" trae TODOS los países (incl. EEUU) en Mt → nos quedamos SOLO con Mt + campaña "YYYY/YY".
    if (r[I.Unit] !== "Million Metric Tons") continue;
    const campania = r[I.MarketYear];
    if (!/^\d{4}\/\d{2}$/.test(campania)) continue;
    const valor = Number(r[I.Value]);
    if (!Number.isFinite(valor)) continue;
    rows.push({
      organismo: "USDA",
      pais,
      grano,
      campania,
      variable: "produccion",
      valor: round2(valor), // ya viene en Million Metric Tons
      unidad: "Mt",
      fecha_publicacion: r[I.ReleaseDate], // "2026-07-10"
      informe: `WASDE #${r[I.WasdeNumber]}`,
      url: "https://www.usda.gov/oce/commodity-markets/wasde",
    });
  }
  return rows;
}

/* ---- PSD (snapshot del valor vigente = vintage propio) ---- */
async function fetchPsd(url) {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`PSD ${url}: HTTP ${res.status}`);
  const lm = res.headers.get("last-modified");
  const buf = Buffer.from(await res.arrayBuffer());
  const csv = Object.values(unzip(buf))[0].toString("utf8");
  // fecha del snapshot = fecha del Last-Modified del ZIP (= día del release WASDE)
  const fecha = lm ? new Date(lm).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return { csv, fecha };
}

function parsePsd(csv, fecha, minYear) {
  const lines = csv.split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l) continue;
    // Filtro barato antes del parse caro: descartar filas de granos/países/atributos que no nos importan.
    const cc = l.slice(0, 7);
    const grano = PSD_GRANO[cc];
    if (!grano) continue;
    const r = parseCsvLine(l);
    const pais = PSD_COUNTRY[r[2]];
    if (!pais) continue;
    const my = Number(r[4]);
    if (!Number.isFinite(my) || my < minYear) continue;
    const attr = PSD_ATTR[r[7]];
    if (!attr) continue;
    if (attr.variable === "produccion" && PSD_SOLO_AREA_RINDE.has(grano)) continue; // prod big-3 = WASDE
    const valor = Number(r[11]);
    if (!Number.isFinite(valor)) continue;
    const v = valor * attr.factor;
    rows.push({
      organismo: "USDA",
      pais,
      grano,
      campania: psdCampania(my),
      variable: attr.variable,
      valor: attr.variable === "rinde" ? round4(v) : round2(v),
      unidad: attr.unidad,
      fecha_publicacion: fecha,
      informe: "PSD USDA",
      url: "https://apps.fas.usda.gov/psdonline/app/index.html",
    });
  }
  return rows;
}

/* ---- upsert ---- */
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

/** dedup por PK (por si dos fuentes o dos ediciones repiten la misma clave). */
function dedup(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const k = `${r.organismo}|${r.pais}|${r.grano}|${r.campania}|${r.variable}|${r.fecha_publicacion}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/** Lista de "YYYY-MM" entre from y to inclusive. */
function mesesEntre(from, to) {
  const out = [];
  let [y, m] = from.split("-").map(Number);
  const [ey, em] = to.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

async function main() {
  const outFile = arg("out", null);
  const doPsd = !hasFlag("no-psd");
  const doWasde = !hasFlag("no-wasde");
  if (!outFile && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY (o usá --out para dry-run).");
    process.exit(1);
  }

  let all = [];

  if (doWasde) {
    if (hasFlag("backfill-wasde")) {
      const from = arg("from", "2020-01");
      const to = arg("to", new Date().toISOString().slice(0, 7));
      console.log(`WASDE backfill ${from} → ${to}`);
      for (const ym of mesesEntre(from, to)) {
        try {
          const csv = await fetchWasde(ym);
          if (!csv) {
            console.log(`  ${ym}: (no existe esa edición)`);
            continue;
          }
          const rows = parseWasde(csv);
          console.log(`  ${ym}: ${rows.length} filas`);
          all.push(...rows);
        } catch (e) {
          console.log(`  ${ym}: ERROR ${e.message}`);
        }
      }
    } else {
      // Cron: la edición del mes en curso (si ya salió).
      const ym = arg("month", new Date().toISOString().slice(0, 7));
      const csv = await fetchWasde(ym);
      if (csv) {
        const rows = parseWasde(csv);
        console.log(`WASDE ${ym}: ${rows.length} filas`);
        all.push(...rows);
      } else {
        console.log(`WASDE ${ym}: todavía no salió`);
      }
    }
  }

  if (doPsd) {
    const minYear = Number(arg("psd-min-year", String(new Date().getUTCFullYear() - 2)));
    for (const [nombre, url] of [
      ["grains_pulses", PSD_GRAINS],
      ["oilseeds", PSD_OILSEEDS],
    ]) {
      const { csv, fecha } = await fetchPsd(url);
      const rows = parsePsd(csv, fecha, minYear);
      console.log(`PSD ${nombre} (snapshot ${fecha}): ${rows.length} filas`);
      all.push(...rows);
    }
  }

  all = dedup(all);
  console.log(`Total ${all.length} filas.`);

  if (outFile) {
    writeFileSync(outFile, JSON.stringify(all, null, 0));
    console.log(`Escrito ${outFile} (dry-run, no se subió nada).`);
    return;
  }
  // Guard anti "falso verde": el PSD siempre trae cientos de filas; si con doPsd quedó 0, algo se
  // rompió (ZIP / columnas cambiadas). El WASDE del mes puede faltar (0 legítimo), por eso se exige doPsd.
  if (all.length === 0 && doPsd && !hasFlag("backfill-wasde")) {
    console.error("ERROR: 0 filas USDA con PSD activo. No se da por bueno (probable cambio de formato del PSD/WASDE).");
    process.exit(1);
  }
  console.log(`Upsert a estimaciones_produccion...`);
  await upsert(all);
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
