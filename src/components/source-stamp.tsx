import type { Meta, FuenteStatus } from "@/lib/market";
import { horaCordoba } from "@/lib/format";

const LABELS: Record<FuenteStatus, string> = {
  real: "REAL",
  parcial: "PARCIAL",
  ejemplo: "EJEMPLO",
};

/**
 * Sello de frescura de un panel: estado (REAL/PARCIAL/EJEMPLO) + fuente +
 * hora real de los datos (hora Córdoba). Si hubo fuentes caídas, muestra ⚠
 * con el detalle en el title.
 */
export function SourceStamp({ meta }: { meta: Meta }) {
  return (
    <span className="stamp">
      <span className={`st-badge st-${meta.status}`}>{LABELS[meta.status]}</span>
      <span>{meta.source}</span>
      {meta.updatedAt !== null && meta.status !== "ejemplo" && (
        <span>· datos al {horaCordoba(new Date(meta.updatedAt), false)}</span>
      )}
      {meta.problemas.length > 0 && (
        <span className="st-warn" title={meta.problemas.join(" · ")}>
          ⚠
        </span>
      )}
    </span>
  );
}

/** Meta constante para módulos que todavía muestran datos de ejemplo. */
export function metaEjemplo(source: string): Meta {
  return { source, updatedAt: null, status: "ejemplo", problemas: [] };
}
