"use client";

import * as React from "react";
import { nfmt, sfmt, pfmt, dirOf, arrowOf } from "@/lib/format";
import { GlyphSoja, GlyphMaiz, GlyphTrigo } from "./icons";
import { InfoTip } from "./infotip";

/**
 * Tabla de arbitrajes con la pizarra (disponible USD) EDITABLE por grano.
 * Arranca con el valor de CAC (pizarraDefault); al cambiarlo se recalculan en
 * vivo el spread, la tasa directa y la TNA de cada posición. Los días vienen
 * fijos (vencimiento real de la posición), así que sólo depende de la pizarra.
 */

type Row = {
  pos: string;
  ajuste: number | null;
  dias: number | null;
  volume: number | null;
  bid: number | null; // comprador (A3 en vivo, solo lectura)
  ask: number | null; // vendedor (A3 en vivo, solo lectura)
};
export type ArbGranoClient = {
  underlying: string;
  nombre: string;
  pizarraDefault: number | null;
  pizarraArs: number | null;
  rows: Row[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const cls = (v: number | null) => (v == null ? "neu2" : v > 0 ? "pos" : v < 0 ? "neg" : "neu2");

function glyphFor(u: string) {
  if (u === "SOJ") return <GlyphSoja />;
  if (u === "MAI") return <GlyphMaiz />;
  return <GlyphTrigo />;
}
function glyphColor(u: string) {
  if (u === "SOJ") return "var(--brand-agro)";
  if (u === "MAI") return "var(--gold-text)";
  return "var(--brand-deep)";
}

export function ArbitrajesEditable({ granos }: { granos: ArbGranoClient[] }) {
  const [pz, setPz] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      granos.map((g) => [g.underlying, g.pizarraDefault != null ? String(g.pizarraDefault) : ""]),
    ),
  );

  const setOne = (u: string, v: string) => setPz((prev) => ({ ...prev, [u]: v }));

  return (
    <div className="table-scroll">
      <table className="tbl" style={{ minWidth: 760 }}>
        <thead>
          <tr>
            <th className="l" scope="col">Posición</th>
            <th scope="col">Ajuste</th>
            <th scope="col">
              <InfoTip term="Comprador">
                Mejor punta compradora (bid) del futuro en A3, en vivo (~1 min con rueda abierta).
                — = sin puntas (p. ej. fuera de rueda).
              </InfoTip>
            </th>
            <th scope="col">
              <InfoTip term="Vendedor">
                Mejor punta vendedora (oferta/ask) del futuro en A3, en vivo.
              </InfoTip>
            </th>
            <th scope="col">
              <InfoTip term="Spread US$">
                Diferencia entre el ajuste del futuro y la pizarra del disponible.
              </InfoTip>
            </th>
            <th scope="col">
              <InfoTip term="Tasa directa">
                Ese spread como % de la pizarra (futuro/pizarra − 1), sin anualizar.
              </InfoTip>
            </th>
            <th scope="col">
              <InfoTip term="TNA USD">
                La tasa directa anualizada en dólares (× 365/días al vto). Se recalcula al editar la pizarra.
              </InfoTip>
            </th>
            <th scope="col">Días</th>
            <th scope="col">Vol</th>
          </tr>
        </thead>
        <tbody>
          {granos.map((g) => {
            const raw = pz[g.underlying];
            const n = Number(raw);
            const pizarra = raw !== "" && Number.isFinite(n) ? n : null;
            const editada = g.pizarraDefault != null && pizarra !== g.pizarraDefault;
            return (
              <React.Fragment key={g.underlying}>
                <tr className="grp">
                  <td className="l" colSpan={9}>
                    <span className="grp-cell">
                      <span className="gglyph" style={{ color: glyphColor(g.underlying) }}>
                        {glyphFor(g.underlying)}
                      </span>
                      <span className="gname">{g.nombre}</span>
                      <span className="gmeta">
                        disponible pizarra USD{" "}
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="pz-input"
                          value={raw}
                          onChange={(e) => setOne(g.underlying, e.target.value)}
                          aria-label={`Pizarra USD ${g.nombre}`}
                        />
                        {g.pizarraArs ? ` · ARS ${nfmt(g.pizarraArs, 0)}` : ""}
                        {editada && (
                          <button
                            type="button"
                            className="pz-reset"
                            title="Volver al valor de CAC"
                            onClick={() =>
                              setOne(g.underlying, g.pizarraDefault != null ? String(g.pizarraDefault) : "")
                            }
                          >
                            ↺
                          </button>
                        )}
                      </span>
                    </span>
                  </td>
                </tr>
                {g.rows.map((r) => {
                  const spread = r.ajuste != null && pizarra != null ? round2(r.ajuste - pizarra) : null;
                  const directa =
                    r.ajuste != null && pizarra != null && pizarra > 0
                      ? round2((r.ajuste / pizarra - 1) * 100)
                      : null;
                  const tna =
                    directa != null && r.dias != null && r.dias > 0
                      ? round2((directa * 365) / r.dias)
                      : null;
                  const d = dirOf(tna);
                  return (
                    <tr key={r.pos}>
                      <td className="l sym">{r.pos}</td>
                      <td>{nfmt(r.ajuste, 2)}</td>
                      <td>{nfmt(r.bid, 2)}</td>
                      <td>{nfmt(r.ask, 2)}</td>
                      <td className={cls(spread)}>{sfmt(spread, 2)}</td>
                      <td className={cls(directa)}>{pfmt(directa, 2)}</td>
                      <td>
                        {tna != null ? (
                          <span className={`chip ${d === "up" ? "up" : d === "down" ? "down" : ""}`}>
                            <span className="ar">{arrowOf(d)}</span>
                            {pfmt(tna, 1)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="dim">{r.dias != null ? r.dias : "—"}</td>
                      <td className="dim">{r.volume != null ? nfmt(r.volume, 0) : "—"}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
          {granos.length === 0 && (
            <tr>
              <td className="l dim" colSpan={9}>
                Sin datos de arbitrajes todavía (faltan cierres o pizarra).
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
