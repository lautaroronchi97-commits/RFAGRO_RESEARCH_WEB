/**
 * Catálogo de productos de `negociado.ts`, en un módulo aparte SIN "server-only":
 * negociado.ts arrastra sbSelectAll/supabase (server-only de verdad); estas dos
 * constantes son solo datos y las necesita también el filtro de producto del
 * cliente (negociado-tabla.tsx), que no puede importar nada server-only.
 */

/** Orden y nombre de display por producto (codigo_interno). */
export const PRODUCTOS_NEGOCIADO = ["SBS", "MAIZE", "WHEAT", "SFSEED", "SORGHUM", "MALT", "BARLEY"] as const;
export const DISPLAY_NEGOCIADO: Record<string, string> = {
  SBS: "Soja",
  MAIZE: "Maíz",
  WHEAT: "Trigo",
  SFSEED: "Girasol",
  SORGHUM: "Sorgo",
  MALT: "Cebada cervecera",
  BARLEY: "Cebada forrajera",
};
