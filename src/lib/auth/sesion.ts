import "server-only";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sessionIdDeToken, deviceDeUA } from "./session-id";

/**
 * Sesión única por usuario (Etapa 3 del login — ver docs/PLAN_LOGIN.md §3.4).
 *
 * Cada login registra el `session_id` del JWT de Supabase como la sesión vigente
 * (RPC `registrar_sesion`, la última pisa a la anterior). En cada request el proxy
 * llama `tocar_sesion`: si el `session_id` del cookie ≠ el vigente → 'kicked'
 * (otro dispositivo tomó la cuenta). El JWT se decodifica LOCALMENTE (sin round-trip
 * extra): la autenticidad ya la garantizó `getUser()` del proxy sobre las mismas cookies.
 *
 * Las funciones puras (`sessionIdDeToken`/`deviceDeUA`) viven en `./session-id`
 * (sin `next/headers`, que el proxy no puede importar); acá solo lo que necesita
 * `headers()` — código que corre en server actions/route handlers, nunca en el proxy.
 */
export { sessionIdDeToken, deviceDeUA };

/**
 * Registra la sesión de este dispositivo como la vigente (se llama tras un login
 * exitoso: email+contraseña y OAuth). `token` es el access_token que devolvió el
 * sign-in. Degrada sin romper: si algo falla, el login sigue igual.
 */
export async function registrarSesion(
  supabase: SupabaseClient,
  token: string | null | undefined,
): Promise<void> {
  try {
    const sid = sessionIdDeToken(token);
    if (!sid) return;
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null;
    const ua = h.get("user-agent");
    await supabase.rpc("registrar_sesion", {
      p_session_id: sid,
      p_device: deviceDeUA(ua),
      p_ip: ip,
    });
  } catch (e) {
    console.error("[sesion] no se pudo registrar la sesión", e);
  }
}

/** Libera la fila de sesión del usuario (se llama en el logout). Nunca tira. */
export async function cerrarMiSesion(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.rpc("cerrar_mi_sesion");
  } catch (e) {
    console.error("[sesion] no se pudo cerrar la sesión", e);
  }
}
