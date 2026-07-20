"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { parseAgrochat, claveFila, type ParseOk } from "@/lib/compras/parse-agrochat";

/**
 * Server actions del uploader de la serie de comercialización (/admin/datos).
 *
 * Flujo en 2 pasos SIN estado en memoria del server (Vercel serverless: el paso 2 puede
 * caer en otra lambda): el cliente guarda el File elegido en su estado y lo reenvía en
 * los DOS pasos; acá se re-parsea cada vez. Un solo action con `paso=preview|confirm`
 * (el botón que se apreta define el paso).
 *
 * La escritura NO usa service key (no existe en src/ y así debe quedar): va por la RPC
 * SECURITY DEFINER `admin_upsert_compras` (guard is_admin() adentro, migración
 * 20260720120000) con el cliente SSR anon + sesión del admin. Si la migración aún no se
 * aplicó, el error de PostgREST se muestra tal cual en el form.
 */

export type PreviewCarga = {
  archivo: string;
  filas: number;
  crudas: number;
  descartadas: number;
  duplicadas: number;
  desde: string;
  hasta: string;
  granos: string[];
  campanas: string[];
  /** Claves (campana, codigo, sector, fecha) que ya existen en `compras` → se actualizan. */
  existentes: number | null; // null = no se pudo consultar la base
  nuevas: number | null;
  muestra: { fecha: string; grano: string; sector: string; campana: string; semanal: number | null; total: number | null }[];
  advertencias: string[];
};

export type DatosState =
  | {
      error?: string;
      preview?: PreviewCarga;
      ok?: { filas: number; advertencias: string[] };
    }
  | undefined;

/** Lee y parsea el archivo del form (compartido por los dos pasos). */
async function parsearArchivo(formData: FormData): Promise<{ error: string } | { parsed: ParseOk; nombre: string }> {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elegí el archivo del export (CSV o Excel .xlsx)." };
  }
  const datos = new Uint8Array(await archivo.arrayBuffer());
  const r = parseAgrochat(datos, archivo.name);
  if (!r.ok) return { error: r.error };
  return { parsed: r, nombre: archivo.name };
}

/** Cuenta cuántas claves del archivo ya existen en `compras` (para el resumen del paso 1). */
async function contarExistentes(parsed: ParseOk, desde: string, hasta: string): Promise<number | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const claves = new Set(parsed.filas.map(claveFila));
    let existentes = 0;
    const PAGE = 1000;
    for (let off = 0; ; off += PAGE) {
      const { data, error } = await supabase
        .from("compras")
        .select("fecha,codigo_interno,campana,sector")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .range(off, off + PAGE - 1);
      if (error) return null;
      for (const r of data ?? []) {
        if (claves.has(`${r.campana}|${r.codigo_interno}|${r.sector}|${r.fecha}`)) existentes++;
      }
      if (!data || data.length < PAGE) break;
      if (off > 300_000) break; // backstop
    }
    return existentes;
  } catch {
    return null;
  }
}

export async function procesarCarga(_state: DatosState, formData: FormData): Promise<DatosState> {
  await requireAdmin();

  const res = await parsearArchivo(formData);
  if ("error" in res) return { error: res.error };
  const { parsed, nombre } = res;

  const fechas = parsed.filas.map((f) => f.fecha).sort();
  const desde = fechas[0];
  const hasta = fechas[fechas.length - 1];

  const paso = String(formData.get("paso") ?? "preview");

  // ------------------------------------------------------------------
  // Paso 1 — PREVISUALIZAR: resumen sin escribir nada.
  // ------------------------------------------------------------------
  if (paso !== "confirm") {
    const existentes = await contarExistentes(parsed, desde, hasta);
    const granos = [...new Set(parsed.filas.map((f) => f.grano_raw))].sort();
    const campanas = [...new Set(parsed.filas.map((f) => f.campana))].sort();
    return {
      preview: {
        archivo: nombre,
        filas: parsed.filas.length,
        crudas: parsed.totalCrudas,
        descartadas: parsed.descartadas,
        duplicadas: parsed.duplicadas,
        desde,
        hasta,
        granos,
        campanas,
        existentes,
        nuevas: existentes == null ? null : parsed.filas.length - existentes,
        muestra: parsed.filas.slice(0, 5).map((f) => ({
          fecha: f.fecha,
          grano: f.grano_raw,
          sector: f.sector,
          campana: f.campana,
          semanal: f.semanal_tn,
          total: f.toneladas,
        })),
        advertencias: [
          ...parsed.advertencias,
          ...(existentes == null ? ["No pude consultar la base para contar claves existentes."] : []),
        ],
      },
    };
  }

  // ------------------------------------------------------------------
  // Paso 2 — CONFIRMAR: upsert por lotes vía RPC + refresh de la matview.
  // ------------------------------------------------------------------
  const supabase = await createSupabaseServerClient();
  const advertencias = [...parsed.advertencias];
  const BATCH = 1000;
  let procesadas = 0;
  for (let i = 0; i < parsed.filas.length; i += BATCH) {
    const lote = parsed.filas.slice(i, i + BATCH);
    const { data, error } = await supabase.rpc("admin_upsert_compras", { filas: lote });
    if (error) {
      // Error de PostgREST tal cual (p. ej. la RPC no existe porque falta aplicar la migración).
      return {
        error: `Falló el upsert en la fila ${i + 1} (${procesadas} cargadas antes del error): ${error.message}`,
      };
    }
    procesadas += typeof data === "number" ? data : lote.length;
  }

  // Refresh de compras_avance_hist (% sobre cosecha). Si falla es advertencia, no fallo total:
  // los datos YA quedaron cargados; el refresh se puede correr después.
  const { error: eRefresh } = await supabase.rpc("admin_refresh_compras_avance");
  if (eRefresh) {
    advertencias.push(`Los datos se cargaron pero falló el refresh del avance: ${eRefresh.message}`);
  }

  revalidatePath("/comercio/negociado");
  revalidatePath("/comercio/temperatura");

  return { ok: { filas: procesadas, advertencias } };
}
