"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/auth/server";

/**
 * "Color de la rueda" (MP1 de docs/PLAN_INFORMES.md): lo que Lautaro vio ese día
 * (negocios, sensaciones) para que el informe diario no salga solo con números.
 * Va por la RPC SECURITY DEFINER `admin_upsert_mesa_color` (guard is_admin() adentro,
 * migración 20260722120000) con el cliente SSR + sesión del admin — mismo patrón que
 * admin_upsert_compras y admin_feedback_view. Texto vacío = borrar el color del día.
 */

export type MesaColorState = { ok?: string; error?: string } | undefined;

export async function guardarColorRueda(_prev: MesaColorState, formData: FormData): Promise<MesaColorState> {
  await requireAdmin();

  const fecha = String(formData.get("fecha") ?? "");
  const texto = String(formData.get("texto") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Fecha inválida." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_upsert_mesa_color", {
    p_fecha: fecha,
    p_texto: texto,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/datos");
  return { ok: texto.trim() ? "Color de la rueda guardado." : "Color de la rueda borrado." };
}
