import { describe, it, expect } from "vitest";
import { porcentaje, precioDesdePct } from "./porcentaje";

// Fixtures: docs/auditoria/E2-formulas-fichas.md, ficha 1.3 (cierres 20/07) + FASE 2 (aforo relativo).
describe("porcentaje.ts — ficha E2 1.3", () => {
  const NEGOCIO = 349.3; // SOJ.ROS/NOV26
  const REF = 190; // MAI.ROS/SEP26

  it("lleno = negocio/ref x100", () => {
    expect(porcentaje(NEGOCIO, REF)).toBeCloseTo(183.8421052631579, 9);
  });

  it("inversa exacta", () => {
    const lleno = porcentaje(NEGOCIO, REF);
    expect(precioDesdePct(lleno, REF)).toBeCloseTo(349.3, 6);
  });

  it("aforo relativo (FASE 2): lleno x (1 - aforo/100)", () => {
    const lleno = porcentaje(NEGOCIO, REF);
    const aCliente = lleno * (1 - 2 / 100);
    expect(aCliente).toBeCloseTo(180.16526315789474, 9);
  });

  it("borde: ref<=0 → NaN", () => {
    expect(porcentaje(NEGOCIO, 0)).toBeNaN();
    expect(porcentaje(NEGOCIO, -10)).toBeNaN();
  });
});
