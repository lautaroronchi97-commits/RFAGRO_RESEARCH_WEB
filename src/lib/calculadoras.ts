/**
 * Registro de las calculadoras (una página por calculadora, link propio).
 * Solo metadatos client-facing: el mapeo slug → componente vive en la página
 * dinámica `/calculadoras/[slug]` (los componentes no se importan acá).
 * `paraQue` / `comoSeCalcula` alimentan el bloque "¿Qué es esto?" (lenguaje
 * llano, sin jerga técnica ni fuentes).
 */
export type CalcMeta = {
  slug: string;
  nombre: string;
  desc: string;
  paraQue: string;
  comoSeCalcula: string;
};

export const CALCULADORAS: CalcMeta[] = [
  {
    slug: "a-fijar",
    nombre: "Negocios a fijar",
    desc: "Cuánto te queda al fijar el precio más adelante, comparado contra tu propia tasa.",
    paraQue:
      "Te dice cuánto te queda si fijás el precio más adelante en vez de cerrar hoy, y si te conviene frente a hacer caja hoy contra tu propia tasa.",
    comoSeCalcula:
      "Toma la diferencia entre el precio disponible y el futuro (el delta), sin costo de oportunidad. Después compara la tasa que sale de esa diferencia contra la tasa que cargás vos: si la supera, marca el negocio en verde y te muestra el precio a tu tasa.",
  },
  {
    slug: "por-porcentaje",
    nombre: "Negocios por porcentaje",
    desc: "Cotizás una parte del negocio a fijar, con el aforo aplicado.",
    paraQue:
      "Cuando cerrás solo una parte del negocio a fijar, te muestra el porcentaje que efectivamente le queda al cliente después del aforo.",
    comoSeCalcula:
      "Sobre el porcentaje lleno del negocio descuenta el aforo (% relativo) que cargás; el resultado es el porcentaje que se le reconoce al cliente.",
  },
  {
    slug: "negocios-con-pagos",
    nombre: "Negocios con pagos",
    desc: "Precio disponible descontando el plazo hasta el pago.",
    paraQue: "Te da el precio disponible de hoy a partir de un precio futuro, descontando el plazo hasta que cobrás.",
    comoSeCalcula:
      "Descuenta el futuro por los días hasta el pago a interés simple (el futuro dividido uno más la tasa por los días sobre 365). Si querés, lo pasa a pesos multiplicando por el tipo de cambio que cargás.",
  },
  {
    slug: "pago-diferido",
    nombre: "Pago diferido",
    desc: "Llevás un precio a pesos según los días hasta el cobro.",
    paraQue: "Llevás un precio a pesos teniendo en cuenta los días que faltan hasta cobrar.",
    comoSeCalcula: "Aplica interés simple por los días hasta el cobro, con la tasa en pesos que cargás.",
  },
  {
    slug: "pases",
    nombre: "Cotizador con pases",
    desc: "Cuánto vale correr la entrega a otra posición, con la quita.",
    paraQue: "Te dice cuánto vale correr la entrega de una posición a otra, ya con la quita que le hacés al cliente.",
    comoSeCalcula:
      "Toma el spread entre las dos posiciones y le descuenta la quita que cargás; el resultado es lo que se le reconoce al cliente.",
  },
  {
    slug: "carry",
    nombre: "Carry entre posiciones",
    desc: "La tasa implícita entre dos posiciones del mismo grano.",
    paraQue: "Te muestra cuánto rinde esperar de una fecha de entrega a la otra en el mismo grano.",
    comoSeCalcula:
      "Con el precio de la posición cercana y la lejana calcula la diferencia (spread), la tasa directa (lejana sobre cercana menos uno) y la anualiza.",
  },
  {
    slug: "costos",
    nombre: "Costos de operar",
    desc: "Comisiones y gastos de comprar o vender en el mercado.",
    paraQue: "Estima las comisiones y gastos de comprar o vender en el mercado.",
    comoSeCalcula:
      "Aplica el tarifario vigente según el tipo de persona y el plazo, prorrateando las comisiones que se expresan como tasa anual.",
  },
  {
    slug: "estrategias",
    nombre: "Estrategias con opciones",
    desc: "Armás combinaciones de compra/venta y ves el resultado.",
    paraQue: "Armás una estrategia combinando compras y ventas y ves cómo queda el resultado según el precio.",
    comoSeCalcula:
      "Cada estrategia se arma con sus patas a partir de un precio base y un paso; el gráfico muestra la ganancia o pérdida en cada escenario, con los puntos de equilibrio.",
  },
  {
    slug: "negocios-de-planta",
    nombre: "Negocios de planta",
    desc: "Precio final descontando los gastos de la operación en planta.",
    paraQue: "Te da el precio final de un negocio en planta después de descontar todos los gastos.",
    comoSeCalcula:
      "Arranca de un precio de partida (editable) y le resta los rubros de gasto que cargás (flete, secada, merma y demás); el resultado es el precio final y el total de gastos.",
  },
];

export function getCalc(slug: string): CalcMeta | undefined {
  return CALCULADORAS.find((c) => c.slug === slug);
}
