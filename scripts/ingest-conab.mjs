#!/usr/bin/env node
/**
 * Ingesta de estimaciones de producción de CONAB (Brasil) a Supabase (tabla estimaciones_produccion).
 * Módulo "Calendario + estimaciones de producción" — docs/PLAN_CALENDARIO_PRODUCCION.md (sesión B).
 *
 * Fuente: portal de informações de CONAB (sin auth), TXT plano regenerado ~08:00 Brasília:
 *   https://portaldeinformacoes.conab.gov.br/downloads/arquivos/LevantamentoGraos.txt
 *   Latin-1, separador ';'. Columnas:
 *     ano_agricola;safra;uf;produto;id_produto;id_levantamento;dsc_levantamento;
 *     area_plantada_mil_ha;producao_mil_t;produtividade_mil_ha_mil_t
 *
 * El TXT trae TODOS los levantamentos (revisiones) desde 2017/18 → cada (ano_agricola, levantamento)
 * es un VINTAGE. Agregamos las 27 UFs a nacional Brasil y, en milho, sumamos 1ª+2ª+3ª safra.
 *   - Verano (soja/milho/girasol): ano_agricola tipo "2025/26".
 *   - Invierno (trigo/cevada/sorgo): ano_agricola tipo "2025" (año calendario) → lo normalizamos a "2025/26".
 *   - Se excluye el levantamento "099" = número FINAL de la safra cerrada (no es un mensual más).
 *
 * CONAB no publica la FECHA de cada levantamento en el TXT → la derivamos del número de levantamento
 * con la cadencia oficial (1º LEV ≈ octubre del año de inicio, uno por mes). Es una aproximación
 * MONÓTONA suficiente para ordenar/graficar los vintages (verificado: soja 2025/26 10º LEV = jul-2026).
 *
 * Uso:
 *   node scripts/ingest-conab.mjs                 # sube TODOS los vintages del TXT (idempotente)
 *   node scripts/ingest-conab.mjs --since 2024    # solo ano_agricola desde 2024 (más liviano)
 *   node scripts/ingest-conab.mjs --out filas.json# dry-run: escribe JSON, no sube nada
 *
 * Requiere en el entorno (NO en el repo), salvo en modo --out:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; solo en el cron, nunca en la web)
 */

import { writeFileSync } from "node:fs";

const TXT = "https://portaldeinformacoes.conab.gov.br/downloads/arquivos/LevantamentoGraos.txt";
const UA = "Mozilla/5.0 (RFAGRO research)";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

// producto CONAB (portugués) → grano normalizado
const GRANO = {
  SOJA: "soja",
  MILHO: "maiz",
  TRIGO: "trigo",
  GIRASSOL: "girasol",
  "SORGO GRANIFERO": "sorgo",
  CEVADA: "cebada",
};

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

/** ano_agricola "2025/26" (verano) o "2025" (invierno) → campaña normalizada "2025/26". */
function normCampania(ano) {
  if (ano.includes("/")) return ano;
  const y = Number(ano);
  return `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
}

/**
 * Fecha aproximada del levantamento. Verano: 1º LEV = octubre del año de inicio (Y1), +1 mes por lev.
 * Invierno (año calendario Y): la safra de invierno se releva más tarde → anclamos 1º LEV = mayo(Y).
 * Día 15 (mitad de mes). Devuelve "YYYY-MM-DD".
 */
function fechaLevantamento(ano, levNum) {
  let y0, m0; // año y mes (0-index) del 1º levantamento
  if (ano.includes("/")) {
    y0 = Number(ano.slice(0, 4));
    m0 = 9; // octubre
  } else {
    y0 = Number(ano);
    m0 = 4; // mayo
  }
  const d = new Date(Date.UTC(y0, m0 + (levNum - 1), 15));
  return d.toISOString().slice(0, 10);
}

async function fetchTxt() {
  const res = await fetch(TXT, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`CONAB TXT: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return new TextDecoder("latin1").decode(buf);
}

/** Parsea el TXT → filas nacionales por (grano, campaña, levantamento). */
function parse(txt, sinceYear) {
  const lines = txt.split(/\r?\n/);
  // clave = grano|ano|lev  → { area, prod, ano, levNum }
  const agg = new Map();
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l) continue;
    const c = l.split(";");
    if (c.length < 10) continue;
    const ano = c[0].trim();
    const produto = c[3].trim();
    const grano = GRANO[produto];
    if (!grano) continue;
    const lev = c[5].trim();
    if (lev === "099") continue; // número final de safra cerrada (no es un vintage mensual)
    const levNum = Number(lev);
    if (!Number.isFinite(levNum) || levNum < 1) continue;
    const anoStart = Number(ano.slice(0, 4));
    if (sinceYear && anoStart < sinceYear) continue;
    const area = Number(c[7]) || 0; // mil ha (plantada)
    const prod = Number(c[8]) || 0; // mil t
    const k = `${grano}|${ano}|${lev}`;
    const cur = agg.get(k) || { area: 0, prod: 0, ano, levNum };
    cur.area += area;
    cur.prod += prod;
    agg.set(k, cur);
  }

  const out = [];
  for (const [k, v] of agg.entries()) {
    if (v.prod <= 0) continue;
    const grano = k.split("|")[0];
    const campania = normCampania(v.ano);
    const fecha = fechaLevantamento(v.ano, v.levNum);
    const informe = `${v.levNum}º levantamento`;
    const areaMha = v.area / 1000; // mil ha → Mha
    const prodMt = v.prod / 1000; // mil t → Mt
    const base = {
      organismo: "CONAB",
      pais: "brasil",
      grano,
      campania,
      fecha_publicacion: fecha,
      informe,
      url: "https://portaldeinformacoes.conab.gov.br/safra-serie-historica-graos.html",
    };
    out.push({ ...base, variable: "produccion", valor: round2(prodMt), unidad: "Mt" });
    if (v.area > 0) {
      out.push({ ...base, variable: "area", valor: round2(areaMha), unidad: "Mha" });
      // rinde nacional = producción total / área plantada total (t/ha)
      out.push({ ...base, variable: "rinde", valor: round4(v.prod / v.area), unidad: "tn/ha" });
    }
  }
  return out;
}

async function upsert(rows) {
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/estimaciones_produccion`, {
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
  const sinceYear = arg("since", null) ? Number(arg("since", null)) : null;
  console.log(`Ingesta CONAB LevantamentoGraos.txt${sinceYear ? ` (desde ${sinceYear})` : ""}`);
  const txt = await fetchTxt();
  const rows = parse(txt, sinceYear);
  console.log(`${rows.length} filas nacionales (grano × campaña × levantamento × variable).`);

  if (outFile) {
    writeFileSync(outFile, JSON.stringify(rows, null, 0));
    console.log(`Escrito ${outFile} (dry-run, no se subió nada).`);
    return;
  }
  console.log("Upsert a estimaciones_produccion...");
  await upsert(rows);
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
