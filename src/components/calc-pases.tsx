"use client";

import * as React from "react";
import { Panel, PanelHead } from "./panel";
import { sfmt, rfmt, pfmt } from "@/lib/format";
import { pase, tasaDirectaPase, tnaPase } from "@/lib/pases";
import { parseYmd, diasCorridos, sumarCorridos, hoyCordoba, fmtFecha } from "@/lib/habiles";

function IconPase() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h8M9 4l2 2-2 2" /><path d="M13 10H5m2-2-2 2 2 2" />
    </svg>
  );
}
function fmtInput(d: Date): string { return d.toISOString().slice(0, 10); }
function num(v: string): number { const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? n : NaN; }

export function CalcPases() {
  const [precioCorta, setPrecioCorta] = React.useState("323");
  const [precioLarga, setPrecioLarga] = React.useState("333");
  const [vtoCorta, setVtoCorta] = React.useState(() => fmtInput(sumarCorridos(parseYmd(hoyCordoba()), 30)));
  const [vtoLarga, setVtoLarga] = React.useState(() => fmtInput(sumarCorridos(parseYmd(hoyCordoba()), 120)));
  const [quita, setQuita] = React.useState("1");

  const pc = num(precioCorta), pl = num(precioLarga);
  const dias = vtoCorta && vtoLarga ? Math.max(0, diasCorridos(parseYmd(vtoCorta), parseYmd(vtoLarga))) : NaN;
  const p = pase(pc, pl); // spread lleno
  const q = num(quita);
  const spreadCliente = Number.isFinite(p) && Number.isFinite(q) ? p - q : NaN;
  const dir = tasaDirectaPase(pc, pl);
  const tna = tnaPase(pc, pl, dias);

  return (
    <Panel id="calc-pases">
      <PanelHead glyph={<IconPase />} title="Cotizador — pases" sub="Spread lleno entre posiciones · quita a cliente" />
      <div className="calc">
        <div className="calc-grid">
          <label className="calc-field"><span>Posición vendida (cercana) — precio</span>
            <input inputMode="decimal" value={precioCorta} onChange={(e) => setPrecioCorta(e.target.value)} /></label>
          <label className="calc-field"><span>Posición vendida — vto</span>
            <input type="date" suppressHydrationWarning value={vtoCorta} onChange={(e) => setVtoCorta(e.target.value)} /></label>
          <label className="calc-field"><span>Plazo de fijación (lejana) — precio</span>
            <input inputMode="decimal" value={precioLarga} onChange={(e) => setPrecioLarga(e.target.value)} /></label>
          <label className="calc-field"><span>Plazo de fijación — vto</span>
            <input type="date" suppressHydrationWarning value={vtoLarga} onChange={(e) => setVtoLarga(e.target.value)} /></label>
          <label className="calc-field"><span>Quita a cliente (USD)</span>
            <input inputMode="decimal" value={quita} onChange={(e) => setQuita(e.target.value)} /></label>
        </div>
        <div className="calc-out">
          <div className="calc-res">
            <span className="calc-res-lbl">Spread lleno</span>
            <span className={`calc-res-val ${p > 0 ? "pos" : p < 0 ? "neg" : "neu2"}`}>{sfmt(p, 2)}</span>
            <span className="calc-res-sub">larga − corta, por tonelada</span>
          </div>
          <div className="calc-meta">
            <span>A cliente (−quita): <b>{Number.isFinite(spreadCliente) ? sfmt(spreadCliente, 2) : "—"}</b></span>
            <span>Tasa directa: <b>{pfmt(dir, 2)}</b></span>
            <span>TNA USD: <b>{rfmt(tna, 1)}</b></span>
            <span>Días entre posiciones: <b>{Number.isFinite(dias) ? dias : "—"}</b></span>
            <span>{vtoCorta ? fmtFecha(parseYmd(vtoCorta)) : "—"} → {vtoLarga ? fmtFecha(parseYmd(vtoLarga)) : "—"}</span>
          </div>
        </div>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Pase</span> Spread lleno = precio del plazo de fijación − precio de la posición
          vendida · tasa directa = larga/corta − 1 · TNA USD anualizada por los días entre posiciones. La
          <b> quita</b> se resta al spread lleno para cotizar a clientes. Precios a mano; con la curva A3 salen
          por par de posiciones.
        </span>
      </div>
    </Panel>
  );
}
