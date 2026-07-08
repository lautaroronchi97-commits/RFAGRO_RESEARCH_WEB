/** Tipos de la curva de A3 compartidos entre server (curva.ts) y client (calculadoras). */

export type PosCurva = {
  symbol: string;
  posicion: string;
  precio: number; // settlement
  vto: string; // YYYY-MM-DD
};

export type GranoCurva = { underlying: string; nombre: string; posiciones: PosCurva[] };
