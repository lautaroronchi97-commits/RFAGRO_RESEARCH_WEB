import { describe, it, expect } from "vitest";
import { calcularFasIndustria, CFG_INDUSTRIA_DEFAULT, type CapacidadIndustriaCfg } from "./capacidad-industria-modelo";

// Fixture real: modelo de referencia de un tercero (parámetros "vigente 04/2026"), columna
// DISPO — docs/sesiones/2026-07-24-c16-capacidad-pago.md §Industria. FOB mercado 1169,8 (aceite)
// / 327,0 (harina); FOB oficial SAGyP 1172,0 (aceite) / 325,0 (harina); pizarra soja 316,5.
const CFG_REF: CapacidadIndustriaCfg = {
  alicuotaDexAceite: 0.225,
  alicuotaDexHarina: 0.225,
  fobbingAceiteUsd: 12.5,
  fobbingHarinaUsd: 9.5,
  rindeAceite: 0.195,
  rindeHarina: 0.712,
  gastosComercialesPct: 0.0336,
  costoIndustrializacionUsd: 24.0,
  margenRiesgoUsd: 0,
};

describe("calcularFasIndustria — reproduce el modelo de referencia (sin cáscara, a propósito)", () => {
  it("con los inputs reales DISPO del modelo de referencia", () => {
    const fas = calcularFasIndustria(1169.8, 1172.0, 327.0, 325.0, 316.5, CFG_REF);
    // El modelo de referencia da 321,1 INCLUYENDO cáscara (7,5 USD/tn, rinde 6%) que acá se omite
    // a propósito (sin posición NCM de FOB oficial propia verificada) — la diferencia esperada es
    // exactamente esa contribución: 321,1 − 7,5 ≈ 313,6.
    expect(fas).not.toBeNull();
    expect(fas as number).toBeCloseTo(313.61, 1);
  });

  it("consistencia aritmética: recalculado a mano da el mismo número", () => {
    const fasAceite = 1169.8 - 12.5 - 1172.0 * 0.225; // 893.6
    const fasHarina = 327.0 - 9.5 - 325.0 * 0.225; // 244.375
    const precioCompuesto = fasAceite * 0.195 + fasHarina * 0.712;
    const gastosComerciales = 0.0336 * 316.5;
    const esperado = precioCompuesto - gastosComerciales - 24.0;
    expect(calcularFasIndustria(1169.8, 1172.0, 327.0, 325.0, 316.5, CFG_REF)).toBeCloseTo(esperado, 2);
  });

  it("margen de riesgo explícito resta al final", () => {
    const sinMargen = calcularFasIndustria(1169.8, 1172.0, 327.0, 325.0, 316.5, CFG_REF)!;
    const conMargen = calcularFasIndustria(1169.8, 1172.0, 327.0, 325.0, 316.5, { ...CFG_REF, margenRiesgoUsd: 10 })!;
    expect(sinMargen - conMargen).toBeCloseTo(10, 6);
  });

  it("sin pizarra: gastos comerciales caen a 0 (no rompe el cálculo)", () => {
    const fas = calcularFasIndustria(1169.8, 1172.0, 327.0, 325.0, null, CFG_REF);
    expect(fas).not.toBeNull();
    expect(fas as number).toBeGreaterThan((calcularFasIndustria(1169.8, 1172.0, 327.0, 325.0, 316.5, CFG_REF) as number));
  });

  it("null si falta cualquier FOB de aceite o harina (no inventa un valor)", () => {
    expect(calcularFasIndustria(null, 1172.0, 327.0, 325.0, 316.5, CFG_REF)).toBeNull();
    expect(calcularFasIndustria(1169.8, null, 327.0, 325.0, 316.5, CFG_REF)).toBeNull();
    expect(calcularFasIndustria(1169.8, 1172.0, null, 325.0, 316.5, CFG_REF)).toBeNull();
    expect(calcularFasIndustria(1169.8, 1172.0, 327.0, null, 316.5, CFG_REF)).toBeNull();
  });
});

describe("CFG_INDUSTRIA_DEFAULT", () => {
  it("rindes suman lo esperado (aceite+harina, sin cáscara/desecho) — 90,7%", () => {
    expect(CFG_INDUSTRIA_DEFAULT.rindeAceite + CFG_INDUSTRIA_DEFAULT.rindeHarina).toBeCloseTo(0.907, 6);
  });
  it("retenciones aceite/harina = 22,5% (docs/negocio/05, vigente 18/07/2026)", () => {
    expect(CFG_INDUSTRIA_DEFAULT.alicuotaDexAceite).toBe(0.225);
    expect(CFG_INDUSTRIA_DEFAULT.alicuotaDexHarina).toBe(0.225);
  });
});
