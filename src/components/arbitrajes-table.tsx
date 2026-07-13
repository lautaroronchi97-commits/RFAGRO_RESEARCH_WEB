import { getArbitrajes } from "@/lib/arbitrajes-cierres";
import { getFuturosLive, mergeLiveMeta } from "@/lib/a3-live";
import { ruedaAgroCorrioHoy } from "@/lib/rueda";
import { hoyCordobaISO } from "@/lib/dates";
import { Panel, PanelHead } from "./panel";
import { IconArb } from "./icons";
import { SourceStamp } from "./source-stamp";
import { QueEsEsto } from "./que-es-esto";
import { ArbitrajesEditable, type ArbGranoClient } from "./arbitrajes-editable";

/**
 * Referencia de la 1ª columna (pedido de Lautaro, 07/2026):
 *   - Fuera de rueda → el último AJUSTE (settlement de cierre).
 *   - Al abrir la rueda se "borra" el ajuste y pasa al último OPERADO en vivo
 *     (A3), hasta que salga el próximo ajuste. Antes de la 1ª operación del día
 *     queda en blanco (—).
 * Todo (spread / tasa directa / TNA) se recalcula sobre esa referencia, así el
 * arbitraje refleja el mercado del momento durante la rueda.
 * Sin A3 en vivo (Preview/sandbox o feed caído) cae al ajuste — no se queda en blanco.
 */
export async function ArbitrajesTable() {
  const [data, live] = await Promise.all([getArbitrajes(), getFuturosLive()]);
  const meta = mergeLiveMeta(data.meta, live);

  const ruedaCorrio = ruedaAgroCorrioHoy();
  const hoy = hoyCordobaISO();
  const liveOk = live.respondidos > 0; // A3 configurado y respondiendo

  const granos: ArbGranoClient[] = data.granos.map((g) => {
    // El ajuste del día ya salió cuando el cierre guardado es de hoy.
    const ajusteEsDeHoy = g.fecha === hoy;
    const modoOperado = ruedaCorrio && !ajusteEsDeHoy && liveOk;
    return {
      underlying: g.underlying,
      nombre: g.nombre,
      pizarraDefault: g.pizarraUsd,
      pizarraArs: g.pizarraArs,
      pizarraEstimativa: g.pizarraEstimativa,
      rows: g.rows.map((r) => {
        const p = live.puntas.get(r.symbol);
        const last = p?.last ?? null;
        const volLive = p?.vol ?? null; // volumen operado HOY (A3 TV, resetea por rueda)
        const operoHoy = volLive != null && volLive > 0;
        // En rueda: último operado (o — si aún no operó). Fuera de rueda: ajuste.
        const ref = modoOperado ? (operoHoy ? last : null) : r.ajuste;
        return {
          pos: r.pos,
          ref,
          refMode: modoOperado ? ("operado" as const) : ("ajuste" as const),
          dias: r.dias,
          volume: modoOperado ? volLive : r.volume,
          bid: p?.bid ?? null,
          ask: p?.ask ?? null,
        };
      }),
    };
  });

  return (
    <Panel id="arbitrajes">
      <PanelHead
        glyph={<IconArb />}
        title="Arbitrajes"
        sub="Pizarra (disponible) vs A3 (futuro)"
        stamp={<SourceStamp meta={meta} />}
      />
      <ArbitrajesEditable granos={granos} />
      <QueEsEsto
        paraQue="Te muestra cuánto te reconoce el mercado por esperar a entregar tu grano más adelante en vez de venderlo hoy. Si esa espera rinde una tasa alta en dólares, conviene vender a futuro y cobrar después; si rinde poco, conviene hacer caja hoy."
        comoSeCalcula="Toma el precio de venta de hoy y el precio del futuro en cada posición. Fuera de rueda ese precio del futuro es el último ajuste; durante la rueda se borra el ajuste y pasa a ser el último operado en vivo, hasta que salga el próximo ajuste. La diferencia contra el precio de hoy es el spread; puesta como porcentaje es la tasa directa, y anualizada por los días que faltan, la tasa anual en dólares. Podés cargar tu propio precio de hoy y todo se recalcula. Comprador y Vendedor son las puntas del futuro en la rueda, cuando está abierta."
      />
    </Panel>
  );
}
