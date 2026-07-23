import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Compara un token recibido contra `INFORME_TOKEN` (env) de forma timing-safe.
 * Mismo guard que usan /api/views/insumos (MP3), /api/informes/datos y la
 * plantilla del informe diario (MP1) — un solo lugar para no duplicarlo.
 */
export function tokenValido(recibido: string, esperado: string): boolean {
  if (!esperado || !recibido) return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Fecha 'YYYY-MM-DD' válida (guard simple de searchParams/query). */
export function esFechaValida(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
