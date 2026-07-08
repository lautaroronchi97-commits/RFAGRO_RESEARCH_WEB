import { getCapacidad } from "@/lib/capacidad";
import { nfmt } from "@/lib/format";
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

function IconCap() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v12" />
      <path d="M11 4.5C11 3.1 9.7 2.5 8 2.5S5 3.1 5 4.3c0 3 6 1.7 6 4.7 0 1.3-1.3 2-3 2s-3-.7-3-2.1" />
    </svg>
  );
}

export async function CapacidadPanel() {
  const data = await getCapacidad();

  return (
    <Panel id="capacidad">
      <PanelHead
        glyph={<IconCap />}
        title="Capacidad de pago"
        sub="FAS teórico (BCR) por grano"
        stamp={<SourceStamp meta={data.meta} />}
      />
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 460 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Grano</th>
              <th scope="col">
                <InfoTip term="Capacidad de pago">
                  FAS Teórico de BCR: lo que teóricamente puede pagar el exportador (FOB − retenciones −
                  gastos), en u$s por tonelada. Referencia Spot / puerto SAGyP.
                </InfoTip>
              </th>
              <th scope="col">
                <InfoTip term="Pizarra disponible">
                  Precio del disponible en u$s de la Cámara (CAC-BCR), como contexto de mercado.
                </InfoTip>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.granos.map((g) => (
              <tr key={g.underlying}>
                <td className="l">
                  <span className="grp-cell">
                    <span className="gglyph" style={{ color: glyphColor(g.underlying) }}>
                      {glyphFor(g.underlying)}
                    </span>
                    <span className="gname">{g.nombre}</span>
                  </span>
                </td>
                <td>{g.fas != null ? nfmt(g.fas, 2) : "—"}</td>
                <td className="dim">{g.pizarra != null ? nfmt(g.pizarra, 2) : "—"}</td>
              </tr>
            ))}
            {data.granos.length === 0 && (
              <tr>
                <td className="l dim" colSpan={3}>
                  Sin datos de capacidad de pago todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Base</span> FAS Teórico de BCR{data.fecha ? ` (al ${data.fecha})` : ""} =
          capacidad de pago teórica del exportador · u$s/tn, referencia Spot SAGyP. Es la base; el modelo
          propio de Lautaro (con el dato del día) se enchufa por <code>CAPACIDAD_OVERRIDE</code>. Pizarra =
          disponible CAC como contexto.
        </span>
      </div>
    </Panel>
  );
}
