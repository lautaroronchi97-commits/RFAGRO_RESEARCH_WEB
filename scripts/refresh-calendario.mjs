#!/usr/bin/env node
/**
 * refresh-calendario — heartbeat mensual del módulo Calendario (docs/PLAN_CALENDARIO_PRODUCCION.md).
 *
 * En v1 el calendario se GENERA EN CÓDIGO (src/lib/calendario.ts) con el seed de fechas oficiales
 * 2026 + reglas. No hay ingesta que refrescar. Este script es un CENTINELA: chequea, una vez por mes,
 * si ya aparecieron las fuentes del AÑO SIGUIENTE para poder sembrar el seed del año que viene:
 *   - ICS oficial de NASS del próximo año (aparece ~oct-nov).
 *   - Calendario BCR (ICS/JSON) por si lo reactivan para fechas futuras (hoy está vacío 2025/26).
 * No escribe en la base: reporta en el log del Action (y sale con código ≠0 si el seed próximo ya
 * está disponible pero todavía no se cargó en el código, para que salte el aviso).
 *
 * Uso: node scripts/refresh-calendario.mjs
 */

const UA = "Mozilla/5.0 (RFAGRO research)";
// El año cuyo seed oficial YA está cargado en src/lib/calendario.ts. Actualizar al sumar el próximo.
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
    return { ok: true, status: res.status, vevents };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  const proximo = SEED_ACTUAL + 1;
  console.log(`refresh-calendario · seed cargado hasta ${SEED_ACTUAL} · chequeando fuentes de ${proximo}`);
  let seedProximoDisponible = false;

  // 1) ICS de NASS del próximo año.
  const nassUrl = `https://www.nass.usda.gov/Publications/Calendar/${proximo}/NassReleases${proximo}.ics`;
  const nass = await existe(nassUrl);
  if (nass.ok && nass.vevents > 0) {
    console.log(`  ✅ NASS ${proximo} ICS disponible (${nass.vevents} eventos): ${nassUrl}`);
    seedProximoDisponible = true;
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
      `::warning title=Seed ${proximo} disponible::Ya se puede armar el seed oficial ${proximo} en ` +
        `src/lib/calendario.ts (WASDE/Grain Stocks/Crop Progress/CONAB) y actualizar SEED_ACTUAL en ` +
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
