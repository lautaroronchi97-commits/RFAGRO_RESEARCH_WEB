import { describe, it, expect } from "vitest";
import { filaSpot, type PostFob } from "./fob-oficial-parse";

// Fixture real: respuesta de la API de FOB oficial para trigo (posición 10019900110W),
// 23/07/2026 — docs/sesiones/2026-07-24-c16-capacidad-pago.md. 6 ventanas de embarque.
const POSTS_TRIGO: PostFob[] = [
  { fecha: "2026-07-23", circular: "2022", posicion: "10019900110W", precio: 237, mesDesde: 7, añoDesde: 2026, mesHasta: 7, añoHasta: 2026 },
  { fecha: "2026-07-23", circular: "2022", posicion: "10019900110W", precio: 243, mesDesde: 8, añoDesde: 2026, mesHasta: 8, añoHasta: 2026 },
  { fecha: "2026-07-23", circular: "2022", posicion: "10019900110W", precio: 249, mesDesde: 9, añoDesde: 2026, mesHasta: 11, añoHasta: 2026 },
  { fecha: "2026-07-23", circular: "2022", posicion: "10019900110W", precio: 247, mesDesde: 12, añoDesde: 2026, mesHasta: 12, añoHasta: 2026 },
  { fecha: "2026-07-23", circular: "2022", posicion: "10019900110W", precio: 249, mesDesde: 1, añoDesde: 2027, mesHasta: 1, añoHasta: 2027 },
  { fecha: "2026-07-23", circular: "2022", posicion: "10019900110W", precio: 256, mesDesde: 2, añoDesde: 2027, mesHasta: 6, añoHasta: 2027 },
];

describe("filaSpot", () => {
  it("elige la ventana de embarque de inicio más cercano (spot), no la primera del array", () => {
    // Barajado a propósito para probar que no depende del orden de entrada.
    const barajado = [POSTS_TRIGO[3]!, POSTS_TRIGO[0]!, POSTS_TRIGO[5]!, POSTS_TRIGO[1]!];
    const fila = filaSpot(barajado, "10019900110W");
    expect(fila?.precio).toBe(237);
    expect(fila?.mesDesde).toBe(7);
    expect(fila?.añoDesde).toBe(2026);
  });

  it("compara año Y mes (una ventana de enero del año siguiente no le gana a diciembre del actual)", () => {
    const fila = filaSpot([POSTS_TRIGO[4]!, POSTS_TRIGO[3]!], "10019900110W");
    expect(fila?.precio).toBe(247); // Dic-2026 (mesDesde=12,añoDesde=2026) es más cercano que Ene-2027
  });

  it("null si la posición no está en la lista", () => {
    expect(filaSpot(POSTS_TRIGO, "NO_EXISTE")).toBeNull();
  });

  it("null con lista vacía", () => {
    expect(filaSpot([], "10019900110W")).toBeNull();
  });
});
