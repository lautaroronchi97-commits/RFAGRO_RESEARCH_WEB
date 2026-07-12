import type { Metadata } from "next";
import { NoticiasPanel } from "@/components/noticias-panel";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Noticias · RF AGRO",
  description: "Portal de noticias del agro: granos, dólar, clima, exportaciones e informes.",
};

export default function NoticiasPage() {
  return (
    <>
      <h1 className="sr">RF AGRO — Noticias del agro</h1>
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Noticias</h2>
          <NoticiasPanel />
        </div>
      </main>
    </>
  );
}
