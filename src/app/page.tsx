import { getCintaData } from "@/lib/market";
import { SiteHeader } from "@/components/site-header";
import { Cinta } from "@/components/cinta";
import { ArbitrajesTable } from "@/components/arbitrajes-table";
import { PasesPanel } from "@/components/pases-panel";
import { DolarFuturoPanel } from "@/components/dolar-futuro-panel";
import { DolarLinkedPanel } from "@/components/dolar-linked-panel";
import { ImplicitasPanel } from "@/components/implicitas-panel";
import { SinteticosPanel } from "@/components/sinteticos-panel";
import { PanelCambiario } from "@/components/panel-cambiario";
import { SiteFooter } from "@/components/site-footer";
import { RefreshOnFocus } from "@/components/refresh-on-focus";

// Revalida los datos de la cinta cada 60s (caché corto).
export const revalidate = 60;

export default async function Home() {
  const cinta = await getCintaData();

  return (
    <>
      <h1 className="sr">RF AGRO — Pizarra electrónica de granos</h1>
      <RefreshOnFocus />
      <SiteHeader />
      <Cinta data={cinta} />
      <main className="wrap">
        <div className="col">
          <ArbitrajesTable />
          <PasesPanel />
          <DolarFuturoPanel />
          <DolarLinkedPanel />
          <ImplicitasPanel />
          <SinteticosPanel />
          <PanelCambiario />
        </div>
      </main>
      <div className="awn" aria-hidden="true" />
      <SiteFooter />
    </>
  );
}
