import { getDolarFuturo } from "@/lib/market";
import { nfmt, pfmt, dirOf, arrowOf } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { DolarFuturoChart } from "./dolar-futuro-chart";

function IconCurve() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12l3.5-4L8 9.5 14 3" />
      <circle cx="14" cy="3" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export async function DolarFuturoPanel() {
  const data = await getDolarFuturo();
  const points = [
    ...(data.spot ? [{ label: "SPOT", value: data.spot }] : []),
    ...data.posiciones.map((p) => ({ label: p.label, value: p.ultimo })),
  ];

  return (
    <Panel id="dolar-futuro">
      <PanelHead
        glyph={<IconCurve />}
        title="Dólar futuro"
        sub="Curva A3/MAE · ARS"
        stamp="MAE · ~15 min"
      />
      {points.length > 1 && <DolarFuturoChart points={points} />}
      <div className="cv-legend">
        <span className="lk">
          <span className="sw" aria-hidden="true" />
          Último por posición
        </span>
        {data.spot && (
          <span className="lk">
            <span className="sw g" aria-hidden="true" />
            Spot mayorista {nfmt(data.spot, 2)}
          </span>
        )}
      </div>
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 360 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Posición</th>
              <th scope="col">Último</th>
              <th scope="col">Var</th>
              <th scope="col">Volumen</th>
            </tr>
          </thead>
          <tbody>
            {data.posiciones.map((p) => {
              const d = dirOf(p.varPct);
              return (
                <tr key={p.ticker}>
                  <td className="l sym">{p.label}</td>
                  <td>{nfmt(p.ultimo, 2)}</td>
                  <td className={d === "up" ? "pos" : d === "down" ? "neg" : "neu2"}>
                    {arrowOf(d)} {pfmt(p.varPct, 2)}
                  </td>
                  <td className="dim">{nfmt(p.volumen, 0)}</td>
                </tr>
              );
            })}
            {data.posiciones.length === 0 && (
              <tr>
                <td className="l dim" colSpan={4}>
                  Sin datos de MAE en este momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Real</span> Precios y volumen de MAE (dólar DDF). La tasa implícita la
          agregamos cuando validemos la fórmula.
        </span>
      </div>
    </Panel>
  );
}
