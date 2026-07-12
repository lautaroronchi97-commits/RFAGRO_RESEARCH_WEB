import type { Metadata } from "next";
import { ArbitrajesTable } from "@/components/arbitrajes-table";
import { MejorCajaPanel } from "@/components/mejor-caja-panel";
import { PasesPanel } from "@/components/pases-panel";
import { CapacidadPanel } from "@/components/capacidad-panel";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Granos · RF AGRO",
  description:
    "Arbitrajes, pases, capacidad de pago y la mejor salida para hacer caja en el mercado de granos.",
};

export default function GranosPage() {
  return (
    <>
      <h1 className="sr">RF AGRO — Granos</h1>
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Granos</h2>
          <ArbitrajesTable />
          <MejorCajaPanel />
          <PasesPanel />
          <CapacidadPanel />
        </div>
      </main>
    </>
  );
}
