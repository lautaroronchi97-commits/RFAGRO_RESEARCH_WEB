import REGLAS from "./noticias-reglas.json";

/**
 * Clasificador + relevancia de titulares. Reglas y palabras en `noticias-reglas.json`,
 * compartido con el cron (`scripts/ingest-noticias.mjs`, que tiene un espejo de esta
 * LÓGICA — si se cambia la lógica acá, actualizar allá; si solo cambian PALABRAS,
 * alcanza con editar el JSON).
 */

export const CATEGORIAS: { id: string; nombre: string }[] = REGLAS.categorias.map((c) => ({
  id: c.id,
  nombre: c.nombre,
}));
export const ORDEN_PANEL: string[] = REGLAS.ordenPanel;
export const CATEGORIA_FALLBACK: string = REGLAS.fallback;

export function nombreCategoria(id: string): string {
  return CATEGORIAS.find((c) => c.id === id)?.nombre ?? id;
}

/** minúsculas + sin acentos + solo [a-z0-9] con padding + arreglo de siglas (EE.UU.→eeuu). */
function normalizar(s: string): string {
  let plano = ` ${s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
  for (const [buscar, reemplazo] of REGLAS.siglas) plano = plano.split(buscar).join(reemplazo);
  return plano;
}

const COMPILADAS = REGLAS.categorias.map((c) => ({
  id: c.id,
  palabras: c.palabras.map((p) => normalizar(p)),
}));
const EXCLUSION = REGLAS.exclusion.map((p) => normalizar(p));
const GRANOS = REGLAS.granos.map((p) => normalizar(p));
const RUIDO = REGLAS.ruido.map((r) => new RegExp(r, "i"));
const TIERS: [number, string[]][] = Object.entries(REGLAS.fuenteTier).map(([t, arr]) => [Number(t), arr]);

/** true si el titular es una página de servicio/widget/interés-humano → se descarta. */
export function esRuido(titulo: string): boolean {
  return RUIDO.some((re) => re.test(titulo));
}

/** true si el título trae alguna señal de grano (para co-ocurrencia y relevancia). */
export function tieneSenalGranos(titulo: string): boolean {
  const t = normalizar(titulo);
  return GRANOS.some((g) => t.includes(g));
}

/** true si es ganadería / economía regional (se excluye salvo que también hable de granos). */
export function esExcluido(titulo: string): boolean {
  const t = normalizar(titulo);
  return EXCLUSION.some((e) => t.includes(e)) && !GRANOS.some((g) => t.includes(g));
}

/** Categoría por primera coincidencia, o `null` si NINGUNA palabra matchea (no hubo señal temática). */
export function clasificarStrict(titulo: string): string | null {
  const t = normalizar(titulo);
  for (const cat of COMPILADAS) {
    if (cat.palabras.some((p) => t.includes(p))) return cat.id;
  }
  return null;
}

/** Categoría con default de fuente cuando no matchea nada (para fuentes especializadas confiables). */
export function clasificar(titulo: string, categoriaDefault?: string): string {
  return clasificarStrict(titulo) ?? categoriaDefault ?? CATEGORIA_FALLBACK;
}

/**
 * ¿La nota es RELEVANTE para decidir? true si matchea alguna categoría temática y NO está excluida.
 * Se usa para el gate estricto de fuentes generalistas (cron) y como filtro de display (web).
 */
export function esRelevante(titulo: string): boolean {
  if (esRuido(titulo) || esExcluido(titulo)) return false;
  return clasificarStrict(titulo) !== null;
}

/** Prioridad editorial de una fuente (0 = mejor). Para elegir representante de cluster y rankear. */
export function fuenteTier(fuente: string): number {
  const f = ` ${fuente.toLowerCase()} `;
  for (const [tier, patrones] of TIERS) {
    if (patrones.some((p) => f.includes(p))) return tier;
  }
  return 2;
}

/** Clave normalizada de un título, para deduplicar la misma nota que llega por más de una fuente. */
export function claveTitulo(titulo: string): string {
  return normalizar(titulo).trim();
}
