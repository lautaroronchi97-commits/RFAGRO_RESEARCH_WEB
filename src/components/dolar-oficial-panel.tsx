import { getVariacionSemanalDolarOficial } from "@/lib/informe-semanal";
import { nfmt, pfmt } from "@/lib/format";
import { hoyCordobaISO } from "@/lib/dates";
import { Panel, PanelHead } from "./panel";
import { QueEsEsto } from "./que-es-esto";
import { DolarOficialChart } from "./dolar-oficial-chart";

/**
 * Variación semanal del dólar oficial (ítem 13 del backlog viejo / P2 de PLAN_BACKLOG.md) —
 * resuelto al construir MP2 (informe semanal), que necesitaba el mismo dato y el mismo
 * componente de gráfico. Fuente: BCRA A3500 (única con historial diario real; el spot
 * UST$T de MAE que usa el resto de la web no tiene historial en ningún lado).
 */
export async function DolarOficialPanel() {
  const hoy = hoyCordobaISO();
  const v = await getVariacionSemanalDolarOficial(hoy);
  const dir = v.deltaPct == null ? null : v.deltaPct >= 0 ? "up" : "down";

  return (
    <Panel id="dolar-oficial-semanal">
      <PanelHead
        title="Dólar oficial — variación semanal"
        sub="BCRA A3500 (Comunicación 3500)"
      />
      <div className="cbo-head">
        <span className="cbo-kpi">
          <span className="k">Último ({v.fechaActual ?? "—"})</span>
          <span className="v mono">{v.actual != null ? `$ ${nfmt(v.actual, 2)}` : "—"}</span>
          {dir && (
            <span className={`rd ${dir}`}>
              {pfmt(v.deltaPct, 2)} vs {v.fechaPrevia}
            </span>
          )}
        </span>
      </div>
      <DolarOficialChart serie={v.serie} />
      <QueEsEsto
        paraQue="Cuánto se movió el dólar oficial en la última semana (último dato real vs el de ~7 días antes, sin asumir viernes calendario)."
        comoSeCalcula={
          <>
            BCRA A3500 (Comunicación 3500, variable 5 de la API de estadísticas del BCRA) — es
            la única fuente con historial diario real. No es el spot <code>UST$T</code> de MAE
            que usa el resto de la web para el oficial mayorista (ese no tiene historial
            consultable en ningún lado): la A3500 trae el spread bancario implícito, se usa
            igual porque es lo único medible semana a semana.
          </>
        }
      />
    </Panel>
  );
}
