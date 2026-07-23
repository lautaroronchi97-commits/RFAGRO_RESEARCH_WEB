/**
 * Tipos compartidos del panel de gráficos de spreads (client-safe: sin `server-only`).
 * Los usan tanto la capa de datos server (`series.ts`, route handlers) como el
 * cliente (`derivadas.ts`, componentes).
 */

export type Fuente = "a3" | "cbot" | "pizarra";

/** Una fila del catálogo `series_catalogo`: una serie graficable. */
export type SerieCat = {
  fuente: Fuente;
  serieId: string; // "SOJ.ROS/JUL26" (a3) · "ZSX26" (cbot) · "pizarra:soja"
  raiz: string | null; // "SOJ.ROS" · "ZS" · null (pizarra)
  grano: string; // soja / maiz / trigo / girasol / sorgo (minúscula, normalizado)
  posicion: string | null; // "JUL26" · null (pizarra, serie continua)
  desde: string; // YYYY-MM-DD (primera rueda)
  hasta: string; // YYYY-MM-DD (última rueda)
  ruedas: number;
  volTotal: number | null;
  vencimiento: string | null; // YYYY-MM-DD (proxy MAX(fecha) si es histórico; null pizarra)
  vencEstimado: boolean; // true = vencimiento por proxy, no real de `vencimientos`
};

/** Puntos crudos de una serie (formato columnar, liviano en el wire). */
export type SeriePuntos = {
  id: string; // serieId
  fuente: Fuente;
  d: string[]; // fechas YYYY-MM-DD ascendentes
  v: number[]; // valores (USD/tn; ARS si unit=ars en pizarra)
  e?: boolean[]; // estimativo por punto (solo pizarra)
  vol?: (number | null)[]; // volumen operado (solo a3/cbot; pizarra no tiene)
  oi?: (number | null)[]; // open interest (solo a3/cbot)
};

/** Deriva la fuente a partir del serieId (self-describing, sin tabla extra). */
export function fuenteDeId(id: string): Fuente {
  if (id.startsWith("pizarra:")) return "pizarra";
  if (id.includes("/")) return "a3"; // símbolos A3 = "SOJ.ROS/JUL26"
  return "cbot"; // símbolos CBOT = "ZSX26"
}
