"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECCIONES_META } from "@/lib/auth/config";

/**
 * Nav del masthead. Es client component: al vivir en el layout compartido, el
 * ítem activo se resuelve con `usePathname()` (los layouts no re-renderizan al
 * navegar). Marca `aria-current` en la sección propia, incluidas sus subpáginas
 * (p. ej. /calculadoras/a-fijar resalta "Calculadoras").
 *
 * `visibles` (Etapa 2): si viene, filtra los destinos a las secciones permitidas
 * del usuario (permisos por sección). Si es undefined —flag de login apagado— se
 * muestran los 7 (la web es pública igual que hoy). `esAdmin` agrega el link a /admin.
 */
export function NavLinks({ visibles, esAdmin }: { visibles?: string[]; esAdmin?: boolean }) {
  const pathname = usePathname();
  const items = visibles ? SECCIONES_META.filter((n) => visibles.includes(n.key)) : SECCIONES_META;

  return (
    <nav className="nav" aria-label="Secciones">
      {items.map((n) => {
        const activo = pathname === n.href || pathname.startsWith(`${n.href}/`);
        return (
          <Link key={n.href} href={n.href} aria-current={activo ? "page" : undefined}>
            {n.label}
          </Link>
        );
      })}
      {esAdmin && (
        <Link
          href="/admin"
          className="nav-admin"
          aria-current={pathname === "/admin" || pathname.startsWith("/admin/") ? "page" : undefined}
        >
          Admin
        </Link>
      )}
    </nav>
  );
}
