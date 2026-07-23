"use client";

import * as React from "react";
import { sfmt, pfmt, nfmt, dirOf, arrowOf } from "@/lib/format";
import { GlyphSoja, GlyphMaiz, GlyphTrigo } from "./icons";
import { InfoTip } from "./infotip";
import { FiltroGrano, type GranoFiltroValue, type GranoKey } from "./filtro-grano";
import type { PasesData } from "@/lib/pases-cierres";

/** Puntas en vivo (bid/ask/last/vol) por símbolo del spread, ya mergeadas server-side. */
export type PuntaPase = { bid: number | null; ask: number | null; last: number | null; vol: number | null };

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

export function PasesTabla({
  granos,
  puntas,
}: {
  granos: PasesData["granos"];
  puntas: Record<string, PuntaPase>;
}) {
  const [filtro, setFiltro] = React.useState<GranoFiltroValue>("todos");
  const visibles = filtro === "todos" ? granos : granos.filter((g) => g.underlying === filtro);

  return (
    <div>
      <FiltroGrano value={filtro} onChange={setFiltro} presentes={granos.map((g) => g.underlying as GranoKey)} />
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
            {visibles.map((g) => (
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
                  const p = puntas[r.spreadSymbol];
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
            {visibles.length === 0 && (
              <tr>
                <td className="l dim" colSpan={10}>
                  {granos.length === 0 ? "Sin cierres para calcular pases todavía." : "Sin datos para este grano."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
