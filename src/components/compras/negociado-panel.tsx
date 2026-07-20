import Link from "next/link";
import { getNegociado, DISPLAY_NEGOCIADO, PRODUCTOS_NEGOCIADO } from "@/lib/compras/negociado";
import { nfmt } from "@/lib/format";
import { Panel, PanelHead } from "../panel";
import { SourceStamp } from "../source-stamp";
import { QueEsEsto } from "../que-es-esto";
import { NegociadoTabla } from "./negociado-tabla";
import { NegociadoChart } from "./negociado-chart";

/**
 * Panel del negociado por producto (/comercio/negociado): KPIs de la última semana,
 * tabla por producto/campaña (semanal, Δ, acumulado, % cosecha, % priceado, saldo a
 * fijar) y histograma semanal/mensual apilado por sector. La fuente de cara al usuario
 * es SIO Granos (el puente técnico no se nombra — regla "institución sí, puente no").
 */

function IconGranos() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 13.5h12" />
      <path d="M3.5 13.5v-4M6.5 13.5V6M9.5 13.5V8.5M12.5 13.5v-9" />
    </svg>
  );
}

/** "2026-07-08" → "08/07". */
function ddmm(iso: string | null): string {
  if (!iso) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export async function NegociadoPanel() {
  const data = await getNegociado();

  if (data.fecha === null) {
    return (
      <Panel id="comercio-negociado">
        <PanelHead glyph={<IconGranos />} title="Negociado por producto" sub="Compras semanales" stamp={<SourceStamp meta={data.meta} />} />
        <p className="dim" style={{ padding: "8px 2px" }}>
          Sin serie de compras disponible todavía. {data.meta.problemas[0] ?? ""}
        </p>
      </Panel>
    );
  }

  const productos = PRODUCTOS_NEGOCIADO.filter((cod) => data.serie.some((p) => p.cod === cod)).map((cod) => ({
    cod,
    display: DISPLAY_NEGOCIADO[cod] ?? cod,
  }));

  return (
    <Panel id="comercio-negociado">
      <PanelHead
        glyph={<IconGranos />}
        title="Negociado por producto"
        sub={`Semana al ${ddmm(data.fecha)}`}
        stamp={<SourceStamp meta={data.meta} />}
      />

      <div className="lu-kpis">
        <div className="lu-kpi">
          <span className="lu-kpi-v">{data.totalSemanal == null ? "—" : nfmt(data.totalSemanal, 0)}</span>
          <span className="lu-kpi-l">t negociadas en la semana (todos los granos)</span>
        </div>
        <div className="lu-kpi">
          <span className="lu-kpi-v">{data.liderCod ? DISPLAY_NEGOCIADO[data.liderCod] ?? data.liderCod : "—"}</span>
          <span className="lu-kpi-l">
            lo más negociado{data.liderTn != null ? ` (${nfmt(data.liderTn, 0)} t)` : ""}
          </span>
        </div>
        <div className="lu-kpi">
          <span className="lu-kpi-v">{ddmm(data.fecha)}</span>
          <span className="lu-kpi-l">última semana con dato</span>
        </div>
      </div>

      <h3 className="lu-h3">Por producto y campaña</h3>
      <NegociadoTabla filas={data.filas} avance={data.avance} fecha={data.fecha} />

      <h3 className="lu-h3">Histograma de volumen</h3>
      <NegociadoChart serie={data.serie} productos={productos} />

      <QueEsEsto
        paraQue={
          <>
            Muestra <strong>cuánto grano le compró la exportación y la industria al productor</strong> cada
            semana (SIO Granos, el registro oficial de operaciones): el total negociado por producto, cuánto
            va de la campaña (<strong>% sobre cosecha</strong>), cuánto de lo comprado ya tiene precio
            (<strong>% priceado</strong> = precio hecho + fijado) y cuánto sigue a fijar. Sirve para leer la
            oferta: poco negociado para la época = productor reteniendo. El dato es <strong>semanal</strong>{" "}
            (no diario) y suma ambos sectores compradores.
          </>
        }
        comoSeCalcula={
          <>
            La serie trae, por grano, sector y campaña: compras de la semana, acumulado de campaña, con
            precio hecho, a fijar y fijado. La <strong>campaña activa</strong> de cada producto es la de
            mayor venta semanal (en una misma semana conviven campañas). El <strong>% sobre cosecha</strong>{" "}
            divide el acumulado (sumados los sectores, con limpieza de saltos de la fuente) por la
            <strong> producción estimada por USDA para Argentina</strong>. El histograma apila
            Exportación + Industria por semana; en Mensual se suman las semanas del mes calendario.
          </>
        }
      />

      <p className="ng-admin-link dim">
        <Link href="/admin/datos">Actualizar serie →</Link>
      </p>
    </Panel>
  );
}
