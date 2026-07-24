#!/usr/bin/env node
/**
 * Genera (o regenera) el seed de fechas oficiales NASS para `calendario.ts`, a partir del ICS
 * anual oficial (L6, auditoría E7 — reemplaza los arrays hardcodeados a mano por año).
 *
 * Uso:
 *   node scripts/generar-calendario-nass.mjs --year 2026            # (re)genera un año y escribe
 *   node scripts/generar-calendario-nass.mjs --year 2027 --check    # solo verifica, no escribe
 *
 * Fuente: https://www.nass.usda.gov/Publications/Calendar/{year}/NassReleases{year}.ics
 * (ICS anual, ~500 VEVENT; el de {year+1} aparece recién ~oct-nov de {year} — un 404 acá es
 * ESPERABLE fuera de esa ventana, no un error). Escribe/actualiza
 * `src/lib/calendario-seed-nass.json` (versionado en el repo — el fetch NUNCA pasa en runtime;
 * /produccion es ISR y el calendario tiene que funcionar aunque NASS no responda).
 *
 * Este script es la mitad "generador" del centinela `refresh-calendario.mjs`, que ya chequeaba
 * mensualmente si el ICS del año siguiente existía — ahora que existe, corre esto (a mano o desde
 * ese mismo centinela) en vez de editar los arrays a mano.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { extraerSeedNass } from "../src/lib/calendario-nass.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(__dirname, "..", "src", "lib", "calendario-seed-nass.json");

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

async function fetchIcs(year) {
  const url = `https://www.nass.usda.gov/Publications/Calendar/${year}/NassReleases${year}.ics`;
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (ROFOAGRO research)" },
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 404) return { url, disponible: false };
  if (!res.ok) throw new Error(`NASS ICS ${year}: HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("BEGIN:VEVENT")) {
    throw new Error(`NASS ICS ${year}: respuesta 200 sin ningún VEVENT (¿cambió el formato?). No se da por bueno.`);
  }
  return { url, disponible: true, text };
}

function cargarSeedActual() {
  if (!existsSync(SEED_PATH)) return { fuente: "", generadoEl: "", anios: {} };
  return JSON.parse(readFileSync(SEED_PATH, "utf8"));
}

async function main() {
  const year = Number(arg("year", String(new Date().getUTCFullYear())));
  const check = hasFlag("check");
  console.log(`Calendario NASS: ${check ? "verificando" : "generando"} seed ${year}`);

  const { url, disponible, text } = await fetchIcs(year);
  if (!disponible) {
    console.log(`  NASS ${year} todavía no publicó el ICS (HTTP 404 en ${url}) — nada que generar. Esperable fuera de oct-nov.`);
    return;
  }

  const nuevo = extraerSeedNass(text);
  for (const [k, v] of Object.entries(nuevo)) {
    if (v.length === 0) {
      throw new Error(`NASS ${year}: 0 fechas de "${k}" tras parsear el ICS — ¿cambió el SUMMARY de ese informe? No se da por bueno.`);
    }
  }
  console.log(`  wasde: ${nuevo.wasde.length} · grainStocks: ${nuevo.grainStocks.length} · cropProgress: ${nuevo.cropProgress.length}`);

  const seed = cargarSeedActual();
  const anterior = seed.anios[String(year)];
  const cambio = JSON.stringify(anterior ?? null) !== JSON.stringify(nuevo);

  if (check) {
    if (!cambio) {
      console.log("  OK — el ICS coincide con el seed ya versionado.");
    } else if (!anterior) {
      console.log(`::warning title=Seed NASS ${year} disponible::Correr sin --check para generarlo.`);
    } else {
      console.log(`::warning title=Seed NASS ${year} cambió::El ICS de NASS difiere del seed versionado — correr sin --check para actualizar.`);
    }
    return;
  }

  if (!cambio) {
    console.log("  Sin cambios vs el seed ya versionado — no se reescribe.");
    return;
  }
  seed.fuente = "https://www.nass.usda.gov/Publications/Calendar/{year}/NassReleases{year}.ics";
  seed.anios[String(year)] = nuevo;
  seed.generadoEl = new Date().toISOString().slice(0, 10);
  // Orden de claves estable (año) para diffs de git legibles.
  seed.anios = Object.fromEntries(Object.entries(seed.anios).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(SEED_PATH, `${JSON.stringify(seed, null, 2)}\n`);
  console.log(`  Escrito ${SEED_PATH}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
