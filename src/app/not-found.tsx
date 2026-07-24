import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página no encontrada · ROFO AGRO",
  robots: { index: false, follow: false },
};

/**
 * 404 propio y branded (E3 H9): reemplaza el default de Next en inglés. Vive en la raíz,
 * así cubre cualquier ruta inexistente (fuera de los route groups). Usa las clases del
 * design system (`.brand`, `.aviso-card`), así hereda el tema claro/oscuro del root layout.
 */
export default function NotFound() {
  return (
    <main className="wrap" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div className="col" style={{ textAlign: "center" }}>
        <Link href="/" className="brand" aria-label="ROFO AGRO — Inicio" style={{ justifyContent: "center", marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rofoagro-isotipo.svg" alt="" className="brand-iso" width={58} height={32} />
          <span className="wordmark">
            <span className="rf">RF</span>
            <span className="agro">AGRO</span>
          </span>
        </Link>
        <section className="aviso-card">
          <h1 className="aviso-title">Página no encontrada</h1>
          <p className="aviso-sub">
            La dirección que buscás no existe o se movió. Volvé al tablero para seguir navegando el research.
          </p>
          <div className="aviso-acciones">
            <Link href="/" className="auth-btn auth-btn-primary">
              Volver al inicio
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
