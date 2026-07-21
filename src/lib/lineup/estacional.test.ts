import { describe, it, expect } from "vitest";
import { percentilEnSerie, percentilEstacional, fechasEstacionales, type SerieRow } from "./estacional";

// Bordes documentados en la ficha E2 5.3: "1 campaña → null; serie vacía → null;
// empates cuentan <= (percentil débil)". Los valores reales (MAIZE 39,4/39,4 etc.)
// salen de la base viva y no son reproducibles como fixture portable — se testean acá
// los bordes y la mecánica del percentil con datos sintéticos.
describe("lineup/estacional.ts — bordes ficha E2 5.3", () => {
  it("percentilEnSerie: rango débil, 100 x (#valores <= actual) / total", () => {
    expect(percentilEnSerie([10, 20, 30, 40], 30)).toBeCloseTo(75, 9);
    expect(percentilEnSerie([10, 20, 30, 40], 5)).toBeCloseTo(0, 9);
    expect(percentilEnSerie([10, 20, 30, 40], 100)).toBeCloseTo(100, 9);
  });

  it("percentilEnSerie: empates cuentan como <= (percentil débil)", () => {
    expect(percentilEnSerie([10, 10, 10, 20], 10)).toBeCloseTo(75, 9);
  });

  it("percentilEnSerie: serie vacía → NaN", () => {
    expect(percentilEnSerie([], 10)).toBeNaN();
  });

  it("percentilEstacional: valorActual null → null", () => {
    expect(percentilEstacional([], "MAIZE", new Date(Date.UTC(2026, 6, 20)), null)).toBeNull();
  });

  it("percentilEstacional: serie vacía → null", () => {
    expect(percentilEstacional([], "MAIZE", new Date(Date.UTC(2026, 6, 20)), 50)).toBeNull();
  });

  it("percentilEstacional: 1 sola campaña con dato (< MIN_CAMPANAS=2) → null", () => {
    const fechaActual = new Date(Date.UTC(2026, 6, 20)); // 20/07/2026
    const ventanas = fechasEstacionales("MAIZE", fechaActual);
    // Un solo punto dentro de la ventana de la campaña más reciente.
    const serie: SerieRow[] = [{ fecha: ventanas[0].desde, cod: "MAIZE", valor: 42 }];
    expect(percentilEstacional(serie, "MAIZE", fechaActual, 50)).toBeNull();
  });

  it("percentilEstacional: >=2 campañas con dato → devuelve el percentil", () => {
    const fechaActual = new Date(Date.UTC(2026, 6, 20));
    const ventanas = fechasEstacionales("MAIZE", fechaActual);
    const serie: SerieRow[] = [
      { fecha: ventanas[0].desde, cod: "MAIZE", valor: 10 },
      { fecha: ventanas[1].desde, cod: "MAIZE", valor: 20 },
      { fecha: ventanas[2].desde, cod: "MAIZE", valor: 30 },
    ];
    const pctl = percentilEstacional(serie, "MAIZE", fechaActual, 25);
    expect(pctl).not.toBeNull();
    expect(pctl).toBeCloseTo((100 * 2) / 3, 9); // 10 y 20 son <= 25, de los 3 valores
  });

  it("fechasEstacionales: ventana de +-15 días alrededor de la fecha-equivalente, más reciente primero", () => {
    const fechaActual = new Date(Date.UTC(2026, 6, 20));
    const ventanas = fechasEstacionales("MAIZE", fechaActual, 15, 3);
    expect(ventanas).toHaveLength(3);
    for (const v of ventanas) {
      const anchoMs = v.hasta.getTime() - v.desde.getTime();
      expect(Math.round(anchoMs / 86_400_000)).toBe(30); // 15 antes + 15 después
    }
  });
});
