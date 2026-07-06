import { WheatMark } from "./icons";
import { RuedaClock } from "./rueda-clock";
import { ThemeToggle } from "./theme-toggle";

const NAV: { label: string; href: string; active?: boolean; disabled?: boolean }[] = [
  { label: "Arbitrajes", href: "#arbitrajes", active: true },
  { label: "Dólar futuro", href: "#dolar-futuro" },
  { label: "Dólar linked", href: "#dolar-linked" },
  { label: "Cambiario", href: "#cambiario" },
  { label: "Pases", href: "#", disabled: true },
  { label: "Implícitas", href: "#", disabled: true },
  { label: "Sintéticos", href: "#", disabled: true },
];

export function SiteHeader() {
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
            <a
              key={n.label}
              href={n.href}
              aria-current={n.active ? "page" : undefined}
              aria-disabled={n.disabled ? "true" : undefined}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="head-tools">
          <span className="rueda">
            <span className="dot-live" aria-hidden="true" />
            Rueda&nbsp;·&nbsp;<RuedaClock />&nbsp;ART
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
