#!/usr/bin/env node
/**
 * Ingesta de estimaciones de producción de BCR-GEA (Argentina) a Supabase (estimaciones_produccion).
 * Módulo "Calendario + estimaciones de producción" — docs/PLAN_CALENDARIO_PRODUCCION.md (sesión C).
 *
 * Fuente: página de estimaciones nacionales de GEA (sin auth, patrón CAC ya conocido):
 *   https://www.bcr.com.ar/es/mercados/gea/estimaciones-nacionales-de-produccion/estimaciones
 *   Trae 3 tablas HTML `bcr-estimaciones {trigo|maiz|soja}` con Área Sembrada / Rinde / Producción de
 *   la campaña vigente + la anterior, y el bloque "Informe de Estimación Mensual Nacional" con la fecha
 *   del informe ("DD de Mes de YYYY") + el PDF (número de informe en el nombre del archivo).
 *   GEA solo estima soja/maíz/trigo (nacional).
 *
 * Cada informe mensual es un VINTAGE (fecha_publicacion = fecha del informe). El upsert es idempotente:
 * si la fecha no cambió, re-subir la misma tabla no crea filas nuevas.
 *
 * BACKFILL (--backfill): enumera los snapshots de la página en la Wayback Machine (CDX API), baja cada
 * uno y parsea las tablas → reconstruye los vintages 2020→hoy. Verificado: el snapshot de feb-2026
 * devuelve soja 48,0 / maíz 62,0 / trigo 27,7 Mt (coincide con ese vintage). Wayback lag ~mensual, así
 * que el backfill recupera aprox. un informe por mes. Dedup por PK (varios snapshots = mismo informe).
 *
 * Uso:
 *   node scripts/ingest-gea.mjs                       # cron: la estimación vigente (1 vintage)
 *   node scripts/ingest-gea.mjs --backfill            # Wayback 2020→hoy (todos los vintages archivados)
 *   node scripts/ingest-gea.mjs --backfill --from 20200101 --to 20261231
 *   node scripts/ingest-gea.mjs --out filas.json      # dry-run: escribe JSON, no sube nada
 *
 * Requiere en el entorno (NO en el repo), salvo en modo --out:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; solo en el cron, nunca en la web)
 */

import { writeFileSync } from "node:fs";

const PAGE = "https://www.bcr.com.ar/es/mercados/gea/estimaciones-nacionales-de-produccion/estimaciones";
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

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

const MESES = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10",
  noviembre: "11", diciembre: "12",
};

/** "2025/2026" → "2025/26" (normaliza al formato del resto de la web). */
function normCampania(s) {
  const m = s.match(/(\d{4})\s*\/\s*(\d{2,4})/);
  if (!m) return null;
  const y0 = m[1];
  const y1 = m[2].length === 4 ? m[2].slice(2) : m[2];
  return `${y0}/${y1}`;
}

/** "1,23" (coma decimal, miles con punto) → número. Vacío → null. */
function num(s) {
  if (s == null) return null;
  const t = String(s).trim().replace(/\./g, "").replace(",", ".");
  if (!t || !/[\d]/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Extrae el texto plano de un fragmento HTML. */
function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&iacute;/g, "í").replace(/&aacute;/g, "á").replace(/&eacute;/g, "é")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parsea las 3 tablas `bcr-estimaciones {grano}`. Cada `<tr>` del `<tbody>` es:
 *   <td>campaña</td><td><strong>area</strong>MILLONES HA</td>
 *   <td><strong>rinde</strong>QQ/HA</td><td><strong>prod</strong>MILLONES TN</td>
 * Devuelve filas por (grano, campaña, variable) con valor presente (celdas vacías se saltan).
 * Área en Mha, rinde qq/ha → tn/ha (÷10), producción en Mt.
 */
function parseTablas(html) {
  const GRANOS = { soja: "soja", maiz: "maiz", trigo: "trigo" };
  const out = [];
  for (const [cls, grano] of Object.entries(GRANOS)) {
    const re = new RegExp(`<table class="bcr-estimaciones ${cls}[^"]*">([\\s\\S]*?)</table>`, "i");
    const m = html.match(re);
    if (!m) continue;
    const tbody = (m[1].match(/<tbody>([\s\S]*?)<\/tbody>/i) || [null, m[1]])[1];
    const rows = tbody.match(/<tr>([\s\S]*?)<\/tr>/gi) || [];
    for (const tr of rows) {
      const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => x[1]);
      if (tds.length < 4) continue;
      const campania = normCampania(stripTags(tds[0]));
      if (!campania) continue;
      // Cada celda de dato: el número está en el <strong>; el resto es la unidad.
      const cell = (td) => {
        const s = td.match(/<strong>([\s\S]*?)<\/strong>/i);
        return num(stripTags(s ? s[1] : td));
      };
      const area = cell(tds[1]); // Mha
      const rinde = cell(tds[2]); // qq/ha
      const prod = cell(tds[3]); // Mt
      out.push({ grano, campania, area, rinde, prod });
    }
  }
  return out;
}

/** Fecha del informe vigente + PDF + nº de informe del bloque "Informe de Estimación Mensual Nacional". */
function parseInforme(html) {
  const i = html.indexOf("Informe de Estimación Mensual Nacional");
  const scope = i >= 0 ? html.slice(i, i + 2500) : html;
  const pdf = scope.match(/href="([^"]*informe[^"]*\.pdf)"/i);
  const url = pdf ? pdf[1].replace(/^http:/, "https:") : PAGE;
  const nro = url.match(/informe[_-]especial[_-](\d+)/i);
  const texto = stripTags(scope);
  const fm = texto.match(/(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+de\s+(\d{4})/);
  let fecha = null;
  if (fm) {
    const mesNum = MESES[fm[2].toLowerCase()];
    if (mesNum) fecha = `${fm[3]}-${mesNum}-${fm[1].padStart(2, "0")}`;
  }
  return { fecha, url, nro: nro ? nro[1] : null };
}

/** HTML de estimaciones → filas normalizadas para la tabla (con fecha_publicacion = fecha del informe). */
function filasDe(html, fechaFallback) {
  const { fecha, url, nro } = parseInforme(html);
  const fechaPub = fecha || fechaFallback;
  if (!fechaPub) return [];
  const informe = nro ? `GEA mensual #${nro}` : "GEA mensual";
  const tablas = parseTablas(html);
  const out = [];
  for (const t of tablas) {
    const base = {
      organismo: "BCR",
      pais: "argentina",
      grano: t.grano,
      campania: t.campania,
      fecha_publicacion: fechaPub,
      informe,
      url,
    };
    if (t.prod != null) out.push({ ...base, variable: "produccion", valor: round2(t.prod), unidad: "Mt" });
    if (t.area != null) out.push({ ...base, variable: "area", valor: round2(t.area), unidad: "Mha" });
    if (t.rinde != null) out.push({ ...base, variable: "rinde", valor: round4(t.rinde / 10), unidad: "tn/ha" });
  }
  return out;
}

async function fetchText(url, timeout = 45000) {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return await res.text();
}

/* ---- Backfill vía Wayback CDX ---- */
async function snapshotsWayback(from, to) {
  const cdx =
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(
      "bcr.com.ar/es/mercados/gea/estimaciones-nacionales-de-produccion/estimaciones",
    )}&from=${from}&to=${to}&filter=statuscode:200&collapse=timestamp:6&fl=timestamp&output=text`;
  const txt = await fetchText(cdx, 60000);
  return txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

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

  let all = [];

  if (hasFlag("backfill")) {
    const from = arg("from", "20200101");
    const to = arg("to", new Date().toISOString().slice(0, 10).replace(/-/g, ""));
    console.log(`GEA backfill Wayback ${from} → ${to}`);
    const stamps = await snapshotsWayback(from, to);
    console.log(`  ${stamps.length} snapshots`);
    for (const ts of stamps) {
      try {
        const html = await fetchText(
          `https://web.archive.org/web/${ts}/https://www.bcr.com.ar/es/mercados/gea/estimaciones-nacionales-de-produccion/estimaciones`,
          60000,
        );
        // fallback de fecha: el timestamp del snapshot (YYYYMMDD) si no se pudo leer la del informe.
        const fb = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
        const rows = filasDe(html, fb);
        console.log(`  ${ts}: ${rows.length} filas`);
        all.push(...rows);
      } catch (e) {
        console.log(`  ${ts}: ERROR ${e.message}`);
      }
    }
  } else {
    const html = await fetchText(PAGE);
    const rows = filasDe(html, new Date().toISOString().slice(0, 10));
    console.log(`GEA vigente: ${rows.length} filas`);
    all.push(...rows);
  }

  all = dedup(all);
  console.log(`Total ${all.length} filas.`);

  if (outFile) {
    writeFileSync(outFile, JSON.stringify(all, null, 0));
    console.log(`Escrito ${outFile} (dry-run, no se subió nada).`);
    return;
  }
  if (all.length === 0) {
    // Backfill Wayback: un rango sin snapshots parseables es legítimo → return blando.
    // Live (cron): 0 filas = cambió el HTML de BCR-GEA o hay un interstitial. Falla ruidoso para
    // NO congelar en silencio (fue exactamente lo que dejó a GEA clavado en feb-2026).
    if (!hasFlag("backfill")) {
      console.error("ERROR: GEA live devolvió 0 filas — cambió el HTML de BCR-GEA o hay un interstitial. No se congela en silencio.");
      process.exit(1);
    }
    console.log("Sin filas — nada que subir.");
    return;
  }
  console.log("Upsert a estimaciones_produccion...");
  await upsert(all);
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
