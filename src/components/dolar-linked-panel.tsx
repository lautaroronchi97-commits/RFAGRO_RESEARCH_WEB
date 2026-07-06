import { getDolarLinked } from "@/lib/market";
import { nfmt, pfmt, sfmt, dirOf, arrowOf } from "@/lib/format";
import { Panel, PanelHead } from "./panel";

function IconLink() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 9.5 9.5 6.5" />
      <path d="M7.2 4.6 8.2 3.6a2.4 2.4 0 0 1 3.4 3.4l-1 1" />
      <path d="M8.8 11.4l-1 1a2.4 2.4 0 0 1-3.4-3.4l1-1" />
    </svg>
  );
}

const cls = (v: number | null) => (v == null ? "neu2" : v > 0 ? "pos" : v < 0 ? "neg" : "neu2");

export async function DolarLinkedPanel() {
  const data = await getDolarLinked();

  return (
    <Panel id="dolar-linked">
      <PanelHead
        glyph={<IconLink />}
        title="Dólar linked"
        sub={`TC implícito · MEP ${data.mep ? nfmt(data.mep, 1) : "—"} · oficial ${data.oficial ? nfmt(data.oficial, 1) : "—"}`}
        stamp="data912 · ~vivo"
      />
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 520 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Bono</th>
              <th scope="col">Px</th>
              <th scope="col">TC implícito</th>
              <th scope="col">Dif. MEP</th>
              <th scope="col">Dif. oficial</th>
              <th scope="col">Var</th>
            </tr>
          </thead>
          <tbody>
            {data.bonos.map((b) => {
              const d = dirOf(b.varPct);
              return (
                <tr key={b.symbol}>
                  <td className="l sym">{b.symbol}</td>
                  <td className="dim">{nfmt(b.px, 0)}</td>
                  <td>{nfmt(b.tcImpl, 2)}</td>
                  <td className={cls(b.difMep)}>{sfmt(b.difMep, 1)}</td>
                  <td className={cls(b.difOficial)}>{sfmt(b.difOficial, 1)}</td>
                  <td className={cls(b.varPct)}>
                    {arrowOf(d)} {pfmt(b.varPct, 2)}
                  </td>
                </tr>
              );
            })}
            {data.bonos.length === 0 && (
              <tr>
                <td className="l dim" colSpan={6}>
                  Sin dólar-linked en data912 en este momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Real</span> Precios de data912. TC implícito = Px ÷ 100 · Diferenciales =
          MEP / oficial − TC implícito. La <b>TNA USD implícita</b> la sumamos cuando definas la base
          (360/365) y contra qué dólar.
        </span>
      </div>
    </Panel>
  );
}
