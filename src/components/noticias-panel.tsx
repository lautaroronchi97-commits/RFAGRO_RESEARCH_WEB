import { getNoticias } from "@/lib/noticias";
import { Panel, PanelHead } from "./panel";
import { SourceStamp } from "./source-stamp";
import { NoticiasClient } from "./noticias-client";

function IconNews() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3h8v10H3z" />
      <path d="M11 6h2v6a1 1 0 0 1-1 1H3" />
      <path d="M5 5.5h4M5 8h4M5 10.5h2.5" />
    </svg>
  );
}

export async function NoticiasPanel() {
  const data = await getNoticias();

  return (
    <Panel id="noticias">
      <PanelHead
        glyph={<IconNews />}
        title="Noticias"
        sub={`Portal del agro · ${data.nFuentes} fuentes · categorización propia`}
        stamp={<SourceStamp meta={data.meta} />}
      />
      {data.total > 0 ? (
        <NoticiasClient categorias={data.categorias} ahora={data.generadoMs} />
      ) : (
        <p className="news-empty">Sin noticias disponibles ahora.</p>
      )}
      <div className="panel-note">
        <span>
          <span className="k">Fuentes</span> Ingesta horaria (cron → Supabase) de BCR resumen de diarios, InfoCampo,
          Bichos de Campo, Ámbito, La Nación Campo, Clarín Rural, Agrositio, dataPORTUARIA, TodoAgro, Cebada
          Cervecera, Agrofy News, G1 Agronegócios y World-Grain. Titulares con link a cada medio (no se republica
          contenido). Categorías propias por reglas editables (<code>src/lib/noticias-reglas.json</code>); directorio
          completo en <code>docs/FUENTES.md</code>.
        </span>
      </div>
    </Panel>
  );
}
