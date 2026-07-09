import { getArbitrajes } from "@/lib/arbitrajes-cierres";
import { pfmt } from "@/lib/format";
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

function IconCaja() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 5.5 8 2.5l5.5 3v5L8 13.5 2.5 10.5z" />
      <path d="M2.5 5.5 8 8.5l5.5-3M8 8.5v5" />
    </svg>
  );
}

type Fila = { underlying: string; nombre: string; pos: string; tna: number; dias: number | null };

export async function MejorCajaPanel() {
  const data = await getArbitrajes();

  // Por grano, la posición con MENOR tasa implícita (TNA) vs el disponible.
  const filas: Fila[] = [];
  for (const g of data.granos) {
    let best: Fila | null = null;
    for (const r of g.rows) {
      if (r.tna == null) continue;
      if (best === null || r.tna < best.tna) {
        best = { underlying: g.underlying, nombre: g.nombre, pos: r.pos, tna: r.tna, dias: r.dias };
      }
    }
    if (best) filas.push(best);
  }
  filas.sort((a, b) => a.tna - b.tna); // menor tasa primero = mejor para hacer caja

  return (
    <Panel id="mejor-caja">
      <PanelHead
        glyph={<IconCaja />}
        title="Mejor para hacer caja"
        sub="Ranking por menor tasa implícita"
        stamp={<SourceStamp meta={data.meta} />}
      />
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 420 }}>
          <thead>
            <tr>
              <th className="l" scope="col">#</th>
              <th className="l" scope="col">Grano</th>
              <th scope="col">Posición</th>
              <th scope="col">
                <InfoTip term="Tasa implícita">
                  La TNA en USD más baja entre el disponible y sus posiciones siguientes. Cuanto más baja,
                  menos rinde esperar → conviene vender el disponible para hacer caja.
                </InfoTip>
              </th>
              <th scope="col">Días</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.underlying}>
                <td className="l sym">{i + 1}</td>
                <td className="l">
                  <span className="grp-cell">
                    <span className="gglyph" style={{ color: glyphColor(f.underlying) }}>
                      {glyphFor(f.underlying)}
                    </span>
                    <span className="gname">{f.nombre}</span>
                  </span>
                </td>
                <td className="sym">{f.pos}</td>
                <td className={f.tna > 0 ? "pos" : f.tna < 0 ? "neg" : "neu2"}>{pfmt(f.tna, 1)}</td>
                <td className="dim">{f.dias != null ? f.dias : "—"}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td className="l dim" colSpan={5}>
                  Sin datos para el ranking todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Real</span> Ordena soja/maíz/trigo por la <b>menor tasa implícita</b> (USD) entre
          el disponible y sus posiciones siguientes. El de arriba es el que menos carry resigna al venderse
          hoy → el mejor para <b>hacer caja</b>. Sale de la misma pizarra y cierres de Arbitrajes.
        </span>
      </div>
    </Panel>
  );
}
