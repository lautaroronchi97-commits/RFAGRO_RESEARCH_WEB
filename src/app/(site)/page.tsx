import { getCintaData } from "@/lib/market";
import { getCurvaGranos } from "@/lib/curva";
import { getPizarra } from "@/lib/pizarra";
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
import { InformesPanel } from "@/components/informes-panel";
import { EstimacionesMini } from "@/components/estimaciones-mini";
import { CalcDiferido } from "@/components/calc-diferido";
import { CalcNegociosPago } from "@/components/calc-negocios-pago";
import { CalcPlanta, type PizarraProducto } from "@/components/calc-planta";
import { CalcArbitraje } from "@/components/calc-arbitraje";
import { CalcEstrategias } from "@/components/calc-estrategias";
import { CalcFijar } from "@/components/calc-fijar";
import { CalcCostos } from "@/components/calc-costos";
import { CalcPorcentaje } from "@/components/calc-porcentaje";
import { CalcPases } from "@/components/calc-pases";

// Revalida los datos de la cinta cada 60s (caché corto).
export const revalidate = 60;

export default async function Home() {
  const cinta = await getCintaData();
  const curva = await getCurvaGranos();
  const pizarra = await getPizarra();

  const NOMBRES_PIZARRA: Record<string, string> = { SOJ: "Soja", MAI: "Maíz", TRI: "Trigo" };
  const pizarraProd: PizarraProducto[] = ["SOJ", "MAI", "TRI"]
    .map((u) => pizarra.granos[u])
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map((g) => ({ underlying: g.underlying, nombre: NOMBRES_PIZARRA[g.underlying] ?? g.underlying, usd: g.usd }));

  return (
    <>
      <h1 className="sr">RF AGRO — Pizarra electrónica de granos</h1>
      <Cinta data={cinta} />
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Noticias</h2>
          <NoticiasPanel />
          <InformesPanel />
          <EstimacionesMini />

          <h2 className="sec-title">Granos</h2>
          <ArbitrajesTable />
          <MejorCajaPanel />
          <PasesPanel />
          <CapacidadPanel />

          <h2 className="sec-title">Calculadoras</h2>
          <CalcDiferido />
          <CalcPlanta pizarra={pizarraProd} />
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
    </>
  );
}
