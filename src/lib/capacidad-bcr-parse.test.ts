import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBcr, parseBcrIndustria, numerosDeFila, asignarFilaGrano, type FilaBcr } from "./capacidad-bcr-parse";

// Fixture real: HTML de la planilla `#sheet` de BCR (cotizaciones-locales-1), capturado el
// 22/07/2026 — docs/sesiones/2026-07-24-c16-capacidad-pago.md. Trigo+Sorgo comparten un bloque
// "Commodity" y Soja+Girasol otro (así lo publica BCR): son el caso real que motivó reescribir
// el parser (antes se perdía sorgo entero y el valor de trigo era ambiguo).
const FIXTURE = readFileSync(join(__dirname, "__fixtures__/capacidad-bcr-sheet.html"), "utf8");
// Fixture real de la sección "Industria Aceitera Exportadora" de la MISMA planilla, capturado
// el 23/07/2026 (fecha distinta del fixture de arriba — sesiones separadas de captura, no afecta
// los tests: cada fixture se usa solo para su propio parser).
const FIXTURE_INDUSTRIA = readFileSync(join(__dirname, "__fixtures__/capacidad-bcr-industria.html"), "utf8");
const GRANOS = ["SOJ", "MAI", "TRI", "SOR", "GIR"] as const;

describe("parseBcr — fixture real 22/07/2026", () => {
  const { porGrano, fecha } = parseBcr(FIXTURE, GRANOS);

  it("fecha del informe", () => {
    expect(fecha).toBe("2026-07-22");
  });

  it("trigo: SAGyP spot (1er valor del bloque Trigo+Sorgo)", () => {
    expect(porGrano.TRI?.fob).toBeCloseTo(235, 6);
    expect(porGrano.TRI?.impuestos).toBeCloseTo(12.9, 6);
    expect(porGrano.TRI?.gastosPuertos).toBeCloseTo(7.3, 6);
    expect(porGrano.TRI?.gastosComerc).toBeCloseTo(7.9, 6);
    expect(porGrano.TRI?.fas).toBeCloseTo(206.86, 6);
  });

  it("sorgo: SAGyP spot (ÚLTIMO valor del mismo bloque Trigo+Sorgo) — antes se perdía", () => {
    expect(porGrano.SOR?.fas).not.toBeNull();
    expect(porGrano.SOR?.impuestos).not.toBeNull();
  });

  it("soja: SAGyP spot (1er valor del bloque Soja+Girasol)", () => {
    expect(porGrano.SOJ?.fob).toBeCloseTo(469, 6);
    expect(porGrano.SOJ?.impuestos).toBeCloseTo(112.6, 6);
    expect(porGrano.SOJ?.fas).toBeCloseTo(336.43, 6);
  });

  it("girasol: SAGyP spot (ÚLTIMO valor del bloque Soja+Girasol)", () => {
    expect(porGrano.GIR?.fob).toBeCloseTo(502, 6);
    expect(porGrano.GIR?.impuestos).toBeCloseTo(22.6, 6);
    expect(porGrano.GIR?.fas).toBeCloseTo(376.96, 6);
  });

  it("maíz: único grano de su bloque (1er valor)", () => {
    expect(porGrano.MAI?.fob).toBeCloseTo(214, 6);
    expect(porGrano.MAI?.fas).not.toBeNull();
  });

  it("consistencia aritmética: impuestos ÷ FOB = alícuota DEX vigente (docs/negocio/05)", () => {
    const ALICUOTAS: Record<string, number> = { SOJ: 0.24, MAI: 0.085, TRI: 0.055, SOR: 0.085, GIR: 0.045 };
    for (const g of GRANOS) {
      const fila = porGrano[g];
      if (fila?.fob && fila.impuestos != null) {
        expect(fila.impuestos / fila.fob).toBeCloseTo(ALICUOTAS[g]!, 2);
      }
    }
  });

  it("consistencia aritmética: FOB − Total(a+b+c) = FAS teórico, para cada grano", () => {
    for (const g of GRANOS) {
      const fila = porGrano[g];
      if (fila?.fob != null && fila.impuestos != null && fila.gastosPuertos != null && fila.gastosComerc != null && fila.fas != null) {
        const total = fila.impuestos + fila.gastosPuertos + fila.gastosComerc;
        expect(fila.fob - total).toBeCloseTo(fila.fas, 0);
      }
    }
  });
});

describe("asignarFilaGrano — reglas de asignación puras", () => {
  function vacio(): Record<string, FilaBcr> {
    return Object.fromEntries(
      GRANOS.map((g) => [g, { fob: null, impuestos: null, gastosPuertos: null, gastosComerc: null, fas: null }]),
    );
  }

  it("un solo grano en el bloque: toma el primer valor", () => {
    const porGrano = vacio();
    asignarFilaGrano(porGrano, ["MAI"], "fas", [180.5, 181.75, 182.9]);
    expect(porGrano.MAI?.fas).toBe(180.5);
  });

  it("dos granos en el bloque: 1er valor al primero, ÚLTIMO valor al segundo", () => {
    const porGrano = vacio();
    asignarFilaGrano(porGrano, ["TRI", "SOR"], "fas", [206.86, 216.67, 216.31, 216.81, 221.26, 190.73]);
    expect(porGrano.TRI?.fas).toBe(206.86);
    expect(porGrano.SOR?.fas).toBe(190.73);
  });

  it("no pisa un valor ya asignado (1ª fila que matchea gana, por si el bloque se repite)", () => {
    const porGrano = vacio();
    asignarFilaGrano(porGrano, ["MAI"], "fas", [100]);
    asignarFilaGrano(porGrano, ["MAI"], "fas", [999]);
    expect(porGrano.MAI?.fas).toBe(100);
  });

  it("bloque vacío o fila sin números: no hace nada", () => {
    const porGrano = vacio();
    asignarFilaGrano(porGrano, [], "fas", [100]);
    asignarFilaGrano(porGrano, ["MAI"], "fas", []);
    expect(porGrano.MAI?.fas).toBeNull();
  });
});

describe("numerosDeFila", () => {
  it("parsea números es-AR y descarta la etiqueta (1ª celda)", () => {
    expect(numerosDeFila(["a) Impuestos s.FOB /Exp. duties", "12,9", "13,5", "13,5"])).toEqual([12.9, 13.5, 13.5]);
  });
  it("ignora celdas no numéricas", () => {
    expect(numerosDeFila(["Puerto / Port", "SAGyP", "Up River 25/26"])).toEqual([]);
  });
});

describe("parseBcrIndustria — fixture real 23/07/2026 (sección Industria Aceitera Exportadora)", () => {
  const { porGrano, fecha } = parseBcrIndustria(FIXTURE_INDUSTRIA, GRANOS);

  it("fecha del informe", () => {
    expect(fecha).toBe("2026-07-23");
  });

  it("soja: 1er valor del bloque Complejo Soja+Girasol (posición Ago-26)", () => {
    expect(porGrano.SOJ?.fobAceite).toBeCloseTo(1196.0, 6);
    expect(porGrano.SOJ?.fobPellets).toBeCloseTo(362.5, 6);
    expect(porGrano.SOJ?.fas).toBeCloseTo(340.4, 6);
  });

  it("girasol: ÚLTIMO valor del mismo bloque (posición Spot) — el de aceite se lee bien", () => {
    expect(porGrano.GIR?.fobAceite).toBeCloseTo(1357.5, 6);
    expect(porGrano.GIR?.fas).toBeCloseTo(486.8, 6);
  });

  it("girasol: pellets queda null (la celda real trae un typo \"v165,0\" que no parsea como número — no se inventa un valor)", () => {
    expect(porGrano.GIR?.fobPellets).toBeNull();
  });

  it("los equivalentes en pesos entre paréntesis no contaminan los valores en USD", () => {
    // La fila real trae "340,4","($503,720)","342,9","479,2"... — el ($503,720) no debe
    // colarse como si fuera un 5º valor USD real.
    expect(porGrano.SOJ?.fas).not.toBeCloseTo(503.72, 1);
  });

  it("granos sin datos en este fixture (maíz/trigo/sorgo) quedan en null, no en 0", () => {
    expect(porGrano.MAI?.fas).toBeNull();
    expect(porGrano.TRI?.fas).toBeNull();
    expect(porGrano.SOR?.fas).toBeNull();
  });
});
