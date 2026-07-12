import "server-only";
import { cache } from "react";
import { a3Configured, getA3Token, getA3MarketData, getA3InstrumentsBySegment } from "./a3";
import { getPases } from "./pases-cierres";
import { getCierresGranos } from "./futuros";
import { ruedaAgroAbierta } from "./rueda";
import type { Meta } from "./market";

/**
 * Feed A3 en vivo: puntas (comprador/vendedor), último y volumen operado de la
 * rueda, tomados de la API REST de A3/Cocos xOMS (`getA3MarketData`). Es la capa
 * "viva" que el cierre diario del CEM no puede dar (el CEM no publica instrumentos
 * de pase ni puntas). Se sirve por la MISMA regeneración ISR de la página
 * (`revalidate = 60` + `getA3MarketData` con `revalidate: 30`), no por un cron:
 * cuando alguien mira el panel en horario de rueda, ve datos de ~1 minuto.
 *
 * Todo degrada solo: sin credenciales (Preview / sandbox), sin token o con A3
 * caído, las columnas muestran "—" y el resto del panel sigue intacto.
 */

export type Puntas = {
  bid: number | null; // mejor punta compradora (BI[0])
  bidSize: number | null;
  ask: number | null; // mejor punta vendedora / oferta (OF[0])
  askSize: number | null;
  last: number | null; // último precio operado (LA)
  vol: number | null; // volumen operado en el día (TV)
};

export type LiveEstado = "ok" | "parcial" | "caido" | "sin-config";

export type LiveResult = {
  puntas: Map<string, Puntas>; // clave = símbolo A3 (spreadSymbol o symbol del futuro)
  estado: LiveEstado;
  pedidos: number; // símbolos solicitados
  respondidos: number; // símbolos con marketData
  updatedAt: number | null; // epoch ms del armado (si hubo al menos una respuesta)
};

const ENTRIES = "BI,OF,LA,TV"; // una sola URL cacheable por símbolo (más chica que el default de 7)
const CONCURRENCY = 6;
const DEADLINE_MS = 10_000; // tope global: no lanzar requests nuevos pasado esto (la regeneración ISR no puede colgar)

const SIN_CONFIG: LiveResult = {
  puntas: new Map(),
  estado: "sin-config",
  pedidos: 0,
  respondidos: 0,
  updatedAt: null,
};

/* ---------------- parsing tolerante (la API de A3 no está tipada de forma confiable) ---------------- */

const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);

/** BI/OF: array de niveles | objeto {price,size} | número suelto | ausente → primer nivel. */
function nivel(x: unknown): { price: number | null; size: number | null } {
  if (Array.isArray(x)) return nivel(x[0]);
  if (x !== null && typeof x === "object") {
    const o = x as Record<string, unknown>;
    return { price: num(o.price), size: num(o.size) };
  }
  return { price: num(x), size: null };
}

/** LA: {price,...} | número → precio. */
function precio(x: unknown): number | null {
  if (x !== null && typeof x === "object") return num((x as Record<string, unknown>).price);
  return num(x);
}

/** TV (volumen): número | {size} | {price} → cantidad. */
function volumen(x: unknown): number | null {
  if (x !== null && typeof x === "object") {
    const o = x as Record<string, unknown>;
    return num(o.size) ?? num(o.price);
  }
  return num(x);
}

function toPuntas(md: unknown): Puntas {
  const o = (md !== null && typeof md === "object" ? md : {}) as Record<string, unknown>;
  const bi = nivel(o.BI);
  const of = nivel(o.OF);
  return {
    bid: bi.price,
    bidSize: bi.size,
    ask: of.price,
    askSize: of.size,
    last: precio(o.LA),
    vol: volumen(o.TV),
  };
}

/* ---------------- fetch con concurrencia limitada + deadline global ---------------- */

async function fetchPuntas(symbols: string[]): Promise<LiveResult> {
  if (!a3Configured()) return SIN_CONFIG;
  if (symbols.length === 0) {
    return { puntas: new Map(), estado: "ok", pedidos: 0, respondidos: 0, updatedAt: null };
  }
  const token = await getA3Token();
  if (!token) {
    return { puntas: new Map(), estado: "caido", pedidos: symbols.length, respondidos: 0, updatedAt: null };
  }

  const deadline = Date.now() + DEADLINE_MS;
  const puntas = new Map<string, Puntas>();
  let idx = 0;
  let fallidos = 0;

  const worker = async () => {
    while (idx < symbols.length) {
      const sym = symbols[idx++];
      if (!sym) continue;
      if (Date.now() > deadline) {
        fallidos++;
        continue;
      }
      const md = await getA3MarketData(sym, ENTRIES); // por-URL: revalidate 30 + timeout 8s propios de a3.ts
      if (md) puntas.set(sym, toPuntas(md));
      else fallidos++;
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, symbols.length) }, worker));

  const respondidos = puntas.size;
  const estado: LiveEstado = respondidos === 0 ? "caido" : fallidos > 0 ? "parcial" : "ok";
  if (fallidos > 0) console.error(`[a3-live] ${fallidos}/${symbols.length} símbolos sin marketdata`);
  return {
    puntas,
    estado,
    pedidos: symbols.length,
    respondidos,
    updatedAt: respondidos > 0 ? Date.now() : null,
  };
}

/* ---------------- entradas públicas ---------------- */

/** Puntas de los instrumentos de PASE que muestra el panel Pases. */
export const getPasesLive = cache(async (): Promise<LiveResult> => {
  if (!a3Configured()) return SIN_CONFIG;
  const [{ granos }, instrumentos] = await Promise.all([getPases(), getA3InstrumentsBySegment("DDA")]);
  const candidatos = granos.flatMap((g) => g.spreads.map((s) => s.spreadSymbol));
  // Sólo pedimos instrumentos de pase que A3 realmente lista; si la lista falló
  // (token OK pero sin datos), caemos a pedir todos los candidatos (los inexistentes dan "—").
  let symbols = candidatos;
  if (instrumentos.length > 0) {
    const set = new Set(instrumentos);
    symbols = candidatos.filter((s) => set.has(s));
  }
  return fetchPuntas(symbols);
});

/** Puntas de los FUTUROS outright que muestra el panel Arbitrajes. */
export const getFuturosLive = cache(async (): Promise<LiveResult> => {
  if (!a3Configured()) return SIN_CONFIG;
  const { granos } = await getCierresGranos();
  const symbols = granos.flatMap((g) =>
    g.posiciones.filter((p) => p.venc > 0).map((p) => p.symbol),
  );
  return fetchPuntas(symbols);
});

/* ---------------- merge de meta (cierres + capa en vivo) ---------------- */

/**
 * Combina la meta base (cierres/pizarra) con el estado del feed en vivo en un
 * único sello. Reglas: el status base nunca se "mejora"; fuera de rueda la
 * ausencia de datos en vivo NO es una falla (el libro está cerrado); durante la
 * rueda, un feed caído sí degrada a PARCIAL.
 */
export function mergeLiveMeta(base: Meta, live: LiveResult): Meta {
  const problemas = [...base.problemas];
  const rueda = ruedaAgroAbierta();
  let status = base.status;

  if (live.estado === "sin-config") {
    problemas.push("A3 en vivo sin configurar (puntas solo en producción)");
  } else if (live.estado === "caido") {
    if (rueda && base.status === "real") {
      status = "parcial";
      problemas.push("A3 en vivo caído: sin comprador/vendedor de la rueda");
    }
    // fuera de rueda: libro cerrado, no se degrada.
  } else if (live.estado === "parcial" && rueda) {
    problemas.push(`A3 en vivo incompleto: ${live.pedidos - live.respondidos} puntas sin responder`);
  }

  const hayVivo = live.respondidos > 0;
  return {
    source: base.source,
    updatedAt: hayVivo ? live.updatedAt : base.updatedAt,
    status,
    problemas,
  };
}
