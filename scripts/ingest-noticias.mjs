#!/usr/bin/env node
/**
 * Ingesta del portal de noticias: medios del agro → Supabase (tabla public.noticias).
 *
 * Corre cada hora por GitHub Actions (.github/workflows/ingest-noticias.yml).
 * Recorre TODAS las fuentes (RSS + scrapes), clasifica cada titular con las
 * reglas propias de `src/lib/noticias-reglas.json` (categorización RF AGRO,
 * no la de BCR) y upserta por link. Guarda SOLO titular+fuente+link (link-out,
 * nunca el cuerpo de la nota).
 *
 * Uso:
 *   node scripts/ingest-noticias.mjs             (ingesta + upsert)
 *   node scripts/ingest-noticias.mjs --dry-run   (muestra el resultado, no escribe;
 *                                                 no necesita env de Supabase)
 *
 * Requiere en el entorno (NO en el repo), salvo --dry-run:
 *   SUPABASE_URL           = https://<proyecto>.supabase.co
 *   SUPABASE_SERVICE_KEY   = service_role key (escritura; solo en el cron)
 *
 * Fuentes descartadas del directorio docs/FUENTES.md (verificado 09/07/2026):
 *   Reuters (bloquea bots, HTTP 401) · Barchart (titulares por JS/XHR) ·
 *   AgWeb (403) · DTN (sin feed) · Canal Rural (sitio caído) ·
 *   Notícias Agrícolas (sin RSS; Brasil queda cubierto por G1) ·
 *   Bloomberg / Márgenes Agropecuarios (paywall) ·
 *   Valor Soja (su feed redirige a Bichos de Campo: se fusionaron).
 */

import REGLAS from "../src/lib/noticias-reglas.json" with { type: "json" };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

const UA = "Mozilla/5.0 (compatible; RFAGROresearch/1.0; noticias)";
const MAX_POR_FUENTE = 25;
const MAX_EDAD_DIAS = 14; // ignora ítems viejos que algunos feeds arrastran
const BCR_URL =
  "https://www.bcr.com.ar/es/mercados/investigacion-y-desarrollo/resumen-de-noticias/resumen-de-diarios";

/**
 * `def` = categoría si ninguna regla matchea el titular (p. ej. todo lo de
 * World-Grain/G1 es internacional aunque el título no nombre países).
 */
const FUENTES = [
  { id: "bcr", nombre: "BCR · Diarios", tipo: "bcr", url: BCR_URL, def: "mercados" },
  { id: "infocampo", nombre: "InfoCampo", tipo: "rss", url: "https://www.infocampo.com.ar/feed/", def: "mercados" },
  { id: "bichos", nombre: "Bichos de Campo", tipo: "rss", url: "https://bichosdecampo.com/feed/", def: "mercados" },
  { id: "ambito", nombre: "Ámbito", tipo: "rss", url: "https://www.ambito.com/rss/economia.xml", def: "economia" },
  { id: "lanacion", nombre: "La Nación Campo", tipo: "rss", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/campo/?outputType=xml", def: "mercados" },
  { id: "clarin", nombre: "Clarín Rural", tipo: "rss", url: "https://www.clarin.com/rss/rural/", def: "mercados" },
  { id: "agrositio-granos", nombre: "Agrositio", tipo: "rss", url: "https://www.agrositio.com.ar/rss/rss.php?area=granos", def: "mercados" },
  { id: "agrositio-economia", nombre: "Agrositio", tipo: "rss", url: "https://www.agrositio.com.ar/rss/rss.php?area=economia", def: "economia" },
  { id: "agrositio-clima", nombre: "Agrositio", tipo: "rss", url: "https://www.agrositio.com.ar/rss/rss.php?area=clima", def: "clima" },
  { id: "dataportuaria", nombre: "dataPORTUARIA", tipo: "rss", url: "https://dataportuaria.com.ar/rss", def: "logistica" },
  { id: "todoagro", nombre: "TodoAgro", tipo: "rss", url: "https://www.todoagro.com.ar/feed/", def: "mercados" },
  { id: "cebada", nombre: "Cebada Cervecera", tipo: "rss", url: "https://www.cebadacervecera.com.ar/feed/", def: "mercados" },
  { id: "g1", nombre: "G1 Agronegócios", tipo: "rss", url: "https://g1.globo.com/rss/g1/economia/agronegocios/", def: "internacional" },
  { id: "worldgrain", nombre: "World-Grain", tipo: "rss", url: "https://www.world-grain.com/rss/articles", def: "internacional" },
  { id: "agrofy", nombre: "Agrofy News", tipo: "agrofy", url: "https://news.agrofy.com.ar/", def: "mercados" },
];

/* ---------------- clasificador (espejo de src/lib/noticias-clasificar.ts) ---------------- */

function normalizar(s) {
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

function clasificar(titulo, categoriaDefault) {
  const t = normalizar(titulo);
  for (const cat of COMPILADAS) {
    if (cat.palabras.some((p) => t.includes(p))) return cat.id;
  }
  return categoriaDefault ?? REGLAS.fallback;
}

const RUIDO = REGLAS.ruido.map((r) => new RegExp(r, "i"));

/** Descarta páginas de servicio/widget (cotización del dólar por provincia, clima puntual, pizarra diaria). */
function esRuido(titulo) {
  return RUIDO.some((re) => re.test(titulo));
}

/* ---------------- parsers (espejo de la lectura en vivo de src/lib/noticias.ts) ---------------- */

function decode(s) {
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

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decode(m[1] ?? "") : "";
}

function fechaISO(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseRss(xml, fuente) {
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  const items = [];
  for (const b of blocks) {
    if (items.length >= MAX_POR_FUENTE) break;
    const titulo = pick(b, "title");
    const link = pick(b, "link");
    if (titulo && link) items.push({ titulo, fuente, link, fecha_pub: fechaISO(pick(b, "pubDate")) });
  }
  return items;
}

/** BCR "Resumen de diarios": titulares con link al medio original. Se toman TODOS
 *  los titulares planos (las categorías de la página se IGNORAN: clasificamos nosotros).
 *  La fuente mostrada es el medio original (segundo anchor al mismo href), no BCR. */
const BCR_EXCLUIR = /(bcr\.com\.ar|facebook|twitter|x\.com|linkedin|instagram|youtube|whatsapp|google|vercel)/i;

function dominio(url) {
  const m = url.match(/^https?:\/\/(?:www\.)?([^/]+)/i);
  return m ? m[1] : url;
}

function parseBcr(html) {
  const anchors = [...html.matchAll(/<a href="(https?:\/\/[^"]+)"[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/a>/gi)]
    .map((m) => ({ href: m[1] ?? "", text: decode(m[2] ?? "") }))
    .filter((a) => a.href && !BCR_EXCLUIR.test(a.href) && a.text);
  const items = [];
  const seen = new Set();
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
      items.push({ titulo: t.text, fuente: `${fuente} (vía BCR)`, link: t.href, fecha_pub: null });
    }
  }
  return items;
}

/** Agrofy News no publica RSS: se toman los anchors /noticia/ de la portada
 *  (título en el <hN class="title"> interno). Verificado contra el HTML real. */
function parseAgrofy(html, base) {
  const items = [];
  const seen = new Set();
  for (const m of html.matchAll(/<a[^>]*href="(\/noticia\/\d+\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    if (items.length >= MAX_POR_FUENTE) break;
    const link = new URL(m[1], base).toString();
    if (seen.has(link)) continue;
    seen.add(link);
    const th = (m[2] ?? "").match(/<h\d[^>]*class="title"[^>]*>([\s\S]*?)<\/h\d>/);
    const titulo = decode(th ? (th[1] ?? "") : "");
    if (titulo.length > 25) items.push({ titulo, fuente: "Agrofy News", link, fecha_pub: null });
  }
  return items;
}

/* ---------------- fetch + upsert ---------------- */

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "*/*" },
    signal: AbortSignal.timeout(20000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function leerFuente(f) {
  const text = await fetchText(f.url);
  let items;
  if (f.tipo === "rss") items = parseRss(text, f.nombre);
  else if (f.tipo === "bcr") items = parseBcr(text);
  else items = parseAgrofy(text, f.url);

  const limite = Date.now() - MAX_EDAD_DIAS * 86400000;
  return items
    .filter((it) => !esRuido(it.titulo)) // descarta páginas de servicio/widget
    .filter((it) => !it.fecha_pub || new Date(it.fecha_pub).getTime() >= limite)
    .map((it) => ({
      link: it.link.slice(0, 600),
      titulo: it.titulo.slice(0, 300),
      fuente: it.fuente,
      categoria: clasificar(it.titulo, f.def),
      fecha_pub: it.fecha_pub,
      visto_en: new Date().toISOString(),
    }));
}

async function upsert(rows) {
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/noticias`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal", // upsert por PK (link)
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`upsert lote ${i}: HTTP ${res.status} ${await res.text()}`);
  }
}

async function main() {
  if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY en el entorno (o usar --dry-run).");
    process.exit(1);
  }

  const resultados = await Promise.allSettled(FUENTES.map((f) => leerFuente(f)));
  const all = [];
  let ok = 0;
  resultados.forEach((r, i) => {
    const f = FUENTES[i];
    if (r.status === "fulfilled") {
      ok++;
      console.log(`  ✓ ${f.id}: ${r.value.length} titulares`);
      all.push(...r.value);
    } else {
      console.log(`  ✗ ${f.id}: ${r.reason?.message ?? r.reason}`);
    }
  });

  // dedup por link entre fuentes (BCR suele linkear notas que también vienen por RSS)
  const seen = new Set();
  const rows = all.filter((r) => {
    if (seen.has(r.link)) return false;
    seen.add(r.link);
    return true;
  });

  const porCat = {};
  for (const r of rows) porCat[r.categoria] = (porCat[r.categoria] ?? 0) + 1;
  console.log(`Fuentes OK: ${ok}/${FUENTES.length} · titulares únicos: ${rows.length}`);
  console.log(`Por categoría: ${JSON.stringify(porCat)}`);

  if (ok === 0) {
    console.error("Todas las fuentes fallaron.");
    process.exit(1);
  }

  if (DRY_RUN) {
    for (const r of rows.slice(0, 40)) console.log(`  [${r.categoria}] ${r.titulo} — ${r.fuente}`);
    console.log("(dry-run: no se escribió nada)");
    return;
  }

  await upsert(rows);
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
