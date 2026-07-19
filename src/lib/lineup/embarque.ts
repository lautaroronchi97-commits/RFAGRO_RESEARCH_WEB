import "server-only";
import { cache } from "react";
import { sbSelect, sbSelectAll } from "../supabase";
import type { Meta } from "../market";
import { PRODUCTOS, type Familia } from "./config";
import { campaniaIniYear, campanaLabel, parseFechaUTC } from "./campanas";
import { getCurvaGranos } from "../curva";

/**
 * Mesa de embarque (Fase 3 del plan de puertos): el programa de embarques declarado
 * en DJVE por MES × producto, leído en el idioma de las posiciones A3, cruzado con
 * el line-up solo donde el cruce es físicamente posible (el mes en curso).
 *
 * Diseño basado en el research de DJVE (docs/negocio/05_djve_marco_y_circuito.md):
 *  - El tonelaje granel declara ventana de embarque MENSUAL por norma (Res. 128/2019:
 *    período de 30 días corridos) → el "mes declarado" es un dato limpio. La vista
 *    `djve_embarques_mes` reparte por días la ventana entre los (≤2) meses que toca y
 *    filtra el ruido no-granel (ventanas ~90 días, 0,3% del tonelaje).
 *  - opción 30 = disponible (la ventana arranca el día del registro, derechos al embarcar);
 *    opción 360 = forward (compromiso caro: 90% de los derechos a los 5 días hábiles).
 *  - El line-up solo "ve" ~10 días (mediana medida en nuestra base) → los meses lejanos
 *    NO se cruzan contra barcos; se leen como programa declarado.
 *  - El mes en curso suele dar line-up > declarado-del-mes: los buques de hoy cumplen
 *    ventanas viejas (+ prórroga automática +30d + anticipación 15d). Se lee como
 *    cumplimiento, no como señal bajista.
 */

const SOURCE = "SAGyP · ISA Agents · Matba Rofex";
const MESES_ADELANTE = 6; // mes corriente + 6 = 7 columnas

const MES_ABREV = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
/** Grano DJVE → underlying A3 (solo los que cotizan en Matba Rofex). */
const COD_A3: Record<string, string> = { SBS: "SOJ", MAIZE: "MAI", WHEAT: "TRI" };

type EmbRow = { cod: string; opcion: string | null; camp_ini: number; mes: string; declarado_tn: number | null; n_tramos: number };
type LupRow = { cod: string; mes: string; camp_ini: number; embarcado_tn: number | null; buques: number | null };

export type PosMesA3 = { posicion: string; precio: number; exacta: boolean };
export type MesCol = { mes: string; label: string };
export type CeldaMes = {
  declarado: number;
  disp: number; // opción 30
  fwd: number; // opción 360
  anioPrevio: number | null; // declarado del mes análogo de la campaña pasada (programa FINAL)
  embarcado: number | null; // line-up del mes (solo si hay dato)
  buques: number | null;
  campLabel: string; // campaña comercial a la que pertenece el mes para este grano
  a3: PosMesA3 | null; // posición A3 contra la que se lee el mes (solo soja/maíz/trigo)
};
export type ProductoMesa = {
  cod: string;
  display: string;
  familia: Familia;
  celdas: CeldaMes[]; // alineadas 1:1 con meses[]
  totalProximos: number; // declarado de los meses futuros (sin el corriente)
};
export type CumplimientoMes = { display: string; declarado: number; embarcado: number; buques: number; ratio: number | null };
export type MesaEmbarque = {
  hoy: string;
  fechaLineup: string | null;
  meses: MesCol[];
  productos: ProductoMesa[];
  cumplimiento: CumplimientoMes[];
  totalFwdProximos: number;
  pico: { display: string; label: string; ton: number } | null; // el (producto, mes futuro) más cargado
  meta: Meta;
};

/** "2026-07-01" + n meses (UTC, siempre día 1). */
function addMeses(mesISO: string, n: number): string {
  const d = parseFechaUTC(mesISO)!;
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function labelMes(mesISO: string): string {
  const d = parseFechaUTC(mesISO)!;
  return `${MES_ABREV[d.getUTCMonth()]}${String(d.getUTCFullYear()).slice(-2)}`;
}

/** Primer día del mes actual en zona Córdoba, como "YYYY-MM-01". */
function mesActualCordoba(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return `${parts.slice(0, 7)}-01`;
}

const vacia = (problema: string): MesaEmbarque => ({
  hoy: mesActualCordoba(), fechaLineup: null, meses: [], productos: [], cumplimiento: [],
  totalFwdProximos: 0, pico: null,
  meta: { source: SOURCE, updatedAt: null, status: "parcial", problemas: [problema] },
});

export const getMesaEmbarque = cache(async (): Promise<MesaEmbarque> => {
  const mes0 = mesActualCordoba();
  const desde = addMeses(mes0, -12); // cubre el mes análogo del año previo de todas las columnas
  const cods = PRODUCTOS.map((p) => p.codigo).join(",");

  const [embRes, lupRes, ruedaRes, curva] = await Promise.all([
    sbSelectAll(`djve_embarques_mes?select=*&mes=gte.${desde}&cod=in.(${cods})`, 900),
    sbSelectAll(`lineup_embarcado_mes?select=*&mes=gte.${addMeses(mes0, -1)}`, 900),
    sbSelect("lineup_ultimas_ruedas?select=fecha_consulta&rueda_rank=eq.1&limit=1", 900),
    getCurvaGranos(),
  ]);
  if (!embRes.ok) {
    return vacia(embRes.reason === "unconfigured" ? "Supabase sin configurar" : "Fuente DJVE no disponible");
  }
  const emb = (embRes.data as EmbRow[]).map((r) => ({ ...r, declarado_tn: Number(r.declarado_tn ?? 0) }));
  const lup = (lupRes.ok ? (lupRes.data as LupRow[]) : []).map((r) => ({
    ...r, embarcado_tn: Number(r.embarcado_tn ?? 0), buques: Number(r.buques ?? 0),
  }));
  const fechaLineup = ruedaRes.ok && Array.isArray(ruedaRes.data) && ruedaRes.data[0]
    ? (ruedaRes.data[0] as { fecha_consulta: string }).fecha_consulta
    : null;

  const meses: MesCol[] = Array.from({ length: MESES_ADELANTE + 1 }, (_, i) => {
    const mes = addMeses(mes0, i);
    return { mes, label: labelMes(mes) };
  });

  // Índices (cod|mes → tn). El declarado se separa por opción; camp_ini de la vista
  // es la campaña del MES (atribución por mes del tramo), se usa solo como etiqueta.
  const decl = new Map<string, { total: number; disp: number; fwd: number }>();
  for (const r of emb) {
    const k = `${r.cod}|${r.mes}`;
    const d = decl.get(k) ?? { total: 0, disp: 0, fwd: 0 };
    d.total += r.declarado_tn;
    if (r.opcion === "30") d.disp += r.declarado_tn;
    else if (r.opcion === "360") d.fwd += r.declarado_tn;
    decl.set(k, d);
  }
  const emba = new Map<string, { ton: number; buques: number }>();
  for (const r of lup) {
    const k = `${r.cod}|${r.mes}`;
    const e = emba.get(k) ?? { ton: 0, buques: 0 };
    e.ton += r.embarcado_tn;
    e.buques += r.buques;
    emba.set(k, e);
  }

  // Posiciones A3 vivas por underlying, ordenadas (de curva.ts, ya filtradas a vivas).
  const posPorGrano = new Map(curva.granos.map((g) => [g.underlying, g.posiciones]));
  function a3De(cod: string, mesISO: string): PosMesA3 | null {
    const u = COD_A3[cod];
    if (!u) return null;
    const posiciones = posPorGrano.get(u);
    if (!posiciones || posiciones.length === 0) return null;
    const key = mesISO.slice(0, 7); // "2026-08"
    const exacta = posiciones.find((p) => p.vto.slice(0, 7) === key);
    if (exacta) return { posicion: exacta.posicion, precio: exacta.precio, exacta: true };
    const siguiente = posiciones.find((p) => p.vto.slice(0, 7) > key);
    return siguiente ? { posicion: siguiente.posicion, precio: siguiente.precio, exacta: false } : null;
  }

  const productos: ProductoMesa[] = PRODUCTOS.map((p) => {
    const celdas: CeldaMes[] = meses.map(({ mes }, i) => {
      const d = decl.get(`${p.codigo}|${mes}`);
      const dPrev = decl.get(`${p.codigo}|${addMeses(mes, -12)}`);
      const e = emba.get(`${p.codigo}|${mes}`);
      return {
        declarado: d?.total ?? 0,
        disp: d?.disp ?? 0,
        fwd: d?.fwd ?? 0,
        anioPrevio: dPrev ? dPrev.total : null,
        embarcado: i <= 1 && e ? e.ton : null, // el line-up solo ve ~10 días: corriente y borde del próximo
        buques: i <= 1 && e ? e.buques : null,
        campLabel: campanaLabel(campaniaIniYear(p.codigo, parseFechaUTC(mes)!)),
        a3: a3De(p.codigo, mes),
      };
    });
    return {
      cod: p.codigo, display: p.display, familia: p.familia, celdas,
      totalProximos: celdas.slice(1).reduce((s, c) => s + c.declarado, 0),
    };
  }).filter((p) => p.celdas.some((c) => c.declarado > 0 || (c.embarcado ?? 0) > 0));

  // Cumplimiento del mes en curso: declarado del mes vs line-up del mes.
  const cumplimiento: CumplimientoMes[] = productos
    .map((p) => {
      const c = p.celdas[0];
      const e = emba.get(`${p.cod}|${mes0}`);
      return {
        display: p.display,
        declarado: c.declarado,
        embarcado: e?.ton ?? 0,
        buques: e?.buques ?? 0,
        ratio: c.declarado > 0 ? (e?.ton ?? 0) / c.declarado : null,
      };
    })
    .filter((x) => x.declarado > 0 || x.embarcado > 0)
    .sort((a, b) => b.declarado - a.declarado);

  const totalFwdProximos = productos.reduce((s, p) => s + p.totalProximos, 0);
  let pico: MesaEmbarque["pico"] = null;
  for (const p of productos) {
    for (let i = 1; i < meses.length; i++) {
      const ton = p.celdas[i].declarado;
      if (ton > (pico?.ton ?? 0)) pico = { display: p.display, label: meses[i].label, ton };
    }
  }

  const problemas: string[] = [];
  if (!lupRes.ok) problemas.push("Line-up no disponible (sin cruce del mes en curso)");
  if (curva.granos.length === 0) problemas.push("Curva A3 no disponible");

  return {
    hoy: mes0, fechaLineup, meses, productos, cumplimiento, totalFwdProximos, pico,
    meta: { source: SOURCE, updatedAt: null, status: "real", problemas },
  };
});
