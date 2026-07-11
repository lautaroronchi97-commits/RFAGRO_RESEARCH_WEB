import REGLAS from "./noticias-reglas.json";

/**
 * Clasificador propio de titulares por palabras clave.
 * Las reglas (categorías + palabras + orden) viven en `noticias-reglas.json`,
 * compartido con el cron (`scripts/ingest-noticias.mjs`, que tiene una copia
 * espejo de estas ~20 líneas — si se cambia la LÓGICA acá, actualizar allá;
 * si solo se cambian PALABRAS, alcanza con editar el JSON).
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

/** minúsculas + sin acentos + solo [a-z0-9] separado por espacios simples, con padding. */
function normalizar(s: string): string {
  const plano = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ` ${plano} `;
}

const COMPILADAS = REGLAS.categorias.map((c) => ({
  id: c.id,
  palabras: c.palabras.map((p) => normalizar(p)),
}));

const RUIDO = REGLAS.ruido.map((r) => new RegExp(r, "i"));

/** true si el titular es una página de servicio/widget (no una noticia) → se descarta. */
export function esRuido(titulo: string): boolean {
  return RUIDO.some((re) => re.test(titulo));
}

/** Clave normalizada de un título, para deduplicar la misma nota que llega por más de una fuente. */
export function claveTitulo(titulo: string): string {
  return normalizar(titulo).trim();
}

/** Primera categoría (en el orden del JSON) con alguna palabra en el titular; si no, el default. */
export function clasificar(titulo: string, categoriaDefault?: string): string {
  const t = normalizar(titulo);
  for (const cat of COMPILADAS) {
    if (cat.palabras.some((p) => t.includes(p))) return cat.id;
  }
  return categoriaDefault ?? CATEGORIA_FALLBACK;
}
