/**
 * Normalización de shippers (exportadores) a nombres canónicos. Puerto fiel de
 * `shipper_norm.py` de LineUps_Code, con el roster depurado para 2025-2026: el
 * line-up bruto trae ~280 variantes (razones sociales, filiales, typos) y las
 * colapsamos a los jugadores estables + "OTROS". El primer patrón que matchea gana
 * (orden = más específico primero). Se corre sobre el nombre crudo en MAYÚSCULAS.
 *
 * Fusiones reales: VITERRA + BUNGE + OMHSA (Oleaginosa Moreno) + GLENCORE (la ex
 * Glencore Agriculture ES Viterra) → "VITERRA-BUNGE"; NIDERA → COFCO; MOLINOS AGRO/
 * RÍO DE LA PLATA → "MOLINOS". Las filiales PY/UY se fusionan con la casa matriz
 * pero se guarda el flag `origen` (tránsito Paraguay/Uruguay, sin DJVE argentina).
 *
 * Roster 2025-2026 (verificado por volumen contra el line-up):
 *  - Se sumaron con volumen real: COPAGRA, NUTRIOIL, GRAVETAL, GROBOCOPATEL,
 *    COMMODITIES, SYNGENTA, YPF, TBC.
 *  - Se dieron de baja (sin grano 2025-26 / fusionadas): GLENCORE (→ Viterra),
 *    OLAM, PROMASA.
 *  - Fix: la DJVE nombra a ACA como "ASOCIACIÓN DE COOPERATIVAS" (con tilde) →
 *    el patrón ahora tolera la Ó, si no ~4,7 Mt de ACA caían en OTROS.
 */

type Regla = { canon: string; pats: RegExp[] };

const MAP: Regla[] = [
  { canon: "VITERRA-BUNGE", pats: [/\bVITERRA\b/, /\bBUNGE\b/, /\bGLENCORE\b/, /\bOMHSA\b/, /OLEAGINOSA\s+MORENO/, /ORGANIZACION\s+MORENO/, /MORENO\s+HNOS/, /MORENO\s+HERMANOS/] },
  { canon: "CARGILL", pats: [/\bCARGILL\b/] },
  { canon: "COFCO", pats: [/\bCOFCO\b/, /NIDERA/] },
  { canon: "LDC", pats: [/\bLDC\b/, /LOUIS\s+DREYFUS/, /\bDREYFUS\b/, /LD\s+COMMODITIES/] },
  { canon: "ADM", pats: [/\bADM\b/, /ARCHER\s+DANIELS/, /TOEPFER/, /TOEPER/] },
  { canon: "AGD", pats: [/\bAGD\b/, /ACEITERA\s+GENERAL\s+DEHEZA/, /ACEITERA\s+GEN\s+DEHEZA/, /\bDEHEZA\b/] },
  { canon: "ACA", pats: [/\bACA\b/, /ASOC\.?\s+COOPERATIVAS/, /ASOCIACI[OÓ]N\s+DE\s+COOPERATIVAS/, /ASOC\s+COOP\s+ARG/] },
  { canon: "MOLINOS", pats: [/\bMOLINOS\s+AGRO\b/, /MOLINOS\s+RIO\s+DE\s+LA\s+PLATA/] },
  { canon: "QUILMES", pats: [/\bQUILMES\b/, /MALTERIA\s+QUILMES/] },
  { canon: "AMAGGI", pats: [/\bAMAGGI\b/] },
  { canon: "CHS", pats: [/\bCHS\b/] },
  { canon: "U.A. AVELLANEDA", pats: [/UNI[OÓ]N\s+AGR[IÍ]COLA\s+(DE\s+)?AVELLANEDA/] },
  { canon: "GEAR", pats: [/\bGEAR\b/] },
  { canon: "ALEA", pats: [/\bALEA\b/] },
  { canon: "CURCIJA", pats: [/\bCURCIJA\b/] },
  { canon: "BOORTMALT", pats: [/\bBOORTMALT\b/] },
  // Sumadas al roster 2025-2026 (volumen real que antes caía en OTROS).
  { canon: "COPAGRA", pats: [/\bCOPAGRA\b/] },
  { canon: "NUTRIOIL", pats: [/\bNUTRIOIL\b/] },
  { canon: "GRAVETAL", pats: [/\bGRAVETAL\b/] },
  { canon: "GROBOCOPATEL", pats: [/\bGROBOCOPATEL\b/] },
  { canon: "COMMODITIES", pats: [/\bCOMMODITIES\b/] }, // tras LDC → "LD COMMODITIES" no cae acá
  { canon: "SYNGENTA", pats: [/\bSYNGENTA\b/] },
  { canon: "YPF", pats: [/\bYPF\b/] },
  { canon: "TBC", pats: [/\bTBC\b/] },
];

const PY = /\bPY\b|\bPARAGUAY\b|\bPGY\b/;
const UY = /\bUY\b|\bURUGUAY\b/;

export function canonShipper(raw: string | null): { canon: string; origen: "PY" | "UY" | null } {
  if (!raw) return { canon: "OTROS", origen: null };
  const u = raw.toUpperCase().trim();
  if (!u) return { canon: "OTROS", origen: null };
  const origen = PY.test(u) ? "PY" : UY.test(u) ? "UY" : null;
  for (const r of MAP) {
    if (r.pats.some((p) => p.test(u))) return { canon: r.canon, origen };
  }
  return { canon: "OTROS", origen };
}
