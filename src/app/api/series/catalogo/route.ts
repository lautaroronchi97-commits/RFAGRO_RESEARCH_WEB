import { getCatalogo } from "@/lib/series";

/**
 * GET /api/series/catalogo → catálogo completo de series graficables (vista
 * `series_catalogo`). La página `/graficos` ya lo recibe del server component,
 * pero se expone acá para uso client/debug. Cacheado 1h (CDN + data cache).
 */
export async function GET(): Promise<Response> {
  const catalogo = await getCatalogo();
  return Response.json(
    { catalogo },
    { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
