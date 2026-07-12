/**
 * Registro de las calculadoras (una página por calculadora, link propio).
 * Solo metadatos client-facing: el mapeo slug → componente vive en la página
 * dinámica `/calculadoras/[slug]` (los componentes no se importan acá).
 */
export type CalcMeta = { slug: string; nombre: string; desc: string };

export const CALCULADORAS: CalcMeta[] = [
  { slug: "a-fijar", nombre: "Negocios a fijar", desc: "Cuánto te queda al fijar el precio más adelante, comparado contra tu propia tasa." },
  { slug: "por-porcentaje", nombre: "Negocios por porcentaje", desc: "Cotizás una parte del negocio a fijar, con el aforo aplicado." },
  { slug: "negocios-con-pagos", nombre: "Negocios con pagos", desc: "Precio disponible descontando el plazo hasta el pago." },
  { slug: "pago-diferido", nombre: "Pago diferido", desc: "Llevás un precio a pesos según los días hasta el cobro." },
  { slug: "pases", nombre: "Cotizador con pases", desc: "Cuánto vale correr la entrega a otra posición, con la quita." },
  { slug: "carry", nombre: "Carry entre posiciones", desc: "La tasa implícita entre dos posiciones del mismo grano." },
  { slug: "costos", nombre: "Costos de operar", desc: "Comisiones y gastos de comprar o vender en el mercado." },
  { slug: "estrategias", nombre: "Estrategias con opciones", desc: "Armás combinaciones de compra/venta y ves el resultado." },
  { slug: "negocios-de-planta", nombre: "Negocios de planta", desc: "Precio final descontando los gastos de la operación en planta." },
];

export function getCalc(slug: string): CalcMeta | undefined {
  return CALCULADORAS.find((c) => c.slug === slug);
}
