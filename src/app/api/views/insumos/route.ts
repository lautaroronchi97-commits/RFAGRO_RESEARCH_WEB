import { getTemperatura } from "@/lib/lineup/temperatura";
import { getSemaforo } from "@/lib/lineup/semaforo";
import { getEmpresas } from "@/lib/lineup/empresas";
import { getMesaEmbarque } from "@/lib/lineup/embarque";
import { getNegociado } from "@/lib/compras/negociado";
import { getCurvaGranos } from "@/lib/curva";
import { getPases } from "@/lib/pases-cierres";
import { getArbitrajes } from "@/lib/arbitrajes-cierres";
import { getCapacidad } from "@/lib/capacidad";
import { getPizarra } from "@/lib/pizarra";
import { getMonitorMercados } from "@/lib/monitor-mercados";
import { getNoticias } from "@/lib/noticias";
import { getDolarFuturo } from "@/lib/market";
import { getEventos } from "@/lib/calendario";
import { hoyCordobaISO } from "@/lib/dates";
import { sbSelectAll } from "@/lib/supabase";
import { parseRows, construirPizarra, construirCambios, organismosPresentes } from "@/lib/estimaciones";

/**
 * GET /api/views/insumos?token=<INFORME_TOKEN>
 *
 * JSON con TODOS los insumos del view de mercado semanal (MP3 de docs/PLAN_INFORMES.md):
 * lo que la web ya computa, en un solo lugar, para que la sesión de research
 * (skill `view-mercado`) cite números exactos sin duplicar lógica ni scrapear
 * páginas gateadas. Misma idea que el /api/informes/datos de MP1.
 *
 * Gate por token de env (INFORME_TOKEN): sin token válido → 401. Si la env no está
 * configurada, la ruta queda cerrada (401 siempre). Nunca se cachea.
 */

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const esperado = process.env.INFORME_TOKEN ?? "";
  const noCache = { "cache-control": "private, no-store" };
  if (!esperado || token !== esperado) {
    return Response.json({ error: "No autorizado." }, { status: 401, headers: noCache });
  }

  const hoy = hoyCordobaISO();
  const en14 = new Date(new Date(`${hoy}T12:00:00Z`).getTime() + 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [
    temperatura,
    semaforo,
    empresas,
    embarques,
    negociado,
    curva,
    pases,
    arbitrajes,
    capacidad,
    pizarra,
    chicago,
    dolarFuturo,
    noticias,
    estimRes,
  ] = await Promise.all([
    getTemperatura(),
    getSemaforo(),
    getEmpresas(),
    getMesaEmbarque(),
    getNegociado(),
    getCurvaGranos(),
    getPases(),
    getArbitrajes(),
    getCapacidad(),
    getPizarra(),
    getMonitorMercados(),
    getDolarFuturo(),
    getNoticias(),
    sbSelectAll(
      "estimaciones_produccion?select=organismo,pais,grano,campania,variable,valor,unidad,fecha_publicacion,informe,url&order=fecha_publicacion.asc",
      3600,
    ),
  ]);

  // Estimaciones: pizarra compacta (última por organismo/país/grano + Δ) + cambios del
  // último informe de cada organismo — no los miles de vintages crudos.
  const estimRows = estimRes.ok ? parseRows(estimRes.data) : [];
  const estimaciones = {
    pizarra: construirPizarra(estimRows),
    cambios: organismosPresentes(estimRows).map((o) => construirCambios(estimRows, o)),
  };

  // Noticias: solo lo citable (titular + fuente + categoría), acotado.
  const noticiasCompactas = {
    destacados: noticias.destacados.slice(0, 10),
    categorias: noticias.categorias.map((c) => ({ ...c, items: c.items.slice(0, 6) })),
    meta: noticias.meta,
  };

  return Response.json(
    {
      generado: new Date().toISOString(),
      fecha: hoy,
      temperatura,
      semaforo,
      empresas,
      embarques,
      negociado,
      estimaciones,
      curva,
      pases,
      arbitrajes,
      capacidad,
      pizarra,
      chicago,
      dolarFuturo,
      noticias: noticiasCompactas,
      agenda: getEventos(hoy, en14),
    },
    { headers: noCache },
  );
}
