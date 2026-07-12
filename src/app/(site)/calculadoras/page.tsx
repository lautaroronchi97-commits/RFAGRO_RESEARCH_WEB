import type { Metadata } from "next";
import { getCurvaGranos } from "@/lib/curva";
import { getPizarra } from "@/lib/pizarra";
import { CalcDiferido } from "@/components/calc-diferido";
import { CalcNegociosPago } from "@/components/calc-negocios-pago";
import { CalcPlanta, type PizarraProducto } from "@/components/calc-planta";
import { CalcArbitraje } from "@/components/calc-arbitraje";
import { CalcEstrategias } from "@/components/calc-estrategias";
import { CalcFijar } from "@/components/calc-fijar";
import { CalcCostos } from "@/components/calc-costos";
import { CalcPorcentaje } from "@/components/calc-porcentaje";
import { CalcPases } from "@/components/calc-pases";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Calculadoras · RF AGRO",
  description:
    "Calculadoras y cotizadores para operar granos: a fijar, por porcentaje, pases, carry, pago diferido, costos y estrategias.",
};

export default async function CalculadorasPage() {
  const curva = await getCurvaGranos();
  const pizarra = await getPizarra();

  const NOMBRES_PIZARRA: Record<string, string> = { SOJ: "Soja", MAI: "Maíz", TRI: "Trigo" };
  const pizarraProd: PizarraProducto[] = ["SOJ", "MAI", "TRI"]
    .map((u) => pizarra.granos[u])
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map((g) => ({ underlying: g.underlying, nombre: NOMBRES_PIZARRA[g.underlying] ?? g.underlying, usd: g.usd }));

  return (
    <>
      <h1 className="sr">RF AGRO — Calculadoras</h1>
      <main className="wrap">
        <div className="col">
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
        </div>
      </main>
    </>
  );
}
