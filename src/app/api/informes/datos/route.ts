import { getCierresGranos, volumenTotalGrano } from "@/lib/futuros";
import { getArbitrajes } from "@/lib/arbitrajes-cierres";
import { getPizarra } from "@/lib/pizarra";
import { getDolarFuturo } from "@/lib/market";
import { getMonitorMercados } from "@/lib/monitor-mercados";
import { getNoticias } from "@/lib/noticias";
import { getEventos } from "@/lib/calendario";
import { hoyCordobaISO } from "@/lib/dates";
import { sbSelect, sbSelectAll } from "@/lib/supabase";
import { tokenValido, esFechaValida } from "@/lib/informe-auth";
import { parseRows, construirCambios, organismosPresentes } from "@/lib/estimaciones";

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

  const [cierres, arbitrajes, pizarra, dolarFuturo, chicago, noticias, colorRes, bcraRes, estimRes, interpRes] =
    await Promise.all([
      getCierresGranos(),
      getArbitrajes(),
      getPizarra(),
      getDolarFuturo(),
      getMonitorMercados(),
      getNoticias(),
      sbSelect(`mesa_color?fecha=eq.${fecha}&select=fecha,texto,actualizado`, 0),
      // Compras BCRA: hoy solo carga MANUAL (P3 de PLAN_BACKLOG.md sumará la ingesta
      // automática a esta misma tabla, con fuente='api').
      sbSelect(`compras_bcra?fecha=eq.${fecha}&select=fecha,monto_musd,fuente`, 0),
      sbSelectAll(
        "estimaciones_produccion?select=organismo,pais,grano,campania,variable,valor,unidad,fecha_publicacion,informe,url&order=fecha_publicacion.asc",
        3600,
      ),
      // MP4 (interpretación de informes de organismos, aún sin construir): consulta
      // "adelantada" — mientras la tabla no exista, sbSelect degrada a [] sin romper.
      sbSelect(
        `interpretaciones?estado=eq.publicado&fecha_publicacion=eq.${fecha}&select=organismo,informe,publicado_md`,
        0,
      ),
    ]);

  // Color de la rueda: null si no cargó nada ese día (el informe sale igual, degrada).
  const color = colorRes.ok && Array.isArray(colorRes.data) && colorRes.data.length > 0
    ? (colorRes.data[0] as { fecha: string; texto: string; actualizado: string })
    : null;

  const bcra = bcraRes.ok && Array.isArray(bcraRes.data) && bcraRes.data.length > 0
    ? (bcraRes.data[0] as { fecha: string; monto_musd: number; fuente: string })
    : null;

  // Noticias: solo lo citable del día, acotado (top 4 destacadas).
  const noticiasCompactas = {
    destacados: noticias.destacados.slice(0, 4),
    meta: noticias.meta,
  };

  // Volumen operado del día en A3 por grano (suma de todas las posiciones vivas).
  const volumenPorGrano = Object.fromEntries(
    cierres.granos.map((g) => [g.underlying, volumenTotalGrano(g)]),
  );

  // Informe de organismo publicado JUSTO hoy (ej. USDA/CONAB/GEA/DEA): qué cambió,
  // con números exactos (reusa estimaciones.ts, cero lógica nueva). Si además MP4 ya
  // publicó su interpretación de ese mismo informe, se adjunta vía `interpretaciones`.
  const estimRows = estimRes.ok ? parseRows(estimRes.data) : [];
  const informesHoy = organismosPresentes(estimRows)
    .map((o) => construirCambios(estimRows, o))
    .filter((c) => c.fecha === fecha && c.cambios.length > 0);
  const interpretaciones = interpRes.ok && Array.isArray(interpRes.data) ? interpRes.data : [];

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
      bcra,
      volumenPorGrano,
      informesHoy,
      interpretaciones,
    },
    { headers: noCache },
  );
}
