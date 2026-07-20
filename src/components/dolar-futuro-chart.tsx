"use client";

import { useState } from "react";
import { nfmt } from "@/lib/format";
import { ChartMarca } from "@/components/chart-marca";

type Pt = { label: string; value: number };

const W = 640;
const H = 240;
const pad = { l: 46, r: 14, t: 14, b: 26 };
const iw = W - pad.l - pad.r;
const ih = H - pad.t - pad.b;

/** Curva de dólar futuro — SVG a mano con crosshair + tooltip. */
export function DolarFuturoChart({ points }: { points: Pt[] }) {
  const [hi, setHi] = useState<number | null>(null);
  if (points.length === 0) return <div className="chart-wrap" />;

  const vals = points.map((p) => p.value);
  let mn = Math.min(...vals);
  let mx = Math.max(...vals);
  const padv = (mx - mn) * 0.12 || 1;
  mn -= padv;
  mx += padv;

  const X = (i: number) => pad.l + (points.length <= 1 ? 0 : (i / (points.length - 1)) * iw);
  const Y = (v: number) => pad.t + (1 - (v - mn) / (mx - mn)) * ih;

  const yTicks = Array.from({ length: 5 }, (_, k) => mn + ((mx - mn) * k) / 4);
  const line = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join(" ");
  const area =
    `M${pad.l},${pad.t + ih} ` +
    points.map((p, i) => `L${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join(" ") +
    ` L${X(points.length - 1).toFixed(1)},${pad.t + ih} Z`;
  const last = points.length - 1;

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(X(i) - px);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    setHi(best);
  }

  return (
    <div className="chart-wrap">
      <ChartMarca />
      <svg viewBox={`0 0 ${W} ${H}`} className="cv" role="img" aria-label="Curva de precios de dólar futuro por posición">
        <defs>
          <linearGradient id="cvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop className="cv-grad-a" offset="0" />
            <stop className="cv-grad-b" offset="1" />
          </linearGradient>
        </defs>
        {yTicks.map((t, k) => (
          <g key={k}>
            <line className="cv-grid" x1={pad.l} y1={Y(t)} x2={W - pad.r} y2={Y(t)} />
            <text className="cv-axis" x={pad.l - 7} y={Y(t) + 3} textAnchor="end">
              {nfmt(t, 0)}
            </text>
          </g>
        ))}
        <path d={area} className="cv-area" fill="url(#cvGrad)" />
        <path d={line} className="cv-line" />
        {points.map((p, i) => (
          <text key={`x${i}`} className="cv-axis" x={X(i)} y={H - 8} textAnchor="middle">
            {p.label}
          </text>
        ))}
        {points.map((p, i) =>
          i < last ? <circle key={`d${i}`} cx={X(i)} cy={Y(p.value)} r={2.4} className="cv-dot" /> : null,
        )}
        <circle cx={X(last)} cy={Y(points[last].value)} r={4.5} className="cv-end" />
        {hi !== null && (
          <>
            <line className="cv-cross" x1={X(hi)} y1={pad.t} x2={X(hi)} y2={pad.t + ih} />
            <circle className="cv-focus" cx={X(hi)} cy={Y(points[hi].value)} r={5} />
          </>
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
      {hi !== null && (
        <div
          className="cv-tip"
          style={{ left: `${(X(hi) / W) * 100}%`, top: `${(Y(points[hi].value) / H) * 100}%` }}
        >
          <span className="tt-x">{points[hi].label}</span> · $ {nfmt(points[hi].value, 1)}
        </div>
      )}
    </div>
  );
}
