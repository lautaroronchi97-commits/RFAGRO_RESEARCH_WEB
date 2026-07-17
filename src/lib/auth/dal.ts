import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./server";
import { authConfigured } from "./env";
import { AUTH_ENFORCED, SECCIONES, type SeccionKey } from "./config";

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
 * "Pase" del usuario: perfil + secciones visibles ya resueltas.
 *  - `visibles` = override individual si está seteado (aunque sea vacío = sin acceso),
 *    si no las de la empresa; los admin ven las 7.
 * Se lee fresco por request (no hay cookie-cache), así los cambios que hace un admin
 * en permisos/estado impactan de inmediato — no hay caché que invalidar (§3.3 del plan).
 */
export type Acceso = {
  perfil: Perfil;
  esAdmin: boolean;
  empresaSecciones: string[];
  visibles: string[];
};

export const getAcceso = cache(async (): Promise<Acceso | null> => {
  const perfil = await getPerfil();
  if (!perfil) return null;
  const esAdmin = perfil.rol === "admin";

  let empresaSecciones: string[] = [];
  if (perfil.empresa_id) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("empresas")
      .select("secciones")
      .eq("id", perfil.empresa_id)
      .maybeSingle();
    empresaSecciones = (data?.secciones as string[] | undefined) ?? [];
  }

  const base = perfil.secciones_override ?? empresaSecciones;
  const visibles = esAdmin ? [...SECCIONES] : base;
  return { perfil, esAdmin, empresaSecciones, visibles };
});

/**
 * Exige un usuario aprobado. Redirige según el caso:
 *  - sin sesión → /ingresar
 *  - perfil sin cargar todavía (OAuth recién logueado, falta completar) → /completar
 *  - estado pendiente/rechazado/bloqueado → /pendiente
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
 * Enforcement de permisos por sección (Etapa 2). Se llama al tope de cada página de
 * sección — las páginas SÍ re-renderizan al navegar (a diferencia de los layouts, por
 * el partial rendering de Next), así el chequeo corre en cada visita.
 *
 * Con `AUTH_ENFORCED` apagado es un NO-OP inmediato: no lee cookies → la página sigue
 * siendo estática/ISR igual que hoy (requisito duro). Con el flag prendido, exige
 * aprobado + permiso de la sección; si no, redirige.
 */
export async function requireSeccion(seccion: SeccionKey): Promise<void> {
  if (!AUTH_ENFORCED) return;
  const acceso = await getAcceso();
  if (!acceso) redirect("/ingresar");
  if (acceso.perfil.estado !== "aprobado") redirect("/pendiente");
  if (!acceso.esAdmin && !acceso.visibles.includes(seccion)) redirect("/sin-acceso");
}

/**
 * Guard para route handlers de datos (Etapa 3). Con `AUTH_ENFORCED` apagado devuelve
 * null de inmediato (NO lee cookies → la API sigue pública y cacheable como hoy).
 * Con el flag prendido, exige sesión aprobada + permiso de la sección; si falta,
 * devuelve un `Response` (401/403, sin cache) para cortar. Los admin pasan siempre.
 */
export async function guardApiSeccion(seccion: SeccionKey): Promise<Response | null> {
  if (!AUTH_ENFORCED) return null;
  const noCache = { "cache-control": "private, no-store" };
  const acceso = await getAcceso();
  if (!acceso) {
    return Response.json({ error: "No autenticado." }, { status: 401, headers: noCache });
  }
  if (acceso.perfil.estado !== "aprobado") {
    return Response.json({ error: "Cuenta no habilitada." }, { status: 403, headers: noCache });
  }
  if (!acceso.esAdmin && !acceso.visibles.includes(seccion)) {
    return Response.json({ error: "Sección no incluida en tu plan." }, { status: 403, headers: noCache });
  }
  return null;
}

/**
 * Exige rol admin. A diferencia del gate del sitio, NO depende de `AUTH_ENFORCED`:
 * el panel /admin está SIEMPRE protegido (aun con el flag apagado la web es pública,
 * pero /admin nunca lo es). Sin sesión → /ingresar; con sesión no-admin → home.
 */
export async function requireAdmin(): Promise<Perfil> {
  const perfil = await getPerfil();
  if (!perfil) redirect("/ingresar?next=/admin");
  if (perfil.rol !== "admin") redirect("/");
  return perfil;
}
