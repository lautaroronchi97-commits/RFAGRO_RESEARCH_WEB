import type { Metadata } from "next";
import { DolarFuturoPanel } from "@/components/dolar-futuro-panel";
import { DolarLinkedPanel } from "@/components/dolar-linked-panel";
import { ImplicitasPanel } from "@/components/implicitas-panel";
import { SinteticosPanel } from "@/components/sinteticos-panel";
import { PanelCambiario } from "@/components/panel-cambiario";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Dólar y tasas · RF AGRO",
  description:
    "Dólar futuro, dólar linked, tasas implícitas, sintéticos y el panel cambiario del día.",
};

export default function DolarPage() {
  return (
    <>
      <h1 className="sr">RF AGRO — Dólar y tasas</h1>
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Dólar y tasas</h2>
          <DolarFuturoPanel />
          <DolarLinkedPanel />
          <ImplicitasPanel />
          <SinteticosPanel />
          <PanelCambiario />
        </div>
      </main>
    </>
  );
}
