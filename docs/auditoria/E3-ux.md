# Auditoría E3 — UX / navegación página por página (2026-07-21)

- **Rama:** `claude/auditoria-e3-ux-auikht` · **PR:** #_ (base `main`, draft hasta el OK)
- **Alcance:** las ~38 rutas del sitio (`(site)`, `(auth)`, `/admin`, 404) × 4 lentes (mesa · cliente ·
  mobile 390px · tema claro/oscuro), según el PROMPT E3 de [`PLAN_AUDITORIA.md`](../PLAN_AUDITORIA.md).
- **Cómo se verificó:** `npm install` + `.env.local` con las claves públicas Supabase (anon, RLS
  solo-lectura) → `NODE_USE_ENV_PROXY=1 npm run build && npm run start` con **datos reales**. Recorrido
  con Playwright (`chromium` pre-instalado) en claro/oscuro y 1440/390px → 152 capturas en
  [`screenshots-e3/`](screenshots-e3/) (`<ruta>--<tema>--<viewport>.png`). Para ver `/admin` y
  `/comercio/*` (gateadas con `requireAdmin` SIEMPRE) se usó un **bypass local temporal por env var**
  (`E3_AUDIT_BYPASS`, parcheando `dal.ts` + `proxy.ts`) que **NO se commiteó** — `git diff` verificado
  limpio y `grep` de rastro en `src/` en cero antes de cerrar. Degradaciones y timings comprobados con
  requests reales a PostgREST (anon) y al MCP de Supabase. `lint` + `tsc` + `build` en verde sin el bypass.

## Resumen ejecutivo

El sitio está **muy bien** en lo grueso: navegación por hub coherente, breadcrumbs en todas las
`(site)`, sellos con nombre de institución en granos/dólar/noticias, tema claro/oscuro parejo, marca de
agua en todos los charts, tablas de datos bajo cada gráfico, estados vacíos casi siempre prolijos y el
flujo de decisión de mesa (DIFERIR/VENDER YA/ATENCIÓN) legible de un vistazo en temperatura/señal.

Lo que hay que decidir/corregir se concentra en pocos puntos, dos de ellos **altos**: (H1) **`/comercio/
embarques` renderiza VACÍA** en producción — la vista `djve_embarques_mes` NO está materializada y
tira **HTTP 500 bajo concurrencia** (12/12 en la prueba), igual clase de bug que el timeout de
`djve_cobertura` que E1 ya arregló materializando; y (H2) en **mobile todas las páginas del sitio
tienen scroll horizontal** (~95px) porque el cluster `.head-tools` del header no colapsa. El resto son
medios/bajos: sellos "ISA Agents" (puente) en las 4 páginas de line-up (viola "institución sí, puente
no"), la **pizarra de la cinta y las implícitas de granos siguen en EJEMPLO** (causa del `noindex`
global), `/comercio` con ~70 filas DJVE vacías, `/produccion` sin las pestañas que pedía el plan, y el
404 default de Next en inglés. **Todo es FASE 1 (solo auditoría): no se tocó nada del producto.**

## Hallazgos (priorizados, el más grave primero)

| # | Hallazgo | Evidencia | Impacto | Esf. | Propuesta de fix | Decisión Lautaro |
|---|---|---|---|---|---|---|
| H1 | **`/comercio/embarques` sale VACÍA** ("Sin programa de embarques disponible") aunque el dato existe (JUL26 = 8,5 Mt en `djve_embarques_mes`). Causa: la vista NO está materializada → **12/12 HTTP 500 bajo concurrencia**; en el build (3 workers, fetch en paralelo) el fetch de la app timeoutea → prerenderiza vacío. | `screenshots-e3/comercio-embarques--*`; vista `view` en `pg_class`; prueba 12 concurrentes = 12×500; SQL con datos OK | **alto** · mesa (página insignia Fase 3 sin contenido en prod) | S | Materializar `djve_embarques_mes` (patrón `djve_cobertura`/`lineup_gap_hist`) + refresh en `ingest-lineup`. **Es fix de datos → E5/E1.** | |
| H2 | **Mobile: scroll horizontal en TODAS las `(site)`** (~95px). El cluster `.head-tools` (estado de rueda + horarios + botón "Modo rueda") mide **475px** y no colapsa → `document.scrollWidth`=485 con viewport 390. `/graficos` peor (741px). | prueba de overflow: body=485/vw=390 en 10/11 rutas; culpable `.head-tools` w=475 right=485 | **alto** · cliente + mesa en celular | S | Que `.head-tools` envuelva/oculte los horarios y achique el toggle < 480px (wrap o menú). Revisar `/graficos` (constructor). | |
| H3 | **Sello "ISA Agents" (proveedor técnico/puente) visible** en temperatura, empresas, embarques y señal → viola la regla "institución sí, puente no" (PLAN_UX). `/comercio/negociado` sí la cumple ("SIO Granos"). | `screenshots-e3/comercio-temperatura/empresas/senal/embarques--*` (sello "ISA Agents · SAGyP…") | medio · coherencia + cliente | S | Reemplazar "ISA Agents" por el rótulo de institución que elija Lautaro (ver Duda D5). Centralizar en `lineup/*` (`SOURCE`). | |
| H4 | **Pizarra de la cinta = EJEMPLO hardcodeado** (soja 312,9 / maíz 182 / trigo 207, `sample:true`) marcada "PROV", cuando la pizarra real de CAC ya existe (soja 339,67 en `/granos`). Inconsistencia visible home vs granos. | `src/lib/market.ts:261-263`; `screenshots-e3/home--light--desktop` (cinta "SOJA PIZARRA 312,9") vs `granos--light--desktop` (339,67) | medio · cliente + credibilidad | S | Enganchar `pizarra.ts` (ya existe) en la cinta y sacar los 3 literales. | |
| H5 | **`/dolar` · Implícitas combinadas usa datos de ejemplo** (`sample.ts`): la serie "Granos (ej.)" dibuja puntos dispersos (45%, −21,7%, −9,5%) que ensucian el chart. Es —con H4— la causa del **`noindex` global** del sitio. | `src/components/implicitas-panel.tsx:3,38`; `src/app/layout.tsx:23`; `screenshots-e3/dolar--light--desktop` | medio · cliente + SEO (bloquea salir de noindex) | S–M | Decisión de Lautaro (Duda D1): implementar granos real (dólar+granos ya están) o sacar la serie/panel. | |
| H6 | **`/comercio/empresas`: columna RITMO toda "—"**. La vista `lineup_estacional` (no materializada) tira **10/10 HTTP 500 bajo concurrencia** → `empresas.ts` degrada la columna. | `screenshots-e3/comercio-empresas--*` (RITMO vacío); prueba 10×500; `view` en `pg_class` | medio · mesa (feature muerta en pantalla) | S | Materializar `lineup_estacional` (mismo fix que H1). **→ E5/E1.** | |
| H7 | **`/comercio` (hub): tabla DJVE con ~70 filas en "—"** (ARVEJAS, AVENA, COLZA, CÁRTAMO… todos los productos sin actividad). Mucho ruido; obliga a scrollear una tabla casi vacía. | `screenshots-e3/comercio--light--desktop` (90 productos, ~20 con dato) | medio · cliente + mesa | S | Ocultar por default los productos con acumulado 0 (o "mostrar todos" plegado). | |
| H8 | **`/produccion` sin pestañas**: el plan pedía **Calendario / Estimaciones en dos pestañas** para no re-scrollear; hoy es un scroll único de **~20.000px** con la pizarra de estimaciones + gráfico enterrados al final. Además "← Volver al tablero" duplica el breadcrumb. | PLAN_CALENDARIO_PRODUCCION ("dos pestañas"); `screenshots-e3/produccion--light--desktop` (20798px) | medio · cliente + mesa | M | Partir en pestañas Calendario/Estimaciones (o cap "próximos N" + link "ver todo"). Sacar el back-link redundante. | |
| H9 | **404 = default de Next en inglés** ("This page could not be found."), sin marca, sin tema, sin link de vuelta. Contrasta con `/sin-acceso`, que sí está branded. | `screenshots-e3/404--light--desktop`; no existe `not-found.tsx` | medio · cliente | S | Agregar `app/not-found.tsx` branded (tema + "Volver al inicio"). | |
| H10 | **`/granos/view` filtra el error crudo de Postgres** al degradar: "No se pudo leer el view: permission denied for table views_mercado". (En prod con admin logueado lee bien vía JWT; el error se ve solo cuando no hay sesión admin.) | `screenshots-e3/granos-view--*`; `src/lib/views-mercado.ts` | bajo · mesa | S | Mensaje de degradación amable, sin nombre de tabla ni "permission denied". | |
| H11 | **Back-link "← <sección>" redundante con el breadcrumb** en las calculadoras (`/calculadoras/[slug]`) y `/produccion`: dos "volver" apilados. | `screenshots-e3/calc-estrategias--light--desktop`, `produccion--light--desktop` | bajo · consistencia | S | Elegir uno (el breadcrumb ya cumple); quitar el back-link. | |

## Dudas / decisiones para Lautaro

1. **D1 — Implícitas de granos (ejemplo) → ¿implementar o sacar?** Hoy `/dolar · Implícitas combinadas`
   dibuja una serie "Granos (ej.)" de `sample.ts` con puntos que no son datos reales. Dólar futuro y
   linked ya son reales. **Opción A:** conectar granos real (usar los arbitrajes ya calculados en
   `arbitrajes-cierres.ts`). **Opción B:** sacar la serie de granos del panel. Cualquiera de las dos
   **habilita quitar el `noindex` global** (junto con D2).
2. **D2 — Pizarra de la cinta (ejemplo) → conectar CAC real.** La pizarra USD de la cinta (soja 312,9 /
   maíz 182 / trigo 207) es un literal viejo; la real de CAC ya está en `pizarra.ts` (soja 339,67 hoy).
   ¿La enganchamos? (fix chico, cierra la 2ª causa del `noindex`).
3. **D3 — Home: ¿confirmás el layout actual?** El PLAN_UX §7 había cerrado "portada = solo titulares",
   pero la sesión *home-novedades* (20/07) sumó "El mercado hoy" + "Próximos informes" + "Última
   estimación". La home de hoy tiene las 3 cosas. ¿Queda así (parece mejor) o volvemos a solo titulares?
4. **D4 — `/produccion`: ¿pestañas o scroll único?** El plan pedía Calendario/Estimaciones en pestañas.
   Hoy es un scroll de 20.000px con las estimaciones al fondo. ¿Implemento las pestañas?
5. **D5 — Sello de las páginas de line-up: ¿qué institución mostramos?** Hoy dicen "ISA Agents" (el
   proveedor técnico del scraping), que la regla "institución sí, puente no" prohíbe. El line-up no tiene
   un organismo oficial único (sale de las terminales portuarias). ¿Qué rótulo querés? (ej. "Terminales
   portuarias · elaboración ROFO AGRO", "Line-up de buques", etc.).
6. **D6 — Números "VIEJA" enormes en `/comercio/empresas`** (soja 108.983.988 t · maíz 395.301.079 t
   declarado campaña vieja). Parecen acumular varias campañas, no una sola. ¿Es lo esperado o hay que
   revisar la atribución de campaña? (posible dato → **E1/E2**; lo dejo como duda por si tenés el criterio).

## Lo que está BIEN (no tocar)

- **`/granos`**: Arbitrajes (1ª col dinámica ajuste/último operado), Monitor de mercados (Chicago en
  USD/tn + macro, sello honesto "futuros demorados ~10 min"), Mejor caja, Pases, Capacidad de pago —
  densos pero legibles, sellos con institución real (Matba Rofex, BCR, MAE). Cotejan 1:1 con
  PLAN_MONITOR_MERCADOS y la sesión home-novedades.
- **`/graficos`** (modo Campañas): presets + constructor + chips-leyenda + banda/percentil + tabla de
  datos + marca de agua. Fiel a PLAN_GRAFICOS_SPREADS (CSV/PNG/copiar-link siguen siendo v2 conocido).
- **`/comercio/negociado`**: KPIs + tabla (% cosecha/priceado/saldo) + histograma con toggle + watermark;
  **sello "SIO Granos" cumple la regla** (Agrochat oculto).
- **`/comercio/temperatura` y `/senal`**: el veredicto de mesa (índice + verbo de acción) se entiende de
  un vistazo; cards claras.
- **`/noticias`**: portal completo (chips de categoría, "Lo importante hoy", columnas, fuentes visibles).
- **`/calculadoras`** (índice + 9 slugs): grilla limpia, cada calc con payoff/tablas + "¿Qué es esto?".
- **Auth**: `/ingresar`, `/registro`, `/recuperar`, `/pendiente`, `/sesion-cerrada`, `/sin-acceso` y la
  **landing `/bienvenida`** (venta completa) — prolijas, branded, con estados claros. `/admin` (5
  pestañas + uploader) bien estructurado, estados vacíos amables.
- **Transversal**: breadcrumbs en todas las `(site)`, tema claro/oscuro parejo (verificado en oscuro con
  datos), marca de agua en todos los charts, footer sin chips técnicos ("Elaboración propia ROFO AGRO").
- **Código muerto (semilla 3): NO hay.** `arbitrajes-table.tsx` es el wrapper server que renderiza
  `arbitrajes-editable.tsx` (client) — ambos se usan. Descartado como hallazgo.

## Por página (respuestas a las 4 preguntas del prompt)

> Formato: **[1]** ¿muestra lo que Lautaro quería (vs plan)? · **[2]** ¿qué se ve si la fuente falla? ·
> **[3]** mejorable · **[4]** coherencia. Solo se listan las páginas con algo que decir; el resto quedó
> en «Lo que está BIEN».

- **`/` (home)** — [1] Coincide con la sesión *home-novedades* (novedades + mercado hoy + informes +
  estimación + grilla), NO con el PLAN_UX viejo ("solo titulares") → ver **D3**. [2] Cada panel degrada
  solo (mercado-hoy/estimación desaparecen si vacío). [3] La **cinta muestra pizarra de ejemplo** (H4).
  [4] OK.
- **`/dolar`** — [1] Futuro/linked/sintéticos/panel cambiario reales; **implícitas granos ejemplo** (H5).
  [2] Paneles marcan "provisorio" y degradan. [3/4] H5.
- **`/comercio`** — [1] Hub con DJVE público (las tarjetas de análisis se ven solo a admin logueado —
  hoy, con login apagado, nadie las ve y las subpáginas quedan inaccesibles por `requireAdmin`; esperado
  pre-login). [3] **~70 filas DJVE vacías** (H7). [4] OK.
- **`/comercio/embarques`** — [1] Debería mostrar la matriz programa×mes (PLAN_PUERTOS Fase 3) pero
  **sale vacía** (H1). [2] El estado vacío es el que se ve SIEMPRE hoy. [3] H1 (materializar la vista).
- **`/comercio/empresas`** — [1] Gap/declarado/tabla OK; **RITMO vacío** (H6) y **VIEJA enorme** (D6).
  [2] Degrada por columna. [3] H6, D6.
- **`/comercio/{puertos,temperatura,senal}`** — [1] Fieles al plan. [3] Sello "ISA Agents" (H3);
  puertos: la tabla de buques mide ~11.000px (aceptable, es la lista completa filtrable). [4] H3.
- **`/produccion`** — [1] Tiene calendario + estimaciones pero **sin las pestañas del plan** (H8). [2]
  Paneles degradan solos. [3] H8 + back-link redundante (H11).
- **`/granos/view`** — [1] No verificable con contenido vía bypass (RLS admin real); código correcto
  (lee con JWT). [2] Degradación con **error crudo de Postgres** (H10).
- **`/calculadoras/[slug]`** — [3] back-link redundante con breadcrumb (H11); resto muy bien.
- **404** — [1/3/4] Default de Next en inglés (H9).

## Para otras etapas

- **→ E5 / E1:** materializar `djve_embarques_mes` y `lineup_estacional` (vistas no-materializadas que
  tiran 500 bajo concurrencia → H1 y H6). Mismo patrón ya aplicado a `djve_cobertura`/`lineup_gap_hist`.
  Verificar si conviene sumar refresh en `ingest-lineup` y cubrirlas en el healthcheck.
- **→ E1 / E2:** validar los montos "VIEJA" de `/comercio/empresas` (108 Mt soja / 395 Mt maíz) — posible
  acumulación de campañas (D6).
- **→ E4:** `sample.ts` (retiro coordinado con la decisión de D1) habilita evaluar quitar el `noindex`
  global; back-links redundantes (H11) son limpieza de layout.

## Fase 2 — correcciones implementadas (aprobadas por Lautaro 21/07)

Lautaro aprobó: materializar H1/H6, conectar la pizarra real + sacar las implícitas de granos (y quitar
el `noindex`), pestañas en producción, y los 6 fixes chicos (para H3 eligió **"solo quitar 'ISA Agents'"**).

| # | Qué se hizo | Archivos | Verificación |
|---|---|---|---|
| H1/H6 | `djve_embarques_mes` y `lineup_estacional` → matview; refresh agregado a `refresh_lineup_visitas()`. **Migración SOLO versionada** (la aplica el orquestador por MCP). Código sin cambios (mismo nombre). | `supabase/migrations/20260721180000_e3_matview_embarques_estacional.sql` | pendiente de aplicar la migración; el fix rinde recién ahí |
| H2 | `.head-tools` con `flex-wrap`; en ≤560px se ocultan los horarios de rueda (`.ruedas`). | `globals.css` | ✅ mobile 390px: body=390 (antes 485) en todas las `(site)` |
| H3 | Sacado "ISA Agents" de los 5 sellos (`SOURCE`) y de 3 textos "¿Qué es esto?". Puertos pasó a "Elaboración propia ROFO AGRO". | `lineup/{embarque,temperatura,foto,semaforo,empresas}.ts` + 3 `components/lineup/*` | ✅ `grep` de "ISA Agents" en cero + build |
| H4 | Cinta: pizarra real de CAC (`getPizarra`), sin literales de ejemplo, `change` null, degrada a "—". | `market.ts` | ✅ cinta muestra soja 339,7 (= arbitrajes), sin badge "PROV" |
| H5 | Sacada la serie "Granos (ej.)" de Implícitas combinadas; status pasa a real. | `implicitas-panel.tsx` | ✅ chart de 2 curvas limpias, sin "provisorio" |
| noindex | Quitado el `robots:{index:false}` global (ya no hay dato de ejemplo a la vista). Las páginas de mesa mantienen el suyo. | `app/layout.tsx` | ✅ home sin `<meta robots>`; produccion sigue noindex |
| H7 | DJVE oculta los productos con acumulado 0; nota "N productos sin declaraciones (ocultos)". | `djve-panel.tsx` | ✅ /comercio: 19 filas + "70 ocultos" (antes ~90) |
| H8 | `/produccion` en pestañas **Calendario / Estimaciones** (control segmentado). | `produccion-tabs.tsx` (nuevo) + `produccion/page.tsx` + `globals.css` | ✅ pestañas funcionan; estimaciones ya no al fondo de 20.000px |
| H9 | `app/not-found.tsx` branded (isotipo + "Página no encontrada" + volver, tema-aware). | `app/not-found.tsx` (nuevo) | ✅ 404 en español y con marca |
| H10 | `granos/view` deja de filtrar el error crudo de Postgres; mensaje amable, crudo al log. | `views-mercado.ts` + `granos/view/page.tsx` | ✅ build (contenido requiere admin real) |
| H11 | Sacados los back-links "← sección" redundantes con el breadcrumb. | `calculadoras/[slug]/page.tsx`, `produccion/page.tsx` | ✅ solo queda el breadcrumb |

**Verificado global:** `lint` + `tsc` + `build` en verde; navegación con datos reales (claro).

### Pendiente / no incluido en esta fase 2
- **Aplicar la migración H1/H6** (orquestador). Hasta entonces embarques sigue vacía y RITMO en "—".
- **H12 (bajo, no aprobado en el lote):** `/graficos` mantiene overflow horizontal en mobile (body=741px)
  por su constructor/chart propio — el fix de `.head-tools` (H2) no lo cubre. Queda para una próxima vuelta.
- **D6:** validar los montos "VIEJA" de `/comercio/empresas` (→ E1/E2).
