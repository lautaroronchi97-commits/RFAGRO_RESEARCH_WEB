import { ZONA_CLAVES, PRODUCTO_CLAVES, type ZonaCamiones, type ProductoCamiones } from "./config";

/**
 * ⚠️ NO USADO en el build de C5 (23/07/2026) — decisión de Lautaro: cero dependencia de SAGyP/
 * MAGyP para camiones, TODO (zona y producto) sale de Williams Entregas vía export manual de
 * Agrochat (uploader en /admin/datos, ver williams.ts + config.ts:PRODUCTO_SERIE_CLAVES). Este
 * parser queda commiteado porque ya está escrito, testeado y funciona contra el HTML real — se
 * deja documentado por si algún día conviene retomar una ingesta automática complementaria (ej.
 * si Williams deja de estar disponible). NO está wireado a ningún script/cron/healthcheck.
 *
 * Parser puro del HTML diario de SAGyP/MAGyP — "Entrada diaria de camiones y vagones a puertos,
 * fábricas y molinos (por zona portuaria y por producto)" (negocio/08 y negocio/09, URL real
 * verificada 23/07/2026 con request real). Alimenta la dimensión PRODUCTO (automática, única
 * fuente) y, de paso, guarda su propia lectura de ZONA como referencia (fuente='magyp' — la
 * dimensión zona "de verdad" es Williams, cargada a mano, ver williams.ts).
 *
 * Estructura de la tabla verificada por request real (23/07/2026, mes JULIO 2026, ver
 * docs/negocio/09 y el HTML crudo): una `<table class="tabla">` con 2 filas de encabezado, una
 * fila por día con 14 celdas (fecha + 13 valores en orden fijo) y una fila final `Acumulados`
 * (con `<th>`, se descarta). Orden de columnas fijo y documentado acá — no se re-detecta por
 * label en cada corrida porque el layout ya se verificó estable en 6 PDFs de años distintos
 * (negocio/09 §FASE 1b).
 *
 * Módulo PURO (sin red/DB) para poder testearlo con un fixture del HTML real.
 */

const MESES_LARGO: Record<string, number> = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
  JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
};
const MESES_ABREV: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
};

export type FilaDiariaSagyp = {
  fecha: string; // ISO
  zona: Record<ZonaCamiones, number>;
  totalZona: number;
  producto: Record<ProductoCamiones, number>;
  totalProducto: number;
  vagonesPlaya: number;
};

export type ParseSagypResult = {
  filas: FilaDiariaSagyp[];
  mesAnio: string | null; // "2026-07" para logging
  identidadesRotas: number; // filas donde zona-sum o producto-sum != la columna "total" (solo aviso)
};

/** "1.887" (miles con punto) → 1887. Sin decimales esperados (son cantidades de camiones). */
function numSagyp(raw: string): number {
  const t = raw
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  if (t === "" || t === "-") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

/** Texto plano de una celda (sin tags, sin acentos escapados raros — el sitio usa UTF-8 directo). */
function textoCelda(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/** Encuentra el bloque de la tabla principal (class="tabla", no "tabla2") dentro del HTML. */
function extraerTablaPrincipal(html: string): string | null {
  const m = html.match(/<table[^>]*class="tabla"[^>]*>([\s\S]*?)<\/table>/i);
  // El grupo captura es obligatorio (sin `?`) en el regex — si `m` matcheó, m[1] existe siempre;
  // el `?? null` solo satisface el tipo sin asumir con `!` (nunca se ejercita esa rama en la práctica).
  return m ? (m[1] ?? null) : null;
}

/** "JULIO 2026" (dentro del th rowspan=2 de cabecera) → { mes, anio }. */
function mesAnioDeCabecera(tabla: string): { mes: number; anio: number } | null {
  const m = tabla.match(/<th[^>]*rowspan=["']?2["']?[^>]*>\s*([A-ZÁÉÍÓÚÑ]+)\s+(\d{4})\s*</i);
  if (!m) return null;
  const mes = MESES_LARGO[(m[1] ?? "").toUpperCase()];
  const anio = Number(m[2] ?? "");
  if (!mes || !Number.isFinite(anio)) return null;
  return { mes, anio };
}

/** "22-jul" (sin año, el año sale de la cabecera) → día del mes. null si no matchea. */
function diaDeFila(raw: string): { dia: number; mesAbrev: number | null } | null {
  const m = textoCelda(raw)
    .toLowerCase()
    .match(/^(\d{1,2})-([a-zé]{3})$/);
  if (!m) return null;
  const dia = Number(m[1] ?? "");
  const mesAbrev = MESES_ABREV[m[2] ?? ""] ?? null;
  if (!Number.isFinite(dia) || dia < 1 || dia > 31) return null;
  return { dia, mesAbrev };
}

/**
 * Parsea la tabla diaria de SAGyP. Orden fijo de columnas (verificado 23/07/2026):
 *   0 fecha · 1 ROSARIO_ALEDANOS · 2 DARSENA_BSAS_ER · 3 NECOCHEA · 4 BAHIA_BLANCA ·
 *   5 TOTAL CAMIONES (zona) · 6 TRIGO · 7 MAIZ · 8 SORGO · 9 CEBADA · 10 SOJA · 11 GIRASOL ·
 *   12 TOTAL X CAMIONES (producto) · 13 VAGONES EN PLAYA.
 * Filas completamente en cero (domingos/feriados, la tabla SÍ los lista con 0 en las 14
 * columnas) se DESCARTAN — no se persisten como "dato" (mismo criterio que el backfill de
 * Williams, que directamente no tiene fila esos días: la serie queda business-days-only en
 * ambas fuentes, sin ceros artificiales que arrastren el promedio móvil de la señal).
 */
export function parseTablaDiariaSagyp(html: string): ParseSagypResult {
  const tabla = extraerTablaPrincipal(html);
  if (!tabla) return { filas: [], mesAnio: null, identidadesRotas: 0 };

  const cab = mesAnioDeCabecera(tabla);
  const trs = tabla.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

  const filas: FilaDiariaSagyp[] = [];
  let identidadesRotas = 0;

  for (const tr of trs) {
    // Grupo obligatorio del regex (sin `?`) → cada match SIEMPRE trae el grupo 1; el `?? ""`
    // satisface el tipo (celdas queda string[], no (string|undefined)[]) sin cambiar el dato real.
    const celdas = [...tr.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) => m[1] ?? "");
    if (celdas.length < 14) continue; // filas de encabezado/nota (colspan) no tienen 14 celdas

    const fechaTxt = textoCelda(celdas[0] ?? "");
    const d = diaDeFila(fechaTxt);
    if (!d) continue; // "Acumulados" u otra fila especial

    if (!cab) continue; // sin mes/año de cabecera no se puede fechar (guard: filas=0 → exit 1 en el script)
    const mes = d.mesAbrev ?? cab.mes;
    const fecha = `${cab.anio}-${String(mes).padStart(2, "0")}-${String(d.dia).padStart(2, "0")}`;

    const v = celdas.slice(1, 14).map(numSagyp);
    // v SIEMPRE tiene 13 elementos acá (celdas.length>=14, confirmado arriba) → el `?? 0` de más
    // abajo nunca se ejercita en la práctica; se usa en vez de `!` porque 0 YA es la convención de
    // "sin dato" de `numSagyp` (celda vacía/"-" → 0), así que no introduce un valor ajeno al dominio.
    const [ros, dar, nec, bb, totZona, trigo, maiz, sorgo, cebada, soja, girasol, totProd, vagones] = v;

    // Fila 100% en cero (domingo/feriado sin actividad) → se descarta, no se persiste.
    if (v.every((x) => x === 0)) continue;

    const zona: Record<ZonaCamiones, number> = {
      ROSARIO_ALEDANOS: ros ?? 0, DARSENA_BSAS_ER: dar ?? 0, NECOCHEA: nec ?? 0, BAHIA_BLANCA: bb ?? 0,
    };
    const producto: Record<ProductoCamiones, number> = {
      WHEAT: trigo ?? 0, MAIZE: maiz ?? 0, SORGHUM: sorgo ?? 0, BARLEY: cebada ?? 0, SBS: soja ?? 0, SFSEED: girasol ?? 0,
    };

    const sumaZona = ZONA_CLAVES.reduce((acc, k) => acc + zona[k], 0);
    const sumaProd = PRODUCTO_CLAVES.reduce((acc, k) => acc + producto[k], 0);
    const totZonaN = totZona ?? 0;
    const totProdN = totProd ?? 0;
    if (Math.abs(sumaZona - totZonaN) > 1 || Math.abs(sumaProd - totProdN) > 1) identidadesRotas++;

    filas.push({ fecha, zona, totalZona: totZonaN, producto, totalProducto: totProdN, vagonesPlaya: vagones ?? 0 });
  }

  return {
    filas,
    mesAnio: cab ? `${cab.anio}-${String(cab.mes).padStart(2, "0")}` : null,
    identidadesRotas,
  };
}
