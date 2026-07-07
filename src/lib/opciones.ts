/**
 * Estrategia piso-techo (collar) para un VENDEDOR de granos (productor/acopio).
 *
 *   - Compra un PUT  (strike = piso)  → paga prima_put   → asegura un precio mínimo.
 *   - Vende un CALL  (strike = techo) → cobra prima_call → financia el put, cede la suba.
 *
 *   prima_neta      = prima_put − prima_call        (costo si > 0, ingreso si < 0)
 *   precio_de_venta = min(max(precio_final, piso), techo)   (piso/mercado/techo)
 *   precio_efectivo = precio_de_venta − prima_neta
 *
 * Convención pendiente de validar con Lautaro (regla del proyecto).
 */

export type Collar = {
  piso: number; // strike put
  techo: number; // strike call
  primaPut: number;
  primaCall: number;
};

export function primaNeta(c: Collar): number {
  return c.primaPut - c.primaCall;
}

/** Precio al que se termina vendiendo el físico según el precio final del subyacente. */
export function precioVenta(precioFinal: number, c: Collar): number {
  return Math.min(Math.max(precioFinal, c.piso), c.techo);
}

/** Precio efectivo neto de primas. */
export function precioEfectivo(precioFinal: number, c: Collar): number {
  return precioVenta(precioFinal, c) - primaNeta(c);
}

export type Escenario = {
  precioFinal: number;
  venta: number;
  efectivo: number;
  vsMercado: number; // efectivo − (precio_final)  → cuánto mejora/empeora vs vender a mercado sin cobertura
};

/** Serie de escenarios entre `desde` y `hasta` (n puntos), para tabla y gráfico. */
export function escenarios(c: Collar, desde: number, hasta: number, n = 25): Escenario[] {
  const out: Escenario[] = [];
  if (!(hasta > desde) || n < 2) return out;
  const paso = (hasta - desde) / (n - 1);
  for (let i = 0; i < n; i++) {
    const precioFinal = desde + paso * i;
    const venta = precioVenta(precioFinal, c);
    const efectivo = venta - primaNeta(c);
    out.push({ precioFinal, venta, efectivo, vsMercado: efectivo - precioFinal });
  }
  return out;
}

/** Escenarios "clave" para la tabla (por debajo del piso, en los strikes, en el medio, sobre el techo). */
export function escenariosClave(c: Collar): Escenario[] {
  const medio = (c.piso + c.techo) / 2;
  const span = Math.max(c.techo - c.piso, c.piso * 0.1);
  const puntos = [c.piso - span * 0.5, c.piso, medio, c.techo, c.techo + span * 0.5];
  return puntos.map((precioFinal) => {
    const venta = precioVenta(precioFinal, c);
    const efectivo = venta - primaNeta(c);
    return { precioFinal, venta, efectivo, vsMercado: efectivo - precioFinal };
  });
}
