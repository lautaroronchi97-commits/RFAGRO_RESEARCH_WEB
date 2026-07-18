#!/usr/bin/env node
/**
 * Ingesta del Line Up de buques de ISA Agents a Supabase (tabla `lineup`).
 *
 * IMPORTANTE — por qué este script NO scrapea ISA directamente:
 *   ISA bloquea las IPs de los runners de GitHub Actions (devuelven la tabla vacía
 *   → "falso verde" que congeló el scraper viejo). La descarga+parseo la hace la
 *   Edge Function `lineup-ingest` de Supabase, que corre en sa-east-1 (São Paulo),
 *   una IP que ISA sí acepta. Este script solo la DISPARA una vez por fecha y
 *   chequea el resultado (la función hace el upsert idempotente en la base).
 *
 * Modos:
 *   node scripts/ingest-lineup.mjs                    → hoy + 2 días previos (ART) — cron diario
 *   node scripts/ingest-lineup.mjs --from A --to B    → backfill de un rango (una fecha por request)
 *   node scripts/ingest-lineup.mjs --date YYYY-MM-DD  → una sola fecha
 *
 * Requiere en el entorno (NO en el repo):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; la función exige ese rol para escribir).
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : undefined;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ART = UTC-3 fijo (Argentina no tiene DST). La fecha de calendario ART de un
// instante es la fecha UTC de (ahora − 3h).
function isoDiasAtrasART(n) {
  return new Date(Date.now() - 3 * 3600_000 - n * 86_400_000).toISOString().slice(0, 10);
}
function rango(from, to) {
  const out = [];
  let d = from;
  while (d <= to) {
    out.push(d);
    const x = new Date(`${d}T00:00:00Z`);
    x.setUTCDate(x.getUTCDate() + 1);
    d = x.toISOString().slice(0, 10);
  }
  return out;
}

/** Dispara la Edge Function para una fecha. Reintenta ante 5xx / límite de compute. */
async function ingestarFecha(fecha, retries = 2) {
  const url = `${SUPABASE_URL}/functions/v1/lineup-ingest?date=${fecha}`;
  let ultimo = "";
  for (let intento = 0; intento <= retries; intento++) {
    let res, body;
    try {
      res = await fetch(url, {
        headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
      });
      body = await res.json().catch(() => ({}));
    } catch (e) {
      ultimo = String(e);
      if (intento < retries) { await sleep(3000 * (intento + 1)); continue; }
      throw new Error(`ingest ${fecha}: ${ultimo}`);
    }
    if (res.ok && body.ok) {
      const r = (body.results && body.results[0]) || {};
      return { fecha, count: r.count ?? 0, empty: !!r.empty };
    }
    ultimo = `HTTP ${res.status} ${JSON.stringify(body)}`;
    if (intento < retries) { await sleep(3000 * (intento + 1)); continue; }
    throw new Error(`ingest ${fecha}: ${ultimo}`);
  }
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY en el entorno.");
    process.exit(1);
  }
  const date = arg("date");
  const from = arg("from");
  const to = arg("to");

  let fechas;
  const diario = !date && !from;
  if (date) fechas = [date];
  else if (from) fechas = rango(from, to || isoDiasAtrasART(0));
  else fechas = [isoDiasAtrasART(0), isoDiasAtrasART(1), isoDiasAtrasART(2)];

  console.log(`Ingesta line-up (${diario ? "diario" : "backfill"}): ${fechas.length} fecha(s) [${fechas[0]} → ${fechas[fechas.length - 1]}]`);

  let total = 0;
  for (const f of fechas) {
    const r = await ingestarFecha(f);
    total += r.count;
    console.log(`  ${f}: ${r.empty ? "vacío (fin de semana/feriado/sin publicar)" : `${r.count} filas`}`);
    await sleep(1500); // cortesía con ISA entre fechas
  }

  // Guard anti "falso verde": en modo diario la ventana entera vacía es sospechosa
  // (bloqueo de IP / cambio de estructura), no un feriado suelto → falla ruidoso.
  if (diario && total === 0) {
    console.error("ERROR: 0 filas de line-up en la ventana diaria (hoy + 2 días). No se da por bueno (probable bloqueo/estructura).");
    process.exit(1);
  }
  console.log(`OK — ${total} filas upserteadas en total.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
