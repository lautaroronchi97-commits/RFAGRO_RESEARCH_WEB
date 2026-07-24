"use client";

import { useState } from "react";
import { nfmt } from "@/lib/format";
import { ORG_LABEL } from "@/lib/calendario";
import type { SerieEvol } from "@/lib/estimaciones";
import { ChartMarca } from "./chart-marca";
import { ChartTabla, type ChartTablaColumna, type ChartTablaFila } from "./chart-tabla";

const W = 660;
const H = 260;
const pad = { l: 48, r: 16, t: 16, b: 30 };
const iw = W - pad.l - pad.r;
const ih = H - pad.t - pad.b;

function epoch(fechaISO: string): number {
  return Date.parse(`${fechaISO}T00:00:00Z`);
}

function fmtMes(ms: number, conAnio: boolean): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    month: "short",
    ...(conAnio ? { year: "2-digit" } : {}),
  }).format(new Date(ms));
}

type Flat = { s: number; organismo: string; ms: number; valor: number; informe: string; fecha: string };

function fmtFecha(fechaISO: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${fechaISO}T00:00:00Z`));
}

/**
 * Tabla de datos del gráfico (doble lectura): una fila por fecha de publicación,
 * una columna por organismo. Mismos puntos y mismo formateo que el tooltip
 * (nfmt a 2 decimales, en la unidad del gráfico); "—" cuando un organismo no
 * publicó ese día.
 */
function tablaDeSeries(series: SerieEvol[], unidad: string): { columnas: ChartTablaColumna[]; filas: ChartTablaFila[] } {
  const columnas: ChartTablaColumna[] = [
    { key: "fecha", label: "Fecha", align: "left" },
    ...series.map((serie) => ({
      key: serie.organismo,
      label: `${ORG_LABEL[serie.organismo as keyof typeof ORG_LABEL] ?? serie.organismo} (${unidad})`,
    })),
  ];
  const porFecha = new Map<string, ChartTablaFila>();
  for (const serie of series) {
    for (const p of serie.puntos) {
      let fila = porFecha.get(p.fecha);
      if (!fila) {
        fila = { fecha: fmtFecha(p.fecha) };
        porFecha.set(p.fecha, fila);
      }
      fila[serie.organismo] = nfmt(p.valor, 2);
    }
  }
  const filas = [...porFecha.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, fila]) => fila);
  return { columnas, filas };
}

/**
 * Evolución de la estimación de una campaña, publicación a publicación. Una línea por organismo,
 * eje x = fecha de publicación (escala temporal real, así USDA y CONAB se superponen aunque tengan
 * distinta cantidad de vintages). SVG a mano, mismo estilo que el resto de la web.
 */
export function EvolucionChart({ series, unidad }: { series: SerieEvol[]; unidad: string }) {
  const [hi, setHi] = useState<number | null>(null);

  const flat: Flat[] = [];
  series.forEach((serie, s) =>
    serie.puntos.forEach((p) =>
      flat.push({ s, organismo: serie.organismo, ms: epoch(p.fecha), valor: p.valor, informe: p.informe, fecha: p.fecha }),
    ),
  );
  if (flat.length === 0) {
    return <div className="chart-wrap chart-empty">Sin datos para esta combinación.</div>;
  }

  const xs = flat.map((f) => f.ms);
  const ys = flat.map((f) => f.valor);
  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  if (xMin === xMax) {
    xMin -= 15 * 86400000;
    xMax += 15 * 86400000;
  }
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  const padv = (yMax - yMin) * 0.14 || Math.abs(yMax) * 0.05 || 1;
  yMin -= padv;
  yMax += padv;

  const X = (ms: number) => pad.l + ((ms - xMin) / (xMax - xMin)) * iw;
  const Y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * ih;

  const yTicks = Array.from({ length: 5 }, (_, k) => yMin + ((yMax - yMin) * k) / 4);
  const spanAnios = (xMax - xMin) / (365 * 86400000);
  const xTicks = Array.from({ length: 5 }, (_, k) => xMin + ((xMax - xMin) * k) / 4);

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let best = 0;
    let bd = Infinity;
    flat.forEach((f, i) => {
      const d = (X(f.ms) - px) ** 2 + (Y(f.valor) - py) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setHi(best);
  }

  const tabla = tablaDeSeries(series, unidad);
  // `hi` es índice guardado en state; si `series` cambia entre renders `flat` puede achicarse y
  // dejarlo apuntando afuera — guard real (no `!`), como en camiones-chart.tsx.
  const hiFlat = hi !== null ? flat[hi] : undefined;

  return (
    <>
      <div className="chart-wrap">
        <ChartMarca />
        <svg viewBox={`0 0 ${W} ${H}`} className="cv" role="img" aria-label="Evolución de la estimación de producción por organismo">
          {yTicks.map((t, k) => (
            <g key={`y${k}`}>
              <line className="cv-grid" x1={pad.l} y1={Y(t)} x2={W - pad.r} y2={Y(t)} />
              <text className="cv-axis" x={pad.l - 7} y={Y(t) + 3} textAnchor="end">
                {nfmt(t, t >= 100 ? 0 : 1)}
              </text>
            </g>
          ))}
          {xTicks.map((t, k) => (
            <text key={`x${k}`} className="cv-axis" x={X(t)} y={H - 9} textAnchor="middle">
              {fmtMes(t, spanAnios > 0.9)}
            </text>
          ))}
          {series.map((serie) => {
            const pts = serie.puntos;
            if (pts.length === 0) return null; // organismo sin puntos en esta selección
            const d = pts.map((p, i) => `${i ? "L" : "M"}${X(epoch(p.fecha)).toFixed(1)},${Y(p.valor).toFixed(1)}`).join(" ");
            return (
              <g key={serie.organismo} className={`evo-serie org-${serie.organismo}`}>
                <path d={d} className="evo-line" />
                {pts.map((p, i) => (
                  <circle key={i} cx={X(epoch(p.fecha))} cy={Y(p.valor)} r={2.6} className="evo-dot" />
                ))}
                <circle cx={X(epoch(pts[pts.length - 1]!.fecha))} cy={Y(pts[pts.length - 1]!.valor)} r={4} className="evo-end" />
              </g>
            );
          })}
          {hiFlat && (
            <g className={`org-${hiFlat.organismo}`}>
              <line className="cv-cross" x1={X(hiFlat.ms)} y1={pad.t} x2={X(hiFlat.ms)} y2={pad.t + ih} />
              <circle className="evo-focus" cx={X(hiFlat.ms)} cy={Y(hiFlat.valor)} r={5} />
            </g>
          )}
          <rect
            x={pad.l}
            y={pad.t}
            width={iw}
            height={ih}
            fill="transparent"
            style={{ cursor: "crosshair" }}
            onPointerMove={onMove}
            onPointerLeave={() => setHi(null)}
          />
        </svg>
        {hiFlat && (
          <div className="cv-tip" style={{ left: `${(X(hiFlat.ms) / W) * 100}%`, top: `${(Y(hiFlat.valor) / H) * 100}%` }}>
            <span className="tt-x">{ORG_LABEL[hiFlat.organismo as keyof typeof ORG_LABEL] ?? hiFlat.organismo}</span> · {nfmt(hiFlat.valor, 2)} {unidad}
            <span className="cv-tip-sub">{hiFlat.informe}</span>
          </div>
        )}
        <div className="cv-legend">
          {series.map((serie) => (
            <span className={`lk org-${serie.organismo}`} key={serie.organismo}>
              <span className="sw evo-sw" />
              {ORG_LABEL[serie.organismo as keyof typeof ORG_LABEL] ?? serie.organismo}
              <span className="lk-val">
                {serie.puntos.length ? nfmt(serie.puntos[serie.puntos.length - 1]!.valor, 2) : "—"}
              </span>
            </span>
          ))}
        </div>
      </div>
      <ChartTabla
        columnas={tabla.columnas}
        filas={tabla.filas}
        nota="Una fila por fecha de publicación; «—» = ese organismo no publicó ese día."
      />
    </>
  );
}
