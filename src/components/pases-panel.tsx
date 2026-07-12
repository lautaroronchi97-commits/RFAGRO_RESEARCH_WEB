import * as React from "react";
import { getPases } from "@/lib/pases-cierres";
import { getPasesLive, mergeLiveMeta } from "@/lib/a3-live";
import { sfmt, pfmt, nfmt, dirOf, arrowOf } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { GlyphSoja, GlyphMaiz, GlyphTrigo } from "./icons";
import { InfoTip } from "./infotip";
import { SourceStamp } from "./source-stamp";
import { QueEsEsto } from "./que-es-esto";

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
  const [data, live] = await Promise.all([getPases(), getPasesLive()]);
  const meta = mergeLiveMeta(data.meta, live);

  return (
    <Panel id="pases">
      <PanelHead
        glyph={<IconPases />}
        title="Pases"
        sub="Spreads entre posiciones (calendario)"
        stamp={<SourceStamp meta={meta} />}
      />
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 880 }}>
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
              <th scope="col">
                <InfoTip term="Comprador">
                  Mejor punta compradora (bid) del instrumento de pase que cotiza en A3, en vivo
                  (~1 min con rueda abierta). — = sin puntas (p. ej. fuera de rueda).
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="Vendedor">
                  Mejor punta vendedora (oferta/ask) del instrumento de pase en A3, en vivo.
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="Último">
                  Último precio operado del pase HOY en la rueda de A3. Distinto de Últ. op., que se
                  calcula con los cierres (ajuste) del día.
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="Vol">
                  Volumen operado del instrumento de pase en el día (A3).
                </InfoTip>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.granos.map((g) => (
              <React.Fragment key={g.underlying}>
                <tr className="grp">
                  <td className="l" colSpan={10}>
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
                  const p = live.puntas.get(r.spreadSymbol);
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
                      <td>{sfmt(p?.bid ?? null, 2)}</td>
                      <td>{sfmt(p?.ask ?? null, 2)}</td>
                      <td>{sfmt(p?.last ?? null, 2)}</td>
                      <td className="dim">{p?.vol != null ? nfmt(p.vol, 0) : "—"}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
            {data.granos.length === 0 && (
              <tr>
                <td className="l dim" colSpan={10}>
                  Sin cierres para calcular pases todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <QueEsEsto
        paraQue="Compara dos fechas de entrega del mismo grano y te dice cuánto cuesta (o cuánto te pagan) por correr la venta de la más cercana a la más lejana. Sirve para decidir si te conviene estirar o adelantar un compromiso ya tomado."
        comoSeCalcula="Es la diferencia de precio entre la posición cercana y la lejana; esa diferencia, anualizada por los días que hay entre una y otra fecha, te da la tasa del pase. Comprador, Vendedor, Último y Volumen son del pase en la rueda, cuando está abierta."
      />
    </Panel>
  );
}
