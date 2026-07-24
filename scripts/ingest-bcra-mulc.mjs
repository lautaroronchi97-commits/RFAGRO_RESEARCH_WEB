#!/usr/bin/env node
/**
 * Ingesta de las compras netas de divisas del BCRA en el MULC a Supabase (C4 del backlog
 * maestro, research en docs/negocio/07_fuente_compras_netas_bcra.md).
 *
 * Fuente: API v4 de estadísticas monetarias del BCRA, sin auth:
 *   GET https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/78?desde=&hasta=&limit=&offset=
 *   Variable 78 = "Variación de reservas internacionales por compra de divisas" (M USD/día
 *   hábil). Verificado (docs/negocio/07): es la compra neta al SECTOR PRIVADO (el MULC), NO
 *   mezcla operaciones con el Tesoro. Historia completa desde 2003-01-02. Llega con ~3-4 días
 *   hábiles de rezago (es la planilla "Series.xlsm" que el BCRA publica con ese atraso estándar).
 * Destino: tabla public.compras_bcra (fecha PK, monto_musd, fuente) — upsert por fecha con
 * fuente='api'. Si esa fecha tenía una carga MANUAL (admin/datos), la corrida automática la pisa
 * cuando la oficial llega — decisión de diseño explícita desde que se creó la tabla (MP1,
 * migración 20260722120000): la oficial es siempre la autoridad final.
 *
 * Uso:
 *   node scripts/ingest-bcra-mulc.mjs             # ventana móvil de 30 días (cron diario)
 *   node scripts/ingest-bcra-mulc.mjs --backfill  # historia completa 2003→hoy (paginado)
 *
 * Requiere en el entorno (NO en el repo): SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role)
 */

const API = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/78";
const UA = "Mozilla/5.0 (ROFOAGRO research)";
const PAGE = 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function iso(d) {
  return d.toISOString().slice(0, 10);
}
function isoDaysAgo(days) {
  return iso(new Date(Date.now() - days * 86400000));
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`BCRA v4 var 78: HTTP ${res.status} — ${url}`);
  const json = await res.json();
  const detalle = json?.results?.[0]?.detalle;
  if (!Array.isArray(detalle)) throw new Error(`BCRA v4 var 78: estructura inesperada (falta results[0].detalle) — ${url}`);
  return { detalle, count: json?.metadata?.resultset?.count ?? detalle.length };
}

/** Ventana móvil (modo cron diario): trae lo que haya en [desde, hasta]. */
async function fetchVentana(desde, hasta) {
  const { detalle } = await fetchJson(`${API}?desde=${desde}&hasta=${hasta}&limit=${PAGE}`);
  return detalle;
}

/** Historia completa paginada (modo --backfill): 2 páginas de 3000 alcanzan hoy (~5.770 filas). */
async function fetchBackfillCompleto() {
  let offset = 0;
  const all = [];
  for (;;) {
    const { detalle, count } = await fetchJson(`${API}?limit=${PAGE}&offset=${offset}`);
    all.push(...detalle);
    offset += PAGE;
    if (detalle.length === 0 || offset >= count) break;
  }
  return all;
}

async function upsert(rows) {
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/compras_bcra`, {
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
  const backfill = process.argv.includes("--backfill");

  let detalle;
  if (backfill) {
    console.log("Backfill completo BCRA MULC (API v4, variable 78, 2003→hoy)...");
    detalle = await fetchBackfillCompleto();
  } else {
    const desde = isoDaysAgo(30);
    const hasta = isoDaysAgo(0);
    console.log(`Ingesta BCRA MULC (variable 78) ${desde} → ${hasta}`);
    detalle = await fetchVentana(desde, hasta);
  }

  // Guard anti falso-verde: 0 filas en la respuesta es distinto del rezago normal (que deja un
  // HUECO al final de la ventana, no una respuesta vacía) — 0 filas = la API cambió de formato o
  // está caída, no se da por bueno.
  if (detalle.length === 0) {
    console.error("ERROR: 0 filas de la API v4 (variable 78) del BCRA. No se da por bueno (probable cambio de formato / fuente caída).");
    process.exit(1);
  }

  const rows = detalle
    .filter((d) => d && typeof d.fecha === "string" && Number.isFinite(d.valor))
    .map((d) => ({ fecha: d.fecha, monto_musd: d.valor, fuente: "api" }));

  console.log(`Upsert de ${rows.length} filas (fuente=api)...`);
  await upsert(rows);
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
