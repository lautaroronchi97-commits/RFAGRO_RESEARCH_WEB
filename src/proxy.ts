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
  const path = request.nextUrl.pathname;
  const esAdmin = path === "/admin" || path.startsWith("/admin/");
  // El panel /admin está SIEMPRE protegido (aun con el flag global apagado); por eso
  // se refresca su sesión aunque `AUTH_ENFORCED` esté off. El resto del sitio solo
  // pasa por el gate cuando el flag está prendido → con el flag off queda estático/ISR.
  if (!AUTH_ENFORCED && !esAdmin) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  // Corre en todo salvo estáticos, imágenes, favicon, robots, sitemap y el icono de marca.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
