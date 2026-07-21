/** Utilidades chicas compartidas por las libs de scraping (pizarra, capacidad). */

/** "480.500,00" → 480500 ; "325,21" → 325.21 ; null si no parsea (formato inesperado de la fuente). */
export function arNum(s: string): number | null {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Lee un override manual desde una env var JSON (`{"SOJ":320,...}`); `{}` si falta o es inválido. */
export function leerOverrideEnv(envVar: string): Record<string, number> {
  try {
    const o = JSON.parse(process.env[envVar] ?? "{}");
    return o && typeof o === "object" ? (o as Record<string, number>) : {};
  } catch {
    return {};
  }
}
