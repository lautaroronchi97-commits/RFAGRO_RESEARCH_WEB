"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/auth/server";

/**
 * Feedback de Lautaro sobre un view (/granos/view). Va por la RPC SECURITY DEFINER
 * `admin_feedback_view` (guard is_admin() adentro, migración 20260721150000) con el
 * cliente SSR + sesión del admin — sin service key en la web, mismo patrón que el
 * uploader de /admin/datos. Texto vacío = limpiar el feedback.
 */

export type FeedbackState = { ok?: string; error?: string } | undefined;

export async function guardarFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const feedback = String(formData.get("feedback") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "View inválido." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_feedback_view", {
    p_id: id,
    p_feedback: feedback,
  });
  if (error) return { error: error.message };
  if (!data) return { error: "El view no existe." };

  revalidatePath("/granos/view");
  return { ok: feedback.trim() ? "Feedback guardado." : "Feedback limpiado." };
}
