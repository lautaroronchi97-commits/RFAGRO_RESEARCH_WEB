#!/usr/bin/env node
/**
 * Ingesta de cierres de futuros de granos (A3/Matba ROFEX) desde el CEM a Supabase.
 *
 * Fuente: CEM (API pública, sin auth) — https://apicem.matbarofex.com.ar
 *   GET /api/v2/closing-prices?product={p}&from=&to=&page=&pageSize=&sortDir=ASC
 * Destino: tabla public.futuros_cierres (upsert por symbol+fecha vía PostgREST).
 *
 * Sirve para las dos cosas:
 *   - Backfill inicial:  node scripts/ingest-cierres.mjs --from 2021-07-01 --to 2026-07-04
 *   - Cron diario:       node scripts/ingest-cierres.mjs            (últimos N días)
 *
 * Requiere en el entorno (NO en el repo):
 *   SUPABASE_URL           = https://<proyecto>.supabase.co
 *   SUPABASE_SERVICE_KEY   = service_role key (escritura; solo en el cron, nunca en la web)
 */

const CEM = "https://apicem.matbarofex.com.ar/api/v2/closing-prices";
const PRODUCTS = ["SOJ Dolar MATba", "MAI Dolar MATba", "TRI Dolar MATba"];
const PAGE_SIZE = 500;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

/** Parte [from, to] en ventanas de `dias` días (el CEM da HTTP 424 con rangos muy amplios). */
function ventanas(from, to, dias = 180) {
  const out = [];
  let start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (start <= end) {
    const stop = new Date(Math.min(start.getTime() + (dias - 1) * 86400000, end.getTime()));
    out.push([start.toISOString().slice(0, 10), stop.toISOString().slice(0, 10)]);
    start = new Date(stop.getTime() + 86400000);
  }
  return out;
}

/** Trae todas las páginas de un producto en una ventana de fechas. */
async function fetchWindow(product, from, to) {
  const rows = [];
  for (let page = 1; ; page++) {
    const url = new URL(CEM);
    url.search = new URLSearchParams({
      product,
      type: "FUT", // solo futuros (excluye opciones en origen → mucho más rápido)
      from,
      to,
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortDir: "ASC",
    }).toString();
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`CEM ${product} ${from}..${to} p${page}: HTTP ${res.status}`);
    const json = await res.json();
    const data = Array.isArray(json?.data) ? json.data : [];
    rows.push(...data);
    if (data.length < PAGE_SIZE) break; // última página de la ventana
  }
  return rows;
}

/** Trae todas las páginas de un producto en el rango dado (partido en ventanas). */
async function fetchProduct(product, from, to) {
  const rows = [];
  for (const [f, t] of ventanas(from, to)) {
    rows.push(...(await fetchWindow(product, f, t)));
  }
  return rows;
}

/** Mapea una fila del CEM al esquema de la tabla. */
function toRow(r) {
  const symbol = r.symbol ?? "";
  return {
    symbol,
    fecha: (r.dateTime ?? "").slice(0, 10),
    producto: r.product ?? null,
    underlying: symbol.split(".")[0] || null,
    posicion: symbol.includes("/") ? symbol.split("/")[1] : null,
    settlement: r.settlement ?? null,
    previous_close: r.previousClose ?? null,
    open: r.open ?? null,
    high: r.high ?? null,
    low: r.low ?? null,
    close: r.close ?? null,
    volume: r.volume ?? null,
    trade_count: r.tradeCount ?? null,
    open_interest: r.openInterest ?? null,
    oi_change: r.openInterestChange ?? null,
    change: r.change ?? null,
    change_percent: r.changePercent ?? null,
    implied_rate: r.impliedRate ?? null,
  };
}

/** Upsert por lotes a Supabase (PostgREST, merge-duplicates por PK symbol+fecha). */
async function upsert(rows) {
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/futuros_cierres`, {
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
  const from = arg("from", isoDaysAgo(Number(arg("days", "7"))));
  const to = arg("to", isoDaysAgo(0));
  console.log(`Ingesta cierres granos ${from} → ${to}`);

  let all = [];
  for (const product of PRODUCTS) {
    const rows = await fetchProduct(product, from, to);
    console.log(`  ${product}: ${rows.length} filas`);
    // Excluir OPCIONES: el filtro por producto también trae opciones, cuyo símbolo
    // lleva strike + C/P con espacio (ej. "SOJ.ROS/NOV26 336 C"). Solo futuros puros.
    all.push(...rows.map(toRow).filter((r) => r.symbol && r.fecha && !r.symbol.includes(" ")));
  }
  // dedup por (symbol, fecha) por si el CEM repite
  const seen = new Set();
  all = all.filter((r) => {
    const k = `${r.symbol}|${r.fecha}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  console.log(`Upsert de ${all.length} filas...`);
  await upsert(all);
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
