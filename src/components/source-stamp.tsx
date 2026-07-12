import type { Meta } from "@/lib/market";
import { horaCordoba } from "@/lib/format";

/**
 * Sello de frescura de un panel (de cara al cliente): origen del dato +
 * "Actualizado HH:MM" (hora Córdoba). Los paneles que aún no son 100% firmes
 * llevan una marca discreta "provisorio". No se nombra ningún proveedor técnico
 * intermedio: `meta.source` ya trae solo la institución/mercado de origen.
 */
export function SourceStamp({ meta }: { meta: Meta }) {
  return (
    <span className="stamp">
      {meta.status !== "real" && <span className="st-prov">provisorio</span>}
      {meta.source && <span>{meta.source}</span>}
      {meta.updatedAt !== null && meta.status !== "ejemplo" && (
        <span>· Actualizado {horaCordoba(new Date(meta.updatedAt), false)}</span>
      )}
      {meta.problemas.length > 0 && (
        <span className="st-warn" title="Algún dato puede estar demorado">
          ⚠
        </span>
      )}
    </span>
  );
}

/** Meta constante para módulos que todavía muestran datos provisorios. */
export function metaEjemplo(source: string): Meta {
  return { source, updatedAt: null, status: "ejemplo", problemas: [] };
}
