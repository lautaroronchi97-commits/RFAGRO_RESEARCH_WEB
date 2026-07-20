#!/usr/bin/env node
/**
 * Carga MANUAL de la serie histórica semanal de comercialización de granos (farmer selling) a
 * Supabase (tabla `compras`), a partir de un export de Agrochat (Bolsa de Cereales) en CSV.
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
 * Formato del CSV (export de Agrochat, "En Toneladas"):
 *   fecha(DD/MM/AAAA),grano,sector,campaña,compras_semanales,total_comprado_acumulado,
 *   precio_hecho,a_fijar,fijado,saldo_a_fijar
 * Valores YA en toneladas (no en miles). El dato se guarda CRUDO (fiel a la fuente); la limpieza
 * monótona del acumulado y el cálculo de avance viven en la matview `compras_avance_hist`.
 *
 * Uso:
 *   node scripts/cargar-compras.mjs --in serie.csv --out filas.json   # dry-run: no sube nada
 *   node scripts/cargar-compras.mjs --in serie.csv                    # upsert a Supabase
 *   node scripts/cargar-compras.mjs --in serie.csv --replace-legacy   # + borra las filas fuente='LEGACY'
 *
 * Requiere (salvo en modo --out): SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; nunca en la web).
 */

import { readFileSync, writeFileSync } from "node:fs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

// grano (es, minúsculas) → codigo_interno del resto de la web.
const GRANO_A_CODIGO = {
  trigo: "WHEAT",
  "maíz": "MAIZE",
  maiz: "MAIZE",
  sorgo: "SORGHUM",
  "cebada cervecera": "MALT",
  "cebada forrajera": "BARLEY",
  soja: "SBS",
  girasol: "SFSEED",
};

const SECTOR_A_NORM = { exportador: "EXPORTACION", industria: "INDUSTRIA" };

/**
 * "12.345" (miles) o "12345" o "1.234,5" (decimal coma) → número; vacío → null.
 * OJO: el export real trae artefactos de float con PUNTO decimal ("64099.99999999999");
 * un punto solo se trata como separador de miles si los grupos son de 3 dígitos exactos
 * (la versión anterior rompía esos valores: 64099.99… → 6.4e15; mismo fix en
 * src/lib/compras/parse-agrochat.ts, el parser del uploader admin).
 */
function num(s) {
  const t = String(s ?? "").trim();
  if (t === "" || t === "-") return null;
  let limpio;
  if (t.includes(",")) limpio = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) limpio = t.replace(/\./g, "");
  else limpio = t;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** "DD/MM/AAAA" → ISO "AAAA-MM-DD". */
function fechaISO(s) {
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

/** "19/20" → "2019/20". */
function campaniaLarga(cos) {
  const m = String(cos).trim().match(/^(\d{2})\/(\d{2})$/);
  return m ? `20${m[1]}/${m[2]}` : null;
}

/** Parser CSV mínimo (sin comillas en este export; una fila por línea). */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

function aFilaDB(r) {
  const codigo = GRANO_A_CODIGO[(r["grano"] || "").toLowerCase().trim()];
  const sector = SECTOR_A_NORM[(r["sector"] || "").toLowerCase().trim()];
  const fecha = fechaISO(r["fecha"]);
  const campana = campaniaLarga(r["campaña"] ?? r["campana"]);
  if (!codigo || !sector || !fecha || !campana) return null;
  const total = num(r["total_comprado_acumulado"]);
  const semanal = num(r["compras_semanales"]);
  if (total == null && semanal == null) return null; // fila sin dato útil
  return {
    fecha,
    grano_raw: (r["grano"] || "").toLowerCase().trim(),
    codigo_interno: codigo,
    campana,
    sector,
    toneladas: total, // Total Comprado acumulado (fuente de verdad)
    toneladas_a_fijar: num(r["a_fijar"]),
    semanal_tn: semanal,
    precio_hecho_tn: num(r["precio_hecho"]),
    fijado_tn: num(r["fijado"]),
    saldo_a_fijar_tn: num(r["saldo_a_fijar"]),
    djve_tn: null, // este export no trae DJVE
    fuente: "AGROCHAT",
    precio_promedio_usd: null,
    porcentaje_cosecha: null,
  };
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
    console.error("Falta --in <csv>.");
    process.exit(1);
  }
  if (!outFile && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY (o usá --out para dry-run).");
    process.exit(1);
  }

  const raw = parseCSV(readFileSync(inFile, "utf-8"));
  let filas = dedup(raw.map(aFilaDB).filter(Boolean));
  console.log(`CSV: ${raw.length} filas → ${filas.length} filas válidas (dedup).`);

  // Guard anti falso-verde: si el CSV trae contenido pero nada parseó, algo cambió → fallar ruidoso.
  if (raw.length > 10 && filas.length === 0) {
    console.error("ERROR: el CSV tiene filas pero ninguna parseó — ¿cambió el formato del export?");
    process.exit(1);
  }

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
