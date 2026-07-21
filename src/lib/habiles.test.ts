import { describe, it, expect } from "vitest";
import { esFinde, esHabil, sumarHabiles, sumarCorridos, diasCorridos, parseYmd, ymd, FERIADOS_AR } from "./habiles";
import { diasEntre } from "./dates";

// Fixtures: docs/auditoria/E2-formulas-fichas.md, ficha 6.7.
describe("habiles.ts + dates.ts — ficha E2 6.7", () => {
  it("diasEntre cruzando el arranque y el fin del DST de EEUU da el mismo delta (mediodía -03:00 fijo)", () => {
    expect(diasEntre("2026-03-01", "2026-03-08")).toBe(diasEntre("2026-03-01", "2026-03-08")); // sanity determinístico
    // 08/03/2026 (arranca DST EEUU) y 01/11/2026 (termina DST EEUU): 4 días exactos alrededor de cada uno.
    expect(diasEntre("2026-03-04", "2026-03-08")).toBe(4);
    expect(diasEntre("2026-10-28", "2026-11-01")).toBe(4);
  });

  it("sumarHabiles saltea feriados: miércoles 08/07/2026 + 1 hábil = 10/07 (saltea el feriado del 09/07)", () => {
    const d = sumarHabiles(parseYmd("2026-07-08"), 1);
    expect(ymd(d)).toBe("2026-07-10");
  });

  it("sumarHabiles: viernes 03/07/2026 + 5 hábiles = 13/07", () => {
    const d = sumarHabiles(parseYmd("2026-07-03"), 5);
    expect(ymd(d)).toBe("2026-07-13");
  });

  it("esHabil/esFinde: el feriado del 09/07/2026 no es hábil aunque sea jueves", () => {
    const feriado = parseYmd("2026-07-09");
    expect(esFinde(feriado)).toBe(false); // jueves, no es finde
    expect(esHabil(feriado)).toBe(false); // pero está en FERIADOS_AR
    expect(FERIADOS_AR.has("2026-07-09")).toBe(true);
  });

  it("borde (auditoría E4, hallazgo #21): sumarHabiles clampea un n gigante en vez de colgar", () => {
    const d = sumarHabiles(parseYmd("2026-01-01"), 10_000_000);
    expect(d.getUTCFullYear()).toBeLessThan(2200); // no cuelga; el resultado queda acotado
  });

  it("diasCorridos y sumarCorridos son inversas", () => {
    const a = parseYmd("2026-07-08");
    const b = sumarCorridos(a, 31);
    expect(diasCorridos(a, b)).toBe(31);
  });
});
