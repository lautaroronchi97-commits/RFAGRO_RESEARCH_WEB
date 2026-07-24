import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { MesaEmbarquePanel } from "@/components/lineup/embarques-panel";

/**
 * Comercio exterior · Mesa de embarque (análisis de mesa). Protegido SIEMPRE con
 * requireAdmin (patrón /admin, decisión 1 del plan de puertos). El programa de
 * embarques declarado (DJVE) por mes × producto, leído en idioma A3.
 */
export const metadata: Metadata = {
  title: "Mesa de embarque · Comercio exterior · ROFO AGRO",
  description: "Programa de embarques declarado (DJVE) por mes y producto, cruzado con el line-up y la curva A3.",
  robots: { index: false, follow: false },
};

export default async function EmbarquesPage() {
  await requireAdmin();
  return (
    <>
      <h1 className="sr">ROFO AGRO — Mesa de embarque</h1>
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Comercio exterior · Mesa de embarque</h2>
          <MesaEmbarquePanel />
        </div>
      </main>
    </>
  );
}
