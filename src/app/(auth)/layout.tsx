import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Layout de las pantallas de autenticación (ingresar/registro/pendiente/recuperar/
 * completar). Sin masthead ni nav: una tarjeta centrada con la marca RF AGRO y la
 * atmósfera de fondo del design system. Es un route group aparte de `(site)`.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-topbar">
        <Link href="/" className="brand" aria-label="RF AGRO — Inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rfagro-isotipo.svg" alt="" className="brand-iso" width={58} height={32} />
          <span className="wordmark">
            <span className="rf">RF</span>
            <span className="agro">AGRO</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>
      <main className="auth-main">{children}</main>
      <div className="awn" aria-hidden="true" />
    </div>
  );
}
