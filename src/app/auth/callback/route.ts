import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { logAcceso } from "@/lib/auth/log";
import { registrarSesion } from "@/lib/auth/sesion";

/**
 * Callback de OAuth (Google) y de confirmación de email: Supabase manda acá con un
 * `code` que se canjea por la sesión. Después decide a dónde mandar al usuario:
 *  - perfil sin completar (OAuth nuevo, sin empresa/teléfono) → /completar
 *  - estado no aprobado → /pendiente
 *  - aprobado → `next` (o la home)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/ingresar?error=oauth`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: canje, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/ingresar?error=oauth`);
  }

  await logAcceso("login");
  // Sesión única: este dispositivo pasa a ser la sesión vigente.
  await registrarSesion(supabase, canje.session?.access_token);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destino = next.startsWith("/") ? next : "/";
  if (user) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("estado,empresa_texto,telefono")
      .eq("id", user.id)
      .maybeSingle();
    if (!perfil || !perfil.empresa_texto || !perfil.telefono) {
      destino = "/completar";
    } else if (perfil.estado !== "aprobado") {
      destino = "/pendiente";
    }
  }

  return NextResponse.redirect(`${origin}${destino}`);
}
