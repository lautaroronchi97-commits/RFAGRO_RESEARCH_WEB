import type { Metadata } from "next";
import Link from "next/link";
import { DjvePanel } from "@/components/djve-panel";
import { requireSeccion } from "@/lib/auth/dal";
import { authConfigured } from "@/lib/auth/env";
import { getPerfil } from "@/lib/auth/dal";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Comercio exterior · RF AGRO",
  description: "Declaraciones juradas de venta al exterior (DJVE) de granos y subproductos.",
};

// Análisis de mesa (protegidos SIEMPRE, decisión 1 del plan de puertos): las tarjetas
// solo se muestran a admins; las páginas están gateadas con requireAdmin igual.
const ANALISIS = [
  { href: "/comercio/puertos", nombre: "Puertos · Line-up", desc: "Foto del line-up de buques: exportaciones por producto, zona y empresa." },
  { href: "/comercio/empresas", nombre: "Empresas exportadoras", desc: "Cobertura DJVE vs line-up por empresa: quién está corto, avance de campaña y ritmo." },
  { href: "/comercio/senal", nombre: "Señal física → precio", desc: "Semáforo que cruza la demanda física de exportación con la capacidad de pago." },
];

export default async function ComercioPage() {
  await requireSeccion("comercio");
  // Guardado por authConfigured: sin auth configurada no lee cookies → la página sigue estática.
  const perfil = authConfigured() ? await getPerfil() : null;
  const esAdmin = perfil?.rol === "admin";

  return (
    <>
      <h1 className="sr">RF AGRO — Comercio exterior</h1>
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Comercio exterior</h2>

          {esAdmin && (
            <nav className="hub-grid" aria-label="Análisis de mesa" style={{ marginBottom: 18 }}>
              {ANALISIS.map((a) => (
                <Link key={a.href} href={a.href} className="hub-card">
                  <span className="hub-card-name">{a.nombre}</span>
                  <span className="hub-card-desc">{a.desc}</span>
                  <span className="hub-card-go" aria-hidden="true">→</span>
                </Link>
              ))}
            </nav>
          )}

          <DjvePanel />
        </div>
      </main>
    </>
  );
}
