import "server-only";
import { cache } from "react";
import { sbSelectAll } from "../supabase";
import type { Meta } from "../market";
import { PRODUCTOS, productoDe, type Familia } from "./config";
import { zonaCarga, ZONAS, type Zona } from "./zonas";
import { canonShipper } from "./shippers";

/**
 * Foto operativa del line-up (Fase 1 del plan de puertos): la última rueda de ISA
 * más el delta vs la anterior. Se enfoca en las EXPORTACIONES (ops = LOAD) de los
 * productos prioritarios (decisión 8) en las zonas operativas (decisión 9). Lee la
 * vista `lineup_ultimas_ruedas` (2 snapshots) y agrega todo en el server.
 */

const SOURCE = "ISA Agents";
const UMBRAL_BUQUE_NUEVO_TN = 30_000; // materialidad de "buque nuevo" (mesa_diff.py)

export type ProductoAgg = {
  codigo: string;
  display: string;
  familia: Familia;
  buques: number;
  toneladas: number;
  deltaTon: number | null; // vs la rueda anterior
};
export type ZonaAgg = { zona: Zona; buques: number; toneladas: number };
export type BuqueRow = {
  vessel: string;
  empresa: string; // canónica (o el nombre crudo si cae en "OTROS")
  producto: string; // display
  familia: Familia;
  toneladas: number | null;
  zona: Zona;
  muelle: string | null;
  destino: string | null;
  etb: string | null;
};
export type BuqueNuevo = {
  vessel: string;
  empresa: string;
  toneladas: number;
  zona: Zona;
  etb: string | null;
  productos: string[];
};
export type FotoOperativa = {
  fecha: string | null;
  fechaPrev: string | null;
  productos: ProductoAgg[];
  zonas: ZonaAgg[];
  buques: BuqueRow[];
  nuevos: BuqueNuevo[];
  totalTon: number;
  totalBuques: number;
  meta: Meta;
};

type Raw = {
  fecha_consulta: string;
  port: string | null;
  berth: string | null;
  vessel: string | null;
  ops: string | null;
  cargo: string | null;
  quantity: number | null;
  dest_orig: string | null;
  shipper: string | null;
  etb: string | null;
  es_agro: boolean | null;
  rueda_rank: number;
};

function empresaDisplay(shipper: string | null): string {
  const { canon } = canonShipper(shipper);
  return canon !== "OTROS" ? canon : (shipper?.trim() || "—");
}

const vacia = (problema: string): FotoOperativa => ({
  fecha: null, fechaPrev: null, productos: [], zonas: [], buques: [], nuevos: [],
  totalTon: 0, totalBuques: 0,
  meta: { source: SOURCE, updatedAt: null, status: "parcial", problemas: [problema] },
});

export const getFotoOperativa = cache(async (): Promise<FotoOperativa> => {
  const res = await sbSelectAll("lineup_ultimas_ruedas?select=*", 900);
  if (!res.ok) {
    return vacia(
      res.reason === "unconfigured"
        ? "Supabase sin configurar"
        : "Fuente line-up (ISA) no disponible",
    );
  }
  const raw = (Array.isArray(res.data) ? res.data : []) as Raw[];
  // Solo exportaciones (LOAD) de los productos prioritarios; guardamos la def del producto.
  const relevantes = raw
    .filter((r) => r.es_agro && r.ops === "LOAD" && r.vessel && productoDe(r.cargo))
    .map((r) => ({ r, prod: productoDe(r.cargo)! }));

  const ultima = relevantes.filter((x) => x.r.rueda_rank === 1);
  const previa = relevantes.filter((x) => x.r.rueda_rank === 2);
  if (ultima.length === 0) return vacia("Sin line-up reciente");

  const fecha = ultima[0].r.fecha_consulta;
  const fechaPrev = previa[0]?.r.fecha_consulta ?? null;

  // Tabla de buques (una fila por registro de la última rueda).
  const buques: BuqueRow[] = ultima.map(({ r, prod }) => ({
    vessel: r.vessel!,
    empresa: empresaDisplay(r.shipper),
    producto: prod.display,
    familia: prod.familia,
    toneladas: typeof r.quantity === "number" ? r.quantity : null,
    zona: zonaCarga(r.port, r.berth),
    muelle: r.berth?.trim() || null,
    destino: r.dest_orig?.trim() || null,
    etb: r.etb,
  }));

  // Agregación por producto (buques = vessels distintos; toneladas = suma).
  const tonPorCod = (rows: typeof ultima) => {
    const m = new Map<string, number>();
    for (const { r, prod } of rows) m.set(prod.codigo, (m.get(prod.codigo) ?? 0) + (r.quantity ?? 0));
    return m;
  };
  const tonU = tonPorCod(ultima);
  const tonP = tonPorCod(previa);
  const vesselsPorCod = new Map<string, Set<string>>();
  for (const { r, prod } of ultima) {
    if (!vesselsPorCod.has(prod.codigo)) vesselsPorCod.set(prod.codigo, new Set());
    vesselsPorCod.get(prod.codigo)!.add(r.vessel!);
  }
  const productos: ProductoAgg[] = PRODUCTOS.filter((p) => (tonU.get(p.codigo) ?? 0) > 0 || (vesselsPorCod.get(p.codigo)?.size ?? 0) > 0)
    .map((p) => ({
      codigo: p.codigo,
      display: p.display,
      familia: p.familia,
      buques: vesselsPorCod.get(p.codigo)?.size ?? 0,
      toneladas: tonU.get(p.codigo) ?? 0,
      deltaTon: previa.length > 0 ? (tonU.get(p.codigo) ?? 0) - (tonP.get(p.codigo) ?? 0) : null,
    }));

  // Agregación por zona operativa (excluye "Otros").
  const zonaMap = new Map<Zona, { ton: number; vessels: Set<string> }>();
  for (const z of ZONAS) zonaMap.set(z, { ton: 0, vessels: new Set() });
  for (const b of buques) {
    if (b.zona === "Otros") continue;
    const z = zonaMap.get(b.zona)!;
    z.ton += b.toneladas ?? 0;
    z.vessels.add(b.vessel);
  }
  const zonas: ZonaAgg[] = ZONAS.map((z) => ({
    zona: z,
    buques: zonaMap.get(z)!.vessels.size,
    toneladas: zonaMap.get(z)!.ton,
  }));

  // Qué cambió: buques nuevos vs la rueda anterior (por nombre de buque), ≥ umbral.
  const vesselsPrev = new Set(previa.map((x) => x.r.vessel!));
  const nuevosMap = new Map<string, BuqueNuevo>();
  for (const { r, prod } of ultima) {
    if (vesselsPrev.has(r.vessel!)) continue;
    const key = r.vessel!;
    if (!nuevosMap.has(key)) {
      nuevosMap.set(key, {
        vessel: r.vessel!, empresa: empresaDisplay(r.shipper), toneladas: 0,
        zona: zonaCarga(r.port, r.berth), etb: r.etb, productos: [],
      });
    }
    const n = nuevosMap.get(key)!;
    n.toneladas += r.quantity ?? 0;
    if (!n.productos.includes(prod.display)) n.productos.push(prod.display);
  }
  const nuevos = [...nuevosMap.values()]
    .filter((n) => n.toneladas >= UMBRAL_BUQUE_NUEVO_TN)
    .sort((a, b) => b.toneladas - a.toneladas);

  const totalBuques = new Set(buques.map((b) => b.vessel)).size;
  const totalTon = buques.reduce((s, b) => s + (b.toneladas ?? 0), 0);

  return {
    fecha, fechaPrev, productos, zonas, buques, nuevos, totalTon, totalBuques,
    meta: { source: SOURCE, updatedAt: null, status: "real", problemas: [] },
  };
});
