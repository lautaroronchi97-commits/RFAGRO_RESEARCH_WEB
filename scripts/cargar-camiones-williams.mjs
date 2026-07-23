#!/usr/bin/env node
/**
 * Carga MANUAL del backfill de camiones en puerto (tabla `camiones`) a partir de los exports de
 * Williams Entregas (vía Agrochat) versionados en `data/camiones/`.
 *
 * Por qué carga manual (y para siempre, no un parche temporal)
 * --------------------------------------------------------------
 * Williams Entregas es un servicio B2B PAGO (williamsagroservicios.com.ar/entregas/), sin API ni
 * dashboard público — Agrochat lo tiene contratado y Lautaro exporta desde ahí cuando le queda
 * cómodo. No hay nada para scrapear. `docs/negocio/08_fuente_camiones_puerto.md` y
 * `docs/negocio/09_camiones_vs_lineup_senal.md` documentan el research original (que consideraba
 * SAGyP/MAGyP como fuente automática) — SUPERADO 23/07/2026: Williams SÍ discrimina por producto
 * (confirmado con los CSV reales de maíz/soja/trigo), así que no hace falta ninguna fuente
 * automática: zona Y producto salen de acá.
 *
 * El parseo (CSV de zonas o de localidades, detección de formato, sin dependencias) vive en
 * `src/lib/camiones/williams.ts` — el MISMO módulo que usa la server action del uploader de
 * /admin/datos (pestaña Camiones). Una sola fuente de verdad para el parser (patrón
 * cargar-compras.mjs / parse-agrochat.ts).
 *
 * Uso:
 *   node scripts/cargar-camiones-williams.mjs --all
 *     Carga los 4 CSV conocidos de data/camiones/ (total/maíz/soja/trigo) + imprime el cross-check
 *     de cobertura del CSV de localidades contra Gran Rosario/Bahía Blanca.
 *   node scripts/cargar-camiones-williams.mjs --in data/camiones/foo.csv --producto SFSEED
 *     Carga un archivo puntual (para cuando Lautaro consiga girasol/sorgo/cebada).
 *   node scripts/cargar-camiones-williams.mjs --all --out /tmp/dryrun   # dry-run: no sube nada
 *
 * Requiere (salvo en modo --out): SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; nunca en la web).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parseCamionesUpload, crossCheckLocalidades } from "../src/lib/camiones/williams.ts";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

// Los 4 exports versionados en el repo (backfill 2018-01-02 → 2026-07-22, negocio/09 §pivot 23/07).
// Girasol/sorgo/cebada quedan afuera hasta que Lautoro consiga esos exports de Agrochat (--in/--producto).
const ARCHIVOS_CONOCIDOS = [
  { file: "data/camiones/williams_camiones_zonas_2018_2026.csv", producto: "TOTAL" },
  { file: "data/camiones/williams_camiones_zonas_maiz_2018_2026.csv", producto: "MAIZE" },
  { file: "data/camiones/williams_camiones_zonas_soja_2018_2026.csv", producto: "SBS" },
  { file: "data/camiones/williams_camiones_zonas_trigo_2018_2026.csv", producto: "WHEAT" },
];
const LOCALIDADES_FILE = "data/camiones/williams_camiones_localidades_2018_2026.csv";
const ZONAS_TOTAL_FILE = "data/camiones/williams_camiones_zonas_2018_2026.csv";

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

/**
 * Este script corre con la SERVICE KEY (bypassa RLS), no con la sesión de un admin logueado —
 * así que NO pasa por la RPC `admin_upsert_camiones` (que exige `is_admin()`, pensada para el
 * uploader web). Upsertea directo a la tabla, mismo patrón que `ingest-compras.mjs`.
 */
async function upsertDirecto(filas, producto) {
  const BATCH = 1000;
  const conflict = "fecha,zona,producto,fuente";
  for (let i = 0; i < filas.length; i += BATCH) {
    const lote = filas.slice(i, i + BATCH).map((f) => ({
      fecha: f.fecha,
      zona: f.clave,
      producto,
      fuente: "williams",
      cantidad: f.cantidad,
    }));
    await sbFetch(`camiones?on_conflict=${conflict}`, {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(lote),
    });
  }
}

async function cargarUno(file, producto, outDir) {
  const text = readFileSync(file, "utf-8");
  const r = parseCamionesUpload(text);
  if (!r.ok) {
    console.error(`ERROR ${file}: ${r.error}`);
    process.exit(1);
  }
  if (r.filas.length === 0) {
    // Guard anti falso-verde: un CSV real de Williams SIEMPRE tiene miles de filas.
    console.error(`ERROR ${file}: 0 filas parseadas — el formato cambió, no se sube nada.`);
    process.exit(1);
  }
  console.log(
    `${file} (producto=${producto}, formato=${r.formato}): ${r.filas.length} filas, ` +
      `${r.filasInvalidas} inválidas, zonas cubiertas [${r.zonasCubiertas.join(",")}]`,
  );
  if (r.advertencias.length) r.advertencias.forEach((a) => console.log(`  ::warning:: ${a}`));

  if (outDir) {
    writeFileSync(`${outDir}/${producto}.json`, JSON.stringify(r.filas, null, 0));
    return r.filas.length;
  }
  await upsertDirecto(r.filas, producto);
  return r.filas.length;
}

async function main() {
  const outDir = arg("out", null);
  if (!outDir && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY (o usá --out <dir> para dry-run).");
    process.exit(1);
  }

  let total = 0;
  if (hasFlag("all")) {
    for (const { file, producto } of ARCHIVOS_CONOCIDOS) {
      total += await cargarUno(file, producto, outDir);
    }
    // Diagnóstico de cobertura de localidades (no se persiste — solo log, ver williams.ts).
    try {
      const zonasTxt = readFileSync(ZONAS_TOTAL_FILE, "utf-8");
      const locTxt = readFileSync(LOCALIDADES_FILE, "utf-8");
      const cc = crossCheckLocalidades(zonasTxt, locTxt);
      console.log(
        `Cross-check localidades (${cc.dias} días): Gran Rosario ` +
          `${cc.coberturaGranRosarioPct == null ? "—" : cc.coberturaGranRosarioPct.toFixed(1) + "%"} cubierto ` +
          `por las 7 localidades mapeadas · Bahía Blanca ` +
          `${cc.coberturaBahiaPct == null ? "—" : cc.coberturaBahiaPct.toFixed(1) + "%"}.`,
      );
    } catch (e) {
      console.log(`Cross-check de localidades no disponible: ${e.message}`);
    }
  } else {
    const file = arg("in");
    const producto = arg("producto");
    if (!file || !producto) {
      console.error("Uso: --all  |  --in <archivo.csv> --producto <TOTAL|SBS|MAIZE|WHEAT|BARLEY|SORGHUM|SFSEED>");
      process.exit(1);
    }
    total += await cargarUno(file, producto, outDir);
  }

  console.log(outDir ? `Dry-run: ${total} filas escritas en JSON (nada subido).` : `OK: ${total} filas cargadas/actualizadas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
