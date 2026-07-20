"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCalc } from "@/lib/calculadoras";

// Etiquetas legibles por sección (primer segmento de la ruta).
const LABELS: Record<string, string> = {
  granos: "Granos",
  dolar: "Dólar y tasas",
  comercio: "Comercio exterior",
  calculadoras: "Calculadoras",
  graficos: "Gráficos",
  produccion: "Producción",
  noticias: "Noticias",
};

// Subpáginas de Comercio exterior (análisis de mesa).
const COMERCIO_LABELS: Record<string, string> = {
  puertos: "Puertos · Line-up",
  empresas: "Empresas exportadoras",
  senal: "Señal física → precio",
  embarques: "Mesa de embarque",
  temperatura: "Calor de mercadería",
  negociado: "Negociado por producto",
};

function labelFor(segment: string, prev: string[]): string {
  // Subpágina de calculadoras → nombre de la calculadora.
  if (prev[prev.length - 1] === "calculadoras") return getCalc(segment)?.nombre ?? segment;
  if (prev[prev.length - 1] === "comercio") return COMERCIO_LABELS[segment] ?? segment;
  return LABELS[segment] ?? segment;
}

/**
 * Migas de pan (Inicio › Sección › Subpágina). Client component: usa
 * `usePathname()` (el layout no re-renderiza al navegar). No aparece en el
 * Inicio. El último tramo no es link (es la página actual).
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: labelFor(seg, segments.slice(0, i)),
    href: "/" + segments.slice(0, i + 1).join("/"),
    last: i === segments.length - 1,
  }));

  return (
    <nav className="crumbs" aria-label="Migas de pan">
      <Link href="/">Inicio</Link>
      {crumbs.map((c) => (
        <span key={c.href} className="crumb">
          <span className="sep" aria-hidden="true">
            ›
          </span>
          {c.last ? <span aria-current="page">{c.label}</span> : <Link href={c.href}>{c.label}</Link>}
        </span>
      ))}
    </nav>
  );
}
