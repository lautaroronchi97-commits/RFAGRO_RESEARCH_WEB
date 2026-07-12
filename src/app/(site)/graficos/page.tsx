import type { Metadata } from "next";
import { getCatalogo } from "@/lib/series";
import { GraficosClient } from "@/components/graficos-client";
import { QueEsEsto } from "@/components/que-es-esto";

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
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Gráficos de spreads entre cosechas</h2>
          <QueEsEsto
            paraQue="Compara cómo se movió el spread entre dos posiciones a lo largo de las campañas, superponiendo los años para ver si el precio de hoy está caro o barato frente a su propia historia."
            comoSeCalcula="Alinea cada campaña por el vencimiento y grafica el spread (o la relación) entre las dos posiciones elegidas. La banda muestra el mínimo, el máximo y la mediana históricos, y el percentil ubica el valor de hoy dentro de esa historia."
          />
          {catalogo.length === 0 ? (
            <p className="gx-empty">No se pudieron cargar las series. Reintentá en un momento.</p>
          ) : (
            <GraficosClient catalogo={catalogo} />
          )}
        </div>
      </main>
    </>
  );
}
