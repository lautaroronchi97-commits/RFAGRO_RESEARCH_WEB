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
  const [ddf, cripto] = await Promise.all([
    safeJson<MaeDDFRow[]>("https://api.marketdata.mae.com.ar/api/mercado/resumen/DDF"),
    safeJson<Criptoya>("https://criptoya.com/api/dolar"),
  ]);

  const spot = cripto?.mayorista?.price ?? null;
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
