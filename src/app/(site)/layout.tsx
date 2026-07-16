import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RefreshOnFocus } from "@/components/refresh-on-focus";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AUTH_ENFORCED } from "@/lib/auth/config";
import { requireAprobado } from "@/lib/auth/dal";

/**
 * Layout compartido del sitio. Renderiza el andamiaje común (masthead, refresh
 * al volver a la pestaña, veta de fondo y pie) UNA sola vez; cada página solo
 * pone su propio `<main>`. Es un layout anidado (hay un root `app/layout.tsx`
 * con <html>/<body>), así que navegar entre secciones NO recarga la página.
 *
 * Gate de auth (defensa en profundidad además del proxy): SOLO cuando AUTH_ENFORCED
 * está prendido exige un usuario aprobado (chequeo seguro contra la base). Con el flag
 * apagado NO se lee la sesión, así estas páginas siguen siendo estáticas/ISR como hoy.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  if (AUTH_ENFORCED) {
    await requireAprobado();
  }

  return (
    <>
      <RefreshOnFocus />
      <SiteHeader />
      <Breadcrumbs />
      {children}
      <div className="awn" aria-hidden="true" />
      <SiteFooter />
    </>
  );
}
