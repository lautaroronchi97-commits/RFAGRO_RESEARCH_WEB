import { describe, it, expect } from "vitest";
import { getEventos } from "./calendario";

// Fixtures: docs/auditoria/E2-formulas-fichas.md, ficha 6.3 (conversiones TZ + corrimiento por feriado).
describe("calendario.ts — ficha E2 6.3", () => {
  it("WASDE 12/08/2026: 12:00 EDT -> 13:00 AR (agosto, con horario de verano EEUU)", () => {
    const eventos = getEventos("2026-08-12", "2026-08-12");
    const wasde = eventos.find((e) => e.informe === "WASDE + Crop Production");
    expect(wasde?.fechaISO).toBe("2026-08-12");
    expect(wasde?.horaArg).toBe("13:00");
  });

  it("WASDE 10/12/2026: 12:00 EST -> 14:00 AR (diciembre, sin horario de verano EEUU)", () => {
    const eventos = getEventos("2026-12-10", "2026-12-10");
    const wasde = eventos.find((e) => e.informe === "WASDE + Crop Production");
    expect(wasde?.fechaISO).toBe("2026-12-10");
    expect(wasde?.horaArg).toBe("14:00");
  });

  it("CONAB: 09:00 Brasília = 09:00 AR (Brasil sin DST desde 2019)", () => {
    const eventos = getEventos("2026-07-14", "2026-07-14");
    const conab = eventos.find((e) => e.organismo === "CONAB" && e.informe.includes("Levantamento"));
    expect(conab?.horaArg).toBe("09:00");
  });

  it("PAS (BCBA): jueves 15:00 AR, regla semanal", () => {
    const eventos = getEventos("2026-07-23", "2026-07-23"); // jueves
    const pas = eventos.find((e) => e.organismo === "BCBA");
    expect(pas?.horaArg).toBe("15:00");
    expect(pas?.fechaISO).toBe("2026-07-23");
  });

  it("nEsimoDiaDeSemana: 2do miércoles de agosto 2026 = 12/08 (coincide con el plan)", () => {
    const eventos = getEventos("2026-08-01", "2026-08-31");
    const geaMensual = eventos.find((e) => e.informe === "Estimación Mensual Nacional (GEA)");
    expect(geaMensual?.fechaISO).toBe("2026-08-12");
  });

  it("GEA semanal se ADELANTA al hábil anterior si el jueves es feriado (09/07/2026)", () => {
    // Semana del feriado 09/07/2026 (jueves, Día de la Independencia): el GEA semanal
    // corre al miércoles 08/07 en vez del jueves — verificado contra el GEA real
    // fechado 2026-07-08 "GEA mensual #196" en estimaciones_produccion (auditoría E2).
    const eventos = getEventos("2026-07-06", "2026-07-10");
    const gea = eventos.find((e) => e.informe === "Informe Semanal Zona Núcleo (GEA)");
    expect(gea?.fechaISO).toBe("2026-07-08");
  });

  it("una semana SIN feriado: el GEA semanal queda en el jueves normal", () => {
    const eventos = getEventos("2026-07-20", "2026-07-24"); // semana del 23/07, sin feriado
    const gea = eventos.find((e) => e.informe === "Informe Semanal Zona Núcleo (GEA)");
    expect(gea?.fechaISO).toBe("2026-07-23");
  });

  it("rango vacío -> sin eventos oficiales de esa fecha", () => {
    const eventos = getEventos("2020-01-01", "2020-01-01");
    expect(eventos.find((e) => e.informe === "WASDE + Crop Production")).toBeUndefined();
  });
});
