import "server-only";
import { cache } from "react";
import type { Meta } from "./market";

/**
 * Noticias del día del sector agro/economía. Combina:
 *  - el "Resumen de diarios" de BCR (formato que le gusta a Lautaro): titulares
 *    categorizados con link a la fuente original (agronegocios / economía /
 *    región / internacionales). Se toma título + fuente + link (NO el cuerpo).
 *  - RSS de medios que BCR no siempre cubre (InfoCampo, Bichos de Campo, Ámbito).
 * Fuentes en docs/FUENTES.md. Es un agregador con link-out (sin republicar texto).
 */

const BCR_URL =
  "https://www.bcr.com.ar/es/mercados/investigacion-y-desarrollo/resumen-de-noticias/resumen-de-diarios";
const CATS = ["AGRONEGOCIOS", "ECONOMÍA Y POLÍTICA", "REGIÓN CENTRO", "INTERNACIONALES"];
const NOMBRE_CAT: Record<string, string> = {
  AGRONEGOCIOS: "Agronegocios",
  "ECONOMÍA Y POLÍTICA": "Economía y política",
  "REGIÓN CENTRO": "Región centro",
  INTERNACIONALES: "Internacionales",
};
const FEEDS = [
  { url: "https://www.infocampo.com.ar/feed/", fuente: "InfoCampo" },
  { url: "https://bichosdecampo.com/feed/", fuente: "Bichos de Campo" },
  { url: "https://www.ambito.com/rss/economia.xml", fuente: "Ámbito · Economía" },
];
const EXCLUIR = /(bcr\.com\.ar|facebook|twitter|x\.com|linkedin|instagram|youtube|whatsapp|google|vercel)/i;

export type NoticiaItem = { titulo: string; fuente: string; link: string; fecha?: string };
export type NoticiaCategoria = { categoria: string; items: NoticiaItem[] };
export type FeedGrupo = { fuente: string; items: NoticiaItem[] };
export type NoticiasData = { categorias: NoticiaCategoria[]; feeds: FeedGrupo[]; meta: Meta };

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

function parseBcr(html: string): NoticiaCategoria[] {
  const pos = CATS.map((c) => ({ c, i: html.indexOf(`>${c}<`) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i);
  const out: NoticiaCategoria[] = [];
  for (let k = 0; k < pos.length; k++) {
    const cur = pos[k];
    const next = pos[k + 1];
    if (!cur) continue;
    const slice = html.slice(cur.i, next ? next.i : html.length);
    const anchors = [...slice.matchAll(/<a href="(https?:\/\/[^"]+)"[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/a>/gi)]
      .map((m) => ({ href: m[1] ?? "", text: decode(m[2] ?? "") }))
      .filter((a) => a.href && !EXCLUIR.test(a.href) && a.text);
    const items: NoticiaItem[] = [];
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
        items.push({ titulo: t.text, fuente, link: t.href });
      }
      if (items.length >= 6) break;
    }
    if (items.length) out.push({ categoria: NOMBRE_CAT[cur.c] ?? cur.c, items });
  }
  return out;
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decode(m[1] ?? "") : "";
}

function parseRss(xml: string, fuente: string, max = 4): NoticiaItem[] {
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  const items: NoticiaItem[] = [];
  for (const b of blocks) {
    if (items.length >= max) break;
    const titulo = pick(b, "title");
    const link = pick(b, "link");
    const fecha = pick(b, "pubDate");
    if (titulo && link) items.push({ titulo, fuente, link, fecha: fecha || undefined });
  }
  return items;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(9000),
      headers: { "user-agent": "Mozilla/5.0 (RFAGRO research)" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export const getNoticias = cache(async (): Promise<NoticiasData> => {
  const [bcr, ...feedRes] = await Promise.all([fetchText(BCR_URL), ...FEEDS.map((f) => fetchText(f.url))]);

  const categorias = bcr ? parseBcr(bcr) : [];
  const feeds: FeedGrupo[] = FEEDS.map((f, i) => {
    const xml = feedRes[i];
    return { fuente: f.fuente, items: xml ? parseRss(xml, f.fuente) : [] };
  }).filter((g) => g.items.length > 0);

  const hay = categorias.length > 0 || feeds.length > 0;
  const problemas: string[] = [];
  if (categorias.length === 0) problemas.push("Resumen BCR no disponible");
  if (feeds.length === 0) problemas.push("RSS de medios no disponibles");

  return {
    categorias,
    feeds,
    meta: {
      source: "BCR resumen + RSS medios",
      updatedAt: Date.now(),
      status: hay ? "real" : "parcial",
      problemas: hay ? problemas.filter((p) => !p.includes("no disponibles") || feeds.length === 0) : problemas,
    },
  };
});
