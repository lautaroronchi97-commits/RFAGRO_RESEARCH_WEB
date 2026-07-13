import { a3Configured, getA3Token } from "@/lib/a3";
import { getCierresGranos } from "@/lib/futuros";

/**
 * TEMPORAL (diagnóstico) — GET /api/debug/a3?symbol=MAI.ROS/JUL26
 * Consulta A3 en vivo (sin caché) y devuelve el marketData crudo de un símbolo,
 * para ver exactamente qué trae en `LA` (último operado), `BI/OF` (puntas),
 * `CL` (cierre previo), `SE` (ajuste), `TV` (volumen).
 *   ?all=1 → recorre todas las posiciones vivas y reporta cuáles responden,
 *   con timing, para detectar si el fetch del panel dropea símbolos.
 * ⚠️ Borrar antes de mergear a main.
 */

export const dynamic = "force-dynamic";

const BASE = process.env.A3_API_BASE ?? "https://api.cocos.xoms.com.ar";
const ENTRIES = "BI,OF,LA,SE,CL,OP,TV,OI,HI,LO,NV";

async function md(symbol: string, token: string) {
  const t0 = Date.now();
  try {
    const res = await fetch(
      `${BASE}/rest/marketdata/get?marketId=ROFX&symbol=${encodeURIComponent(symbol)}&entries=${ENTRIES}&depth=1`,
      { headers: { "X-Auth-Token": token }, cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    const ms = Date.now() - t0;
    if (!res.ok) return { symbol, ok: false, status: res.status, ms };
    const json = (await res.json()) as { marketData?: unknown };
    return { symbol, ok: true, ms, marketData: json?.marketData ?? null };
  } catch (e) {
    return { symbol, ok: false, error: String(e), ms: Date.now() - t0 };
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!a3Configured()) return Response.json({ configured: false });
  const token = await getA3Token();
  if (!token) return Response.json({ configured: true, hasToken: false });

  const sp = new URL(request.url).searchParams;

  if (sp.get("all")) {
    const { granos } = await getCierresGranos();
    const symbols = granos.flatMap((g) =>
      g.posiciones.filter((p) => p.venc > 0).map((p) => p.symbol),
    );
    const results = [];
    for (const s of symbols) results.push(await md(s, token)); // secuencial: timing limpio por símbolo
    return Response.json({ configured: true, hasToken: true, count: symbols.length, results });
  }

  const symbol = sp.get("symbol") ?? "MAI.ROS/JUL26";
  return Response.json({ configured: true, hasToken: true, ...(await md(symbol, token)) });
}
