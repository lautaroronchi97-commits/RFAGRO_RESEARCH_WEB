import WebSocket from "ws";
import { a3Configured, getA3Token } from "@/lib/a3";
import { getCierresGranos } from "@/lib/futuros";

/**
 * TEMPORAL (diagnóstico) — el REST de A3 rate-limitea (429) al pedir muchos
 * símbolos; la doc oficial dice que para tiempo real se usa WebSocket.
 *   ?symbol=MAI.ROS/JUL26   → marketData REST de un símbolo.
 *   ?all=1                  → barrido REST secuencial (muestra el 429).
 *   ?ws=1[&n=N]             → UNA conexión WebSocket, suscribe TODOS los símbolos
 *                             en un `smd` y reporta cuáles llegan y en cuánto (ms).
 *                             Prueba si Primary manda snapshot al suscribir.
 * ⚠️ Borrar antes de mergear a main.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = process.env.A3_API_BASE ?? "https://api.cocos.xoms.com.ar";
const WS_URL = BASE.replace(/^http/, "ws") + "/"; // wss://api.cocos.xoms.com.ar/
const ENTRIES = ["BI", "OF", "LA", "SE", "CL", "TV"];

async function restOne(symbol: string, token: string) {
  const t0 = Date.now();
  try {
    const res = await fetch(
      `${BASE}/rest/marketdata/get?marketId=ROFX&symbol=${encodeURIComponent(symbol)}&entries=${ENTRIES.join(",")}&depth=1`,
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

type WsRow = { symbol: string; ms: number; la: number | null; tv: number | null; bi: number | null; of: number | null };

function num(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (Array.isArray(x)) return num((x as unknown[])[0]);
    return num(o.price);
  }
  return null;
}

async function wsProbe(symbols: string[], token: string) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const got = new Map<string, WsRow>();
    const events: string[] = [];
    let ws: WebSocket;
    const done = (extra: Record<string, unknown> = {}) => {
      try { ws?.close(); } catch { /* noop */ }
      resolve({
        wsUrl: WS_URL,
        pedidos: symbols.length,
        recibidos: got.size,
        totalMs: Date.now() - t0,
        results: [...got.values()],
        faltan: symbols.filter((s) => !got.has(s)),
        events,
        ...extra,
      });
    };
    const timer = setTimeout(() => done({ closedBy: "timeout" }), 7000);
    try {
      ws = new WebSocket(WS_URL, { headers: { "X-Auth-Token": token } });
    } catch (e) {
      clearTimeout(timer);
      return resolve({ wsUrl: WS_URL, error: `construct: ${String(e)}` });
    }
    ws.on("open", () => {
      events.push(`open@${Date.now() - t0}ms`);
      ws.send(JSON.stringify({
        type: "smd",
        level: 1,
        entries: ENTRIES,
        products: symbols.map((s) => ({ symbol: s, marketId: "ROFX" })),
        depth: 1,
      }));
    });
    ws.on("message", (data: WebSocket.RawData) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg.type !== "Md") { events.push(`msg:${String(msg.type)}`); return; }
      const inst = msg.instrumentId as { symbol?: string } | undefined;
      const md = (msg.marketData ?? {}) as Record<string, unknown>;
      const sym = inst?.symbol ?? "";
      if (!got.has(sym)) {
        got.set(sym, {
          symbol: sym, ms: Date.now() - t0,
          la: num(md.LA), tv: num(md.TV), bi: num(md.BI), of: num(md.OF),
        });
      }
      if (got.size >= symbols.length) { clearTimeout(timer); done({ closedBy: "complete" }); }
    });
    ws.on("error", (e: Error) => { clearTimeout(timer); done({ error: `ws: ${String(e)}` }); });
    ws.on("close", (code: number) => { events.push(`close:${code}`); });
  });
}

export async function GET(request: Request): Promise<Response> {
  if (!a3Configured()) return Response.json({ configured: false });
  const token = await getA3Token();
  if (!token) return Response.json({ configured: true, hasToken: false });
  const sp = new URL(request.url).searchParams;

  const { granos } = await getCierresGranos();
  const allSymbols = granos.flatMap((g) => g.posiciones.filter((p) => p.venc > 0).map((p) => p.symbol));

  if (sp.get("ws")) {
    const n = Number(sp.get("n") ?? "0");
    const symbols = n > 0 ? allSymbols.slice(0, n) : allSymbols;
    return Response.json(await wsProbe(symbols, token));
  }

  if (sp.get("all")) {
    const results = [];
    for (const s of allSymbols) results.push(await restOne(s, token));
    return Response.json({ count: allSymbols.length, results });
  }

  const symbol = sp.get("symbol") ?? "MAI.ROS/JUL26";
  return Response.json(await restOne(symbol, token));
}
