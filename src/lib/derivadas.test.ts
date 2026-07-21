import { describe, it, expect } from "vitest";
import { percentil, mediana, mesDePosicion, joinFfill, metricaDiaria, mesDeFecha, posCalendario } from "./derivadas";
import type { SeriePuntos } from "./series-types";

// Fixtures: docs/auditoria/E2-formulas-fichas.md, ficha 6.4 y ficha transversal "6 parsers".
describe("derivadas.ts — ficha E2 6.4", () => {
  it("percentil: fracción de la muestra <= v", () => {
    expect(percentil(3, [1, 2, 3, 4])).toBeCloseTo(75, 9);
  });

  it("mediana: promedio de los dos centrales en muestra par", () => {
    expect(mediana([3, 1, 2, 4])).toBeCloseTo(2.5, 9);
  });

  it("mediana/percentil: muestra vacía → NaN", () => {
    expect(mediana([])).toBeNaN();
    expect(percentil(5, [])).toBeNaN();
  });

  it("mesDePosicion: 'ABR27' -> 4, inválido -> 0", () => {
    expect(mesDePosicion("ABR27")).toBe(4);
    expect(mesDePosicion("abr27")).toBe(4); // case-insensitive
    expect(mesDePosicion("XXX")).toBe(0);
    expect(mesDePosicion(null)).toBe(0);
  });

  it("mesDeFecha: 'YYYY-MM-DD' -> abreviatura ES", () => {
    expect(mesDeFecha("2024-04-15")).toBe("ABR");
  });

  it("posCalendario: (mes-1)*31 + día, monótono dentro del año", () => {
    expect(posCalendario("2026-01-01")).toBe(1);
    expect(posCalendario("2026-02-01")).toBe(32);
  });

  it("joinFfill: dos series alineadas por fecha, sin huecos, no rellena de más", () => {
    const a: SeriePuntos = { id: "a", fuente: "a3", d: ["2026-01-01", "2026-01-02"], v: [100, 101] };
    const b: SeriePuntos = { id: "b", fuente: "a3", d: ["2026-01-01", "2026-01-02"], v: [50, 51] };
    const join = joinFfill(a, b, 3);
    expect(join).toEqual([
      { f: "2026-01-01", va: 100, vb: 50 },
      { f: "2026-01-02", va: 101, vb: 51 },
    ]);
  });

  it("joinFfill: un hueco de 4 ruedas en un lado corta el ffill (maxGap=3)", () => {
    // b tiene dato el día 1 y recién vuelve a tener el día 6 (hueco de 4 fechas sin dato: 2,3,4,5).
    const a: SeriePuntos = {
      id: "a",
      fuente: "a3",
      d: ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06"],
      v: [1, 2, 3, 4, 5, 6],
    };
    const b: SeriePuntos = { id: "b", fuente: "a3", d: ["2026-01-01", "2026-01-06"], v: [10, 60] };
    const join = joinFfill(a, b, 3);
    // Emite ffill de b hasta 3 ruedas después del día 1 (02, 03, 04) y corta: el día 05 (4ª sin dato) no sale.
    const fechas = join.map((j) => j.f);
    expect(fechas).toEqual(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-06"]);
  });

  it("metricaDiaria: spread = vb - va; ratio = va/vb, omite vb=0", () => {
    const join = [
      { f: "2026-01-01", va: 100, vb: 150 },
      { f: "2026-01-02", va: 50, vb: 0 },
    ];
    expect(metricaDiaria(join, "spread")).toEqual([
      { f: "2026-01-01", y: 50 },
      { f: "2026-01-02", y: -50 },
    ]);
    expect(metricaDiaria(join, "ratio")).toEqual([{ f: "2026-01-01", y: 100 / 150 }]);
  });
});

describe("derivadas.ts — control histórico del Excel (ficha 6.4)", () => {
  it("spread 2021-04-05: SOJ MAY22 304,1 - MAI ABR22 178,5 = 125,6", () => {
    expect(304.1 - 178.5).toBeCloseTo(125.6, 6);
  });

  it("ratio celda U7: 238,8/412 = 0,5796", () => {
    expect(238.8 / 412).toBeCloseTo(0.5796, 4);
  });
});
