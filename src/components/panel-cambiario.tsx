import * as React from "react";
import { getVolumenCambiario } from "@/lib/market";
import { nfmt, pfmt, dirOf, arrowOf } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { SourceStamp } from "./source-stamp";

function IconFx() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 6h9l-2-2" />
      <path d="M13.5 10h-9l2 2" />
    </svg>
  );
}

const GRUPOS = ["Monedas", "Contado", "Tasas"];
const barColor = (grupo: string) => (grupo === "Monedas" ? "var(--gold)" : "var(--brand-deep)");

export async function PanelCambiario() {
  const data = await getVolumenCambiario();
  const d = data.oficialVarPct == null ? null : dirOf(data.oficialVarPct);
  const byGrupo = GRUPOS.map((g) => ({
    grupo: g,
    items: data.cats.filter((c) => c.grupo === g),
  })).filter((x) => x.items.length > 0);

  return (
    <Panel id="cambiario">
      <PanelHead
        glyph={<IconFx />}
        title="Panel cambiario"
        sub="Volumen de rueda por segmento (MAE · USD)"
        stamp={<SourceStamp meta={data.meta} />}
      />
      <div className="cbo-head">
        <span className="cbo-kpi">
          <span className="k">Oficial mayorista MAE</span>
          <span className="v mono">{nfmt(data.oficial, 2)}</span>
          {d && (
            <span className={`rd ${d}`}>
              {arrowOf(d)} {pfmt(data.oficialVarPct, 2)}
            </span>
          )}
        </span>
      </div>
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 460 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Segmento</th>
              <th scope="col">Vol. (M USD)</th>
              <th className="l" scope="col" style={{ width: "44%" }}>Participación</th>
            </tr>
          </thead>
          <tbody>
            {byGrupo.map((g) => (
              <React.Fragment key={g.grupo}>
                <tr className="grp">
                  <td className="l" colSpan={3}>
                    <span className="grp-cell">
                      <span className="gname">{g.grupo}</span>
                    </span>
                  </td>
                </tr>
                {g.items.map((c) => (
                  <tr key={c.nombre}>
                    <td className="l sym">{c.nombre}</td>
                    <td>{nfmt(c.volumenUsd / 1e6, 0)}</td>
                    <td className="l">
                      <span className="volcell">
                        <span className="vbar" aria-hidden="true">
                          <i style={{ width: `${Math.min(100, c.share)}%`, background: barColor(g.grupo) }} />
                        </span>
                        <span className="vpct">{nfmt(c.share, 1)}%</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
            {data.cats.length === 0 && (
              <tr>
                <td className="l dim" colSpan={3}>
                  Sin datos de MAE en este momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Real</span> Volumen de rueda de MAE (en USD). FOREX = contado de cambios ·
          Futuro de Dólar = DDF. <b>Compras netas del BCRA</b>: sin API pública intradía — pendiente
          (proxy Δreservas / dato de X).
        </span>
      </div>
    </Panel>
  );
}
