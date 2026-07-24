"use client";

import * as React from "react";
import { ChartMarca } from "./chart-marca";

/**
 * Motor SVG compartido de los charts "a mano" del proyecto (L2, auditoría E7, docs/
 * auditoria/E7-sintesis.md §6 — hallazgo #14 de E4-codigo.md): `evolucion-chart.tsx`,
 * `compras/negociado-chart.tsx` y `dolar-futuro-chart.tsx` reimplementaban cada uno el
 * mismo envoltorio (`.chart-wrap` + `ChartMarca` + `<svg viewBox>` + grilla de yTicks +
 * `<rect>` interactivo con `onPointerMove/onPointerLeave`) y el mismo manejo de estado
 * del crosshair (índice "hi" + conversión de coordenadas de cliente a px locales del SVG).
 *
 * Lo que NO se unificó a propósito: el algoritmo de "punto más cercano" en sí. Los 3
 * charts lo resuelven distinto y ESO es real, no una copia — `evolucion-chart` busca el
 * punto más cercano en (x,y) sobre un array plano de VARIAS series superpuestas (necesita
 * las dos coordenadas para desambiguar series que se cruzan); `dolar-futuro-chart` busca
 * el más cercano en X sobre una sola serie; `negociado-chart` (histograma) calcula el
 * índice de la barra por posición directa (barras de ancho fijo, no hay "más cercano" que
 * buscar). Forzar una sola métrica de distancia habría cambiado el comportamiento del
 * crosshair en alguno de los 3 — en cambio, `useCrosshair` deja que cada chart pase su
 * propia función `hallar(px, py) => índice | null`, y comparte SOLO la parte que sí era
 * idéntica: el estado (`hi`), la conversión de coordenadas del puntero, y el wireup de los
 * handlers. `spread-chart.tsx` (recharts) y `ChartMarca`/`ChartTabla` quedan afuera del
 * alcance de este lote — ya usan un motor distinto o ya estaban deduplicados.
 */

/** Estado + wiring de un crosshair sobre un `<rect>` interactivo de tamaño `w`×`h`.
 *  `hallar` recibe la posición del puntero en px LOCALES del `viewBox` (no de pantalla)
 *  y devuelve el índice a resaltar, o `null` para no resaltar nada. */
export function useCrosshair(w: number, h: number, hallar: (px: number, py: number) => number | null) {
  const [hi, setHi] = React.useState<number | null>(null);

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * w;
      const py = ((e.clientY - rect.top) / rect.height) * h;
      setHi(hallar(px, py));
    },
    [w, h, hallar],
  );
  const onPointerLeave = React.useCallback(() => setHi(null), []);

  return { hi, onPointerMove, onPointerLeave };
}

export type EjeYTick = { valor: number; y: number; label: string };

export type SvgLineChartBaseProps = {
  w: number;
  h: number;
  /** Área interior (excluyendo padding) — solo para el `<rect>` interactivo. */
  inner: { x: number; y: number; width: number; height: number };
  ariaLabel: string;
  /** Grilla horizontal (líneas punteadas + etiqueta del eje Y). Ya con `y`/`label` resueltos. */
  yTicks: EjeYTick[];
  /** Ancho del propio eje Y (línea + texto) — por defecto llega hasta `w - padRight`. */
  yGridHasta?: number;
  onPointerMove: (e: React.PointerEvent<SVGRectElement>) => void;
  onPointerLeave: () => void;
  /** Marcas del chart (paths/circles/bars) + labels del eje X — cada chart las arma distinto. */
  children: React.ReactNode;
  /** `<defs>` propio del chart (ej. gradiente de área) — se renderiza antes que la grilla. */
  defs?: React.ReactNode;
  className?: string;
  /** Contenido DESPUÉS del `</svg>` pero DENTRO de `.chart-wrap` (tooltip/leyenda): `.cv-tip` es
   *  `position:absolute` y necesita ese ancestro `position:relative` — no puede ir afuera. */
  after?: React.ReactNode;
};

/**
 * Envoltorio SVG compartido: `.chart-wrap` + `ChartMarca` + `<svg viewBox>` + grilla de
 * yTicks + el `<rect>` interactivo. Las marcas propias del chart (líneas/áreas/barras/
 * puntos), las etiquetas del eje X y el tooltip quedan afuera (children / el propio chart)
 * porque ESO sí varía de verdad entre los 3 — no hay nada que ganar forzándolo acá.
 *
 * Nota para cualquier chart SVG de líneas nuevo: usar este motor en vez de copiar el
 * envoltorio de cero (ver `evolucion-chart.tsx`/`dolar-futuro-chart.tsx`/`negociado-chart.tsx`
 * para ejemplos de uso).
 */
export function SvgLineChartBase({
  w,
  h,
  inner,
  ariaLabel,
  yTicks,
  onPointerMove,
  onPointerLeave,
  children,
  defs,
  className,
  after,
}: SvgLineChartBaseProps) {
  return (
    <div className="chart-wrap">
      <ChartMarca />
      <svg viewBox={`0 0 ${w} ${h}`} className={className ?? "cv"} role="img" aria-label={ariaLabel}>
        {defs}
        {yTicks.map((t, k) => (
          <g key={`y${k}`}>
            <line className="cv-grid" x1={inner.x} y1={t.y} x2={inner.x + inner.width} y2={t.y} />
            <text className="cv-axis" x={inner.x - 7} y={t.y + 3} textAnchor="end">
              {t.label}
            </text>
          </g>
        ))}
        {children}
        <rect
          x={inner.x}
          y={inner.y}
          width={inner.width}
          height={inner.height}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        />
      </svg>
      {after}
    </div>
  );
}
