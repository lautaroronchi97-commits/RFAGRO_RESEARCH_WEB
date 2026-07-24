import { describe, it, expect } from "vitest";
import { calcularFasTeorico, diferencialVsPizarra, cfgDefault, cfgSembrada, type CapacidadModeloCfg } from "./capacidad-modelo";

describe("calcularFasTeorico", () => {
  const cfg: CapacidadModeloCfg = {
    alicuotaDex: 0.1,
    reintegro: 0,
    gastosPortuariosUsd: 5,
    gastosComercialesPct: 0.02,
    margenRiesgoUsd: 0,
  };

  it("FOB × (1 − alícuota − %comerciales) − gastos portuarios", () => {
    // 200 × (1 − 0.10 − 0.02) = 200 × 0.88 = 176; 176 − 5 = 171
    expect(calcularFasTeorico(200, cfg)).toBeCloseTo(171, 6);
  });

  it("suma el reintegro cuando está seteado", () => {
    expect(calcularFasTeorico(200, { ...cfg, reintegro: 0.05 })).toBeCloseTo(181, 6);
  });

  it("resta el margen de riesgo explícito", () => {
    expect(calcularFasTeorico(200, { ...cfg, margenRiesgoUsd: 10 })).toBeCloseTo(161, 6);
  });

  it("con los valores reales de hoy (trigo, FOB oficial 237, DEX 5,5%)", () => {
    // docs/sesiones/2026-07-24-c16-capacidad-pago.md: FOB oficial trigo 23/07/2026 = 237.
    const cfgTrigo: CapacidadModeloCfg = {
      alicuotaDex: 0.055,
      reintegro: 0,
      gastosPortuariosUsd: 7.3,
      gastosComercialesPct: 7.9 / 235, // sembrado del propio a/b/c de BCR (ficha del test de parseBcr)
      margenRiesgoUsd: 0,
    };
    const fas = calcularFasTeorico(237, cfgTrigo);
    expect(fas).not.toBeNull();
    // Debería quedar cerca del FAS teórico de BCR (206,86) — misma metodología, FOB apenas distinto.
    expect(fas as number).toBeGreaterThan(200);
    expect(fas as number).toBeLessThan(215);
  });

  it("null si no hay FOB oficial (no inventa un valor)", () => {
    expect(calcularFasTeorico(null, cfg)).toBeNull();
  });

  it("null si el FOB es 0 o negativo", () => {
    expect(calcularFasTeorico(0, cfg)).toBeNull();
    expect(calcularFasTeorico(-10, cfg)).toBeNull();
  });
});

describe("diferencialVsPizarra", () => {
  it("positivo: la pizarra paga por encima de lo teórico (sobrepagado)", () => {
    const d = diferencialVsPizarra(180, 171);
    expect(d.usd).toBeCloseTo(9, 6);
    expect(d.pct).toBeCloseTo(5.26, 2);
  });

  it("negativo: la pizarra paga por debajo de lo teórico (subpagado)", () => {
    const d = diferencialVsPizarra(160, 171);
    expect(d.usd).toBeCloseTo(-11, 6);
    expect(d.pct).toBeCloseTo(-6.43, 2);
  });

  it("null si falta cualquiera de los dos valores", () => {
    expect(diferencialVsPizarra(null, 171)).toEqual({ usd: null, pct: null });
    expect(diferencialVsPizarra(180, null)).toEqual({ usd: null, pct: null });
  });
});

describe("cfgDefault", () => {
  it("alícuotas vigentes al 18/07/2026 (docs/negocio/05)", () => {
    expect(cfgDefault("SOJ").alicuotaDex).toBe(0.24);
    expect(cfgDefault("MAI").alicuotaDex).toBe(0.085);
    expect(cfgDefault("TRI").alicuotaDex).toBe(0.055);
    expect(cfgDefault("SOR").alicuotaDex).toBe(0.085);
    expect(cfgDefault("GIR").alicuotaDex).toBe(0.045);
  });

  it("reintegro 0 por defecto (sin reintegro vigente para grano sin procesar)", () => {
    expect(cfgDefault("SOJ").reintegro).toBe(0);
  });

  it("grano desconocido: alícuota 0, no inventa un default arbitrario", () => {
    expect(cfgDefault("XXX").alicuotaDex).toBe(0);
  });
});

describe("cfgSembrada — siembra desde los b)/c) de BCR", () => {
  it("gastosComercialesPct queda en FRACCIÓN (bug real: quedaba en unidades de USD/tn)", () => {
    // Trigo real 23/07/2026 (fixture de capacidad-bcr-parse.test.ts): FOB 235, gastosComerc 7,9.
    const cfg = cfgSembrada("TRI", { fob: 235, gastosPuertos: 7.3, gastosComerc: 7.9 });
    expect(cfg.gastosComercialesPct).toBeCloseTo(7.9 / 235, 4); // ≈ 0,0336 (3,36%), NUNCA 3.36
    expect(cfg.gastosComercialesPct).toBeLessThan(1); // guard: nunca > 100% del FOB
    expect(cfg.gastosPortuariosUsd).toBe(7.3);
  });

  it("con esos supuestos, el FAS calculado da un número plausible (no negativo ni absurdo)", () => {
    const cfg = cfgSembrada("TRI", { fob: 235, gastosPuertos: 7.3, gastosComerc: 7.9 });
    const fasCfg = { ...cfg, alicuotaDex: 0.055 };
    const fas = calcularFasTeorico(237, fasCfg);
    expect(fas).not.toBeNull();
    expect(fas as number).toBeGreaterThan(150);
    expect(fas as number).toBeLessThan(250);
  });

  it("sin fila de BCR: cae al fallback fijo", () => {
    expect(cfgSembrada("TRI", undefined)).toEqual(cfgDefault("TRI"));
  });

  it("FOB de BCR en 0 o null: cae al fallback de %comerciales (evita división por cero)", () => {
    const cfg = cfgSembrada("TRI", { fob: 0, gastosPuertos: 7.3, gastosComerc: 7.9 });
    expect(cfg.gastosComercialesPct).toBe(cfgDefault("TRI").gastosComercialesPct);
    expect(cfg.gastosPortuariosUsd).toBe(7.3); // esto sí se pudo sembrar
  });
});
