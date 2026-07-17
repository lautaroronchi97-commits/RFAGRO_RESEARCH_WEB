import "server-only";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sesión única por usuario (Etapa 3 del login — ver docs/PLAN_LOGIN.md §3.4).
 *
 * Cada login registra el `session_id` del JWT de Supabase como la sesión vigente
 * (RPC `registrar_sesion`, la última pisa a la anterior). En cada request el proxy
 * llama `tocar_sesion`: si el `session_id` del cookie ≠ el vigente → 'kicked'
 * (otro dispositivo tomó la cuenta). El JWT se decodifica LOCALMENTE (sin round-trip
 * extra): la autenticidad ya la garantizó `getUser()` del proxy sobre las mismas cookies.
 */

/**
 * Extrae el claim `session_id` de un access_token JWT (decode local del payload).
 * No verifica la firma a propósito: solo se usa para comparar contra la fila propia
 * en `sesiones_activas`, y el token ya viene validado por quien nos lo pasa.
 */
export function sessionIdDeToken(accessToken: string | null | undefined): string | null {
  if (!accessToken) return null;
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    const sid = (JSON.parse(json) as { session_id?: unknown }).session_id;
    return typeof sid === "string" && sid ? sid : null;
  } catch {
    return null;
  }
}

/** Etiqueta corta de dispositivo (navegador · SO) para `sesiones_activas`. */
export function deviceDeUA(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const s = ua.toLowerCase();
  let nav = "Navegador";
  if (/edg\//.test(s)) nav = "Edge";
  else if (/opr\/|opera/.test(s)) nav = "Opera";
  else if (/chrome\//.test(s)) nav = "Chrome";
  else if (/firefox\//.test(s)) nav = "Firefox";
  else if (/safari\//.test(s)) nav = "Safari";
  let so = "";
  if (/windows/.test(s)) so = "Windows";
  else if (/mac os|macintosh/.test(s)) so = "macOS";
  else if (/android/.test(s)) so = "Android";
  else if (/iphone|ipad|ios/.test(s)) so = "iOS";
  else if (/linux/.test(s)) so = "Linux";
  return so ? `${nav} · ${so}` : nav;
}

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
