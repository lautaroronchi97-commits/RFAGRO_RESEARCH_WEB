"use client";

import * as React from "react";
import { Panel, PanelHead } from "./panel";
import { nfmt, numDeInput as num } from "@/lib/format";
import { VALOR_PUNTO_FIJO, calcularPlanta } from "@/lib/planta";

export type PizarraProducto = { underlying: string; nombre: string; usd: number | null };

/** 0 si está vacío o no es válido (para los rubros que se restan). */
function n0(v: string): number {
  const n = num(v);
  return Number.isFinite(n) ? n : 0;
}

function IconPlanta() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 14h12" />
      <path d="M3 14V7l3.5 2V7l3.5 2V4.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1V14" />
      <path d="M3 7V5" />
    </svg>
  );
}

export function CalcPlanta({ pizarra = [] }: { pizarra?: PizarraProducto[] }) {
  const [pi, setPi] = React.useState(0);
  const sel = pizarra[Math.min(pi, Math.max(0, pizarra.length - 1))];
  const pizarraUsd = sel?.usd ?? null;

  const [precio, setPrecio] = React.useState(() => (pizarra[0]?.usd != null ? String(pizarra[0].usd) : ""));
  const [flete, setFlete] = React.useState("");
  const [secadaModo, setSecadaModo] = React.useState<"fijo" | "libre">("fijo");
  const [puntos, setPuntos] = React.useState("1");
  const [valorPunto, setValorPunto] = React.useState(String(VALOR_PUNTO_FIJO));
  const [merma, setMerma] = React.useState("0.3");
  const [paritaria, setParitaria] = React.useState("4.5");
  const [embolsado, setEmbolsado] = React.useState("");
  const [otrosLbl, setOtrosLbl] = React.useState("");
  const [otros, setOtros] = React.useState("");

  const elegir = (i: number) => {
    setPi(i);
    const u = pizarra[i]?.usd;
    if (u != null) setPrecio(String(u));
  };

  const arranque = num(precio);
  const editada = pizarraUsd != null && Number.isFinite(arranque) && arranque !== pizarraUsd;

  const nPuntos = n0(puntos);
  const vPunto = secadaModo === "fijo" ? VALOR_PUNTO_FIJO : n0(valorPunto);
  const pctMerma = n0(merma);

  const { dFlete, dSecada, dMerma, dParitaria, dEmbolsado, dOtros, totalGastos, final } = calcularPlanta({
    arranque,
    flete: n0(flete),
    puntos: nPuntos,
    valorPunto: vPunto,
    pctMerma,
    paritaria: n0(paritaria),
    embolsado: n0(embolsado),
    otros: n0(otros),
  });

  return (
    <Panel id="calc-planta">
      <PanelHead
        glyph={<IconPlanta />}
        title="Calculadora — negocios de planta"
        sub="Pizarra menos flete, secada, merma, paritaria, embolsado y otros"
      />
      <div className="calc">
        {pizarra.length > 0 && (
          <div className="curva-pick">
            <span className="curva-pick-lbl">Pizarra (arranque)</span>
            <select aria-label="Producto" value={pi} onChange={(e) => elegir(Number(e.target.value))}>
              {pizarra.map((p, i) => (
                <option key={p.underlying} value={i}>
                  {p.nombre}
                  {p.usd != null ? ` · ${nfmt(p.usd, 2)} USD` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="calc-grid">
          <div className="calc-field">
            <span>
              Precio de arranque (USD)
              {editada && (
                <button
                  type="button"
                  className="pz-reset"
                  title="Volver a la pizarra"
                  onClick={() => setPrecio(pizarraUsd != null ? String(pizarraUsd) : "")}
                >
                  ↺
                </button>
              )}
            </span>
            <input
              inputMode="decimal"
              value={precio}
              placeholder="—"
              aria-label="Precio de arranque (USD)"
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>

          <label className="calc-field"><span>Contra flete (USD)</span>
            <input inputMode="decimal" value={flete} placeholder="0" onChange={(e) => setFlete(e.target.value)} /></label>

          <label className="calc-field calc-mode"><span>Secada — valor del punto</span>
            <select value={secadaModo} onChange={(e) => setSecadaModo(e.target.value as "fijo" | "libre")}>
              <option value="fijo">Fijo (5 USD/punto)</option>
              <option value="libre">No fijo (editar USD/punto)</option>
            </select></label>

          <label className="calc-field"><span>Secada — puntos</span>
            <input inputMode="decimal" value={puntos} placeholder="0" onChange={(e) => setPuntos(e.target.value)} /></label>

          {secadaModo === "libre" && (
            <label className="calc-field"><span>USD por punto</span>
              <input inputMode="decimal" value={valorPunto} placeholder="5" onChange={(e) => setValorPunto(e.target.value)} /></label>
          )}

          <label className="calc-field"><span>Merma volátil (%)</span>
            <input inputMode="decimal" value={merma} placeholder="0,3" onChange={(e) => setMerma(e.target.value)} /></label>

          <label className="calc-field"><span>Paritaria (USD)</span>
            <input inputMode="decimal" value={paritaria} placeholder="4,5" onChange={(e) => setParitaria(e.target.value)} /></label>

          <label className="calc-field"><span>Embolsado (USD)</span>
            <input inputMode="decimal" value={embolsado} placeholder="0" onChange={(e) => setEmbolsado(e.target.value)} /></label>

          <label className="calc-field"><span>Otros — concepto</span>
            <input value={otrosLbl} placeholder="Otros" onChange={(e) => setOtrosLbl(e.target.value)} /></label>

          <label className="calc-field"><span>Otros (USD)</span>
            <input inputMode="decimal" value={otros} placeholder="0" onChange={(e) => setOtros(e.target.value)} /></label>
        </div>

        <div className="calc-out">
          <div className="calc-res">
            <span className="calc-res-lbl">Precio final (USD)</span>
            <span className="calc-res-val">{Number.isFinite(final) ? nfmt(final, 2) : "—"}</span>
            <span className="calc-res-sub">arranque − gastos</span>
          </div>
          <div className="calc-meta">
            <span>Total de gastos: <b>{nfmt(totalGastos, 2)} USD</b></span>
            <span>Contra flete: <b>{nfmt(dFlete, 2)}</b></span>
            <span>
              Secada ({nfmt(nPuntos, nPuntos % 1 === 0 ? 0 : 2)} {nPuntos === 1 ? "punto" : "puntos"} ×{" "}
              {nfmt(vPunto, 2)} USD): <b>{nfmt(dSecada, 2)}</b>
            </span>
            <span>Merma {nfmt(pctMerma, 2)}%: <b>{nfmt(dMerma, 2)}</b></span>
            <span>Paritaria: <b>{nfmt(dParitaria, 2)}</b></span>
            <span>Embolsado: <b>{nfmt(dEmbolsado, 2)}</b></span>
            <span>{otrosLbl.trim() || "Otros"}: <b>{nfmt(dOtros, 2)}</b></span>
          </div>
        </div>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Planta</span> Precio final = arranque − (contra flete + secada + merma +
          paritaria + embolsado + otros). Secada = puntos × valor del punto (fijo 5 USD/punto, o editable en
          &quot;no fijo&quot;). Merma = {nfmt(pctMerma, 2)}% sobre el precio de arranque. El arranque trae la
          pizarra USD del grano elegido y es editable. Todo en USD.
        </span>
      </div>
    </Panel>
  );
}
