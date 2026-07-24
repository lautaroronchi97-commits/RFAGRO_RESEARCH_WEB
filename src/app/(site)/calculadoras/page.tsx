import type { Metadata } from "next";
import Link from "next/link";
import { CALCULADORAS } from "@/lib/calculadoras";
import { requireSeccion } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Calculadoras · ROFO AGRO",
  description:
    "Calculadoras y cotizadores para operar granos: a fijar, por porcentaje, pases, carry, pago diferido, costos y estrategias. Cada una con su link propio.",
};

export default async function CalculadorasPage() {
  await requireSeccion("calculadoras");
  return (
    <>
      <h1 className="sr">ROFO AGRO — Calculadoras</h1>
      <main className="wrap">
        <div className="col">
          <h2 className="sec-title">Calculadoras</h2>
          <nav className="hub-grid" aria-label="Calculadoras">
            {CALCULADORAS.map((c) => (
              <Link key={c.slug} href={`/calculadoras/${c.slug}`} className="hub-card">
                <span className="hub-card-name">{c.nombre}</span>
                <span className="hub-card-desc">{c.desc}</span>
                <span className="hub-card-go" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </>
  );
}
