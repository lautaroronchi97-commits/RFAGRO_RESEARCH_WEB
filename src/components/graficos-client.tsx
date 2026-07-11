"use client";

import * as React from "react";
import type { SerieCat, SeriePuntos, Fuente } from "@/lib/series-types";
import {
  joinFfill, metricaDiaria, alinear, mesDePosicion,
  type Metric, type Eje,
} from "@/lib/derivadas";
import { nfmt } from "@/lib/format";
import { SpreadChart, type CampLine } from "./spread-chart";

/**
 * Panel de gráficos de spreads entre cosechas (/graficos). Motor genérico:
 * pata A vs pata B (cualquier serie del catálogo) × métrica × campañas
 * superpuestas. Decisiones de Lautaro (11/07) cableadas: eje días-al-vto por
 * índice de rueda (P1), spread lejana−cercana / empate caro−barato (P7),
 * ventana 12m (P3). Todo el estado va a la URL (compartible por WhatsApp).
 */

const MESES = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
const GRANO_NOMBRE: Record<string, string> = {
  soja: "Soja", maiz: "Maíz", trigo: "Trigo", girasol: "Girasol", sorgo: "Sorgo",
};
const FUENTE_NOMBRE: Record<Fuente, string> = { a3: "A3", cbot: "Chicago", pizarra: "Pizarra" };
const FALLBACK_COLORS = ["#2A78D6","#D96A2A","#0891B2","#B45309","#DB5A9B","#9333EA","#0F9E8C","#7C4FD0"];

type Pata = { fuente: Fuente; grano: string; mon: string | null }; // mon null = pizarra
type PataResuelta = { serieId: string; vto: string | null };

/* ---------------- índice del catálogo ---------------- */

type Idx = {
  granosPorFuente: Record<Fuente, string[]>;
  monsPorGF: Map<string, string[]>; // `${fuente}:${grano}` → meses (["ABR","JUL",…])
  resolver: (p: Pata, year: number) => PataResuelta | null;
  aniosPizarra: (grano: string) => number[];
};

function construirIdx(cat: SerieCat[]): Idx {
  const granosPorFuente: Record<Fuente, Set<string>> = { a3: new Set(), cbot: new Set(), pizarra: new Set() };
  const monsPorGF = new Map<string, Set<string>>();
  // clave de resolución exacta: `${fuente}:${grano}:${mon}:${year}` → SerieCat
  const exact = new Map<string, SerieCat>();
  const pizYears = new Map<string, Set<number>>();

  for (const c of cat) {
    granosPorFuente[c.fuente].add(c.grano);
    if (c.fuente === "pizarra") {
      const y0 = Number(c.desde.slice(0, 4));
      const y1 = Number(c.hasta.slice(0, 4));
      const set = pizYears.get(c.grano) ?? new Set<number>();
      for (let y = y0; y <= y1; y++) set.add(y);
      pizYears.set(c.grano, set);
      continue;
    }
    if (!c.posicion) continue;
    const mon = c.posicion.slice(0, 3);
    const yy = Number(c.posicion.slice(3));
    const year = 2000 + yy;
    const gk = `${c.fuente}:${c.grano}`;
    const ms = monsPorGF.get(gk) ?? new Set<string>();
    ms.add(mon);
    monsPorGF.set(gk, ms);
    exact.set(`${c.fuente}:${c.grano}:${mon}:${year}`, c);
  }

  const ordMes = (a: string, b: string) => MESES.indexOf(a) - MESES.indexOf(b);
  const monsSorted = new Map<string, string[]>();
  for (const [k, v] of monsPorGF) monsSorted.set(k, [...v].sort(ordMes));

  return {
    granosPorFuente: {
      a3: [...granosPorFuente.a3].sort(),
      cbot: [...granosPorFuente.cbot].sort(),
      pizarra: [...granosPorFuente.pizarra].sort(),
    },
    monsPorGF: monsSorted,
    resolver: (p, year) => {
      if (p.fuente === "pizarra") return { serieId: `pizarra:${p.grano}`, vto: null };
      if (!p.mon) return null;
      const c = exact.get(`${p.fuente}:${p.grano}:${p.mon}:${year}`);
      return c ? { serieId: c.serieId, vto: c.vencimiento } : null;
    },
    aniosPizarra: (grano) => [...(pizYears.get(grano) ?? new Set<number>())].sort(),
  };
}

/* ---------------- estado en la URL ---------------- */

function pataToStr(p: Pata): string {
  return `${p.fuente}:${p.grano}:${p.mon ?? ""}`;
}
function pataFromStr(s: string | null): Pata | null {
  if (!s) return null;
  const [fuente, grano, mon] = s.split(":");
  if (!fuente || !grano) return null;
  if (fuente !== "a3" && fuente !== "cbot" && fuente !== "pizarra") return null;
  return { fuente, grano, mon: mon || null };
}

type Estado = {
  a: Pata; b: Pata | null; metric: Metric; eje: Eje; ventanaMeses: number; years: number[];
};

function leerURL(): Partial<Estado> {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const a = pataFromStr(q.get("a"));
  const b = pataFromStr(q.get("b"));
  const metric = (["spread", "ratio", "crudo"] as const).find((m) => m === q.get("m"));
  const eje = (["vto", "cal"] as const).find((e) => e === q.get("eje"));
  const v = Number(q.get("v"));
  const years = (q.get("c") ?? "").split(",").map(Number).filter((n) => n >= 2020 && n <= 2100);
  const out: Partial<Estado> = {};
  if (a) out.a = a;
  if (b) out.b = b;
  if (metric) out.metric = metric;
  if (eje) out.eje = eje;
  if (Number.isFinite(v) && v > 0) out.ventanaMeses = v;
  if (years.length) out.years = years;
  return out;
}

function escribirURL(e: Estado) {
  if (typeof window === "undefined") return;
  const q = new URLSearchParams();
  q.set("a", pataToStr(e.a));
  if (e.b) q.set("b", pataToStr(e.b));
  q.set("m", e.metric);
  q.set("eje", e.eje);
  q.set("v", String(e.ventanaMeses));
  q.set("c", e.years.join(","));
  window.history.replaceState(null, "", `?${q.toString()}`);
}

/* ---------------- presets ---------------- */

const PRESETS: { id: string; label: string; e: Partial<Estado> }[] = [
  {
    id: "mai-abr-jul",
    label: "Maíz ABR vs JUL",
    e: { a: { fuente: "a3", grano: "maiz", mon: "ABR" }, b: { fuente: "a3", grano: "maiz", mon: "JUL" }, metric: "spread" },
  },
  {
    id: "mai-abr-soj-may",
    label: "Maíz ABR vs Soja MAY (Excel)",
    e: { a: { fuente: "a3", grano: "maiz", mon: "ABR" }, b: { fuente: "a3", grano: "soja", mon: "MAY" }, metric: "spread" },
  },
];

/* ---------------- colores según tema ---------------- */

function useCampColors(years: number[]): Record<number, string> {
  const key = years.join(",");
  const [colors, setColors] = React.useState<Record<number, string>>({});
  React.useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const m: Record<number, string> = {};
      years.forEach((y, i) => {
        const v = cs.getPropertyValue(`--camp-${y}`).trim();
        m[y] = v || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      });
      setColors(m);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return colors;
}

/* ---------------- componente ---------------- */

export function GraficosClient({ catalogo }: { catalogo: SerieCat[] }) {
  const idx = React.useMemo(() => construirIdx(catalogo), [catalogo]);
  const [mounted, setMounted] = React.useState(false);

  const inicial = React.useMemo(() => {
    const url = leerURL();
    const base = PRESETS[0].e;
    return {
      a: url.a ?? base.a!,
      b: url.b !== undefined ? url.b : base.b ?? { fuente: "a3", grano: "maiz", mon: "JUL" },
      metric: url.metric ?? base.metric ?? "spread",
      eje: url.eje ?? "vto",
      ventanaMeses: url.ventanaMeses ?? 12,
      years: url.years ?? [],
    } as Estado;
  }, []);

  const [a, setA] = React.useState<Pata>(inicial.a);
  const [b, setB] = React.useState<Pata | null>(inicial.b);
  const [metric, setMetric] = React.useState<Metric>(inicial.metric);
  const [eje, setEje] = React.useState<Eje>(inicial.eje);
  const [ventanaMeses, setVentanaMeses] = React.useState<number>(inicial.ventanaMeses);
  const [years, setYears] = React.useState<number[]>(inicial.years);

  const [series, setSeries] = React.useState<Record<string, SeriePuntos>>({});
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  // Años disponibles = donde resuelven AMBAS patas (o una si no hay B).
  const aniosDisponibles = React.useMemo(() => {
    const cand = new Set<number>();
    for (let y = 2020; y <= 2030; y++) {
      const ra = idx.resolver(a, y);
      if (!ra) continue;
      if (b) { if (!idx.resolver(b, y)) continue; }
      cand.add(y);
    }
    // pizarra: años calendario disponibles
    if (a.fuente === "pizarra") idx.aniosPizarra(a.grano).forEach((y) => cand.add(y));
    return [...cand].sort();
  }, [idx, a, b]);

  // Selección efectiva: lo elegido (filtrado a lo disponible) o TODAS si está vacío.
  // Derivado (no estado): evita sincronizar en un effect.
  const effectiveYears = React.useMemo(() => {
    const valid = years.filter((y) => aniosDisponibles.includes(y));
    return valid.length ? valid : aniosDisponibles;
  }, [years, aniosDisponibles]);

  // Sincronizar estado → URL (external sync, sin setState).
  React.useEffect(() => {
    escribirURL({ a, b, metric, eje, ventanaMeses, years: effectiveYears });
  }, [a, b, metric, eje, ventanaMeses, effectiveYears]);

  // Resolver campañas seleccionadas → serieIds + rango, y traer /api/series.
  React.useEffect(() => {
    const ventanaDias = Math.round(ventanaMeses * 30.4375);
    const campanias = effectiveYears
      .map((year) => {
        const ra = idx.resolver(a, year);
        const rb = b ? idx.resolver(b, year) : null;
        if (!ra || (b && !rb)) return null;
        const vtos = [ra.vto, rb?.vto].filter((v): v is string => !!v);
        const vto = vtos.length ? vtos.reduce((m, v) => (v < m ? v : m)) : `${year}-12-31`;
        return { year, ra, rb, vto, ventanaDias };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (campanias.length === 0) { setSeries({}); return; }

    const ids = new Set<string>();
    let from = "2100-01-01";
    let to = "2000-01-01";
    for (const c of campanias) {
      ids.add(c.ra.serieId);
      if (c.rb) ids.add(c.rb.serieId);
      const desde = isoMenosDias(c.vto, c.ventanaDias);
      if (desde < from) from = desde;
      if (c.vto > to) to = c.vto;
    }

    let cancel = false;
    setCargando(true);
    setError(null);
    const url = `/api/series?ids=${encodeURIComponent([...ids].join(","))}&from=${from}&to=${to}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j: { series: SeriePuntos[] }) => {
        if (cancel) return;
        const map: Record<string, SeriePuntos> = {};
        for (const s of j.series ?? []) map[s.id] = s;
        setSeries(map);
      })
      .catch((e: unknown) => { if (!cancel) setError(e instanceof Error ? e.message : "error"); })
      .finally(() => { if (!cancel) setCargando(false); });
    return () => { cancel = true; };
  }, [idx, a, b, effectiveYears, ventanaMeses]);

  const colors = useCampColors(aniosDisponibles);
  const vigenteYear = effectiveYears.length ? Math.max(...effectiveYears) : null;

  // Calcular las líneas del chart a partir de las series traídas.
  const lines = React.useMemo<CampLine[]>(() => {
    const ventanaDias = Math.round(ventanaMeses * 30.4375);
    const out: CampLine[] = [];
    for (const year of [...effectiveYears].sort()) {
      const ra = idx.resolver(a, year);
      const rb = b ? idx.resolver(b, year) : null;
      if (!ra) continue;
      const sa = series[ra.serieId];
      if (!sa) continue;
      const color = colors[year] ?? FALLBACK_COLORS[year % FALLBACK_COLORS.length];
      const vigente = year === vigenteYear;
      const vtos = [ra.vto, rb?.vto].filter((v): v is string => !!v);
      const vto = vtos.length ? vtos.reduce((m, v) => (v < m ? v : m)) : `${year}-12-31`;

      // Una sola pata → serie cruda alineada.
      if (!b || !rb) {
        const puntos = alinear(sa.d.map((f, i) => ({ f, y: sa.v[i] })), vto, eje, ventanaDias);
        if (puntos.length) out.push({ key: String(year), label: String(year), color, vigente, data: puntos });
        continue;
      }
      const sb = series[rb.serieId];
      if (!sb) continue;

      if (metric === "crudo") {
        const pa = alinear(sa.d.map((f, i) => ({ f, y: sa.v[i] })), vto, eje, ventanaDias);
        const pb = alinear(sb.d.map((f, i) => ({ f, y: sb.v[i] })), vto, eje, ventanaDias);
        if (pa.length) out.push({ key: `${year}A`, label: `${year} · A`, color, vigente, data: pa });
        if (pb.length) out.push({ key: `${year}B`, label: `${year} · B`, color, vigente, dash: true, data: pb });
        continue;
      }

      // spread / ratio → ordenar patas y calcular métrica diaria + alinear.
      const [near, far] = ordenarPatas(sa, ra, sb, rb);
      const join = joinFfill(near, far);
      const met = metricaDiaria(join, metric); // spread = far − near ; ratio = near/far
      const puntos = alinear(met, vto, eje, ventanaDias);
      if (puntos.length) out.push({ key: String(year), label: String(year), color, vigente, data: puntos });
    }
    return out;
  }, [series, effectiveYears, idx, a, b, metric, eje, ventanaMeses, colors, vigenteYear]);

  const anchorMes = React.useMemo(() => {
    // Mes ancla del eje calendario = mes del vto de la pata A + 1 (aprox).
    const m = a.mon ? mesDePosicion(`${a.mon}00`) : 1;
    return (m % 12) + 1;
  }, [a.mon]);

  const decimals = metric === "ratio" ? 3 : 2;

  // KPI de la campaña vigente (v1: valor de la última rueda + min/máx de la ventana).
  const kpi = React.useMemo(() => {
    const ln = lines.find((l) => l.vigente) ?? lines.at(-1);
    if (!ln || ln.data.length === 0) return null;
    const ys = ln.data.map((p) => p.y);
    const hoy = ln.data.reduce((m, p) => (p.x > m.x ? p : m), ln.data[0]);
    return { label: ln.label, hoy: hoy.y, min: Math.min(...ys), max: Math.max(...ys) };
  }, [lines]);

  return (
    <div className="gx-wrap">
      <div className="gx-presets">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="gx-preset"
            onClick={() => {
              if (p.e.a) setA(p.e.a);
              setB(p.e.b !== undefined ? p.e.b : { fuente: "a3", grano: "maiz", mon: "JUL" });
              if (p.e.metric) setMetric(p.e.metric);
              setYears([]);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="gx-build">
        <PataSelector legend="Pata A" idx={idx} pata={a} onChange={(p) => p && setA(p)} />
        <button type="button" className="gx-swap" title="Intercambiar patas" aria-label="Intercambiar patas"
          onClick={() => { if (b) { const t = a; setA(b); setB(t); } }}>⇄</button>
        <PataSelector legend="Pata B" idx={idx} pata={b} onChange={setB} allowNone />

        <div className="gx-pata">
          <span className="gx-pata-lbl">Métrica</span>
          <div className="gx-seg" role="group" aria-label="Métrica">
            {(["spread", "ratio", "crudo"] as Metric[]).map((m) => (
              <button key={m} type="button" className={m === metric ? "on" : ""} onClick={() => setMetric(m)}>
                {m === "spread" ? "Spread US$" : m === "ratio" ? "Ratio" : "Crudas"}
              </button>
            ))}
          </div>
        </div>

        <div className="gx-pata">
          <span className="gx-pata-lbl">Eje X</span>
          <div className="gx-seg" role="group" aria-label="Eje X">
            <button type="button" className={eje === "vto" ? "on" : ""} onClick={() => setEje("vto")}>Días al vto</button>
            <button type="button" className={eje === "cal" ? "on" : ""} onClick={() => setEje("cal")}>Calendario</button>
          </div>
        </div>

        <div className="gx-pata">
          <span className="gx-pata-lbl">Ventana</span>
          <select value={ventanaMeses} onChange={(e) => setVentanaMeses(Number(e.target.value))} aria-label="Ventana en meses">
            {[3, 6, 12, 18, 24].map((m) => <option key={m} value={m}>{m} meses</option>)}
          </select>
        </div>
      </div>

      <div className="gx-chips">
        <span className="gx-chips-lbl">Campañas</span>
        {aniosDisponibles.map((y) => {
          const on = effectiveYears.includes(y);
          return (
            <button
              key={y}
              type="button"
              className={`gx-chip${y === vigenteYear ? " vig" : ""}`}
              aria-pressed={on}
              style={{ ["--c" as string]: colors[y] ?? "#888" }}
              onClick={() =>
                setYears(() => {
                  const base = on ? effectiveYears.filter((v) => v !== y) : [...effectiveYears, y];
                  return [...base].sort((m, n) => m - n);
                })
              }
            >
              <span className="sw" />{y}
            </button>
          );
        })}
        {aniosDisponibles.length > 0 && (
          <>
            <button type="button" className="gx-preset" onClick={() => setYears(aniosDisponibles.slice(-3))}>Últ. 3</button>
            <button type="button" className="gx-preset" onClick={() => setYears(aniosDisponibles)}>Todas</button>
          </>
        )}
      </div>

      <div className="gx-chart">
        {!mounted ? (
          <div className="gx-empty">Cargando gráfico…</div>
        ) : error ? (
          <div className="gx-empty">No se pudieron traer las series ({error}).</div>
        ) : lines.length === 0 ? (
          <div className="gx-empty">
            {cargando ? "Trayendo datos…" : "Elegí dos patas y al menos una campaña para ver el spread."}
          </div>
        ) : (
          <SpreadChart lines={lines} eje={eje} metric={metric} anchorMes={anchorMes} decimals={decimals} />
        )}
      </div>

      {kpi && (
        <div className="gx-kpis">
          <div className="gx-kpi"><span className="k">Campaña {kpi.label} · última</span><span className="v">{nfmt(kpi.hoy, decimals)}</span></div>
          <div className="gx-kpi"><span className="k">Mín ventana</span><span className="v">{nfmt(kpi.min, decimals)}</span></div>
          <div className="gx-kpi"><span className="k">Máx ventana</span><span className="v">{nfmt(kpi.max, decimals)}</span></div>
        </div>
      )}

      <p className="gx-note">
        <b>Spread</b> = pata lejana − pata cercana (en empate de vencimiento, cara − barata; ej. soja − maíz).
        <b> Eje días al vto</b> alinea las campañas por índice de rueda terminando en el vencimiento
        (como la planilla). Datos de cierre desde 2020 · A3/CEM, CBOT (USD/tn) y pizarra CAC.
        Bandas históricas y percentil llegan en la próxima fase.
      </p>
    </div>
  );
}

/* ---------------- selector de pata ---------------- */

function PataSelector({
  legend, idx, pata, onChange, allowNone = false,
}: {
  legend: string;
  idx: Idx;
  pata: Pata | null;
  onChange: (p: Pata | null) => void;
  allowNone?: boolean;
}) {
  const fuentes: Fuente[] = ["a3", "cbot", "pizarra"];
  const p = pata;
  const granos = p ? idx.granosPorFuente[p.fuente] : [];
  const mons = p && p.fuente !== "pizarra" ? (idx.monsPorGF.get(`${p.fuente}:${p.grano}`) ?? []) : [];

  return (
    <div className="gx-pata">
      <span className="gx-pata-lbl">{legend}</span>
      <div className="gx-selrow">
        {allowNone && (
          <select
            aria-label={`${legend} activa`}
            value={p ? "on" : "off"}
            onChange={(e) => {
              if (e.target.value === "off") onChange(null);
              else onChange({ fuente: "a3", grano: "maiz", mon: "JUL" });
            }}
          >
            <option value="on">Con pata B</option>
            <option value="off">Sin pata B</option>
          </select>
        )}
        {p && (
          <>
            <select
              aria-label={`${legend} fuente`}
              value={p.fuente}
              onChange={(e) => {
                const fuente = e.target.value as Fuente;
                const g = idx.granosPorFuente[fuente][0] ?? "soja";
                const ms = fuente === "pizarra" ? [] : idx.monsPorGF.get(`${fuente}:${g}`) ?? [];
                onChange({ fuente, grano: g, mon: fuente === "pizarra" ? null : ms[0] ?? null });
              }}
            >
              {fuentes.map((f) => <option key={f} value={f}>{FUENTE_NOMBRE[f]}</option>)}
            </select>
            <select
              aria-label={`${legend} grano`}
              value={p.grano}
              onChange={(e) => {
                const grano = e.target.value;
                const ms = p.fuente === "pizarra" ? [] : idx.monsPorGF.get(`${p.fuente}:${grano}`) ?? [];
                onChange({ ...p, grano, mon: p.fuente === "pizarra" ? null : ms[0] ?? null });
              }}
            >
              {granos.map((g) => <option key={g} value={g}>{GRANO_NOMBRE[g] ?? g}</option>)}
            </select>
            {p.fuente !== "pizarra" && (
              <select
                aria-label={`${legend} posición`}
                value={p.mon ?? ""}
                onChange={(e) => onChange({ ...p, mon: e.target.value })}
              >
                {mons.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

/** Ordena las dos patas para el spread: [cercana/barata, lejana/cara]. */
function ordenarPatas(
  sa: SeriePuntos, ra: PataResuelta, sb: SeriePuntos, rb: PataResuelta,
): [SeriePuntos, SeriePuntos] {
  if (ra.vto && rb.vto && ra.vto !== rb.vto) {
    return ra.vto < rb.vto ? [sa, sb] : [sb, sa]; // lejana = vto mayor
  }
  // Empate (o sin vto): cara − barata, por precio medio.
  const meanA = media(sa.v);
  const meanB = media(sb.v);
  return meanA <= meanB ? [sa, sb] : [sb, sa];
}

function media(xs: number[]): number {
  return xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : 0;
}

/** Resta días a una fecha ISO. */
function isoMenosDias(iso: string, dias: number): string {
  const t = Date.parse(`${iso}T12:00:00-03:00`) - dias * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
