"use client";

import * as React from "react";
import { Panel, PanelHead } from "./panel";
import { sfmt, rfmt } from "@/lib/format";
import { evaluarFijar, type PosCurva } from "@/lib/fijar";
import { hoyCordoba, parseYmd } from "@/lib/habiles";
import type { GranoCurva } from "@/lib/curva-types";

function IconFijar() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 13h12" />
      <path d="M4 13V8M7 13V5M10 13V9M13 13V6" />
    </svg>
  );
}

function num(v: string): number {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

const CURVA_INI: PosCurva[] = [
  { vto: "2026-07-31", precio: 328 },
  { vto: "2026-09-30", precio: 333 },
  { vto: "2026-12-31", precio: 340 },
  { vto: "2027-04-30", precio: 350 },
];

export function CalcFijar({ granos = [] }: { granos?: GranoCurva[] }) {
  const [base, setBase] = React.useState("320");
  const [delta, setDelta] = React.useState("2");
  const [curva, setCurva] = React.useState<{ vto: string; precio: string }[]>(
    CURVA_INI.map((p) => ({ vto: p.vto, precio: String(p.precio) })),
  );

  const setFila = (i: number, campo: "vto" | "precio", val: string) =>
    setCurva((c) => c.map((f, j) => (j === i ? { ...f, [campo]: val } : f)));
  const agregar = () => setCurva((c) => [...c, { vto: "", precio: "" }]);
  const quitar = (i: number) => setCurva((c) => c.filter((_, j) => j !== i));

  const hoyMs = parseYmd(hoyCordoba()).getTime();
  const filas = evaluarFijar(
    num(base),
    num(delta),
    curva.map((f) => ({ vto: f.vto, precio: num(f.precio) })),
    hoyMs,
    (vto) => (vto ? parseYmd(vto).getTime() : null),
  );

  return (
    <Panel id="calc-fijar">
      <PanelHead glyph={<IconFijar />} title="Cotizador — negocios a fijar" sub="Curva de futuros · resultado y TNA por plazo" />

      <div className="calc">
        {granos.length > 0 && (
          <div className="curva-pick">
            <span className="curva-pick-lbl">Traer curva de A3</span>
            <select
              aria-label="Grano"
              defaultValue=""
              onChange={(e) => {
                const g = granos[Number(e.target.value)];
                if (g) setCurva(g.posiciones.map((p) => ({ vto: p.vto, precio: String(p.precio) })));
                e.currentTarget.selectedIndex = 0;
              }}
            >
              <option value="" disabled>Grano…</option>
              {granos.map((g, i) => (
                <option key={g.underlying} value={i}>{g.nombre}</option>
              ))}
            </select>
          </div>
        )}
        <div className="calc-grid">
          <label className="calc-field">
            <span>Precio a pagar (USD)</span>
            <input inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} />
          </label>
          <label className="calc-field">
            <span>Delta esperado (USD)</span>
            <input inputMode="decimal" value={delta} onChange={(e) => setDelta(e.target.value)} />
          </label>
        </div>

        <div className="table-scroll">
          <table className="tbl" style={{ minWidth: 620 }}>
            <thead>
              <tr>
                <th className="l" scope="col">Vencimiento</th>
                <th scope="col">Futuro (USD)</th>
                <th scope="col">Días</th>
                <th scope="col">Result. bruto</th>
                <th scope="col">Result. neto</th>
                <th scope="col">TNA USD</th>
                <th scope="col" aria-label="quitar" />
              </tr>
            </thead>
            <tbody>
              {curva.map((f, i) => {
                const r = filas[i];
                return (
                  <tr key={i}>
                    <td className="l">
                      <input className="cell-in" type="date" value={f.vto} onChange={(e) => setFila(i, "vto", e.target.value)} />
                    </td>
                    <td>
                      <input className="cell-in num" inputMode="decimal" value={f.precio} onChange={(e) => setFila(i, "precio", e.target.value)} />
                    </td>
                    <td className="dim">{r ? r.dias : "—"}</td>
                    <td className={r && r.resultadoBruto > 0 ? "pos" : r && r.resultadoBruto < 0 ? "neg" : "dim"}>{r ? sfmt(r.resultadoBruto, 2) : "—"}</td>
                    <td className={r ? (r.gana ? "pos" : "neg") : "dim"}>{r ? sfmt(r.resultadoNeto, 2) : "—"}</td>
                    <td className="dim">{r ? rfmt(r.tna, 1) : "—"}</td>
                    <td>
                      <button type="button" className="cell-del" onClick={() => quitar(i)} aria-label="Quitar posición">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" className="calc-add" onClick={agregar}>+ posición</button>
      </div>

      <div className="panel-note">
        <span>
          <span className="k">A fijar</span>: resultado bruto = futuro − precio a pagar · resultado neto = bruto −
          delta esperado (delta positivo = malo) · TNA USD = (futuro/pagar − 1) × 365/días. Verde = plazo donde
          ganás; rojo = donde perdés. La simulación toma el <b>precio de futuros</b>, que puede diferir del spot al
          fijar. El delta esperado hoy se carga a mano; en producción viene del proyecto de fijaciones.
        </span>
      </div>
    </Panel>
  );
}
