#!/usr/bin/env node
/**
 * Ingesta de estimaciones de producción de BCBA — Panorama Agrícola Semanal (PAS) a Supabase
 * (tabla estimaciones_produccion). Módulo "Calendario + estimaciones" — docs/PLAN_CALENDARIO_PRODUCCION.md (sesión C).
 *
 * ⚠️ ESTADO: PENDIENTE DE VALIDAR DESDE GITHUB ACTIONS.
 *   TODO el dominio bolsadecereales.com está detrás del challenge de Cloudflare para IPs de datacenter
 *   (403 "Just a moment" verificado desde el sandbox; un browser humano pasa sin problema). Wayback NO
 *   tiene archivados los PDFs del PAS → no se pudo verificar un parser contra datos reales desde el sandbox.
 *
 * Por eso este script es PROBE-FIRST y CONSERVADOR:
 *   1) Baja la página oficial de estimaciones de BCBA.
 *   2) Si detecta el challenge de Cloudflare → NO inserta nada, avisa (::warning::) y sale limpio (exit 0).
 *   3) Si obtiene HTML real: extrae la tabla nacional del PAS y SOLO inserta filas que pasan la validación
 *      estricta de rango por grano (para no meter un número basura en el comparador oficial). Los candidatos
 *      que no validan se listan pero no se suben.
 *   4) --probe: solo baja y reporta qué se ve (para afinar el parser la primera vez que Actions pase el CF).
 *
 * NO se implementa el "plan B" de scrapear tonelajes del texto libre de noticias: el riesgo de meter un
 * número equivocado en la pizarra oficial de estimaciones no lo justifica (regla del proyecto: no suponer).
 * El comparador AR ya es real con BCR (GEA) + DEA (SAGyP) + USDA; el PAS suma cuando Actions confirme el acceso.
 *
 * Uso:
 *   node scripts/ingest-pas.mjs --probe               # baja y reporta (para diagnosticar desde Actions)
 *   node scripts/ingest-pas.mjs                        # inserta SOLO si parsea y valida (idempotente)
 *   node scripts/ingest-pas.mjs --out filas.json       # dry-run: escribe JSON, no sube nada
 *
 * Requiere en el entorno (NO en el repo), salvo en --out/--probe:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role; solo en el cron, nunca en la web)
 */

import { writeFileSync } from "node:fs";

const PAGE = "https://www.bolsadecereales.com/estimaciones-agricolas";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}
function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

// Rangos de plausibilidad de la producción nacional AR (Mt) — cota anti-basura. Un número fuera de
// rango se descarta (probablemente el parser tomó otra cosa). Holgados a propósito.
const RANGO_MT = {
  soja: [20, 65],
  maiz: [25, 90],
  trigo: [8, 35],
  girasol: [2, 8],
  sorgo: [1, 6],
  cebada: [2, 8],
};

const round2 = (n) => Math.round(n * 100) / 100;

function esCloudflare(html) {
  return /just a moment|cf-chl|challenge-platform|enable javascript and cookies|__cf_/i.test(html);
}

/**
 * Extrae candidatos (grano, campaña, produccion Mt) de la página de estimaciones de BCBA.
 * DEFENSIVO: como no se pudo verificar la estructura real (Cloudflare), intenta ubicar filas
 * "grano … campaña YYYY/YY … N,N millones de toneladas" y devuelve candidatos SIN insertar todavía.
 * Cuando Actions pase el CF y veamos el HTML real, se endurece este parser con los selectores exactos.
 */
function parseCandidatos(html) {
  const texto = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
  const GRANO = {
    soja: "soja",
    "maíz": "maiz",
    maiz: "maiz",
    trigo: "trigo",
    girasol: "girasol",
    "sorgo granífero": "sorgo",
    sorgo: "sorgo",
    cebada: "cebada",
  };
  const out = [];
  // Campaña vigente si aparece explícita (ej. "campaña 2025/26").
  const camp = texto.match(/campa[ñn]a\s*(\d{4}\/\d{2})/);
  const campania = camp ? camp[1] : null;
  for (const [needle, grano] of Object.entries(GRANO)) {
    const re = new RegExp(
      `${needle}[^.]{0,80}?(\\d{1,3}(?:[.,]\\d{1,2})?)\\s*millones?\\s*de\\s*toneladas`,
      "i",
    );
    const m = texto.match(re);
    if (!m) continue;
    const valor = Number(m[1].replace(",", "."));
    if (Number.isFinite(valor)) out.push({ grano, campania, valor: round2(valor) });
  }
  return out;
}

function validar(cand) {
  const ok = [];
  const rechazados = [];
  for (const c of cand) {
    const r = RANGO_MT[c.grano];
    if (c.campania && r && c.valor >= r[0] && c.valor <= r[1]) ok.push(c);
    else rechazados.push(c);
  }
  return { ok, rechazados };
}

async function upsert(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/estimaciones_produccion`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`upsert: HTTP ${res.status} ${await res.text()}`);
}

async function main() {
  const probe = hasFlag("probe");
  const outFile = arg("out", null);
  if (!probe && !outFile && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY (o usá --out/--probe).");
    process.exit(1);
  }

  const res = await fetch(PAGE, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(45000) });
  const html = await res.text();
  console.log(`BCBA estimaciones: HTTP ${res.status} · ${html.length} bytes`);

  if (esCloudflare(html) || res.status === 403) {
    console.log("::warning::BCBA sigue detrás de Cloudflare desde esta IP — no se ingestó el PAS.");
    console.log("Probá el `workflow_dispatch` desde GitHub Actions; si tampoco pasa, hace falta el respaldo manual/mail.");
    return; // exit 0: nunca insertar sobre un challenge
  }

  const candidatos = parseCandidatos(html);
  const { ok, rechazados } = validar(candidatos);
  console.log(`Candidatos: ${candidatos.length} · validados: ${ok.length} · rechazados: ${rechazados.length}`);
  for (const c of rechazados) console.log(`  ✗ ${c.grano} ${c.campania ?? "?"} ${c.valor} Mt (fuera de rango o sin campaña)`);

  if (probe) {
    console.log("Modo --probe: no se sube nada. Preview del texto (primeros 600 chars):");
    console.log(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 600));
    return;
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const rows = ok.map((c) => ({
    organismo: "BCBA",
    pais: "argentina",
    grano: c.grano,
    campania: c.campania,
    variable: "produccion",
    valor: c.valor,
    unidad: "Mt",
    fecha_publicacion: hoy,
    informe: "PAS (BCBA)",
    url: PAGE,
  }));

  if (outFile) {
    writeFileSync(outFile, JSON.stringify(rows, null, 0));
    console.log(`Escrito ${outFile} (dry-run, no se subió nada).`);
    return;
  }
  if (rows.length === 0) {
    console.log("Sin filas validadas — nada que subir (el parser se afina cuando veamos el HTML real).");
    return;
  }
  console.log(`Upsert de ${rows.length} filas validadas a estimaciones_produccion...`);
  await upsert(rows);
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
