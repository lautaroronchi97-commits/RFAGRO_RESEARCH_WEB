/**
 * Estado / meta de frescura compartido por todos los submódulos de `market/`
 * (y re-exportado por la fachada `src/lib/market.ts`).
 */

export type FuenteStatus = "real" | "parcial" | "ejemplo";

export type Meta = {
  source: string;
  updatedAt: number | null; // epoch ms de armado del dato (null si es todo ejemplo)
  status: FuenteStatus;
  problemas: string[]; // fuentes caídas u observaciones para el usuario
};
