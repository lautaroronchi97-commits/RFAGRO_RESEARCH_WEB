import type { Metadata } from "next";
import { DjvePanel } from "@/components/djve-panel";
import { requireSeccion } from "@/lib/auth/dal";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Comercio exterior · RF AGRO",
  description: "Declaraciones juradas de venta al exterior (DJVE) de granos y subproductos.",
};

export default async function ComercioPage() {
  await requireSeccion("comercio");
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
