/**
 * Parser puro del ICS anual de NASS (nass.usda.gov/Publications/Calendar/{año}/NassReleases{año}.ics)
 * — fuente oficial de fechas de WASDE/Crop Production, Grain Stocks (+ Small Grains Summary, mismo
 * día) y Crop Progress.
 *
 * L6 (auditoría E7, docs/auditoria/E7-sintesis.md §6, bloque 2): reemplaza los arrays hardcodeados a
 * mano de `calendario.ts` (WASDE_2026/GRAIN_STOCKS_2026/CROP_PROGRESS_2026) por datos EXTRAÍDOS de
 * esta fuente. El generador (`scripts/generar-calendario-nass.mjs`) escribe el resultado a
 * `calendario-seed-nass.json` (versionado en el repo) — nunca se fetchea el ICS en runtime: /produccion
 * es ISR y el calendario tiene que funcionar aunque NASS no responda (mismo criterio que el resto
 * del proyecto: ingesta aparte, la web lee un dato ya guardado).
 *
 * Trampa documentada en PLAN_CALENDARIO_PRODUCCION.md §8: los DTSTART vienen en hora ET "flotante"
 * (SIN TZID) — acá solo se extrae la FECHA calendario (YYYY-MM-DD); `calendario.ts` sigue siendo el
 * único lugar que interpreta esa hora de pared como America/New_York (12:00/16:00 ET → 13-14/16-17 AR
 * según DST de EEUU).
 */

export type VEventoIcs = { summary: string; fechaISO: string; horaLocal: string };

/** Desdobla líneas "folded" de RFC 5545 (una continuación empieza con un espacio o tab) y normaliza CRLF. */
function unfoldIcs(text: string): string {
  const lineas = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const l of lineas) {
    if ((l.startsWith(" ") || l.startsWith("\t")) && out.length > 0) {
      const prev = out[out.length - 1];
      out[out.length - 1] = (prev ?? "") + l.slice(1);
    } else {
      out.push(l);
    }
  }
  return out.join("\n");
}

/** Parsea todos los VEVENT de un ICS crudo → {summary, fechaISO, horaLocal (hora de pared, sin TZ)}. */
export function parseIcsVeventos(icsText: string): VEventoIcs[] {
  const texto = unfoldIcs(icsText);
  const bloques = texto.match(/BEGIN:VEVENT\n[\s\S]*?\nEND:VEVENT/g) ?? [];
  const out: VEventoIcs[] = [];
  for (const bloque of bloques) {
    const summaryM = bloque.match(/^SUMMARY:(.*)$/m);
    // DTSTART puede venir "DTSTART:20260812T120000" o con parámetros "DTSTART;VALUE=DATE:...";
    // acá solo nos interesa el caso con hora (los eventos NASS siempre la traen).
    const dtstartM = bloque.match(/^DTSTART(?:;[^:]*)?:(\d{8})T(\d{6})/m);
    if (!summaryM || !dtstartM) continue;
    const summary = summaryM[1]?.trim() ?? "";
    const ymd = dtstartM[1] ?? "";
    const hms = dtstartM[2] ?? "";
    if (ymd.length !== 8 || hms.length !== 6) continue;
    const fechaISO = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
    const horaLocal = `${hms.slice(0, 2)}:${hms.slice(2, 4)}`;
    if (!summary) continue;
    out.push({ summary, fechaISO, horaLocal });
  }
  return out;
}

export type SeedNassAnio = { wasde: string[]; grainStocks: string[]; cropProgress: string[] };

/** Los 3 informes que `calendario.ts` modela desde NASS. "Crop Production" = el mismo día que el
 *  WASDE (el informe combinado que se publica junto, ver PLAN_CALENDARIO_PRODUCCION §1). "Grain
 *  Stocks" coincide de fecha con "Small Grains Summary" (verificado: ambos VEVENT el mismo DTSTART
 *  cada trimestre) — se modela como un solo informe, como ya hacía el seed a mano. */
const RESUMEN_A_CLAVE: Record<string, keyof SeedNassAnio> = {
  "Crop Production": "wasde",
  "Grain Stocks": "grainStocks",
  "Crop Progress": "cropProgress",
};

/** Agrupa los VEVENT relevantes del ICS en el shape del seed (fechas únicas, ordenadas). */
export function extraerSeedNass(icsText: string): SeedNassAnio {
  const sets: Record<keyof SeedNassAnio, Set<string>> = {
    wasde: new Set(),
    grainStocks: new Set(),
    cropProgress: new Set(),
  };
  for (const ev of parseIcsVeventos(icsText)) {
    const clave = RESUMEN_A_CLAVE[ev.summary];
    if (clave) sets[clave].add(ev.fechaISO);
  }
  return {
    wasde: [...sets.wasde].sort(),
    grainStocks: [...sets.grainStocks].sort(),
    cropProgress: [...sets.cropProgress].sort(),
  };
}
