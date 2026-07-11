import { getArbitrajes } from "@/lib/arbitrajes-cierres";
import { getFuturosLive, mergeLiveMeta } from "@/lib/a3-live";
import { Panel, PanelHead } from "./panel";
import { IconArb } from "./icons";
import { SourceStamp } from "./source-stamp";
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
      <div className="panel-note">
        <span>
          <span className="k">Real</span> Futuro = ajuste (settlement) de A3/CEM · Pizarra = disponible USD de
          CAC-BCR{data.pizarraFecha ? ` (al ${data.pizarraFecha})` : ""}, <b>editable</b>: cambiá el precio
          del día y se recalculan spread, tasa directa y TNA. Precios A3 = <b>futuro</b>, no es lo que se
          paga hoy. Comprador/Vendedor = puntas del futuro en la rueda de A3, en vivo (solo lectura; — fuera
          de rueda).
        </span>
      </div>
    </Panel>
  );
}
