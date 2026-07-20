import { getDolarFuturo, getDolarLinked } from "@/lib/market";
import { nfmt } from "@/lib/format";
import { arbitrajes } from "@/lib/sample";
import { Panel, PanelHead } from "./panel";
import { ImplicitasChart } from "./implicitas-chart";
import { ChartTabla, type ChartTablaFila } from "./chart-tabla";
import { SourceStamp } from "./source-stamp";
import { QueEsEsto } from "./que-es-esto";

function IconLayers() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2 14 5 8 8 2 5z" />
      <path d="M2 8l6 3 6-3" />
      <path d="M2 11l6 3 6-3" />
    </svg>
  );
}

export async function ImplicitasPanel() {
  const [fut, link] = await Promise.all([getDolarFuturo(), getDolarLinked()]);

  const meta = {
    source: "MAE · Mercado de deuda local",
    updatedAt: Math.max(fut.meta.updatedAt ?? 0, link.meta.updatedAt ?? 0) || null,
    status: "parcial" as const, // granos siguen siendo ejemplo
    problemas: [...fut.meta.problemas, ...link.meta.problemas, "granos: ejemplo hasta conectar A3"],
  };

  const futPts = fut.posiciones
    .filter((p) => p.tnaPct != null && p.dias != null)
    .map((p) => ({ x: p.dias as number, y: p.tnaPct as number }));

  const linkPts = link.bonos
    .filter((b) => b.tnaPct != null && b.dias != null)
    .map((b) => ({ x: b.dias as number, y: b.tnaPct as number }));

  const granPts = arbitrajes.flatMap((g) => g.rows.map((r) => ({ x: r.dias, y: r.tna })));

  const series = [
    { name: "Dólar futuro", color: "var(--brand-deep)", points: futPts },
    { name: "Dólar linked", color: "var(--gold-text)", points: linkPts },
    { name: "Granos (ej.)", color: "var(--c-gran)", points: granPts, line: false },
  ];

  // Tabla de datos del gráfico: una fila por plazo (días), una columna por serie.
  // Mismos puntos y mismo formato que el tooltip del chart; "—" donde la serie
  // no tiene punto en ese plazo.
  const plazos = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
  const tablaFilas: ChartTablaFila[] = plazos.map((x) => {
    const fila: ChartTablaFila = { plazo: `${x}d` };
    for (const s of series) {
      const vals = s.points.filter((p) => p.x === x).map((p) => `${nfmt(p.y, 1)}%`);
      fila[s.name] = vals.length > 0 ? vals.join(" · ") : null;
    }
    return fila;
  });
  const tablaColumnas = [
    { key: "plazo", label: "Plazo", align: "left" as const },
    ...series.map((s) => ({ key: s.name, label: s.name })),
  ];

  return (
    <Panel id="implicitas">
      <PanelHead
        glyph={<IconLayers />}
        title="Implícitas combinadas"
        sub="TNA USD por plazo — dólar futuro · linked · granos"
        stamp={<SourceStamp meta={meta} />}
      />
      <ImplicitasChart series={series} />
      <ChartTabla
        titulo="Datos del gráfico"
        columnas={tablaColumnas}
        filas={tablaFilas}
        nota="TNA en % según días al vencimiento. Granos: valores de ejemplo hasta conectar A3."
      />
      <QueEsEsto
        paraQue="Junta en un solo gráfico las tasas en dólares que se pueden sacar por distintos caminos (dólar futuro y dólar linked), para comparar cuál rinde más a cada plazo."
        comoSeCalcula="Para cada instrumento calcula la tasa anual en dólares y la ubica según los días que faltan hasta el vencimiento: el eje horizontal son los días al vencimiento y el vertical, la tasa anual."
      />
    </Panel>
  );
}
