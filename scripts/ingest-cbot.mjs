#!/usr/bin/env node
/**
 * Ingesta de cierres de futuros CBOT (Chicago) a Supabase: maíz (ZC), soja (ZS)
 * y trigo (ZW), por posición, desde 2020, acotado a ~12 meses previos al
 * vencimiento (posiciones comparables con A3, para ratios/spreads).
 *
 * Fuente: API interno de Barchart (sin login; requiere cookies + header x-xsrf).
 *   1) GET /futures/quotes/{SYM}/overview  → setea cookie XSRF-TOKEN (sirve para todos los símbolos)
 *   2) GET /proxies/core-api/v1/historical/get?symbol=&fields=&type=eod&order=&startDate=&endDate=
 * Precios en formato fraccionario CBOT (¢/bushel en octavos): "565-2" = 565 + 2/8 = 565.25.
 * Guardamos el ¢/bu crudo (settlement_cents) y la conversión a USD/tonelada:
 *   maíz  × 0.3936826  (56 lb/bu → 39.36826 bu/tn)
 *   soja  × 0.3674371  (60 lb/bu → 36.74371 bu/tn)   [verificado: U.S. Grains Council / CME]
 *   trigo × 0.3674371
 * `lastPrice` en días liquidados = settlement (la fila del día en curso es intradía → se descarta).
 * Destino: tabla public.cbot_cierres (upsert por symbol+fecha vía PostgREST).
 *
 * Uso:
 *   - Backfill:    node scripts/ingest-cbot.mjs --backfill [--from-year 2020]
 *   - Cron diario: node scripts/ingest-cbot.mjs            (posiciones vivas, últimos días)
 *
 * Requiere en el entorno (NO en el repo):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; solo en el cron, nunca en la web)
 */

const OVERVIEW = (s) => `https://www.barchart.com/futures/quotes/${s}/overview`;
const CORE = "https://www.barchart.com/proxies/core-api/v1/historical/get";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const FIELDS = "tradeTime.format(Y-m-d),openPrice,highPrice,lowPrice,lastPrice,volume,openInterest";

// Factor ¢/bushel → USD/tonelada por grano (peso legal del bushel: maíz 56 lb, soja/trigo 60 lb).
const ROOTS = [
  { root: "ZC", grano: "maiz", factor: 0.3936826, months: ["H", "K", "N", "U", "Z"] },
  { root: "ZW", grano: "trigo", factor: 0.3674371, months: ["H", "K", "N", "U", "Z"] },
  { root: "ZS", grano: "soja", factor: 0.3674371, months: ["F", "H", "K", "N", "Q", "U", "X"] },
];
const MONTH_CODE = { F: 1, G: 2, H: 3, J: 4, K: 5, M: 6, N: 7, Q: 8, U: 9, V: 10, X: 11, Z: 12 };
const MES_ES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const MESES_VENTANA = 12; // meses previos al vto que guardamos (comparable con A3)
const DESDE = "2020-01-01";
const PAUSA_MS = 1500; // entre requests: Barchart limita por rate (HTTP 429) si vas muy rápido
const REINTENTOS_MS = [5000, 10000, 20000, 40000]; // backoff ante 429/5xx

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (d) => d.toISOString().slice(0, 10);
const hoyISO = iso(new Date());

function has(flag) {
  return process.argv.includes(`--${flag}`);
}
function opt(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

/** "565-2" → 565.25 (octavos); "1630-0" → 1630; null/"" → null. */
function frac(s) {
  if (s == null || s === "" || s === "N/A") return null;
  let t = String(s).trim();
  const neg = t.startsWith("-");
  if (neg) t = t.slice(1);
  const parts = t.split("-");
  let v = Number(parts[0]);
  if (parts.length > 1 && parts[1] !== "") v += Number(parts[1]) / 8;
  if (!Number.isFinite(v)) return null;
  return neg ? -v : v;
}
/** "2,320" → 2320. */
function intNum(s) {
  if (s == null || s === "") return null;
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseSym(sym) {
  const root = sym.slice(0, 2);
  const mnum = MONTH_CODE[sym.slice(2, 3)];
  const year = 2000 + Number(sym.slice(3));
  return { root, mnum, year };
}
function posLabel(sym) {
  const { mnum, year } = parseSym(sym);
  return `${MES_ES[mnum - 1]}${String(year).slice(2)}`;
}
function mesDate(sym) {
  const { mnum, year } = parseSym(sym);
  return `${year}-${String(mnum).padStart(2, "0")}-01`;
}

async function auth() {
  const res = await fetch(OVERVIEW("ZCZ26"), {
    headers: { "user-agent": UA, accept: "text/html" },
    signal: AbortSignal.timeout(20000),
  });
  const jar = {};
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const p = c.split(";")[0];
    const i = p.indexOf("=");
    if (i > 0) jar[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  }
  const xsrf = jar["XSRF-TOKEN"] ? decodeURIComponent(jar["XSRF-TOKEN"]) : null;
  if (!xsrf) throw new Error("Barchart: no vino la cookie XSRF-TOKEN");
  return {
    xsrf,
    cookie: Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join("; "),
  };
}

async function fetchContract(sym, sess, startDate, endDate) {
  const url = new URL(CORE);
  url.search = new URLSearchParams({
    symbol: sym,
    fields: FIELDS,
    type: "eod",
    limit: "1000",
    order: "asc",
    startDate,
    endDate,
  }).toString();
  // Barchart limita por rate (HTTP 429) en rachas → reintento con backoff creciente.
  for (let intento = 0; ; intento++) {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "application/json",
        referer: OVERVIEW(sym),
        "x-xsrf-token": sess.xsrf,
        cookie: sess.cookie,
      },
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      const json = await res.json();
      return Array.isArray(json?.data) ? json.data : [];
    }
    if ((res.status === 429 || res.status >= 500) && intento < REINTENTOS_MS.length) {
      await sleep(REINTENTOS_MS[intento]); // esperá a que se libere el rate window
      continue;
    }
    throw new Error(`Barchart ${sym}: HTTP ${res.status}`);
  }
}

function toRow(r, meta, sym, mes) {
  const settle = frac(r.lastPrice);
  return {
    symbol: sym,
    fecha: r.tradeTime,
    root: meta.root,
    grano: meta.grano,
    posicion: posLabel(sym),
    mes,
    settlement_cents: settle,
    settlement_usd_tn: settle == null ? null : Math.round(settle * meta.factor * 100) / 100,
    open_cents: frac(r.openPrice),
    high_cents: frac(r.highPrice),
    low_cents: frac(r.lowPrice),
    volume: intNum(r.volume),
    open_interest: intNum(r.openInterest),
  };
}

/** Ventana [start, end] de un contrato: 12 meses previos al mes de entrega. */
function ventana(sym) {
  const { mnum, year } = parseSym(sym);
  const entrega = new Date(Date.UTC(year, mnum - 1, 1));
  const start = new Date(Date.UTC(year, mnum - 1 - MESES_VENTANA, 1));
  const end = new Date(Date.UTC(year, mnum, 0)); // último día del mes de entrega
  const startISO = iso(start) < DESDE ? DESDE : iso(start);
  return { startISO, endISO: iso(end), entrega: iso(entrega) };
}

/** Lista de símbolos a procesar. `soloVivos`: solo posiciones dentro de la ventana hoy. */
function symbols(fromYear, soloVivos) {
  const out = [];
  const now = new Date();
  const yNow = now.getUTCFullYear();
  const toYear = yNow + 2;
  for (const { root, months } of ROOTS) {
    for (let y = fromYear; y <= toYear; y++) {
      for (const code of months) {
        const sym = `${root}${code}${String(y).slice(2)}`;
        const { startISO, endISO } = ventana(sym);
        if (endISO < DESDE) continue; // contrato terminó antes de nuestro rango
        if (startISO > hoyISO) continue; // todavía no arrancó a operar en ventana
        if (soloVivos && (endISO < hoyISO || startISO > hoyISO)) continue; // solo posiciones vivas hoy
        out.push({ sym, root });
      }
    }
  }
  return out;
}

async function upsert(rows) {
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cbot_cierres`, {
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
  const backfill = has("backfill");
  const fromYear = Number(opt("from-year", "2020"));
  const metaByRoot = Object.fromEntries(ROOTS.map((r) => [r.root, r]));
  const lista = symbols(backfill ? fromYear : new Date().getUTCFullYear(), !backfill);
  console.log(`CBOT ${backfill ? "backfill" : "diario"}: ${lista.length} contratos`);

  const sess = await auth();
  const all = [];
  let ok = 0;
  for (const { sym, root } of lista) {
    const { startISO, endISO } = ventana(sym);
    // En el diario alcanza con los últimos ~10 días; en backfill, toda la ventana.
    const start = backfill ? startISO : iso(new Date(Date.now() - 10 * 86400000));
    try {
      const raw = await fetchContract(sym, sess, start, endISO);
      const mes = mesDate(sym);
      const rows = raw
        .map((r) => toRow(r, metaByRoot[root], sym, mes))
        .filter((r) => r.fecha && r.fecha < hoyISO && r.settlement_cents != null); // descarta intradía de hoy
      all.push(...rows);
      if (rows.length) ok++;
    } catch (e) {
      console.error(`  ${sym}: ${e.message}`);
    }
    await sleep(PAUSA_MS);
  }
  // dedup por (symbol, fecha)
  const seen = new Set();
  const dedup = all.filter((r) => {
    const k = `${r.symbol}|${r.fecha}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  console.log(`Contratos con datos: ${ok}. Upsert de ${dedup.length} filas...`);
  await upsert(dedup);
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
