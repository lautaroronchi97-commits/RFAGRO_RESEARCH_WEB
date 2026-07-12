"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Destinos del sitio (una página por grupo). El Inicio se alcanza por el logo.
const NAV: { label: string; href: string }[] = [
  { label: "Granos", href: "/granos" },
  { label: "Dólar y tasas", href: "/dolar" },
  { label: "Comercio exterior", href: "/comercio" },
  { label: "Calculadoras", href: "/calculadoras" },
  { label: "Gráficos", href: "/graficos" },
  { label: "Producción", href: "/produccion" },
  { label: "Noticias", href: "/noticias" },
];

/**
 * Nav del masthead. Es client component: al vivir en el layout compartido, el
 * ítem activo se resuelve con `usePathname()` (los layouts no re-renderizan al
 * navegar). Marca `aria-current` en la sección propia, incluidas sus subpáginas
 * (p. ej. /calculadoras/a-fijar resalta "Calculadoras").
 */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Secciones">
      {NAV.map((n) => {
        const activo = pathname === n.href || pathname.startsWith(`${n.href}/`);
        return (
          <Link key={n.href} href={n.href} aria-current={activo ? "page" : undefined}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
