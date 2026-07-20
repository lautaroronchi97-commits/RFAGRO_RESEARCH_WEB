"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; badge?: boolean }[] = [
  { href: "/admin", label: "Pendientes", badge: true },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/empresas", label: "Empresas" },
  { href: "/admin/actividad", label: "Actividad" },
  { href: "/admin/datos", label: "Datos" },
];

/**
 * Nav por pestañas del panel. Client component (el layout no re-renderiza al
 * navegar): el ítem activo se resuelve con usePathname. El badge muestra el conteo
 * de registros pendientes en la pestaña Pendientes.
 */
export function AdminTabs({ pendientes }: { pendientes: number }) {
  const pathname = usePathname();

  return (
    <nav className="admin-tabs" aria-label="Secciones del panel">
      {TABS.map((t) => {
        const activo = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={activo ? "page" : undefined}>
            {t.label}
            {t.badge && pendientes > 0 && <span className="admin-badge">{pendientes}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
