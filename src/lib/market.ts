import "server-only";
import { cache } from "react";

/**
 * Capa de datos de mercado (fuentes públicas, todo REST server-side).
 *
 * - `fetchJson` está envuelto en React.cache() → una sola llamada por URL por
 *   render (dedup entre paneles) + `revalidate` 60s entre requests (ISR).
 * - Cada función devuelve `meta` (fuente, hora real del dato, estado
 *   REAL/PARCIAL/EJEMPLO y problemas) para frescura honesta en los paneles.
 * - Los fetch nunca tiran: devuelven Result; una fuente caída degrada su panel,
 *   no la página. (Los logs de error se ven en Vercel → Logs, retención corta;
 *   la observabilidad durable llega con snapshots.ok en la fase Supabase.)
 */

const REVALIDATE = 60;

/* ---------------- Estado / meta de frescura ---------------- */

export type FuenteStatus = "real" | "parcial" | "ejemplo";

export type Meta = {
  source: string;
  updatedAt: number | null; // epoch ms de armado del dato (null si es todo ejemplo)
  status: FuenteStatus;
  problemas: string[]; // fuentes caídas u observaciones para el usuario
};

/* ---------------- fetch con Result + dedup ---------------- */

type FetchResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: "timeout" | "http" | "parse" | "network"; status?: number };

const fetchJson = cache(async (url: string): Promise<FetchResult> => {
  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json", "user-agent": "rfagro-research-web/0.1" },
    });
    if (!res.ok) {
      console.error(`[market] HTTP ${res.status} en ${url}`);
      return { ok: false, reason: "http", status: res.status };
    }
    try {
      return { ok: true, data: await res.json() };
    } catch {
      console.error(`[market] JSON inválido en ${url}`);
      return { ok: false, reason: "parse" };
    }
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    console.error(`[market] ${timeout ? "timeout" : "error de red"} en ${url}`);
    return { ok: false, reason: timeout ? "timeout" : "network" };
  }
});

/* ---------------- guards de shape (las fuentes son APIs de terceros) ---------------- */

const asNum = (x: unknown): number | null =>
  typeof x === "number" && Number.isFinite(x) ? x : null;
const asStr = (x: unknown): string | null =>
  typeof x === "string" && x.length > 0 ? x : null;
const asObj = (x: unknown): Record<string, unknown> | null =>
  x !== null && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : null;
const asArr = (x: unknown): unknown[] | null => (Array.isArray(x) ? x : null);

/* ---------------- fuentes ---------------- */

type DolarApiRow = { casa: string; venta: number };

const getDolarApi = cache(async (): Promise<DolarApiRow[] | null> => {
  const r = await fetchJson("https://dolarapi.com/v1/dolares");
  if (!r.ok) return null;
  const arr = asArr(r.data);
  if (!arr) return null;
  const rows: DolarApiRow[] = [];
  for (const it of arr) {
    const o = asObj(it);
    if (!o) continue;
    const casa = asStr(o.casa);
    const venta = asNum(o.venta);
    if (casa && venta !== null) rows.push({ casa, venta });
  }
  return rows.length ? rows : null;
});

type CriptoyaQuote = { price: number | null; variation: number | null };

const getCriptoya = cache(async (): Promise<Record<string, CriptoyaQuote> | null> => {
  const r = await fetchJson("https://criptoya.com/api/dolar");
  if (!r.ok) return null;
  const o = asObj(r.data);
  if (!o) return null;
  const out: Record<string, CriptoyaQuote> = {};
  for (const [k, v] of Object.entries(o)) {
    const q = asObj(v);
    if (q) out[k] = { price: asNum(q.price), variation: asNum(q.variation) };
  }
  return Object.keys(out).length ? out : null;
});

type MaeResumenRow = {
  ticker: string;
  ultimo: number;
  variacion: number | null;
  cantidad: number | null;
};

const getMaeResumen = cache(async (seg: "DDF" | "FOR"): Promise<MaeResumenRow[] | null> => {
  const r = await fetchJson(`https://api.marketdata.mae.com.ar/api/mercado/resumen/${seg}`);
  if (!r.ok) return null;
  const arr = asArr(r.data);
  if (!arr) return null;
  const rows: MaeResumenRow[] = [];
  for (const it of arr) {
    const o = asObj(it);
    if (!o) continue;
    const ticker = asStr(o.ticker);
    const ultimo = asNum(o.ultimo);
    if (ticker && ultimo !== null && ultimo > 0) {
      rows.push({ ticker, ultimo, variacion: asNum(o.variacion), cantidad: asNum(o.cantidad) });
    }
  }
  return rows.length ? rows : null;
});

type NoteRow = {
  symbol: string;
  c: number | null;
  px_bid: number | null;
  px_ask: number | null;
  pct_change: number | null;
};

const getNotes = cache(async (): Promise<NoteRow[] | null> => {
  const r = await fetchJson("https://data912.com/live/arg_notes");
  if (!r.ok) return null;
  const arr = asArr(r.data);
  if (!arr) return null;
  const rows: NoteRow[] = [];
  for (const it of arr) {
    const o = asObj(it);
    if (!o) continue;
    const symbol = asStr(o.symbol);
    if (!symbol) continue;
    rows.push({
      symbol,
      c: asNum(o.c),
      px_bid: asNum(o.px_bid),
      px_ask: asNum(o.px_ask),
      pct_change: asNum(o.pct_change),
    });
  }
  return rows.length ? rows : null;
});

/**
 * Dólar oficial mayorista MAE (A3500 del día) = ticker "UST$T" en resumen/FOR.
 * Referencia para dólar futuro (spot) y dólar linked (ajuste).
 */
export const getMaeOficial = cache(
  async (): Promise<{ valor: number | null; varPct: number | null }> => {
    const rows = await getMaeResumen("FOR");
    const ust =
      rows?.find((r) => r.ticker === "UST$T") ?? rows?.find((r) => r.ticker.startsWith("UST$"));
    return { valor: ust?.ultimo ?? null, varPct: ust?.variacion ?? null };
  },
);

/* ---------------- parsing de tickers DDF (parser único; se extrae a tickers.ts en Fase B) ---------------- */

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function parseDdf(ticker: string): { label: string; venc: Date } | null {
  const m = /^DLR(\d{2})(\d{4})$/.exec(ticker);
  if (!m) return null;
  const mm = Number(m[1]);
  const yy = Number(m[2]);
  if (mm < 1 || mm > 12 || yy < 2000 || yy > 2100) return null;
  // Aproximación: último día calendario del mes (A3 liquida último día hábil; fino en Fase B)
  return { label: `${MESES[mm - 1]}${String(yy).slice(2)}`, venc: new Date(yy, mm, 0) };
}

/* ---------------- Módulo 0: Cinta ---------------- */

export type CintaItem = {
  label: string;
  value: number | null;
  decimals: number;
  change: number | null; // variación diaria en %
  source: string;
  sample?: boolean; // true = dato de ejemplo (sin fuente automatizada aún)
};

export type CintaData = { items: CintaItem[]; meta: Meta };

export const getCintaData = cache(async (): Promise<CintaData> => {
  const [dolar, cripto, ddf, mae] = await Promise.all([
    getDolarApi(),
    getCriptoya(),
    getMaeResumen("DDF"),
    getMaeOficial(),
  ]);

  const problemas: string[] = [];
  if (!cripto) problemas.push("criptoya caído (oficial)");
  if (!dolar) problemas.push("dolarapi caído (MEP/CCL)");
  if (mae.valor === null) problemas.push("MAE caído (mayorista)");
  if (!ddf) problemas.push("MAE caído (dólar futuro)");

  const byCasa = (casa: string) => dolar?.find((d) => d.casa === casa) ?? null;

  // Posición de dólar futuro más cercana (a hoy) del resumen DDF
  const now = Date.now();
  const fut = (ddf ?? [])
    .map((r) => ({ row: r, p: parseDdf(r.ticker) }))
    .filter((x): x is { row: MaeResumenRow; p: { label: string; venc: Date } } => x.p !== null)
    .filter((x) => x.p.venc.getTime() >= now - 40 * 86400000)
    .sort((a, b) => a.p.venc.getTime() - b.p.venc.getTime())[0];

  const items: CintaItem[] = [
    {
      label: "Oficial",
      value: cripto?.oficial?.price ?? null,
      decimals: 2,
      change: cripto?.oficial?.variation ?? null,
      source: "criptoya",
    },
    {
      label: "Mayorista",
      value: mae.valor,
      decimals: 2,
      change: mae.varPct,
      source: "MAE",
    },
    { label: "MEP", value: byCasa("bolsa")?.venta ?? null, decimals: 2, change: null, source: "dolarapi" },
    { label: "CCL", value: byCasa("contadoconliqui")?.venta ?? null, decimals: 2, change: null, source: "dolarapi" },
    {
      label: fut ? `Fut ${fut.p.label}` : "Dólar futuro",
      value: fut?.row.ultimo ?? null,
      decimals: 2,
      change: fut?.row.variacion ?? null,
      source: "MAE",
    },
    // Pizarra: ejemplo hasta enganchar CAC-BCR (Fase C).
    { label: "Soja pizarra USD", value: 312.9, decimals: 1, change: 1.2, source: "CAC-BCR", sample: true },
    { label: "Maíz pizarra USD", value: 182.0, decimals: 1, change: 0.0, source: "CAC-BCR", sample: true },
    { label: "Trigo pizarra USD", value: 207.0, decimals: 1, change: -0.5, source: "CAC-BCR", sample: true },
  ];

  return {
    items,
    meta: {
      source: "criptoya + MAE + dolarapi",
      updatedAt: Date.now(),
      status: "parcial", // mezcla dato real + pizarra de ejemplo
      problemas,
    },
  };
});

/* ---------------- Módulo 3: Curva de dólar futuro (MAE DDF) ---------------- */

export type DFPosicion = {
  ticker: string;
  label: string; // p.ej. JUL26
  ultimo: number;
  varPct: number | null;
  volumen: number;
  fecha: number; // epoch del vencimiento (ordena la curva)
  dias: number | null;
  directaPct: number | null;
  tnaPct: number | null;
  temPct: number | null;
  teaPct: number | null;
};

export type DolarFuturoData = {
  spot: number | null; // oficial mayorista MAE
  posiciones: DFPosicion[];
  meta: Meta;
};

/**
 * Tasas implícitas — metodología A3 (spot = oficial mayorista MAE, base 365):
 *   directa = Fut/Spot − 1 · TNA = directa × 365/días
 *   TEA = (Fut/Spot)^(365/días) − 1 · TEM = (1+TEA)^(1/12) − 1
 */
export const getDolarFuturo = cache(async (): Promise<DolarFuturoData> => {
  const [ddf, mae] = await Promise.all([getMaeResumen("DDF"), getMaeOficial()]);
  const spot = mae.valor;
  const now = Date.now();

  const problemas: string[] = [];
  if (!ddf) problemas.push("MAE DDF caído");
  if (spot === null) problemas.push("oficial MAE caído (sin tasas)");

  const posiciones: DFPosicion[] = (ddf ?? [])
    .map((r): DFPosicion | null => {
      const p = parseDdf(r.ticker);
      if (!p) return null;
      const dias = Math.max(1, Math.round((p.venc.getTime() - now) / 86400000));

      let directaPct: number | null = null;
      let tnaPct: number | null = null;
      let temPct: number | null = null;
      let teaPct: number | null = null;
      if (spot && spot > 0) {
        const ratio = r.ultimo / spot;
        directaPct = (ratio - 1) * 100;
        tnaPct = (ratio - 1) * (365 / dias) * 100;
        const tea = Math.pow(ratio, 365 / dias) - 1;
        teaPct = tea * 100;
        temPct = (Math.pow(1 + tea, 1 / 12) - 1) * 100;
      }

      return {
        ticker: r.ticker,
        label: p.label,
        ultimo: r.ultimo,
        varPct: r.variacion,
        volumen: r.cantidad ?? 0,
        fecha: p.venc.getTime(),
        dias,
        directaPct,
        tnaPct,
        temPct,
        teaPct,
      };
    })
    .filter((x): x is DFPosicion => x !== null)
    .sort((a, b) => a.fecha - b.fecha);

  return {
    spot,
    posiciones,
    meta: {
      source: "MAE",
      updatedAt: now,
      status: ddf && spot !== null ? "real" : "parcial",
      problemas,
    },
  };
});

/* ---------------- Módulo 4: Dólar linked (data912) ---------------- */

export type DLBono = {
  symbol: string;
  px: number;
  tcImpl: number;
  difMep: number | null;
  spreadOficial: number | null; // Oficial MAE − TC implícito
  varPct: number | null;
  dias: number | null;
  tnaPct: number | null;
  temPct: number | null;
  teaPct: number | null;
};

export type DolarLinkedData = {
  mep: number | null;
  oficial: number | null; // oficial mayorista MAE
  bonos: DLBono[];
  meta: Meta;
};

// Código de mes en tickers argentinos: E F M A Y J L G S O N D
const MONTH_LETTER: Record<string, number> = {
  E: 0, F: 1, M: 2, A: 3, Y: 4, J: 5, L: 6, G: 7, S: 8, O: 9, N: 10, D: 11,
};

// Vencimiento inferido del ticker, p.ej. D30S6 → 30/sep/2026 (parser fino en Fase B)
function vencFromTicker(sym: string): number | null {
  const m = /^[DS](\d{2})([EFMAYJLGSOND])(\d)$/.exec(sym);
  if (!m) return null;
  const day = Number(m[1]);
  if (day < 1 || day > 31) return null;
  const month = MONTH_LETTER[m[2]];
  const year = 2020 + Number(m[3]);
  return new Date(year, month, day).getTime();
}

export const getDolarLinked = cache(async (): Promise<DolarLinkedData> => {
  const [notes, dolar, mae] = await Promise.all([getNotes(), getDolarApi(), getMaeOficial()]);

  const mep = dolar?.find((d) => d.casa === "bolsa")?.venta ?? null;
  const oficial = mae.valor;
  const now = Date.now();

  const problemas: string[] = [];
  if (!notes) problemas.push("data912 caído");
  if (oficial === null) problemas.push("oficial MAE caído (sin tasas)");
  if (mep === null) problemas.push("dolarapi caído (sin dif. MEP)");

  const bonos: DLBono[] = (notes ?? [])
    .filter((n) => /^D\d/.test(n.symbol))
    .map((n) => {
      const px = n.c ?? (n.px_bid !== null && n.px_ask !== null ? (n.px_bid + n.px_ask) / 2 : null);
      if (px === null || px <= 0) return null;
      const tcImpl = px / 100;
      const venc = vencFromTicker(n.symbol);
      const dias = venc ? Math.max(1, Math.round((venc - now) / 86400000)) : null;

      let tnaPct: number | null = null;
      let temPct: number | null = null;
      let teaPct: number | null = null;
      if (oficial && oficial > 0 && dias) {
        const directa = oficial / tcImpl - 1;
        tnaPct = directa * (365 / dias) * 100;
        const tea = Math.pow(oficial / tcImpl, 365 / dias) - 1;
        teaPct = tea * 100;
        temPct = (Math.pow(1 + tea, 1 / 12) - 1) * 100;
      }

      return {
        symbol: n.symbol,
        px,
        tcImpl,
        difMep: mep !== null ? mep - tcImpl : null,
        spreadOficial: oficial !== null ? oficial - tcImpl : null,
        varPct: n.pct_change,
        dias,
        tnaPct,
        temPct,
        teaPct,
      };
    })
    .filter((x): x is DLBono => x !== null)
    .sort((a, b) => (a.dias ?? 1e12) - (b.dias ?? 1e12));

  return {
    mep,
    oficial,
    bonos,
    meta: {
      source: "data912",
      updatedAt: now,
      status: notes && oficial !== null ? "real" : "parcial",
      problemas,
    },
  };
});

/* ---------------- Módulo 7: Panel cambiario / volumen (MAE) ---------------- */

export type VolCat = { nombre: string; grupo: string; volumenUsd: number; share: number };

export type VolumenData = {
  cats: VolCat[];
  oficial: number | null;
  oficialVarPct: number | null;
  meta: Meta;
};

export const getVolumenCambiario = cache(async (): Promise<VolumenData> => {
  const [r, mae] = await Promise.all([
    fetchJson("https://api.marketdata.mae.com.ar/api/mercado/volumen-categoria/USD"),
    getMaeOficial(),
  ]);

  const problemas: string[] = [];
  const cats: VolCat[] = [];
  if (r.ok) {
    const arr = asArr(r.data) ?? [];
    for (const it of arr) {
      const o = asObj(it);
      if (!o) continue;
      const nombre = asStr(o.nombre);
      const grupo = asStr(o.grupo);
      const volumen = asNum(o.volumen);
      const share = asNum(o.share);
      if (nombre && grupo && volumen !== null && share !== null) {
        cats.push({ nombre, grupo, volumenUsd: volumen, share });
      }
    }
  }
  if (cats.length === 0) problemas.push("MAE volumen caído");
  if (mae.valor === null) problemas.push("oficial MAE caído");

  return {
    cats,
    oficial: mae.valor,
    oficialVarPct: mae.varPct,
    meta: {
      source: "MAE",
      updatedAt: Date.now(),
      status: cats.length > 0 ? "real" : "parcial",
      problemas,
    },
  };
});

/* ---------------- Módulo 6: LECAPs (data912) — base para sintéticos ---------------- */

export type Lecap = {
  symbol: string;
  px: number;
  varPct: number | null;
  dias: number | null;
  venc: number | null;
};

export type LecapsData = { lecaps: Lecap[]; meta: Meta };

export const getLecaps = cache(async (): Promise<LecapsData> => {
  const notes = await getNotes();
  const now = Date.now();

  const lecaps: Lecap[] = (notes ?? [])
    .filter((n) => /^S\d/.test(n.symbol) && !n.symbol.endsWith("D"))
    .map((n) => {
      const px = n.c ?? (n.px_bid !== null && n.px_ask !== null ? (n.px_bid + n.px_ask) / 2 : null);
      if (px === null || px <= 0) return null;
      const venc = vencFromTicker(n.symbol);
      const dias = venc ? Math.max(0, Math.round((venc - now) / 86400000)) : null;
      return { symbol: n.symbol, px, varPct: n.pct_change, dias, venc };
    })
    .filter((x): x is Lecap => x !== null)
    .sort((a, b) => (a.venc ?? 1e15) - (b.venc ?? 1e15));

  return {
    lecaps,
    meta: {
      source: "data912",
      updatedAt: now,
      status: notes ? "parcial" : "parcial", // parcial: TIR/sintético pendiente de "pago final por letra"
      problemas: notes ? ["TIR y sintético pendientes (falta pago final por letra)"] : ["data912 caído"],
    },
  };
});
