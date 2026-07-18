import "server-only";
import { cache } from "react";
import type { Meta } from "../market";
import { getCapacidad } from "../capacidad";
import { getEmpresas } from "./empresas";
import { ratioCobertura, senalDe, type SenalTag } from "./cobertura";

/**
 * Semáforo físico → precio (idea #1). Cruza la señal FÍSICA de cobertura (¿la
 * exportación está corta y comprando?) con el CONTEXTO de precio que la web ya
 * calcula (FAS teórico = capacidad de pago, vs pizarra disponible). Es el "y esto
 * qué significa para el precio" que un cliente/mesa realmente quiere.
 *
 * NO es una fórmula cerrada: es una lectura de dos ejes, transparente y tuneable
 * (usa los umbrales de cobertura.py de Lautaro + el spread FAS−pizarra, que es un
 * hecho de mercado). Cubre los 3 granos con FAS+pizarra (soja/maíz/trigo).
 */

const SOURCE = "ISA Agents · SAGyP · BCR";

type GranoDef = { key: string; nombre: string; cods: string[]; precio: string };
const GRANOS: GranoDef[] = [
  { key: "soja", nombre: "Soja", cods: ["SBS", "SBM", "SBO"], precio: "SOJ" },
  { key: "maiz", nombre: "Maíz", cods: ["MAIZE"], precio: "MAI" },
  { key: "trigo", nombre: "Trigo", cods: ["WHEAT"], precio: "TRI" },
];

export type Nivel = "firme" | "mixto" | "neutro" | "flojo";
export type SemaforoGrano = {
  key: string; nombre: string;
  // físico
  declarado: number; originado: number; ratio: number | null; fisico: SenalTag;
  // precio
  fas: number | null; pizarra: number | null; spread: number | null;
  // lectura
  nivel: Nivel; titulo: string; lectura: string;
};
export type SemaforoData = { fecha: string | null; granos: SemaforoGrano[]; meta: Meta };

/** Combina el eje físico (señal de cobertura) con el eje precio (FAS vs pizarra). */
function lectura(fisico: SenalTag, spread: number | null): { nivel: Nivel; titulo: string; lectura: string } {
  const capHolgada = spread === null ? null : spread >= 0; // FAS ≥ pizarra = el exportador puede pagar la pizarra o más
  if (fisico === "ALCISTA FAS") {
    if (capHolgada === true) return { nivel: "firme", titulo: "Piso firme · sesgo comprador", lectura: "La exportación está corta y su capacidad de pago cubre la pizarra: el disponible tiene piso." };
    if (capHolgada === false) return { nivel: "mixto", titulo: "Demanda firme · capacidad ajustada", lectura: "La exportación está corta (compra), pero el FAS quedó por debajo de la pizarra: sostiene, pero sin margen para pagar de más." };
    return { nivel: "mixto", titulo: "Demanda firme", lectura: "La exportación está corta y necesita originar → presión compradora. Falta el dato de FAS para leer la capacidad." };
  }
  if (fisico === "BAJISTA") {
    return { nivel: "flojo", titulo: "Demanda de corto floja", lectura: "La exportación ya originó lo que declaró a esta ventana: menos presión compradora sobre el disponible." };
  }
  // NEUTRO
  if (capHolgada === true) return { nivel: "neutro", titulo: "Equilibrado · con margen", lectura: "Declarado y originado en línea; el FAS cubre la pizarra, hay algo de margen." };
  if (capHolgada === false) return { nivel: "neutro", titulo: "Equilibrado · ajustado", lectura: "Declarado y originado en línea; el FAS quedó por debajo de la pizarra." };
  return { nivel: "neutro", titulo: "Equilibrado", lectura: "Declarado y originado en línea a esta ventana." };
}

export const getSemaforo = cache(async (): Promise<SemaforoData> => {
  const [empresas, cap] = await Promise.all([getEmpresas(), getCapacidad()]);
  const porCod = new Map(empresas.productos.map((p) => [p.cod, p]));
  const fasDe = new Map(cap.granos.map((g) => [g.underlying, g] as const));

  const granos: SemaforoGrano[] = GRANOS.map((g) => {
    const declarado = g.cods.reduce((s, c) => s + (porCod.get(c)?.declarado60d ?? 0), 0);
    const originado = g.cods.reduce((s, c) => s + (porCod.get(c)?.originado60d ?? 0), 0);
    const ratio = ratioCobertura(declarado, originado);
    const fisico = senalDe(declarado, originado).tag;
    const price = fasDe.get(g.precio);
    const fas = price?.fas ?? null;
    const pizarra = price?.pizarra ?? null;
    const spread = fas !== null && pizarra !== null ? Math.round((fas - pizarra) * 10) / 10 : null;
    const l = lectura(fisico, spread);
    return { key: g.key, nombre: g.nombre, declarado, originado, ratio, fisico, fas, pizarra, spread, ...l };
  });

  const problemas = [...empresas.meta.problemas, ...cap.meta.problemas];
  const status: Meta["status"] = empresas.meta.status === "real" ? "real" : "parcial";
  return {
    fecha: empresas.fecha,
    granos,
    meta: { source: SOURCE, updatedAt: cap.meta.updatedAt, status, problemas },
  };
});
