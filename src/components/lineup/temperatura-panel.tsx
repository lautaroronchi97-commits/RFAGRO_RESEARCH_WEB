import Link from "next/link";
import { getTemperatura } from "@/lib/lineup/temperatura";
import { Panel, PanelHead } from "../panel";
import { SourceStamp } from "../source-stamp";
import { QueEsEsto } from "../que-es-esto";
import { TemperaturaGrid } from "./temperatura-grid";

/**
 * Semáforo MESA — "calor de mercadería": qué producto está CALIENTE (la exportación/industria necesita
 * mercadería → se puede sobrepagar → diferir) y cuál PESADO (cubiertos → vender ya / comprar barato).
 * Índice 0-100 por percentil estacional de las 2 patas de demanda (gap de cobertura + densidad de
 * line-up) + momentum (dirección del gap) → acción sugerida.
 */

function IconCalor() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 1.5c1.5 2.5 3.5 4 3.5 6.5a3.5 3.5 0 0 1-7 0c0-1 .5-2 1.2-2.8C6.2 6 7.2 5 8 1.5Z" />
    </svg>
  );
}

export async function TemperaturaPanel() {
  const data = await getTemperatura();

  if (data.productos.length === 0) {
    return (
      <Panel id="comercio-temperatura">
        <PanelHead glyph={<IconCalor />} title="Calor de mercadería" sub="Índice MESA" stamp={<SourceStamp meta={data.meta} />} />
        <p className="dim" style={{ padding: "8px 2px" }}>Sin series de temperatura disponibles todavía.</p>
      </Panel>
    );
  }

  return (
    <Panel id="comercio-temperatura">
      <PanelHead
        glyph={<IconCalor />}
        title="Calor de mercadería"
        sub={`Índice MESA${data.fecha ? ` · al ${data.fecha.slice(8, 10)}/${data.fecha.slice(5, 7)}` : ""}`}
        stamp={<SourceStamp meta={data.meta} />}
      />

      <TemperaturaGrid productos={data.productos} />

      {!data.farmerDisponible && (
        <p className="dim" style={{ marginTop: 10, fontSize: ".82rem" }}>
          Índice sobre las 2 patas de <strong>demanda</strong> (gap de cobertura {Math.round(data.pesos.gap * 100)}% +
          densidad de line-up {Math.round(data.pesos.lineup * 100)}%, renormalizadas). La pata de <strong>oferta</strong>{" "}
          (farmer selling, {Math.round(data.pesos.farmer * 100)}%) se suma cuando la serie de compras junte historia.
        </p>
      )}

      <QueEsEsto
        paraQue={
          <>
            Responde, pre-apertura: <strong>qué grano está caliente</strong> (la exportación/industria necesita
            mercadería → puede sobrepagar → conviene diferir la venta) <strong>y cuál pesado</strong> (ya está
            cubierta → no va a haber interés → vender ya o comprarle barato al productor). Es la pata de cantidad;
            el precio lo cruza la mesa por su lado. Solo mesa. Bandas: 🔥 CALIENTE ≥80 · FIRME 60-80 · NEUTRO
            40-60 · PESADO 20-40 · 🧊 MUY PESADO &lt;20.
          </>
        }
        comoSeCalcula={
          <>
            El índice 0-100 es un <strong>percentil estacional</strong>: compara la presión física de hoy contra
            la misma época de las últimas campañas (no un umbral fijo). Combina el <strong>gap de cobertura</strong>{" "}
            (lo declarado en DJVE que todavía no tiene barcos) y la <strong>densidad del line-up</strong> (toneladas
            nominadas a 30 días). Cuando el producto tiene historia, suma la pata de <strong>oferta</strong> (el
            avance de ventas del productor: menos vendido del normal para la época = más retención = más calor).
            La flecha es el momentum del gap (abriéndose ↗ / estable → / cerrándose ↘); cruzada con el nivel da la
            acción sugerida.
          </>
        }
      />
      <p className="ng-admin-link">
        <Link href="/granos/view">View de mesa por grano (research direccional semanal) →</Link>
      </p>
    </Panel>
  );
}
