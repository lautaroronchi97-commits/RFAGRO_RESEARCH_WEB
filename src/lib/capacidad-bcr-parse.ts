import { arNum } from "./env-utils";

/**
 * Parser puro (testeable) de la planilla de FAS Teórico de BCR — separado de `capacidad.ts`
 * (que trae "server-only" por el fetch) para poder testear la lógica de extracción con
 * fixtures de HTML real, sin red.
 *
 * Cada bloque "Commodity" de la planilla agrupa DOS granos en las mismas filas de costos/FAS
 * (ej. "Trigo / Wheat" + "Sorg/Srg"; "Soja / Soybeans" + "Gsl/Sunfl.") — el 1er valor numérico
 * de cada fila es SIEMPRE el grano listado primero (columna SAGyP, sin los colspans de las
 * posiciones forward "Up River") y el ÚLTIMO valor es SIEMPRE el grano listado segundo (también
 * SAGyP, también sin forwards — sorgo y girasol solo cotizan spot en esta planilla). Verificado
 * por consistencia aritmética real: impuestos ÷ FOB = alícuota de derechos de exportación
 * vigente, exacto, para los 5 granos (docs/sesiones/2026-07-24-c16-capacidad-pago.md).
 */

// Fragmento inicial de la etiqueta del "Commodity" (split por "/" del texto real) → underlying.
const GRANOS_COMMODITY: Record<string, string> = {
  Trigo: "TRI",
  Maíz: "MAI",
  Maiz: "MAI",
  Soja: "SOJ",
  Sorg: "SOR",
  Gsl: "GIR",
};

export type FilaBcr = {
  fob: number | null;
  impuestos: number | null;
  gastosPuertos: number | null;
  gastosComerc: number | null;
  fas: number | null;
};
export type ParseBcrResult = { porGrano: Record<string, FilaBcr>; fecha: string | null };

function filaVacia(): FilaBcr {
  return { fob: null, impuestos: null, gastosPuertos: null, gastosComerc: null, fas: null };
}

/** Todos los números de una fila (celdas de datos, sin la etiqueta de la 1ª columna). */
export function numerosDeFila(cells: string[]): number[] {
  const nums: number[] = [];
  for (const c of cells.slice(1)) {
    const v = arNum(c);
    if (v != null && Number.isFinite(v)) nums.push(v);
  }
  return nums;
}

/** Asigna el 1er valor de la fila al grano listado primero, y el ÚLTIMO al listado segundo (si hay 2). */
export function asignarFilaGrano(
  porGrano: Record<string, FilaBcr>,
  granosBloque: string[],
  campo: keyof FilaBcr,
  nums: number[],
) {
  if (granosBloque.length === 0 || nums.length === 0) return;
  const primero = granosBloque[0]!; // length===0 ya salió arriba
  const filaPrimero = porGrano[primero];
  if (filaPrimero && filaPrimero[campo] == null) filaPrimero[campo] = nums[0]!;
  if (granosBloque.length > 1 && nums.length > 1) {
    const segundo = granosBloque[granosBloque.length - 1]!;
    const filaSegundo = porGrano[segundo];
    if (filaSegundo && filaSegundo[campo] == null) filaSegundo[campo] = nums[nums.length - 1]!;
  }
}

/**
 * Parsea el segmento HTML `#sheet` (ya recortado antes de "Industria Aceitera" por el caller)
 * en un mapa grano → {fob, impuestos, gastosPuertos, gastosComerc, fas} + la fecha del informe.
 */
export function parseBcr(html: string, granosOrden: readonly string[]): ParseBcrResult {
  const i = html.indexOf("sheet-wrapper");
  if (i < 0) return { porGrano: {}, fecha: null };
  let seg = html.slice(i, i + 60_000).replace(/<style>[\s\S]*?<\/style>/g, " ");
  const cut = seg.indexOf("Industria Aceitera"); // corta antes del complejo aceitero (FAS Industria, fuera de alcance)
  if (cut > 0) seg = seg.slice(0, cut);

  const fm = seg.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const fecha = fm ? `${fm[3]}-${fm[2]}-${fm[1]}` : null;

  const porGrano: Record<string, FilaBcr> = {};
  for (const u of granosOrden) porGrano[u] = filaVacia();

  let granosBloque: string[] = [];
  for (const rowHtml of seg.split(/<\/tr>/)) {
    const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
      .map((m) => (m[1] ?? "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()) // grupo obligatorio del regex
      .filter(Boolean);
    if (cells.length === 0) continue;
    const head = cells[0]!; // cells.length===0 ya salió arriba

    if (head.startsWith("Commodity")) {
      granosBloque = [];
      for (const c of cells.slice(1)) {
        const key = c.split("/")[0]!.trim(); // split() nunca da array vacío
        const g = GRANOS_COMMODITY[key];
        if (g && !granosBloque.includes(g)) granosBloque.push(g);
      }
    } else if (head.startsWith("FOB comprador")) {
      asignarFilaGrano(porGrano, granosBloque, "fob", numerosDeFila(cells));
    } else if (head.startsWith("a) Impuestos")) {
      asignarFilaGrano(porGrano, granosBloque, "impuestos", numerosDeFila(cells));
    } else if (head.startsWith("b) Gastos en puertos")) {
      asignarFilaGrano(porGrano, granosBloque, "gastosPuertos", numerosDeFila(cells));
    } else if (head.startsWith("c) Gtos. Comerc")) {
      asignarFilaGrano(porGrano, granosBloque, "gastosComerc", numerosDeFila(cells));
    } else if (head.startsWith("FAS Teórico")) {
      asignarFilaGrano(porGrano, granosBloque, "fas", numerosDeFila(cells));
    }
  }
  return { porGrano, fecha };
}
