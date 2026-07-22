import { getCierresGranos } from "@/lib/futuros";
import { getArbitrajes } from "@/lib/arbitrajes-cierres";
import { getPizarra } from "@/lib/pizarra";
import { getDolarFuturo } from "@/lib/market";
import { getMonitorMercados } from "@/lib/monitor-mercados";
import { getNoticias } from "@/lib/noticias";
import { getEventos } from "@/lib/calendario";
import { hoyCordobaISO } from "@/lib/dates";
import { sbSelect } from "@/lib/supabase";
import { tokenValido, esFechaValida } from "@/lib/informe-auth";

/**
 * GET /api/informes/datos?fecha=YYYY-MM-DD — auth: header `Authorization: Bearer
 * <INFORME_TOKEN>` (mismo token y patrón timing-safe que /api/views/insumos de MP3).
 *
 * JSON con TODOS los insumos del informe diario (MP1 de docs/PLAN_INFORMES.md):
 * granos (ajustes A3 con Δ vs rueda anterior + pizarra CAC $/USD), dólar mayorista +
 * curva DDF, Chicago + macro, noticias del día, agenda de informes de hoy/mañana y el
 * "color de la rueda" que Lautaro carga en /admin/datos. Todo reusando las libs
 * existentes — cero lógica nueva de cálculo acá. Nunca se cachea.
 */

export async function GET(request: Request): Promise<Response> {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const esperado = process.env.INFORME_TOKEN ?? "";
  const noCache = { "cache-control": "private, no-store" };
  if (!tokenValido(token, esperado)) {
    return Response.json({ error: "No autorizado." }, { status: 401, headers: noCache });
  }

  const hoy = hoyCordobaISO();
  const { searchParams } = new URL(request.url);
  const fechaParam = searchParams.get("fecha") ?? "";
  const fecha = esFechaValida(fechaParam) ? fechaParam : hoy;

  const manana = new Date(new Date(`${fecha}T12:00:00Z`).getTime() + 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [cierres, arbitrajes, pizarra, dolarFuturo, chicago, noticias, colorRes] = await Promise.all([
    getCierresGranos(),
    getArbitrajes(),
    getPizarra(),
    getDolarFuturo(),
    getMonitorMercados(),
    getNoticias(),
    sbSelect(`mesa_color?fecha=eq.${fecha}&select=fecha,texto,actualizado`, 0),
  ]);

  // Color de la rueda: null si no cargó nada ese día (el informe sale igual, degrada).
  const color = colorRes.ok && Array.isArray(colorRes.data) && colorRes.data.length > 0
    ? (colorRes.data[0] as { fecha: string; texto: string; actualizado: string })
    : null;

  // Noticias: solo lo citable del día, acotado (top 4 destacadas).
  const noticiasCompactas = {
    destacados: noticias.destacados.slice(0, 4),
    meta: noticias.meta,
  };

  return Response.json(
    {
      generado: new Date().toISOString(),
      fecha,
      cierres,
      arbitrajes,
      pizarra,
      dolarFuturo,
      chicago,
      noticias: noticiasCompactas,
      agenda: getEventos(fecha, manana),
      color,
    },
    { headers: noCache },
  );
}
