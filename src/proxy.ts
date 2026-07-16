import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ENFORCED } from "@/lib/auth/config";
import { updateSession } from "@/lib/auth/session";

/**
 * Proxy (en Next.js 16 el "middleware" se llama `proxy`, runtime Node.js). Gate de
 * autenticación optimista — corre antes del render en cada request. Ver docs/PLAN_LOGIN.md §3.3.
 *
 * Con `AUTH_ENFORCED` APAGADO hace passthrough inmediato: NO llama a Supabase ni
 * toca cookies → la web queda exactamente igual que hoy y las páginas de datos siguen
 * siendo estáticas/ISR. Solo con el flag prendido se activan el refresco de sesión y
 * los redirects.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (!AUTH_ENFORCED) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  // Corre en todo salvo estáticos, imágenes, favicon, robots, sitemap y el icono de marca.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
