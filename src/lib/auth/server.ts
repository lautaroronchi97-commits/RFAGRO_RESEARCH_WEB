import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Cliente Supabase para el SERVIDOR (server components, server actions, route
 * handlers). Lee/escribe la sesión en cookies vía `next/headers` (async en Next 16).
 *
 * Nota: cuando se llama desde un Server Component (render), Next no permite escribir
 * cookies → el `setAll` puede tirar y lo ignoramos (el refresco de tokens lo hace el
 * `proxy.ts`, que sí puede escribir la respuesta). En server actions / route handlers
 * el `setAll` sí persiste. Es el patrón recomendado por @supabase/ssr.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Llamado desde un Server Component: no se pueden setear cookies acá.
          // El proxy.ts refresca la sesión en cada request, así que es seguro ignorar.
        }
      },
    },
  });
}
