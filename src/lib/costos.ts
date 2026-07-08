/**
 * Costos de operar en Cocos por instrumento. Comisiones REALES del tarifario
 * (columna "Comisión web/app", persona humana y jurídica). Algunas comisiones
 * son % TNA (dependen del plazo): letras (humana), cauciones y cheque diferido.
 *
 *   comisión% efectiva = tna ? pct × días/365 : pct
 *   comisión $ = monto × comisión%_efectiva
 *   derechos $ = monto × derechos%              (derechos de mercado del instrumento)
 *   IVA $      = (comisión + derechos) × IVA%
 *   costo total = comisión + derechos + IVA · costo % = total / monto
 *
 * Los DERECHOS DE MERCADO no están en el tarifario de Cocos (los cobran
 * BYMA/A3/MAE): vienen como referencia editable.
 */

export type Com = { pct: number; tna: boolean };

export type Arancel = {
  id: string;
  nombre: string;
  humana: Com;
  juridica: Com;
  derechosPct: number; // referencia editable (BYMA/A3/MAE)
};

// Comisión web/app del tarifario de Cocos (humana / jurídica).
export const ARANCELES: Arancel[] = [
  { id: "acciones", nombre: "Acciones $", humana: { pct: 0.45, tna: false }, juridica: { pct: 0.4, tna: false }, derechosPct: 0.05 },
  { id: "cedears", nombre: "CEDEARs $", humana: { pct: 0.45, tna: false }, juridica: { pct: 0.25, tna: false }, derechosPct: 0.05 },
  { id: "tpub", nombre: "Títulos públicos $", humana: { pct: 0.45, tna: false }, juridica: { pct: 0.4, tna: false }, derechosPct: 0.01 },
  { id: "tpriv", nombre: "Títulos privados $ (ON/FF/VCP)", humana: { pct: 0.45, tna: false }, juridica: { pct: 0.25, tna: false }, derechosPct: 0.01 },
  { id: "letras", nombre: "Letras $", humana: { pct: 1.5, tna: true }, juridica: { pct: 0.25, tna: false }, derechosPct: 0.01 },
  { id: "usd", nombre: "Activos liquidación USD", humana: { pct: 0.45, tna: false }, juridica: { pct: 0.25, tna: false }, derechosPct: 0.01 },
  { id: "opciones", nombre: "Opciones", humana: { pct: 0.45, tna: false }, juridica: { pct: 1.0, tna: false }, derechosPct: 0.05 },
  { id: "descubierto", nombre: "Operaciones en descubierto", humana: { pct: 0.45, tna: false }, juridica: { pct: 1.0, tna: false }, derechosPct: 0.05 },
  { id: "futuros", nombre: "Futuros (A3)", humana: { pct: 0.1, tna: false }, juridica: { pct: 0.2, tna: false }, derechosPct: 0.02 },
  { id: "cauc_coloc", nombre: "Caución colocadora", humana: { pct: 2.0, tna: true }, juridica: { pct: 5.0, tna: true }, derechosPct: 0.01 },
  { id: "cauc_tom", nombre: "Caución tomadora", humana: { pct: 10.0, tna: true }, juridica: { pct: 10.0, tna: true }, derechosPct: 0.01 },
  { id: "cheque", nombre: "Cheque pago diferido", humana: { pct: 1.0, tna: true }, juridica: { pct: 1.0, tna: true }, derechosPct: 0.01 },
];

export type Persona = "humana" | "juridica";

/** Comisión % efectiva: si es TNA, se prorratea por el plazo en días. */
export function comEfectivaPct(com: Com, dias: number): number {
  return com.tna ? com.pct * (dias / 365) : com.pct;
}

export type CostoFila = {
  comisionPct: number; // efectiva
  esTna: boolean;
  comision: number;
  derechos: number;
  iva: number;
  total: number;
  pct: number;
};

export function costoFila(
  monto: number,
  com: Com,
  derechosPct: number,
  ivaPct: number,
  dias: number,
): CostoFila {
  const comisionPct = comEfectivaPct(com, dias);
  const comision = (monto * comisionPct) / 100;
  const derechos = (monto * derechosPct) / 100;
  const iva = ((comision + derechos) * ivaPct) / 100;
  const total = comision + derechos + iva;
  const pct = monto > 0 ? (total / monto) * 100 : NaN;
  return { comisionPct, esTna: com.tna, comision, derechos, iva, total, pct };
}
