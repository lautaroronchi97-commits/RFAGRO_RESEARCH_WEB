import { getDjveResumen } from "@/lib/djve";
import { nfmt } from "@/lib/format";
import { Panel, PanelHead } from "./panel";
import { SourceStamp } from "./source-stamp";
import { QueEsEsto } from "./que-es-esto";

function IconExport() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 10V2.5" />
      <path d="M5.4 5 8 2.4 10.6 5" />
      <path d="M3 9.5v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

export async function DjvePanel() {
  const data = await getDjveResumen();
  // E3 H7: ocultar los productos sin actividad en el año (todo "—") — eran ~70 filas de ruido.
  const productos = data.productos.filter((p) => (Number(p.tonAnio) || 0) > 0);
  const ocultos = data.productos.length - productos.length;

  return (
    <Panel id="djve">
      <PanelHead
        glyph={<IconExport />}
        title="DJVE — Ventas al exterior"
        sub={`Toneladas declaradas${data.anio ? ` · acumulado ${data.anio}` : ""}`}
        stamp={<SourceStamp meta={data.meta} />}
      />
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Producto</th>
              <th scope="col">Acum. año (t)</th>
              <th scope="col">Últ. 30 días</th>
              <th scope="col">Últ. 7 días</th>
              <th scope="col">DJVE 7d</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.producto}>
                <td className="l sym">{p.producto}</td>
                <td>{nfmt(p.tonAnio, 0)}</td>
                <td className="dim">{nfmt(p.ton30d, 0)}</td>
                <td className={p.ton7d ? "pos" : "dim"}>{nfmt(p.ton7d, 0)}</td>
                <td className="dim">{p.n7d || "—"}</td>
              </tr>
            ))}
            {productos.length > 0 && (
              <tr className="tot">
                <td className="l">TOTAL</td>
                <td>{nfmt(data.totalAnio, 0)}</td>
                <td className="dim" />
                <td className="dim" />
                <td className="dim" />
              </tr>
            )}
            {productos.length === 0 && (
              <tr>
                <td className="l dim" colSpan={5}>
                  Sin datos de DJVE disponibles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {ocultos > 0 && (
        <p className="dim" style={{ fontSize: 12, marginTop: 6 }}>
          {ocultos} producto{ocultos === 1 ? "" : "s"} sin declaraciones en {data.anio ?? "el año"} (ocultos).
        </p>
      )}
      <QueEsEsto
        paraQue="Muestra las declaraciones de venta al exterior (DJVE) de granos y subproductos: cuánto se anotó para exportar, un termómetro de la demanda externa."
        comoSeCalcula="Suma las toneladas registradas en el año en curso, con ventanas de los últimos 7 y 30 días por fecha de registro."
      />
    </Panel>
  );
}
