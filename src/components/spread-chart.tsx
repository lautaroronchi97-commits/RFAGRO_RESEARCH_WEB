"use client";

import * as React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { nfmt } from "@/lib/format";
import { etiquetaCalendario, type Eje, type Metric, type PuntoXY } from "@/lib/derivadas";

/**
 * Chart multi-campaña del panel de spreads. Cada campaña es una línea con su
 * color; se superponen sobre un eje X compartido (índice de rueda al vto o
 * calendario). Las series se fusionan en filas keyed por x para que Recharts
 * dibuje una `<Line>` por año con crosshair y tooltip compartidos.
 */

export type CampLine = {
  key: string; // id único de la línea (año, o año·pata en modo crudo)
  label: string; // etiqueta para leyenda/tooltip
  color: string; // hex ya resuelto (según tema) por el cliente
  vigente: boolean;
  dash?: boolean; // línea punteada (pata B en modo crudo)
  data: PuntoXY[];
};

type Row = { x: number } & Record<string, number | string>;

function mergeRows(lines: CampLine[]): Row[] {
  const byX = new Map<number, Row>();
  for (const ln of lines) {
    for (const p of ln.data) {
      let row = byX.get(p.x);
      if (!row) { row = { x: p.x }; byX.set(p.x, row); }
      row[`y${ln.key}`] = p.y;
      row[`f${ln.key}`] = p.f;
    }
  }
  return [...byX.values()].sort((a, b) => a.x - b.x);
}

export function SpreadChart({
  lines,
  eje,
  metric,
  anchorMes,
  decimals = 2,
}: {
  lines: CampLine[];
  eje: Eje;
  metric: Metric;
  anchorMes: number;
  decimals?: number;
}) {
  const rows = React.useMemo(() => mergeRows(lines), [lines]);
  if (rows.length === 0) return null;

  const fmtX = (x: number) =>
    eje === "vto" ? String(-Math.round(x)) : etiquetaCalendario(x, anchorMes);

  return (
    <ResponsiveContainer width="100%" height={param(380)}>
      <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 22, left: 4 }}>
        <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" />
        <XAxis
          dataKey="x"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={fmtX}
          tick={{ fill: "var(--ink-3)", fontSize: 11 }}
          stroke="var(--line-2)"
          label={{
            value: eje === "vto" ? "ruedas al vencimiento" : "temporada",
            position: "insideBottom",
            offset: -12,
            fill: "var(--ink-3)",
            fontSize: 11,
          }}
        />
        <YAxis
          tickFormatter={(v: number) => nfmt(v, metric === "ratio" ? 3 : 0)}
          tick={{ fill: "var(--ink-3)", fontSize: 11 }}
          stroke="var(--line-2)"
          width={52}
        />
        {metric !== "ratio" && <ReferenceLine y={0} stroke="var(--line-2)" />}
        <Tooltip
          content={<GxTooltip lines={lines} eje={eje} anchorMes={anchorMes} decimals={decimals} />}
          isAnimationActive={false}
        />
        {lines.map((ln) => (
          <Line
            key={ln.key}
            type="monotone"
            dataKey={`y${ln.key}`}
            name={ln.label}
            stroke={ln.color}
            strokeWidth={ln.vigente ? 2.6 : 1.4}
            strokeDasharray={ln.dash ? "4 3" : undefined}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** ResponsiveContainer no acepta undefined; helper para no romper el tipo. */
function param(n: number): number {
  return n;
}

type TipProps = {
  active?: boolean;
  label?: number | string;
  lines: CampLine[];
  eje: Eje;
  anchorMes: number;
  decimals: number;
  payload?: Array<{ payload: Row }>;
};

function GxTooltip({ active, payload, lines, eje, anchorMes, decimals }: TipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  const x = Number(row.x);
  const head = eje === "vto" ? `${-Math.round(x)} ruedas al vto` : etiquetaCalendario(x, anchorMes);
  const items = lines
    .map((ln) => ({ ln, y: row[`y${ln.key}`], f: row[`f${ln.key}`] }))
    .filter((it) => typeof it.y === "number")
    .sort((a, b) => (b.y as number) - (a.y as number));
  if (items.length === 0) return null;
  return (
    <div className="gx-tip">
      <div className="gx-tip-h">{head}</div>
      {items.map((it) => (
        <div className="gx-tip-row" key={it.ln.key}>
          <span className="sw" style={{ background: it.ln.color }} />
          <b>{it.ln.label}</b>
          <span>{nfmt(it.y as number, decimals)}</span>
          {typeof it.f === "string" && <span style={{ color: "var(--ink-3)" }}>· {it.f}</span>}
        </div>
      ))}
    </div>
  );
}
