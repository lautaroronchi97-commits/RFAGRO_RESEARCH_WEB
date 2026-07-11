"use client";

import * as React from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { nfmt } from "@/lib/format";
import {
  etiquetaCalendario, mesDeFecha, mesEnRuedasAlVto,
  type BandaPunto, type Eje, type Metric, type PuntoXY,
} from "@/lib/derivadas";

/**
 * Chart multi-campaña del panel de spreads. Dos vistas:
 *  - "lineas": una línea por campaña, superpuestas.
 *  - "banda": las campañas históricas colapsan en una sombra min–máx + mediana,
 *    y la campaña vigente va gruesa encima (P13). Mata el spaghetti.
 * En el eje días-al-vto se muestra, además del nº de ruedas, el MES calendario
 * de la campaña vigente (pedido de Lautaro: orientarse por mes, no solo ruedas).
 */

export type CampLine = {
  key: string;
  label: string;
  color: string;
  vigente: boolean;
  dash?: boolean;
  data: PuntoXY[];
};

type Row = { x: number } & Record<string, number | string | [number, number]>;

function mergeRows(lines: CampLine[], banda: BandaPunto[]): Row[] {
  const byX = new Map<number, Row>();
  const get = (x: number): Row => {
    let r = byX.get(x);
    if (!r) { r = { x }; byX.set(x, r); }
    return r;
  };
  for (const ln of lines) {
    for (const p of ln.data) {
      const r = get(p.x);
      r[`y${ln.key}`] = p.y;
      r[`f${ln.key}`] = p.f;
    }
  }
  for (const b of banda) {
    const r = get(b.x);
    r.brange = [b.min, b.max];
    r.bmed = b.med;
  }
  return [...byX.values()].sort((a, b) => a.x - b.x);
}

export function SpreadChart({
  lines, eje, metric, anchorMes, decimals = 2, modo = "lineas", banda = [], refVto,
}: {
  lines: CampLine[];
  eje: Eje;
  metric: Metric;
  anchorMes: number;
  decimals?: number;
  modo?: "lineas" | "banda";
  banda?: BandaPunto[];
  refVto?: string; // vto de la campaña vigente, para rotular los meses del eje días-al-vto
}) {
  // En modo banda solo se dibuja la vigente como línea (la historia es la sombra).
  const drawn = modo === "banda" ? lines.filter((l) => l.vigente) : lines;
  const usaBanda = modo === "banda" && banda.length > 0;
  const rows = React.useMemo(() => mergeRows(drawn, usaBanda ? banda : []), [drawn, usaBanda, banda]);
  if (rows.length === 0) return null;

  // Mes en cada x del eje días-al-vto: proyectado desde el vencimiento de la
  // campaña vigente (x=0 = vto). Si no hay refVto, cae al mes del último dato.
  const ref = lines.find((l) => l.vigente) ?? lines[0];
  const ultFecha = ref && ref.data.length ? ref.data.reduce((m, p) => (p.x > m.x ? p : m), ref.data[0]).f : null;
  const mesEnX = (x: number): string => {
    if (refVto) return mesEnRuedasAlVto(refVto, Math.max(0, Math.round(-x)));
    return ultFecha ? mesDeFecha(ultFecha) : "";
  };

  return (
    <ResponsiveContainer width="100%" height={param(400)}>
      <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 30, left: 4 }}>
        <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" />
        <XAxis
          dataKey="x"
          type="number"
          domain={["dataMin", "dataMax"]}
          height={eje === "vto" ? 40 : 28}
          tick={<GxXTick eje={eje} anchorMes={anchorMes} mesEnX={mesEnX} />}
          stroke="var(--line-2)"
        />
        <YAxis
          tickFormatter={(v: number) => nfmt(v, metric === "ratio" ? 3 : 0)}
          tick={{ fill: "var(--ink-3)", fontSize: 11 }}
          stroke="var(--line-2)"
          width={52}
        />
        {metric !== "ratio" && <ReferenceLine y={0} stroke="var(--line-2)" />}
        <Tooltip
          content={<GxTooltip lines={drawn} eje={eje} anchorMes={anchorMes} decimals={decimals} usaBanda={usaBanda} mesEnX={mesEnX} />}
          isAnimationActive={false}
        />
        {usaBanda && (
          <Area
            dataKey="brange"
            stroke="none"
            fill="var(--ink-3)"
            fillOpacity={0.16}
            connectNulls
            isAnimationActive={false}
            activeDot={false}
            legendType="none"
          />
        )}
        {usaBanda && (
          <Line
            dataKey="bmed"
            name="Mediana histórica"
            stroke="var(--ink-2)"
            strokeWidth={1.3}
            strokeDasharray="5 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        )}
        {drawn.map((ln) => (
          <Line
            key={ln.key}
            type="monotone"
            dataKey={`y${ln.key}`}
            name={ln.label}
            stroke={ln.color}
            strokeWidth={ln.vigente ? 2.8 : 1.4}
            strokeDasharray={ln.dash ? "4 3" : undefined}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function param(n: number): number {
  return n;
}

/* ---------------- tick del eje X (nº de ruedas + mes) ---------------- */

type TickProps = {
  x?: number;
  y?: number;
  payload?: { value: number };
  eje: Eje;
  anchorMes: number;
  mesEnX: (x: number) => string;
};

function GxXTick({ x = 0, y = 0, payload, eje, anchorMes, mesEnX }: TickProps) {
  const v = payload?.value ?? 0;
  if (eje === "cal") {
    return (
      <text x={x} y={y} dy={14} textAnchor="middle" fill="var(--ink-3)" fontSize={11}>
        {etiquetaCalendario(v, anchorMes)}
      </text>
    );
  }
  // Días al vto: nº de ruedas arriba, mes de referencia abajo.
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={13} textAnchor="middle" fill="var(--ink-3)" fontSize={11}>
        {-Math.round(v)}
      </text>
      <text x={0} y={0} dy={26} textAnchor="middle" fill="var(--ink-3)" fontSize={9.5} opacity={0.85}>
        {mesEnX(v)}
      </text>
    </g>
  );
}

/* ---------------- tooltip ---------------- */

type TipProps = {
  active?: boolean;
  lines: CampLine[];
  eje: Eje;
  anchorMes: number;
  decimals: number;
  usaBanda: boolean;
  mesEnX: (x: number) => string;
  payload?: Array<{ payload: Row }>;
};

function GxTooltip({ active, payload, lines, eje, anchorMes, decimals, usaBanda, mesEnX }: TipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  const x = Number(row.x);
  const head =
    eje === "vto"
      ? `${-Math.round(x)} ruedas al vto · ${mesEnX(x)}`
      : etiquetaCalendario(x, anchorMes);
  const items = lines
    .map((ln) => ({ ln, y: row[`y${ln.key}`], f: row[`f${ln.key}`] }))
    .filter((it) => typeof it.y === "number")
    .sort((a, b) => (b.y as number) - (a.y as number));
  const brange = row.brange as [number, number] | undefined;
  const bmed = row.bmed as number | undefined;
  if (items.length === 0 && !brange) return null;
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
      {usaBanda && brange && (
        <div className="gx-tip-row" style={{ color: "var(--ink-3)" }}>
          <span className="sw" style={{ background: "var(--ink-3)" }} />
          historia {nfmt(brange[0], decimals)}–{nfmt(brange[1], decimals)}
          {typeof bmed === "number" ? ` · med ${nfmt(bmed, decimals)}` : ""}
        </div>
      )}
    </div>
  );
}
