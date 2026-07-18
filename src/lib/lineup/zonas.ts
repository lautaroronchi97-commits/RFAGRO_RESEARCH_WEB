/**
 * Zonificación de la operación de carga (decisión 9 del plan: solo Up River Norte/Sur
 * + Bahía Blanca; todo lo demás = "Otros" y queda fuera de los paneles por default).
 *
 * Puerto del `config.py:zona_carga` de LineUps_Code: en el Gran Rosario el campo `port`
 * agrupa mal ("ROSARIO" y "SAN LORENZO" son paraguas que mezclan terminales de zonas
 * distintas), así que la ubicación real la da el `berth` (muelle). Se evalúa por regex
 * sobre el berth en mayúsculas; el `port` es el fallback.
 */

export type Zona = "Up River Norte" | "Up River Sur" | "Bahía Blanca" | "Otros";

/** Zonas operativas que muestran los paneles (excluye "Otros"). */
export const ZONAS: Zona[] = ["Up River Norte", "Up River Sur", "Bahía Blanca"];

// Muelles del SUR (muchas veces vienen bajo port="SAN LORENZO" o "ROSARIO"): se chequean primero.
const BERTH_SUR = [
  /GRAL\.?\s+LAGOS/, /GENERAL\s+LAGOS/, /PUNTA\s+ALVEAR/, /\bALVEAR\b/, /\(AS\)/,
  /ARROYO\s+SECO/, /\bVGG\b/, /GOB.*GALVEZ/, /UNIDAD\s+6/, /UNIDAD\s+7/,
  /NUEVO\s+SUR/, /NUEVO\s+NORTE/, /MUELLE\s+J\b/, /MUELLE\s+HI\b/, /\bGUIDE\b/, /RAMALLO/,
];
// Muelles del NORTE (San Lorenzo / San Martín / Timbúes / Ricardone).
const BERTH_NORTE = [
  /RENOVA/, /SAN\s+BENITO/, /TERMINAL\s+6/, /QUEBRACHO/, /VICENTIN/, /TIMBUES/,
  /\bPGSM\b/, /\bPAMPA\b/, /\bDEMPA\b/, /\(SL\)/, /\bACA\b/,
];

export function zonaCarga(port: string | null, berth: string | null): Zona {
  const b = (berth ?? "").toUpperCase().trim();
  if (b) {
    if (BERTH_SUR.some((r) => r.test(b))) return "Up River Sur";
    if (BERTH_NORTE.some((r) => r.test(b))) return "Up River Norte";
  }
  const p = (port ?? "").toUpperCase().trim();
  if (p.includes("BAHIA") || p.includes("GALVAN") || p.includes("WHITE")) return "Bahía Blanca";
  if (p.includes("SAN LORENZO")) return "Up River Norte"; // default del nodo norte
  if (p.includes("ROSARIO") || p.includes("RAMALLO")) return "Up River Sur"; // Rosario ciudad = Sur
  return "Otros";
}
