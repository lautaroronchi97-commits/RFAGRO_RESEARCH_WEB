import type { Metadata } from "next";
import { getCatalogo } from "@/lib/series";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RefreshOnFocus } from "@/components/refresh-on-focus";
import { GraficosClient } from "@/components/graficos-client";

/**
 * Página del panel de gráficos de spreads entre cosechas. Shell estática (no
 * toca la home ISR): trae el catálogo de series server-side (cache 1h) y lo pasa
 * a la isla client, que arma las combinaciones y trae los puntos por /api/series.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Gráficos de spreads · RF AGRO",
  description: "Comparador histórico de spreads entre cosechas: A3, Chicago y pizarra, campañas superpuestas.",
};

export default async function GraficosPage() {
  const catalogo = await getCatalogo();

  return (
    <>
      <h1 className="sr">RF AGRO — Gráficos de spreads entre cosechas</h1>
      <RefreshOnFocus />
      <SiteHeader />
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Gráficos de spreads entre cosechas</h2>
          {catalogo.length === 0 ? (
            <p className="gx-empty">Sin catálogo de series (Supabase no respondió). Reintentá en un momento.</p>
          ) : (
            <GraficosClient catalogo={catalogo} />
          )}
        </div>
      </main>
      <div className="awn" aria-hidden="true" />
      <SiteFooter />
    </>
  );
}
