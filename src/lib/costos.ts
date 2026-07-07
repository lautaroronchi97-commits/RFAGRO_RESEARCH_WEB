/**
 * Costos de operar en Cocos por instrumento: comisión del ALYC + derechos de
 * mercado (BYMA / A3-MATBA-ROFEX / MAE) + IVA sobre ambos.
 *
 *   comisión $ = monto × comisión%
 *   derechos $ = monto × derechos%
 *   IVA $      = (comisión + derechos) × IVA%
 *   costo total = comisión + derechos + IVA
 *   costo %     = costo total / monto
 *
 * IMPORTANTE: los porcentajes por defecto son de REFERENCIA (el tarifario de
 * Cocos está detrás de Cloudflare y no se puede leer automáticamente). Son
 * EDITABLES: cargá los reales del tarifario web/app.
 */

export type Arancel = {
  id: string;
  nombre: string;
  comisionPct: number; // comisión Cocos (canal web/app)
  derechosPct: number; // derechos de mercado del instrumento
};

// Valores de REFERENCIA — ajustar con el tarifario real de Cocos (web/app).
export const ARANCELES_REF: Arancel[] = [
  { id: "acciones", nombre: "Acciones (BYMA)", comisionPct: 0.5, derechosPct: 0.05 },
  { id: "cedears", nombre: "CEDEARs", comisionPct: 0.5, derechosPct: 0.05 },
  { id: "bonos", nombre: "Bonos / renta fija", comisionPct: 0.2, derechosPct: 0.01 },
  { id: "letras", nombre: "Letras / LECAPs", comisionPct: 0.15, derechosPct: 0.01 },
  { id: "fut_dolar", nombre: "Futuros dólar (A3)", comisionPct: 0.2, derechosPct: 0.02 },
  { id: "fut_granos", nombre: "Futuros granos (A3)", comisionPct: 0.2, derechosPct: 0.02 },
  { id: "opciones", nombre: "Opciones", comisionPct: 1.0, derechosPct: 0.05 },
  { id: "fci", nombre: "FCI", comisionPct: 0, derechosPct: 0 },
  { id: "caucion", nombre: "Caución colocadora", comisionPct: 0.1, derechosPct: 0.01 },
];

export type CostoFila = {
  comision: number;
  derechos: number;
  iva: number;
  total: number;
  pct: number;
};

export function costoFila(
  monto: number,
  comisionPct: number,
  derechosPct: number,
  ivaPct: number,
): CostoFila {
  const comision = (monto * comisionPct) / 100;
  const derechos = (monto * derechosPct) / 100;
  const iva = ((comision + derechos) * ivaPct) / 100;
  const total = comision + derechos + iva;
  const pct = monto > 0 ? (total / monto) * 100 : NaN;
  return { comision, derechos, iva, total, pct };
}
