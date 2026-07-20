import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { NegociadoPanel } from "@/components/compras/negociado-panel";

/**
 * Comercio exterior · Negociado por producto (volumen de comercialización SIO Granos).
 * Protegido SIEMPRE con requireAdmin (patrón /admin, decisión 1 del plan de puertos):
 * análisis de mesa. Cierra los ítems 8 y 9 del backlog (total negociado por producto +
 * histograma + % sobre cosecha + SIO Granos semanal/mensual).
 */
export const metadata: Metadata = {
  title: "Negociado por producto · Comercio exterior · RF AGRO",
  description: "Volumen negociado por producto (SIO Granos): compras semanales, % sobre cosecha, % priceado e histograma.",
  robots: { index: false, follow: false },
};

export default async function NegociadoPage() {
  await requireAdmin();
  return (
    <>
      <h1 className="sr">RF AGRO — Negociado por producto</h1>
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Comercio exterior · Negociado por producto</h2>
          <NegociadoPanel />
        </div>
      </main>
    </>
  );
}
