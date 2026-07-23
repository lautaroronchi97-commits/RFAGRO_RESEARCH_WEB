"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { parsePas, resumenFilas, type FilaEstimacion, type Descarte } from "@/lib/parse-pas";

/**
 * Uploader del export histórico de BCBA-PAS (/admin/datos) — A3 del backlog maestro (fuente
 * automática descartada, Cloudflare 403 confirmado 2/2). Mismo patrón 2 pasos que el uploader de
 * DEA-SAGyP: el `File` vive en el estado del cliente y se reenvía en los dos pasos (serverless
 * statelessness). Escritura por la MISMA RPC `admin_upsert_estimaciones` que ya usa DEA (guard
 * is_admin(), migración 20260722180000) — genérica por organismo, no hizo falta una nueva.
 */

export type PreviewPas = {
  archivo: string;
  filas: number;
  granos: string[];
  campanias: string[];
  fecha: string;
  descartes: Descarte[];
};

export type PasState =
  | { error?: string; preview?: PreviewPas; ok?: { filas: number; descartadas: number } }
  | undefined;

async function parsearArchivo(
  formData: FormData,
): Promise<{ error: string } | { rows: FilaEstimacion[]; descartes: Descarte[]; nombre: string; fecha: string }> {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elegí el CSV histórico de BCBA-PAS (export de bolsadecereales.com/estimaciones-agricolas)." };
  }
  const fecha = String(formData.get("fecha") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Fecha inválida." };

  const buf = Buffer.from(await archivo.arrayBuffer());
  const csv = new TextDecoder("latin1").decode(buf);

  let rows: FilaEstimacion[];
  let descartes: Descarte[];
  try {
    ({ filas: rows, descartes } = parsePas(csv, fecha));
  } catch (e) {
    return { error: `No pude leer el CSV: ${e instanceof Error ? e.message : "formato inválido"}.` };
  }
  if (rows.length === 0) {
    return { error: "El CSV no trajo ninguna fila reconocible — ¿es el export oficial del PAS (Cultivo;Campaña;Zona;Sembrado…)?" };
  }
  return { rows, descartes, nombre: archivo.name, fecha };
}

export async function procesarPas(_state: PasState, formData: FormData): Promise<PasState> {
  await requireAdmin();

  const res = await parsearArchivo(formData);
  if ("error" in res) return { error: res.error };
  const { rows, descartes, nombre, fecha } = res;

  const paso = String(formData.get("paso") ?? "preview");
  if (paso !== "confirm") {
    const { granos, campanias } = resumenFilas(rows);
    return { preview: { archivo: nombre, filas: rows.length, granos, campanias, fecha, descartes } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_upsert_estimaciones", { filas: rows });
  if (error) return { error: error.message };

  revalidatePath("/produccion");
  return { ok: { filas: typeof data === "number" ? data : rows.length, descartadas: descartes.length } };
}
