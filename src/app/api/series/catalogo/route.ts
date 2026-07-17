import { getCatalogo } from "@/lib/series";
import { guardApiSeccion } from "@/lib/auth/dal";
import { AUTH_ENFORCED } from "@/lib/auth/config";

/**
 * GET /api/series/catalogo → catálogo completo de series graficables (vista
 * `series_catalogo`). La página `/graficos` ya lo recibe del server component,
 * pero se expone acá para uso client/debug. Cacheado 1h (CDN + data cache).
 *
 * Con `AUTH_ENFORCED` prendido exige sesión aprobada con permiso de "Gráficos" y no
 * se cachea; con el flag apagado queda igual que hoy (pública, cacheada 1h).
 */
export async function GET(): Promise<Response> {
  const bloqueo = await guardApiSeccion("graficos");
  if (bloqueo) return bloqueo;

  const catalogo = await getCatalogo();
  return Response.json(
    { catalogo },
    {
      headers: {
        "cache-control": AUTH_ENFORCED
          ? "private, no-store"
          : "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
