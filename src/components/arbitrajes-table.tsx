import * as React from "react";
import { arbitrajes, type Grano } from "@/lib/sample";
import { nfmt, sfmt, pfmt, dirOf, arrowOf } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { IconArb, GlyphSoja, GlyphMaiz, GlyphTrigo } from "./icons";
import { InfoTip } from "./infotip";
import { SourceStamp, metaEjemplo } from "./source-stamp";

function glyphFor(g: Grano) {
  if (g === "Soja") return <GlyphSoja />;
  if (g === "Maíz") return <GlyphMaiz />;
  return <GlyphTrigo />;
}
function glyphColor(g: Grano) {
  if (g === "Soja") return "var(--brand-agro)";
  if (g === "Maíz") return "var(--gold-text)";
  return "var(--brand-deep)";
}
const cls = (v: number) => (v > 0 ? "pos" : v < 0 ? "neg" : "neu2");

export function ArbitrajesTable() {
  return (
    <Panel id="arbitrajes">
      <PanelHead
        glyph={<IconArb />}
        title="Arbitrajes"
        sub="Pizarra (disponible) vs A3 (futuro)"
        stamp={<SourceStamp meta={metaEjemplo("pendiente A3 + CAC")} />}
      />
      <div className="table-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th className="l" scope="col">Posición</th>
              <th scope="col">Último</th>
              <th scope="col">P.comp</th>
              <th scope="col">P.vend</th>
              <th scope="col">Ajuste</th>
              <th scope="col">Spread US$</th>
              <th scope="col">
                <InfoTip term="Tasa directa">
                  Lo que ganás en el período comprando el disponible y vendiendo el futuro, sin anualizar.
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="TNA USD">
                  Ese rendimiento anualizado, en dólares. Alta (verde) = conviene esperar/fijar;
                  negativa (roja) = el disponible rinde más que el futuro.
                </InfoTip>
              </th>
              <th scope="col">Días</th>
            </tr>
          </thead>
          <tbody>
            {arbitrajes.map((g) => (
              <React.Fragment key={g.grano}>
                <tr className="grp">
                  <td className="l" colSpan={9}>
                    <span className="grp-cell">
                      <span className="gglyph" style={{ color: glyphColor(g.grano) }}>
                        {glyphFor(g.grano)}
                      </span>
                      <span className="gname">{g.grano}</span>
                      <span className="gmeta">
                        disponible pizarra USD {nfmt(g.pizarraUsd, 1)}
                        {g.pizarraArs ? ` · ARS ${nfmt(g.pizarraArs, 0)}` : ""}
                      </span>
                    </span>
                  </td>
                </tr>
                {g.rows.map((r) => {
                  const d = dirOf(r.tna);
                  return (
                    <tr key={r.pos}>
                      <td className="l sym">{r.pos}</td>
                      <td>{nfmt(r.ultimo)}</td>
                      <td className="dim">{nfmt(r.comp)}</td>
                      <td className="dim">{nfmt(r.vend)}</td>
                      <td className="dim">{nfmt(r.ajuste)}</td>
                      <td className={cls(r.spread)}>{sfmt(r.spread)}</td>
                      <td className={cls(r.directa)}>{pfmt(r.directa)}</td>
                      <td>
                        <span className={`chip ${d === "up" ? "up" : d === "down" ? "down" : ""}`}>
                          <span className="ar">{arrowOf(d)}</span>
                          {pfmt(r.tna, 1)}
                        </span>
                      </td>
                      <td className="dim">{r.dias}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Ojo</span> Precios A3 = <b>futuro</b> (no es lo que se paga hoy).
          Pizarra = referencia de la Cámara, no el FAS neto que cobra el productor. Datos de ejemplo hasta conectar A3.
        </span>
      </div>
    </Panel>
  );
}
