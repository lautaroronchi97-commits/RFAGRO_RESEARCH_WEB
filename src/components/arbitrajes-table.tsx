import { getArbitrajes } from "@/lib/arbitrajes-cierres";
import { getFuturosLive, mergeLiveMeta } from "@/lib/a3-live";
import { Panel, PanelHead } from "./panel";
import { IconArb } from "./icons";
import { SourceStamp } from "./source-stamp";
import { QueEsEsto } from "./que-es-esto";
import { ArbitrajesEditable, type ArbGranoClient } from "./arbitrajes-editable";

export async function ArbitrajesTable() {
  const [data, live] = await Promise.all([getArbitrajes(), getFuturosLive()]);
  const meta = mergeLiveMeta(data.meta, live);

  const granos: ArbGranoClient[] = data.granos.map((g) => ({
    underlying: g.underlying,
    nombre: g.nombre,
    pizarraDefault: g.pizarraUsd,
    pizarraArs: g.pizarraArs,
    pizarraEstimativa: g.pizarraEstimativa,
    rows: g.rows.map((r) => {
      const p = live.puntas.get(r.symbol);
      return {
        pos: r.pos,
        ajuste: r.ajuste,
        dias: r.dias,
        volume: r.volume,
        bid: p?.bid ?? null,
        ask: p?.ask ?? null,
      };
    }),
  }));

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
        comoSeCalcula="Toma el precio de venta de hoy y el precio para entregar en cada posición futura. La diferencia es el spread; puesta como porcentaje sobre el precio de hoy es la tasa directa, y anualizada por los días que faltan, la tasa anual en dólares. Podés cargar tu propio precio de hoy y todo se recalcula. Comprador y Vendedor son las puntas del futuro en la rueda, cuando está abierta."
      />
    </Panel>
  );
}
