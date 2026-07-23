"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { numDeInput } from "@/lib/format";

/**
 * "Datos del día" del informe diario (MP1 de docs/PLAN_INFORMES.md): el "color de
 * la rueda" (texto libre) + las compras netas del BCRA (carga manual, M USD — desde
 * C4/PLAN_BACKLOG.md la ingesta automática de scripts/ingest-bcra-mulc.mjs escribe
 * en la MISMA tabla y pisa este valor cuando llega el dato oficial). Van por las
 * RPC SECURITY DEFINER `admin_upsert_mesa_color` / `admin_upsert_compras_bcra`
 * (guard is_admin() adentro, migración 20260722120000) con el cliente SSR + sesión
 * del admin — mismo patrón que admin_upsert_compras. BCRA vacío = no se toca ese día.
 */

export type DatosDiaState = { ok?: string; error?: string } | undefined;

export async function guardarDatosDelDia(_prev: DatosDiaState, formData: FormData): Promise<DatosDiaState> {
  await requireAdmin();

  const fecha = String(formData.get("fecha") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Fecha inválida." };

  const texto = String(formData.get("texto") ?? "");
  const bcraRaw = String(formData.get("bcra") ?? "").trim();

  const supabase = await createSupabaseServerClient();

  const { error: eColor } = await supabase.rpc("admin_upsert_mesa_color", {
    p_fecha: fecha,
    p_texto: texto,
  });
  if (eColor) return { error: eColor.message };

  if (bcraRaw) {
    const monto = numDeInput(bcraRaw);
    if (!Number.isFinite(monto)) return { error: "El monto de compras BCRA no es un número válido." };
    const { error: eBcra } = await supabase.rpc("admin_upsert_compras_bcra", {
      p_fecha: fecha,
      p_monto_musd: monto,
    });
    if (eBcra) return { error: eBcra.message };
  }

  revalidatePath("/admin/datos");
  return { ok: "Datos del día guardados." };
}
