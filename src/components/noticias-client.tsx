"use client";

import { useState } from "react";

/** Copia serializable de los tipos de src/lib/noticias.ts (patrón arbitrajes-editable). */
export type NoticiaItemC = { titulo: string; fuente: string; link: string; fechaMs: number | null };
export type NoticiaCatC = { id: string; nombre: string; items: NoticiaItemC[] };

/** Glifos por categoría (mismo trazo que los del resto de los paneles). */
function Glifo({ id }: { id: string }) {
  const p = { viewBox: "0 0 16 16", fill: "none" as const, stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  switch (id) {
    case "mercados": // línea de precios
      return (
        <svg {...p}>
          <path d="M2 13h12" />
          <path d="M2.5 10.5 6 6.5l2.5 2.5L13.5 3.5" />
          <path d="M10.5 3.5h3v3" />
        </svg>
      );
    case "economia": // banco
      return (
        <svg {...p}>
          <path d="M2 6.5 8 3l6 3.5" />
          <path d="M3.5 7v5M8 7v5M12.5 7v5" />
          <path d="M2 13.5h12" />
        </svg>
      );
    case "internacional": // globo
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M2.5 8h11M8 2.5c1.8 1.6 1.8 9.4 0 11-1.8-1.6-1.8-9.4 0-11Z" />
        </svg>
      );
    case "clima": // nube con lluvia
      return (
        <svg {...p}>
          <path d="M4.5 9.5a2.5 2.5 0 0 1-.3-5A3.5 3.5 0 0 1 11 5.6a2.4 2.4 0 0 1 .6 4.7" />
          <path d="M5.5 11.5v1.5M8 11v2M10.5 11.5v1.5" />
        </svg>
      );
    case "logistica": // buque
      return (
        <svg {...p}>
          <path d="M2.5 10h11l-1.5 3h-8Z" />
          <path d="M4.5 10V7h7v3M8 7V4.5h2" />
        </svg>
      );
    default: // empresas: edificio
      return (
        <svg {...p}>
          <path d="M4 13.5V3.5h5v10M9 6.5h3v7" />
          <path d="M5.7 5.7h1.6M5.7 8h1.6M5.7 10.3h1.6M2.5 13.5h11" />
        </svg>
      );
  }
}

function hace(ahora: number, fechaMs: number | null): string | null {
  if (!fechaMs) return null;
  const min = Math.max(0, Math.round((ahora - fechaMs) / 60000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export function NoticiasClient({ categorias, ahora }: { categorias: NoticiaCatC[]; ahora: number }) {
  const [sel, setSel] = useState("todas");
  const total = categorias.reduce((n, c) => n + c.items.length, 0);
  const visibles = sel === "todas" ? categorias : categorias.filter((c) => c.id === sel);

  return (
    <div className="news-body">
      <div className="news-filtros" role="toolbar" aria-label="Filtrar noticias por categoría">
        <button type="button" className="news-chip" aria-pressed={sel === "todas"} onClick={() => setSel("todas")}>
          Todas <span className="n">{total}</span>
        </button>
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            className="news-chip"
            aria-pressed={sel === c.id}
            onClick={() => setSel(sel === c.id ? "todas" : c.id)}
          >
            {c.nombre} <span className="n">{c.items.length}</span>
          </button>
        ))}
      </div>
      <div className="news-grid">
        {visibles.map((c) => (
          <section key={c.id} className={`news-cat${sel !== "todas" ? " full" : ""}`}>
            <header className="news-cat-hd">
              <span className="news-cat-glyph">
                <Glifo id={c.id} />
              </span>
              <h3 className="news-cat-name">{c.nombre}</h3>
              <span className="news-cat-n">{c.items.length}</span>
            </header>
            <ul className="news-list">
              {c.items.map((n) => {
                const t = hace(ahora, n.fechaMs);
                return (
                  <li key={n.link} className="news-item">
                    <a href={n.link} target="_blank" rel="noopener noreferrer" className="news-title">
                      {n.titulo}
                    </a>
                    <span className="news-meta">
                      <span className="news-src">{n.fuente}</span>
                      {t && <span className="news-time">· {t}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
