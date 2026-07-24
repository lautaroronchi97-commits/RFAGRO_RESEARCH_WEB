/**
 * Productos prioritarios del line-up para ROFO AGRO (decisión 8 del plan de puertos):
 * complejo soja + maíz + trigo + cebada forrajera + sorgo + complejo girasol.
 * Fertilizantes y malta (cebada cervecera) quedan afuera. Código de cargo en la DB
 * → nombre display + familia (para agrupar los complejos).
 *
 * Colapso (decisión 6): la cáscara de soja (SHULLS) se suma a la harina/subproductos
 * de soja (SBM), como en config.py:COLAPSO_PRODUCTO de LineUps_Code.
 */

export type Familia = "Soja" | "Maíz" | "Trigo" | "Cebada" | "Sorgo" | "Girasol";

export type ProductoDef = { codigo: string; display: string; familia: Familia };

/** Orden de exposición pensado para la mesa (complejos juntos). */
export const PRODUCTOS: ProductoDef[] = [
  { codigo: "SBS", display: "Soja", familia: "Soja" },
  { codigo: "SBM", display: "Harina de soja", familia: "Soja" },
  { codigo: "SBO", display: "Aceite de soja", familia: "Soja" },
  { codigo: "MAIZE", display: "Maíz", familia: "Maíz" },
  { codigo: "WHEAT", display: "Trigo", familia: "Trigo" },
  { codigo: "BARLEY", display: "Cebada", familia: "Cebada" },
  { codigo: "SORGHUM", display: "Sorgo", familia: "Sorgo" },
  { codigo: "SFSEED", display: "Girasol", familia: "Girasol" },
  { codigo: "SFMP", display: "Harina de girasol", familia: "Girasol" },
  { codigo: "SFO", display: "Aceite de girasol", familia: "Girasol" },
];

/** Colapso de códigos crudos → código "padre". SHULLS (cáscara) → SBM (subprod. soja). */
const COLAPSO: Record<string, string> = { SHULLS: "SBM" };

export function colapsarCargo(cargo: string | null): string | null {
  if (!cargo) return null;
  const c = cargo.toUpperCase().trim();
  return COLAPSO[c] ?? c;
}

const POR_CODIGO = new Map(PRODUCTOS.map((p, i) => [p.codigo, { ...p, orden: i }]));

/** Def del producto prioritario para un cargo crudo (aplica colapso). null si no es prioritario. */
export function productoDe(cargo: string | null): (ProductoDef & { orden: number }) | null {
  const c = colapsarCargo(cargo);
  return c ? POR_CODIGO.get(c) ?? null : null;
}
