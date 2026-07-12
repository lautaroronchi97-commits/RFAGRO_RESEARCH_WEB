import Link from "next/link";
import { WheatMark } from "./icons";
import { RuedaClock } from "./rueda-clock";
import { RuedaStatus } from "./rueda-status";
import { ThemeToggle } from "./theme-toggle";

// Los anchors llevan "/" adelante para navegar también desde /produccion y /graficos.
const NAV: { label: string; href: string; key?: string; disabled?: boolean }[] = [
  { label: "Noticias", href: "/#noticias" },
  { label: "Arbitrajes", href: "/#arbitrajes" },
  { label: "Gráficos", href: "/graficos", key: "graficos" },
  { label: "Producción", href: "/produccion", key: "produccion" },
  { label: "Pases", href: "/#pases" },
  { label: "Dólar futuro", href: "/#dolar-futuro" },
  { label: "Dólar linked", href: "/#dolar-linked" },
  { label: "Implícitas", href: "/#implicitas" },
  { label: "Cambiario", href: "/#cambiario" },
];

export function SiteHeader({ active }: { active?: string }) {
  return (
    <header className="masthead">
      <div className="masthead-in">
        <div className="brand">
          <span className="mark">
            <WheatMark />
          </span>
          <span className="wordmark">
            <span className="rf">RF</span>
            <span className="agro">AGRO</span>
          </span>
          <span className="brand-sub">Pizarra electrónica · granos</span>
        </div>

        <nav className="nav" aria-label="Secciones">
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              aria-disabled={n.disabled ? "true" : undefined}
              aria-current={n.key && n.key === active ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="head-tools">
          <span className="rueda">
            <span className="dot-live" aria-hidden="true" />
            Rueda&nbsp;·&nbsp;<RuedaClock />&nbsp;ART
          </span>
          <RuedaStatus />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
