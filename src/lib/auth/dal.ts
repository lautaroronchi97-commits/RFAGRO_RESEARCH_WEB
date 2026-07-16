import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";
import { authConfigured } from "./env";
import type { SeccionKey } from "./config";

/**
 * Data Access Layer de auth (chequeos SEGUROS contra la base — ver guía de
 * autenticación de Next 16 y docs/PLAN_LOGIN.md §3.3). Todo va envuelto en
 * React.cache() para deduplicar por render (una sola lectura de `profiles` por request).
 */

export type Perfil = {
  id: string;
  email: string;
  nombre: string;
  empresa_texto: string;
  telefono: string;
  estado: "pendiente" | "aprobado" | "rechazado" | "bloqueado";
  rol: "cliente" | "admin";
  empresa_id: string | null;
  secciones_override: string[] | null;
};

/** Usuario autenticado (o null). Valida el JWT contra Supabase Auth. */
export const getAuthUser = cache(async () => {
  if (!authConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Perfil del usuario logueado desde `profiles` (o null si no hay sesión / no existe). */
export const getPerfil = cache(async (): Promise<Perfil | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,nombre,empresa_texto,telefono,estado,rol,empresa_id,secciones_override")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Perfil;
});

/**
 * Exige un usuario aprobado. Redirige según el caso:
 *  - sin sesión → /ingresar
 *  - perfil sin cargar todavía (OAuth recién logueado, falta completar) → /completar
 *  - estado pendiente → /pendiente · rechazado/bloqueado → /pendiente (con motivo)
 * Devuelve el perfil aprobado para que el layout lo use (marca de agua en Etapa 3).
 */
export async function requireAprobado(): Promise<Perfil> {
  const user = await getAuthUser();
  if (!user) redirect("/ingresar");
  const perfil = await getPerfil();
  if (!perfil) redirect("/completar");
  if (perfil.estado !== "aprobado") redirect("/pendiente");
  return perfil;
}

/**
 * ¿El perfil puede ver esta sección? El enforcement real por sección es de la
 * Etapa 2; acá queda la función lista (los admins ven todo; sin permisos cargados
 * todavía = ve todo, para no romper nada en la Etapa 1).
 */
export function puedeVerSeccion(perfil: Perfil, seccion: SeccionKey): boolean {
  if (perfil.rol === "admin") return true;
  const permitidas = perfil.secciones_override; // Etapa 2 sumará el fallback a empresa.secciones
  if (!permitidas || permitidas.length === 0) return true;
  return permitidas.includes(seccion);
}
