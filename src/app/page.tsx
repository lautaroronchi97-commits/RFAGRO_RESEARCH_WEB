import { getCintaData } from "@/lib/market";
import { SiteHeader } from "@/components/site-header";
import { Cinta } from "@/components/cinta";
import { ArbitrajesTable } from "@/components/arbitrajes-table";
import { SiteFooter } from "@/components/site-footer";

// Revalida los datos de la cinta cada 60s (caché corto).
export const revalidate = 60;

export default async function Home() {
  const cinta = await getCintaData();

  return (
    <>
      <SiteHeader />
      <Cinta data={cinta} />
      <main className="wrap">
        <ArbitrajesTable />
      </main>
      <div className="awn" aria-hidden="true" />
      <SiteFooter />
    </>
  );
}
