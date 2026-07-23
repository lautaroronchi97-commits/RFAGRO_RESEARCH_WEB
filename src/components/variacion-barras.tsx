import { pfmt } from "@/lib/format";

/**
 * Gráfico de barras horizontal para "variación semanal" (granos/Chicago/pizarra en el
 * informe semanal, MP2): una fila por posición/grano, barra desde el centro (0%) hacia la
 * derecha (sube, verde) o la izquierda (baja, rojo). Server-safe (sin estado): sirve igual
 * para la web y para la plantilla que screenshotea Playwright.
 */
export type ItemVariacion = { label: string; deltaPct: number | null; sub?: string };

export function VariacionBarras({ items, titulo }: { items: ItemVariacion[]; titulo?: string }) {
  if (items.length === 0) {
    return <div className="chart-empty">Sin datos suficientes para esta variación.</div>;
  }
  const max = Math.max(1, ...items.map((i) => Math.abs(i.deltaPct ?? 0)));
  return (
    <div className="vb-wrap">
      {titulo && <div className="vb-tit">{titulo}</div>}
      {items.map((it, i) => {
        const dir: "up" | "down" | null = it.deltaPct == null ? null : it.deltaPct >= 0 ? "up" : "down";
        const pct = it.deltaPct == null ? 0 : (Math.abs(it.deltaPct) / max) * 48;
        return (
          <div className="vb-row" key={i}>
            <span className="vb-label">
              {it.label}
              {it.sub && <span className="dim"> {it.sub}</span>}
            </span>
            <span className="vb-bar-wrap">
              <span className="vb-axis" aria-hidden="true" />
              {dir === "up" && <span className="vb-bar up" style={{ width: `${pct}%` }} />}
              {dir === "down" && <span className="vb-bar down" style={{ width: `${pct}%` }} />}
            </span>
            <span className={`vb-val${dir ? ` ${dir}` : ""}`}>{it.deltaPct == null ? "—" : pfmt(it.deltaPct, 2)}</span>
          </div>
        );
      })}
    </div>
  );
}
