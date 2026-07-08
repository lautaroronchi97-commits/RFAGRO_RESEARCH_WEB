# RF AGRO — Contexto del proyecto (handoff para sesiones nuevas)

> Web de research de mercado de granos (Argentina) para la consultora **RF AGRO** (Lautaro + Mauro).
> Doble uso: panel para Lautaro (datos varias veces por día) + datos de cierre para clientes
> (productores / acopios). El tiempo real tick-a-tick lo maneja Lautaro aparte (Excel + eTrader);
> esta web es **demorado / varias veces por día**, no realtime.
>
> **Deploy:** https://rfagro-research-web.vercel.app · **Rama default:** `claude/new-session-frovqj` ·
> **Rama de trabajo actual:** `claude/financial-data-web-infra-whg41m`
>
> ⭐ **Lo más nuevo está en la sección "Sesión 08/07/2026" más abajo** (Supabase conectado, cierres
> A3 históricos, 8 calculadoras). Leé eso primero para el estado real.

## Cómo trabajar con Lautaro (reglas)
- Principiante en programación: explicá cada comando/concepto paso a paso.
- **No supongas nada**; ante dudas de negocio/dato/alcance, preguntá antes de avanzar.
- Incremental: plan → aprobación → construir → mostrar funcionando → validar. Commits frecuentes.
- **Las fórmulas financieras las define él**: antes de implementar una, confirmala con un ejemplo numérico.
- Secretos SOLO en variables de entorno, NUNCA en el repo.
- Conciso, sin relleno. Español rioplatense.

## Stack
Next.js 16 (App Router) + TypeScript · Tailwind v4 · next-themes · gráficos SVG a mano (Recharts previsto) ·
**Supabase (Postgres) CONECTADO** (lectura anon vía PostgREST) · cron por GitHub Actions · Deploy en Vercel.
TZ America/Argentina/Cordoba.

## Design system — "Pizarra electrónica" (aprobado; "afinar estética" pendiente)
Tokens en `src/app/globals.css`. Paleta del logo: verdes (RF `#2F6E34` / AGRO `#4E9C3A`) + trigo `#EFBF2E`;
fondo claro `#EDF2E3`. Semáforo vivo: pos `#16A34A`/`#37D982`, neg `#DC2626`/`#FF5C5C`. Dos temas:
claro (clientes) / oscuro "rueda" (trader). Fuentes Inter + JetBrains Mono (números tabulares).
Marca: **RF AGRO** (nunca "CONSULTAR"). Glifos trigo/soja/maíz, cinta tipo pizarrón.

## Fuentes de datos (Fase 0, validadas con requests reales) — todo REST
| Dato | Fuente | Endpoint / nota |
|------|--------|-----------------|
| Futuros granos + dólar (reales) | **A3 / Cocos xOMS** (Primary) | `api.cocos.xoms.com.ar`: `POST /auth/getToken` → `GET /rest/marketdata/get`, `GET /rest/instruments/bySegment` (segmentos **DDA** granos, **DDF** dólar) |
| Dólar futuro, volumen rueda, **oficial mayorista** | **MAE** | `api.marketdata.mae.com.ar` → `/api/mercado/resumen/DDF`, `/volumen-categoria/{ARS\|USD}`, `/resumen/FOR` (ticker **`UST$T`** = oficial mayorista/A3500) |
| Dólar linked, LECAPs, bonos | **data912** | `data912.com/live/arg_notes` (serie `D*`=linked, `S*`=LECAP), `/live/arg_bonds` |
| Oficial / MEP / CCL / mayorista | dolarapi + criptoya | `dolarapi.com/v1/dolares`, `criptoya.com/api/dolar` |
| Macro / reservas | BCRA v4 | `api.bcra.gob.ar/estadisticas/v4.0/monetarias` (v3 deprecada) |
| Pizarra soja/maíz/trigo | **CAC-BCR** | `www.cac.bcr.com.ar/es/precios-de-pizarra` (scrape HTML; trae `$` y `US$` + TC BNA) |

## Metodología de fórmulas (confirmada con Lautaro)
- **Referencia oficial = oficial mayorista MAE** (ticker `UST$T` de `resumen/FOR`). NO el minorista.
- **Dólar futuro** (spot = mayorista MAE, base 365): directa = Fut/Spot − 1 · TNA = directa × 365/días ·
  TEA = (Fut/Spot)^(365/días) − 1 · TEM = (1+TEA)^(1/12) − 1.
- **Dólar linked** (vs oficial MAE, base 365, misma lógica): TC implícito = Px/100 · spread of. = Oficial − TCimpl ·
  TNA/TEA/TEM con Oficial/TCimpl. Vencimiento inferido del ticker (`D` + dd + letra-mes + yy).
- **Arbitrajes granos** (a implementar al enchufar A3): tasa directa = (precio futuro / pizarra USD) − 1 ·
  TNA USD = INTRATE(hoy, vto, pizarra, precio, act/365). Pizarra USD desde CAC (+ override manual).

## Estado de módulos (`src/components/`)
| # | Módulo | Estado |
|---|--------|--------|
| 0 | Cinta | REAL (dólares). Pizarra en la cinta = ejemplo (falta usar CAC). |
| 1 | Arbitrajes | **EJEMPLO** (`src/lib/sample.ts`). Pendiente: A3 futuros DDA + pizarra CAC. |
| 2 | Pases | **EJEMPLO**. Pendiente: A3 spreads calendario DDA. |
| 3 | Dólar futuro | REAL (MAE) + TNA/TEM/TEA. |
| 4 | Dólar linked | REAL (data912) + TNA/TEM/TEA + spread oficial MAE. |
| 5 | Implícitas combinadas | REAL (futuro + linked); granos = ejemplo. |
| 6 | Sintéticos/LECAPs | PARCIAL: precios LECAP reales; TIR/sintético pendiente ("pago final por letra"). |
| 7 | Panel cambiario | REAL (volumen MAE). Compras netas BCRA = pendiente (sin API; proxy / vía X). |

## Secretos / entorno
- **A3** en variables de entorno (Vercel → Settings → Environment Variables): `A3_API_BASE=https://api.cocos.xoms.com.ar`,
  `A3_USERNAME`, `A3_PASSWORD`. Local: `.env.local` (git lo ignora; plantilla en `.env.local.example`).
  `src/lib/a3.ts` las lee de env. **Nunca** en el repo.
- **Red del entorno web (sandbox):** allowlist con los hosts de datos. Si una fuente da 403 del proxy, falta el host.
- **Sandbox tip:** el `fetch` de Node no usa el proxy → para ver datos reales corriendo local en el sandbox,
  usar `NODE_USE_ENV_PROXY=1 npm run dev` (o build). En Vercel no hace falta.

## A3 — verificado OK
Token válido, 349 instrumentos DDA (granos) + 69 DDF (dólar), market data real llegando. Formatos de símbolo:
futuros `SOJ.ROS/JUL26`, pases `MAI.ROS/SEP26/DIC26`, dólar `DLR/JUL26`; opciones traen strike+`C/P` (excluir),
disponible = `/DISPO`. **Límites:** no hay cap diario documentado; A3 recomienda WebSocket para MD en vivo;
el caché de Next ya acota las llamadas (una regeneración por ventana, no por usuario). Todo hoy es **REST**.

## Auditoría integral (07/07/2026) — hecha, Fase 0+A aplicada
Se auditó todo (arquitectura/datos, UI/UX, seguridad/repo) + plan por fases revisado por experto.
**Ya aplicado** (commit `fff4f40`): React.cache() dedup de fetches (16→6 por regeneración), Result
tipado + guards, stamps honestos (SourceStamp REAL/PARCIAL/EJEMPLO + "datos al HH:MM"), refresh
al volver a la pestaña, tema sin bloque @media duplicado, contraste AA, touch-action:pan-y,
headers de seguridad, robots noindex (mientras haya EJEMPLO), README real, CI (GitHub Actions),
favicon de marca. **Cero credenciales en historial de git (verificado).**

### Flujo de deploy (NUEVO — Fase 0)
- Rama **`main` = producción** en Vercel; el trabajo va en ramas `claude/*` → **Preview URL**;
  publicar = PR → merge a `main` (GitHub UI). Los pushes a ramas ya NO tocan producción
  (vigente cuando Lautaro complete el switch en Vercel: Settings → Environments → Production
  Branch → `main`). Env vars sensibles con scope **Production only**.
- Vercel Hobby es no-comercial → decidir upgrade a Pro ANTES de poner datos reales frente a clientes (C2).

## Sesión 08/07/2026 — Fase C aplicada (Supabase + cierres A3 + 8 calculadoras)

**Documentos de referencia creados** (leerlos para el detalle): `docs/INFRAESTRUCTURA.md`
(arquitectura y escalado), `docs/FORMULAS_EXCEL.md` (fórmulas reales del Excel RF),
`docs/ESTRATEGIAS_COMBINADAS.md` (opciones), `docs/PLANILLA_DIARIA.md` (modelos varios).

### Supabase — CONECTADO
- Proyecto **`lineup-argentina`** · ref **`gbpfgfeksqmzmsxnxiwg`** · región sa-east-1 (São Paulo).
  Org `chona97`. Se consolidó RF AGRO sobre este proyecto (no se creó uno nuevo).
- Tablas: `lineup` (~494k, scraper ISA Agents **frenado** desde ~jun), `djve` (MAGyP, **al día**),
  `compras` (% cosecha/priceado, **frenado**), **`futuros_cierres`** (cierres A3 granos).
- Vistas (lectura anon): `djve_resumen`, `futuros_cierres_ultimo` (curva = último cierre por posición).
- **`futuros_cierres`: 22.398 filas, 2021-07-08 → hoy** (SOJ 8.360 · MAI 7.324 · TRI 6.714), solo futuros.
- Web lee con **`src/lib/supabase.ts`** (PostgREST, clave publishable/anon, RLS solo-lectura).
- Env vars web: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (en Vercel + `.env.local`). Son PÚBLICAS (RLS protege).
- ⚠️ El MCP `execute_sql` de escritura estuvo **bloqueado en permisos** esta sesión → para escribir
  datos vía MCP usar **`apply_migration`** (sí funciona).

### Fuente CEM (Matba ROFEX) — la clave de los históricos de A3
- **`https://apicem.matbarofex.com.ar/api/v2`** — API REST PÚBLICA, sin auth, Swagger en `/swagger/v1/swagger.json`.
- `GET /closing-prices?product=&type=FUT&from=&to=&page=&pageSize=500&sortDir=ASC` → cierres por posición/día
  (settlement, OHLC, openInterest, volume, impliedRate, previousClose, change).
- **Claves aprendidas:** `type=FUT` trae **solo futuros** (sin `type` vienen opciones mezcladas, símbolo con
  espacio+strike+C/P, 10× más filas). `sortDir` en **MAYÚSCULAS**. Rangos de fechas amplios dan **HTTP 424** →
  el script parte en **ventanas de 180 días**. Productos grano: `SOJ/MAI/TRI Dolar MATba`.
- Otros endpoints útiles: `/spot-prices` (pizarra), `/daily|monthly|yearly-trading-volume`, `/spread` (pases),
  `/market-position-data`, `/downloads/*` (CSV). El CEM RECHAZA conexiones desde Supabase (SSL) → ingerir por Actions.

### Cron de ingesta (GitHub Actions)
- **`.github/workflows/ingest-cierres.yml`** (schedule `0 23 * * 1-5` post-cierre + `workflow_dispatch`).
  Corre **`scripts/ingest-cierres.mjs`** (fetch CEM → upsert Supabase por symbol+fecha).
- Secrets en GitHub → Settings → Secrets → Actions: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service_role,
  ESCRITURA, secreta). El workflow corre desde la rama default (por eso se mergeó el PR #1).
- Backfill manual: dispatch con inputs `from`/`to`. Ya se corrió el de 5 años.

### Paneles y calculadoras nuevos (todo client-side, rápido)
- **Paneles REALES nuevos:** DJVE (`djve-panel`), **Cierres A3** (`cierres-panel`, curva histórica).
- **8 calculadoras** (`src/components/calc-*.tsx` + `src/lib/*.ts`), fórmulas validadas con Lautaro / su Excel:
  pago diferido (diferido cobra más = base×(1+tasa×días/365), interés simple, días=excedente sobre 5 hábiles),
  arbitraje (tasa directa=fut/pizarra−1, TNA USD=INTRATE act/365), **estrategias combinadas** de opciones
  (payoff por patas, ~10 del catálogo INTAGRO), a fijar (curva+delta esperado), por porcentaje, pases,
  **costos Cocos** (tarifario web/app real humana/jurídica, comisiones % TNA prorrateadas por plazo).
- **Curva real conectada:** `src/lib/curva.ts` + `curva-picker.tsx` → arbitraje/a-fijar/%/pases autocompletan
  precio y vto desde `futuros_cierres_ultimo` (fórmulas siguen en `docs/FORMULAS_EXCEL.md`, hoja ARBITRAJES).

### Skills de gauss (github.com/gauss314/skills)
Catálogo de fuentes de datos. Útiles: `primary` (A3/Matba), `data912`, `mae`, `bcra-macro`, y para
**CBOT/metales/Merval/SPY/EWZ**: `barchart` / `investing` / `yahoo-finance`. (Resuelve la parte "internacional".)

### Estado de deploy / PRs
- **PR #1 MERGEADO** (infra Supabase + cron + calculadoras + cierres A3). Cron activo.
- **PR #2** (draft): calculadoras conectadas a la curva real de A3. Rama `claude/financial-data-web-infra-whg41m`.
- Conversión Chicago→USD/tn (para arbitraje CBOT): maíz ×0,3937 · soja/trigo ×0,3674 (`docs/PLANILLA_DIARIA.md`).
- ⚠️ Hoja "Clientes" de la planilla diaria = datos personales reales → NUNCA al repo; va en base con login.

## Pendientes (orden para retomar — plan completo en la conversación de auditoría)

**Punto B — paneles nuevos (con la historia ya cargada):** volumen negociado por producto (de `futuros_cierres`),
% sobre cosecha, total priceado/negociado, variación semanal USD, arbitraje Chicago↔Matba (con factores de arriba),
ratio maíz/soja, calendario de informes (bolsas/USDA/Conab), panel de **lineups** (datos ya en `lineup`),
**reporte diario** de operaciones (matba+volumen+CBOT+metales+Merval/SPY/EWZ). Reactivar scrapers `lineup`/`compras`.
**Antes de clientes:** Vercel Pro (Hobby es no-comercial) + robots→index. **Fuentes a definir con Lautaro:**
camiones en puerto, SIO Granos, compras netas BCRA, capacidad de pago.

### Pendientes previos (Fase B, siguen válidos)
**Fase B (estructura):**
1. B1 Resiliencia: tarjetas de degradación por panel desde el Result ("fuente caída" vs "sin datos");
   error.tsx como defensa extra. OJO: bajo ISR estático Suspense NO streamea — verificar en build de prod.
2. B2 Extraer `dates.ts` (hoyCordoba/diasHasta UTC-noon/ultimoDiaHabil), `tickers.ts`, `rates.ts`.
   [LAUTARO] 1 ejemplo numérico por fórmula como fixture.
3. B3 Tests (Vitest): rates → tickers → dates; a CI.
4. B4a Mobile tablas (.hide-sm/.hide-md + fade/hint) · B4b ChartFrame compartido + tabla fallback de
   implícitas + `noUncheckedIndexedAccess` · B4c InfoTip popover accesible.
**Fase C (piedra angular):**
5. C1 Supabase + cron por GitHub Actions (`snapshots` + `kv`; SOLO el cron llama a A3; token A3 en kv;
   workflow con `workflow_dispatch` y schedule `*/30 13-21 * * 1-5` UTC — corre desde la rama default).
6. C2 Arbitrajes + Pases REALES (snapshots + INTRATE [LAUTARO ejemplo numérico] + pizarra CAC con override).
7. C3 Sintéticos TIR ([LAUTARO] tabla "pago final por letra").
8. C4 Vista productor, PWA, calculadora, estética, charts históricos (re-evaluar Recharts), robots→index,
   compras BCRA manual.

## Comandos
- `npm run dev` (real en sandbox: `NODE_USE_ENV_PROXY=1 npm run dev`) · `npm run build` · push a la rama → deploy.
