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
