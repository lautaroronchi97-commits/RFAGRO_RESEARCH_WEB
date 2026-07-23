/**
 * Claves canónicas del módulo de camiones en puerto (C5 del backlog maestro).
 *
 * Zonas: los 4 nombres EXACTOS del reporte de SAGyP "Entrada diaria de camiones y vagones a
 * puertos, fábricas y molinos" (negocio/09, verificados en HTML y PDFs 2021→2026). Productos:
 * códigos `codigo_interno` YA usados en el resto de la web (config.ts de line-up / compras) —
 * así la señal barcos-vs-camiones no necesita una tabla de mapeo aparte.
 */

export type ZonaCamiones = "ROSARIO_ALEDANOS" | "DARSENA_BSAS_ER" | "NECOCHEA" | "BAHIA_BLANCA";

export const ZONA_CLAVES: ZonaCamiones[] = [
  "ROSARIO_ALEDANOS",
  "DARSENA_BSAS_ER",
  "NECOCHEA",
  "BAHIA_BLANCA",
];

export const ZONA_DISPLAY: Record<ZonaCamiones, string> = {
  ROSARIO_ALEDANOS: "Rosario y aledaños",
  DARSENA_BSAS_ER: "Dársena Bs As - E. Ríos",
  NECOCHEA: "Puerto Necochea (Quequén)",
  BAHIA_BLANCA: "Puerto B. Blanca",
};

export type ProductoCamiones = "SBS" | "MAIZE" | "WHEAT" | "BARLEY" | "SORGHUM" | "SFSEED";

/** Orden de exposición (mismo criterio que negociado.ts: soja/maíz/trigo primero). */
export const PRODUCTO_CLAVES: ProductoCamiones[] = ["SBS", "MAIZE", "WHEAT", "BARLEY", "SORGHUM", "SFSEED"];

export const PRODUCTO_DISPLAY: Record<ProductoCamiones, string> = {
  SBS: "Soja",
  MAIZE: "Maíz",
  WHEAT: "Trigo",
  BARLEY: "Cebada",
  SORGHUM: "Sorgo",
  SFSEED: "Girasol",
};

/** Panel del HTML/PDF de SAGyP (label crudo, en español) → código canónico. */
export const PRODUCTO_LABEL_SAGYP: Record<string, ProductoCamiones> = {
  soja: "SBS",
  maiz: "MAIZE",
  maíz: "MAIZE",
  trigo: "WHEAT",
  cebada: "BARLEY",
  sorgo: "SORGHUM",
  girasol: "SFSEED",
};

/** Zonas de v1 para la señal barcos-vs-camiones (negocio/09 FASE 3: Necochea/Dársena quedan fuera). */
export const ZONAS_SENAL: { clave: ZonaCamiones; display: string; lineupZona: "GRAN_ROSARIO" | "BAHIA_BLANCA" }[] = [
  { clave: "ROSARIO_ALEDANOS", display: "Gran Rosario", lineupZona: "GRAN_ROSARIO" },
  { clave: "BAHIA_BLANCA", display: "Bahía Blanca", lineupZona: "BAHIA_BLANCA" },
];
