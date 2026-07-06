import "server-only";

/**
 * Datos de mercado para la CINTA (módulo 0).
 * Fuentes públicas validadas en Fase 0 (no requieren credenciales):
 *  - dolarapi.com  → oficial, MEP (bolsa), CCL (contadoconliqui)
 *  - criptoya.com  → mayorista (+ variación)
 *  - MAE (api.marketdata.mae.com.ar) → dólar futuro DDF próximo
 * Caché corto (revalidate 60s) para no saturar las fuentes.
 */

export type CintaItem = {
  label: string;
  value: number | null;
  decimals: number;
  change: number | null; // variación diaria en %
  source: string;
  sample?: boolean; // true = dato de ejemplo (aún sin fuente automatizada)
};

export type CintaData = {
  items: CintaItem[];
  updatedAt: number; // epoch ms
};

const REVALIDATE = 60;

async function safeJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type DolarApi = { casa: string; compra: number; venta: number }[];
type Criptoya = Record<string, { price?: number; variation?: number }>;
type MaeDDF = { ticker: string; ultimo: number; variacion: number }[];

function nearestDDF(rows: MaeDDF | null): MaeDDF[number] | null {
  if (!rows || rows.length === 0) return null;
  const now = new Date();
  const parsed = rows
    .map((r) => {
      const m = /(\d{2})(\d{4})$/.exec(r.ticker); // ...MMYYYY
      if (!m) return null;
      const d = new Date(Number(m[2]), Number(m[1]) - 1, 1);
      return { row: r, d };
    })
    .filter((x): x is { row: MaeDDF[number]; d: Date } => x !== null)
    .filter((x) => x.d.getFullYear() > 1970);
  if (parsed.length === 0) return rows[0];
  const future = parsed
    .filter((x) => x.d.getTime() >= new Date(now.getFullYear(), now.getMonth(), 1).getTime())
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  return (future[0] ?? parsed.sort((a, b) => a.d.getTime() - b.d.getTime())[0]).row;
}

export async function getCintaData(): Promise<CintaData> {
  const [dolar, cripto, ddf] = await Promise.all([
    safeJson<DolarApi>("https://dolarapi.com/v1/dolares"),
    safeJson<Criptoya>("https://criptoya.com/api/dolar"),
    safeJson<MaeDDF>("https://api.marketdata.mae.com.ar/api/mercado/resumen/DDF"),
  ]);

  const byCasa = (casa: string) => dolar?.find((d) => d.casa === casa) ?? null;
  const oficial = byCasa("oficial");
  const bolsa = byCasa("bolsa"); // MEP
  const ccl = byCasa("contadoconliqui");
  const fut = nearestDDF(ddf);

  const items: CintaItem[] = [
    {
      label: "Oficial",
      value: oficial?.venta ?? null,
      decimals: 2,
      change: cripto?.oficial?.variation ?? null,
      source: "dolarapi",
    },
    {
      label: "Mayorista",
      value: cripto?.mayorista?.price ?? null,
      decimals: 2,
      change: cripto?.mayorista?.variation ?? null,
      source: "criptoya",
    },
    { label: "MEP", value: bolsa?.venta ?? null, decimals: 2, change: null, source: "dolarapi" },
    { label: "CCL", value: ccl?.venta ?? null, decimals: 2, change: null, source: "dolarapi" },
    {
      label: fut ? `Fut ${fut.ticker.replace(/^DLR/, "")}` : "Dólar futuro",
      value: fut?.ultimo ?? null,
      decimals: 2,
      change: null, // la variación de MAE viene en unidades a confirmar; no la mostramos aún
      source: "MAE",
    },
    // Pizarra: dato de ejemplo hasta enganchar el scraping de CAC-BCR.
    { label: "Soja pizarra USD", value: 312.9, decimals: 1, change: 1.2, source: "CAC-BCR", sample: true },
    { label: "Maíz pizarra USD", value: 182.0, decimals: 1, change: 0.0, source: "CAC-BCR", sample: true },
    { label: "Trigo pizarra USD", value: 207.0, decimals: 1, change: -0.5, source: "CAC-BCR", sample: true },
  ];

  return { items, updatedAt: Date.now() };
}

/* ---------- Módulo 3: Curva de dólar futuro (MAE DDF) ---------- */

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

type MaeDDFRow = { ticker: string; ultimo: number; variacion: number; cantidad: number };
type MaeForRow = { ticker: string; ultimo: number; variacion: number };

/**
 * Dólar oficial mayorista MAE (A3500 del día) = ticker "UST$T" en resumen/FOR.
 * Es la referencia para dólar futuro (spot) y dólar linked (ajuste).
 */
export async function getMaeOficial(): Promise<number | null> {
  const rows = await safeJson<MaeForRow[]>("https://api.marketdata.mae.com.ar/api/mercado/resumen/FOR");
  const ust = rows?.find((r) => r.ticker === "UST$T") ?? rows?.find((r) => r.ticker?.startsWith("UST$"));
  return ust?.ultimo ?? null;
}

export type DFPosicion = {
  ticker: string;
  label: string; // p.ej. JUL26
  ultimo: number;
  varPct: number; // variación diaria en %
  volumen: number; // contratos / nominales
  fecha: number; // epoch (para ordenar la curva)
  dias: number | null; // días al vencimiento
  directaPct: number | null; // tasa directa del período
  tnaPct: number | null; // TNA implícita
  temPct: number | null; // TEM implícita
  teaPct: number | null; // TEA implícita
};

export type DolarFuturoData = {
  spot: number | null; // dólar mayorista
  posiciones: DFPosicion[];
  updatedAt: number;
};

/**
 * Tasas implícitas — metodología A3 (spot mayorista, base 365):
 *   directa = Futuro/Spot − 1
 *   TNA     = (Futuro/Spot − 1) × 365/días
 *   TEA     = (Futuro/Spot)^(365/días) − 1
 *   TEM     = (1 + TEA)^(1/12) − 1
 */
export async function getDolarFuturo(): Promise<DolarFuturoData> {
  const [ddf, spot] = await Promise.all([
    safeJson<MaeDDFRow[]>("https://api.marketdata.mae.com.ar/api/mercado/resumen/DDF"),
    getMaeOficial(),
  ]);

  const now = Date.now();

  const posiciones: DFPosicion[] = (ddf ?? [])
    .map((r) => {
      const m = /(\d{2})(\d{4})$/.exec(r.ticker);
      const mm = m ? Number(m[1]) : 0;
      const yy = m ? Number(m[2]) : 0;
      const label = m ? `${MESES[mm - 1]}${String(yy).slice(2)}` : r.ticker;
      const fecha = m ? new Date(yy, mm - 1, 1).getTime() : 0;
      // vencimiento ≈ último día del mes del contrato (A3 vence el último día hábil)
      const venc = m ? new Date(yy, mm, 0).getTime() : 0;
      const dias = venc ? Math.max(1, Math.round((venc - now) / 86400000)) : null;

      let directaPct: number | null = null;
      let tnaPct: number | null = null;
      let temPct: number | null = null;
      let teaPct: number | null = null;
      if (spot && spot > 0 && dias && r.ultimo > 0) {
        const ratio = r.ultimo / spot;
        directaPct = (ratio - 1) * 100;
        tnaPct = (ratio - 1) * (365 / dias) * 100;
        const tea = Math.pow(ratio, 365 / dias) - 1;
        teaPct = tea * 100;
        temPct = (Math.pow(1 + tea, 1 / 12) - 1) * 100;
      }

      return {
        ticker: r.ticker,
        label,
        ultimo: r.ultimo,
        varPct: r.variacion,
        volumen: r.cantidad ?? 0,
        fecha,
        dias,
        directaPct,
        tnaPct,
        temPct,
        teaPct,
      };
    })
    .sort((a, b) => a.fecha - b.fecha);

  return { spot, posiciones, updatedAt: now };
}

/* ---------- Módulo 4: Dólar linked (data912) ---------- */

type NoteRow = { symbol: string; c: number; px_bid: number; px_ask: number; pct_change: number };

export type DLBono = {
  symbol: string;
  px: number; // ARS por 100 nominal
  tcImpl: number; // TC implícito = Px/100
  difMep: number | null; // MEP − TC implícito
  spreadOficial: number | null; // Oficial − TC implícito (spread vs oficial)
  varPct: number;
  dias: number | null;
  tnaPct: number | null; // TNA USD implícita (vs oficial, base 365)
  temPct: number | null;
  teaPct: number | null;
};

export type DolarLinkedData = {
  mep: number | null;
  oficial: number | null;
  bonos: DLBono[];
  updatedAt: number;
};

// Código de mes en tickers argentinos (LECAP/bonos): E F M A Y J L G S O N D
const MONTH_LETTER: Record<string, number> = {
  E: 0, F: 1, M: 2, A: 3, Y: 4, J: 5, L: 6, G: 7, S: 8, O: 9, N: 10, D: 11,
};

// Vencimiento inferido del ticker, p.ej. D30S6 → 30/sep/2026, D31L6 → 31/jul/2026
function vencFromTicker(sym: string): number | null {
  const m = /^D(\d{2})([EFMAYJLGSOND])(\d)$/.exec(sym);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTH_LETTER[m[2]];
  const year = 2020 + Number(m[3]);
  return new Date(year, month, day).getTime();
}

export async function getDolarLinked(): Promise<DolarLinkedData> {
  const [notes, dolar, oficial] = await Promise.all([
    safeJson<NoteRow[]>("https://data912.com/live/arg_notes"),
    safeJson<DolarApi>("https://dolarapi.com/v1/dolares"),
    getMaeOficial(), // dólar oficial mayorista MAE (A3500)
  ]);

  const mep = dolar?.find((d) => d.casa === "bolsa")?.venta ?? null;
  const now = Date.now();

  const bonos: DLBono[] = (notes ?? [])
    .filter((n) => /^D\d/.test(n.symbol)) // serie "D" = dólar-linked del Tesoro
    .map((n) => {
      const px = n.c || (n.px_bid + n.px_ask) / 2;
      const tcImpl = px / 100;
      const venc = vencFromTicker(n.symbol);
      const dias = venc ? Math.max(1, Math.round((venc - now) / 86400000)) : null;

      // TNA/TEM/TEA implícitas — vs oficial, base 365 (misma lógica que futuros)
      let tnaPct: number | null = null;
      let temPct: number | null = null;
      let teaPct: number | null = null;
      if (oficial && oficial > 0 && tcImpl > 0 && dias) {
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
        difMep: mep != null ? mep - tcImpl : null,
        spreadOficial: oficial != null ? oficial - tcImpl : null,
        varPct: n.pct_change,
        dias,
        tnaPct,
        temPct,
        teaPct,
      };
    })
    .sort((a, b) => (a.dias ?? 1e12) - (b.dias ?? 1e12));

  return { mep, oficial, bonos, updatedAt: now };
}

/* ---------- Módulo 7: Panel cambiario / volumen de rueda (MAE) ---------- */

export type VolCat = { nombre: string; grupo: string; volumenUsd: number; share: number };

export type VolumenData = {
  cats: VolCat[];
  oficial: number | null; // oficial mayorista MAE
  oficialVarPct: number | null;
  updatedAt: number;
};

type VolRow = { nombre: string; grupo: string; volumen: number; share: number; moneda: string };

export async function getVolumenCambiario(): Promise<VolumenData> {
  const [vol, forr] = await Promise.all([
    safeJson<VolRow[]>("https://api.marketdata.mae.com.ar/api/mercado/volumen-categoria/USD"),
    safeJson<MaeForRow[]>("https://api.marketdata.mae.com.ar/api/mercado/resumen/FOR"),
  ]);

  const cats: VolCat[] = (vol ?? []).map((v) => ({
    nombre: v.nombre,
    grupo: v.grupo,
    volumenUsd: v.volumen,
    share: v.share,
  }));

  const ust = forr?.find((r) => r.ticker === "UST$T");

  return {
    cats,
    oficial: ust?.ultimo ?? null,
    oficialVarPct: ust?.variacion ?? null,
    updatedAt: Date.now(),
  };
}
