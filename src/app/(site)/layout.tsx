import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RefreshOnFocus } from "@/components/refresh-on-focus";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SeccionBeacon } from "@/components/seccion-beacon";
import { Watermark } from "@/components/watermark";
import { AUTH_ENFORCED } from "@/lib/auth/config";
import { requireAprobado, getAcceso } from "@/lib/auth/dal";

/**
 * Layout compartido del sitio. Renderiza el andamiaje común (masthead, refresh
 * al volver a la pestaña, veta de fondo y pie) UNA sola vez; cada página solo
 * pone su propio `<main>`. Es un layout anidado (hay un root `app/layout.tsx`
 * con <html>/<body>), así que navegar entre secciones NO recarga la página.
 *
 * Gate de auth (defensa en profundidad además del proxy): SOLO cuando AUTH_ENFORCED
 * está prendido exige un usuario aprobado (chequeo seguro contra la base) y calcula
 * las secciones visibles para filtrar la nav. El enforcement autoritativo POR sección
 * vive en cada página (requireSeccion), porque los layouts no re-renderizan al navegar.
 * Con el flag apagado NO se lee la sesión, así estas páginas siguen siendo estáticas/ISR.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  let visibles: string[] | undefined;
  let esAdmin = false;
  let email: string | null = null;

  if (AUTH_ENFORCED) {
    const perfil = await requireAprobado();
    email = perfil.email;
    const acceso = await getAcceso();
    visibles = acceso?.visibles;
    esAdmin = acceso?.esAdmin ?? false;
  }

  return (
    <>
      <RefreshOnFocus />
      <SiteHeader visibles={visibles} esAdmin={esAdmin} />
      <Breadcrumbs />
      {children}
      <div className="awn" aria-hidden="true" />
      <SiteFooter />
      {/* Marca de agua sutil con el email del usuario: solo con login activo. */}
      {AUTH_ENFORCED && email && <Watermark email={email} />}
      {/* Registro de visita por sección: solo con login activo (beacon liviano). */}
      {AUTH_ENFORCED && <SeccionBeacon />}
    </>
  );
}
