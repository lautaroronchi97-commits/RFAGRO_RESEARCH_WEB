"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/auth/server";

/**
 * "Datos del día" del informe diario (MP1 de docs/PLAN_INFORMES.md): el "color de
 * la rueda" (texto libre). Va por la RPC SECURITY DEFINER `admin_upsert_mesa_color`
 * (guard is_admin() adentro, migración 20260722120000) con el cliente SSR + sesión
 * del admin. Las compras BCRA tienen su propia carga en `bcra-actions.ts`
 * (`guardarComprasBcraManual`, misma tabla, fecha elegible en vez de solo-hoy).
 */

export type DatosDiaState = { ok?: string; error?: string } | undefined;

export async function guardarDatosDelDia(_prev: DatosDiaState, formData: FormData): Promise<DatosDiaState> {
  await requireAdmin();

  const fecha = String(formData.get("fecha") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Fecha inválida." };

  const texto = String(formData.get("texto") ?? "");

  const supabase = await createSupabaseServerClient();

  const { error: eColor } = await supabase.rpc("admin_upsert_mesa_color", {
    p_fecha: fecha,
    p_texto: texto,
  });
  if (eColor) return { error: eColor.message };

  revalidatePath("/admin/datos");
  return { ok: "Datos del día guardados." };
}
