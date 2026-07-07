/**
 * Motor de estrategias combinadas de opciones (modelo de los Excels INTAGRO).
 * Una estrategia = combinación de PATAS (futuro / call / put, compra o venta).
 * Se grafica el resultado neto por tonelada a cada precio final del subyacente.
 *
 *   futuro compra: P − strike        futuro venta: strike − P
 *   call compra:   max(P−k,0) − prima call venta:   prima − max(P−k,0)
 *   put  compra:   max(k−P,0) − prima put  venta:   prima − max(k−P,0)
 *
 * Ver docs/ESTRATEGIAS_COMBINADAS.md.
 */

export type Tipo = "futuro" | "call" | "put";
export type Lado = "compra" | "venta";
export type Pata = { tipo: Tipo; lado: Lado; strike: number; prima: number };

export function payoffPata(P: number, pata: Pata): number {
  const { tipo, lado, strike, prima } = pata;
  if (tipo === "futuro") return lado === "compra" ? P - strike : strike - P;
  const intr = tipo === "call" ? Math.max(P - strike, 0) : Math.max(strike - P, 0);
  return lado === "compra" ? intr - prima : prima - intr;
}

export function payoffTotal(P: number, patas: Pata[]): number {
  return patas.reduce((a, p) => a + payoffPata(P, p), 0);
}

/** Prima neta pagada (put/call compra) menos cobrada (venta). Positivo = costo. */
export function primaNeta(patas: Pata[]): number {
  return patas.reduce((a, p) => {
    if (p.tipo === "futuro") return a;
    return a + (p.lado === "compra" ? p.prima : -p.prima);
  }, 0);
}

export type Escenario = { P: number; resultado: number };

export function serieEscenarios(patas: Pata[], desde: number, hasta: number, n = 41): Escenario[] {
  const out: Escenario[] = [];
  if (!(hasta > desde) || n < 2) return out;
  const paso = (hasta - desde) / (n - 1);
  for (let i = 0; i < n; i++) {
    const P = desde + paso * i;
    out.push({ P, resultado: payoffTotal(P, patas) });
  }
  return out;
}

export type EstrategiaDef = { id: string; nombre: string; patas: Pata[] };

// Catálogo (strikes/primas de ejemplo alrededor de ~320; todo editable).
export const ESTRATEGIAS: EstrategiaDef[] = [
  { id: "compra_call", nombre: "Compra de Call", patas: [{ tipo: "call", lado: "compra", strike: 340, prima: 6 }] },
  { id: "venta_call", nombre: "Venta / Lanzamiento de Call", patas: [{ tipo: "call", lado: "venta", strike: 340, prima: 6 }] },
  { id: "compra_put", nombre: "Compra de Put", patas: [{ tipo: "put", lado: "compra", strike: 300, prima: 6 }] },
  { id: "venta_put", nombre: "Venta / Lanzamiento de Put", patas: [{ tipo: "put", lado: "venta", strike: 300, prima: 6 }] },
  { id: "collar_venta", nombre: "Piso y techo de venta (collar)", patas: [{ tipo: "put", lado: "compra", strike: 300, prima: 8 }, { tipo: "call", lado: "venta", strike: 340, prima: 5 }] },
  { id: "collar_compra", nombre: "Piso y techo de compra", patas: [{ tipo: "call", lado: "compra", strike: 340, prima: 8 }, { tipo: "put", lado: "venta", strike: 300, prima: 5 }] },
  { id: "venta_compra_call", nombre: "Venta + Compra de Call", patas: [{ tipo: "futuro", lado: "venta", strike: 320, prima: 0 }, { tipo: "call", lado: "compra", strike: 340, prima: 6 }] },
  { id: "call_cubierto", nombre: "Venta + Lanzamiento de Call", patas: [{ tipo: "futuro", lado: "venta", strike: 320, prima: 0 }, { tipo: "call", lado: "venta", strike: 340, prima: 6 }] },
  { id: "compra_compra_put", nombre: "Compra + Compra de Put", patas: [{ tipo: "futuro", lado: "compra", strike: 320, prima: 0 }, { tipo: "put", lado: "compra", strike: 300, prima: 6 }] },
  { id: "compra_lanz_put", nombre: "Compra + Lanzamiento de Put", patas: [{ tipo: "futuro", lado: "compra", strike: 320, prima: 0 }, { tipo: "put", lado: "venta", strike: 300, prima: 6 }] },
];
