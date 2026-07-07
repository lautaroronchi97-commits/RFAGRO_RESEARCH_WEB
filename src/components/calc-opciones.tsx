"use client";

import * as React from "react";
import { Panel, PanelHead } from "./panel";
import { nfmt, sfmt } from "@/lib/format";
import { type Collar, primaNeta, escenarios, escenariosClave } from "@/lib/opciones";

function IconCollar() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 11h4l4-6h4" />
      <path d="M2 5h4" /><path d="M10 11h4" />
    </svg>
  );
}

function num(v: string): number {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

const cls = (v: number) => (v > 0 ? "pos" : v < 0 ? "neg" : "neu2");

export function CalcOpciones() {
  const [piso, setPiso] = React.useState("300");
  const [techo, setTecho] = React.useState("340");
  const [primaPut, setPrimaPut] = React.useState("8");
  const [primaCall, setPrimaCall] = React.useState("5");

  const c: Collar = { piso: num(piso), techo: num(techo), primaPut: num(primaPut), primaCall: num(primaCall) };
  const valido = c.piso > 0 && c.techo > c.piso && Number.isFinite(c.primaPut) && Number.isFinite(c.primaCall);
  const neta = primaNeta(c);

  const span = valido ? c.techo - c.piso : 0;
  const desde = valido ? c.piso - span * 0.6 : 0;
  const hasta = valido ? c.techo + span * 0.6 : 0;
  const serie = valido ? escenarios(c, desde, hasta, 41) : [];
  const tabla = valido ? escenariosClave(c) : [];

  return (
    <Panel id="calc-opciones">
      <PanelHead glyph={<IconCollar />} title="Calculadora — piso/techo (collar)" sub="Compra PUT (piso) + vende CALL (techo) · escenarios" />

      <div className="calc">
        <div className="calc-grid">
          <label className="calc-field">
            <span>Piso — strike PUT (USD)</span>
            <input inputMode="decimal" value={piso} onChange={(e) => setPiso(e.target.value)} />
          </label>
          <label className="calc-field">
            <span>Prima PUT (paga)</span>
            <input inputMode="decimal" value={primaPut} onChange={(e) => setPrimaPut(e.target.value)} />
          </label>
          <label className="calc-field">
            <span>Techo — strike CALL (USD)</span>
            <input inputMode="decimal" value={techo} onChange={(e) => setTecho(e.target.value)} />
          </label>
          <label className="calc-field">
            <span>Prima CALL (cobra)</span>
            <input inputMode="decimal" value={primaCall} onChange={(e) => setPrimaCall(e.target.value)} />
          </label>
        </div>

        {valido ? (
          <>
            <div className="calc-out">
              <div className="calc-res">
                <span className="calc-res-lbl">Prima neta</span>
                <span className={`calc-res-val ${neta > 0 ? "neg" : "pos"}`}>{sfmt(neta, 2)}</span>
                <span className="calc-res-sub">{neta > 0 ? "costo" : neta < 0 ? "ingreso" : "sin costo"} por tonelada</span>
              </div>
              <div className="calc-meta">
                <span>Piso efectivo (asegurado): <b>{nfmt(c.piso - neta, 2)}</b></span>
                <span>Techo efectivo (máximo): <b>{nfmt(c.techo - neta, 2)}</b></span>
              </div>
            </div>

            <PayoffChart serie={serie} piso={c.piso} techo={c.techo} />

            <div className="table-scroll">
              <table className="tbl" style={{ minWidth: 480 }}>
                <thead>
                  <tr>
                    <th className="l" scope="col">Precio final</th>
                    <th scope="col">Vende a</th>
                    <th scope="col">Efectivo</th>
                    <th scope="col">vs mercado</th>
                  </tr>
                </thead>
                <tbody>
                  {tabla.map((s) => (
                    <tr key={s.precioFinal}>
                      <td className="l sym">{nfmt(s.precioFinal, 1)}</td>
                      <td>{nfmt(s.venta, 2)}</td>
                      <td>{nfmt(s.efectivo, 2)}</td>
                      <td className={cls(s.vsMercado)}>{sfmt(s.vsMercado, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="calc-res-sub">Completá piso &lt; techo y las dos primas.</p>
        )}
      </div>

      <div className="panel-note">
        <span>
          <span className="k">Collar vendedor</span>: prima neta = prima PUT − prima CALL. Efectivo =
          min(máx(precio final, piso), techo) − prima neta. Debajo del piso vendés al piso; arriba del techo,
          al techo. Primas y strikes a mano por ahora (luego, precios de opciones A3).
        </span>
      </div>
    </Panel>
  );
}

function PayoffChart({
  serie,
  piso,
  techo,
}: {
  serie: { precioFinal: number; efectivo: number }[];
  piso: number;
  techo: number;
}) {
  const W = 320, H = 180, ml = 34, mr = 8, mt = 10, mb = 22;
  const xs = serie.map((s) => s.precioFinal);
  const ys = serie.flatMap((s) => [s.efectivo, s.precioFinal]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const px = (v: number) => ml + ((v - xMin) / (xMax - xMin || 1)) * (W - ml - mr);
  const py = (v: number) => mt + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - mt - mb);

  const linea = (key: "efectivo" | "precioFinal") =>
    serie.map((s, i) => `${i ? "L" : "M"}${px(s.precioFinal).toFixed(1)},${py(s[key]).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="payoff" role="img" aria-label="Escenarios del collar" style={{ width: "100%", height: "auto" }}>
      {/* marco */}
      <line x1={ml} y1={H - mb} x2={W - mr} y2={H - mb} stroke="var(--line-2)" strokeWidth={1} />
      <line x1={ml} y1={mt} x2={ml} y2={H - mb} stroke="var(--line-2)" strokeWidth={1} />
      {/* strikes */}
      {[piso, techo].map((k, i) => (
        <line key={i} x1={px(k)} y1={mt} x2={px(k)} y2={H - mb} stroke="var(--line-2)" strokeWidth={1} strokeDasharray="3 3" />
      ))}
      {/* vender a mercado (referencia) */}
      <path d={linea("precioFinal")} fill="none" stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
      {/* precio efectivo del collar */}
      <path d={linea("efectivo")} fill="none" stroke="var(--pos)" strokeWidth={2} />
      {/* labels Y */}
      <text x={ml - 4} y={py(yMax)} textAnchor="end" fontSize="8" fill="var(--ink-3)" dominantBaseline="middle">{nfmt(yMax, 0)}</text>
      <text x={ml - 4} y={py(yMin)} textAnchor="end" fontSize="8" fill="var(--ink-3)" dominantBaseline="middle">{nfmt(yMin, 0)}</text>
      {/* labels X (strikes) */}
      <text x={px(piso)} y={H - mb + 10} textAnchor="middle" fontSize="8" fill="var(--ink-3)">{nfmt(piso, 0)}</text>
      <text x={px(techo)} y={H - mb + 10} textAnchor="middle" fontSize="8" fill="var(--ink-3)">{nfmt(techo, 0)}</text>
    </svg>
  );
}
