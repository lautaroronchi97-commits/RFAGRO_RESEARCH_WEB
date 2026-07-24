import Link from "next/link";
import { RuedaClock } from "./rueda-clock";
import { RuedaStatus } from "./rueda-status";
import { ThemeToggle } from "./theme-toggle";
import { NavLinks } from "./nav-links";
import { AuthMenuLazy } from "./auth-menu-lazy";
import { AUTH_ENFORCED } from "@/lib/auth/config";

/**
 * Masthead del sitio. `visibles`/`esAdmin` (Etapa 2) solo llegan cuando el login
 * está prendido: el layout los calcula y la nav filtra las secciones permitidas +
 * muestra el link a Admin. Con el flag apagado llegan undefined → nav completa (la
 * web queda igual que hoy, sin render dinámico).
 */
export function SiteHeader({ visibles, esAdmin }: { visibles?: string[]; esAdmin?: boolean }) {
  return (
    <header className="masthead">
      <div className="masthead-in">
        <Link href="/" className="brand" aria-label="ROFO AGRO — Inicio">
          {/* Isotipo real (3 símbolos: trigo, trigo y gota de soja). El wordmark va como
              texto para que siga el color del tema (claro/oscuro). eslint-disable: es un
              SVG estático cacheado desde /public, no una imagen de contenido para <Image>. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rofoagro-isotipo.svg" alt="" className="brand-iso" width={58} height={32} />
          <span className="wordmark">
            <span className="rf">ROFO</span>
            <span className="agro">AGRO</span>
          </span>
          <span className="brand-sub">Pizarra electrónica · granos</span>
        </Link>

        <NavLinks visibles={visibles} esAdmin={esAdmin} />

        <div className="head-tools">
          <span className="rueda">
            <span className="dot-live" aria-hidden="true" />
            Rueda&nbsp;·&nbsp;<RuedaClock />&nbsp;ART
          </span>
          <RuedaStatus />
          <ThemeToggle />
          {/* Menú de sesión solo cuando el login está activo; con el flag apagado el
              header queda idéntico a hoy. Carga diferida client-only (ver auth-menu-lazy.tsx)
              para no mandar el SDK de Supabase al bundle de páginas públicas sin login. */}
          {AUTH_ENFORCED && <AuthMenuLazy />}
        </div>
      </div>
    </header>
  );
}
