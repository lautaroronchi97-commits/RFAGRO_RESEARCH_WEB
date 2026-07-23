import "server-only";
import { cache } from "react";

/**
 * HTTP genérico para fuentes externas (todo REST server-side).
 *
 * - `fetchJson` está envuelto en React.cache() → una sola llamada por URL por
 *   render (dedup entre paneles) + `revalidate` 60s entre requests (ISR).
 * - Los fetch nunca tiran: devuelven Result; una fuente caída degrada su panel,
 *   no la página. (Los logs de error se ven en Vercel → Logs, retención corta;
 *   la observabilidad durable llega con snapshots.ok en la fase Supabase.)
 */

export const REVALIDATE = 60;

export type FetchResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: "timeout" | "http" | "parse" | "network"; status?: number };

export const fetchJson = cache(async (url: string): Promise<FetchResult> => {
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

export const asNum = (x: unknown): number | null =>
  typeof x === "number" && Number.isFinite(x) ? x : null;
export const asStr = (x: unknown): string | null =>
  typeof x === "string" && x.length > 0 ? x : null;
export const asObj = (x: unknown): Record<string, unknown> | null =>
  x !== null && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : null;
export const asArr = (x: unknown): unknown[] | null => (Array.isArray(x) ? x : null);
