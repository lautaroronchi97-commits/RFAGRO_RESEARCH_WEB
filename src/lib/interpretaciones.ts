import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "./auth/server";
import { sbSelect } from "./supabase";

/**
 * Interpretaciones de informes de organismos (MP4 de docs/PLAN_INFORMES.md, ítem 21):
 * borrador → OK de Lautaro en /admin/interpretaciones → publicado. Ver migración
 * 20260723170000_mp4_interpretaciones.sql.
 */

export type EstadoInterp = "borrador" | "publicado" | "descartado";

export type Interpretacion = {
  id: string;
  organismo: string;
  informe: string;
  fecha_publicacion: string;
  granos: string[];
  borrador_md: string;
  publicado_md: string | null;
  estado: EstadoInterp;
  editado_en: string;
  creado_en: string;
};

const COLS_ADMIN =
  "id,organismo,informe,fecha_publicacion,granos,borrador_md,publicado_md,estado,editado_en,creado_en";

/**
 * TODAS las interpretaciones (cualquier estado), para /admin/interpretaciones. Requiere
 * sesión admin (RLS `interpretaciones_select_admin`) — el caller ya corrió requireAdmin().
 */
export const getInterpretacionesAdmin = cache(async (): Promise<Interpretacion[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("interpretaciones")
    .select(COLS_ADMIN)
    .order("fecha_publicacion", { ascending: false })
    .order("creado_en", { ascending: false });
  if (error || !data) return [];
  return data as Interpretacion[];
});

/** Cuántos borradores esperan revisión (badge de la pestaña del panel). */
export async function contarBorradoresInterp(): Promise<number> {
  const filas = await getInterpretacionesAdmin();
  return filas.filter((f) => f.estado === "borrador").length;
}

export type InterpretacionPublica = {
  organismo: string;
  informe: string;
  fecha_publicacion: string;
  granos: string[];
  publicado_md: string;
};

/**
 * Interpretaciones YA publicadas (lectura pública/cliente vía RLS `estado=publicado`,
 * anon key — mismo patrón que el resto de /produccion). Para "La lectura de la mesa".
 */
export async function getInterpretacionesPublicadas(): Promise<InterpretacionPublica[]> {
  const res = await sbSelect(
    "interpretaciones?estado=eq.publicado&select=organismo,informe,fecha_publicacion,granos,publicado_md&order=fecha_publicacion.desc&limit=100",
    300,
  );
  if (!res.ok || !Array.isArray(res.data)) return [];
  return (res.data as InterpretacionPublica[]).filter((r) => typeof r.publicado_md === "string" && r.publicado_md.length > 0);
}
