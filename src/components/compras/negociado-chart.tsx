"use client";

import { useMemo, useState } from "react";
import { nfmt } from "@/lib/format";
import { MESES_ES } from "@/lib/dates";
import type { PuntoHisto } from "@/lib/compras/negociado";
import { useCrosshair, SvgLineChartBase } from "@/components/chart-svg-base";
import { ChartTabla } from "@/components/chart-tabla";

/**
 * Histograma del volumen negociado (compras semanales SIO Granos): barras apiladas por
 * sector (Exportación + Industria), toggle Semanal (últimas 52 semanas) / Mensual (suma
 * calendario, últimos 24 meses) y selector de grano (Todos = suma de los 7). SVG a mano
 * (motor compartido `chart-svg-base.tsx`), mismo idioma que evolucion-chart (grilla
 * punteada, ejes mono, claro/oscuro por variables CSS). Eje y en miles de toneladas.
 */

const W = 660;
const H = 260;
const pad = { l: 48, r: 16, t: 16, b: 30 };
const iw = W - pad.l - pad.r;
const ih = H - pad.t - pad.b;

type Barra = { clave: string; label: string; exp: number; ind: number };

function labelSemana(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
function labelMes(ym: string): string {
  const mes = Number(ym.slice(5, 7));
  return `${(MESES_ES[mes - 1] ?? "").toLowerCase()} ${ym.slice(2, 4)}`;
}

export function NegociadoChart({ serie, productos }: { serie: PuntoHisto[]; productos: { cod: string; display: string }[] }) {
  const [grano, setGrano] = useState("TODOS");
  const [modo, setModo] = useState<"semanal" | "mensual">("semanal");

  const barras = useMemo<Barra[]>(() => {
    const filtrada = grano === "TODOS" ? serie : serie.filter((p) => p.cod === grano);
    const map = new Map<string, { exp: number; ind: number }>();
    for (const p of filtrada) {
      const clave = modo === "semanal" ? p.fecha : p.fecha.slice(0, 7);
      if (!map.has(clave)) map.set(clave, { exp: 0, ind: 0 });
      const b = map.get(clave)!;
      if (p.sector === "INDUSTRIA") b.ind += p.tn;
      else b.exp += p.tn;
    }
    const claves = [...map.keys()].sort();
    const ventana = modo === "semanal" ? 52 : 24;
    return claves.slice(-ventana).map((clave) => ({
      clave,
      label: modo === "semanal" ? labelSemana(clave) : labelMes(clave),
      ...map.get(clave)!,
    }));
  }, [serie, grano, modo]);

  const maxTotal = Math.max(1, ...barras.map((b) => b.exp + b.ind));
  const yMax = maxTotal * 1.08;
  const paso = iw / Math.max(1, barras.length);
  const anchoBarra = Math.max(2, paso * 0.72);
  const X = (i: number) => pad.l + paso * i + (paso - anchoBarra) / 2;
  const Y = (v: number) => pad.t + (1 - v / yMax) * ih;
  const yTicks = Array.from({ length: 5 }, (_, k) => (yMax * k) / 4);
  // ~6 etiquetas en el eje x
  const cadaX = Math.max(1, Math.ceil(barras.length / 6));

  // Histograma de barras evenly-spaced: el índice sale de la posición X directa (no hay "más
  // cercano" que buscar entre puntos — ver chart-svg-base.tsx).
  const { hi, onPointerMove, onPointerLeave } = useCrosshair(W, H, (px) => {
    if (barras.length === 0) return null;
    return Math.min(barras.length - 1, Math.max(0, Math.floor((px - pad.l) / paso)));
  });

  if (serie.length === 0) {
    return <div className="chart-wrap chart-empty">Sin historia de compras para graficar.</div>;
  }

  const b = hi !== null ? barras[hi] : null;

  return (
    <div>
      <div className="ng-controles">
        <div className="gx-seg" role="group" aria-label="Frecuencia">
          <button type="button" className={modo === "semanal" ? "on" : ""} onClick={() => setModo("semanal")}>Semanal</button>
          <button type="button" className={modo === "mensual" ? "on" : ""} onClick={() => setModo("mensual")}>Mensual</button>
        </div>
        <label className="lu-field">
          <span>Grano</span>
          <select value={grano} onChange={(e) => setGrano(e.target.value)}>
            <option value="TODOS">Todos</option>
            {productos.map((p) => <option key={p.cod} value={p.cod}>{p.display}</option>)}
          </select>
        </label>
        <span className="ng-hint dim">
          {modo === "semanal" ? "Últimas 52 semanas" : "Últimos 24 meses"} · miles de t
        </span>
      </div>

      <SvgLineChartBase
        w={W}
        h={H}
        inner={{ x: pad.l, y: pad.t, width: iw, height: ih }}
        ariaLabel="Histograma de volumen negociado por semana o mes, apilado por sector"
        yTicks={yTicks.map((t) => ({ valor: t, y: Y(t), label: nfmt(t / 1000, 0) }))}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        after={
          <>
            {b && hi !== null && (
              <div className="cv-tip" style={{ left: `${((X(hi) + anchoBarra / 2) / W) * 100}%`, top: `${(Y(b.exp + b.ind) / H) * 100}%` }}>
                <span className="tt-x">{b.label}</span> · {nfmt(b.exp + b.ind, 0)} t
                <span className="cv-tip-sub">Exportación {nfmt(b.exp, 0)} · Industria {nfmt(b.ind, 0)}</span>
              </div>
            )}
            <div className="cv-legend">
              <span className="lk"><span className="sw ng-sw-exp" />Exportación</span>
              <span className="lk"><span className="sw ng-sw-ind" />Industria</span>
            </div>
          </>
        }
      >
        {barras.map((bar, i) => {
          const x = X(i);
          const yExp = Y(bar.exp);
          const yTop = Y(bar.exp + bar.ind);
          return (
            <g key={bar.clave} className={hi === i ? "ng-g-hi" : undefined}>
              {bar.exp > 0 && <rect className="ng-bar-exp" x={x} y={yExp} width={anchoBarra} height={pad.t + ih - yExp} />}
              {bar.ind > 0 && <rect className="ng-bar-ind" x={x} y={yTop} width={anchoBarra} height={yExp - yTop} />}
            </g>
          );
        })}
        {barras.map((bar, i) =>
          i % cadaX === 0 ? (
            <text key={`x${bar.clave}`} className="cv-axis" x={X(i) + anchoBarra / 2} y={H - 9} textAnchor="middle">
              {bar.label}
            </text>
          ) : null,
        )}
      </SvgLineChartBase>

      <ChartTabla
        titulo={`Datos del gráfico · ${modo === "semanal" ? "semanal" : "mensual"}`}
        columnas={[
          { key: "periodo", label: modo === "semanal" ? "Semana" : "Mes", align: "left" },
          { key: "exp", label: "Exportación (t)" },
          { key: "ind", label: "Industria (t)" },
          { key: "total", label: "Total (t)" },
        ]}
        filas={barras.map((bar) => ({
          periodo: bar.label,
          exp: bar.exp > 0 ? nfmt(bar.exp, 0) : null,
          ind: bar.ind > 0 ? nfmt(bar.ind, 0) : null,
          total: nfmt(bar.exp + bar.ind, 0),
        }))}
        nota="Mismos valores que dibuja el histograma (toneladas), por sector. «—» = sin volumen en ese período."
      />
    </div>
  );
}
