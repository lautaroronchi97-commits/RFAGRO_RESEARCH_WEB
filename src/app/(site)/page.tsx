import Link from "next/link";
import { getCintaData } from "@/lib/market";
import { getNoticias } from "@/lib/noticias";
import { Cinta } from "@/components/cinta";
import { MercadoHoy } from "@/components/mercado-hoy";
import { InformesPanel } from "@/components/informes-panel";
import { EstimacionesMini } from "@/components/estimaciones-mini";
import { AUTH_ENFORCED } from "@/lib/auth/config";
import { getAcceso } from "@/lib/auth/dal";

// Revalida la cinta, los titulares y "el mercado hoy" cada 60s (caché corto).
export const revalidate = 60;

// Tarjetas del tablero: una por sección (con su clave), con "para qué sirve".
const SECCIONES: { key: string; href: string; nombre: string; desc: string }[] = [
  { key: "granos", href: "/granos", nombre: "Granos", desc: "Arbitrajes, pases, capacidad de pago y la mejor salida para hacer caja." },
  { key: "dolar", href: "/dolar", nombre: "Dólar y tasas", desc: "Dólar futuro, linked, tasas implícitas y el panel cambiario." },
  { key: "comercio", href: "/comercio", nombre: "Comercio exterior", desc: "Declaraciones de venta al exterior de granos y subproductos." },
  { key: "calculadoras", href: "/calculadoras", nombre: "Calculadoras", desc: "Cotizadores para operar: a fijar, pases, carry, costos y más." },
  { key: "graficos", href: "/graficos", nombre: "Gráficos", desc: "Spreads entre cosechas, con las campañas superpuestas." },
  { key: "produccion", href: "/produccion", nombre: "Producción", desc: "Calendario de informes y estimaciones por país y grano." },
  { key: "noticias", href: "/noticias", nombre: "Noticias", desc: "El portal del agro: granos, dólar, clima y exportaciones." },
];

export default async function Home() {
  const cinta = await getCintaData();
  const noticias = await getNoticias();
  const titulares = noticias.destacados.slice(0, 8);
  const [destacado, ...resto] = titulares;

  // Con el login prendido la home filtra por permisos: la grilla del tablero
  // muestra solo las secciones permitidas (los admin ven las 7), y los bloques
  // de datos aparecen solo si el usuario tiene la sección de origen. Con el flag
  // apagado (producción hoy) se muestra todo y no se lee la sesión.
  let secciones = SECCIONES;
  let puedeGranos = true;
  let puedeProduccion = true;
  if (AUTH_ENFORCED) {
    const acceso = await getAcceso();
    if (acceso && !acceso.esAdmin) {
      secciones = SECCIONES.filter((s) => acceso.visibles.includes(s.key));
      puedeGranos = acceso.visibles.includes("granos");
      puedeProduccion = acceso.visibles.includes("produccion");
    }
  }

  return (
    <>
      <h1 className="sr">RF AGRO — Pizarra electrónica de granos</h1>
      <Cinta data={cinta} />
      <main className="wrap">
        <div className="col">
          {destacado && (
            <section className="hub-hoy" aria-label="Novedades del día">
              <div className="hub-hoy-hd">
                <h2 className="sec-title">Novedades del día</h2>
                <Link href="/noticias" className="hub-hoy-more">
                  Ver todas →
                </Link>
              </div>

              <a className="ht-feature" href={destacado.link} target="_blank" rel="noopener noreferrer">
                <span className="ht-feature-titulo">{destacado.titulo}</span>
                <span className="ht-feature-meta">
                  <span className="ht-fuente">{destacado.fuente}</span>
                  {destacado.nMedios > 1 && (
                    <span className="ht-medios">{destacado.nMedios} medios</span>
                  )}
                </span>
              </a>

              {resto.length > 0 && (
                <ul className="hub-titulares">
                  {resto.map((t) => (
                    <li key={t.link}>
                      <a href={t.link} target="_blank" rel="noopener noreferrer">
                        <span className="ht-titulo">{t.titulo}</span>
                        <span className="ht-fuente">{t.fuente}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="home-panels">
            {puedeGranos && <MercadoHoy />}
            {puedeProduccion && <InformesPanel />}
            {puedeProduccion && <EstimacionesMini />}
          </div>

          <h2 className="sec-title">Explorá el sitio</h2>
          <nav className="hub-grid hub-grid--compact" aria-label="Secciones del sitio">
            {secciones.map((s) => (
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
