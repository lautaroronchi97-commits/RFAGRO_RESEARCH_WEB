import { getMonitorMercados, type MonitorRow } from "@/lib/monitor-mercados";
import { nfmt, pfmt } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { GlyphSoja, GlyphMaiz, GlyphTrigo } from "./icons";
import { SourceStamp } from "./source-stamp";
import { QueEsEsto } from "./que-es-esto";

function IconMonitor() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 13h12M4 11V7M7 11V4M10 11V8M13 11V5" />
    </svg>
  );
}

function glyphFor(g: MonitorRow["glyph"]) {
  if (g === "soja") return <GlyphSoja />;
  if (g === "maiz") return <GlyphMaiz />;
  if (g === "trigo") return <GlyphTrigo />;
  return null;
}
function glyphColor(g: MonitorRow["glyph"]) {
  if (g === "soja") return "var(--brand-agro)";
  if (g === "maiz") return "var(--gold-text)";
  return "var(--brand-deep)";
}
function deltaClass(d: number | null) {
  return d == null ? "neu2" : d > 0 ? "pos" : d < 0 ? "neg" : "neu2";
}

export async function MonitorMercados() {
  const data = await getMonitorMercados();

  return (
    <Panel id="monitor-mercados">
      <PanelHead
        glyph={<IconMonitor />}
        title="Monitor de mercados"
        sub="Chicago en tn · futuros demorados ~10 min"
        stamp={<SourceStamp meta={data.meta} />}
      />

      <p className="mon-note">
        La posición de cada grano es el <b>contrato más operado</b> de Chicago (referencia de mesa),
        no el más cercano. Es una serie continua: rola sola cuando ese contrato vence.
      </p>

      {/* Agro — destacado, en USD/tn */}
      <div className="table-scroll">
        <table className="tbl mon-tbl" style={{ minWidth: 460 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Producto</th>
              <th scope="col">USD/tn</th>
              <th scope="col">Día</th>
              <th scope="col">Chicago</th>
            </tr>
          </thead>
          <tbody>
            {data.agro.map((r) => (
              <tr key={r.yahoo}>
                <td className="l">
                  <span className="grp-cell">
                    <span className="gglyph" style={{ color: glyphColor(r.glyph) }}>{glyphFor(r.glyph)}</span>
                    <span className="gname">{r.nombre}</span>
                    {r.pos && <span className="gmeta">{r.pos}</span>}
                  </span>
                </td>
                <td className="mon-tn">{r.usdTn != null ? nfmt(r.usdTn, 1) : "—"}</td>
                <td className={deltaClass(r.deltaPct)}>{pfmt(r.deltaPct, 2)}</td>
                <td className="dim">
                  {r.ultimo != null ? `${nfmt(r.ultimo, r.unidadDec)} ${r.unidad}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Macro — informativo, unidad propia */}
      <div className="mon-sub-hd">Referencias</div>
      <div className="table-scroll">
        <table className="tbl mon-tbl mon-macro" style={{ minWidth: 380 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Instrumento</th>
              <th scope="col">Último</th>
              <th scope="col">Día</th>
            </tr>
          </thead>
          <tbody>
            {data.macro.map((r) => (
              <tr key={r.yahoo}>
                <td className="l">
                  <span className="grp-cell">
                    <span className="gname">{r.nombre}</span>
                    {r.pos && <span className="gmeta">{r.pos}</span>}
                  </span>
                </td>
                <td className="sym">
                  {r.ultimo != null ? nfmt(r.ultimo, r.unidadDec) : "—"}
                  <span className="mon-u">{r.unidad}</span>
                </td>
                <td className={deltaClass(r.deltaPct)}>{pfmt(r.deltaPct, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <QueEsEsto
        paraQue="Es un vistazo rápido a cómo vienen los mercados que mueven el precio de tu grano. Arriba, los productos de Chicago que marcan la referencia internacional (soja, sus derivados, maíz y trigo), pasados a dólares por tonelada para leerlos igual que la pizarra. Abajo, otras referencias que ayudan a leer el clima general: el maní, el petróleo, el oro, la plata, el dólar en el mundo, el real y la bolsa de Estados Unidos."
        comoSeCalcula="Cada precio viene del mercado donde cotiza (Chicago para los granos, y los mercados de Nueva York para el resto). De cada grano tomamos el contrato más operado en ese momento —el de referencia de la mesa, que suele ser el de la cosecha nueva, no el más cercano al vencer—; por eso al lado del nombre ves la posición (por ejemplo, soja NOV26). Es una serie continua: cuando ese contrato vence, pasa solo al siguiente. A los productos de Chicago los pasamos a dólares por tonelada con los mismos factores de conversión que usa el resto del sitio. El maní no cotiza en Chicago: el único futuro de maní del mundo es el de la Bolsa de Zhengzhou (China), así que ese lo mostramos en dólares por tonelada convertido desde yuanes —es el termómetro internacional del maní, no el precio del maní argentino—. La variación del día se mide contra el cierre anterior. Los futuros llegan con unos 10 a 15 minutos de demora (es lo mínimo que permiten mostrar gratis); el dólar contra el real y la bolsa de Estados Unidos van en tiempo real."
      />
    </Panel>
  );
}
