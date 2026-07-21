import { describe, it, expect } from "vitest";
import { tasaDirecta, tnaUSD, spread, teaUSD } from "./arbitraje";

// Fixtures: docs/auditoria/E2-formulas-fichas.md, ficha 1.7 (+ actualización FASE 2, vto real).
describe("arbitraje.ts — ficha E2 1.7", () => {
  const CERCANA = 336.96; // pizarra soja CAC 17/07
  const LEJANA = 349.3; // SOJ.ROS/NOV26, cierre 20/07

  it("tasaDirecta: fracción (el caller la multiplica x100 para mostrar %)", () => {
    expect(tasaDirecta(LEJANA, CERCANA) * 100).toBeCloseTo(3.662155745489093, 9);
  });

  it("con el vto real (122 días, actualización FASE 2)", () => {
    expect(tnaUSD(LEJANA, CERCANA, 122)).toBeCloseTo(10.956449566422286, 9);
    expect(teaUSD(LEJANA, CERCANA, 122)).toBeCloseTo(11.360884999291576, 9);
  });

  it("con el picker fin-de-mes (132 días, fixture original de la ficha)", () => {
    expect(tnaUSD(LEJANA, CERCANA, 132)).toBeCloseTo(10.126415508359992, 9);
    expect(teaUSD(LEJANA, CERCANA, 132)).toBeCloseTo(10.456764980671252, 9);
  });

  it("spread = futuro - pizarra", () => {
    expect(spread(LEJANA, CERCANA)).toBeCloseTo(12.34, 6);
  });

  it("bordes: pizarra<=0 o días<=0 → NaN (guard `!(x>0)` atrapa NaN también)", () => {
    expect(tasaDirecta(LEJANA, 0)).toBeNaN();
    expect(tasaDirecta(LEJANA, NaN)).toBeNaN();
    expect(tnaUSD(LEJANA, CERCANA, 0)).toBeNaN();
    expect(teaUSD(LEJANA, CERCANA, -5)).toBeNaN();
  });
});
