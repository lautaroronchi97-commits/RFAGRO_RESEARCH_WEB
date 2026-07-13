# ESTADO — tablero vivo del repo (leer SIEMPRE antes de trabajar)

> Este archivo es cómo se comunican las sesiones de trabajo entre sí. Cada sesión lo lee al arrancar
> (entra automáticamente vía `CLAUDE.md`) y lo actualiza al cerrar. Es CORTO a propósito: la foto de
> **ahora**. El manual estable del proyecto es [`CONTEXTO.md`](CONTEXTO.md); el detalle de cada sesión
> vive en [`sesiones/`](sesiones/).

## Protocolo de sesiones (obligatorio)
1. **Al arrancar**: leer este archivo + la última entrada de `docs/sesiones/`. Trabajar en una rama
   `claude/*` creada **desde `main`**. Si la rama de la sesión no sale de `main` actualizado, rebasear
   primero (`git fetch origin main && git rebase origin/main`).
2. **Durante**: commits chicos y frecuentes. `npm run lint` + `npx tsc --noEmit` + `npm run build` antes
   de pushear (el CI corre eso mismo).
3. **Al cerrar**: en el MISMO PR de la sesión —
   - crear `docs/sesiones/AAAA-MM-DD-tema.md` (copiar [`sesiones/_TEMPLATE.md`](sesiones/_TEMPLATE.md));
   - actualizar la sección **«Ahora»** de este archivo (qué quedó hecho, qué quedó en vuelo);
   - tocar `CONTEXTO.md` SOLO si cambió algo estable (stack, fuentes, fórmulas, reglas).
4. **PRs**: un PR por sesión, **base `main`**, draft hasta que esté verificado. NUNCA contra otra rama.
5. **Prohibido**: pushear a `main` directo · abrir PRs contra ramas `claude/*` · duplicar apuntes de
   sesión en `CONTEXTO.md` (van en `sesiones/`).

## Ahora (última actualización: 13/07/2026 — Arbitrajes: 1ª columna en vivo + fix "no actualiza")

**🟡 EN VUELO (rama `claude/arbitrage-table-updates-lt5qhm`, PR #_) — Arbitrajes en vivo:**
- **Fix "no actualiza":** `RefreshOnFocus` solo refrescaba al volver a la pestaña → una pestaña abierta
  todo el día quedaba congelada. Ahora **poll cada 30s mientras hay rueda abierta** (`refresh-on-focus.tsx`
  + `algunaRuedaAbierta()` en `rueda.ts`); `/granos` bajó a `revalidate=30`.
- **1ª columna de Arbitrajes = referencia dinámica** (pedido de Lautaro): fuera de rueda muestra el
  **último ajuste**; al abrir la rueda se **borra el ajuste** y pasa al **último operado** en vivo de A3
  (— hasta la 1ª operación del día), y se sostiene post-cierre **hasta que sale el próximo ajuste**
  (`ruedaAgroCorrioHoy()` + `arbitrajes-table.tsx`). Spread/tasa directa/TNA se **recalculan sobre el
  operado** (confirmado "todo en vivo"). Header pasa a "Últ. operado" con punto en vivo. Sin A3 cae al ajuste.
- **Pizarra:** NO se tocó — Lautaro dijo que no actualizaba por el cron parado y lo arregla en otra sesión.
- Verificado: lint/tsc/build ✅ + test de la máquina de estados (7 momentos × 6 escenarios, todo OK)
  **+ VALIDADO EN VIVO en el Preview con la rueda abierta** (13/07 13:50 Córdoba): "Últ. operado" con
  A3 respondiendo en Preview (creds sí scopeadas), operado en vivo en las posiciones que operaron hoy
  (Soja NOV26 343,00 → +15,4% TNA) y "—" en las que no. Solo queda **mergear a `main`** (decisión de Lautaro).
  Detalle: [`sesiones/2026-07-13-arbitrajes-en-vivo.md`](sesiones/2026-07-13-arbitrajes-en-vivo.md).

---

**Contexto previo (12/07/2026 — Rediseño UX «web en capas» MERGEADO · Sesión C estimaciones Argentina):**

**✅ REDISEÑO UX «WEB EN CAPAS» MERGEADO a `main` (PR #22).** [`docs/PLAN_UX_NAVEGACION.md`](PLAN_UX_NAVEGACION.md): se dejó la tira vertical larga y se pasó a
**sitio por páginas (hub)** — portada tablero → clickeás un tópico y entrás a esa sección con link propio.
Decisiones de Lautaro: multipágina (no acordeón/pestañas de esqueleto) · **sin** vista trader "tira" (todos
por secciones) · calculadoras con **link propio** por calc · Noticias sección propia + titulares en Inicio ·
DJVE → sección propia "Comercio exterior" · fuentes **"institución sí, puente no"** (mostrar el organismo/
mercado de origen, ocultar el proveedor técnico; nunca "vía") · explicaciones "¿Qué es esto?" por calc/reporte.
Sitemap: Inicio · Granos · Dólar y tasas · Comercio exterior · Calculadoras · Gráficos · Producción · Noticias,
con layout compartido `(site)/layout.tsx`. **Fase 0 hecha** (layout compartido: route group `src/app/(site)/`,
nav a client component `usePathname`, URLs intactas). **Fase 1 (estructural) hecha** (sellos = `[origen] ·
Actualizado HH:MM` con nombre propio de institución — Matba Rofex, Bolsa de Comercio de Rosario, MAE, Mercado
de deuda local, SAGyP, USDA·CONAB; pie sin chips técnicos; cinta "prov."; marca `.st-prov`). Todo con
build/lint/tsc ✅. **Falta de Fase 1:** las notas al pie de los paneles aún nombran puentes → se limpian en la
**Fase 5** (capa explicativa). **Fase 2 hecha** (páginas por grupo aditivas `/granos /dolar /comercio
/calculadoras /noticias`; nav a los 7 destinos reales, activo por `pathname`; logo → Inicio). **Fase 3 hecha**
(la home dejó de ser la tira: ahora es el tablero = cinta + "Lo importante hoy" con titulares del día + grilla
de 7 tarjetas por sección; se sacaron los paneles de la home → fin de la duplicación). **Fase 4 hecha**
(calculadoras con link propio: `src/lib/calculadoras.ts` + `/calculadoras` índice de tarjetas + ruta dinámica
`/calculadoras/[slug]` con las 9 en SSG, slug inválido → 404). **Fase 5 hecha** (capa explicativa: componente
`que-es-esto.tsx` desplegable "¿Qué es esto?" en las 9 calcs + todos los reportes, reemplazando las notas al
pie; **se sacaron TODOS los puentes** que quedaban → barrido del HTML servido limpio; cierra el pendiente de la
Fase 1). **Fase 6 hecha** (migas de pan `Inicio › Sección › Subpágina` en el layout, `breadcrumbs.tsx`; nav
mobile scrollea horizontal; `noindex` se mantiene por datos provisorios). **✅ PLAN UX COMPLETO (Fases 0→6),
MERGEADO a `main` (PR #22).** Todo con build/lint/tsc ✅.
Detalle: [`sesiones/2026-07-12-plan-ux-navegacion.md`](sesiones/2026-07-12-plan-ux-navegacion.md).

**✅ SWITCH COMPLETO. Producción (Vercel) sirve `main`** con el rediseño premium + todos los paneles
de datos reales. Default de GitHub = `main` · Vercel Branch Tracking = `main`.

**Hecho esta sesión (rama `claude/session-c-local-production-pvqf6f`, PR #23 MERGEADO a `main`) — Sesión C: estimaciones Argentina:**
- **Ingestas + workflow**: `scripts/ingest-gea.mjs` (BCR-GEA: tablas `bcr-estimaciones` de soja/maíz/trigo +
  fecha/PDF del informe; **backfill Wayback** 2020→hoy por CDX), `scripts/ingest-dea.mjs` (DEA-SAGyP: POST del CSV
  oficial → nacional por cultivo/campaña de los 6 granos, snapshot semanal = vintage), `scripts/ingest-pas.mjs`
  (BCBA-PAS **probe-first, pendiente de validar desde Actions** — el dominio está tras Cloudflare; no inserta datos
  sin verificar ni scrapea noticias). Workflow único `ingest-estimaciones-ar.yml` (GEA mié + DEA vie + dispatch).
- **Comparador AR real**: la lib/UI ya eran genéricas → con GEA + DEA + USDA la pizarra muestra BCR vs SAGyP vs USDA
  lado a lado ("quién está más alcista"), el gráfico de evolución (BCR vs USDA por campaña) y las tarjetas de cambios.
  Dos fixes: `campaniaVigente` prefiere la última campaña **con producción** (BCR-trigo 29,5 de 2025/26, no "—" de
  2026/27); y la tarjeta de "Cambios" ahora usa el organismo real (antes mostraba "USDA" en la tarjeta de SAGyP).
- **Verificado**: lint/tsc/build ✅; parsers y lógica contra datos reales (GEA soja 51,5 / maíz 68 / trigo 29,5 Mt;
  backfill feb-2026 soja 48,0 = coincide con el plan; DEA soja 22/23 25,0 Mt = la sequía, soja 24/25 51,1 Mt); UI en
  navegador claro/oscuro (comparador AR de 3 vías, screenshots).
- **✅ SUPABASE POBLADO (12/07, post-merge)**: se corrieron los `workflow_dispatch` y **terminaron en verde** —
  *Ingesta estimaciones Argentina* (`backfill_gea` + `dea_since=2019` + `pas_probe`), *Ingesta USDA* (backfill 2020→
  + PSD) e *Ingesta CONAB* (full). Como cada script sale con error si el upsert falla, el `success` confirma que los
  datos entraron. Los crons ahora mantienen solo. **OJO ISR**: `/produccion` es estática con `revalidate=3600` →
  la pizarra real aparece en la próxima regeneración (~1 h) o con cualquier redeploy en Vercel.
- **⚠️ PAS (BCBA) — validar**: el `pas_probe` corrió dentro del run de Argentina; **falta leer el log** (Actions →
  *Ingesta estimaciones Argentina* → paso "PAS (BCBA)") para ver si la IP de Actions pasó el Cloudflare. Si pasó,
  endurecer el parser de `ingest-pas.mjs` con el HTML real y activarlo en el schedule; si no, respaldo por mail.
  El comparador AR ya es sólido con BCR + SAGyP + USDA. Detalle: [`sesiones/2026-07-12-estimaciones-argentina.md`](sesiones/2026-07-12-estimaciones-argentina.md).
- **✅ Módulo Calendario + estimaciones COMPLETO (A+B+C) y poblado**: solo resta validar el PAS (arriba).

**Hecho antes (rama `claude/session-b-pr20-wwijnz`, PR #21 mergeado) — Sesión B: ingestas USDA + CONAB:**
- **Ingestas + workflows**: `scripts/ingest-usda.mjs` (WASDE = producción por país incl. mundo + vintages;
  PSD bulk = área/rinde de los 6 granos + producción de girasol/sorgo/cebada — ZIP descomprimido sin
  dependencias), `scripts/ingest-conab.mjs` (`LevantamentoGraos.txt`, 27 UF → nacional Brasil, milho = 3
  safras, vintages 2017/18→hoy, fecha derivada por cadencia), `scripts/refresh-calendario.mjs` (centinela
  mensual del seed del año siguiente). Workflows `ingest-usda.yml` / `ingest-conab.yml` / `refresh-calendario.yml`.
- **UI de `/produccion`**: reemplazado el bloque "En construcción" por la **pizarra de estimaciones** (última
  por organismo/país/grano + Δ vs anterior, filtrable), el **gráfico de evolución** (SVG multi-serie, USDA vs
  CONAB) y las **tarjetas de cambios** del último informe (`estimaciones-panel/cliente.tsx`, `evolucion-chart.tsx`,
  `src/lib/estimaciones.ts`). **Home**: mini-tabla "Última estimación" (USDA, `estimaciones-mini.tsx`).
- **Verificado**: lint/tsc/build ✅; parsers y lógica contra datos reales (soja AR 48→50 Mt, soja BR CONAB
  177,6→180,25 Mt, maíz EEUU 406,4 Mt en Mt — no bushels); UI en navegador claro/oscuro (screenshots).
- **⚠️ FALTA POBLAR Supabase**: el MCP de este entorno no resolvió la aprobación de escritura. **Tras el merge,
  correr los `workflow_dispatch`**: *Ingesta USDA* backfill (from 2020-01) + snapshot_psd=true, e *Ingesta CONAB*
  full=true → después el cron mantiene solo. Hasta entonces la UI muestra el roadmap (degrada solo).
  Detalle: [`sesiones/2026-07-12-estimaciones-usda-conab.md`](sesiones/2026-07-12-estimaciones-usda-conab.md).
- **Sesión C (Argentina) HECHA** (arriba) — solo resta poblar Supabase por dispatch + validar el PAS desde Actions.

**Hecho antes (PR #20) — módulo Calendario de informes + estimaciones de producción:**
- **[`PLAN_CALENDARIO_PRODUCCION.md`](PLAN_CALENDARIO_PRODUCCION.md)**: investigación verificada con
  requests reales del núcleo v1 (USDA WASDE/PSD/NASS, CONAB, BCR-GEA, BCBA-PAS, DEA-SAGyP): qué publica
  cada uno, calendarios oficiales 2026, endpoints de datos e histórico/vintages desde 2020. FAO-AMIS tiene
  un proxy BigQuery abierto con vintages 2020→hoy de FAO+IGC+USDA (tier-2, candidato barato a sesión B).
  Un 2º pase de verificadores re-testeó los ~50 endpoints: todo se sostiene (ESMIS 0-indexed, ICS NASS
  sin TZID, Wayback OK para backfill GEA — en §8 del plan).
- **✅ SESIÓN A del build hecha**: tablas `calendario_informes` + `estimaciones_produccion`
  (migración `20260712020000`), motor `src/lib/calendario.ts` (seed oficial 2026 + reglas + hora DST-aware),
  panel "Próximos informes" en la home y **página nueva `/produccion`** con el calendario cronológico
  filtrable + sección de estimaciones "en construcción". Verificado con navegador (claro/oscuro) + build.
- **Sigue: Sesión B (USDA+CONAB) y C (Argentina)** — ingestas + vintages + pizarra de estimaciones +
  gráficos. El `refresh-calendario.yml` va con la B (en v1 el calendario rinde solo desde código).

**✅ LAS 3 BASES DE GRÁFICOS ESTÁN COMPLETAS (verificado por SQL el 11/07):** PR #10 mergeado
(merge #14) y **backfill CBOT ya corrido** — `futuros_cierres` 31.049 filas (2020-01-02→08/07,
feriado 9/7 de por medio) · `cbot_cierres` **28.915 filas, 129 contratos** (→09/07) ·
`pizarra_historico` 7.893 filas (→07/07). Los 3 crons corren solos. Ya no queda nada pendiente de
[`PLAN_BASES_GRAFICOS.md`](PLAN_BASES_GRAFICOS.md).

**✅ PANEL DE GRÁFICOS DE SPREADS COMPLETO Y EN PRODUCCIÓN (PR #17 mergeado, merge `55c68c0`)**
([`PLAN_GRAFICOS_SPREADS.md`](PLAN_GRAFICOS_SPREADS.md)) — página `/graficos` con dos modos:
- **Modo Campañas** (superponer años alineados al vto): motor de 2 patas (A3/CBOT/pizarra) × métrica
  (spread/ratio/crudas) · presets **15 calendar spreads** por grano (con salto de campaña) + **entre
  productos** + **Chicago** (A3 vs CBOT, mapeo empírico por correlación) · **banda histórica**
  min–máx+mediana · **percentil** hoy vs historia · **mes** en el eje días-al-vto.
- **Modo Período** (base vs varias posiciones sobre un año, eje calendario): base pizarra/posición,
  todas las posiciones que cotizan (las 2 cosechas) + filtro, presets de pizarra, cada línea hasta
  su vto.
- **Fase 0 (fixes):** guard del truncado 206 + `sbSelectAll` paginado (`supabase.ts`) · flag
  estimativo en `pizarra.ts` → el panel Arbitrajes marca "estimativa".
- **Arquitectura:** vista `series_catalogo` (351 series), `series.ts`/`derivadas.ts`,
  `/api/series` + `/api/series/catalogo`, Recharts 3.9.2, estado del modo Campañas en la URL.
- **Validado contra el Excel** (Playwright, claro/oscuro): spread 2021-04-05 = 125,6; ratio U7 =
  0,5796. Mapeo CBOT confirmado por SQL (ej. maíz ABR↔CBOT MAY, soja NOV↔CBOT JUL). CI verde.
  Decisiones (30 preguntas) e historia en `docs/sesiones/2026-07-11-plan-graficos-spreads.md`.

**Pendiente del panel de gráficos (v2, no bloquea nada — anotado a pedido de Lautaro 11/07):**
- Persistir el estado del **modo Período en la URL** (hoy solo el modo Campañas es compartible por link).
- **Ratio/base en %** (`pizarra/futuro − 1`) como métrica adicional.
- **Guardar presets del usuario** / compartir persistente (requiere login — P28).
- Export **PNG/CSV**, **media móvil**, subpanel de **volumen/OI**, tabla alternativa + guard "parcial".
- **P12** (relaciones % tipo "180% pizarra maíz" / "57% soja julio") y **P17** (serie continua
  front-month): faltan ejemplos numéricos reales de Lautaro.
- Ajustar/agregar presets cuando Lautaro los pida (P27 quedó con la lista actual).
- Import de las campañas 2018/2019 del Excel a una tabla aparte, si algún día las quiere para las bandas.

**Recién entrado a `main` de otras sesiones (contexto + pendientes de Lautaro):**
- **Calculadora "Negocios de planta" (PR #18, mergeada):** `src/components/calc-planta.tsx` en
  Calculadoras — arranca de un precio (pizarra CAC editable) y descuenta 6 rubros (contra flete,
  secada, merma volátil, paritaria, embolsado, otros) → Precio final + Total de gastos.
  Detalle: `docs/sesiones/2026-07-11-calc-negocios-planta.md`.
- **Portal de noticias (PR #12):** panel Noticias rediseñado (categorización propia por 6 temas, chips,
  15 fuentes) + cron horario `ingest-noticias.yml` → tabla `noticias`. Pendiente: 1ª carga a mano
  (Actions → *Ingesta noticias* → Run workflow); el cron arranca solo al estar en `main`.
  Detalle: `docs/sesiones/2026-07-10-portal-noticias.md`.
- **Feed A3 en vivo (PR #11):** Pases suma Comprador/Vendedor/Último/Vol del pase real y Arbitrajes suma
  Comprador/Vendedor del futuro (frescura ~60s por ISR, degrada solo sin creds). Pendiente: validar con
  datos reales en horario de rueda (10:30–17:00) tildando el scope Preview/Production en las 3 vars A3 de
  Vercel. Detalle: `docs/sesiones/2026-07-09-feed-a3-en-vivo.md`.

**Ramas vivas y su veredicto:**
| Rama | Estado |
|---|---|
| `main` | Única rama de integración y producción. |
| `claude/website-ux-redesign-plan-irvt6k` | Rediseño UX «web en capas» (PR #22 **MERGEADO**) → borrar. |
| `claude/timeline-spread-charts-plan-3zlt1g` | Panel de gráficos (PR #17 **MERGEADO**) → borrar. |
| `claude/production-forecast-calendar-zdpmd6` | Módulo calendario — plan + Sesión A (PR #20). |
| `claude/session-b-pr20-wwijnz` | Sesión B — ingestas USDA+CONAB (PR #21 **MERGEADO**) → borrar. |
| `claude/session-c-local-production-pvqf6f` | Sesión C — ingestas Argentina (GEA/DEA/PAS) + comparador AR (PR #23 **MERGEADO**, Supabase poblado) → borrar. Solo queda validar el PAS. |
| `claude/futures-position-databases-j10vpr` · `claude/feed-a3-live-plan-obxzcz` · `claude/news-section-redesign-k3zctf` · `claude/plant-business-calculator-0sf28m` | PRs #10/#14, #11, #12/#15/#16 y #18 ya mergeados → borrar. |

**Lo próximo (en orden — detalle en CONTEXTO «Pendientes»):**
0. **Gráficos de spreads — v2** (panel ya en producción): persistir el modo Período en la URL ·
   ratio/base en % · export PNG/CSV · media móvil · volumen/OI · presets del usuario (login) ·
   P12 (relaciones %) y P17 (serie continua) con ejemplos de Lautaro · import 2018/19. Lista
   completa arriba en «Ahora».
1. **Módulo Calendario + estimaciones — COMPLETO y poblado** (A+B+C + dispatches corridos en verde). Solo resta:
   **validar el PAS (BCBA)** — leer el log del `pas_probe` (Actions → *Ingesta estimaciones Argentina* → paso "PAS
   (BCBA)"); si la IP de Actions pasó el Cloudflare, endurecer el parser de `ingest-pas.mjs` con el HTML real y
   activarlo en el schedule; si no, respaldo por mail. Opcional: backfill histórico DEA por PDFs mensuales (`?mes=`)
   y el candidato tier-2 `ingest-amis.mjs` (proxy BigQuery de FAO-AMIS, vintages de 3 organismos).
2. **Fase 2 del Feed A3 — histórico intradiario**: cron GH Actions `*/15 13-20 * * 1-5` UTC +
   `scripts/ingest-rueda.mjs` + tabla `snapshots` + `ingest_log` (INFRAESTRUCTURA.md). Habilita gráficos
   intradía. (La frescura ya está resuelta web-directa; esto es SOLO para guardar historia.)
3. Sintéticos TIR (pago final por letra, IAMC). [Requiere tabla de Lautaro]
4. Fase B (resiliencia, tests, mobile) y backlog de datos (reactivar scrapers `lineup`/`compras`,
   lineups, calendario, reporte WhatsApp — lista completa en CONTEXTO «Pendientes» punto 5).
