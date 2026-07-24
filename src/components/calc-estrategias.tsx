"use client";

import * as React from "react";
import { Panel, PanelHead } from "./panel";
import { ChartMarca } from "./chart-marca";
import { nfmt, sfmt } from "@/lib/format";
import {
  PRESETS,
  payoffTotal,
  serieEscenarios,
  breakevens,
  costoEstrategia,
  type Pata,
  type Tipo,
  type Lado,
  type Escenario,
} from "@/lib/estrategias";
import type { Persona } from "@/lib/costos";

function IconStrat() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 11c2 0 3-6 5-6s2 3 4 3 3-2 3-2" />
      <path d="M2 13.5h12" />
    </svg>
  );
}

type PataStr = { tipo: Tipo; lado: Lado; cttos: string; strike: string; prima: string };
const num = (v: string) => { const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const toStr = (p: Pata): PataStr => ({ tipo: p.tipo, lado: p.lado, cttos: String(p.cttos), strike: String(p.strike), prima: String(p.prima) });
const toNum = (p: PataStr): Pata => ({
  tipo: p.tipo,
  lado: p.lado,
  cttos: Number.isFinite(num(p.cttos)) ? num(p.cttos) : 0,
  strike: num(p.strike),
  prima: p.tipo === "futuro" ? 0 : Number.isFinite(num(p.prima)) ? num(p.prima) : 0,
});

const PRESET0 = PRESETS.find((p) => p.id === "collar") ?? PRESETS[0]!; // catálogo hardcodeado (~27), nunca vacío

/** Gráfico de payoff: resultado por tonelada vs precio final, con breakevens. */
function PayoffChart({ serie, B, bes }: { serie: Escenario[]; B: number; bes: number[] }) {
  if (serie.length < 2) return null;
  const W = 620, H = 190, padX = 8, padT = 12, padB = 22;
  const xs = serie.map((s) => s.P);
  const ys = serie.map((s) => s.resultado);
  const loX = Math.min(...xs), hiX = Math.max(...xs);
  const hiY = Math.max(0, ...ys), loY = Math.min(0, ...ys);
  const rY = hiY - loY || 1;
  const x = (P: number) => padX + ((P - loX) / (hiX - loX || 1)) * (W - 2 * padX);
  const y = (v: number) => padT + ((hiY - v) / rY) * (H - padT - padB);
  const zeroY = y(0);
  const pts = serie.map((s) => `${x(s.P).toFixed(1)},${y(s.resultado).toFixed(1)}`).join(" ");

  return (
    <div className="chart-wrap">
      <ChartMarca />
      <svg className="cv" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de payoff de la estrategia">
        <line x1={padX} y1={zeroY} x2={W - padX} y2={zeroY} stroke="var(--line-2)" strokeWidth={1} />
        {Number.isFinite(B) && B >= loX && B <= hiX && (
          <line x1={x(B)} y1={padT} x2={x(B)} y2={H - padB} stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="3 3" />
        )}
        <polyline points={pts} fill="none" stroke="var(--brand-deep)" strokeWidth={1.8} />
        {bes.map((be, i) => (
          <g key={i}>
            <circle cx={x(be)} cy={zeroY} r={3} fill="var(--gold, var(--brand-deep))" />
            <text x={x(be)} y={H - 7} textAnchor="middle" fontSize={10} fill="var(--ink-3)" fontFamily="var(--font-mono)">{nfmt(be, 0)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function CalcEstrategias() {
  const [base, setBase] = React.useState("320");
  const [paso, setPaso] = React.useState("15");
  const [estId, setEstId] = React.useState(PRESET0.id);
  const [patas, setPatas] = React.useState<PataStr[]>(() => PRESET0.patas(320, 15).map(toStr));
  const [conCostos, setConCostos] = React.useState(false);
  const [persona, setPersona] = React.useState<Persona>("juridica");
  const [iva, setIva] = React.useState("21");

  const B = num(base), S = num(paso);
  const preset = PRESETS.find((p) => p.id === estId);

  const cambiar = (id: string) => {
    setEstId(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p && Number.isFinite(B) && Number.isFinite(S)) setPatas(p.patas(B, S).map(toStr));
  };
  const recargar = () => {
    if (preset && Number.isFinite(B) && Number.isFinite(S)) setPatas(preset.patas(B, S).map(toStr));
  };
  const setPata = (i: number, campo: keyof PataStr, val: string) =>
    setPatas((ps) => ps.map((p, j) => (j === i ? { ...p, [campo]: val } : p)));
  const agregar = () => setPatas((ps) => [...ps, { tipo: "call", lado: "compra", cttos: "1", strike: base, prima: "5" }]);
  const quitar = (i: number) => setPatas((ps) => ps.filter((_, j) => j !== i));

  const patasNum = patas.map(toNum).filter((p) => Number.isFinite(p.strike));
  const okRange = Number.isFinite(B) && Number.isFinite(S) && S > 0;
  const ivaPct = num(iva);
  const costos = conCostos && Number.isFinite(ivaPct) ? costoEstrategia(patasNum, persona, ivaPct) : 0;
  const serieBruta = okRange && patasNum.length ? serieEscenarios(patasNum, B, S) : [];
  // Los costos son un cargo fijo (se pagan al operar, no dependen del precio final) — se
  // restan por igual a cada punto, mismo tratamiento que ya recibía la prima neta.
  const serie: Escenario[] = costos > 0 ? serieBruta.map((s) => ({ P: s.P, resultado: s.resultado - costos })) : serieBruta;
  const bes = breakevens(serie);
  const ys = serie.map((s) => s.resultado);
  // Extremos REALES, no los del borde del rango graficado (auditoría E2, 21/07/2026):
  // hacia abajo el extremo exacto es el payoff en P=0; hacia arriba, si la pendiente del
  // último tramo no es nula, la ganancia/pérdida sigue creciendo → "ilimitada".
  const EPS = 1e-9;
  const pendienteSup =
    ys.length >= 2 ? (ys[ys.length - 1] ?? 0) - (ys[ys.length - 2] ?? 0) : 0;
  const candidatos = ys.length ? [...ys, payoffTotal(0, patasNum) - costos] : [];
  const gananciaIlimitada = pendienteSup > EPS;
  const perdidaIlimitada = pendienteSup < -EPS;
  const maxG = candidatos.length ? Math.max(...candidatos) : NaN;
  const maxP = candidatos.length ? Math.min(...candidatos) : NaN;
  const neta = patasNum.reduce((a, p) => (p.tipo === "futuro" ? a : a + (p.lado === "compra" ? p.prima * p.cttos : -p.prima * p.cttos)), 0);
  const claves = Array.from(new Set([...patasNum.map((p) => p.strike), Number.isFinite(B) ? B : NaN]))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  return (
    <Panel id="calc-estrategias">
      <PanelHead glyph={<IconStrat />} title="Calculadora — estrategias con opciones" sub="Preset + patas editables · payoff, tabla y gráfico" />

      <div className="calc">
        <div className="calc-grid">
          <label className="calc-field">
            <span>Estrategia</span>
            <select value={estId} onChange={(e) => cambiar(e.target.value)}>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <label className="calc-field">
            <span>Precio base / ATM (USD)</span>
            <input inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} />
          </label>
          <label className="calc-field">
            <span>Paso entre strikes (USD)</span>
            <input inputMode="decimal" value={paso} onChange={(e) => setPaso(e.target.value)} />
          </label>
        </div>

        {preset && (
          <div className="strat-exp">
            <span className="k">{preset.view}</span> {preset.explicacion}
          </div>
        )}
        <div className="strat-exp">
          <span className="k">Primas estimativas</span> Las patas se precargan con primas estimadas (decaen con
          la distancia al ATM) para poder jugar rápido — cargá las primas reales de la cadena antes de cotizar.
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={conCostos} onChange={(e) => setConCostos(e.target.checked)} />
          <span>Incluir costos (A3/Cocos)</span>
        </label>
        <div className="calc-grid">
          {conCostos && (
            <>
              <label className="calc-field">
                <span>Tipo de cuenta</span>
                <select value={persona} onChange={(e) => setPersona(e.target.value as Persona)}>
                  <option value="humana">Persona humana</option>
                  <option value="juridica">Persona jurídica</option>
                </select>
              </label>
              <label className="calc-field">
                <span>IVA (%)</span>
                <input inputMode="decimal" value={iva} onChange={(e) => setIva(e.target.value)} />
              </label>
            </>
          )}
        </div>
        {conCostos && (
          <div className="strat-exp">
            <span className="k">Costos</span> Tarifario A3/Cocos (comisión + derechos + IVA, panel &quot;Costos de
            operar&quot;) sobre prima × cttos en opciones, strike × cttos en futuro — no hay tamaño de contrato por
            mercado todavía, así que se toma cttos como toneladas equivalentes, igual que el resto de esta calc. Se
            resta una sola vez (como la prima neta), no por cada punto del vencimiento.
          </div>
        )}

        <PayoffChart serie={serie} B={B} bes={bes} />

        <div className="calc-out">
          <div className="calc-meta">
            <span>Máx. ganancia: <b className="pos">{gananciaIlimitada ? "ilimitada" : Number.isFinite(maxG) ? sfmt(maxG, 1) : "—"}</b></span>
            <span>Máx. pérdida: <b className="neg">{perdidaIlimitada ? "ilimitada" : Number.isFinite(maxP) ? sfmt(maxP, 1) : "—"}</b></span>
            <span>Prima neta: <b>{sfmt(neta, 1)} USD</b> {neta > 0 ? "(costo)" : neta < 0 ? "(ingreso)" : ""}</span>
            {conCostos && <span>Costos (A3/Cocos): <b>{nfmt(costos, 1)} USD</b></span>}
            <span>Breakeven(s): <b>{bes.length ? bes.map((b) => nfmt(b, 1)).join(" · ") : "—"}</b></span>
          </div>
        </div>

        <div className="table-scroll">
          <table className="tbl" style={{ minWidth: 540 }}>
            <thead>
              <tr>
                <th className="l" scope="col">Instrumento</th>
                <th className="l" scope="col">Lado</th>
                <th scope="col">Cttos</th>
                <th scope="col">Strike / entrada</th>
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
                  <td><input className="cell-in num" inputMode="numeric" value={p.cttos} onChange={(e) => setPata(i, "cttos", e.target.value)} /></td>
                  <td><input className="cell-in num" inputMode="decimal" value={p.strike} onChange={(e) => setPata(i, "strike", e.target.value)} /></td>
                  <td><input className="cell-in num" inputMode="decimal" value={p.prima} disabled={p.tipo === "futuro"} onChange={(e) => setPata(i, "prima", e.target.value)} /></td>
                  <td><button type="button" className="cell-del" onClick={() => quitar(i)} aria-label="Quitar pata">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="calc-btns">
          <button type="button" className="calc-add" onClick={agregar}>+ pata</button>
          <button type="button" className="calc-add" onClick={recargar}>↺ recargar preset</button>
        </div>

        <div className="table-scroll">
          <table className="tbl" style={{ minWidth: 340 }}>
            <thead><tr><th className="l" scope="col">Precio final</th><th scope="col">Resultado</th></tr></thead>
            <tbody>
              {claves.map((P) => {
                const r = payoffTotal(P, patasNum) - costos;
                return (
                  <tr key={P}>
                    <td className="l sym">{nfmt(P, 1)}</td>
                    <td className={r > 0 ? "pos" : r < 0 ? "neg" : "neu2"}>{sfmt(r, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel-note">
        <span>
          <span className="k">Payoff</span> Resultado por tonelada al vencimiento = suma de las patas (futuro +
          calls + puts). Elegí una estrategia del menú (se precarga con strikes al paso elegido) y ajustá las
          patas a mano. La línea punteada es el precio base; los puntos, los breakeven. Catálogo y fórmulas en
          <code> docs/ESTRATEGIAS_CATALOGO.md</code>.
        </span>
      </div>
    </Panel>
  );
}
