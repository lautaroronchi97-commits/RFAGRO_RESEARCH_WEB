import * as React from "react";
import { pases, type Grano } from "@/lib/sample";
import { nfmt } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { GlyphSoja, GlyphMaiz, GlyphTrigo } from "./icons";
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

function IconPases() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h8l-2-2" />
      <path d="M13 10H5l2 2" />
    </svg>
  );
}

export function PasesPanel() {
  return (
    <Panel id="pases">
      <PanelHead
        glyph={<IconPases />}
        title="Pases"
        sub="Spreads entre posiciones (calendario)"
        stamp={<SourceStamp meta={metaEjemplo("pendiente A3")} />}
      />
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 460 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Posición</th>
              <th scope="col">Pase comprador</th>
              <th scope="col">Pase último</th>
              <th scope="col">Pase vendedor</th>
            </tr>
          </thead>
          <tbody>
            {pases.map((g) => (
              <React.Fragment key={g.grano}>
                <tr className="grp">
                  <td className="l" colSpan={4}>
                    <span className="grp-cell">
                      <span className="gglyph" style={{ color: glyphColor(g.grano) }}>
                        {glyphFor(g.grano)}
                      </span>
                      <span className="gname">{g.grano}</span>
                    </span>
                  </td>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.spread}>
                    <td className="l sym">{r.spread}</td>
                    <td className="dim">{nfmt(r.comprador, 2)}</td>
                    <td>{nfmt(r.ultimo, 2)}</td>
                    <td className="dim">{nfmt(r.vendedor, 2)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Ejemplo</span> Spreads calendario entre posiciones. Con A3 conectado se
          reemplazan por datos reales y sumamos la comparación vs histórico (desde los snapshots de la BD).
        </span>
      </div>
    </Panel>
  );
}
