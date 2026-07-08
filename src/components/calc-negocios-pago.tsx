"use client";

import * as React from "react";
import { Panel, PanelHead } from "./panel";
import { nfmt, pfmt } from "@/lib/format";
import { hoyCordoba, parseYmd, sumarHabiles, sumarCorridos, diasCorridos, fmtFecha } from "@/lib/habiles";

function IconPago() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <circle cx="8" cy="8" r="1.6" />
      <path d="M4.5 6.5h0M11.5 9.5h0" />
    </svg>
  );
}

function fmtInput(d: Date): string { return d.toISOString().slice(0, 10); }
function num(v: string): number { const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? n : NaN; }

export function CalcNegociosPago() {
  const [futuro, setFuturo] = React.useState("340");
  const [vto, setVto] = React.useState(() => fmtInput(sumarCorridos(parseYmd(hoyCordoba()), 90)));
  const [habiles, setHabiles] = React.useState("5");
  const [tasa, setTasa] = React.useState("8");
  const [tc, setTc] = React.useState("");

  const nHabiles = Math.max(0, Math.round(num(habiles)) || 0);
  const fechaPago = sumarHabiles(parseYmd(hoyCordoba()), nHabiles);
  const dias = vto ? Math.max(0, diasCorridos(fechaPago, parseYmd(vto))) : NaN;

  const ft = num(futuro);
  const ta = num(tasa);
  const disponible =
    ft > 0 && Number.isFinite(ta) && Number.isFinite(dias) ? ft / (1 + (ta / 100) * (dias / 365)) : NaN;
  const descuento = Number.isFinite(disponible) ? ft - disponible : NaN;
  const directa = Number.isFinite(disponible) && disponible > 0 ? (ft / disponible - 1) * 100 : NaN;
  const tcv = tc.trim() ? num(tc) : NaN;
  const pesos = Number.isFinite(disponible) && Number.isFinite(tcv) ? Math.floor(disponible * tcv) : NaN;

  return (
    <Panel id="calc-negocios-pago">
      <PanelHead glyph={<IconPago />} title="Cotizador — negocios con pagos" sub="Disponible = futuro descontado al pago · pesificable por TC" />
      <div className="calc">
        <div className="calc-grid">
          <label className="calc-field"><span>Precio futuro (USD)</span>
            <input inputMode="decimal" value={futuro} onChange={(e) => setFuturo(e.target.value)} /></label>
          <label className="calc-field"><span>Vencimiento de la posición</span>
            <input type="date" suppressHydrationWarning value={vto} onChange={(e) => setVto(e.target.value)} /></label>
          <label className="calc-field"><span>Pago (días hábiles)</span>
            <input inputMode="numeric" value={habiles} onChange={(e) => setHabiles(e.target.value)} /></label>
          <label className="calc-field"><span>Tasa USD anual (%)</span>
            <input inputMode="decimal" value={tasa} onChange={(e) => setTasa(e.target.value)} /></label>
          <label className="calc-field"><span>TC del día (ARS, a mano)</span>
            <input inputMode="decimal" value={tc} placeholder="—" onChange={(e) => setTc(e.target.value)} /></label>
        </div>
        <div className="calc-out">
          <div className="calc-res">
            <span className="calc-res-lbl">Disponible (USD)</span>
            <span className="calc-res-val">{Number.isFinite(disponible) ? nfmt(disponible, 2) : "—"}</span>
            <span className="calc-res-sub">futuro descontado al pago</span>
          </div>
          <div className="calc-meta">
            <span>Precio en pesos: <b>{Number.isFinite(pesos) ? nfmt(pesos, 0) : "—"}</b></span>
            <span>Descuento: <b>{Number.isFinite(descuento) ? nfmt(descuento, 2) : "—"} USD</b></span>
            <span>Tasa directa: <b>{pfmt(directa, 2)}</b></span>
            <span>Pago: <b>{fmtFecha(fechaPago)}</b> · Días: <b>{Number.isFinite(dias) ? dias : "—"}</b></span>
          </div>
        </div>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Con pago</span> Disponible USD = futuro ÷ (1 + tasa × días/365), interés simple; los
          días van del pago (hoy + {nHabiles} hábiles) al vencimiento. Precio en pesos = disponible × TC del día
          (a mano, redondeo hacia abajo). Editables: precio futuro, vencimiento, días de pago, tasa y TC.
        </span>
      </div>
    </Panel>
  );
}
