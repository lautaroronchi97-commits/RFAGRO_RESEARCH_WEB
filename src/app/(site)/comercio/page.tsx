import type { Metadata } from "next";
import { DjvePanel } from "@/components/djve-panel";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Comercio exterior · RF AGRO",
  description: "Declaraciones juradas de venta al exterior (DJVE) de granos y subproductos.",
};

export default function ComercioPage() {
  return (
    <>
      <h1 className="sr">RF AGRO — Comercio exterior</h1>
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Comercio exterior</h2>
          <DjvePanel />
        </div>
      </main>
    </>
  );
}
