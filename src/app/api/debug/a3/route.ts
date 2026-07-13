import { a3Configured, getA3Token } from "@/lib/a3";
import { getCierresGranos } from "@/lib/futuros";

/**
 * TEMPORAL (diagnóstico) — inspección del rate-limit de A3 (429) y de si el
 * marketData admite varios símbolos por request.
 *   ?symbol=MAI.ROS/JUL26            → marketData crudo de un símbolo.
 *   ?multi=A,B,C                     → un solo request con varios símbolos (coma
 *                                      y repetido) para ver si A3 los acepta.
 *   ?all=1&gap=<ms>&retries=<n>      → todas las posiciones, secuencial, con
 *                                      pausa `gap` entre pedidos y reintento con
 *                                      backoff ante 429. Reporta cuántas entran.
 * ⚠️ Borrar antes de mergear a main.
 */

export const dynamic = "force-dynamic";

const BASE = process.env.A3_API_BASE ?? "https://api.cocos.xoms.com.ar";
const ENTRIES = "BI,OF,LA,SE,CL,TV";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function once(url: string, token: string) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": token },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const ms = Date.now() - t0;
    const body = res.ok ? await res.json() : null;
    return { ok: res.ok, status: res.status, ms, body };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - t0, error: String(e) };
  }
}

const mdUrl = (sym: string) =>
  `${BASE}/rest/marketdata/get?marketId=ROFX&symbol=${encodeURIComponent(sym)}&entries=${ENTRIES}&depth=1`;

async function paced(sym: string, token: string, retries: number, backoff: number) {
  let attempt = 0;
  for (;;) {
    const r = await once(mdUrl(sym), token);
    attempt++;
    if (r.ok || r.status !== 429 || attempt > retries) {
      const md = (r.body as { marketData?: Record<string, unknown> } | null)?.marketData ?? null;
      const la = md?.LA as { price?: number } | undefined;
      return { symbol: sym, ok: r.ok, status: r.status, attempts: attempt, ms: r.ms, la: la?.price ?? null, tv: md?.TV ?? null };
    }
    await sleep(backoff * attempt); // backoff lineal
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!a3Configured()) return Response.json({ configured: false });
  const token = await getA3Token();
  if (!token) return Response.json({ configured: true, hasToken: false });
  const sp = new URL(request.url).searchParams;

  // --- multi-símbolo en un request ---
  const multi = sp.get("multi");
  if (multi) {
    const syms = multi.split(",").map((s) => s.trim()).filter(Boolean);
    const comma = await once(
      `${BASE}/rest/marketdata/get?marketId=ROFX&symbol=${encodeURIComponent(syms.join(","))}&entries=${ENTRIES}&depth=1`,
      token,
    );
    const repeated = await once(
      `${BASE}/rest/marketdata/get?marketId=ROFX&${syms.map((s) => `symbol=${encodeURIComponent(s)}`).join("&")}&entries=${ENTRIES}&depth=1`,
      token,
    );
    return Response.json({ syms, comma, repeated });
  }

  // --- barrido pautado con reintentos ---
  if (sp.get("all")) {
    const gap = Number(sp.get("gap") ?? "0");
    const retries = Number(sp.get("retries") ?? "0");
    const backoff = Number(sp.get("backoff") ?? "700");
    const { granos } = await getCierresGranos();
    const symbols = granos.flatMap((g) => g.posiciones.filter((p) => p.venc > 0).map((p) => p.symbol));
    const t0 = Date.now();
    const results = [];
    for (const s of symbols) {
      results.push(await paced(s, token, retries, backoff));
      if (gap > 0) await sleep(gap);
    }
    const okN = results.filter((r) => r.ok).length;
    return Response.json({ count: symbols.length, ok: okN, totalMs: Date.now() - t0, gap, retries, backoff, results });
  }

  const symbol = sp.get("symbol") ?? "MAI.ROS/JUL26";
  const r = await once(mdUrl(symbol), token);
  return Response.json({ symbol, ...r });
}
