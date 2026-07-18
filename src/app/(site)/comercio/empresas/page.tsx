import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { EmpresasPanel } from "@/components/lineup/empresas-panel";

/**
 * Comercio exterior · Empresas exportadoras (análisis de mesa). Protegido SIEMPRE
 * con requireAdmin (patrón /admin, decisión 1 del plan de puertos): solo Lautaro y
 * Mauro. Cruza DJVE (declarado) con line-up (originado) por exportador.
 */
export const metadata: Metadata = {
  title: "Empresas exportadoras · Comercio exterior · RF AGRO",
  description: "Cobertura de las empresas exportadoras: DJVE declarada vs line-up originado, avance de campaña y ritmo.",
  robots: { index: false, follow: false },
};

export default async function EmpresasPage() {
  await requireAdmin();
  return (
    <>
      <h1 className="sr">RF AGRO — Empresas exportadoras</h1>
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Comercio exterior · Empresas</h2>
          <EmpresasPanel />
        </div>
      </main>
    </>
  );
}
