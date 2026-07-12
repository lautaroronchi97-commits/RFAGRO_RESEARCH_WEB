/**
 * Calendario de informes del agro (módulo Calendario + estimaciones de producción).
 *
 * En v1 el calendario se GENERA EN CÓDIGO — no depende de la base ni de un cron:
 *   - Eventos OFICIALES con fecha exacta publicada por el organismo (WASDE, Grain Stocks,
 *     Crop Progress, levantamentos CONAB) → sembrados a mano (fechas 2026 verificadas en
 *     PLAN_CALENDARIO_PRODUCCION.md; se renuevan una vez al año).
 *   - Eventos por REGLA para los que no publican fechas futuras (PAS jueves, GEA/DEA, CFTC,
 *     EIA…) → generados por día de semana sobre el rango pedido, con corrección de feriados AR.
 *
 * Horarios: cada evento lleva su hora en la zona de ORIGEN. Se calcula el instante UTC y de
 * ahí la hora Argentina (America/Argentina/Cordoba, UTC-3 fijo) — así el cambio de hora de
 * EEUU mueve solo el WASDE de 13:00 a 14:00 AR sin hardcodear el offset. La tabla Supabase
 * `calendario_informes` queda para que la ingesta marque 'publicado'; la UI lee de acá.
 */

import { FERIADOS_AR, ymd } from "./habiles";

export type Organismo = "USDA" | "CONAB" | "BCR" | "BCBA" | "DEA" | "CFTC" | "EIA" | "NOPA";
export type Importancia = "alta" | "media" | "baja";
export type TipoFecha = "oficial" | "regla";

export type EventoCalendario = {
  organismo: Organismo;
  informe: string;
  fechaISO: string; // fecha en hora Argentina, "YYYY-MM-DD"
  horaArg: string | null; // "HH:MM" en hora Córdoba, o null si no hay hora confiable
  instant: number | null; // epoch ms (para ordenar dentro del día)
  region: string;
  granos: string;
  importancia: Importancia;
  tipo: TipoFecha;
  url: string;
  nota?: string;
};

/* ------------------------------------------------------------------ */
/* Zonas horarias: wall-clock en zona de origen → instante UTC        */
/* ------------------------------------------------------------------ */

/** Offset (min) de una zona IANA para un instante dado. */
function tzOffsetMin(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  // hour '24' aparece a medianoche en algunas plataformas → normalizar a 0
  const hour = p.hour === 24 ? 0 : p.hour;
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, hour, p.minute, p.second);
  return (asUTC - date.getTime()) / 60000;
}

/** Hora de pared "YYYY-MM-DD HH:MM" en zona `tz` → epoch ms (UTC). */
function zonedToUtcMs(fechaISO: string, hora: string, tz: string): number {
  const [y, mo, d] = fechaISO.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // una iteración alcanza salvo en el salto de DST (no aplica a publicaciones al mediodía)
  const off = tzOffsetMin(new Date(guess), tz);
  return guess - off * 60000;
}

const TZ: Record<string, string> = {
  ET: "America/New_York", // USDA, CFTC, EIA, NOPA (con DST)
  BR: "America/Sao_Paulo", // CONAB (= AR todo el año, sin DST desde 2019)
  AR: "America/Argentina/Cordoba",
};

/** Hora Argentina "HH:MM" de un instante. */
function horaArgDe(ms: number): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ.AR,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

/** Construye un evento con hora conocida (calcula instante + hora AR). */
function ev(
  base: Omit<EventoCalendario, "horaArg" | "instant">,
  hora: string,
  tz: string,
): EventoCalendario {
  const instant = zonedToUtcMs(base.fechaISO, hora, tz);
  return { ...base, instant, horaArg: horaArgDe(instant) };
}

/* ------------------------------------------------------------------ */
/* Seed de fechas OFICIALES 2026 (verificadas — ver plan §1/§2)        */
/* ------------------------------------------------------------------ */

// Todas las fechas están en hora local del organismo, que coincide con el día AR
// (12:00 ET = 13:00/14:00 AR mismo día; 09:00 BR = 09:00 AR mismo día).

/** WASDE + Crop Production (NASS) — mismo día y hora. 12:00 ET. */
const WASDE_2026 = ["2026-08-12", "2026-09-11", "2026-10-09", "2026-11-10", "2026-12-10"];

/** Grain Stocks + Small Grains Summary (NASS) — trimestral. 12:00 ET. */
const GRAIN_STOCKS_2026 = ["2026-09-30"];

/** Crop Progress (NASS) — lunes 16:00 ET (con corrimiento a martes por feriado US, ya aplicado). */
const CROP_PROGRESS_2026 = [
  "2026-07-13", "2026-07-20", "2026-07-27",
  "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31",
  "2026-09-08", "2026-09-14", "2026-09-21", "2026-09-28", // 08-sep martes (Labor Day)
  "2026-10-05", "2026-10-13", "2026-10-19", "2026-10-26", // 13-oct martes (Columbus Day)
  "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30",
];

/** CONAB — Levantamento da Safra de Grãos. 09:00 Brasília. */
const CONAB_2026 = ["2026-07-14", "2026-08-13", "2026-09-15", "2026-10-15", "2026-11-13", "2026-12-15"];

const U = {
  wasde: "https://www.usda.gov/oce/commodity-markets/wasde",
  grainStocks: "https://www.nass.usda.gov/Publications/Calendar/2026/NassReleases2026.ics",
  cropProgress: "https://www.nass.usda.gov/Publications/Calendar/2026/NassReleases2026.ics",
  conab:
    "https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/safra-de-graos/boletim-da-safra-de-graos",
  gea: "https://www.bcr.com.ar/es/mercados/gea/estimaciones-nacionales-de-produccion/estimaciones",
  geaSemanal: "https://www.bcr.com.ar/es/mercados/gea/seguimiento-de-cultivos/informe-semanal-zona-nucleo",
  informativo: "https://www.bcr.com.ar/es/mercados/investigacion-y-desarrollo/informativo-semanal",
  pas: "https://www.bolsadecereales.com/estimaciones-agricolas",
  dea: "https://www.magyp.gob.ar/sitio/areas/estimaciones/estimaciones/informes/",
  cftc: "https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm",
  eia: "https://www.eia.gov/petroleum/supply/weekly/",
  conabProgresso:
    "https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/safras/progresso-de-safra",
};

/* ------------------------------------------------------------------ */
/* Generadores por REGLA                                              */
/* ------------------------------------------------------------------ */

function inRange(iso: string, desde: string, hasta: string): boolean {
  return iso >= desde && iso <= hasta;
}

/** Recorre días [desde, hasta] cuyo weekday (0=dom..6=sáb, UTC) coincida. */
function diasDeSemana(desde: string, hasta: string, weekday: number): Date[] {
  const out: Date[] = [];
  const d = new Date(`${desde}T12:00:00Z`);
  const end = new Date(`${hasta}T12:00:00Z`);
  while (d <= end) {
    if (d.getUTCDay() === weekday) out.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Si la fecha AR cae feriado, la corre al hábil anterior (los informes AR se adelantan). */
function corrigeFeriadoAR(d: Date): Date {
  const x = new Date(d);
  while (FERIADOS_AR.has(ymd(x)) || x.getUTCDay() === 0 || x.getUTCDay() === 6) {
    x.setUTCDate(x.getUTCDate() - 1);
  }
  return x;
}

/* ------------------------------------------------------------------ */
/* API pública                                                        */
/* ------------------------------------------------------------------ */

/** Todos los eventos del calendario en el rango [desdeISO, hastaISO] (inclusive), ordenados. */
export function getEventos(desdeISO: string, hastaISO: string): EventoCalendario[] {
  const out: EventoCalendario[] = [];

  // --- OFICIALES ---
  for (const f of WASDE_2026) {
    if (!inRange(f, desdeISO, hastaISO)) continue;
    out.push(
      ev(
        {
          organismo: "USDA",
          informe: "WASDE + Crop Production",
          fechaISO: f,
          region: "EEUU · Argentina · Brasil · mundo",
          granos: "soja, maíz, trigo (+ EEUU: sorgo, cebada)",
          importancia: "alta",
          tipo: "oficial",
          url: U.wasde,
          nota: "El informe que mueve CBOT. Producción por país + oferta/demanda mundial.",
        },
        "12:00",
        TZ.ET,
      ),
    );
  }
  for (const f of GRAIN_STOCKS_2026) {
    if (!inRange(f, desdeISO, hastaISO)) continue;
    out.push(
      ev(
        {
          organismo: "USDA",
          informe: "Grain Stocks + Small Grains Summary",
          fechaISO: f,
          region: "EEUU",
          granos: "maíz, soja, trigo, sorgo, cebada",
          importancia: "alta",
          tipo: "oficial",
          url: U.grainStocks,
          nota: "Stocks trimestrales EEUU — suele dar las sorpresas más fuertes en CBOT.",
        },
        "12:00",
        TZ.ET,
      ),
    );
  }
  for (const f of CROP_PROGRESS_2026) {
    if (!inRange(f, desdeISO, hastaISO)) continue;
    out.push(
      ev(
        {
          organismo: "USDA",
          informe: "Crop Progress & Conditions",
          fechaISO: f,
          region: "EEUU",
          granos: "maíz, soja, trigo, sorgo",
          importancia: "media",
          tipo: "oficial",
          url: U.cropProgress,
          nota: "Avance y condición del cultivo EEUU. Marca la apertura del martes en CBOT.",
        },
        "16:00",
        TZ.ET,
      ),
    );
  }
  for (const f of CONAB_2026) {
    if (!inRange(f, desdeISO, hastaISO)) continue;
    out.push(
      ev(
        {
          organismo: "CONAB",
          informe: "Levantamento da Safra de Grãos",
          fechaISO: f,
          region: "Brasil",
          granos: "soja, milho (1ª/2ª/3ª), trigo, girassol, sorgo, cevada",
          importancia: "alta",
          tipo: "oficial",
          url: U.conab,
          nota: "Estimación oficial de Brasil por estado. Trae la comparación vs. safra anterior.",
        },
        "09:00",
        TZ.BR,
      ),
    );
  }

  // --- REGLAS: semanales AR ---
  for (const d of diasDeSemana(desdeISO, hastaISO, 4)) {
    // PAS (BCBA) — jueves 15:00 AR (regla fija).
    out.push(
      ev(
        {
          organismo: "BCBA",
          informe: "Panorama Agrícola Semanal (PAS)",
          fechaISO: ymd(d),
          region: "Argentina",
          granos: "los 6 granos",
          importancia: "alta",
          tipo: "regla",
          url: U.pas,
          nota: "Estimación semanal de producción AR. Sale gratis los jueves 15:00.",
        },
        "15:00",
        TZ.AR,
      ),
    );
    // GEA semanal zona núcleo (BCR) — jueves ~17:30 (se corre a viernes por feriado).
    const gea = corrigeFeriadoAR(d);
    out.push(
      ev(
        {
          organismo: "BCR",
          informe: "Informe Semanal Zona Núcleo (GEA)",
          fechaISO: ymd(gea),
          region: "Argentina (zona núcleo)",
          granos: "trigo, soja, maíz",
          importancia: "media",
          tipo: "regla",
          url: U.geaSemanal,
          nota: "Condición de cultivos y clima de la zona núcleo.",
        },
        "17:30",
        TZ.AR,
      ),
    );
    // DEA semanal (SAGyP) — jueves ~17:00 (se corre por feriado).
    const dea = corrigeFeriadoAR(d);
    out.push(
      ev(
        {
          organismo: "DEA",
          informe: "Informe Semanal de Estimaciones (SAGyP)",
          fechaISO: ymd(dea),
          region: "Argentina",
          granos: "los 6 granos",
          importancia: "media",
          tipo: "regla",
          url: U.dea,
          nota: "Avance de siembra/cosecha y condición, oficial.",
        },
        "17:00",
        TZ.AR,
      ),
    );
  }

  // Informativo Semanal BCR — viernes.
  for (const d of diasDeSemana(desdeISO, hastaISO, 5)) {
    out.push({
      organismo: "BCR",
      informe: "Informativo Semanal BCR",
      fechaISO: ymd(d),
      horaArg: null,
      instant: null,
      region: "Argentina",
      granos: "análisis de mercado",
      importancia: "baja",
      tipo: "regla",
      url: U.informativo,
      nota: "Exportaciones, molienda, logística y análisis.",
    });
  }

  // CONAB Progresso de Safra — lunes 19:00 AR.
  for (const d of diasDeSemana(desdeISO, hastaISO, 1)) {
    out.push(
      ev(
        {
          organismo: "CONAB",
          informe: "Progresso de Safra",
          fechaISO: ymd(d),
          region: "Brasil",
          granos: "soja, milho, trigo",
          importancia: "baja",
          tipo: "regla",
          url: U.conabProgresso,
          nota: "Avance de siembra/cosecha semanal por estado.",
        },
        "19:00",
        TZ.BR,
      ),
    );
  }

  // --- REGLAS: contexto de mercado (semanal) ---
  // CFTC Commitments of Traders — viernes 15:30 ET (posición de fondos).
  for (const d of diasDeSemana(desdeISO, hastaISO, 5)) {
    out.push(
      ev(
        {
          organismo: "CFTC",
          informe: "Commitments of Traders (COT)",
          fechaISO: ymd(d),
          region: "CBOT",
          granos: "posición de fondos en granos",
          importancia: "media",
          tipo: "regla",
          url: U.cftc,
          nota: "Posición especulativa y comercial. Datos al martes. Se corre por feriado US.",
        },
        "15:30",
        TZ.ET,
      ),
    );
  }
  // EIA etanol — miércoles 10:30 ET.
  for (const d of diasDeSemana(desdeISO, hastaISO, 3)) {
    out.push(
      ev(
        {
          organismo: "EIA",
          informe: "Producción y stocks de etanol",
          fechaISO: ymd(d),
          region: "EEUU",
          granos: "demanda de maíz (etanol)",
          importancia: "baja",
          tipo: "regla",
          url: U.eia,
          nota: "Molienda de maíz para etanol. Se corre un día por feriado US.",
        },
        "10:30",
        TZ.ET,
      ),
    );
  }

  // --- REGLAS: mensuales AR ---
  // GEA mensual (BCR) — 2° miércoles del mes, ~17:00 AR. Actualiza el número nacional.
  for (const [y, m] of mesesEnRango(desdeISO, hastaISO)) {
    const f = nEsimoDiaDeSemana(y, m, 3, 2); // 2° miércoles
    if (f && inRange(f, desdeISO, hastaISO)) {
      out.push(
        ev(
          {
            organismo: "BCR",
            informe: "Estimación Mensual Nacional (GEA)",
            fechaISO: f,
            region: "Argentina",
            granos: "soja, maíz, trigo",
            importancia: "alta",
            tipo: "regla",
            url: U.gea,
            nota: "Revisión mensual del número nacional de producción (2° miércoles).",
          },
          "17:00",
          TZ.AR,
        ),
      );
    }
  }
  // DEA mensual (SAGyP) — un jueves entre el 18 y el 23. Estimada.
  for (const [y, m] of mesesEnRango(desdeISO, hastaISO)) {
    const f = juevesEntre(y, m, 18, 23);
    if (f && inRange(f, desdeISO, hastaISO)) {
      out.push(
        ev(
          {
            organismo: "DEA",
            informe: "Informe Mensual de Estimaciones (SAGyP)",
            fechaISO: f,
            region: "Argentina",
            granos: "los 6 granos + 30 cultivos",
            importancia: "alta",
            tipo: "regla",
            url: U.dea,
            nota: "Estimación oficial mensual por provincia. Trae el delta vs. mes anterior.",
          },
          "12:00",
          TZ.AR,
        ),
      );
    }
  }

  // Orden: por fecha, luego por hora (sin hora al final), luego por importancia.
  const impOrd: Record<Importancia, number> = { alta: 0, media: 1, baja: 2 };
  return out.sort((a, b) => {
    if (a.fechaISO !== b.fechaISO) return a.fechaISO < b.fechaISO ? -1 : 1;
    if (a.instant !== b.instant) {
      if (a.instant === null) return 1;
      if (b.instant === null) return -1;
      return a.instant - b.instant;
    }
    return impOrd[a.importancia] - impOrd[b.importancia];
  });
}

/* ------------------------------------------------------------------ */
/* Helpers de calendario mensual                                      */
/* ------------------------------------------------------------------ */

/** Lista [año, mes(1-12)] que toca el rango. */
function mesesEnRango(desde: string, hasta: string): Array<[number, number]> {
  const [y0, m0] = desde.split("-").map(Number);
  const [y1, m1] = hasta.split("-").map(Number);
  const out: Array<[number, number]> = [];
  let y = y0;
  let m = m0;
  while (y < y1 || (y === y1 && m <= m1)) {
    out.push([y, m]);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

/** N-ésimo día-de-semana del mes (weekday 0=dom..6=sáb, n=1..5). ISO o "" si no existe. */
function nEsimoDiaDeSemana(anio: number, mes: number, weekday: number, n: number): string {
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  const shift = (weekday - primero.getUTCDay() + 7) % 7;
  const dia = 1 + shift + (n - 1) * 7;
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  if (d.getUTCMonth() !== mes - 1) return "";
  return ymd(d);
}

/** Primer jueves cuyo día del mes caiga en [minDia, maxDia]. ISO o "". */
function juevesEntre(anio: number, mes: number, minDia: number, maxDia: number): string {
  for (let dia = minDia; dia <= maxDia; dia++) {
    const d = new Date(Date.UTC(anio, mes - 1, dia));
    if (d.getUTCMonth() === mes - 1 && d.getUTCDay() === 4) return ymd(d);
  }
  return "";
}

/* ------------------------------------------------------------------ */
/* Presentación                                                       */
/* ------------------------------------------------------------------ */

export const ORG_LABEL: Record<Organismo, string> = {
  USDA: "USDA",
  CONAB: "CONAB",
  BCR: "BCR · GEA",
  BCBA: "BCBA",
  DEA: "SAGyP",
  CFTC: "CFTC",
  EIA: "EIA",
  NOPA: "NOPA",
};

/** "2026-08-12" → "mié 12 ago". */
export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${iso}T12:00:00Z`));
}

/** "2026-08-12" → "miércoles 12 de agosto". */
export function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T12:00:00Z`));
}
