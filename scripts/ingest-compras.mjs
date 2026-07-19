#!/usr/bin/env node
/**
 * Ingesta de COMPRAS de granos (farmer selling) del MAGyP a Supabase (tabla `compras`).
 * Componente "farmer selling" del índice de temperatura MESA (Fase 4 — docs/PLAN_PUERTOS.md §5).
 *
 * Por qué este scraper y no el viejo
 * ----------------------------------
 * El scraper anterior (LineUps_Code `update_compras.py`) bajaba el dataset CKAN
 * `datos.magyp.gob.ar/dataset/compras-de-granos`, que MAGyP DIO DE BAJA (404) → por eso la
 * tabla `compras` se congeló el 11/06/2026 (no fue bloqueo de IP). El dato sigue vivo en la
 * página institucional de MAGyP "Compras y DJVE de Granos", server-rendered en HTML (widget
 * Spry TabbedPanels: un panel por grano). Detalle y matriz de fuentes en
 * docs/negocio/06_fuentes_comercializacion_granos.md.
 *
 * Fuente (alcanzable desde Actions; los subdominios sio-granos.* / monitorsiogranos.* NO):
 *   https://www.magyp.gob.ar/.../000058_Estadísticas/000020_Compras y DJVE de Granos.php
 *   7 paneles (trigo · maíz · sorgo · cebada cervecera · cebada forrajera · soja · girasol);
 *   cada uno una tabla con, por SECTOR (Exportador / Industria) y COSECHA (26/27, 25/26, 24/25…):
 *     Semanal · Total Comprado · Total Precio Hecho · Total a Fijar · Total Fijado · Saldo a Fijar · DJVE.
 *   Valores en MILES DE TONELADAS (kt) → se guardan en toneladas (×1000).
 *   La fila entre paréntesis debajo de cada campaña es el comparativo a la misma fecha del año
 *   anterior → se ignora en la ingesta (es contexto visual del informe).
 *
 * Cada snapshot semanal es una observación (fecha = "AL DD/MM/YYYY" del informe, por sector). El
 * upsert es idempotente por (campana, codigo_interno, sector, fecha) — igual que compras.sql.
 *
 * BACKFILL (--backfill): reconstruye la serie semanal histórica desde la Wayback Machine (CDX API)
 * de la MISMA página. Wayback corre desde Actions (acá el sandbox lo bloquea por egress policy).
 * La cobertura de Wayback no está garantizada; el índice MESA degrada solo si la pata farmer no
 * junta ≥2 campañas (así lo hace LineUps_Code).
 *
 * Uso:
 *   node scripts/ingest-compras.mjs                    # cron: el snapshot vigente
 *   node scripts/ingest-compras.mjs --backfill         # Wayback 2020→hoy (serie semanal archivada)
 *   node scripts/ingest-compras.mjs --backfill --from 20200101 --to 20261231
 *   node scripts/ingest-compras.mjs --out filas.json   # dry-run: escribe JSON, no sube nada
 *
 * Requiere en el entorno (NO en el repo), salvo en modo --out:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; solo en el cron, nunca en la web)
 */

import { writeFileSync } from "node:fs";

const PAGE =
  "https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/areas/granos/_archivos/" +
  "000058_Estad%C3%ADsticas/000020_Compras%20y%20DJVE%20de%20Granos.php";
// URL "desnuda" (sin esquema) para la CDX de Wayback.
const PAGE_BARE =
  "www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/areas/granos/_archivos/" +
  "000058_Estadísticas/000020_Compras y DJVE de Granos.php";

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

// Panel de grano (comentario `<!-- TabbedPanelsContent {label}-->`) → codigo_interno del resto de la web.
const PANEL_A_CODIGO = {
  trigo: "WHEAT",
  maiz: "MAIZE",
  sorgo: "SORGHUM",
  "ceb cervecera": "MALT",
  "ceb forrajera": "BARLEY",
  soja: "SBS",
  girasol: "SFSEED",
};

const SECTOR_EXPORTACION = "EXPORTACION";
const SECTOR_INDUSTRIA = "INDUSTRIA";

/** "16.238,9" (miles con punto, coma decimal) → número. "(*)" / "-" / vacío → null. */
function num(s) {
  if (s == null) return null;
  let t = String(s).replace(/\(\*\)/g, "").trim();
  if (t === "" || t === "-" || t === "s/d") return null;
  t = t.replace(/\./g, "").replace(",", ".");
  if (!/\d/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Texto plano de un fragmento HTML (con las entidades que usa el sitio MAGyP). */
function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&iacute;/g, "í").replace(/&aacute;/g, "á").replace(/&eacute;/g, "é")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "DD/MM/YYYY" dentro de un texto → ISO "YYYY-MM-DD". null si no hay. */
function fechaISO(texto) {
  const m = String(texto).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** "26/27" → "2026/27" (formato campaña del resto de la web). */
function campaniaLarga(cos) {
  const m = String(cos).trim().match(/^(\d{2})\/(\d{2})$/);
  if (!m) return null;
  return `20${m[1]}/${m[2]}`;
}

/** Celdas de texto de un `<tr>`. */
function celdas(tr) {
  return [...tr.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((x) => stripTags(x[1]));
}

/** ¿La celda es un rótulo de sector? Devuelve el sector normalizado o null. */
function sectorDe(txt) {
  const t = txt.toLowerCase();
  if (t.includes("sector exportador") || t.includes("exportaci")) return SECTOR_EXPORTACION;
  if (t.includes("industria")) return SECTOR_INDUSTRIA;
  return null;
}

/**
 * Parsea la página de "Compras y DJVE de Granos" → filas por (grano, sector, campaña, fecha).
 * `fechaFallback` (ISO) se usa como `fecha` si un sector no trae su propio "AL DD/MM/YYYY".
 */
function parseCompras(html, fechaFallback = null) {
  const out = [];
  // Un bloque por panel de grano.
  const panelRe = /<!--\s*TabbedPanelsContent\s+([a-zñ ]+?)\s*-->([\s\S]*?)(?=<!--\s*TabbedPanelsContent|<\/div>\s*<!--\s*TabbedPanelsContentGroup|$)/gi;
  for (const pm of html.matchAll(panelRe)) {
    const label = pm[1].toLowerCase().trim();
    const codigo = PANEL_A_CODIGO[label];
    if (!codigo) continue;
    const tabla = pm[2].match(/<table[^>]*class="tabla"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tabla) continue;
    const trs = tabla[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

    let asOfPanel = null; // "AL DD/MM/YYYY" del encabezado del panel
    let sector = null; // sector vigente (rowspan)
    let asOfSector = null; // "AL DD/MM/YYYY" propio del sector si lo trae

    for (const tr of trs) {
      const c = celdas(tr);
      if (c.length === 0) continue;

      // Encabezado del panel: primera celda "Compras y DJVE AL DD/MM/YYYY".
      if (/compras y djve al/i.test(c[0])) {
        asOfPanel = fechaISO(c[0]);
        continue;
      }

      // Fila entre paréntesis (comparativo interanual): se ignora.
      if (/^\(/.test(c[0])) continue;

      // ¿La primera celda abre un sector? (puede traer su propio "AL DD/MM/YYYY").
      const s = sectorDe(c[0]);
      let cosechaIdx = 0;
      if (s) {
        sector = s;
        asOfSector = fechaISO(c[0]); // ej. "Compras de la Industria (AL 27/05/2026)"
        cosechaIdx = 1; // la campaña viene en la 2ª celda de esta misma fila
      } else if (/^total$/i.test(c[0].trim())) {
        // Fila "Total" (suma exportador+industria): se ignora para no duplicar.
        sector = null;
        continue;
      }

      if (!sector) continue;
      const cosecha = c[cosechaIdx];
      const campana = campaniaLarga(cosecha);
      if (!campana) continue;

      // Tras la campaña: Semanal, Total Comprado, Precio Hecho, a Fijar, Fijado, Saldo a Fijar, DJVE.
      const v = c.slice(cosechaIdx + 1).map(num);
      const [semanal, totalComprado, precioHecho, aFijar, fijado, saldoFijar, djve] = v;
      if (totalComprado == null && semanal == null) continue;

      const fecha = asOfSector || asOfPanel || fechaFallback;
      if (!fecha) continue;

      const kt = (x) => (x == null ? null : Math.round(x * 1000)); // kt → toneladas
      out.push({
        fecha,
        codigo_interno: codigo,
        grano_raw: label,
        campana,
        sector,
        semanal_tn: kt(semanal),
        toneladas: kt(totalComprado), // Total Comprado acumulado de la campaña
        precio_hecho_tn: kt(precioHecho),
        toneladas_a_fijar: kt(aFijar),
        fijado_tn: kt(fijado),
        saldo_a_fijar_tn: kt(saldoFijar),
        djve_tn: kt(djve),
      });
    }
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, timeout = 45000) {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return await res.text();
}

/**
 * fetch con reintentos para Wayback: su CDX y las capturas devuelven 429/503 transitorios seguido
 * (fue lo que tiró el 1er intento de backfill). Reintenta ante error de red o HTTP 429/5xx con backoff
 * 2/4/8/16s; los 4xx (salvo 429) no se reintentan.
 */
async function fetchTextRetry(url, { timeout = 60000, retries = 4 } = {}) {
  let ultimo = "";
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(timeout) });
      if (res.ok) return await res.text();
      ultimo = `HTTP ${res.status}`;
      if (res.status < 500 && res.status !== 429) throw new Error(`${ultimo} — ${url}`);
    } catch (e) {
      ultimo = String(e?.message ?? e);
    }
    if (i < retries) await sleep(2000 * 2 ** i);
  }
  throw new Error(`${ultimo} — ${url} (tras ${retries + 1} intentos)`);
}

/* ---- Backfill vía Wayback CDX (corre desde Actions; el sandbox lo bloquea) ---- */
async function snapshotsWayback(from, to) {
  const cdx =
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(PAGE_BARE)}` +
    `&from=${from}&to=${to}&filter=statuscode:200&collapse=timestamp:6&fl=timestamp&output=text`;
  const txt = await fetchTextRetry(cdx, { timeout: 60000, retries: 6 });
  return txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** Dedup por la clave lógica de la tabla (campana, codigo_interno, sector, fecha). */
function dedup(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const k = `${r.campana}|${r.codigo_interno}|${r.sector}|${r.fecha}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/** Proyecta al esquema actual de `compras` (columnas ricas nuevas van tras la migración). */
function aFilaDB(r) {
  return {
    fecha: r.fecha,
    grano_raw: r.grano_raw,
    codigo_interno: r.codigo_interno,
    campana: r.campana,
    sector: r.sector,
    toneladas: r.toneladas,
    toneladas_a_fijar: r.toneladas_a_fijar,
    precio_promedio_usd: null,
    porcentaje_cosecha: null,
  };
}

async function upsert(rows) {
  const BATCH = 1000;
  const conflict = "campana,codigo_interno,sector,fecha";
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map(aFilaDB);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/compras?on_conflict=${conflict}`, {
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
    console.log(`Compras backfill Wayback ${from} → ${to}`);
    const stamps = await snapshotsWayback(from, to);
    console.log(`  ${stamps.length} snapshots`);
    for (const ts of stamps) {
      try {
        const html = await fetchTextRetry(`https://web.archive.org/web/${ts}id_/${PAGE}`, { timeout: 60000, retries: 3 });
        const fb = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
        const rows = parseCompras(html, fb);
        console.log(`  ${ts}: ${rows.length} filas`);
        all.push(...rows);
      } catch (e) {
        console.log(`  ${ts}: ERROR ${e.message}`);
      }
    }
  } else {
    const html = await fetchText(PAGE);
    all = parseCompras(html);
    console.log(`Compras vigente: ${all.length} filas`);
  }

  all = dedup(all);
  console.log(`Total ${all.length} filas (dedup).`);

  if (outFile) {
    writeFileSync(outFile, JSON.stringify(all, null, 0));
    console.log(`Escrito ${outFile} (dry-run, no se subió nada).`);
    return;
  }
  if (all.length === 0) {
    // Live (cron): 0 filas = cambió el HTML de MAGyP o hay un interstitial. Falla ruidoso para NO
    // congelar en silencio (el modo exacto en que se rompió el scraper viejo).
    if (!hasFlag("backfill")) {
      console.error("ERROR: compras live devolvió 0 filas — cambió el HTML de MAGyP. No se congela en silencio.");
      process.exit(1);
    }
    console.log("Backfill sin filas parseables — nada que subir.");
    return;
  }
  console.log("Upsert a compras...");
  await upsert(all);
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
