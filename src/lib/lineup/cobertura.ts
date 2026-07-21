/**
 * Cobertura exportadora — puerto de la lógica de señales de `cobertura.py` de
 * LineUps_Code. Compara lo DECLARADO (DJVE) contra lo ORIGINADO (line-up) para
 * detectar quién está corto (presión compradora / alcista FAS) o sobre-originado
 * (bajista). Las constantes se copian LITERALES del módulo Python — Lautaro las marcó
 * PROVISORIAS (auditoría E2 21/07/2026): la calibración con datos queda para E7.
 */

export const RATIO_CORTO = 0.7; // ratio < 0.7 → corto → ALCISTA FAS
export const RATIO_SOBRE_ORIGEN = 1.3; // ratio > 1.3 → sobre-originado → BAJISTA
export const DECLARADO_MIN_SIGNIFICATIVO = 5_000; // tn mínimas para emitir señal alcista
export const CONGESTION_TN_SEMANA = 360_000; // pico semanal de ETB → congestión

export type SenalTag = "ALCISTA FAS" | "BAJISTA" | "NEUTRO";
export type Senal = { tag: SenalTag; intensidad: number; racional: string };

/**
 * Ratio de cobertura = originado / declarado, con los mismos bordes que cobertura.py:
 *  - declarado ≤ 0 y originado > 0 → Infinity (todo originado, nada declarado)
 *  - declarado ≤ 0 y originado ≤ 0 → null (sin dato)
 */
export function ratioCobertura(declarado: number, originado: number): number | null {
  if (declarado <= 0) return originado > 0 ? Infinity : null;
  return originado / declarado;
}

/** Intensidad 1-5 por el valor absoluto de la falta a cubrir (mismos cortes que cobertura.py). */
export function intensidad(faltaCubrir: number): number {
  const a = Math.abs(faltaCubrir);
  if (a < 60_000) return 1;
  if (a < 180_000) return 2;
  if (a < 360_000) return 3;
  if (a < 720_000) return 4;
  return 5;
}

/**
 * Señal de una fila (declarado vs originado):
 *  - ALCISTA FAS: ratio < 0.7 y declarado ≥ 5.000 tn (declaró fuerte pero no puso barcos → compra).
 *  - BAJISTA: ratio > 1.3 (originó de más → demanda agotada).
 *  - NEUTRO: el resto.
 */
export function senalDe(declarado: number, originado: number): Senal {
  const ratio = ratioCobertura(declarado, originado);
  const falta = declarado - originado;
  if (ratio !== null && ratio < RATIO_CORTO && declarado >= DECLARADO_MIN_SIGNIFICATIVO) {
    return {
      tag: "ALCISTA FAS",
      intensidad: intensidad(falta),
      racional: "Declaró fuerte pero todavía no puso barcos: le falta originar → presión compradora sobre el FAS.",
    };
  }
  if (ratio !== null && ratio > RATIO_SOBRE_ORIGEN) {
    return {
      tag: "BAJISTA",
      intensidad: intensidad(falta),
      racional: "Ya originó más de lo declarado a esta ventana: demanda de corto agotada.",
    };
  }
  return { tag: "NEUTRO", intensidad: 0, racional: "Declarado y originado en línea." };
}

/** Formatea el ratio para mostrar (Infinity → "∞", null → "—"). */
export function ratioFmt(r: number | null): string {
  if (r === null) return "—";
  if (!Number.isFinite(r)) return "∞";
  return r.toFixed(2);
}
