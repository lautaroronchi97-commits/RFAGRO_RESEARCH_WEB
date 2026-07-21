import { describe, it, expect } from "vitest";
import { factor, precioDiferido, precioConPago, tasaImplicita, diasDesdeTasa } from "./diferido";

// Fixtures: docs/auditoria/E2-formulas-fichas.md, ficha 1.4 (pizarra soja 17/07, negocio 21/07).
describe("diferido.ts — ficha E2 1.4", () => {
  const BASE = 495_000; // pizarra soja $ 17/07
  const TASA = 30; // %
  const DIAS = 31; // excedente sobre el pago estándar (28/07 → 28/08)

  it("precioDiferido: interés simple base 365", () => {
    expect(precioDiferido(BASE, TASA, DIAS)).toBeCloseTo(507_612.3287671233, 6);
  });

  it("las inversas cierran exacto contra el fixture", () => {
    const diferido = precioDiferido(BASE, TASA, DIAS);
    expect(precioConPago(diferido, TASA, DIAS)).toBeCloseTo(495_000, 6);
    expect(tasaImplicita(BASE, diferido, DIAS)).toBeCloseTo(30, 6);
    expect(diasDesdeTasa(BASE, diferido, TASA)).toBeCloseTo(31, 6);
  });

  it("borde: días=0 → diferido = base (factor = 1)", () => {
    expect(factor(TASA, 0)).toBe(1);
    expect(precioDiferido(BASE, TASA, 0)).toBe(BASE);
  });

  it("borde: conPago<=0 o dias<=0 en tasaImplicita/diasDesdeTasa → NaN (guard)", () => {
    expect(tasaImplicita(0, 507_612, DIAS)).toBeNaN();
    expect(tasaImplicita(BASE, 507_612, 0)).toBeNaN();
    expect(diasDesdeTasa(0, 507_612, TASA)).toBeNaN();
    expect(diasDesdeTasa(BASE, 507_612, 0)).toBeNaN();
  });
});
