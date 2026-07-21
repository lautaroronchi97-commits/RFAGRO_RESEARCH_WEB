#!/usr/bin/env node
/**
 * Carga MANUAL de la serie histórica semanal de comercialización de granos (farmer selling) a
 * Supabase (tabla `compras`), a partir de un export de Agrochat (Bolsa de Cereales) en CSV o .xlsx.
 *
 * Por qué carga manual y no scraping
 * ----------------------------------
 * La historia semanal de compras por campaña NO está disponible para scrapear: MAGyP dio de baja el
 * dataset CKAN (11/06/2026) y su página institucional sólo publica la foto vigente (las fotos
 * semanales viejas están 404; Wayback devolvió 0 capturas). La única forma de reconstruir la SERIE
 * es Agrochat, que exporta a pedido cualquier período/corte (misma base SIO-Granos que MAGyP —
 * verificado 1:1: trigo 25/26 Exportador = 16.238.900 tn coincide con el scrape directo). Patrón
 * `cargar_compras.py` de LineUps_Code. El scraper `ingest-compras.mjs` sigue manteniendo el dato
 * VIVO hacia adelante; esto carga la HISTORIA de una vez.
 *
 * El parseo (formato del export, mapeos grano/sector, CSV+xlsx, guard anti falso-verde) vive en
 * `src/lib/compras/parse-agrochat.ts` — el mismo módulo que usa el uploader admin (/admin/datos).
 * Antes este script reimplementaba toda esa lógica a mano (dos copias que ya divergieron una vez en
 * producción: el fix de floats con punto decimal del 20/07 hubo que aplicarlo en los dos lados por
 * separado — auditoría E4, hallazgo #2). Ahora importa el parser real: una sola fuente de verdad.
 *
 * Uso:
 *   node scripts/cargar-compras.mjs --in serie.csv --out filas.json   # dry-run: no sube nada
 *   node scripts/cargar-compras.mjs --in serie.csv                    # upsert a Supabase
 *   node scripts/cargar-compras.mjs --in serie.csv --replace-legacy   # + borra las filas fuente='LEGACY'
 *
 * Requiere (salvo en modo --out): SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; nunca en la web).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parseAgrochat } from "../src/lib/compras/parse-agrochat.ts";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

async function sbFetch(path, init) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path}: HTTP ${res.status} ${await res.text()}`);
  return res;
}

async function upsert(rows) {
  const BATCH = 1000;
  const conflict = "campana,codigo_interno,sector,fecha";
  for (let i = 0; i < rows.length; i += BATCH) {
    await sbFetch(`compras?on_conflict=${conflict}`, {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows.slice(i, i + BATCH)),
    });
    console.log(`  upsert ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
}

async function main() {
  const inFile = arg("in");
  const outFile = arg("out");
  if (!inFile) {
    console.error("Falta --in <csv o xlsx>.");
    process.exit(1);
  }
  if (!outFile && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY (o usá --out para dry-run).");
    process.exit(1);
  }

  const datos = readFileSync(inFile);
  const r = parseAgrochat(datos, inFile);
  if (!r.ok) {
    console.error(`ERROR: ${r.error}`);
    process.exit(1);
  }
  console.log(
    `Archivo: ${r.totalCrudas} filas crudas → ${r.filas.length} válidas ` +
      `(${r.descartadas} descartadas, ${r.duplicadas} duplicadas).`,
  );
  for (const a of r.advertencias) console.log(`  ⚠ ${a}`);

  const filas = r.filas;

  if (outFile) {
    writeFileSync(outFile, JSON.stringify(filas, null, 0));
    console.log(`Escrito ${outFile} (dry-run, no se subió nada).`);
    return;
  }

  if (hasFlag("replace-legacy")) {
    console.log("Borrando filas fuente='LEGACY'...");
    await sbFetch(`compras?fuente=eq.LEGACY`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  }
  console.log("Upsert a compras...");
  await upsert(filas);

  // Refrescar SOLO la matview del avance (RPC liviana: refrescar las 4 series juntas excede el statement
  // timeout de PostgREST — fue lo que hizo fallar el primer run tras cargar los datos).
  console.log("Refrescando compras_avance_hist...");
  await sbFetch("rpc/refresh_compras_avance", { method: "POST", headers: { prefer: "return=minimal" }, body: "{}" });
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
