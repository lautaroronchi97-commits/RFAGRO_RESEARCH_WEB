/**
 * Utilidades PURAS de sesión única (Etapa 3 — ver docs/PLAN_LOGIN.md §3.4). Sin
 * `next/headers` ni `server-only`: este módulo lo importa TAMBIÉN el proxy
 * (`src/lib/auth/session.ts`), y `next/headers` está prohibido ahí (es solo para
 * Server Components / route handlers — importarlo en el proxy revienta en runtime
 * con `MIDDLEWARE_INVOCATION_FAILED`). Por eso las funciones con `headers()` viven
 * aparte, en `sesion.ts` (que nunca lo importa el proxy).
 *
 * El decode del JWT usa `atob`/`TextDecoder` (no `Buffer`) para no depender de
 * qué runtime exacto ejecuta el proxy — ambas son globals tanto en Node como Edge.
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
    const b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/"); // parts.length<2 ya salió arriba
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder("utf-8").decode(bytes);
    const sid = (JSON.parse(json) as { session_id?: unknown }).session_id;
    return typeof sid === "string" && sid ? sid : null;
  } catch {
    return null;
  }
}

/**
 * Navegador + SO a partir del user-agent, PURO (sin `next/headers`) — así lo puede
 * reusar tanto el proxy (vía `deviceDeUA`) como el panel admin (`auth/admin.ts`),
 * que antes reimplementaba el mismo regex a mano.
 */
export function navegadorYSO(ua: string | null | undefined): { navegador: string; so: string } {
  if (!ua) return { navegador: "Otro", so: "" };
  const s = ua.toLowerCase();
  let navegador = "Otro";
  if (/edg\//.test(s)) navegador = "Edge";
  else if (/opr\/|opera/.test(s)) navegador = "Opera";
  else if (/chrome\//.test(s)) navegador = "Chrome";
  else if (/firefox\//.test(s)) navegador = "Firefox";
  else if (/safari\//.test(s)) navegador = "Safari";
  let so = "";
  if (/windows/.test(s)) so = "Windows";
  else if (/mac os|macintosh/.test(s)) so = "macOS";
  else if (/android/.test(s)) so = "Android";
  else if (/iphone|ipad|ios/.test(s)) so = "iOS";
  else if (/linux/.test(s)) so = "Linux";
  return { navegador, so };
}

/** Etiqueta corta de dispositivo (navegador · SO) para `sesiones_activas`. */
export function deviceDeUA(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const { navegador, so } = navegadorYSO(ua);
  return so ? `${navegador} · ${so}` : navegador;
}
