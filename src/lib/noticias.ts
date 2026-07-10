import "server-only";
import { cache } from "react";
import type { Meta } from "./market";
import { sbSelect } from "./supabase";
import { CATEGORIA_FALLBACK, ORDEN_PANEL, clasificar, esRuido, nombreCategoria } from "./noticias-clasificar";

/**
 * Portal de noticias del agro. Fuente primaria: tabla `noticias` de Supabase,
 * que llena el cron HORARIO de GitHub Actions (scripts/ingest-noticias.mjs)
 * recorriendo ~15 fuentes de docs/FUENTES.md (RSS + scrapes) y clasificando
 * cada titular con las reglas PROPIAS de noticias-reglas.json (no las de BCR).
 *
 * Si la tabla no responde o está vacía (p. ej. antes de la primera corrida del
 * cron), degrada a una lectura EN VIVO reducida (resumen BCR + 3 RSS) con el
 * mismo clasificador, marcada como PARCIAL. Siempre link-out: titular + fuente
 * + link, nunca el cuerpo de la nota.
 */

const REVALIDATE = 600; // 10 min (el cron corre cada hora)
const VENTANA_MS = 72 * 3600_000; // qué se considera "noticia vigente"
const MIN_VIGENTES = 8; // si el fin de semana quedan menos, completar con las últimas
const MAX_POR_CATEGORIA = 12;

export type NoticiaItem = { titulo: string; fuente: string; link: string; fechaMs: number | null };
export type NoticiaCategoria = { id: string; nombre: string; items: NoticiaItem[] };
export type NoticiasData = {
  categorias: NoticiaCategoria[];
  total: number;
  nFuentes: number;
  generadoMs: number; // "ahora" para las horas relativas del panel (Date.now() vive acá, no en el render)
  meta: Meta;
};

/* ---------------- armado común ---------------- */

type ItemCat = NoticiaItem & { categoria: string };

function agrupar(items: ItemCat[]): NoticiaCategoria[] {
  const porCat = new Map<string, NoticiaItem[]>();
  for (const it of items) {
    if (esRuido(it.titulo)) continue; // descarta páginas de servicio (dólar por provincia, clima puntual…)
    const id = ORDEN_PANEL.includes(it.categoria) ? it.categoria : CATEGORIA_FALLBACK;
    const lista = porCat.get(id) ?? [];
    lista.push({ titulo: it.titulo, fuente: it.fuente, link: it.link, fechaMs: it.fechaMs });
    porCat.set(id, lista);
  }
  return ORDEN_PANEL.filter((id) => porCat.has(id)).map((id) => ({
    id,
    nombre: nombreCategoria(id),
    items: (porCat.get(id) ?? [])
      .sort((a, b) => (b.fechaMs ?? 0) - (a.fechaMs ?? 0))
      .slice(0, MAX_POR_CATEGORIA),
  }));
}

function contarFuentes(cats: NoticiaCategoria[]): number {
  return new Set(cats.flatMap((c) => c.items.map((i) => i.fuente))).size;
}

/* ---------------- fuente primaria: Supabase (cron horario) ---------------- */

type RawRow = {
  titulo?: string;
  fuente?: string;
  link?: string;
  categoria?: string;
  fecha_pub?: string | null;
  visto_en?: string | null;
  creado_en?: string | null;
};

function ms(s?: string | null): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

function desdeSupabase(rows: RawRow[]): NoticiasData | null {
  const items: ItemCat[] = [];
  let ultimoVisto = 0;
  for (const r of rows) {
    if (!r.titulo || !r.fuente || !r.link || !r.categoria) continue;
    ultimoVisto = Math.max(ultimoVisto, ms(r.visto_en) ?? 0);
    items.push({
      titulo: r.titulo,
      fuente: r.fuente,
      link: r.link,
      categoria: r.categoria,
      fechaMs: ms(r.fecha_pub) ?? ms(r.creado_en),
    });
  }
  if (items.length === 0) return null;

  const corte = Date.now() - VENTANA_MS;
  const vigentes = items.filter((i) => (i.fechaMs ?? 0) >= corte);
  const usar = vigentes.length >= MIN_VIGENTES ? vigentes : items.slice(0, 80);

  const categorias = agrupar(usar);
  return {
    categorias,
    total: categorias.reduce((n, c) => n + c.items.length, 0),
    nFuentes: contarFuentes(categorias),
    generadoMs: Date.now(),
    meta: {
      source: "Portal RF AGRO · ingesta horaria de medios",
      updatedAt: ultimoVisto || Date.now(),
      status: "real",
      problemas: [],
    },
  };
}

/* ---------------- fallback: lectura en vivo reducida (BCR + RSS) ---------------- */

const BCR_URL =
  "https://www.bcr.com.ar/es/mercados/investigacion-y-desarrollo/resumen-de-noticias/resumen-de-diarios";
const FEEDS_VIVO = [
  { url: "https://www.infocampo.com.ar/feed/", fuente: "InfoCampo", def: "mercados" },
  { url: "https://bichosdecampo.com/feed/", fuente: "Bichos de Campo", def: "mercados" },
  { url: "https://www.ambito.com/rss/economia.xml", fuente: "Ámbito", def: "economia" },
];
const EXCLUIR = /(bcr\.com\.ar|facebook|twitter|x\.com|linkedin|instagram|youtube|whatsapp|google|vercel)/i;

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dominio(url: string): string {
  const m = url.match(/^https?:\/\/(?:www\.)?([^/]+)/i);
  return m ? m[1] : url;
}

/** Titulares planos del "Resumen de diarios" de BCR (fuente = medio original). */
function parseBcr(html: string): ItemCat[] {
  const anchors = [...html.matchAll(/<a href="(https?:\/\/[^"]+)"[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/a>/gi)]
    .map((m) => ({ href: m[1] ?? "", text: decode(m[2] ?? "") }))
    .filter((a) => a.href && !EXCLUIR.test(a.href) && a.text);
  const items: ItemCat[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < anchors.length; ) {
    const t = anchors[i];
    if (!t) break;
    let fuente = dominio(t.href);
    const sig = anchors[i + 1];
    if (sig && sig.href === t.href) {
      fuente = sig.text;
      i += 2;
    } else {
      i += 1;
    }
    if (t.text.length > 25 && !seen.has(t.href)) {
      seen.add(t.href);
      items.push({
        titulo: t.text,
        fuente: `${fuente} (vía BCR)`,
        link: t.href,
        fechaMs: null,
        categoria: clasificar(t.text, "mercados"),
      });
    }
  }
  return items;
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decode(m[1] ?? "") : "";
}

function parseRss(xml: string, fuente: string, def: string, max = 10): ItemCat[] {
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  const items: ItemCat[] = [];
  for (const b of blocks) {
    if (items.length >= max) break;
    const titulo = pick(b, "title");
    const link = pick(b, "link");
    if (!titulo || !link) continue;
    const t = Date.parse(pick(b, "pubDate"));
    items.push({ titulo, fuente, link, fechaMs: Number.isNaN(t) ? null : t, categoria: clasificar(titulo, def) });
  }
  return items;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(9000),
      headers: { "user-agent": "Mozilla/5.0 (RFAGRO research)" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function enVivo(problema: string): Promise<NoticiasData> {
  const [bcr, ...feeds] = await Promise.all([fetchText(BCR_URL), ...FEEDS_VIVO.map((f) => fetchText(f.url))]);
  const items: ItemCat[] = bcr ? parseBcr(bcr) : [];
  FEEDS_VIVO.forEach((f, i) => {
    const xml = feeds[i];
    if (xml) items.push(...parseRss(xml, f.fuente, f.def));
  });

  const problemas = [problema];
  if (!bcr) problemas.push("Resumen BCR no disponible");
  const categorias = agrupar(items);
  return {
    categorias,
    total: categorias.reduce((n, c) => n + c.items.length, 0),
    nFuentes: contarFuentes(categorias),
    generadoMs: Date.now(),
    meta: {
      source: "Lectura en vivo (BCR + RSS)",
      updatedAt: items.length ? Date.now() : null,
      status: "parcial",
      problemas,
    },
  };
}

/* ---------------- API del panel ---------------- */

export const getNoticias = cache(async (): Promise<NoticiasData> => {
  const res = await sbSelect(
    `noticias?select=titulo,fuente,link,categoria,fecha_pub,visto_en,creado_en&order=creado_en.desc&limit=400`,
    REVALIDATE,
  );
  if (res.ok && Array.isArray(res.data)) {
    const data = desdeSupabase(res.data as RawRow[]);
    if (data) return data;
    return enVivo("Tabla noticias vacía (¿primera corrida del cron pendiente?) — lectura en vivo");
  }
  return enVivo("Supabase no disponible — lectura en vivo");
});
