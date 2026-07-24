import { getCapacidad } from "@/lib/capacidad";
import { CapacidadEditable, type CapGranoClient } from "./capacidad-editable";
import { Panel, PanelHead } from "./panel";
import { SourceStamp } from "./source-stamp";
import { QueEsEsto } from "./que-es-esto";
import type { Meta } from "@/lib/market";

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

  const granos: CapGranoClient[] = data.granos.map((g) => ({
    underlying: g.underlying,
    nombre: g.nombre,
    fasBcr: g.fasBcr,
    pizarra: g.pizarra,
    fobOficial: g.fobOficial,
    cfg: g.cfg,
  }));

  // Stamp combinado: BCR (el scrape de la planilla) + SAGyP/MAGyP (el FOB oficial que alimenta
  // "Nuestro") — mismo criterio que semaforo.ts para paneles con más de una fuente.
  const metaCombinada: Meta = {
    source: "Bolsa de Comercio de Rosario · SAGyP/MAGyP",
    updatedAt: data.meta.updatedAt,
    status: data.meta.status === "real" && data.metaFobOficial.status === "real" ? "real" : "parcial",
    problemas: [...data.meta.problemas, ...data.metaFobOficial.problemas],
  };

  return (
    <Panel id="capacidad">
      <PanelHead
        glyph={<IconCap />}
        title="Capacidad de pago"
        sub="FAS teórico BCR vs modelo propio vs pizarra"
        stamp={<SourceStamp meta={metaCombinada} />}
      />
      <CapacidadEditable granos={granos} />
      <QueEsEsto
        paraQue="Cuánto puede pagar el exportador por tu grano hoy, en dólares por tonelada, leído de TRES formas: lo que calcula BCR, lo que calculamos nosotros (editable), y lo que efectivamente paga hoy la pizarra. La columna Diferencial te dice si el grano se está pagando por encima (sobrepagado) o por debajo (subpagado) de lo teórico."
        comoSeCalcula="Partimos del FOB oficial que fija SAGyP/MAGyP (la misma base que usan los derechos de exportación) y le descontamos retenciones, reintegro (si lo hay), gastos portuarios y comerciales — igual estructura que la metodología pública de BCR. BCR usa la misma base FOB oficial para su columna SAGyP, así el diferencial entre BCR y Nuestro aísla la diferencia de SUPUESTOS de gastos, no de precio. Los supuestos de 'Nuestro' arrancan sembrados de los propios costos que publica BCR y son editables (desplegable abajo de la tabla)."
      />
    </Panel>
  );
}
