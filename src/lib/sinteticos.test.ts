import { describe, it, expect } from "vitest";
import { calcularSintetico, emparejarSinteticos } from "./sinteticos";

/**
 * Fixture REAL del Excel de Lautaro ("REAL_TIME v2.5", hoja "DOLAR SINTETICO"), fecha 2026-07-08:
 *   dólar MAE (spot) = 1488 · DLR/JUL26 ajuste = 1498.5 · vto 2026-07-31 (23 días desde el 08/07)
 *   letra S31L6 (vto 2026-07-31): Px = 116.450 · Pago Final = 117.677
 *   → sintético = 1488 × (117.677/116.450) = 1503.678626
 *   → directa   = 1503.678626/1498.5 − 1
 *   → TNA       = directa × 365/23 = 5.4843 %
 * Los "Pago Final" del Excel coinciden 1:1 con los que publica BYMA (verificado cruzando
 * S31L6 117.677 / S14G6 108.03 / S31G6 127.064).
 */
describe("sinteticos.ts — fixture Excel DOLAR SINTETICO (S31L6, 2026-07-08)", () => {
  const SPOT = 1488;
  const PX = 116.45;
  const PAGO_FINAL = 117.677;
  const FUT = 1498.5;
  const DIAS = 23;

  it("calcularSintetico reproduce los números exactos del Excel", () => {
    const c = calcularSintetico(SPOT, PX, PAGO_FINAL, FUT, DIAS);
    expect(c.sinteticoAFinish).toBeCloseTo(1503.6786260197512, 9);
    // directa: el Excel muestra 0,34562% redondeando el sintético intermedio; la fórmula exacta
    // sobre estos inputs da 0,0034558732 → la TNA (el output que importa) cae en 5,4843% clavado.
    expect(c.tasaDirecta).toBeCloseTo(0.0034558732197205178, 12);
    expect(c.tna).toBeCloseTo(0.05484320544339082, 12);
    expect(c.tna * 100).toBeCloseTo(5.4843, 4);
  });

  it("letra ya vencida (días ≤ 0) → TNA NaN, sintético y directa siguen", () => {
    const c = calcularSintetico(SPOT, PX, PAGO_FINAL, FUT, 0);
    expect(c.sinteticoAFinish).toBeCloseTo(1503.6786260197512, 9);
    expect(c.tasaDirecta).toBeCloseTo(0.0034558732197205178, 12);
    expect(Number.isNaN(c.tna)).toBe(true);
  });
});

describe("sinteticos.ts — emparejarSinteticos", () => {
  const JUL_VTO = Date.parse("2026-07-31T12:00:00-03:00");
  const AGO_VTO = Date.parse("2026-08-31T12:00:00-03:00");

  const letras = [
    { symbol: "S31L6", px: 116.45, vencMs: JUL_VTO, dias: 23 },
    { symbol: "S31G6", px: 113.3, vencMs: AGO_VTO, dias: 54 },
  ];
  const posiciones = [
    { label: "JUL26", precio: 1498.5, vencMs: JUL_VTO, tnaPct: 4.0 },
    { label: "AGO26", precio: 1560.0, vencMs: AGO_VTO, tnaPct: 5.0 },
  ];
  const pagoFinal = { S31L6: 117.677, S31G6: 127.064 };

  it("empareja cada letra con la posición DLR de su mismo mes y calcula la fila S31L6", () => {
    const rows = emparejarSinteticos(1488, letras, posiciones, pagoFinal);
    expect(rows).toHaveLength(2);
    const jul = rows.find((r) => r.letra === "S31L6")!;
    expect(jul.posicion).toBe("JUL26");
    expect(jul.sinteticoAFinish).toBeCloseTo(1503.6786260197512, 9);
    expect(jul.tnaPct).toBeCloseTo(5.4843, 4);
    expect(jul.futTnaPct).toBe(4.0);
    expect(jul.ventajaPct).toBeCloseTo(1.4843, 4); // sintético 5,48% vs futuro 4,00%
  });

  it("degrada honesto: sin pago final la fila aparece pero con sintético null", () => {
    const rows = emparejarSinteticos(1488, letras, posiciones, { S31L6: 117.677 });
    const ago = rows.find((r) => r.letra === "S31G6")!;
    expect(ago.pagoFinal).toBeNull();
    expect(ago.sinteticoAFinish).toBeNull();
    expect(ago.tnaPct).toBeNull();
    expect(ago.ventajaPct).toBeNull();
    expect(ago.posicion).toBe("AGO26"); // el emparejamiento igual se muestra
  });

  it("letra sin dólar futuro dentro de la tolerancia se excluye", () => {
    const lejana = [{ symbol: "S30N7", px: 100, vencMs: Date.parse("2027-11-30T12:00:00-03:00"), dias: 480 }];
    const rows = emparejarSinteticos(1488, lejana, posiciones, {});
    expect(rows).toHaveLength(0);
  });

  it("ordena por vencimiento de la letra (orden de curva)", () => {
    const rows = emparejarSinteticos(1488, [...letras].reverse(), posiciones, pagoFinal);
    expect(rows.map((r) => r.letra)).toEqual(["S31L6", "S31G6"]);
  });
});
