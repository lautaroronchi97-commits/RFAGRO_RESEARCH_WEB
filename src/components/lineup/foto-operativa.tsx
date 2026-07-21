import { getFotoOperativa } from "@/lib/lineup/foto";
import { nfmt, sfmt } from "@/lib/format";
import { Panel, PanelHead } from "../panel";
import { SourceStamp } from "../source-stamp";
import { QueEsEsto } from "../que-es-esto";
import { BuquesTabla } from "./buques-tabla";

function IconShip() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 10.5 3 7h10l1 3.5" />
      <path d="M8 7V3.5M6 5h4" />
      <path d="M1.5 10.5c1 0 1 1 2 1s1-1 2-1 1 1 2 1 1-1 2-1 1 1 2 1 1-1 2-1" />
    </svg>
  );
}

/** "2026-07-16" → "16/07". */
function ddmm(iso: string | null): string {
  if (!iso) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function DeltaCell({ d }: { d: number | null }) {
  if (d === null) return <td className="dim">—</td>;
  if (Math.abs(d) < 1) return <td className="dim">=</td>;
  return <td className={d > 0 ? "pos" : "neg"}>{sfmt(d, 0)}</td>;
}

export async function FotoOperativaPanel() {
  const data = await getFotoOperativa();

  if (data.fecha === null) {
    return (
      <Panel id="lineup-foto">
        <PanelHead glyph={<IconShip />} title="Line-up de buques" sub="Exportaciones por puerto" stamp={<SourceStamp meta={data.meta} />} />
        <p className="dim" style={{ padding: "8px 2px" }}>Sin datos de line-up disponibles.</p>
      </Panel>
    );
  }

  const { fecha, fechaPrev, productos, zonas, buques, nuevos, totalTon, totalBuques } = data;

  return (
    <Panel id="lineup-foto">
      <PanelHead
        glyph={<IconShip />}
        title="Line-up de buques"
        sub={`Foto del ${ddmm(fecha)} · exportaciones (carga)`}
        stamp={<SourceStamp meta={data.meta} />}
      />

      <div className="lu-kpis">
        <div className="lu-kpi">
          <span className="lu-kpi-v">{nfmt(totalBuques, 0)}</span>
          <span className="lu-kpi-l">buques cargando</span>
        </div>
        <div className="lu-kpi">
          <span className="lu-kpi-v">{nfmt(totalTon, 0)}</span>
          <span className="lu-kpi-l">toneladas al embarque</span>
        </div>
        <div className="lu-kpi">
          <span className="lu-kpi-v">{productos.length}</span>
          <span className="lu-kpi-l">productos activos</span>
        </div>
      </div>

      {nuevos.length > 0 && fechaPrev && (
        <div className="lu-cambios">
          <h3 className="lu-h3">Qué cambió vs el {ddmm(fechaPrev)}</h3>
          <ul className="lu-nuevos">
            {nuevos.map((n) => (
              <li key={n.vessel}>
                <span className="lu-nuevo-badge">nuevo</span>
                <b>{n.vessel}</b> · {n.empresa} · {n.productos.join(", ")} ·{" "}
                <span className="lu-mono">{nfmt(n.toneladas, 0)} t</span> · {n.zona}
                {n.etb ? ` · ETB ${ddmm(n.etb)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="lu-h3">Por producto</h3>
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 460 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Producto</th>
              <th scope="col">Buques</th>
              <th scope="col">Toneladas</th>
              <th scope="col">Δ vs {ddmm(fechaPrev)}</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.codigo}>
                <td className="l sym">{p.display}</td>
                <td>{nfmt(p.buques, 0)}</td>
                <td>{nfmt(p.toneladas, 0)}</td>
                <DeltaCell d={p.deltaTon} />
              </tr>
            ))}
            <tr className="tot">
              <td className="l">TOTAL</td>
              <td>{nfmt(totalBuques, 0)}</td>
              <td>{nfmt(totalTon, 0)}</td>
              <td className="dim" />
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="lu-h3">Por zona</h3>
      <div className="table-scroll">
        <table className="tbl" style={{ minWidth: 380 }}>
          <thead>
            <tr>
              <th className="l" scope="col">Zona</th>
              <th scope="col">Buques</th>
              <th scope="col">Toneladas</th>
            </tr>
          </thead>
          <tbody>
            {zonas.map((z) => (
              <tr key={z.zona}>
                <td className="l sym">{z.zona}</td>
                <td>{nfmt(z.buques, 0)}</td>
                <td>{nfmt(z.toneladas, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="lu-h3">Buques en el line-up</h3>
      <BuquesTabla buques={buques} fecha={fecha} />

      <QueEsEsto
        paraQue="Es la foto del último line-up de buques en puertos argentinos: qué barcos vienen a cargar granos y subproductos para exportar, cuánto, de qué empresa y a qué destino. Sirve para leer la demanda física de exportación antes de la rueda."
        comoSeCalcula="Toma la última rueda del line-up de buques (exportaciones = carga), agrupa por producto y por zona portuaria (Up River Norte/Sur y Bahía Blanca, clasificadas por el muelle), normaliza los nombres de los exportadores y compara contra la rueda anterior para marcar los buques nuevos."
      />
    </Panel>
  );
}
