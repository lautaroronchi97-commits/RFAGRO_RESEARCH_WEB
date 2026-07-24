"use client";

import * as React from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { nfmt } from "@/lib/format";
import { etiquetaCalendario, mesEnRuedasAlVto, type Eje } from "@/lib/derivadas";
import { exportarSvgComoPng } from "@/lib/chart-export";
import { ChartTabla, type ChartTablaColumna, type ChartTablaFila } from "./chart-tabla";

/**
 * Subpanel de volumen/OI (P6 del backlog maestro): barras de volumen operado +
 * línea de open interest de UNA pata (la campaña vigente), en el mismo eje X que
 * el chart principal. Solo tiene sentido para A3/CBOT (pizarra no opera
 * contratos, no tiene volumen) — el caller decide cuándo mostrarlo.
 */

export type VolPunto = { x: number; f: string; vol: number | null; oi: number | null };

export function VolumenPanel({
  puntos, eje, anchorMes, refVto, label, exportName,
}: {
  puntos: VolPunto[];
  eje: Eje;
  anchorMes: number;
  refVto?: string;
  label: string;
  exportName?: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const conDato = React.useMemo(() => puntos.filter((p) => p.vol !== null || p.oi !== null), [puntos]);
  if (conDato.length === 0) return null;

  const mesEnX = (x: number): string =>
    refVto ? mesEnRuedasAlVto(refVto, Math.max(0, Math.round(-x))) : "";

  const columnas: ChartTablaColumna[] = [
    { key: "x", label: eje === "vto" ? "Ruedas al vto" : "Fecha", align: "left" },
    { key: "vol", label: "Volumen" },
    { key: "oi", label: "Open interest" },
  ];
  const filas: ChartTablaFila[] = conDato.map((p) => ({
    x: eje === "vto" ? `${-Math.round(p.x)} · ${mesEnX(p.x)}` : etiquetaCalendario(p.x, anchorMes),
    vol: p.vol !== null ? nfmt(p.vol, 0) : null,
    oi: p.oi !== null ? nfmt(p.oi, 0) : null,
  }));

  return (
    <div className="gx-volpanel">
      <div className="gx-preset-glabel">Volumen / open interest · {label}</div>
      {exportName && (
        <div className="gx-chart-toolbar">
          <button type="button" className="gx-preset" onClick={() => exportarSvgComoPng(wrapRef.current, `${exportName}.png`)}>
            ↓ PNG
          </button>
        </div>
      )}
      <div style={{ position: "relative" }} ref={wrapRef}>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={conDato} margin={{ top: 4, right: 16, bottom: 6, left: 4 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" />
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) => (eje === "vto" ? String(-Math.round(v)) : etiquetaCalendario(v, anchorMes))}
              tick={{ fill: "var(--ink-3)", fontSize: 10.5 }}
              stroke="var(--line-2)"
              height={22}
            />
            <YAxis
              yAxisId="vol"
              tickFormatter={(v: number) => nfmt(v, 0)}
              tick={{ fill: "var(--ink-3)", fontSize: 10.5 }}
              stroke="var(--line-2)"
              width={52}
            />
            <YAxis
              yAxisId="oi"
              orientation="right"
              tickFormatter={(v: number) => nfmt(v, 0)}
              tick={{ fill: "var(--ink-3)", fontSize: 10.5 }}
              stroke="var(--line-2)"
              width={52}
            />
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0]!.payload as VolPunto; // length===0 ya salió arriba
                const head = eje === "vto" ? `${-Math.round(row.x)} ruedas al vto · ${mesEnX(row.x)}` : etiquetaCalendario(row.x, anchorMes);
                return (
                  <div className="gx-tip">
                    <div className="gx-tip-h">{head}</div>
                    {row.vol !== null && <div className="gx-tip-row">Volumen: {nfmt(row.vol, 0)}</div>}
                    {row.oi !== null && <div className="gx-tip-row">Open interest: {nfmt(row.oi, 0)}</div>}
                  </div>
                );
              }}
            />
            <Bar yAxisId="vol" dataKey="vol" fill="var(--brand-deep)" opacity={0.55} isAnimationActive={false} />
            <Line yAxisId="oi" type="monotone" dataKey="oi" stroke="var(--gold-text)" strokeWidth={1.6} dot={false} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartTabla titulo="Datos de volumen/OI" columnas={columnas} filas={filas} exportCsv={exportName} />
    </div>
  );
}
