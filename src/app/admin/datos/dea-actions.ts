"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/auth/server";
import type { FilaEstimacion } from "@/lib/parse-dea";

/**
 * Confirmación del uploader de la DEA-SAGyP (/admin/datos, lote L5 del backlog maestro). El CSV
 * oficial pesa ~11,5 MB — mandarlo entero (o incluso el archivo crudo en un primer paso) choca con
 * el límite de payload de las Server Actions en Vercel (~4,5 MB por función, no configurable vía
 * `next.config`; confirmado con un intento real que tiraba "This page couldn't load" al
 * previsualizar). Por eso el parseo/agregado a nacional (`parseDea`, en `dea-uploader.tsx`) corre
 * en el NAVEGADOR — acá solo llega el resumen ya agregado (`filas`, unas pocas decenas de rows),
 * bien por debajo del límite. Escritura por RPC `admin_upsert_estimaciones` (guard is_admin(),
 * migración 20260722180000) con el cliente SSR + sesión admin — sin service key en la web.
 */

export type DeaState = { error?: string; ok?: { filas: number } } | undefined;

export async function confirmarDea(_state: DeaState, formData: FormData): Promise<DeaState> {
  await requireAdmin();

  const raw = String(formData.get("filas") ?? "");
  let rows: FilaEstimacion[];
  try {
    rows = JSON.parse(raw);
  } catch {
    return { error: "Datos corruptos — volvé a previsualizar el archivo." };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "No hay filas para cargar — volvé a previsualizar el archivo." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_upsert_estimaciones", { filas: rows });
  if (error) return { error: error.message };

  revalidatePath("/produccion");
  return { ok: { filas: typeof data === "number" ? data : rows.length } };
}
