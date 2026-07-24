import { describe, it, expect } from "vitest";
import { calcularSenal, mediaMovil, percentilCalendario, type Punto } from "./senal";

// Ejemplo numérico REAL del 22/07/2026 (docs/negocio/09_camiones_vs_lineup_senal.md §"Ejemplo
// numérico REAL"): los percentiles ya vienen computados por SQL contra la base viva — acá se
// testea que el DIFERENCIAL y la LECTURA reproducen EXACTO lo documentado.
describe("camiones/senal.ts — calcularSenal (fixture real 22/07/2026, negocio/09)", () => {
  it("trigo: pctlLineup 97, pctlCamiones 78 → +19, ALCISTA", () => {
    const s = calcularSenal(97, 78);
    expect(s.diferencial).toBe(19);
    expect(s.lectura).toBe("ALCISTA");
  });

  it("maíz: pctlLineup 82, pctlCamiones 78 → +4, NEUTRO", () => {
    const s = calcularSenal(82, 78);
    expect(s.diferencial).toBe(4);
    expect(s.lectura).toBe("NEUTRO");
  });

  it("soja (complejo, eq. poroto): pctlLineup 59, pctlCamiones 51 → +8, NEUTRO", () => {
    const s = calcularSenal(59, 51);
    expect(s.diferencial).toBe(8);
    expect(s.lectura).toBe("NEUTRO");
  });

  it("Gran Rosario: pctlLineup 80, pctlCamiones 92 → −12, BAJISTA", () => {
    const s = calcularSenal(80, 92);
    expect(s.diferencial).toBe(-12);
    expect(s.lectura).toBe("BAJISTA");
  });

  it("Bahía Blanca: pctlLineup 42, pctlCamiones 36 → +6, NEUTRO", () => {
    const s = calcularSenal(42, 36);
    expect(s.diferencial).toBe(6);
    expect(s.lectura).toBe("NEUTRO");
  });

  it("sin dato (null en cualquiera de las dos patas) → SIN_DATO", () => {
    expect(calcularSenal(null, 50).lectura).toBe("SIN_DATO");
    expect(calcularSenal(50, null).lectura).toBe("SIN_DATO");
    expect(calcularSenal(null, null).diferencial).toBeNull();
  });

  it("umbral configurable: diferencial exactamente en el borde no es NEUTRO (estrictamente >)", () => {
    expect(calcularSenal(60, 50, 10).lectura).toBe("NEUTRO"); // diff=10, no > 10
    expect(calcularSenal(61, 50, 10).lectura).toBe("ALCISTA"); // diff=11 > 10
    expect(calcularSenal(50, 61, 10).lectura).toBe("BAJISTA"); // diff=-11 < -10
  });
});

describe("camiones/senal.ts — mediaMovil", () => {
  it("promedia hasta las últimas n filas STORED (no calendario)", () => {
    const serie: Punto[] = [1, 2, 3, 4, 5, 6, 7, 8].map((v, i) => ({
      fecha: new Date(Date.UTC(2026, 0, i + 1)),
      valor: v,
    }));
    const ma = mediaMovil(serie, 7);
    // primeras filas: ventana chica (ensancha desde el arranque)
    expect(ma[0]!.valor).toBe(1);
    expect(ma[1]!.valor).toBe(1.5);
    // fila 8 (índice 7): promedio de valores 2..8 (últimos 7)
    expect(ma[7]!.valor).toBeCloseTo((2 + 3 + 4 + 5 + 6 + 7 + 8) / 7, 9);
  });

  it("serie vacía → []", () => {
    expect(mediaMovil([], 7)).toEqual([]);
  });
});

describe("camiones/senal.ts — percentilCalendario", () => {
  it("necesita al menos 2 años con dato en la ventana ±15d, si no → null", () => {
    const hoy = new Date(Date.UTC(2026, 6, 22));
    const unSoloAnio: Punto[] = [{ fecha: new Date(Date.UTC(2025, 6, 20)), valor: 10 }];
    expect(percentilCalendario(unSoloAnio, hoy, 15)).toBeNull();
  });

  it("con 2+ años en ventana, devuelve el percentil del valor de hoy contra esa historia", () => {
    const hoy = new Date(Date.UTC(2026, 6, 22));
    const serie: Punto[] = [
      { fecha: new Date(Date.UTC(2025, 6, 20)), valor: 10 },
      { fecha: new Date(Date.UTC(2024, 6, 25)), valor: 20 },
      { fecha: new Date(Date.UTC(2023, 6, 22)), valor: 30 },
    ];
    const pctl = percentilCalendario(serie, hoy, 25);
    expect(pctl).not.toBeNull();
    expect(pctl).toBeCloseTo((100 * 2) / 3, 9); // 10 y 20 son <= 25, de los 3 valores
  });
});
