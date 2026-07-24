import Link from "next/link";
import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminTabs } from "./admin-tabs";
import { requireAdmin } from "@/lib/auth/dal";
import { contarPendientes } from "@/lib/auth/admin";
import { contarBorradoresInterp } from "@/lib/interpretaciones";
import { cerrarSesion } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Administración · ROFO AGRO",
  robots: { index: false, follow: false },
};

// El panel se renderiza SIEMPRE por request (lee la sesión del admin): nunca debe
// quedar cacheado como estático. Garantiza el comportamiento correcto en cualquier
// entorno, aun si en el build no hay credenciales.
export const dynamic = "force-dynamic";

/**
 * Layout del panel de administración. SIEMPRE protegido (independiente de
 * AUTH_ENFORCED): requireAdmin redirige a /ingresar si no hay sesión y a la home si
 * el usuario no es admin. Es su propio route (usa el root layout, no el del sitio),
 * así el panel no arrastra el masthead público.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [pendientes, borradoresInterp] = await Promise.all([contarPendientes(), contarBorradoresInterp()]);

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <Link href="/" className="brand" aria-label="ROFO AGRO — Inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rofoagro-isotipo.svg" alt="" className="brand-iso" width={58} height={32} />
          <span className="wordmark">
            <span className="rf">ROFO</span>
            <span className="agro">AGRO</span>
          </span>
          <span className="brand-sub">Administración</span>
        </Link>
        <div className="admin-top-tools">
          <span className="admin-quien" title={admin.email}>{admin.email}</span>
          <ThemeToggle />
          <form action={cerrarSesion}>
            <button type="submit" className="auth-menu-out">Salir</button>
          </form>
        </div>
      </header>

      <AdminTabs pendientes={pendientes} borradoresInterp={borradoresInterp} />

      <main className="admin-main">{children}</main>
    </div>
  );
}
