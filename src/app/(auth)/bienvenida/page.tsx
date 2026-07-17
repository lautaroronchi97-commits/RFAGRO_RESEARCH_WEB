import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RF AGRO · Research de granos",
  description: "Research de mercado de granos de Argentina para clientes de RF AGRO.",
};

/**
 * Landing pública mínima (decisión 7 del plan). Con `AUTH_ENFORCED` prendido, el
 * visitante sin sesión que llega a la raíz aterriza acá (lo redirige el proxy): marca
 * RF AGRO + una línea de qué es el servicio + botones Ingresar/Registrarse. SIN datos
 * de mercado. Con el flag apagado, `/` sigue siendo el tablero de siempre. La landing
 * institucional completa (con contenido comercial) es otra sesión del backlog.
 */
export default function BienvenidaPage() {
  return (
    <section className="landing-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/rfagro-isotipo.svg" alt="" className="landing-logo" width={159} height={88} />
      <span className="landing-badge">Research de mercado de granos · Argentina</span>
      <h1 className="landing-title">
        <span className="rf">RF</span>&nbsp;<span className="agro">AGRO</span>
      </h1>
      <p className="landing-tagline">Consultora de agronegocios</p>
      <p className="landing-lead">
        Arbitrajes y pizarra, dólar y tasas, estimaciones de producción y las noticias del
        agro — en un solo tablero, actualizado varias veces por día.
      </p>
      <div className="landing-cta">
        <Link href="/ingresar" className="auth-btn auth-btn-primary">
          Ingresar
        </Link>
        <Link href="/registro" className="auth-btn auth-btn-ghost">
          Registrarse
        </Link>
      </div>
      <p className="landing-foot">
        Acceso para clientes de RF AGRO. Al registrarte, tu cuenta queda pendiente de
        aprobación del equipo.
      </p>
    </section>
  );
}
