"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { parseDea, resumenFilas, type FilaEstimacion } from "@/lib/parse-dea";

/**
 * Uploader del CSV oficial de la DEA-SAGyP (/admin/datos) — lote L5 del backlog maestro
 * (`datosestimaciones.magyp.gob.ar` bloquea las IPs de datacenter; Lautaro lo baja de su
 * navegador y lo sube acá). Mismo patrón 2 pasos que el uploader de compras/Agrochat: el
 * `File` vive en el estado del cliente y se reenvía en los dos pasos (serverless statelessness).
 * Escritura por RPC `admin_upsert_estimaciones` (guard is_admin(), migración 20260722180000)
 * con el cliente SSR + sesión admin — sin service key en la web.
 */

export type PreviewDea = {
  archivo: string;
  filas: number;
  granos: string[];
  campanias: string[];
  fecha: string;
};

export type DeaState =
  | { error?: string; preview?: PreviewDea; ok?: { filas: number } }
  | undefined;

async function parsearArchivo(formData: FormData): Promise<
  { error: string } | { rows: FilaEstimacion[]; nombre: string; fecha: string }
> {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elegí el CSV oficial de la DEA (descargado de datosestimaciones.magyp.gob.ar)." };
  }
  const fecha = String(formData.get("fecha") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Fecha inválida." };

  const buf = Buffer.from(await archivo.arrayBuffer());
  const csv = new TextDecoder("latin1").decode(buf);
  const full = String(formData.get("full") ?? "") === "1";
  const sinceYear = full ? null : new Date(fecha).getUTCFullYear() - 2;

  let rows: FilaEstimacion[];
  try {
    rows = parseDea(csv, fecha, sinceYear);
  } catch (e) {
    return { error: `No pude leer el CSV: ${e instanceof Error ? e.message : "formato inválido"}.` };
  }
  if (rows.length === 0) {
    return { error: "El CSV no trajo ninguna fila reconocible — ¿es el export oficial de la DEA (Datos de Estimaciones Agrícolas)?" };
  }
  return { rows, nombre: archivo.name, fecha };
}

export async function procesarDea(_state: DeaState, formData: FormData): Promise<DeaState> {
  await requireAdmin();

  const res = await parsearArchivo(formData);
  if ("error" in res) return { error: res.error };
  const { rows, nombre, fecha } = res;

  const paso = String(formData.get("paso") ?? "preview");
  if (paso !== "confirm") {
    const { granos, campanias } = resumenFilas(rows);
    return { preview: { archivo: nombre, filas: rows.length, granos, campanias, fecha } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_upsert_estimaciones", { filas: rows });
  if (error) return { error: error.message };

  revalidatePath("/produccion");
  return { ok: { filas: typeof data === "number" ? data : rows.length } };
}
