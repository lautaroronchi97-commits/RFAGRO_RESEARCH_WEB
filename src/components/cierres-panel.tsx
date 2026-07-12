import { getCierresGranos } from "@/lib/futuros";
import { nfmt, pfmt, rfmt, dirOf, arrowOf } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { SourceStamp } from "./source-stamp";

function IconGrain() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v12" />
      <path d="M8 5c1.6 0 2.8-.8 2.8-.8S10.4 6 8 6 5.2 4.2 5.2 4.2 6.4 5 8 5Z" />
      <path d="M8 9c1.6 0 2.8-.8 2.8-.8S10.4 10 8 10 5.2 8.2 5.2 8.2 6.4 9 8 9Z" />
    </svg>
  );
}

const cls = (v: number | null) => (v == null ? "neu2" : v > 0 ? "pos" : v < 0 ? "neg" : "neu2");

export async function CierresPanel() {
  const data = await getCierresGranos();

  return (
    <Panel id="cierres">
      <PanelHead
        glyph={<IconGrain />}
        title="Cierres A3 — granos"
        sub="Ajuste por posición (soja · maíz · trigo)"
        stamp={<SourceStamp meta={data.meta} />}
      />
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Posición</th>
              <th scope="col">Ajuste</th>
              <th scope="col">Var</th>
              <th scope="col">Volumen</th>
              <th scope="col">Int. abierto</th>
              <th scope="col">Δ IA</th>
              <th scope="col">Tasa impl.</th>
            </tr>
          </thead>
          <tbody>
            {data.granos.map((g) => (
              <GranoRows key={g.underlying} nombre={g.nombre} fecha={g.fecha} posiciones={g.posiciones} />
            ))}
            {data.granos.length === 0 && (
              <tr>
                <td className="l dim" colSpan={7}>
                  Sin cierres cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Real</span> Matba Rofex. Ajuste = precio de
          liquidación diario · Var = variación % del cierre · Int. abierto = contratos abiertos (Δ vs día
          previo) · Tasa impl. = tasa implícita de la posición. Muestra el último cierre disponible.
        </span>
      </div>
    </Panel>
  );
}

function GranoRows({
  nombre,
  fecha,
  posiciones,
}: {
  nombre: string;
  fecha: string | null;
  posiciones: Awaited<ReturnType<typeof getCierresGranos>>["granos"][number]["posiciones"];
}) {
  return (
    <>
      <tr className="grp">
        <td className="l" colSpan={7}>
          <span className="grp-cell">
            <span className="gname">{nombre}</span>
            {fecha && <span className="gmeta">cierre {fecha}</span>}
          </span>
        </td>
      </tr>
      {posiciones.map((p) => {
        const d = dirOf(p.changePercent);
        return (
          <tr key={p.symbol}>
            <td className="l sym">{p.posicion}</td>
            <td>{nfmt(p.settlement, 2)}</td>
            <td className={cls(p.changePercent)}>
              {arrowOf(d)} {pfmt(p.changePercent, 2)}
            </td>
            <td className="dim">{p.volume != null ? nfmt(p.volume, 0) : "—"}</td>
            <td className="dim">{p.openInterest != null ? nfmt(p.openInterest, 0) : "—"}</td>
            <td className={cls(p.oiChange)}>{p.oiChange != null ? nfmt(p.oiChange, 0) : "—"}</td>
            <td className="dim">{rfmt(p.impliedRate, 1)}</td>
          </tr>
        );
      })}
    </>
  );
}
