#!/usr/bin/env node
/**
 * Ingesta del histórico de pizarra de la Cámara Arbitral de Cereales de Rosario
 * (CAC-BCR) a Supabase. Guarda $/tn y US$/tn por grano y día.
 *
 * Fuente: consulta histórica oficial de CAC (sin auth):
 *   GET https://www.cac.bcr.com.ar/es/precios-de-pizarra/consultas
 *       ?product={id}&type={any|estimativo}&period=day&date_start=&date_end=
 *   La serie viene embebida en el JSON de `drupalSettings` de la página:
 *   settings.app_prices.plot.data = [{ x: 'YYYY-MM-DD', y: <ARS/tn>, y_usd: <US$/tn> }, ...]
 *   El US$ lo calcula la propia CAC con el dólar BNA divisa comprador.
 * Destino: tabla public.pizarra_historico (upsert por grano+fecha vía PostgREST).
 *
 * Sirve para las dos cosas:
 *   - Backfill:     node scripts/ingest-pizarra.mjs --from 2020-01-01 --to 2026-07-09
 *   - Cron diario:  node scripts/ingest-pizarra.mjs            (ventana móvil de N días)
 *
 * Requiere en el entorno (NO en el repo):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; solo en el cron, nunca en la web)
 *
 * Nota: CAC deja de embeber la serie si el rango es muy grande (> ~3 años) → el
 * script parte el rango en ventanas de 2 años.
 */

const BASE = "https://www.cac.bcr.com.ar/es/precios-de-pizarra/consultas";
// id de producto en CAC → nombre de grano que guardamos
const PRODUCTS = [
  { grano: "soja", pid: 13 },
  { grano: "maiz", pid: 3 },
  { grano: "trigo", pid: 8 },
  { grano: "girasol", pid: 9 },
  { grano: "sorgo", pid: 6 },
];
const UA = "Mozilla/5.0 (RFAGRO research)";
const VENTANA_ANIOS = 2; // CAC no embebe la serie en rangos muy amplios

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
function iso(d) {
  return d.toISOString().slice(0, 10);
}
function isoDaysAgo(days) {
  return iso(new Date(Date.now() - days * 86400000));
}

/** Parte [from, to] en ventanas de `anios` años. */
function ventanas(from, to, anios = VENTANA_ANIOS) {
  const out = [];
  let start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (start <= end) {
    const stop = new Date(
      Math.min(
        Date.UTC(start.getUTCFullYear() + anios, start.getUTCMonth(), start.getUTCDate() - 1),
        end.getTime(),
      ),
    );
    out.push([iso(start), iso(stop)]);
    start = new Date(stop.getTime() + 86400000);
  }
  return out;
}

/** Extrae settings.app_prices.plot.data del HTML de la consulta. */
function parseSerie(html) {
  const m = html.match(
    /<script[^>]*data-drupal-selector="drupal-settings-json"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m) return [];
  let settings;
  try {
    settings = JSON.parse(m[1]);
  } catch {
    return [];
  }
  const data = settings?.app_prices?.plot?.data;
  return Array.isArray(data) ? data : [];
}

async function fetchSerie(pid, type, from, to) {
  const url = `${BASE}?product=${pid}&type=${type}&period=day&date_start=${from}&date_end=${to}`;
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`CAC pid=${pid} ${type} ${from}..${to}: HTTP ${res.status}`);
  return parseSerie(await res.text());
}

const num = (v) => (v == null || v === "" ? null : Number(v));

/** Trae la serie (type=any) + el set de fechas estimativas (type=estimativo). */
async function fetchGrano(grano, pid, from, to) {
  const filas = [];
  for (const [f, t] of ventanas(from, to)) {
    const [serie, estim] = await Promise.all([
      fetchSerie(pid, "any", f, t),
      fetchSerie(pid, "estimativo", f, t),
    ]);
    const estSet = new Set(estim.map((e) => e.x));
    for (const e of serie) {
      if (!e?.x) continue;
      const ars = num(e.y);
      const usd = num(e.y_usd);
      filas.push({
        grano,
        fecha: e.x,
        precio_ars: ars == null ? null : Math.round(ars * 100) / 100,
        precio_usd: usd == null ? null : Math.round(usd * 100) / 100,
        es_estimativo: estSet.has(e.x),
      });
    }
  }
  return filas;
}

async function upsert(rows) {
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pizarra_historico`, {
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
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY en el entorno.");
    process.exit(1);
  }
  const from = arg("from", isoDaysAgo(Number(arg("days", "10"))));
  const to = arg("to", isoDaysAgo(0));
  console.log(`Ingesta pizarra CAC ${from} → ${to}`);

  let all = [];
  for (const { grano, pid } of PRODUCTS) {
    const rows = await fetchGrano(grano, pid, from, to);
    console.log(`  ${grano}: ${rows.length} filas`);
    all.push(...rows);
  }
  // Guard anti "falso verde": en modo diario (ventana de 10 días, sin --from) 0 filas = CAC no trae
  // la serie (cambió el JSON de Drupal o cayó la fuente) → falla ruidoso en vez de verde vacío.
  if (all.length === 0 && !process.argv.includes("--from")) {
    console.error("ERROR: 0 filas de pizarra CAC en la ventana de 10 días. No se da por bueno (probable cambio de estructura / fuente caída).");
    process.exit(1);
  }
  console.log(`Upsert de ${all.length} filas...`);
  await upsert(all);
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
