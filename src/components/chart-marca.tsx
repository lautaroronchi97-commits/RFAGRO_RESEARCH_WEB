/**
 * Marca de agua ROFO AGRO para gráficos: el logo completo (isotipo + wordmark),
 * centrado y muy tenue, DENTRO del contenedor de cada chart.
 *
 * Uso (integradores):
 *   - Insertarlo como hijo del contenedor del gráfico. El contenedor padre DEBE
 *     ser `position:relative` (`.chart-wrap` ya lo es; si el chart vive en otro
 *     wrapper, agregarle `position:relative`).
 *   - No lleva props: tamaño (~55% del ancho) y opacidad (.06 claro / .07 oscuro)
 *     salen de `.cm-marca` en globals.css, para que TODOS los charts queden iguales.
 *   - Asset: `public/rofoagro-logo-marca.svg` — derivado del logo real sin los halos
 *     pálidos del auto-trace (se veían como bordes raros sobre el tema oscuro).
 *   - Queda debajo de tooltips/crosshairs (z-index:0 vs. `.cv-tip` z-index:5) y no
 *     intercepta el mouse (`pointer-events:none`).
 *
 * Server-safe: sin estado ni handlers, no agrega JS al cliente.
 * OJO: no confundir con `watermark.tsx` (marca de agua del email del login).
 */
export function ChartMarca() {
  return (
    <div className="cm-marca" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG de marca estático, no imagen de contenido */}
      <img src="/rofoagro-logo-marca.svg" alt="" loading="lazy" decoding="async" />
    </div>
  );
}
