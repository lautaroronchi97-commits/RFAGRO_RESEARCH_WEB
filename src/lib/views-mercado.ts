import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "./auth/server";

/**
 * views-mercado.ts — lectura del view direccional semanal por grano (MP3 de
 * docs/PLAN_INFORMES.md, tabla `views_mercado`).
 *
 * OJO: a diferencia del resto de las libs de datos (supabase.ts con la anon key),
 * acá se lee con el cliente SSR y la SESIÓN del usuario: la tabla es INTERNA MESA
 * (RLS `is_admin()`, migración 20260721150000) y anon no ve nada. La página que
 * la usa está detrás de `requireAdmin()`, así que siempre hay sesión de admin.
 */

export type GranoView = "soja" | "maiz" | "trigo";
export type DireccionView = "alcista" | "bajista" | "neutral";

export type ArgumentoView = { titulo: string; dato: string };
export type ArgumentosView = {
  a_favor: ArgumentoView[];
  en_contra: ArgumentoView[];
  accion: string;
};

export type ViewMercado = {
  id: string;
  grano: GranoView;
  fecha: string;
  direccion: DireccionView;
  confianza: number;
  horizonte: string;
  tesis_md: string;
  argumentos: ArgumentosView;
  invalidacion: string;
  feedback_lautaro: string | null;
  creado_en: string;
};

export type ViewsMercadoData = {
  /** Último view por grano (o null si ese grano nunca tuvo). */
  vigentes: Record<GranoView, ViewMercado | null>;
  /** Views anteriores (todos los granos mezclados, fecha desc). */
  historial: ViewMercado[];
  error: string | null;
};

export const GRANOS_VIEW: GranoView[] = ["soja", "maiz", "trigo"];
export const GRANO_VIEW_LABEL: Record<GranoView, string> = {
  soja: "Soja",
  maiz: "Maíz",
  trigo: "Trigo",
};
export const DIRECCION_VIEW_LABEL: Record<DireccionView, string> = {
  alcista: "ALCISTA",
  bajista: "BAJISTA",
  neutral: "NEUTRAL",
};

function argOk(x: unknown): ArgumentoView[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((a): a is { titulo?: unknown; dato?: unknown } => !!a && typeof a === "object")
    .map((a) => ({ titulo: String(a.titulo ?? ""), dato: String(a.dato ?? "") }))
    .filter((a) => a.titulo || a.dato);
}

function parseArgumentos(x: unknown): ArgumentosView {
  const o = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
  return {
    a_favor: argOk(o.a_favor),
    en_contra: argOk(o.en_contra),
    accion: typeof o.accion === "string" ? o.accion : "",
  };
}

export const getViewsMercado = cache(async (): Promise<ViewsMercadoData> => {
  const vacio: Record<GranoView, ViewMercado | null> = { soja: null, maiz: null, trigo: null };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("views_mercado")
      .select(
        "id,grano,fecha,direccion,confianza,horizonte,tesis_md,argumentos,invalidacion,feedback_lautaro,creado_en",
      )
      .order("fecha", { ascending: false })
      .order("grano", { ascending: true })
      .limit(120);
    if (error) {
      // No filtrar el mensaje crudo de Postgres a la UI (E3 H10): queda en el log del server.
      console.error("[views-mercado] lectura falló:", error.message);
      return { vigentes: vacio, historial: [], error: "todavía-no-hay" };
    }

    const rows: ViewMercado[] = (data ?? []).map((r) => ({
      ...r,
      confianza: Number(r.confianza),
      argumentos: parseArgumentos(r.argumentos),
    })) as ViewMercado[];

    const vigentes = { ...vacio };
    const historial: ViewMercado[] = [];
    for (const v of rows) {
      if (GRANOS_VIEW.includes(v.grano) && vigentes[v.grano] === null) vigentes[v.grano] = v;
      else historial.push(v);
    }
    return { vigentes, historial, error: null };
  } catch {
    return { vigentes: vacio, historial: [], error: "todavía-no-hay" };
  }
});
