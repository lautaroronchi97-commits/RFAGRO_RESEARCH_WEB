import Link from "next/link";
import { getMonitorMercados, type MonitorRow } from "@/lib/monitor-mercados";
import { nfmt, pfmt } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { GlyphSoja, GlyphMaiz, GlyphTrigo } from "./icons";
import { SourceStamp } from "./source-stamp";

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

/**
 * "El mercado hoy" de la home: vistazo compacto a Chicago (soja + derivados,
 * maíz, trigo) en USD/tn con la variación del día. Reusa `getMonitorMercados()`
 * —la misma fuente del monitor completo de `/granos`— sin datos ni lógica nueva.
 * El dólar con su variación ya vive en la cinta de arriba, por eso acá no se
 * repite. El macro (petróleo, oro, real, SPY…) queda en el monitor completo.
 */
export async function MercadoHoy() {
  const data = await getMonitorMercados();

  return (
    <Panel id="mercado-hoy">
      <PanelHead
        glyph={<IconMonitor />}
        title="El mercado hoy"
        sub="Chicago en USD/tn · futuros demorados ~10 min"
        stamp={<SourceStamp meta={data.meta} />}
      />

      <div className="mh-grid">
        {data.agro.map((r) => (
          <div className="mh-cell" key={r.yahoo}>
            <div className="mh-hd">
              <span className="mh-glyph" style={{ color: glyphColor(r.glyph) }}>{glyphFor(r.glyph)}</span>
              <span className="mh-name">{r.nombre}</span>
              {r.pos && <span className="mh-pos">{r.pos}</span>}
            </div>
            <div className="mh-val">
              {r.usdTn != null ? nfmt(r.usdTn, 1) : "—"}
              <span className="mh-unit">USD/tn</span>
            </div>
            <div className={`mh-delta ${deltaClass(r.deltaPct)}`}>{pfmt(r.deltaPct, 2)}</div>
          </div>
        ))}
      </div>

      <div className="panel-note">
        <span>
          <span className="k">Referencia internacional</span> el precio de Chicago que marca a tu grano,
          pasado a dólares por tonelada. El detalle (posición operada, petróleo, oro, real, S&amp;P) está en{" "}
          <Link href="/granos" className="cal-inline-link">Granos</Link>.
        </span>
      </div>
    </Panel>
  );
}
