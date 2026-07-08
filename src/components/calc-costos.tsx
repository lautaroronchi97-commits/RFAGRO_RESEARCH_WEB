"use client";

import * as React from "react";
import { Panel, PanelHead } from "./panel";
import { nfmt, rfmt } from "@/lib/format";
import { ARANCELES, costoFila, type Persona } from "@/lib/costos";

function IconCost() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5v7M6.3 6.2c0-.8.8-1.2 1.7-1.2s1.7.4 1.7 1.1c0 1.6-3.4.9-3.4 2.6 0 .8.8 1.2 1.7 1.2s1.7-.4 1.7-1.1" />
    </svg>
  );
}

const numPct = (v: string) => { const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const numMonto = (v: string) => { const n = Number(v.replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };

type Fila = { id: string; nombre: string; humanaPct: string; humanaTna: boolean; juridicaPct: string; juridicaTna: boolean; derPct: string };

export function CalcCostos() {
  const [monto, setMonto] = React.useState("1000000");
  const [iva, setIva] = React.useState("21");
  const [dias, setDias] = React.useState("30");
  const [persona, setPersona] = React.useState<Persona>("juridica");
  const [filas, setFilas] = React.useState<Fila[]>(
    ARANCELES.map((a) => ({
      id: a.id, nombre: a.nombre,
      humanaPct: String(a.humana.pct), humanaTna: a.humana.tna,
      juridicaPct: String(a.juridica.pct), juridicaTna: a.juridica.tna,
      derPct: String(a.derechosPct),
    })),
  );

  const setCampo = (i: number, campo: "humanaPct" | "juridicaPct" | "derPct", val: string) =>
    setFilas((f) => f.map((r, j) => (j === i ? { ...r, [campo]: val } : r)));

  const m = numMonto(monto);
  const ivaPct = numPct(iva);
  const d = numPct(dias);

  return (
    <Panel id="calc-costos">
      <PanelHead glyph={<IconCost />} title="Calculadora — costos de operar (Cocos)" sub="Comisión web/app + derechos de mercado + IVA por instrumento" />

      <div className="calc">
        <div className="calc-grid">
          <label className="calc-field">
            <span>Monto operado</span>
            <input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </label>
          <label className="calc-field">
            <span>Plazo (días) — para % TNA</span>
            <input inputMode="decimal" value={dias} onChange={(e) => setDias(e.target.value)} />
          </label>
          <label className="calc-field">
            <span>IVA (%)</span>
            <input inputMode="decimal" value={iva} onChange={(e) => setIva(e.target.value)} />
          </label>
          <label className="calc-field">
            <span>Tipo de cuenta</span>
            <select value={persona} onChange={(e) => setPersona(e.target.value as Persona)}>
              <option value="humana">Persona humana</option>
              <option value="juridica">Persona jurídica</option>
            </select>
          </label>
        </div>

        <div className="table-scroll">
          <table className="tbl" style={{ minWidth: 720 }}>
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
              {filas.map((f, i) => {
                const esHum = persona === "humana";
                const comPct = esHum ? f.humanaPct : f.juridicaPct;
                const comCampo = esHum ? "humanaPct" : "juridicaPct";
                const tna = esHum ? f.humanaTna : f.juridicaTna;
                const r = costoFila(m, { pct: numPct(comPct), tna }, numPct(f.derPct), ivaPct, d);
                return (
                  <tr key={f.id}>
                    <td className="l sym">{f.nombre}</td>
                    <td>
                      <span className="cell-wrap">
                        <input className="cell-in num sm" inputMode="decimal" value={comPct} onChange={(e) => setCampo(i, comCampo, e.target.value)} />
                        {tna && <span className="tna-tag">TNA</span>}
                      </span>
                    </td>
                    <td><input className="cell-in num sm" inputMode="decimal" value={f.derPct} onChange={(e) => setCampo(i, "derPct", e.target.value)} /></td>
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
          <span className="k">Real</span> tarifario Cocos (comisión web/app, humana/jurídica), editable. Las
          comisiones <b>TNA</b> (letras persona humana, cauciones, cheque diferido) se prorratean por el plazo en
          días. Los <b>derechos de mercado</b> no están en el tarifario de Cocos (los cobra BYMA/A3/MAE): van como
          referencia editable. Costo total = (comisión + derechos) × (1 + IVA).
        </span>
      </div>
    </Panel>
  );
}
