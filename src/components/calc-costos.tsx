"use client";

import * as React from "react";
import { Panel, PanelHead } from "./panel";
import { nfmt, rfmt } from "@/lib/format";
import { ARANCELES_REF, costoFila } from "@/lib/costos";

function IconCost() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5v7M6.3 6.2c0-.8.8-1.2 1.7-1.2s1.7.4 1.7 1.1c0 1.6-3.4.9-3.4 2.6 0 .8.8 1.2 1.7 1.2s1.7-.4 1.7-1.1" />
    </svg>
  );
}

function num(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function CalcCostos() {
  const [monto, setMonto] = React.useState("1000000");
  const [iva, setIva] = React.useState("21");
  const [aranceles, setAranceles] = React.useState(
    ARANCELES_REF.map((a) => ({ ...a, comisionPct: String(a.comisionPct), derechosPct: String(a.derechosPct) })),
  );

  const setFila = (i: number, campo: "comisionPct" | "derechosPct", val: string) =>
    setAranceles((a) => a.map((f, j) => (j === i ? { ...f, [campo]: val } : f)));

  const m = num(monto);
  const ivaPct = num(iva);

  return (
    <Panel id="calc-costos">
      <PanelHead glyph={<IconCost />} title="Calculadora — costos de operar (Cocos)" sub="Comisión + derechos de mercado + IVA por instrumento" />

      <div className="calc">
        <div className="calc-grid">
          <label className="calc-field">
            <span>Monto operado</span>
            <input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </label>
          <label className="calc-field">
            <span>IVA (%)</span>
            <input inputMode="decimal" value={iva} onChange={(e) => setIva(e.target.value)} />
          </label>
        </div>

        <div className="table-scroll">
          <table className="tbl" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th className="l" scope="col">Instrumento</th>
                <th scope="col">Comis. %</th>
                <th scope="col">Derech. %</th>
                <th scope="col">Comisión</th>
                <th scope="col">Derechos</th>
                <th scope="col">IVA</th>
                <th scope="col">Costo total</th>
                <th scope="col">Costo %</th>
              </tr>
            </thead>
            <tbody>
              {aranceles.map((a, i) => {
                const r = costoFila(m, num(a.comisionPct), num(a.derechosPct), ivaPct);
                return (
                  <tr key={a.id}>
                    <td className="l sym">{a.nombre}</td>
                    <td><input className="cell-in num" inputMode="decimal" value={a.comisionPct} onChange={(e) => setFila(i, "comisionPct", e.target.value)} /></td>
                    <td><input className="cell-in num" inputMode="decimal" value={a.derechosPct} onChange={(e) => setFila(i, "derechosPct", e.target.value)} /></td>
                    <td className="dim">{nfmt(r.comision, 0)}</td>
                    <td className="dim">{nfmt(r.derechos, 0)}</td>
                    <td className="dim">{nfmt(r.iva, 0)}</td>
                    <td>{nfmt(r.total, 0)}</td>
                    <td className={r.pct > 0 ? "neg" : "dim"}>{rfmt(r.pct, 3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel-note">
        <span>
          <span className="k">Ojo</span>: los porcentajes son de <b>referencia</b> y editables — el tarifario de
          Cocos está detrás de Cloudflare y no se puede leer solo. Cargá los reales del tarifario web/app.
          Costo total = (comisión + derechos) × (1 + IVA). Costo % = costo total / monto operado.
        </span>
      </div>
    </Panel>
  );
}
