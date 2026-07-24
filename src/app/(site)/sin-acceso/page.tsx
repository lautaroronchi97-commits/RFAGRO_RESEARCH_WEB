import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sección no incluida · ROFO AGRO",
  robots: { index: false, follow: false },
};

/**
 * Pantalla amable cuando un usuario aprobado entra (por URL directa) a una sección
 * que su empresa/plan no tiene habilitada. No es un error: se explica y se ofrece
 * contacto. Vive en el route group (site), así conserva el masthead y el pie; el
 * gate por sección (requireSeccion) NO la toca porque no es una de las 7 secciones.
 */
export default function SinAccesoPage() {
  return (
    <main className="wrap">
      <div className="col">
        <section className="aviso-card">
          <h1 className="aviso-title">Esta sección no está incluida en tu plan</h1>
          <p className="aviso-sub">
            Tu cuenta está habilitada, pero esta sección no forma parte de las que tenés
            asignadas. Si necesitás acceso, escribinos y lo revisamos con gusto.
          </p>
          <div className="aviso-acciones">
            <Link href="/" className="auth-btn auth-btn-primary">
              Volver al inicio
            </Link>
            <a href="mailto:lautaroronchi97@gmail.com" className="auth-btn auth-btn-ghost">
              Pedir acceso
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
