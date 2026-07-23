"use client";

import * as React from "react";
import { nfmt } from "@/lib/format";
import { BANDA_EMOJI, DIRECCION_GLIFO, DIRECCION_LABEL, type Banda } from "@/lib/lineup/mesa_calor";
import { FiltroGrano, type GranoFiltroValue, type GranoKey } from "../filtro-grano";
import type { ProductoCalor } from "@/lib/lineup/temperatura";

// Acento por banda (frío→caliente). CALIENTE = demanda física fuerte.
const BANDA_COLOR: Record<Banda, string> = {
  CALIENTE: "#DC2626",
  FIRME: "#EA9A16",
  NEUTRO: "var(--dim, #8a8f83)",
  PESADO: "#38BDF8",
  "MUY PESADO": "#2563EB",
  "SIN HISTORIA": "var(--dim, #8a8f83)",
};
const BANDA_LABEL: Record<Banda, string> = {
  CALIENTE: "CALIENTE", FIRME: "FIRME", NEUTRO: "NEUTRO", PESADO: "PESADO",
  "MUY PESADO": "MUY PESADO", "SIN HISTORIA": "SIN HISTORIA",
};

/** cod de mesa_calor (MAIZE/WHEAT/SOJA_CRUSH/SBS) → grano del filtro compartido. */
const GRANO_DE_COD: Record<string, GranoKey> = {
  MAIZE: "MAI",
  WHEAT: "TRI",
  SOJA_CRUSH: "SOJ",
  SBS: "SOJ",
};

/** Toneladas → miles de t ("2.817"). */
const kt = (v: number | null | undefined) => (v == null ? "—" : nfmt(Math.round(v / 1000), 0));
const pct = (v: number | null) => (v == null ? "—" : `${v}`);

function CalorCard({ p }: { p: ProductoCalor }) {
  const color = BANDA_COLOR[p.banda];
  const glifo = DIRECCION_GLIFO[p.direccion];
  return (
    <div className="calor-card" style={{ borderTopColor: color }}>
      <div className="calor-card-top">
        <span className="calor-card-name">{p.display}</span>
        <span className="calor-card-dir" title={DIRECCION_LABEL[p.direccion]}>{glifo}</span>
      </div>
      <div className="calor-card-num" style={{ color }}>
        {BANDA_EMOJI[p.banda]}
        {p.calor == null ? "—" : nfmt(p.calor, 0)}
      </div>
      <div className="calor-card-band" style={{ color }}>{BANDA_LABEL[p.banda]}</div>
      <div className="calor-card-accion">{p.accion}</div>
      <div className="calor-card-expl dim">{p.explicacion}</div>
      <dl className="calor-card-meta">
        <div><dt>pctl gap</dt><dd>{pct(p.pctlGap)}</dd></div>
        <div><dt>pctl line-up</dt><dd>{pct(p.pctlDensidad)}</dd></div>
        {p.pctlFarmer != null && <div><dt>pctl farmer</dt><dd>{pct(p.pctlFarmer)}</dd></div>}
        <div><dt>gap</dt><dd>{kt(p.gapHoy)} kt</dd></div>
        <div><dt>line-up 30d</dt><dd>{kt(p.densidadHoy)} kt</dd></div>
      </dl>
    </div>
  );
}

export function TemperaturaGrid({ productos }: { productos: ProductoCalor[] }) {
  const [filtro, setFiltro] = React.useState<GranoFiltroValue>("todos");
  const presentes = [...new Set(productos.map((p) => GRANO_DE_COD[p.cod]).filter(Boolean))] as GranoKey[];
  const visibles = filtro === "todos" ? productos : productos.filter((p) => GRANO_DE_COD[p.cod] === filtro);

  return (
    <div>
      <FiltroGrano value={filtro} onChange={setFiltro} presentes={presentes} />
      <div className="calor-grid">
        {visibles.map((p) => <CalorCard key={p.cod} p={p} />)}
      </div>
    </div>
  );
}
