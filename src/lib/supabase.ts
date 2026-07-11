import "server-only";
import { cache } from "react";

/**
 * Lectura de datos históricos desde Supabase (Postgres) vía PostgREST.
 *
 * - Solo LECTURA, con la clave pública (publishable/anon): las tablas tienen RLS
 *   con policy de SELECT para el rol anónimo, así que la clave no da acceso de
 *   escritura ni a filas fuera de la policy. Por eso puede ir en env sin drama.
 * - Mismo patrón que `market.ts`: React.cache() dedup por render + `revalidate`
 *   (ISR) entre requests. Nunca tira: devuelve un Result y el panel degrada solo.
 *
 * Config: SUPABASE_URL + SUPABASE_ANON_KEY (en .env.local local y en Vercel).
 */

const URL = process.env.SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_ANON_KEY ?? "";

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
      headers: { apikey: KEY, accept: "application/json" },
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
        headers: { apikey: KEY, accept: "application/json" },
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
