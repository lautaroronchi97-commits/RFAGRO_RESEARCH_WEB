import * as React from "react";
import { getArbitrajes } from "@/lib/arbitrajes-cierres";
import { nfmt, sfmt, pfmt, dirOf, arrowOf } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { IconArb, GlyphSoja, GlyphMaiz, GlyphTrigo } from "./icons";
import { InfoTip } from "./infotip";
import { SourceStamp } from "./source-stamp";

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
const cls = (v: number | null) => (v == null ? "neu2" : v > 0 ? "pos" : v < 0 ? "neg" : "neu2");

export async function ArbitrajesTable() {
  const data = await getArbitrajes();

  return (
    <Panel id="arbitrajes">
      <PanelHead
        glyph={<IconArb />}
        title="Arbitrajes"
        sub="Pizarra (disponible) vs A3 (futuro)"
        stamp={<SourceStamp meta={data.meta} />}
      />
      <div className="table-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th className="l" scope="col">Posición</th>
              <th scope="col">Ajuste</th>
              <th scope="col">
                <InfoTip term="Spread US$">
                  Diferencia entre el ajuste del futuro y la pizarra del disponible. Positivo = el futuro
                  paga más que el spot; negativo = el disponible paga más.
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="Tasa directa">
                  Ese spread como % de la pizarra (futuro/pizarra − 1), sin anualizar.
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="TNA USD">
                  La tasa directa anualizada en dólares (× 365/días al vto). Alta (verde) = conviene
                  esperar/fijar; negativa (roja) = el disponible rinde más.
                </InfoTip>
              </th>
              <th scope="col">Días</th>
              <th scope="col">Vol</th>
            </tr>
          </thead>
          <tbody>
            {data.granos.map((g) => (
              <React.Fragment key={g.underlying}>
                <tr className="grp">
                  <td className="l" colSpan={7}>
                    <span className="grp-cell">
                      <span className="gglyph" style={{ color: glyphColor(g.underlying) }}>
                        {glyphFor(g.underlying)}
                      </span>
                      <span className="gname">{g.nombre}</span>
                      <span className="gmeta">
                        {g.pizarraUsd != null
                          ? `disponible pizarra USD ${nfmt(g.pizarraUsd, 2)}${g.pizarraArs ? ` · ARS ${nfmt(g.pizarraArs, 0)}` : ""}`
                          : "sin pizarra CAC"}
                      </span>
                    </span>
                  </td>
                </tr>
                {g.rows.map((r) => {
                  const d = dirOf(r.tna);
                  return (
                    <tr key={r.pos}>
                      <td className="l sym">{r.pos}</td>
                      <td>{nfmt(r.ajuste, 2)}</td>
                      <td className={cls(r.spread)}>{sfmt(r.spread, 2)}</td>
                      <td className={cls(r.directa)}>{pfmt(r.directa, 2)}</td>
                      <td>
                        {r.tna != null ? (
                          <span className={`chip ${d === "up" ? "up" : d === "down" ? "down" : ""}`}>
                            <span className="ar">{arrowOf(d)}</span>
                            {pfmt(r.tna, 1)}
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
            ))}
            {data.granos.length === 0 && (
              <tr>
                <td className="l dim" colSpan={7}>
                  Sin datos de arbitrajes todavía (faltan cierres o pizarra).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Real</span> Futuro = ajuste (settlement) de A3/CEM · Pizarra = disponible USD de
          CAC-BCR{data.pizarraFecha ? ` (al ${data.pizarraFecha})` : ""}. TNA USD = tasa directa anualizada
          por los días al vencimiento real de cada posición (CEM). Precios A3 = <b>futuro</b>, no es lo que se
          paga hoy.
        </span>
      </div>
    </Panel>
  );
}
