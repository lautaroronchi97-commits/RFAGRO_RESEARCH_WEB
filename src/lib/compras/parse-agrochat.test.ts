import { describe, it, expect } from "vitest";
import { parseAgrochat, CABECERA_ESPERADA } from "./parse-agrochat";

// Sin ficha directa en E2 (auditoría E4, hallazgo #12 — esta lib quedó fuera del alcance de
// E2, que auditó negociado.ts, el consumidor). Casos armados a mano contra el formato real
// documentado en el header del archivo y verificados contra data/compras/*.csv.
function csv(filas: string[]): Uint8Array {
  const texto = [CABECERA_ESPERADA, ...filas].join("\n");
  return new TextEncoder().encode(texto);
}

describe("compras/parse-agrochat.ts", () => {
  it("parsea una fila válida completa (trigo, exportador)", () => {
    const r = parseAgrochat(
      csv(["08/07/2026,trigo,exportador,25/26,150500,16238900,12319200,3919800,2488700,1431100"]),
      "test.csv",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0]).toMatchObject({
      fecha: "2026-07-08",
      grano_raw: "trigo",
      codigo_interno: "WHEAT",
      campana: "2025/26",
      sector: "EXPORTACION",
      toneladas: 16238900,
      semanal_tn: 150500,
      fuente: "AGROCHAT",
    });
  });

  it("num(): un punto con grupos de 3 dígitos es separador de miles; un punto suelto es decimal (artefacto de float)", () => {
    const r = parseAgrochat(
      csv([
        "08/07/2026,soja,exportador,25/26,1.500,64099.99999999999,,,,",
        "15/07/2026,soja,exportador,25/26,2.500,12.345,,,,",
      ]),
      "test.csv",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filas[0].toneladas).toBeCloseTo(64099.99999999999, 4); // punto decimal, NO separador de miles
    expect(r.filas[1].toneladas).toBe(12345); // "12.345" = grupo de 3 dígitos -> miles
  });

  it("fechaISO: acepta DD/MM/AAAA y también ISO AAAA-MM-DD (fallback — auditoría E4 #2)", () => {
    const r = parseAgrochat(
      csv(["2026-07-08,trigo,exportador,25/26,100,1000,,,,"]),
      "test.csv",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filas[0].fecha).toBe("2026-07-08");
  });

  it("dedup por clave (campana, codigo_interno, sector, fecha): queda la primera aparición", () => {
    const r = parseAgrochat(
      csv([
        "08/07/2026,trigo,exportador,25/26,100,1000,,,,",
        "08/07/2026,trigo,exportador,25/26,999,9999,,,,",
      ]),
      "test.csv",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filas).toHaveLength(1);
    expect(r.duplicadas).toBe(1);
    expect(r.filas[0].toneladas).toBe(1000); // la primera, no la segunda
  });

  it("descarta filas con grano/sector no mapeable, sin tumbar el resto", () => {
    const r = parseAgrochat(
      csv([
        "08/07/2026,trigo,exportador,25/26,100,1000,,,,",
        "08/07/2026,grano-inventado,exportador,25/26,100,1000,,,,",
      ]),
      "test.csv",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filas).toHaveLength(1);
    expect(r.descartadas).toBe(1);
  });

  it("fila sin total_comprado_acumulado NI compras_semanales -> descartada (sin dato útil)", () => {
    const r = parseAgrochat(
      csv([
        "08/07/2026,trigo,exportador,25/26,150500,16238900,,,,", // válida
        "15/07/2026,trigo,exportador,25/26,,,,,,", // sin dato útil -> descartada
      ]),
      "test.csv",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filas).toHaveLength(1);
    expect(r.descartadas).toBe(1);
  });

  it("archivo con UNA sola fila sin dato útil -> ok:false (0 filas válidas)", () => {
    const r = parseAgrochat(csv(["08/07/2026,trigo,exportador,25/26,,,,,,"]), "test.csv");
    expect(r.ok).toBe(false);
  });

  it("guard anti falso-verde: archivo con contenido pero ninguna fila parsea -> error, no silencio", () => {
    const filasMalas = Array.from({ length: 15 }, (_, i) => `fila-mala-${i},x,y,z,,,,,,,`);
    const r = parseAgrochat(csv(filasMalas), "test.csv");
    expect(r.ok).toBe(false);
  });

  it("archivo vacío -> error explícito", () => {
    const r = parseAgrochat(new Uint8Array(0), "test.csv");
    expect(r.ok).toBe(false);
  });

  it("cabecera sin las columnas mínimas -> error de formato", () => {
    const r = parseAgrochat(new TextEncoder().encode("a,b,c\n1,2,3"), "test.csv");
    expect(r.ok).toBe(false);
  });

  it("archivo más grande que MAX_BYTES -> error sin intentar parsear", () => {
    const grande = new Uint8Array(16 * 1024 * 1024);
    const r = parseAgrochat(grande, "test.csv");
    expect(r.ok).toBe(false);
  });
});
