"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

/**
 * Nav del masthead. Es client component: al vivir en el layout compartido, el
 * ítem activo se resuelve con `usePathname()` (los layouts no re-renderizan al
 * navegar, así que no se puede pasar por prop). Solo las secciones con página
 * propia (`key`) marcan `aria-current`; los anchors a la home no.
 */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Secciones">
      {NAV.map((n) => (
        <Link
          key={n.label}
          href={n.href}
          aria-disabled={n.disabled ? "true" : undefined}
          aria-current={n.key && pathname === n.href ? "page" : undefined}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
