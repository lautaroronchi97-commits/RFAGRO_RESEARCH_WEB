"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/auth/server";

/**
 * Server actions de /admin/interpretaciones (MP4 de docs/PLAN_INFORMES.md). Van por las
 * RPC SECURITY DEFINER con guard is_admin() (migración 20260723170000) con el cliente SSR
 * + sesión del admin — sin service key en la web, mismo patrón que /granos/view.
 */

export type InterpState = { ok?: string; error?: string } | undefined;

function idValido(id: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(id);
}

export async function guardarInterpretacion(_prev: InterpState, formData: FormData): Promise<InterpState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const borrador = String(formData.get("borrador_md") ?? "").trim();
  if (!idValido(id)) return { error: "Interpretación inválida." };
  if (!borrador) return { error: "El texto no puede quedar vacío." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_actualizar_interpretacion", {
    p_id: id,
    p_borrador_md: borrador,
  });
  if (error) return { error: error.message };
  if (!data) return { error: "No se encontró la interpretación." };

  revalidatePath("/admin/interpretaciones");
  return { ok: "Borrador guardado." };
}

export async function publicarInterpretacion(_prev: InterpState, formData: FormData): Promise<InterpState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const borrador = String(formData.get("borrador_md") ?? "").trim();
  if (!idValido(id)) return { error: "Interpretación inválida." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_publicar_interpretacion", {
    p_id: id,
    p_borrador_md: borrador || null,
  });
  if (error) return { error: error.message };
  if (!data) return { error: "No se encontró la interpretación." };

  revalidatePath("/admin/interpretaciones");
  revalidatePath("/produccion");
  revalidatePath("/informes");
  return { ok: "Publicada — ya es visible en /produccion." };
}

export async function descartarInterpretacion(_prev: InterpState, formData: FormData): Promise<InterpState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!idValido(id)) return { error: "Interpretación inválida." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_descartar_interpretacion", { p_id: id });
  if (error) return { error: error.message };
  if (!data) return { error: "No se encontró la interpretación." };

  revalidatePath("/admin/interpretaciones");
  return { ok: "Descartada." };
}
