import { sbSelectAll } from "@/lib/supabase";
import type { Meta } from "@/lib/market";
import { parseRows, granosPresentes, organismosPresentes, type EstimRow } from "@/lib/estimaciones";
import { ORG_LABEL, type Organismo } from "@/lib/calendario";
import { Panel, PanelHead } from "./panel";
import { SourceStamp } from "./source-stamp";
import { EstimacionesCliente } from "./estimaciones-cliente";

// Roadmap para el estado vacío (mientras las ingestas no corrieron / sin datos).
const QUE_VIENE: { org: Organismo; region: string; detalle: string }[] = [
  { org: "USDA", region: "EEUU · Argentina · Brasil · mundo", detalle: "WASDE + PSD: producción/área/rinde por país, con revisiones mensuales desde 2020." },
  { org: "CONAB", region: "Brasil (por estado)", detalle: "Levantamentos mensuales con todos los vintages desde 2017/18." },
  { org: "BCR", region: "Argentina", detalle: "Estimación mensual GEA de soja, maíz y trigo, con vintages desde 2020." },
  { org: "DEA", region: "Argentina (por provincia)", detalle: "Estimaciones oficiales SAGyP de los 6 granos, snapshot semanal + histórico." },
  { org: "BCBA", region: "Argentina", detalle: "Panorama Agrícola Semanal: los 6 granos (pendiente de acceso a BCBA)." },
];

const SOURCE = "USDA (WASDE + PSD) · CONAB · BCR-GEA · SAGyP";

/**
 * Panel "Última estimación por organismo" de /produccion. Lee los vintages de
 * `estimaciones_produccion` (poblada por scripts/ingest-usda.mjs + ingest-conab.mjs) y arma la
 * pizarra + gráfico de evolución + panel de cambios. Si la tabla está vacía (las ingestas todavía
 * no corrieron), muestra el roadmap de fuentes. Degrada solo, como el resto de la web.
 */
export async function EstimacionesPanel() {
  const res = await sbSelectAll(
    "estimaciones_produccion?select=organismo,pais,grano,campania,variable,valor,unidad,fecha_publicacion,informe,url&order=fecha_publicacion.asc",
    3600,
  );
  const rows: EstimRow[] = res.ok ? parseRows(res.data) : [];

  if (rows.length === 0) {
    return (
      <Panel id="estimaciones">
        <PanelHead title="Estimaciones de producción" sub="Producción · área · rinde por país y grano" />
        <div className="prod-soon">
          <p className="prod-soon-lede">
            <span className="k">En preparación</span> Acá va la última estimación de cada organismo por país
            y grano, el cambio vs. la publicación anterior y la evolución de cada campaña desde 2020. Las bases
            y la ingesta ya están listas; los datos aparecen cuando corre la primera actualización.
          </p>
          <ul className="prod-soon-list">
            {QUE_VIENE.map((q) => (
              <li key={q.org}>
                <span className={`cal-org org-${q.org}`}>{ORG_LABEL[q.org]}</span>
                <span className="prod-soon-body">
                  <span className="prod-soon-region">{q.region}</span>
                  <span className="prod-soon-det">{q.detalle}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    );
  }

  const granos = granosPresentes(rows);
  const organismos = organismosPresentes(rows);
  const maxFecha = rows.reduce((m, r) => (r.fecha_publicacion > m ? r.fecha_publicacion : m), rows[0].fecha_publicacion);
  const updatedAt = Date.parse(`${maxFecha}T00:00:00-03:00`);
  const meta: Meta = {
    source: SOURCE,
    updatedAt: Number.isNaN(updatedAt) ? null : updatedAt,
    status: "real",
    problemas: [],
  };

  return (
    <Panel id="estimaciones">
      <PanelHead
        title="Estimaciones de producción"
        sub="Última estimación · Δ vs. anterior · evolución"
        stamp={<SourceStamp meta={meta} />}
      />
      <div className="estim-wrap">
        <EstimacionesCliente rows={rows} granos={granos} organismos={organismos} />
      </div>
    </Panel>
  );
}
