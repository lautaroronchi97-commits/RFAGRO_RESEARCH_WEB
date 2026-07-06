import { NextResponse } from "next/server";
import {
  a3Configured,
  getA3Token,
  getA3InstrumentsBySegment,
  getA3MarketData,
} from "@/lib/a3";

// Diagnóstico de la conexión con A3. NO expone token ni credenciales:
// solo booleans, conteos, símbolos de ejemplo y precios (market data pública).
export const dynamic = "force-dynamic";

export async function GET() {
  if (!a3Configured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      msg: "Faltan A3_USERNAME / A3_PASSWORD en las variables de entorno.",
    });
  }

  const token = await getA3Token();
  if (!token) {
    return NextResponse.json({
      ok: false,
      configured: true,
      token: false,
      msg: "No se pudo obtener el token. Revisar credenciales o A3_API_BASE.",
    });
  }

  const [dda, ddf] = await Promise.all([
    getA3InstrumentsBySegment("DDA"),
    getA3InstrumentsBySegment("DDF"),
  ]);

  const sample = dda[0] ?? ddf[0] ?? null;
  let marketDataSample: unknown = null;
  if (sample) {
    const m = await getA3MarketData(sample);
    marketDataSample = m
      ? {
          symbol: sample,
          last: m.LA?.price ?? null,
          bid: m.BI?.[0]?.price ?? null,
          offer: m.OF?.[0]?.price ?? null,
          settle: m.SE?.price ?? null,
        }
      : { symbol: sample, marketData: null };
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    token: true,
    ddaCount: dda.length,
    ddfCount: ddf.length,
    ddaSample: dda.slice(0, 10),
    ddfSample: ddf.slice(0, 10),
    marketDataSample,
  });
}
