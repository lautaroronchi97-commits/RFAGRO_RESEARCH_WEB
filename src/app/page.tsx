import { getCintaData } from "@/lib/market";
import { getCurvaGranos } from "@/lib/curva";
import { SiteHeader } from "@/components/site-header";
import { Cinta } from "@/components/cinta";
import { ArbitrajesTable } from "@/components/arbitrajes-table";
import { PasesPanel } from "@/components/pases-panel";
import { DolarFuturoPanel } from "@/components/dolar-futuro-panel";
import { DolarLinkedPanel } from "@/components/dolar-linked-panel";
import { ImplicitasPanel } from "@/components/implicitas-panel";
import { SinteticosPanel } from "@/components/sinteticos-panel";
import { PanelCambiario } from "@/components/panel-cambiario";
import { DjvePanel } from "@/components/djve-panel";
import { CapacidadPanel } from "@/components/capacidad-panel";
import { MejorCajaPanel } from "@/components/mejor-caja-panel";
import { NoticiasPanel } from "@/components/noticias-panel";
import { CalcDiferido } from "@/components/calc-diferido";
import { CalcNegociosPago } from "@/components/calc-negocios-pago";
import { CalcArbitraje } from "@/components/calc-arbitraje";
import { CalcEstrategias } from "@/components/calc-estrategias";
import { CalcFijar } from "@/components/calc-fijar";
import { CalcCostos } from "@/components/calc-costos";
import { CalcPorcentaje } from "@/components/calc-porcentaje";
import { CalcPases } from "@/components/calc-pases";
import { SiteFooter } from "@/components/site-footer";
import { RefreshOnFocus } from "@/components/refresh-on-focus";

// Revalida los datos de la cinta cada 60s (caché corto).
export const revalidate = 60;

export default async function Home() {
  const cinta = await getCintaData();
  const curva = await getCurvaGranos();

  return (
    <>
      <h1 className="sr">RF AGRO — Pizarra electrónica de granos</h1>
      <RefreshOnFocus />
      <SiteHeader />
      <Cinta data={cinta} />
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Noticias</h2>
          <NoticiasPanel />

          <h2 className="sec-title">Granos</h2>
          <ArbitrajesTable />
          <MejorCajaPanel />
          <PasesPanel />
          <CapacidadPanel />

          <h2 className="sec-title">Calculadoras</h2>
          <CalcDiferido />
          <CalcNegociosPago granos={curva.granos} />
          <CalcArbitraje granos={curva.granos} />
          <CalcEstrategias />
          <CalcFijar granos={curva.granos} />
          <CalcPorcentaje granos={curva.granos} />
          <CalcPases granos={curva.granos} />
          <CalcCostos />

          <h2 className="sec-title">Dólar y tasas</h2>
          <DolarFuturoPanel />
          <DolarLinkedPanel />
          <ImplicitasPanel />
          <SinteticosPanel />
          <PanelCambiario />
          <DjvePanel />
        </div>
      </main>
      <div className="awn" aria-hidden="true" />
      <SiteFooter />
    </>
  );
}
