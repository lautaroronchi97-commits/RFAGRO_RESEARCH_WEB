import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, authConfigured } from "./env";
import { AUTH_ENFORCED, esRutaPublica } from "./config";

/**
 * Refresco de sesión + gate optimista para `proxy.ts` (corre antes del render en
 * cada request, incluso en las RSC de navegación cliente). Ver docs/PLAN_LOGIN.md §3.3.
 *
 * - Refresca los tokens de Supabase y los reescribe en la respuesta (imprescindible
 *   para que la sesión SSR no se caiga sola).
 * - Chequeo OPTIMISTA (solo presencia de sesión, sin tocar nuestra base): si el flag
 *   está prendido y un usuario sin sesión pide una ruta protegida → redirect a /ingresar.
 *   La verificación autoritativa (estado aprobado + permisos por sección) vive en el
 *   layout/DAL (chequeo seguro contra la base), no acá.
 *
 * Con `AUTH_ENFORCED` apagado esta función NO se ejecuta (el proxy hace passthrough),
 * así la web queda igual que hoy.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (!authConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANTE: no meter lógica entre createServerClient y getUser (recomendación de
  // @supabase/ssr para no desincronizar el refresco de tokens).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const esAdmin = path === "/admin" || path.startsWith("/admin/");

  // /admin: exige sesión SIEMPRE (aun con el flag global apagado). El chequeo
  // autoritativo de rol admin vive en el layout de /admin (requireAdmin); acá solo
  // el gate optimista de "sin sesión → a ingresar".
  if (esAdmin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  if (!AUTH_ENFORCED) return response;

  // Usuario sin sesión pidiendo una ruta protegida → a la pantalla de ingreso.
  if (!user && !esRutaPublica(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = path && path !== "/" ? `?next=${encodeURIComponent(path)}` : "";
    return NextResponse.redirect(url);
  }

  // Usuario con sesión que cae en las pantallas de ingreso/registro → a la home.
  if (user && (path === "/ingresar" || path === "/registro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
