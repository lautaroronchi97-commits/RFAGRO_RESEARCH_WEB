#!/usr/bin/env node
/**
 * refresh-calendario — heartbeat mensual del módulo Calendario (docs/PLAN_CALENDARIO_PRODUCCION.md).
 *
 * WASDE/Grain Stocks/Crop Progress (NASS) ya NO son arrays a mano: se generan desde el ICS oficial
 * por `scripts/generar-calendario-nass.mjs` → `src/lib/calendario-seed-nass.json` (L6, auditoría E7
 * §6). CONAB sigue a mano (NASS no lo cubre). Este script es un CENTINELA: chequea, una vez por mes,
 * si ya aparecieron las fuentes del AÑO SIGUIENTE:
 *   - ICS oficial de NASS del próximo año (aparece ~oct-nov) — delega en el generador real
 *     (`--check`: valida que el ICS existe Y que los 3 informes parsean con datos, no solo "hay
 *     VEVENTs"). Si ya está, avisa que `node scripts/generar-calendario-nass.mjs --year <N>` (sin
 *     `--check`) escribe el seed nuevo — CERO edición de código.
 *   - Calendario BCR (ICS/JSON) por si lo reactivan para fechas futuras (hoy está vacío 2025/26).
 * `permissions: contents: read` (E5 #12d) → este cron NUNCA commitea; solo avisa con `::warning` en
 * el run (deliberadamente NO exit≠0: mails de error + GitHub deshabilita crons que fallan seguido).
 * El aviso que SÍ enrojece vive en el healthcheck diario: check "seed de calendario por agotarse"
 * (scripts/healthcheck-frescura.mjs, E5 #9c) — este centinela queda como detalle informativo + el
 * paso manual (correr el generador y commitear) lo hace quien lea el `::warning`.
 *
 * Uso: node scripts/refresh-calendario.mjs
 */
import { extraerSeedNass } from "../src/lib/calendario-nass.ts";

const UA = "Mozilla/5.0 (ROFOAGRO research)";
// El último año con seed NASS versionado en src/lib/calendario-seed-nass.json.
const SEED_ACTUAL = 2026;

async function existe(url, { json = false } = {}) {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) return { ok: false, status: res.status };
    if (json) {
      const data = await res.json().catch(() => null);
      return { ok: true, status: res.status, count: Array.isArray(data) ? data.length : null };
    }
    const txt = await res.text();
    const vevents = (txt.match(/BEGIN:VEVENT/g) || []).length;
    return { ok: true, status: res.status, vevents, texto: txt };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  const proximo = SEED_ACTUAL + 1;
  console.log(`refresh-calendario · seed cargado hasta ${SEED_ACTUAL} · chequeando fuentes de ${proximo}`);
  let seedProximoDisponible = false;

  // 1) ICS de NASS del próximo año — delega en el parser REAL (mismo que usa el generador), no
  //    solo cuenta VEVENTs: exige que los 3 informes (wasde/grainStocks/cropProgress) parseen con
  //    al menos una fecha, que es la condición real para poder sembrar el seed.
  const nassUrl = `https://www.nass.usda.gov/Publications/Calendar/${proximo}/NassReleases${proximo}.ics`;
  const nass = await existe(nassUrl);
  if (nass.ok && nass.vevents > 0) {
    const seed = extraerSeedNass(nass.texto ?? "");
    const completo = seed.wasde.length > 0 && seed.grainStocks.length > 0 && seed.cropProgress.length > 0;
    if (completo) {
      console.log(
        `  ✅ NASS ${proximo} ICS disponible y parseable (wasde ${seed.wasde.length} · grainStocks ${seed.grainStocks.length} · cropProgress ${seed.cropProgress.length}): ${nassUrl}`,
      );
      seedProximoDisponible = true;
    } else {
      console.log(
        `  ⚠️ NASS ${proximo} ICS existe (${nass.vevents} VEVENTs) pero el parser no completó los 3 informes (¿cambiaron los SUMMARY?) — revisar antes de generar.`,
      );
    }
  } else {
    console.log(`  ⏳ NASS ${proximo} ICS todavía no está (status ${nass.status ?? nass.error}).`);
  }

  // 2) Calendario BCR (JSON) — por si reactivan las fechas futuras.
  const bcrUrl = `https://www.bcr.com.ar/es/api/paragraph-action/636/query?date_start=${proximo}-01-01&date_end=${proximo}-12-31`;
  const bcr = await existe(bcrUrl, { json: true });
  if (bcr.ok && bcr.count && bcr.count > 0) {
    console.log(`  ✅ Calendario BCR trae ${bcr.count} eventos para ${proximo} (revisar si conviene usarlo).`);
  } else {
    console.log(`  ⏳ Calendario BCR sigue vacío para ${proximo} (${bcr.count ?? bcr.status ?? bcr.error}).`);
  }

  if (seedProximoDisponible) {
    // Anotación de GitHub Actions: resalta en la UI del run sin marcarlo como fallido
    // (un exit≠0 mandaría mails de error y GitHub deshabilita crons que fallan seguido).
    console.log(
      `::warning title=Seed NASS ${proximo} disponible::Correr ` +
        `"node scripts/generar-calendario-nass.mjs --year ${proximo}" y commitear ` +
        `src/lib/calendario-seed-nass.json (cero edición de calendario.ts) — de paso, sumar las ` +
        `fechas oficiales ${proximo} de CONAB a mano (NASS no las cubre) y actualizar SEED_ACTUAL en ` +
        `scripts/refresh-calendario.mjs.`,
    );
    return;
  }
  console.log("\nSin novedades: el calendario en código sigue vigente.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
