import { getLecaps } from "@/lib/market";
import { nfmt, pfmt, dirOf, arrowOf } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { SourceStamp } from "./source-stamp";

function IconSint() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h6M3 8h10M3 12h7" />
      <circle cx="12.5" cy="4" r="1.4" />
    </svg>
  );
}

const cls = (v: number | null) => (v == null ? "neu2" : v > 0 ? "pos" : v < 0 ? "neg" : "neu2");

export async function SinteticosPanel() {
  const { lecaps, meta } = await getLecaps();

  return (
    <Panel id="sinteticos">
      <PanelHead
        glyph={<IconSint />}
        title="Sintéticos · LECAPs"
        sub="LECAP + dólar futuro vs futuro directo"
        stamp={<SourceStamp meta={meta} />}
      />
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 420 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Letra</th>
              <th scope="col">Precio</th>
              <th scope="col">Días</th>
              <th scope="col">Var</th>
            </tr>
          </thead>
          <tbody>
            {lecaps.map((l) => {
              const d = dirOf(l.varPct);
              return (
                <tr key={l.symbol}>
                  <td className="l sym">{l.symbol}</td>
                  <td>{nfmt(l.px, 2)}</td>
                  <td className="dim">{l.dias ?? "—"}</td>
                  <td className={cls(l.varPct)}>
                    {arrowOf(d)} {pfmt(l.varPct, 2)}
                  </td>
                </tr>
              );
            })}
            {lecaps.length === 0 && (
              <tr>
                <td className="l dim" colSpan={4}>
                  Sin LECAPs en data912 en este momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Parcial</span> Precios de LECAPs reales (data912). Para la <b>TIR</b> y el
          <b> sintético</b> (LECAP + dólar futuro vs futuro directo) falta tu tabla de <b>pago final por
          letra</b> y confirmar la fórmula — lo sumamos cuando la pases.
        </span>
      </div>
    </Panel>
  );
}
