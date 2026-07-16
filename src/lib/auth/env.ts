/**
 * Credenciales públicas de Supabase para el cliente de Auth.
 *
 * OJO: la capa de datos histórica (`src/lib/supabase.ts`) usa `SUPABASE_URL` /
 * `SUPABASE_ANON_KEY` server-only. El SDK de Auth (@supabase/ssr) corre también en
 * el navegador, así que necesita las variables con prefijo `NEXT_PUBLIC_` para que
 * Next las inyecte en el bundle del cliente. Son las MISMAS credenciales (la URL y
 * la clave publishable/anon son públicas por diseño; RLS protege las filas), solo
 * cambia el nombre. Se cargan en Vercel y en `.env.local` (ver .env.local.example).
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** ¿Están las credenciales de Auth configuradas? Si no, el login degrada solo. */
export function authConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
