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
    // L6 (Anexo A camino 3): antes `json?.data` no-array degradaba mudo a []. Una página
    // vacía real SIEMPRE trae `data: []` (verificado); si falta el campo o cambia de tipo es
    // shape roto, no "sin datos" — hay que enterarse, no seguir en verde.
    if (json == null || typeof json !== "object" || !Array.isArray(json.data)) {
      throw new Error(`CEM ${product} ${from}..${to} p${page}: shape inesperado (falta o cambió "data")`);
    }
    const data = json.data;
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
  const esDiario = !process.argv.includes("--from");
  for (const product of PRODUCTS) {
    const rows = await fetchProduct(product, from, to);
    console.log(`  ${product}: ${rows.length} filas`);
    // Excluir OPCIONES: el filtro por producto también trae opciones, cuyo símbolo
    // lleva strike + C/P con espacio (ej. "SOJ.ROS/NOV26 336 C"). Solo futuros puros.
    const filtradas = rows.map(toRow).filter((r) => r.symbol && r.fecha && !r.symbol.includes(" "));
    // E5 #6 (camino 2): guard POR PRODUCTO en el diario — la ventana cubre varias ruedas;
    // 0 filas de un grano = el nombre de producto cambió en el CEM o ese feed murió,
    // aunque los otros dos sigan vivos (antes eso quedaba verde con el grano congelado).
    if (esDiario && filtradas.length === 0) {
      console.error(`ERROR: 0 filas de "${product}" en la ventana diaria del CEM (¿cambió el nombre del producto?). No se da por bueno.`);
      process.exit(1);
    }
    all.push(...filtradas);
  }
  // dedup por (symbol, fecha) por si el CEM repite
  const seen = new Set();
  all = all.filter((r) => {
    const k = `${r.symbol}|${r.fecha}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Guard anti "falso verde": 0 filas totales (diario O backfill) = el CEM no devolvió nada para
  // el rango pedido → cambió el formato o cayó la fuente. Falla ruidoso, no pasa en verde.
  // (L6, Anexo A camino 1: antes el backfill con --from quedaba exento de este guard.)
  if (all.length === 0) {
    console.error("ERROR: 0 filas en la ventana del CEM. No se da por bueno (probable cambio de formato / fuente caída).");
    process.exit(1);
  }
  console.log(`Upsert de ${all.length} filas...`);
  await upsert(all);

  // E5 #9a: refrescar la tabla `vencimientos` desde el CEM (/api/v2/symbols, campo maturityDate).
  // El seed de la migración 20260708120000 era una foto única (moría en SEP27 y el CEM ya lista
  // DIC27). No fatal: los cierres ya están arriba; si esto falla lo agarra el healthcheck
  // (check "vencimientos con futuro suficiente").
  try {
    const n = await refreshVencimientos();
    console.log(`vencimientos: ${n} símbolos vivos upserteados.`);
  } catch (e) {
    console.log(`::warning::vencimientos: no se pudo refrescar desde el CEM — ${e.message}`);
  }
  console.log("OK");
}

/** Upsertea (symbol, vencimiento) de los futuros de grano USD vivos del CEM. */
async function refreshVencimientos() {
  const hoy = new Date().toISOString().slice(0, 10);
  const tope = `${Number(hoy.slice(0, 4)) + 5}${hoy.slice(4)}`; // +5 años (descarta placeholders 2050/2100)
  const rows = [];
  for (const product of PRODUCTS) {
    for (let page = 1; page <= 5; page++) {
      const url =
        `${CEM.replace("/closing-prices", "/symbols")}?securityType=FUT&product=${encodeURIComponent(product)}` +
        `&page=${page}&pageSize=1000`;
      const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`CEM symbols ${product} p${page}: HTTP ${res.status}`);
      const data = (await res.json())?.data ?? [];
      for (const s of data) {
        if (!s?.symbol || !s?.maturityDate) continue;
        if (s.symbol.includes(" ") || s.symbol.includes("/DIS")) continue; // ni opciones ni disponible
        if (s.maturityDate < hoy || s.maturityDate > tope) continue; // solo vivos y sanos
        const m = s.symbol.match(/^([A-Z]+)\.ROS\/([A-Z]{3}\d{2})$/);
        rows.push({
          symbol: s.symbol,
          underlying: m ? m[1] : null,
          posicion: m ? m[2] : null,
          vencimiento: s.maturityDate,
        });
      }
      if (data.length < 1000) break;
    }
  }
  if (rows.length === 0) throw new Error("0 símbolos vivos (¿cambió el endpoint?)");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vencimientos?on_conflict=symbol`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`upsert vencimientos: HTTP ${res.status} ${await res.text()}`);
  return rows.length;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
