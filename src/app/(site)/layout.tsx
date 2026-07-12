import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RefreshOnFocus } from "@/components/refresh-on-focus";

/**
 * Layout compartido del sitio. Renderiza el andamiaje común (masthead, refresh
 * al volver a la pestaña, veta de fondo y pie) UNA sola vez; cada página solo
 * pone su propio `<main>`. Es un layout anidado (hay un root `app/layout.tsx`
 * con <html>/<body>), así que navegar entre secciones NO recarga la página.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RefreshOnFocus />
      <SiteHeader />
      {children}
      <div className="awn" aria-hidden="true" />
      <SiteFooter />
    </>
  );
}
