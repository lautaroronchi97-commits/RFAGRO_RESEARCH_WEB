import { describe, it, expect } from "vitest";
import { clasificarStrict, clasificar, esRuido, esExcluido, esRelevante, claveTitulo, nombreCategoria } from "./noticias-clasificar";

// Fixtures: docs/auditoria/E2-formulas-fichas.md, ficha 6.5 (títulos reales del 20/07/2026).
describe("noticias-clasificar.ts — ficha E2 6.5", () => {
  it("clasifica un titular de mercados por cifra en USD", () => {
    const t = "Mercado internacional: la soja cruzó los US$450 por tonelada por un cóctel de factores alcistas";
    expect(clasificarStrict(t)).toBe("mercados");
  });

  it("clasifica un titular de clima", () => {
    const t = "Cómo están los suelos y qué esperar de las lluvias y el Súper Niño";
    expect(clasificarStrict(t)).toBe("clima");
  });

  it("clasifica un titular de informes oficiales", () => {
    const t = "USDA Crop Progress: avance de siembra en EEUU";
    expect(clasificarStrict(t)).toBe("informes");
  });

  it("gate: nota de ganadería/interés humano sin señal de granos → no relevante, excluida", () => {
    const t = "La Yoli, la vaca más famosa de los Criollos, cumple años";
    expect(esExcluido(t)).toBe(true);
    expect(esRelevante(t)).toBe(false);
  });

  it("clasificar() cae al default de la fuente cuando ninguna palabra matchea", () => {
    expect(clasificar("Un título genérico sin señal temática clara", "logistica")).toBe("logistica");
  });

  it("clasificar() sin default cae al fallback global (mercados)", () => {
    expect(clasificar("Un título genérico sin señal temática clara")).toBe("mercados");
  });

  it("esRuido descarta páginas de servicio/widget", () => {
    expect(esRuido("¿A cuánto cotiza el dólar hoy?")).toBe(true);
  });

  it("claveTitulo normaliza para dedup (sin acentos, minúsculas, colapsa espacios)", () => {
    expect(claveTitulo("La Soja Sube")).toBe(claveTitulo("la  soja   sube"));
  });

  it("nombreCategoria resuelve id -> nombre legible; id desconocido devuelve el id tal cual", () => {
    expect(nombreCategoria("mercados")).not.toBe("mercados"); // tiene nombre propio
    expect(nombreCategoria("no-existe")).toBe("no-existe");
  });
});
