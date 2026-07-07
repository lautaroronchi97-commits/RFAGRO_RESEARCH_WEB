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
  | { ok: false; reason: "unconfigured" | "http" | "network" | "parse"; status?: number };

/**
 * Ejecuta un SELECT de PostgREST. `path` es lo que va después de `/rest/v1/`,
 * ej.: `djve_resumen?select=*&order=ton_anio.desc.nullslast`.
 */
export const sbSelect = cache(async (path: string, revalidate: number): Promise<SbResult> => {
  if (!supabaseConfigured()) return { ok: false, reason: "unconfigured" };
  try {
    const res = await fetch(`${URL}/rest/v1/${path}`, {
      headers: { apikey: KEY, accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(8000),
    });
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
