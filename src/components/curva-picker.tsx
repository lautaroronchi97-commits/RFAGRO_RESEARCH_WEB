"use client";

import * as React from "react";
import type { GranoCurva, PosCurva } from "@/lib/curva-types";

/**
 * Selector de posición de la curva de A3 (grano → posición). Al elegir una
 * posición, llama onPick con el precio real y el vencimiento para autocompletar.
 * Si no hay curva cargada, no renderiza nada (la calculadora sigue con inputs a mano).
 */
export function CurvaPicker({
  granos,
  onPick,
  label = "Traer de A3",
}: {
  granos: GranoCurva[];
  onPick: (pos: PosCurva & { nombre: string }) => void;
  label?: string;
}) {
  const [gi, setGi] = React.useState(0);
  if (!granos || granos.length === 0) return null;
  const grano = granos[Math.min(gi, granos.length - 1)];
  if (!grano) return null;

  return (
    <div className="curva-pick">
      <span className="curva-pick-lbl">{label}</span>
      <select
        aria-label="Grano"
        value={gi}
        onChange={(e) => setGi(Number(e.target.value))}
      >
        {granos.map((g, i) => (
          <option key={g.underlying} value={i}>{g.nombre}</option>
        ))}
      </select>
      <select
        aria-label="Posición"
        value=""
        onChange={(e) => {
          const p = grano.posiciones[Number(e.target.value)];
          if (p) onPick({ ...p, nombre: grano.nombre });
        }}
      >
        <option value="">Posición…</option>
        {grano.posiciones.map((p, i) => (
          <option key={p.symbol} value={i}>{p.posicion} · {p.precio}</option>
        ))}
      </select>
    </div>
  );
}
