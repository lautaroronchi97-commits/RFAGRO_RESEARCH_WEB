/**
 * mesa_calor.ts — Combinadores del índice de calor de mercadería (pestaña/página MESA).
 * Puerto 1:1 de las funciones PURAS de `mesa_calor.py` de LineUps_Code (Fase 4).
 *
 * Convierte la presión física (gap de cobertura DJVE−line-up, densidad del line-up, ritmo de farmer
 * selling) en un ÍNDICE DE CALOR 0-100 por producto, más su DIRECCIÓN (abriéndose/estable/cerrándose),
 * y combina ambos en una ACCIÓN sugerida (DIFERIR / VENDER YA / ...).
 *
 *   CALOR = w_gap × pctl(gap_30d) + w_lineup × pctl(densidad_30d) + w_farmer × (100 − pctl(avance_ventas))
 *
 * Demanda (w_gap + w_lineup = 0.65) domina sobre oferta (w_farmer = 0.35). Los percentiles son
 * estacionales (estacional.ts); cada componente que falte se omite y los pesos se renormalizan.
 *
 * Módulo PURO: recibe valores, devuelve valores. La lógica de series/DataFrames (gap_cobertura,
 * tonelaje_lineup, direccion_gap) vive en las vistas Supabase + la orquestación (temperatura.ts).
 */

// ---------------------------------------------------------------------------
// Parametría (editable — la mesa recalibra desde acá; la UI la muestra)
// ---------------------------------------------------------------------------

export const W_GAP = 0.35;
export const W_LINEUP = 0.3;
export const W_FARMER = 0.35;

export const HORIZONTE_CALOR_DIAS = 30;
export const K_MOMENTUM_DIAS = 10;
export const UMBRAL_DIRECCION_TN = 32_500; // media Panamax

export const RINDE_HARINA = 0.745;
export const RINDE_ACEITE = 0.19;

export const BANDA_CALIENTE = 80;
export const BANDA_FIRME = 60;
export const BANDA_NEUTRO = 40;
export const BANDA_PESADO = 20;

export const PRODUCTOS_MESA = ["MAIZE", "WHEAT", "SOJA_CRUSH", "SBS"] as const;
export const CODIGOS_CRUSH = ["SBM", "SBO"] as const;

export const PRODUCTO_DISPLAY_MESA: Record<string, string> = {
  MAIZE: "Maíz",
  WHEAT: "Trigo",
  SOJA_CRUSH: "Soja (crush)",
  SBS: "Soja poroto",
};

export type Banda = "CALIENTE" | "FIRME" | "NEUTRO" | "PESADO" | "MUY PESADO" | "SIN HISTORIA";
export type Direccion = "ABRIENDOSE" | "ESTABLE" | "CERRANDOSE" | "SIN DATO";

// ---------------------------------------------------------------------------
// 1. Bandas y direcciones
// ---------------------------------------------------------------------------

/** Índice 0-100 → banda de calor. null → "SIN HISTORIA". */
export function clasificarBanda(calor: number | null): Banda {
  if (calor == null || Number.isNaN(calor)) return "SIN HISTORIA";
  if (calor >= BANDA_CALIENTE) return "CALIENTE";
  if (calor >= BANDA_FIRME) return "FIRME";
  if (calor >= BANDA_NEUTRO) return "NEUTRO";
  if (calor >= BANDA_PESADO) return "PESADO";
  return "MUY PESADO";
}

/**
 * Movimiento del gap → dirección. delta = gap(hoy) − gap(hoy−K).
 *  ABRIENDOSE si delta ≥ +umbral · CERRANDOSE si delta ≤ −umbral · ESTABLE en el resto.
 */
export function clasificarDireccion(deltaGap: number | null, umbral = UMBRAL_DIRECCION_TN): Direccion {
  if (deltaGap == null || Number.isNaN(deltaGap)) return "SIN DATO";
  if (deltaGap >= umbral) return "ABRIENDOSE";
  if (deltaGap <= -umbral) return "CERRANDOSE";
  return "ESTABLE";
}

// Matriz de acción (banda colapsada en nivel × dirección) → [acción, explicación].
const MATRIZ_ACCION: Record<string, [string, string]> = {
  "CALIENTE|ABRIENDOSE": ["DIFERIR", "el premio va a mejorar"],
  "CALIENTE|ESTABLE": ["VENDER SELECTIVO", "vender al más corto"],
  "CALIENTE|CERRANDOSE": ["VENDER YA", "se están cubriendo, el premio se desinfla"],
  "NEUTRO|ABRIENDOSE": ["ATENCIÓN", "calentándose"],
  "NEUTRO|ESTABLE": ["SIN SEÑAL", "sin presión clara"],
  "NEUTRO|CERRANDOSE": ["SIN APURO", "demanda relajándose"],
  "PESADO|ABRIENDOSE": ["VIGILAR", "posible giro"],
  "PESADO|ESTABLE": ["NO ESPERAR BID", "no va a haber interés"],
  "PESADO|CERRANDOSE": ["COMPRAR BARATO", "productor presionado"],
};

/** Colapsa las 5 bandas en los 3 niveles de la matriz de acción. */
function bandaANivel(banda: Banda): "CALIENTE" | "NEUTRO" | "PESADO" | "SIN HISTORIA" {
  if (banda === "CALIENTE" || banda === "FIRME") return "CALIENTE";
  if (banda === "PESADO" || banda === "MUY PESADO") return "PESADO";
  if (banda === "NEUTRO") return "NEUTRO";
  return "SIN HISTORIA";
}

/** (acción, explicación) según banda de calor y dirección. Puerto de `accion_sugerida`. */
export function accionSugerida(banda: Banda, direccion: Direccion): [string, string] {
  const nivel = bandaANivel(banda);
  if (nivel === "SIN HISTORIA" || direccion === "SIN DATO") return ["—", "sin datos suficientes"];
  return MATRIZ_ACCION[`${nivel}|${direccion}`] ?? MATRIZ_ACCION[`${nivel}|ESTABLE`] ?? ["—", ""];
}

// ---------------------------------------------------------------------------
// 2. Equivalente poroto (crush de soja)
// ---------------------------------------------------------------------------

/**
 * Tonelaje de harina (SBM) y aceite (SBO) → equivalente poroto (soja calidad fábrica que la industria
 * necesita originar). poroto_eq = tn_harina/rinde_harina + tn_aceite/rinde_aceite.
 */
export function equivalentePoroto(
  tnHarina: number,
  tnAceite: number,
  rindeHarina = RINDE_HARINA,
  rindeAceite = RINDE_ACEITE,
): number {
  let eq = 0;
  if (rindeHarina > 0) eq += tnHarina / rindeHarina;
  if (rindeAceite > 0) eq += tnAceite / rindeAceite;
  return eq;
}

// ---------------------------------------------------------------------------
// 3. Índice de calor (combina los percentiles)
// ---------------------------------------------------------------------------

/**
 * Combina los percentiles de los 3 componentes en el índice 0-100. El farmer selling se INVIERTE
 * (menos avance = más retención = más calor). Los componentes null se omiten y los pesos se
 * renormalizan sobre los presentes. Devuelve null si no hay ningún componente. Puerto de `indice_calor`.
 */
export function indiceCalor(
  pctlGap: number | null,
  pctlLineup: number | null,
  pctlAvanceVentas: number | null,
  wGap = W_GAP,
  wLineup = W_LINEUP,
  wFarmer = W_FARMER,
): number | null {
  const componentes: [number, number][] = []; // (valor, peso)
  if (pctlGap != null && !Number.isNaN(pctlGap)) componentes.push([pctlGap, wGap]);
  if (pctlLineup != null && !Number.isNaN(pctlLineup)) componentes.push([pctlLineup, wLineup]);
  if (pctlAvanceVentas != null && !Number.isNaN(pctlAvanceVentas)) {
    componentes.push([100 - pctlAvanceVentas, wFarmer]); // invertir
  }
  if (componentes.length === 0) return null;
  const pesoTotal = componentes.reduce((s, [, w]) => s + w, 0);
  if (pesoTotal <= 0) return null;
  return componentes.reduce((s, [v, w]) => s + v * w, 0) / pesoTotal;
}

// ---------------------------------------------------------------------------
// 4. Etiquetas legibles
// ---------------------------------------------------------------------------

export const BANDA_EMOJI: Record<Banda, string> = {
  CALIENTE: "🔥", FIRME: "", NEUTRO: "", PESADO: "", "MUY PESADO": "🧊", "SIN HISTORIA": "",
};
export const DIRECCION_GLIFO: Record<Direccion, string> = {
  ABRIENDOSE: "↗", ESTABLE: "→", CERRANDOSE: "↘", "SIN DATO": "·",
};
export const DIRECCION_LABEL: Record<Direccion, string> = {
  ABRIENDOSE: "ABRIÉNDOSE", ESTABLE: "ESTABLE", CERRANDOSE: "CERRÁNDOSE", "SIN DATO": "SIN DATO",
};
