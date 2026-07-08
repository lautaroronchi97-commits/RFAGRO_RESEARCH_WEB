"use client";

import * as React from "react";
import { Panel, PanelHead } from "./panel";
import { nfmt, pfmt, rfmt } from "@/lib/format";
import { tasaDirecta, tnaUSD, spread, teaUSD } from "@/lib/arbitraje";
import { hoyCordoba, parseYmd, diasCorridos, sumarCorridos, fmtFecha } from "@/lib/habiles";
import { CurvaPicker } from "./curva-picker";
import type { GranoCurva } from "@/lib/curva-types";

function IconArb() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 11h5l2-6 2 6h3" />
      <path d="M11 3h3v3" />
    </svg>
  );
}

function fmtInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function num(v: string): number {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function CalcArbitraje({ granos = [] }: { granos?: GranoCurva[] }) {
  const [pizarra, setPizarra] = React.useState("320");
  const [futuro, setFuturo] = React.useState("330");
  const [fechaVto, setFechaVto] = React.useState(() =>
    fmtInput(sumarCorridos(parseYmd(hoyCordoba()), 90)),
  );

  const dias = fechaVto
    ? Math.max(0, diasCorridos(parseYmd(hoyCordoba()), parseYmd(fechaVto)))
    : NaN;

  const pz = num(pizarra);
  const ft = num(futuro);
  const dir = tasaDirecta(ft, pz) * 100;
  const tna = tnaUSD(ft, pz, dias);
  const tea = teaUSD(ft, pz, dias);
  const sp = spread(ft, pz);

  const signo = Number.isFinite(tna) ? (tna > 0 ? "pos" : tna < 0 ? "neg" : "neu2") : "neu2";
  const senal = !Number.isFinite(tna)
    ? ""
    : tna > 0
      ? "Comprar spot + vender diferido (capturar tasa)"
      : tna < 0
        ? "Vender spot + recomprar futuros"
        : "Sin carry";

  return (
    <Panel id="calc-arbitraje">
      <PanelHead glyph={<IconArb />} title="Calculadora — arbitraje disponible ↔ futuro" sub="Tasa directa · TNA USD · spread (carry de granos)" />

      <div className="calc">
        <CurvaPicker granos={granos} onPick={(p) => { setFuturo(String(p.precio)); setFechaVto(p.vto); }} />
        <div className="calc-grid">
          <label className="calc-field">
            <span>Pizarra / disponible (USD)</span>
            <input inputMode="decimal" value={pizarra} onChange={(e) => setPizarra(e.target.value)} />
          </label>
          <label className="calc-field">
            <span>Precio futuro (USD)</span>
            <input inputMode="decimal" value={futuro} onChange={(e) => setFuturo(e.target.value)} />
          </label>
          <label className="calc-field">
            <span>Vencimiento de la posición</span>
            <input type="date" suppressHydrationWarning value={fechaVto} onChange={(e) => setFechaVto(e.target.value)} />
          </label>
        </div>

        <div className="calc-out">
          <div className="calc-res">
            <span className="calc-res-lbl">TNA USD</span>
            <span className={`calc-res-val ${signo}`}>{rfmt(tna, 1)}</span>
            {senal && <span className="calc-res-sub">{senal}</span>}
          </div>
          <div className="calc-meta">
            <span>Tasa directa: <b>{pfmt(dir, 2)}</b></span>
            <span>TEA USD: <b>{rfmt(tea, 1)}</b></span>
            <span>Spread: <b>{nfmt(sp, 2)} USD</b></span>
            <span>Días al vto: <b>{Number.isFinite(dias) ? dias : "—"}</b> ({fechaVto ? fmtFecha(parseYmd(fechaVto)) : "—"})</span>
          </div>
        </div>
      </div>

      <div className="panel-note">
        <span>
          <span className="k">Fórmula real</span> (Excel RF): tasa directa = futuro/pizarra − 1 · TNA USD =
          (futuro/pizarra − 1) × 365/días · spread = futuro − pizarra. Por ahora los precios se cargan a
          mano; cuando estén los cierres A3 en la base, se completan solos por posición.
        </span>
      </div>
    </Panel>
  );
}
