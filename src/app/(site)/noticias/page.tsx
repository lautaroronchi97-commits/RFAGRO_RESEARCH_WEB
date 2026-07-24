import type { Metadata } from "next";
import { NoticiasPanel } from "@/components/noticias-panel";
import { requireSeccion } from "@/lib/auth/dal";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Noticias · ROFO AGRO",
  description: "Portal de noticias del agro: granos, dólar, clima, exportaciones e informes.",
};

export default async function NoticiasPage() {
  await requireSeccion("noticias");
  return (
    <>
      <h1 className="sr">ROFO AGRO — Noticias del agro</h1>
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Noticias</h2>
          <NoticiasPanel />
        </div>
      </main>
    </>
  );
}
