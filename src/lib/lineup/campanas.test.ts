import { describe, it, expect } from "vitest";
import { campaniaIniYear, campanaLabel } from "./campanas";

/**
 * Ficha E2 5.1: 612/612 checks idénticos entre CAMPANA_CONFIG (TS) y la función SQL
 * campana_ini_year (17 códigos x 12 meses x días 1/15/28). Este test congela el
 * comportamiento documentado (bordes por producto) como regresión — no reemplaza el
 * cotejo contra la SQL viva (auditoría E4, hallazgo #3), que se corre a mano.
 */
describe("lineup/campanas.ts — ficha E2 5.1 (espejo de la función SQL campana_ini_year)", () => {
  it("SBS/soja: arranca 1-abr — 15-mar cae en la campaña anterior, 1-abr en la nueva", () => {
    expect(campaniaIniYear("SBS", new Date(Date.UTC(2026, 2, 15)))).toBe(2025);
    expect(campaniaIniYear("SBS", new Date(Date.UTC(2026, 3, 1)))).toBe(2026);
  });

  it("MAIZE: arranca 1-mar", () => {
    expect(campaniaIniYear("MAIZE", new Date(Date.UTC(2026, 1, 28)))).toBe(2025);
    expect(campaniaIniYear("MAIZE", new Date(Date.UTC(2026, 2, 1)))).toBe(2026);
  });

  it("WHEAT: arranca 1-dic (cruza el año)", () => {
    expect(campaniaIniYear("WHEAT", new Date(Date.UTC(2026, 10, 30)))).toBe(2025);
    expect(campaniaIniYear("WHEAT", new Date(Date.UTC(2026, 11, 1)))).toBe(2026);
  });

  it("SFSEED (girasol): arranca 1-feb", () => {
    expect(campaniaIniYear("SFSEED", new Date(Date.UTC(2026, 0, 15)))).toBe(2025);
    expect(campaniaIniYear("SFSEED", new Date(Date.UTC(2026, 1, 1)))).toBe(2026);
  });

  it("producto sin config conocido → default enero (año calendario)", () => {
    expect(campaniaIniYear("XYZ", new Date(Date.UTC(2026, 5, 15)))).toBe(2026);
  });

  it("SOJA_CRUSH (sintético, solo TS): mismo grupo que SBS — auditoría E4 lo agregó también a la SQL", () => {
    expect(campaniaIniYear("SOJA_CRUSH", new Date(Date.UTC(2026, 2, 15)))).toBe(2025);
    expect(campaniaIniYear("SOJA_CRUSH", new Date(Date.UTC(2026, 3, 1)))).toBe(2026);
  });

  it("campanaLabel formatea el año de inicio como 'YYYY/YY'", () => {
    expect(campanaLabel(2025)).toBe("2025/26");
    expect(campanaLabel(2019)).toBe("2019/20");
  });
});
