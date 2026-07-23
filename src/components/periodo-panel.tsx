"use client";

import * as React from "react";
import type { SerieCat, SeriePuntos, Fuente } from "@/lib/series-types";
import { joinFfill, metricaDiaria, posCalendario } from "@/lib/derivadas";
import { MESES_ES, mesIndice } from "@/lib/dates";
import { SpreadChart, type CampLine } from "./spread-chart";

/**
 * Modo Período del panel de gráficos: una BASE (pizarra o una posición) contra
 * VARIAS posiciones de un grano, sobre un año, en eje calendario real. Cada línea
 * es el spread base − posición y corre hasta donde esa posición tiene datos
 * (su vencimiento). Muestra las dos cosechas que cotizan en el período; un filtro
 * permite apagar posiciones. Decisión de Lautaro (11/07): "todas las que cotizan".
 */

const GRANO_NOMBRE: Record<string, string> = {
  soja: "Soja", maiz: "Maíz", trigo: "Trigo", girasol: "Girasol", sorgo: "Sorgo",
};
// Paleta por posición (no por campaña): hasta 12 targets.
const POS_COLORS = [
  "#2A78D6","#D96A2A","#0891B2","#B45309","#DB5A9B","#9333EA",
  "#0F9E8C","#7C4FD0","#C2410C","#4D7C0F","#0E7490","#BE123C",
];

type Target = { serieId: string; posicion: string; mon: string; yy: number; venc: string | null };

/** Posiciones A3 .ROS del grano que cotizan en el año (su [desde,hasta] lo cruza). */
function targetsDelAnio(cat: SerieCat[], grano: string, anio: number): Target[] {
  const from = `${anio}-01-01`;
  const to = `${anio}-12-31`;
  return cat
    .filter((c) => c.fuente === "a3" && c.grano === grano && c.posicion && c.desde <= to && c.hasta >= from)
    .map((c) => ({
      serieId: c.serieId,
      posicion: c.posicion!,
      mon: c.posicion!.slice(0, 3),
      yy: 2000 + Number(c.posicion!.slice(3)),
      venc: c.vencimiento,
    }))
    .sort((a, b) => (a.yy - b.yy) || (mesIndice(a.mon) - mesIndice(b.mon)));
}

/* ---------------- presets de pizarra ---------------- */

const PRESETS_PIZARRA: { grano: string; label: string; meses: string[] }[] = [
  { grano: "maiz", label: "Pizarra maíz", meses: ["ABR", "JUL", "DIC"] },
  { grano: "soja", label: "Pizarra soja", meses: ["MAY", "JUL", "NOV"] },
  { grano: "trigo", label: "Pizarra trigo", meses: ["DIC", "ENE", "MAR", "JUL"] },
];

export function PeriodoPanel({ catalogo, anioActual }: { catalogo: SerieCat[]; anioActual: number }) {
  const granosPizarra = React.useMemo(
    () => [...new Set(catalogo.filter((c) => c.fuente === "pizarra").map((c) => c.grano))].sort(),
    [catalogo],
  );
  const granosA3 = React.useMemo(
    () => [...new Set(catalogo.filter((c) => c.fuente === "a3").map((c) => c.grano))].sort(),
    [catalogo],
  );

  const [baseFuente, setBaseFuente] = React.useState<Fuente>("pizarra");
  const [grano, setGrano] = React.useState<string>("maiz");
  const [baseMon, setBaseMon] = React.useState<string>("JUL"); // solo si base = a3
  const [anio, setAnio] = React.useState<number>(anioActual);
  const [ocultas, setOcultas] = React.useState<Set<string>>(new Set());

  const [series, setSeries] = React.useState<Record<string, SeriePuntos>>({});
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const targets = React.useMemo(() => targetsDelAnio(catalogo, grano, anio), [catalogo, grano, anio]);

  // serieId de la base.
  const baseId = React.useMemo(() => {
    if (baseFuente === "pizarra") return `pizarra:${grano}`;
    // a3: buscar la posición del grano+mes del año (o la del año siguiente si no está).
    const c = catalogo.find((x) => x.fuente === "a3" && x.grano === grano && x.posicion === `${baseMon}${String(anio % 100).padStart(2, "0")}`);
    return c?.serieId ?? null;
  }, [baseFuente, grano, baseMon, anio, catalogo]);

  // Traer base + targets sobre el período.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!baseId || targets.length === 0) { setSeries({}); return; }
    const ids = [baseId, ...targets.map((t) => t.serieId)];
    const from = `${anio}-01-01`;
    const to = `${anio}-12-31`;
    let cancel = false;
    setCargando(true);
    setError(null);
    fetch(`/api/series?ids=${encodeURIComponent(ids.join(","))}&from=${from}&to=${to}`)
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
  }, [baseId, targets, anio]);

  // Líneas: spread base − posición por target, eje calendario real.
  const lines = React.useMemo<CampLine[]>(() => {
    const base = baseId ? series[baseId] : null;
    if (!base) return [];
    const out: CampLine[] = [];
    targets.forEach((t, i) => {
      if (ocultas.has(t.serieId)) return;
      const st = series[t.serieId];
      if (!st) return;
      const join = joinFfill(st, base); // va = target, vb = base → spread = base − target
      const met = metricaDiaria(join, "spread");
      const data = met.map((p) => ({ x: posCalendario(p.f), y: p.y, f: p.f }));
      if (data.length === 0) return;
      out.push({
        key: t.serieId,
        label: t.posicion,
        color: POS_COLORS[i % POS_COLORS.length],
        vigente: false,
        data,
      });
    });
    return out;
  }, [series, baseId, targets, ocultas]);

  const aplicarPreset = (p: { grano: string; meses: string[] }) => {
    setBaseFuente("pizarra");
    setGrano(p.grano);
    // ocultar las posiciones cuyo mes no está en el preset (se recalcula al cambiar targets).
    const ts = targetsDelAnio(catalogo, p.grano, anio);
    setOcultas(new Set(ts.filter((t) => !p.meses.includes(t.mon)).map((t) => t.serieId)));
  };

  const anios = React.useMemo(() => {
    const ys: number[] = [];
    for (let y = anioActual; y >= 2020; y--) ys.push(y);
    return ys;
  }, [anioActual]);

  const baseLabel = baseFuente === "pizarra"
    ? `Pizarra ${GRANO_NOMBRE[grano] ?? grano}`
    : `${GRANO_NOMBRE[grano] ?? grano} ${baseMon}`;

  return (
    <>
      <div className="gx-preset-groups">
        <div className="gx-preset-row">
          <span className="gx-preset-glabel">Pizarra</span>
          {PRESETS_PIZARRA.map((p) => {
            const on = baseFuente === "pizarra" && grano === p.grano;
            return (
              <button key={p.grano} type="button" className={`gx-preset${on ? " on" : ""}`}
                onClick={() => aplicarPreset(p)}>
                {p.label} · {p.meses.join("/")}
              </button>
            );
          })}
        </div>
      </div>

      <div className="gx-build">
        <div className="gx-pata">
          <span className="gx-pata-lbl">Base</span>
          <div className="gx-selrow">
            <select value={baseFuente} onChange={(e) => setBaseFuente(e.target.value as Fuente)} aria-label="Base fuente">
              <option value="pizarra">Pizarra</option>
              <option value="a3">Futuro A3</option>
            </select>
            <select value={grano} onChange={(e) => { setGrano(e.target.value); setOcultas(new Set()); }} aria-label="Grano">
              {(baseFuente === "pizarra" ? granosPizarra : granosA3).map((g) => (
                <option key={g} value={g}>{GRANO_NOMBRE[g] ?? g}</option>
              ))}
            </select>
            {baseFuente === "a3" && (
              <select value={baseMon} onChange={(e) => setBaseMon(e.target.value)} aria-label="Posición base">
                {MESES_ES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="gx-pata">
          <span className="gx-pata-lbl">Año</span>
          <select value={anio} onChange={(e) => { setAnio(Number(e.target.value)); setOcultas(new Set()); }} aria-label="Año del período">
            {anios.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="gx-pata">
          <span className="gx-pata-lbl">Vs posiciones de</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--ink-2)", padding: "5px 0" }}>
            {GRANO_NOMBRE[grano] ?? grano} · {targets.length} posiciones
          </span>
        </div>
      </div>

      <div className="gx-chips">
        <span className="gx-chips-lbl">Posiciones</span>
        {targets.map((t, i) => {
          const on = !ocultas.has(t.serieId);
          return (
            <button key={t.serieId} type="button" className="gx-chip" aria-pressed={on}
              style={{ ["--c" as string]: POS_COLORS[i % POS_COLORS.length] }}
              onClick={() => setOcultas((prev) => {
                const n = new Set(prev);
                if (n.has(t.serieId)) n.delete(t.serieId); else n.add(t.serieId);
                return n;
              })}>
              <span className="sw" />{t.posicion}
            </button>
          );
        })}
        {targets.length > 0 && (
          <button type="button" className="gx-preset" onClick={() => setOcultas(new Set())}>Todas</button>
        )}
      </div>

      <div className="gx-chart">
        {error ? (
          <div className="gx-empty">No se pudieron traer las series ({error}).</div>
        ) : lines.length === 0 ? (
          <div className="gx-empty">{cargando ? "Trayendo datos…" : "Elegí una base y un año con posiciones."}</div>
        ) : (
          <SpreadChart lines={lines} eje="cal" metric="spread" anchorMes={1} decimals={2} modo="lineas" />
        )}
      </div>

      <p className="gx-note">
        <b>{baseLabel}</b> menos cada posición de {GRANO_NOMBRE[grano] ?? grano}, en {anio}. Cada línea es el
        spread <b>base − posición</b> (positivo = la base por encima del futuro) y corre hasta donde esa
        posición cotiza (su vencimiento). Se muestran las dos cosechas que operan en el año; apagá las que
        no quieras con los chips. {lines.length > 0 && `Mostrando ${lines.length} de ${targets.length}.`}
      </p>
    </>
  );
}
