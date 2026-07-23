import Link from "next/link";
import { getCamiones } from "@/lib/camiones/camiones";
import { nfmt } from "@/lib/format";
import { Panel, PanelHead } from "../panel";
import { SourceStamp } from "../source-stamp";
import { QueEsEsto } from "../que-es-esto";
import { CamionesChart } from "./camiones-chart";

/**
 * Panel público de camiones en puerto (/comercio/camiones, C5 del backlog maestro): entrada
 * diaria de camiones a puertos, por zona portuaria y por producto — Williams Entregas (carga
 * manual desde /admin/datos). Dato PÚBLICO (decisión de Lautoro 22/07, como la DJVE).
 */

function IconCamion() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 4.5h6.5v6H1.5z" />
      <path d="M8 7h3.5l2 2.5v1H8z" />
      <circle cx="4" cy="11.5" r="1.2" />
      <circle cx="11.5" cy="11.5" r="1.2" />
    </svg>
  );
}

function ddmm(iso: string | null): string {
  if (!iso) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function fmtDelta(v: number | null): string {
  if (v == null) return "—";
  const s = v >= 0 ? "+" : "";
  return `${s}${nfmt(v, 0)}`;
}

export async function CamionesPanel() {
  const data = await getCamiones();

  if (data.fecha === null) {
    return (
      <Panel id="comercio-camiones">
        <PanelHead glyph={<IconCamion />} title="Camiones en puerto" sub="Entrada diaria por zona y producto" stamp={<SourceStamp meta={data.meta} />} />
        <p className="dim" style={{ padding: "8px 2px" }}>
          Sin datos todavía. {data.meta.problemas[0] ?? ""}
        </p>
      </Panel>
    );
  }

  const serieZona = data.porZona.map((z) => ({ key: z.zona, display: z.display, puntos: z.puntos }));
  const serieProducto = data.porProducto.map((p) => ({ key: p.producto, display: p.display, puntos: p.puntos }));

  return (
    <Panel id="comercio-camiones">
      <PanelHead glyph={<IconCamion />} title="Camiones en puerto" sub={`Día al ${ddmm(data.fecha)}`} stamp={<SourceStamp meta={data.meta} />} />

      <div className="lu-kpis">
        <div className="lu-kpi">
          <span className="lu-kpi-v">{data.totalHoy == null ? "—" : nfmt(data.totalHoy, 0)}</span>
          <span className="lu-kpi-l">camiones el {ddmm(data.fecha)} (las 4 zonas)</span>
        </div>
        <div className="lu-kpi">
          <span className="lu-kpi-v">{fmtDelta(data.deltaAyer)}</span>
          <span className="lu-kpi-l">vs día hábil anterior</span>
        </div>
        <div className="lu-kpi">
          <span className="lu-kpi-v">{fmtDelta(data.deltaSemana)}</span>
          <span className="lu-kpi-l">vs mismo día, semana pasada</span>
        </div>
        <div className="lu-kpi">
          <span className="lu-kpi-v">{data.productoLiderHoy ? data.productoLiderHoy.display : "—"}</span>
          <span className="lu-kpi-l">
            producto líder{data.productoLiderHoy ? ` (${nfmt(data.productoLiderHoy.cantidad, 0)})` : ""}
          </span>
        </div>
      </div>

      {serieZona.length > 0 && (
        <>
          <h3 className="lu-h3">Por zona portuaria</h3>
          <CamionesChart series={serieZona} colorClassPrefix="cam-" tituloAria="Camiones diarios por zona portuaria" />
        </>
      )}

      {serieProducto.length > 0 && (
        <>
          <h3 className="lu-h3">Por producto (nacional)</h3>
          <CamionesChart series={serieProducto} colorClassPrefix="cam-" tituloAria="Camiones diarios por producto" />
        </>
      )}

      <QueEsEsto
        paraQue={
          <>
            Muestra <strong>cuántos camiones entraron a puertos, fábricas y molinos</strong> cada día — por{" "}
            <strong>zona portuaria</strong> (Rosario y aledaños, Dársena Bs As-E. Ríos, Puerto Necochea, Puerto B.
            Blanca) y por <strong>producto</strong> (los granos que Lautaro fue subiendo por separado). Es una señal
            de presión de <strong>oferta física</strong>: más camiones de lo normal para la época = más mercadería
            entrando; menos = el productor retiene o hay cuello de botella logístico.
          </>
        }
        comoSeCalcula={
          <>
            La fuente es <strong>Williams Entregas</strong> (vía export de Agrochat), cargada a mano desde{" "}
            <Link href="/admin/datos">/admin/datos</Link> — no hay cron automático, Lautaro sube el archivo cuando
            le queda cómodo. Los valores son <strong>cantidad de camiones</strong> (vehículos), no toneladas. Zona y
            producto son <strong>dos aperturas del mismo total</strong> (no hay matriz cruzada zona×producto): cada
            export es o bien el total sin filtrar, o bien un grano puntual con las mismas 4 zonas.
          </>
        }
      />

      <p className="ng-admin-link dim">
        <Link href="/admin/datos">Actualizar serie →</Link>
      </p>
    </Panel>
  );
}
