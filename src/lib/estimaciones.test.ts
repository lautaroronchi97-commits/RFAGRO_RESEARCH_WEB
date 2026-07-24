import { describe, it, expect } from "vitest";
import { construirPizarra, type EstimRow } from "./estimaciones";

// Fixtures: docs/auditoria/E2-formulas-fichas.md, ficha 6.2 (caso real BCR/Argentina/trigo, 12/07).
describe("estimaciones.ts — ficha E2 6.2 (campaniaVigente prefiere la campaña CON producción)", () => {
  it("2026/27 solo tiene área (sin producción) — la pizarra muestra 2025/26 (29,5 Mt), no 2026/27 '—'", () => {
    const rows: EstimRow[] = [
      {
        organismo: "BCR", pais: "argentina", grano: "trigo", campania: "2026/27",
        variable: "area", valor: 6.95, unidad: "Mha", fecha_publicacion: "2026-07-08",
        informe: "GEA mensual #196", url: null,
      },
      {
        organismo: "BCR", pais: "argentina", grano: "trigo", campania: "2025/26",
        variable: "produccion", valor: 29.5, unidad: "Mt", fecha_publicacion: "2026-05-13",
        informe: "GEA mensual #194", url: null,
      },
      {
        organismo: "BCR", pais: "argentina", grano: "trigo", campania: "2025/26",
        variable: "produccion", valor: 29.5, unidad: "Mt", fecha_publicacion: "2026-02-11",
        informe: "GEA mensual #191", url: null,
      },
    ];
    const pizarra = construirPizarra(rows);
    expect(pizarra).toHaveLength(1);
    expect(pizarra[0]!.campania).toBe("2025/26");
    expect(pizarra[0]!.produccion).toBe(29.5);
    expect(pizarra[0]!.deltaProd).toBeCloseTo(0, 6); // último vintage sin cambio (29,5 -> 29,5)
    expect(pizarra[0]!.fecha).toBe("2026-05-13"); // el vintage MÁS RECIENTE con producción
  });

  it("delta vs el vintage anterior de la MISMA campaña: 27,7 -> 29,5 da +1,80", () => {
    const rows: EstimRow[] = [
      {
        organismo: "BCR", pais: "argentina", grano: "trigo", campania: "2025/26",
        variable: "produccion", valor: 29.5, unidad: "Mt", fecha_publicacion: "2026-05-13",
        informe: "GEA mensual #194", url: null,
      },
      {
        organismo: "BCR", pais: "argentina", grano: "trigo", campania: "2025/26",
        variable: "produccion", valor: 27.7, unidad: "Mt", fecha_publicacion: "2026-02-11",
        informe: "GEA mensual #191", url: null,
      },
    ];
    const pizarra = construirPizarra(rows);
    expect(pizarra[0]!.deltaProd).toBeCloseTo(1.8, 6);
  });
});
