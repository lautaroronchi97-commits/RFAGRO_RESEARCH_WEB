import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { authConfigured } from "@/lib/auth/env";
import { SECCIONES } from "@/lib/auth/config";

/**
 * Registro de visita por sección (Etapa 2). Recibe el beacon del cliente
 * (`SeccionBeacon`) y llama a la RPC `registrar_visita_seccion`, que inserta el
 * evento en `access_log` con la sesión del usuario (RLS) y throttle server-side de
 * 10 min. La IP y el user-agent se toman acá (server), no del cliente. Nunca tira:
 * es auditoría, no debe romper nada. No cachea (route handler POST).
 */
export async function POST(request: NextRequest) {
  if (!authConfigured()) return new NextResponse(null, { status: 204 });

  let seccion = "";
  try {
    const body = (await request.json()) as { seccion?: unknown };
    seccion = typeof body?.seccion === "string" ? body.seccion : "";
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  // Solo aceptamos las 7 claves canónicas (evita inflar el log con basura).
  if (!(SECCIONES as readonly string[]).includes(seccion)) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new NextResponse(null, { status: 204 });

    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null;
    const userAgent = request.headers.get("user-agent") ?? null;

    await supabase.rpc("registrar_visita_seccion", {
      p_seccion: seccion,
      p_ip: ip,
      p_user_agent: userAgent,
    });
  } catch {
    // Silencioso: la auditoría no debe romper la navegación del usuario.
  }

  return new NextResponse(null, { status: 204 });
}
