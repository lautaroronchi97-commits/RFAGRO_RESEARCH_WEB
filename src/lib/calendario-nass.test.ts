import { describe, it, expect } from "vitest";
import { parseIcsVeventos, extraerSeedNass } from "./calendario-nass";

// Fixture: recorte real de src/lib/calendario-seed-nass.json (mismos VEVENT que trae el ICS real
// de NASS 2026, verificado en vivo el 24/07/2026 — ver docs/sesiones/ del lote L6). Incluye folding
// RFC 5545 sintético en el primer bloque para probar el unfold.
const ICS_FIXTURE = [
  "BEGIN:VCALENDAR",
  "PRODID:-//github.com/rianjs/ical.net//NONSGML ical.net 4.0//EN",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "DESCRIPTION:Crop Production",
  "DTEND:20260812T120500",
  "DTSTAMP:20251204T153758Z",
  "DTSTART:20260812T120000",
  "SEQUENCE:0",
  "SUMMARY:Crop Production",
  " (WASDE del mes)", // continuación "folded" — debe pegarse a la línea de arriba sin romper el parseo
  "UID:64b1e83c-96fa-4d7a-aaa6-e9d88ea33ab3",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DESCRIPTION:Grain Stocks",
  "DTEND:20260930T120500",
  "DTSTAMP:20251204T153758Z",
  "DTSTART:20260930T120000",
  "SEQUENCE:0",
  "SUMMARY:Grain Stocks",
  "UID:aaa",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DESCRIPTION:Small Grains Summary",
  "DTEND:20260930T120500",
  "DTSTAMP:20251204T153758Z",
  "DTSTART:20260930T120000",
  "SEQUENCE:0",
  "SUMMARY:Small Grains Summary",
  "UID:bbb",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DESCRIPTION:Crop Progress",
  "DTEND:20260713T160500",
  "DTSTAMP:20251204T153758Z",
  "DTSTART:20260713T160000",
  "SEQUENCE:0",
  "SUMMARY:Crop Progress",
  "UID:ccc",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DESCRIPTION:Cotton System",
  "DTEND:20260102T150500",
  "DTSTAMP:20251204T153758Z",
  "DTSTART:20260102T150000",
  "SEQUENCE:0",
  "SUMMARY:Cotton System",
  "UID:ddd",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n"); // el ICS real de NASS viene con CRLF

describe("calendario-nass.ts — parser del ICS de NASS", () => {
  it("parsea VEVENT con folding RFC 5545 y CRLF sin romper SUMMARY/DTSTART", () => {
    const eventos = parseIcsVeventos(ICS_FIXTURE);
    // 5 VEVENT en el fixture (Cotton System incluido — el parser trae TODO, el filtro lo hace
    // extraerSeedNass).
    expect(eventos).toHaveLength(5);
    const cropProd = eventos.find((e) => e.fechaISO === "2026-08-12");
    // RFC 5545: el primer carácter de la continuación (el espacio "marcador de folding") se
    // descarta al desdoblar — por eso pega sin espacio extra.
    expect(cropProd?.summary).toBe("Crop Production(WASDE del mes)");
    expect(cropProd?.horaLocal).toBe("12:00");
  });

  it("extraerSeedNass agrupa solo los 3 informes relevantes, dedup y ordenados", () => {
    const seed = extraerSeedNass(ICS_FIXTURE);
    // "Crop Production(WASDE del mes)" (con folding) no matchea SUMMARY exacto → no cae en "wasde"
    // (documentado: el generador falla ruidoso si 0 fechas; el ICS real no tiene folding en estos
    // campos, verificado en vivo).
    expect(seed.wasde).toEqual([]);
    expect(seed.grainStocks).toEqual(["2026-09-30"]); // Grain Stocks; Small Grains Summary no suma clave propia
    expect(seed.cropProgress).toEqual(["2026-07-13"]);
  });

  it("con SUMMARY exacto (sin folding) sí cae en 'wasde'", () => {
    const ics = ICS_FIXTURE.replace(
      "SUMMARY:Crop Production\r\n (WASDE del mes)",
      "SUMMARY:Crop Production",
    );
    const seed = extraerSeedNass(ics);
    expect(seed.wasde).toEqual(["2026-08-12"]);
  });

  it("rango vacío / ICS sin VEVENT relevantes -> arrays vacíos, sin throw", () => {
    const seed = extraerSeedNass("BEGIN:VCALENDAR\r\nEND:VCALENDAR");
    expect(seed).toEqual({ wasde: [], grainStocks: [], cropProgress: [] });
  });
});
