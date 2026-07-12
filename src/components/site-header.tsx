import Link from "next/link";
import { WheatMark } from "./icons";
import { RuedaClock } from "./rueda-clock";
import { RuedaStatus } from "./rueda-status";
import { ThemeToggle } from "./theme-toggle";
import { NavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="masthead">
      <div className="masthead-in">
        <Link href="/" className="brand" aria-label="RF AGRO — Inicio">
          <span className="mark">
            <WheatMark />
          </span>
          <span className="wordmark">
            <span className="rf">RF</span>
            <span className="agro">AGRO</span>
          </span>
          <span className="brand-sub">Pizarra electrónica · granos</span>
        </Link>

        <NavLinks />

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
