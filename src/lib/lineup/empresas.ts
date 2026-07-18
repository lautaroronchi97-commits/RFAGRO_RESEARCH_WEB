import "server-only";
import { cache } from "react";
import { sbSelectAll } from "../supabase";
import type { Meta } from "../market";
import { PRODUCTOS, productoDe, type Familia } from "./config";
import { zonaCarga, type Zona } from "./zonas";
import { canonShipper } from "./shippers";
import { campaniaIniYear, campanaLabel, parseFechaUTC } from "./campanas";
import { senalDe, ratioCobertura, type Senal } from "./cobertura";

/**
 * Panel de empresas del comercio exterior (Fase 2). Cruza la DJVE (declarado) con el
 * line-up (originado) para leer, por exportador normalizado:
 *  - Gap de cobertura FOTO FORWARD (60d): ¿le faltan barcos para lo declarado? → señal.
 *  - AVANCE de campaña: declarado vs originado acumulado desde el arranque de la campaña.
 *  - RITMO estacional: line-up parado hoy vs lo normal para esta época (5 campañas).
 *  - Share por producto/zona, y campaña NUEVA vs VIEJA (atribución por embarque).
 *  - TRÁNSITO PY/UY aparte (no tiene DJVE argentina → fuera del ratio).
 *
 * Todo se agrega en el server. Lógica portada de LineUps_Code (cobertura.py/campanas.py).
 */

const SOURCE = "ISA Agents · SAGyP";
const HORIZONTE_DIAS = 60;

type SnapRow = {
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
type DjveRow = {
  shipper_raw: string | null; cod: string; opcion: string | null; camp_ini: number;
  declarado_tn: number | null; n_djve: number; declarado_60d_tn: number | null; n_djve_60d: number;
};
type OrigRow = { shipper_raw: string | null; cod: string; camp_ini: number; originado_tn: number | null; n_visitas: number };
type EstacRow = { shipper_raw: string | null; cod: string; k: number; standing_tn: number | null; standing_buques: number | null; n_snaps: number };

export type ProductoGap = {
  cod: string; display: string; familia: Familia;
  declarado60d: number; originado60d: number; faltaCubrir: number; ratio: number | null; senal: Senal;
  declaradoNueva: number; declaradoVieja: number; campNueva: string; campVieja: string;
  declaradoDisp: number; declaradoForward: number; // opción 30 vs 360 (campaña en curso)
};
export type EmpresaRow = {
  empresa: string;
  declarado60d: number; originado60d: number; faltaCubrir: number; ratio: number | null; senal: Senal;
  declaradoCamp: number; originadoCamp: number;
  buques: number; standing: number; transito: number;
  ritmoActual: number | null; ritmoNormal: number | null; ritmoRatio: number | null; ritmoN: number;
  porProducto: { display: string; ton: number }[];
  porZona: { zona: Zona; ton: number }[];
};
export type EmpresasData = {
  fecha: string | null;
  productos: ProductoGap[];
  empresas: EmpresaRow[];
  transitoTotal: number;
  meta: Meta;
};

function empresaDisplay(shipper: string | null): { empresa: string; origen: "PY" | "UY" | null } {
  const { canon, origen } = canonShipper(shipper);
  return { empresa: canon !== "OTROS" ? canon : (shipper?.trim() || "OTROS"), origen };
}

const vacia = (problema: string): EmpresasData => ({
  fecha: null, productos: [], empresas: [], transitoTotal: 0,
  meta: { source: SOURCE, updatedAt: null, status: "parcial", problemas: [problema] },
});

/** Suma acumulando en un Map por clave. */
function add<K>(m: Map<K, number>, k: K, v: number) { m.set(k, (m.get(k) ?? 0) + v); }

export const getEmpresas = cache(async (): Promise<EmpresasData> => {
  const [snapRes, djveRes, origRes, estRes] = await Promise.all([
    sbSelectAll("lineup_ultimas_ruedas?select=*", 900),
    sbSelectAll("djve_cobertura?select=*", 900),
    sbSelectAll("lineup_originado_campana?select=*", 900),
    sbSelectAll("lineup_estacional?select=*", 900),
  ]);
  if (!snapRes.ok || !djveRes.ok) {
    const unconf = snapRes.ok ? djveRes : snapRes;
    return vacia(
      "reason" in unconf && unconf.reason === "unconfigured"
        ? "Supabase sin configurar"
        : "Fuente de comercio exterior no disponible",
    );
  }
  const snaps = (snapRes.data as SnapRow[]).filter((r) => r.rueda_rank === 1);
  const djve = (djveRes.data as DjveRow[]);
  const orig = (origRes.ok ? (origRes.data as OrigRow[]) : []);
  const est = (estRes.ok ? (estRes.data as EstacRow[]) : []);

  const fecha = snaps[0]?.fecha_consulta ?? null;
  if (!fecha) return vacia("Sin line-up reciente");
  const ref = parseFechaUTC(fecha)!;
  const refMs = ref.getTime();
  const finVentanaMs = refMs + HORIZONTE_DIAS * 86_400_000;

  // Campaña en curso por cod (según la última rueda) → para separar nueva vs vieja.
  const campActual = new Map<string, number>();
  for (const p of PRODUCTOS) campActual.set(p.codigo, campaniaIniYear(p.codigo, ref));

  // ---- Snapshot (última rueda): originado 60d, standing, transito, share ----
  // Estructuras por empresa canónica.
  type Acc = {
    orig60: Map<string, number>; // por cod
    standing: number; transito: number; buques: Set<string>;
    porProd: Map<string, number>; porZona: Map<Zona, number>;
  };
  const emp = new Map<string, Acc>();
  const getAcc = (e: string): Acc => {
    let a = emp.get(e);
    if (!a) { a = { orig60: new Map(), standing: 0, transito: 0, buques: new Set(), porProd: new Map(), porZona: new Map() }; emp.set(e, a); }
    return a;
  };
  // Originado 60d por producto (agregado) y transito total.
  const orig60Prod = new Map<string, number>();
  let transitoTotal = 0;

  for (const r of snaps) {
    if (!r.es_agro || r.ops !== "LOAD" || !r.vessel) continue;
    const prod = productoDe(r.cargo);
    if (!prod) continue;
    const q = r.quantity ?? 0;
    const { empresa, origen } = empresaDisplay(r.shipper);
    if (origen) { // tránsito PY/UY: fuera del ratio, se muestra aparte
      transitoTotal += q;
      getAcc(empresa).transito += q;
      continue;
    }
    const a = getAcc(empresa);
    a.standing += q;
    a.buques.add(r.vessel);
    add(a.porProd, prod.display, q);
    add(a.porZona, zonaCarga(r.port, r.berth), q);
    // Ventana 60d para el gap foto-forward.
    const etbMs = r.etb ? parseFechaUTC(r.etb)?.getTime() ?? null : null;
    if (etbMs !== null && etbMs >= refMs && etbMs <= finVentanaMs) {
      add(a.orig60, prod.codigo, q);
      add(orig60Prod, prod.codigo, q);
    }
  }

  // ---- DJVE: declarado 60d, declarado campaña (nueva/vieja), disponible/forward ----
  const decl60Emp = new Map<string, Map<string, number>>(); // empresa → cod → tn
  const declCampEmp = new Map<string, number>(); // empresa → tn campaña en curso
  const decl60Prod = new Map<string, number>();
  const declNuevaProd = new Map<string, number>();
  const declViejaProd = new Map<string, number>();
  const declDispProd = new Map<string, number>(); // opción 30, campaña en curso
  const declFwdProd = new Map<string, number>(); // opción 360, campaña en curso

  for (const d of djve) {
    if (!productoDe(d.cod)) continue; // solo productos prioritarios
    const { empresa, origen } = empresaDisplay(d.shipper_raw);
    if (origen) continue; // (raro en DJVE) por consistencia AR-only
    const d60 = Number(d.declarado_60d_tn ?? 0);
    const dTot = Number(d.declarado_tn ?? 0);
    if (d60 > 0) {
      if (!decl60Emp.has(empresa)) decl60Emp.set(empresa, new Map());
      add(decl60Emp.get(empresa)!, d.cod, d60);
      add(decl60Prod, d.cod, d60);
    }
    const esActual = Number(d.camp_ini) === campActual.get(d.cod);
    if (esActual) {
      add(declCampEmp, empresa, dTot);
      add(declDispProd, d.cod, d.opcion === "30" ? dTot : 0);
      add(declFwdProd, d.cod, d.opcion === "360" ? dTot : 0);
      add(declNuevaProd, d.cod, dTot);
    } else {
      add(declViejaProd, d.cod, dTot);
    }
  }

  // ---- Originado de campaña (acumulado, proxy line-up, AR) ----
  const origCampEmp = new Map<string, number>();
  const origCampProd = new Map<string, number>();
  for (const o of orig) {
    if (!productoDe(o.cod)) continue;
    if (Number(o.camp_ini) !== campActual.get(o.cod)) continue; // campaña en curso
    const { empresa, origen } = empresaDisplay(o.shipper_raw);
    if (origen) continue;
    const t = Number(o.originado_tn ?? 0);
    add(origCampEmp, empresa, t);
    add(origCampProd, o.cod, t);
  }

  // ---- Ritmo estacional: actual (k=0) vs promedio de años previos (k=1..5) ----
  // est[empresa][cod][k] = standing sumado (varias razones sociales → misma canónica).
  const estMap = new Map<string, Map<string, Map<number, number>>>();
  for (const e of est) {
    const { empresa, origen } = empresaDisplay(e.shipper_raw);
    if (origen) continue;
    if (!estMap.has(empresa)) estMap.set(empresa, new Map());
    const byCod = estMap.get(empresa)!;
    if (!byCod.has(e.cod)) byCod.set(e.cod, new Map());
    const kk = Number(e.k);
    byCod.get(e.cod)!.set(kk, (byCod.get(e.cod)!.get(kk) ?? 0) + Number(e.standing_tn ?? 0));
  }
  function ritmo(empresa: string): { actual: number | null; normal: number | null; ratio: number | null; n: number } {
    const byCod = estMap.get(empresa);
    if (!byCod) return { actual: null, normal: null, ratio: null, n: 0 };
    let actual = 0, normal = 0, nMax = 0, hayComparable = false;
    for (const [, ks] of byCod) {
      const a0 = ks.get(0) ?? 0;
      const priors: number[] = [];
      for (let k = 1; k <= 5; k++) { const v = ks.get(k); if (v !== undefined) priors.push(v); }
      if (priors.length === 0) continue; // sin historia comparable para ese cod
      hayComparable = true;
      actual += a0;
      normal += priors.reduce((s, v) => s + v, 0) / priors.length;
      nMax = Math.max(nMax, priors.length);
    }
    if (!hayComparable) return { actual: null, normal: null, ratio: null, n: 0 };
    return { actual, normal, ratio: normal > 0 ? actual / normal : null, n: nMax };
  }

  // ---- Armar filas por producto (gap agregado) ----
  const productos: ProductoGap[] = PRODUCTOS.map((p) => {
    const declarado60d = decl60Prod.get(p.codigo) ?? 0;
    const originado60d = orig60Prod.get(p.codigo) ?? 0;
    const campN = campActual.get(p.codigo)!;
    return {
      cod: p.codigo, display: p.display, familia: p.familia,
      declarado60d, originado60d,
      faltaCubrir: declarado60d - originado60d,
      ratio: ratioCobertura(declarado60d, originado60d),
      senal: senalDe(declarado60d, originado60d),
      declaradoNueva: declNuevaProd.get(p.codigo) ?? 0,
      declaradoVieja: declViejaProd.get(p.codigo) ?? 0,
      campNueva: campanaLabel(campN), campVieja: campanaLabel(campN - 1),
      declaradoDisp: declDispProd.get(p.codigo) ?? 0,
      declaradoForward: declFwdProd.get(p.codigo) ?? 0,
    };
  }).filter((x) => x.declarado60d > 0 || x.originado60d > 0 || x.declaradoNueva > 0);

  // ---- Armar filas por empresa ----
  const nombres = new Set<string>([...emp.keys(), ...decl60Emp.keys(), ...declCampEmp.keys(), ...origCampEmp.keys(), ...estMap.keys()]);
  const empresas: EmpresaRow[] = [];
  for (const nombre of nombres) {
    if (nombre === "OTROS") continue; // OTROS se maneja como bucket final si hace falta
    const a = emp.get(nombre);
    const decl60 = [...(decl60Emp.get(nombre)?.values() ?? [])].reduce((s, v) => s + v, 0);
    const orig60 = a ? [...a.orig60.values()].reduce((s, v) => s + v, 0) : 0;
    const r = ritmo(nombre);
    empresas.push({
      empresa: nombre,
      declarado60d: decl60, originado60d: orig60,
      faltaCubrir: decl60 - orig60, ratio: ratioCobertura(decl60, orig60), senal: senalDe(decl60, orig60),
      declaradoCamp: declCampEmp.get(nombre) ?? 0, originadoCamp: origCampEmp.get(nombre) ?? 0,
      buques: a?.buques.size ?? 0, standing: a?.standing ?? 0, transito: a?.transito ?? 0,
      ritmoActual: r.actual, ritmoNormal: r.normal, ritmoRatio: r.ratio, ritmoN: r.n,
      porProducto: a ? [...a.porProd.entries()].map(([display, ton]) => ({ display, ton })).sort((x, y) => y.ton - x.ton) : [],
      porZona: a ? [...a.porZona.entries()].map(([zona, ton]) => ({ zona, ton })).filter((z) => z.zona !== "Otros" && z.ton > 0).sort((x, y) => y.ton - x.ton) : [],
    });
  }
  // Orden: más "corta" y con más volumen primero (por falta a cubrir 60d, luego standing).
  empresas.sort((a, b) => (b.faltaCubrir - a.faltaCubrir) || (b.standing - a.standing));

  const status: Meta["status"] = "real";
  const problemas: string[] = [];
  if (!origRes.ok) problemas.push("Avance de campaña no disponible");
  if (!estRes.ok) problemas.push("Ritmo estacional no disponible");

  return {
    fecha, productos, empresas, transitoTotal,
    meta: { source: SOURCE, updatedAt: null, status, problemas },
  };
});
