import * as React from "react";
import { getPases } from "@/lib/pases-cierres";
import { sfmt, pfmt, dirOf, arrowOf } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { GlyphSoja, GlyphMaiz, GlyphTrigo } from "./icons";
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

function IconPases() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h8l-2-2" />
      <path d="M13 10H5l2 2" />
    </svg>
  );
}

const cls = (v: number | null) => (v == null ? "neu2" : v > 0 ? "pos" : v < 0 ? "neg" : "neu2");

export async function PasesPanel() {
  const data = await getPases();

  return (
    <Panel id="pases">
      <PanelHead
        glyph={<IconPases />}
        title="Pases"
        sub="Spreads entre posiciones (calendario)"
        stamp={<SourceStamp meta={data.meta} />}
      />
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 620 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Pase</th>
              <th scope="col">
                <InfoTip term="Ajuste US$">
                  Diferencia entre el ajuste de la posición lejana y la cercana. Positivo (verde) =
                  contango (lo lejano vale más); negativo = backwardation.
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="Tasa directa">
                  Ese spread como % de la posición cercana (larga/cercana − 1), sin anualizar.
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="TNA USD">
                  La tasa directa anualizada (× 365/días entre vencimientos de las dos posiciones).
                </InfoTip>
              </th>
              <th scope="col">Días</th>
              <th scope="col">Últ. op.</th>
            </tr>
          </thead>
          <tbody>
            {data.granos.map((g) => (
              <React.Fragment key={g.underlying}>
                <tr className="grp">
                  <td className="l" colSpan={6}>
                    <span className="grp-cell">
                      <span className="gglyph" style={{ color: glyphColor(g.underlying) }}>
                        {glyphFor(g.underlying)}
                      </span>
                      <span className="gname">{g.nombre}</span>
                      {g.fecha && <span className="gmeta">cierre {g.fecha}</span>}
                    </span>
                  </td>
                </tr>
                {g.spreads.map((r) => {
                  const d = dirOf(r.tna);
                  return (
                    <tr key={r.label}>
                      <td className="l sym">{r.label}</td>
                      <td className={cls(r.ajuste)}>{sfmt(r.ajuste, 2)}</td>
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
                      <td className="dim">{sfmt(r.ultimo, 2)}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
            {data.granos.length === 0 && (
              <tr>
                <td className="l dim" colSpan={6}>
                  Sin cierres para calcular pases todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Real</span> Pase = diferencia de ajuste (settlement) de la posición cercana
          contra cada más lejana del mismo grano, desde los cierres del CEM guardados en Supabase. TNA = tasa directa
          anualizada por los días entre vencimientos (CEM). Últ. op. = spread sobre el último precio operado
          (— si alguna posición no operó ese día). Próximo: comprador/vendedor + histórico desde los snapshots.
        </span>
      </div>
    </Panel>
  );
}
