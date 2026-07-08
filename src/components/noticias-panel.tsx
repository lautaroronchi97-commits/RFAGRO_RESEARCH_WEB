import { getNoticias, type NoticiaItem } from "@/lib/noticias";
import { Panel, PanelHead } from "./panel";
import { SourceStamp } from "./source-stamp";

function IconNews() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3h8v10H3z" />
      <path d="M11 6h2v6a1 1 0 0 1-1 1H3" />
      <path d="M5 5.5h4M5 8h4M5 10.5h2.5" />
    </svg>
  );
}

function Lista({ items }: { items: NoticiaItem[] }) {
  return (
    <ul className="news-list">
      {items.map((n, i) => (
        <li key={`${n.link}-${i}`} className="news-item">
          <a href={n.link} target="_blank" rel="noopener noreferrer" className="news-title">{n.titulo}</a>
          <span className="news-src">{n.fuente}</span>
        </li>
      ))}
    </ul>
  );
}

export async function NoticiasPanel() {
  const data = await getNoticias();
  const vacio = data.categorias.length === 0 && data.feeds.length === 0;

  return (
    <Panel id="noticias">
      <PanelHead
        glyph={<IconNews />}
        title="Noticias del día"
        sub="Agro y economía · resumen BCR + medios"
        stamp={<SourceStamp meta={data.meta} />}
      />
      <div className="news-wrap">
        {data.categorias.map((c) => (
          <div key={c.categoria} className="news-cat">
            <div className="news-cat-h">{c.categoria}</div>
            <Lista items={c.items} />
          </div>
        ))}
        {data.feeds.length > 0 && (
          <div className="news-cat">
            <div className="news-cat-h">Más del sector</div>
            {data.feeds.map((f) => (
              <Lista key={f.fuente} items={f.items} />
            ))}
          </div>
        )}
        {vacio && <p className="news-empty">Sin noticias disponibles ahora.</p>}
      </div>
      <div className="panel-note">
        <span>
          <span className="k">Fuentes</span> Resumen de diarios de BCR (con link a la fuente original) + RSS de
          InfoCampo, Bichos de Campo y Ámbito. Se muestran titulares con link a cada medio, no el contenido.
          Directorio completo en <code>docs/FUENTES.md</code>.
        </span>
      </div>
    </Panel>
  );
}
