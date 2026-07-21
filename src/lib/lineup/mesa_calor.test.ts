import { describe, it, expect } from "vitest";
import { indiceCalor, equivalentePoroto, clasificarBanda, clasificarDireccion, accionSugerida } from "./mesa_calor";

// Fixtures: docs/auditoria/E2-formulas-fichas.md, ficha 5.4.
describe("mesa_calor.ts — ficha E2 5.4", () => {
  it("indiceCalor: pesos 0,35/0,30/0,35, farmer invertido (100 - pctlAvance)", () => {
    expect(indiceCalor(80, 60, 30)).toBeCloseTo(70.5, 9); // 0.35*80 + 0.30*60 + 0.35*(100-30)
  });

  it("indiceCalor: sin farmer, renormaliza sobre los 2 pesos presentes", () => {
    expect(indiceCalor(80, 60, null)).toBeCloseTo(70.76923076923077, 9); // (0.35*80+0.30*60)/0.65
  });

  it("indiceCalor: sin ningún componente → null", () => {
    expect(indiceCalor(null, null, null)).toBeNull();
  });

  it("equivalentePoroto: harina/rinde + aceite/rinde", () => {
    expect(equivalentePoroto(745_000, 190_000)).toBeCloseTo(2_000_000, 6);
  });

  it("bordes de banda exactos (80/79,99 · 20/19,99)", () => {
    expect(clasificarBanda(80)).toBe("CALIENTE");
    expect(clasificarBanda(79.99)).toBe("FIRME");
    expect(clasificarBanda(60)).toBe("FIRME");
    expect(clasificarBanda(40)).toBe("NEUTRO");
    expect(clasificarBanda(20)).toBe("PESADO");
    expect(clasificarBanda(19.99)).toBe("MUY PESADO");
    expect(clasificarBanda(null)).toBe("SIN HISTORIA");
  });

  it("clasificarDireccion respeta el umbral de 32.500 t (media Panamax)", () => {
    expect(clasificarDireccion(32_500)).toBe("ABRIENDOSE");
    expect(clasificarDireccion(32_499)).toBe("ESTABLE");
    expect(clasificarDireccion(-32_500)).toBe("CERRANDOSE");
    expect(clasificarDireccion(null)).toBe("SIN DATO");
  });

  it("accionSugerida: matriz banda x dirección", () => {
    expect(accionSugerida("CALIENTE", "CERRANDOSE")).toEqual(["VENDER YA", "se están cubriendo, el premio se desinfla"]);
    expect(accionSugerida("PESADO", "CERRANDOSE")).toEqual(["COMPRAR BARATO", "productor presionado"]);
    expect(accionSugerida("SIN HISTORIA", "ESTABLE")).toEqual(["—", "sin datos suficientes"]);
  });
});
