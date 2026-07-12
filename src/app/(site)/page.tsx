import Link from "next/link";
import { getCintaData } from "@/lib/market";
import { getNoticias } from "@/lib/noticias";
import { Cinta } from "@/components/cinta";

// Revalida la cinta y los titulares cada 60s (caché corto).
export const revalidate = 60;

// Tarjetas del tablero: una por sección, con "para qué sirve" en una línea.
const SECCIONES: { href: string; nombre: string; desc: string }[] = [
  { href: "/granos", nombre: "Granos", desc: "Arbitrajes, pases, capacidad de pago y la mejor salida para hacer caja." },
  { href: "/dolar", nombre: "Dólar y tasas", desc: "Dólar futuro, linked, tasas implícitas y el panel cambiario." },
  { href: "/comercio", nombre: "Comercio exterior", desc: "Declaraciones de venta al exterior de granos y subproductos." },
  { href: "/calculadoras", nombre: "Calculadoras", desc: "Cotizadores para operar: a fijar, pases, carry, costos y más." },
  { href: "/graficos", nombre: "Gráficos", desc: "Spreads entre cosechas, con las campañas superpuestas." },
  { href: "/produccion", nombre: "Producción", desc: "Calendario de informes y estimaciones por país y grano." },
  { href: "/noticias", nombre: "Noticias", desc: "El portal del agro: granos, dólar, clima y exportaciones." },
];

export default async function Home() {
  const cinta = await getCintaData();
  const noticias = await getNoticias();
  const titulares = noticias.destacados.slice(0, 5);

  return (
    <>
      <h1 className="sr">RF AGRO — Pizarra electrónica de granos</h1>
      <Cinta data={cinta} />
      <main className="wrap">
        <div className="col">
          {titulares.length > 0 && (
            <section className="hub-hoy" aria-label="Lo importante hoy">
              <div className="hub-hoy-hd">
                <h2 className="sec-title">Lo importante hoy</h2>
                <Link href="/noticias" className="hub-hoy-more">
                  Ver todas →
                </Link>
              </div>
              <ul className="hub-titulares">
                {titulares.map((t) => (
                  <li key={t.link}>
                    <a href={t.link} target="_blank" rel="noopener noreferrer">
                      <span className="ht-titulo">{t.titulo}</span>
                      <span className="ht-fuente">{t.fuente}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <h2 className="sec-title">Secciones</h2>
          <nav className="hub-grid" aria-label="Secciones del sitio">
            {SECCIONES.map((s) => (
              <Link key={s.href} href={s.href} className="hub-card">
                <span className="hub-card-name">{s.nombre}</span>
                <span className="hub-card-desc">{s.desc}</span>
                <span className="hub-card-go" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </>
  );
}
