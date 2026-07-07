"use client";

import * as React from "react";
import { Panel, PanelHead } from "./panel";
import { nfmt, sfmt } from "@/lib/format";
import { ESTRATEGIAS, payoffTotal, primaNeta, serieEscenarios, type Pata, type Tipo, type Lado } from "@/lib/estrategias";

function IconStrat() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 10l3-4 3 2 3-5 3 3" />
    </svg>
  );
}

type PataStr = { tipo: Tipo; lado: Lado; strike: string; prima: string };
const num = (v: string) => { const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const toStr = (p: Pata): PataStr => ({ tipo: p.tipo, lado: p.lado, strike: String(p.strike), prima: String(p.prima) });
const toNum = (p: PataStr): Pata => ({ tipo: p.tipo, lado: p.lado, strike: num(p.strike), prima: num(p.prima) });

export function CalcEstrategias() {
  const [estId, setEstId] = React.useState("collar_venta");
  const [patas, setPatas] = React.useState<PataStr[]>(
    () => (ESTRATEGIAS.find((e) => e.id === "collar_venta")?.patas ?? []).map(toStr),
  );

  const cambiarEstrategia = (id: string) => {
    setEstId(id);
    const def = ESTRATEGIAS.find((e) => e.id === id);
    if (def) setPatas(def.patas.map(toStr));
  };
  const setPata = (i: number, campo: keyof PataStr, val: string) =>
    setPatas((ps) => ps.map((p, j) => (j === i ? { ...p, [campo]: val } : p)));
  const agregar = () => setPatas((ps) => [...ps, { tipo: "call", lado: "compra", strike: "320", prima: "5" }]);
  const quitar = (i: number) => setPatas((ps) => ps.filter((_, j) => j !== i));

  const patasNum = patas.map(toNum).filter((p) => Number.isFinite(p.strike) && Number.isFinite(p.prima));
  const strikes = patasNum.map((p) => p.strike).filter((s) => s > 0);
  const centro = strikes.length ? (Math.min(...strikes) + Math.max(...strikes)) / 2 : 320;
  const span = strikes.length ? Math.max(Math.max(...strikes) - Math.min(...strikes), centro * 0.15) : centro * 0.3;
  const desde = Math.min(...strikes, centro) - span;
  const hasta = Math.max(...strikes, centro) + span;
  const serie = patasNum.length ? serieEscenarios(patasNum, desde, hasta, 41) : [];
  const neta = primaNeta(patasNum);
  const claves = strikes.length
    ? [...new Set([desde, ...strikes, centro, hasta])].sort((a, b) => a - b).map((P) => ({ P, resultado: payoffTotal(P, patasNum) }))
    : [];

  return (
    <Panel id="calc-estrategias">
      <PanelHead glyph={<IconStrat />} title="Calculadora — estrategias con opciones" sub="Combinadas (collar, calls/puts, lanzamientos) · payoff y escenarios" />

      <div className="calc">
        <label className="calc-field calc-mode">
          <span>Estrategia</span>
          <select value={estId} onChange={(e) => cambiarEstrategia(e.target.value)}>
            {ESTRATEGIAS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>

        <div className="table-scroll">
          <table className="tbl" style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th className="l" scope="col">Instrumento</th>
                <th className="l" scope="col">Lado</th>
                <th scope="col">Strike</th>
                <th scope="col">Prima</th>
                <th scope="col" aria-label="quitar" />
              </tr>
            </thead>
            <tbody>
              {patas.map((p, i) => (
                <tr key={i}>
                  <td className="l">
                    <select className="cell-in" value={p.tipo} onChange={(e) => setPata(i, "tipo", e.target.value)}>
                      <option value="futuro">Futuro</option><option value="call">Call</option><option value="put">Put</option>
                    </select>
                  </td>
                  <td className="l">
                    <select className="cell-in" value={p.lado} onChange={(e) => setPata(i, "lado", e.target.value)}>
                      <option value="compra">Compra</option><option value="venta">Venta</option>
                    </select>
                  </td>
                  <td><input className="cell-in num" inputMode="decimal" value={p.strike} onChange={(e) => setPata(i, "strike", e.target.value)} /></td>
                  <td><input className="cell-in num" inputMode="decimal" value={p.prima} onChange={(e) => setPata(i, "prima", e.target.value)} disabled={p.tipo === "futuro"} /></td>
                  <td><button type="button" className="cell-del" onClick={() => quitar(i)} aria-label="Quitar pata">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="calc-add" onClick={agregar}>+ pata</button>

        {serie.length > 0 && (
          <>
            <div className="calc-out">
              <div className="calc-res">
                <span className="calc-res-lbl">Prima neta</span>
                <span className={`calc-res-val ${neta > 0 ? "neg" : "pos"}`}>{sfmt(neta, 2)}</span>
                <span className="calc-res-sub">{neta > 0 ? "costo" : neta < 0 ? "ingreso" : "sin costo"} por tonelada</span>
              </div>
            </div>
            <PayoffChart serie={serie} strikes={strikes} />
            <div className="table-scroll">
              <table className="tbl" style={{ minWidth: 360 }}>
                <thead><tr><th className="l" scope="col">Precio final</th><th scope="col">Resultado</th></tr></thead>
                <tbody>
                  {claves.map((s, i) => (
                    <tr key={i}><td className="l sym">{nfmt(s.P, 1)}</td>
                      <td className={s.resultado > 0 ? "pos" : s.resultado < 0 ? "neg" : "neu2"}>{sfmt(s.resultado, 2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="panel-note">
        <span>
          <span className="k">Estrategias combinadas</span> (modelo Excels INTAGRO): payoff por tonelada a cada
          precio final = suma de las patas (futuro/call/put, compra/venta). Elegí una del menú o armá la tuya con
          “+ pata”. Strikes y primas a mano; con la cadena de opciones A3/CBOT se completan solos.
        </span>
      </div>
    </Panel>
  );
}

function PayoffChart({ serie, strikes }: { serie: { P: number; resultado: number }[]; strikes: number[] }) {
  const W = 320, H = 180, ml = 36, mr = 8, mt = 10, mb = 22;
  const xs = serie.map((s) => s.P);
  const ys = serie.map((s) => s.resultado);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys, 0), yMax = Math.max(...ys, 0);
  const px = (v: number) => ml + ((v - xMin) / (xMax - xMin || 1)) * (W - ml - mr);
  const py = (v: number) => mt + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - mt - mb);
  const path = serie.map((s, i) => `${i ? "L" : "M"}${px(s.P).toFixed(1)},${py(s.resultado).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="payoff" role="img" aria-label="Payoff de la estrategia" style={{ width: "100%", height: "auto" }}>
      <line x1={ml} y1={H - mb} x2={W - mr} y2={H - mb} stroke="var(--line-2)" strokeWidth={1} />
      <line x1={ml} y1={mt} x2={ml} y2={H - mb} stroke="var(--line-2)" strokeWidth={1} />
      <line x1={ml} y1={py(0)} x2={W - mr} y2={py(0)} stroke="var(--line-2)" strokeWidth={1} strokeDasharray="2 3" />
      {strikes.map((k, i) => (
        <line key={i} x1={px(k)} y1={mt} x2={px(k)} y2={H - mb} stroke="var(--line-2)" strokeWidth={1} strokeDasharray="3 3" />
      ))}
      <path d={path} fill="none" stroke="var(--pos)" strokeWidth={2} />
      <text x={ml - 4} y={py(yMax)} textAnchor="end" fontSize="8" fill="var(--ink-3)" dominantBaseline="middle">{nfmt(yMax, 0)}</text>
      <text x={ml - 4} y={py(yMin)} textAnchor="end" fontSize="8" fill="var(--ink-3)" dominantBaseline="middle">{nfmt(yMin, 0)}</text>
      {strikes.map((k, i) => (
        <text key={i} x={px(k)} y={H - mb + 10} textAnchor="middle" fontSize="8" fill="var(--ink-3)">{nfmt(k, 0)}</text>
      ))}
    </svg>
  );
}
