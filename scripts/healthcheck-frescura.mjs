#!/usr/bin/env node
// Healthcheck de frescura de las bases que alimenta ESTE repo (crons de GitHub Actions).
//
// Revisa el último dato de cada tabla propia y lo compara contra su cadencia esperada. Si algo se
// atrasó más de su umbral, sale con exit 1 → el workflow queda en ROJO y GitHub avisa por mail
// (notificación default de un scheduled workflow que falla). Es la red que faltaba: hasta ahora la
// única señal de vida era el exit code de cada ingesta, que MIENTE (un parser roto termina en verde
// sin insertar; ver los guards de 0-filas en los scripts de ingesta).
//
// Solo LECTURA. Uso:
//   node scripts/healthcheck-frescura.mjs           # revisa y sale 1 si hay atrasos
//   node scripts/healthcheck-frescura.mjs --json     # además imprime el detalle en JSON
// Entorno (NO en el repo): SUPABASE_URL + SUPABASE_SERVICE_KEY (o SUPABASE_ANON_KEY; con leer alcanza).

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const JSON_OUT = process.argv.includes("--json");

if (!SUPABASE_URL || !KEY) {
  console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY (o SUPABASE_ANON_KEY) en el entorno.");
  process.exit(1);
}

const HOY = new Date();

function diasDesde(fecha) {
  // fecha puede ser "YYYY-MM-DD" (date) o un timestamp ISO; normalizamos al día UTC.
  const iso = String(fecha).slice(0, 10);
  const d = new Date(`${iso}T00:00:00Z`);
  return Math.floor((HOY - d) / 86400000);
}

async function ultimaFecha(tabla, col, filtro) {
  const url =
    `${SUPABASE_URL}/rest/v1/${tabla}` +
    `?select=${col}&${col}=not.is.null&order=${col}.desc&limit=1${filtro ?? ""}`;
  const res = await fetch(url, {
    headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  const j = await res.json();
  return j[0]?.[col] ?? null;
}

// Umbrales en días CALENDARIO, holgados para tolerar fines de semana + feriados/puentes (el mayor
// hueco legítimo de una serie diaria es ~5 días: feriado + puente + finde) sin dejar de detectar un
// freeze real (un parser roto se nota igual en < 1 semana). Ajustables.
const CHECKS = [
  { nombre: "futuros_cierres (A3/Matba)", tabla: "futuros_cierres", col: "fecha", maxDias: 7, cadencia: "diario hábil" },
  { nombre: "cbot_cierres (CBOT)", tabla: "cbot_cierres", col: "fecha", maxDias: 7, cadencia: "diario hábil (T-1)" },
  { nombre: "pizarra_historico (CAC)", tabla: "pizarra_historico", col: "fecha", maxDias: 7, cadencia: "diario hábil" },
  { nombre: "lineup (buques ISA)", tabla: "lineup", col: "fecha_consulta", maxDias: 7, cadencia: "diario hábil (ISA tiene huecos)" },
  { nombre: "noticias", tabla: "noticias", col: "fecha_pub", maxDias: 2, cadencia: "horario" },
  { nombre: "estimaciones USDA", tabla: "estimaciones_produccion", col: "fecha_publicacion", filtro: "&organismo=eq.USDA", maxDias: 45, cadencia: "mensual (WASDE)" },
  { nombre: "estimaciones CONAB", tabla: "estimaciones_produccion", col: "fecha_publicacion", filtro: "&organismo=eq.CONAB", maxDias: 45, cadencia: "mensual" },
  { nombre: "estimaciones BCR-GEA", tabla: "estimaciones_produccion", col: "fecha_publicacion", filtro: "&organismo=eq.BCR", maxDias: 45, cadencia: "mensual" },
  { nombre: "estimaciones DEA-SAGyP", tabla: "estimaciones_produccion", col: "fecha_publicacion", filtro: "&organismo=eq.DEA", maxDias: 16, cadencia: "semanal" },
];

async function main() {
  const detalle = [];
  let fallas = 0;

  for (const c of CHECKS) {
    let fecha = null;
    let error = null;
    try {
      fecha = await ultimaFecha(c.tabla, c.col, c.filtro);
    } catch (e) {
      error = e.message;
    }
    const dias = fecha ? diasDesde(fecha) : null;
    const atrasado = error != null || fecha == null || dias > c.maxDias;
    if (atrasado) fallas++;
    const marca = error ? "✗ ERROR" : fecha == null ? "✗ SIN DATOS" : atrasado ? "✗ ATRASADO" : "✓";
    console.log(
      `${marca}  ${c.nombre}: ` +
        (error
          ? error
          : fecha == null
            ? "sin filas"
            : `último ${String(fecha).slice(0, 10)} (${dias}d · ${c.cadencia} · umbral ${c.maxDias}d)`),
    );
    detalle.push({ ...c, fecha, dias, atrasado, error });
  }

  if (JSON_OUT) console.log("\n" + JSON.stringify(detalle, null, 2));

  if (fallas > 0) {
    console.error(`\n${fallas} tabla(s) con problemas de frescura. Revisar el cron / la fuente.`);
    process.exit(1);
  }
  console.log("\nTodas las tablas al día. ✔");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
