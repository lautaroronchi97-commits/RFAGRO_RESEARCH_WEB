import "server-only";
import { cache } from "react";

/**
 * Lectura de datos históricos desde Supabase (Postgres) vía PostgREST.
 *
 * - Solo LECTURA. Este módulo es `server-only` (la clave jamás llega al cliente).
 * - E5 Duda #5(a), 22/07/2026: si `SUPABASE_SERVICE_KEY` está en el entorno (Vercel,
 *   scope Production) se lee con ELLA — es lo que permite revocar el SELECT de anon en
 *   las 7 matviews de mesa (migración 20260722013200, se aplica en el encendido del
 *   login) sin romper las páginas /comercio/*. Bonus: la service key no tiene
 *   statement_timeout de rol (los 3s de anon mataban matviews bajo concurrencia, E3 H1/H6).
 * - Sin service key (local, previews) cae a la anon key: lo público anda igual; lo de
 *   mesa queda vacío recién cuando el revoke esté aplicado.
 * - Mismo patrón que `market.ts`: React.cache() dedup por render + `revalidate`
 *   (ISR) entre requests. Nunca tira: devuelve un Result y el panel degrada solo.
 *
 * Config: SUPABASE_URL + SUPABASE_ANON_KEY (+ SUPABASE_SERVICE_KEY en producción).
 */

const URL = process.env.SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "";

export function supabaseConfigured(): boolean {
  return Boolean(URL && KEY);
}

export type SbResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: "unconfigured" | "http" | "network" | "parse" | "truncated"; status?: number };

/** Máximo de filas que PostgREST devuelve por request antes de truncar (db-max-rows). */
const PAGE = 1000;

/**
 * Ejecuta un SELECT de PostgREST. `path` es lo que va después de `/rest/v1/`,
 * ej.: `djve_resumen?select=*&order=ton_anio.desc.nullslast`.
 *
 * ⚠️ PostgREST corta el resultado a 1.000 filas y responde **HTTP 206** (Partial
 * Content) con `Content-Range: 0-999/N`. `res.ok` es `true` para 206 → antes esto
 * truncaba en silencio. Ahora el 206 se trata como error explícito (`truncated`);
 * si una consulta puede superar 1.000 filas hay que usar `sbSelectAll` (pagina).
 */
export const sbSelect = cache(async (path: string, revalidate: number): Promise<SbResult> => {
  if (!supabaseConfigured()) return { ok: false, reason: "unconfigured" };
  try {
    const res = await fetch(`${URL}/rest/v1/${path}`, {
      headers: { apikey: KEY, authorization: `Bearer ${KEY}`, accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 206) return { ok: false, reason: "truncated", status: 206 };
    if (!res.ok) return { ok: false, reason: "http", status: res.status };
    try {
      return { ok: true, data: await res.json() };
    } catch {
      return { ok: false, reason: "parse" };
    }
  } catch {
    return { ok: false, reason: "network" };
  }
});

/**
 * Como `sbSelect` pero pagina con `limit`/`offset` hasta traer TODAS las filas
 * (para series continuas que superan las 1.000 filas, ej. pizarra 2020→hoy ≈1.580
 * por grano). Usa la URL con `limit`/`offset` (no el header `Range`) para que cada
 * página sea una key distinta en la data cache de Next. Devuelve el array completo.
 */
export const sbSelectAll = cache(async (path: string, revalidate: number): Promise<SbResult> => {
  if (!supabaseConfigured()) return { ok: false, reason: "unconfigured" };
  const sep = path.includes("?") ? "&" : "?";
  const rows: unknown[] = [];
  let offset = 0;
  try {
    for (;;) {
      const res = await fetch(`${URL}/rest/v1/${path}${sep}limit=${PAGE}&offset=${offset}`, {
        headers: { apikey: KEY, authorization: `Bearer ${KEY}`, accept: "application/json" },
        next: { revalidate },
        signal: AbortSignal.timeout(8000),
      });
      // Con `limit` explícito PostgREST responde 200 (no 206) aun habiendo truncado.
      if (!res.ok) return { ok: false, reason: "http", status: res.status };
      let page: unknown;
      try {
        page = await res.json();
      } catch {
        return { ok: false, reason: "parse" };
      }
      if (!Array.isArray(page)) return { ok: false, reason: "parse" };
      rows.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
      if (offset > 200_000) break; // backstop anti-loop
    }
    return { ok: true, data: rows };
  } catch {
    return { ok: false, reason: "network" };
  }
});
