# Sesión 2026-07-10 — Portal de noticias (rediseño + cron)

- **Rama:** `claude/news-section-redesign-k3zctf` · **PR:** #_ (base `main`)
- **Objetivo pedido por Lautaro:** convertir la sección de Noticias en un portal con estética
  mejorada, categorización PROPIA (no la de BCR), leyendo TODAS las fuentes de `FUENTES.md`, con un
  cron horario que las scrapea/trae.

## Hecho
- **Categorización propia por reglas** (`src/lib/noticias-reglas.json` + `noticias-clasificar.ts`):
  6 categorías por tema — Mercados y precios · Economía y política · Internacional · Clima ·
  Logística y puertos · Empresas y negocios. Clasificador por palabras clave (normaliza sin acentos,
  primera categoría que matchea gana, orden de específica→general). Filtro de **ruido** (`esRuido`):
  descarta páginas de servicio/widget (dólar por provincia, "Clima en X hoy", pizarra diaria). Todo
  editable desde el JSON, fuente de verdad única compartida por la web y el cron.
- **Cron horario** (`.github/workflows/ingest-noticias.yml`, `0` a los :17 de cada hora +
  `workflow_dispatch`) que corre `scripts/ingest-noticias.mjs`: recorre 15 fuentes (RSS + scrapes),
  clasifica, dedup por link, y **upsert a Supabase** (tabla `noticias`, PostgREST merge-duplicates por
  PK link, preserva `creado_en`, actualiza `visto_en`). Mismo patrón que `ingest-cierres`.
- **Tabla `noticias`** (migración `20260709190000_create_noticias.sql`, aplicada por MCP): `link` PK,
  titulo, fuente, categoria, fecha_pub, visto_en, creado_en. RLS lectura anon, escribe service_role.
  Índices por `creado_en desc` y `categoria`. Guarda SOLO titular+fuente+link (link-out, sin cuerpo).
- **Web lee de Supabase** (`src/lib/noticias.ts` reescrito, usa `sbSelect`), con **fallback en vivo**
  (BCR + 3 RSS) marcado PARCIAL si la tabla no responde o está vacía (p. ej. antes de la 1ª corrida).
- **Rediseño del panel**: `noticias-panel.tsx` (server) + `noticias-client.tsx` (client) con **chips de
  filtro** por categoría (contador por chip), **grilla de tarjetas** con glifo por categoría, hairline
  dorado, fuente + tiempo relativo ("hace 6 h"); al filtrar, la categoría se expande a 2 columnas.
  CSS `news-*` reescrito en `globals.css`. Link "Noticias" agregado al nav (`site-header.tsx`).

## Decisiones tomadas (y por qué)
- **Categorización por tema, no por cultivo** (elección de Lautaro). Reglas por palabras clave (no IA):
  gratis, determinístico y corregible editando el JSON.
- **Fuentes sumadas** (verificadas con request real): La Nación Campo, Clarín Rural, Agrositio
  (granos/economía/clima), dataPORTUARIA, TodoAgro, Cebada Cervecera, Agrofy News (scrape de portada,
  no tiene RSS), G1 Agronegócios (Brasil) y World-Grain (internacional) — sumadas a las 4 previas.
- **Fuentes descartadas** (no viables por ahora): Reuters (401 a bots), Bloomberg/Márgenes (paywall),
  Barchart/AgWeb/DTN (sin RSS abierto / titulares por JS), Canal Rural (sitio caído), Notícias
  Agrícolas (sin RSS; Brasil queda por G1), Valor Soja (su feed redirige a Bichos de Campo).

## Verificado
- `npm run lint` + `npx tsc --noEmit` + `npm run build` ✅.
- **Dry-run del cron** contra las fuentes reales: 13/15 OK, ~190 titulares, buena distribución por
  categoría. **Ingesta real** ejecutada → tabla con 56 titulares, 16 fuentes, 6 categorías (tras
  limpiar 14 filas de ruido con la misma regla).
- **Render end-to-end** (dev server con anon key real + capturas en claro/oscuro + filtro): panel con
  stamp REAL, 6 categorías, filtro operativo, sin titulares de servicio. Verificado el filtro de ruido
  con casos (6 servicio + 5 notas reales, todos correctos).

## Ampliación de fuentes (tras #13) — bolsas, internacional, informes e instituciones vía Google News
- Pedido de Lautaro: sumar noticias de las **bolsas** (Rosario/BsAs/Córdoba) referidas a sus informes,
  **Reuters/Bloomberg**, y **CIARA / Grupo CREA / Aapresid / Coninagro**.
- **Ninguna tiene feed directo usable** (BCR sin RSS; Bolsa de Cereales BsAs tras Cloudflare; Córdoba y las
  4 instituciones sin feed; Reuters bloquea bots + discontinuó RSS; Bloomberg paywall). Verificado con
  requests reales.
- Solución: **nuevo tipo de fuente `gnews`** en `scripts/ingest-noticias.mjs` que consulta **Google News
  RSS** (titular + `<source>` con el medio real + link a la nota; link-out puro). 9 consultas nuevas:
  bolsas ×3, internacional (inglés, trae Reuters/Bloomberg/AgWeb/Pro Farmer/CME), informes (USDA/CONAB/
  CFTC), e instituciones ×4. Categorización propia + filtro de ruido iguales; `def` por fuente.
- **Dedup por título** (además de la de link): la misma nota llega directo (link del medio) y por Google
  (link redirect) → se colapsa quedándose con el registro directo/con fecha. Nuevo `claveTitulo` exportado
  de `noticias-clasificar.ts`, aplicado en el cron y en `agrupar` (web).
- Salvedad de Reuters/Bloomberg: el link va vía Google y al hacer clic puede aparecer SU paywall (solo
  linkeamos, no republicamos). El resto de FUENTES.md que no son medios (USDA/CONAB/pizarra/NABSA…) siguen
  siendo insumo del futuro **Calendario de informes**, no del feed.
- Verificado: dry-run 22/24 fuentes OK, 305 titulares únicos, 6 categorías; render sin duplicados de
  link/título ni warnings; lint + tsc + build ✅. La 1ª carga con las fuentes nuevas se dispara corriendo
  el cron a mano tras el merge.

## Ajuste posterior (mismo día, tras el merge del PR #12) — ventana de "últimos 3 días hábiles"
- Pedido de Lautaro: no mostrar noticias más viejas que los **últimos 3 días hábiles** (antes la ventana
  era 72 h fijas). Cambio SOLO de display en `src/lib/noticias.ts`: nuevo `corteHabilesMs(3)` (usa
  `hoyCordobaISO` de `dates.ts`) que calcula el 00:00 Córdoba del 3er día hábil más reciente (hoy cuenta
  si es hábil; salta sábados/domingos; sin feriados). Ej.: un lunes la ventana arranca el jueves anterior.
  Se aplica en el camino Supabase (se quitó el relleno con más viejas de `MIN_VIGENTES`) y en el fallback
  en vivo (conservando los titulares sin fecha del BCR del día). Verificado: lógica del corte OK para
  L/Mi/V/Sáb/Dom, y render real con máx antigüedad mostrada = 48 h (dentro de mié–vie). Va por un **PR
  nuevo** (el #12 ya estaba mergeado; la rama se reinició desde `main`).

## Quedó pendiente / en vuelo
- **[LAUTARO] Cargar el cron en Actions**: el schedule corre desde la rama default (`main`), así que
  recién queda activo al mergear el PR. Los secrets `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` ya existen
  (los usa `ingest-cierres`). Se puede lanzar a mano con "Run workflow" para la 1ª carga.
- Afinar palabras del clasificador con el uso (algún título mixto USDA+clima cae en Clima por orden).
- A futuro: etiqueta por cultivo (soja/maíz/trigo) como filtro secundario; página `/noticias` dedicada
  si se quiere más que el panel; calendario de informes (Fase 3, `FUENTES.md` §11).

## Trampas descubiertas (para la próxima sesión)
- **FUENTES.md no tiene URLs de feeds**: hubo que descubrir y verificar el RSS de cada medio.
- **Agrofy News no publica RSS** → se scrapea la portada (anchors `/noticia/…`, título en `<hN
  class="title">`). Frágil si cambian el HTML; el cron degrada solo si falla.
- **La Nación**: el feed que trae ítems es `.../rss/category/economia/campo/` (el de `campo/` a secas
  viene vacío).
- **dataPORTUARIA**: el feed sirve en `dataportuaria.com.ar/rss` pero los links apuntan a
  `dataportuaria.ar`; algunos ítems son viejos (filtro `MAX_EDAD_DIAS`).
- **En el sandbox**, para que el `fetch` de Node llegue a las fuentes: `NODE_USE_ENV_PROXY=1` +
  `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`. En Vercel/Actions no hace falta.
