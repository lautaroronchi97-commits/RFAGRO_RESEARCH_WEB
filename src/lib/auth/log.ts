import "server-only";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "./server";

/**
 * Registro de actividad en `access_log`. Escribe con el cliente AUTENTICADO del
 * usuario (RLS: `with check (user_id = auth.uid())`), así NO hace falta shippear la
 * service key a la web. Nunca tira: si algo falla, loguea y sigue (el login no debe
 * romperse por el registro de auditoría).
 *
 * Eventos: login | logout | seccion | kickeado (Etapa 1 usa login y logout; el
 * registro por sección visitada es de la Etapa 2).
 */
type Evento = "login" | "logout" | "seccion" | "kickeado";

export async function logAcceso(evento: Evento, seccion?: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const h = await headers();
    // IP aproximada (Vercel manda x-forwarded-for) y user-agent para el panel de actividad.
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null;
    const userAgent = h.get("user-agent") ?? null;

    await supabase.from("access_log").insert({
      user_id: user.id,
      evento,
      seccion: seccion ?? null,
      ip,
      user_agent: userAgent,
    });
  } catch (e) {
    console.error("[access_log] no se pudo registrar", evento, e);
  }
}
