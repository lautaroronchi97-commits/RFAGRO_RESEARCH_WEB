import { fetchSerie, type Unit } from "@/lib/series";

/**
 * GET /api/series?ids=<a,b,…>&from=YYYY-MM-DD&to=YYYY-MM-DD&unit=usd|ars
 *
 * Devuelve las series crudas (columnar) de cada serieId pedido. Un request
 * PostgREST por símbolo (data cache de Next compartida entre usuarios/combos) +
 * `s-maxage` para la CDN de Vercel. Las fórmulas se calculan en el cliente.
 */

const MAX_SERIES = 24; // cap por request (el panel típico usa ≤16)

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const from = validISO(url.searchParams.get("from")) ?? "2020-01-01";
  const to = validISO(url.searchParams.get("to")) ?? "2100-01-01";
  const unit: Unit = url.searchParams.get("unit") === "ars" ? "ars" : "usd";

  if (ids.length === 0) {
    return Response.json({ error: "faltan ids" }, { status: 400 });
  }
  if (ids.length > MAX_SERIES) {
    return Response.json({ error: `demasiadas series (máx ${MAX_SERIES})` }, { status: 400 });
  }

  const series = (await Promise.all(ids.map((id) => fetchSerie(id, from, to, unit)))).filter(
    (s) => s !== null,
  );

  return Response.json(
    { series },
    { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}

/** Acepta solo YYYY-MM-DD (evita inyectar operadores en el filtro PostgREST). */
function validISO(s: string | null): string | null {
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
