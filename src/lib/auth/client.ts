"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Cliente Supabase para el NAVEGADOR (client components). Lo usa el botón
 * "Continuar con Google" (inicia el redirect OAuth con PKCE) y el menú de sesión
 * del header (getUser para mostrar Ingresar/Salir sin romper el ISR del server).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
