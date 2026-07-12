import type { Metadata } from "next";
import Link from "next/link";
import { getEventos, ORG_LABEL, type Organismo } from "@/lib/calendario";
import { hoyCordobaISO } from "@/lib/dates";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CalendarioCliente } from "@/components/calendario-cliente";
import { Panel, PanelHead } from "@/components/panel";

export const metadata: Metadata = {
  title: "Producción · Calendario de informes — RF AGRO",
  description:
    "Calendario cronológico de los informes de estimación de producción de granos (USDA, CONAB, BCR, BCBA, SAGyP) y sus últimas estimaciones por país y grano.",
  robots: { index: false, follow: false },
};

// El calendario se genera en código; se revalida seguido igual por si cambia el día.
export const revalidate = 3600;

const ORDEN_ORG: Organismo[] = ["USDA", "CONAB", "BCR", "BCBA", "DEA", "CFTC", "EIA", "NOPA"];

const QUE_VIENE: { org: Organismo; region: string; detalle: string }[] = [
  { org: "USDA", region: "EEUU · Argentina · Brasil · mundo", detalle: "WASDE + PSD: producción/área/rinde por país, con revisiones mensuales desde 2020." },
  { org: "CONAB", region: "Brasil (por estado)", detalle: "Levantamentos mensuales con todos los vintages desde 2017/18." },
  { org: "BCR", region: "Argentina", detalle: "Estimación mensual GEA de soja, maíz y trigo." },
  { org: "BCBA", region: "Argentina", detalle: "Panorama Agrícola Semanal: los 6 granos, actualización semanal." },
  { org: "DEA", region: "Argentina (por provincia)", detalle: "Estimaciones oficiales SAGyP de los 6 granos + histórico 1969/70→hoy." },
];

export default function ProduccionPage() {
  const hoy = hoyCordobaISO();
  // Horizonte: resto de 2026 (el seed de fechas oficiales cubre 2026).
  const hasta = hoy > "2026-12-31" ? hoy : "2026-12-31";
  const eventos = getEventos(hoy, hasta);
  const presentes = ORDEN_ORG.filter((o) => eventos.some((e) => e.organismo === o));

  return (
    <>
      <h1 className="sr">RF AGRO — Calendario de informes y estimaciones de producción</h1>
      <SiteHeader active="produccion" />
      <main className="wrap">
        <div className="col">
          <div className="prod-intro">
            <Link href="/" className="cal-inline-link">
              ← Volver al tablero
            </Link>
            <h2 className="prod-h1">Calendario de informes + estimaciones de producción</h2>
            <p className="prod-lede">
              Cuándo publica cada organismo y qué proyecta para la producción de cada país y grano.
              Horarios en hora Argentina. Las fechas <b>oficiales</b> las publica el organismo; las marcadas{" "}
              <b>est.</b> se generan por regla (jueves del PAS, 2° miércoles de GEA, etc.) para los que no
              tienen agenda pública.
            </p>
          </div>

          <h2 className="sec-title">Calendario cronológico</h2>
          <Panel id="calendario">
            <div className="cal-full-wrap">
              <CalendarioCliente eventos={eventos} organismos={presentes} />
            </div>
          </Panel>

          <h2 className="sec-title">Última estimación por organismo</h2>
          <Panel id="estimaciones">
            <PanelHead
              title="Estimaciones de producción"
              sub="Producción · área · rinde por país y grano"
            />
            <div className="prod-soon">
              <p className="prod-soon-lede">
                <span className="k">En construcción</span> Acá va la última estimación de cada organismo por
                país y grano, el cambio vs. la publicación anterior y la evolución de cada campaña desde 2020.
                Las bases de datos ya están creadas; falta conectar la ingesta de cada fuente.
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
        </div>
      </main>
      <div className="awn" aria-hidden="true" />
      <SiteFooter />
    </>
  );
}
