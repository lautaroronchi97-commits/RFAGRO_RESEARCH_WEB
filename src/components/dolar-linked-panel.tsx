import { getDolarLinked } from "@/lib/market";
import { nfmt, pfmt, sfmt, rfmt, dirOf, arrowOf } from "@/lib/format";
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
        sub={`TC implícito + TNA USD (vs oficial ${data.oficial ? nfmt(data.oficial, 1) : "—"})`}
        stamp="data912 · ~vivo"
      />
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Bono</th>
              <th scope="col">Px</th>
              <th scope="col">TC implícito</th>
              <th scope="col">Dif. MEP</th>
              <th scope="col">Spread of.</th>
              <th scope="col">Días</th>
              <th scope="col">TNA</th>
              <th scope="col">TEM</th>
              <th scope="col">TEA</th>
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
                  <td className={cls(b.spreadOficial)}>{sfmt(b.spreadOficial, 1)}</td>
                  <td className="dim">{b.dias ?? "—"}</td>
                  <td className={cls(b.tnaPct)}>{rfmt(b.tnaPct, 1)}</td>
                  <td className="dim">{rfmt(b.temPct, 2)}</td>
                  <td className={cls(b.teaPct)}>{rfmt(b.teaPct, 1)}</td>
                  <td className={cls(b.varPct)}>
                    {arrowOf(d)} {pfmt(b.varPct, 2)}
                  </td>
                </tr>
              );
            })}
            {data.bonos.length === 0 && (
              <tr>
                <td className="l dim" colSpan={10}>
                  Sin dólar-linked en data912 en este momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Real</span> data912. TC implícito = Px÷100 · Spread of. = Oficial − TC
          implícito · TNA/TEM/TEA vs oficial, base 365 (vto inferido del ticker). Dif. MEP = MEP − TC implícito.
        </span>
      </div>
    </Panel>
  );
}
