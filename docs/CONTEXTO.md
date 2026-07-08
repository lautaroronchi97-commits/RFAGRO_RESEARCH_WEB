# RF AGRO — Contexto del proyecto (handoff para sesiones nuevas)

> Web de research de mercado de granos (Argentina) para la consultora **RF AGRO** (Lautaro + Mauro).
> Doble uso: panel para Lautaro (datos varias veces por día) + datos de cierre para clientes
> (productores / acopios). El tiempo real tick-a-tick lo maneja Lautaro aparte (Excel + eTrader);
> esta web es **demorado / varias veces por día**, no realtime.
>
> **Deploy:** https://rfagro-research-web.vercel.app · **Rama de trabajo:** `claude/new-session-frovqj`

## Cómo trabajar con Lautaro (reglas)
- Principiante en programación: explicá cada comando/concepto paso a paso.
- **No supongas nada**; ante dudas de negocio/dato/alcance, preguntá antes de avanzar.
- Incremental: plan → aprobación → construir → mostrar funcionando → validar. Commits frecuentes.
- **Las fórmulas financieras las define él**: antes de implementar una, confirmala con un ejemplo numérico.
- Secretos SOLO en variables de entorno, NUNCA en el repo.
- Conciso, sin relleno. Español rioplatense.

## Stack
Next.js 16 (App Router) + TypeScript · Tailwind v4 · next-themes · gráficos SVG a mano (Recharts previsto) ·
Supabase (Postgres + Auth) **aún NO conectado** · Deploy en Vercel (auto-deploy al pushear la rama).
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
| 1 | Arbitrajes | **REAL** (`arbitrajes-cierres.ts`): futuro (ajuste A3/CEM) vs pizarra USD de CAC (`pizarra.ts`, scrape + override). Spread + tasa directa + **TNA USD** (días al vto real desde `vencimientos`, fuente CEM). |
| 2 | Pases | **REAL** (`pases-cierres.ts`): spread de ajuste + tasa directa + **TNA** (días entre vtos, tabla `vencimientos`). Falta comprador/vendedor. |
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

## Pendientes (orden para retomar — plan completo en la conversación de auditoría)
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

## Sesión 08/07/2026 (rama `claude/pending-tasks-vzoa3c`)

### Hecho en esta sesión
- **Pases REAL** (`src/lib/pases-cierres.ts` + `pases-panel.tsx`): deriva el pase = diferencia de
  ajuste (settlement) entre posiciones consecutivas del mismo grano, desde `futuros_cierres` (CEM en
  Supabase). Suma tasa directa (larga/cercana − 1, exacta, sin fechas). TNA pendiente (necesita días
  entre vencimientos). Verificado contra SQL: valores sensatos (contango/backwardation por cosecha).
- **Fix posiciones vivas** (`src/lib/futuros.ts`): la vista `futuros_cierres_ultimo` traía el último
  cierre de TODOS los símbolos históricos (JUL21, ABR22…). Ahora se filtran a vto ≥ mes actual (Córdoba).
  Corrige también el panel **Cierres**, que mostraba posiciones muertas como vigentes.
- **Arbitrajes REAL** (`arbitrajes-cierres.ts` + `pizarra.ts`): futuro (ajuste A3/CEM) vs pizarra USD
  de CAC-BCR (scrape del HTML `board-{grano}`, parser verificado, + override `PIZARRA_OVERRIDE`).
- **TNA USD real en Arbitrajes y Pases**: nueva tabla `vencimientos` (migración
  `20260708120000`, seed desde CEM `/api/v2/symbols` campo `maturityDate`) + `vencimientos.ts` +
  `dates.ts` (hoyCordobaISO/diasEntre/diasHasta). Arbitraje: directa × 365/(vto − hoy). Pase: directa
  × 365/(vto_larga − vto_cercana). Verificado por SQL (ej. TRI JUL26 +1,51% en 16 días → +34,5% TNA).
- Limpieza: se quitó `pases` de ejemplo de `src/lib/sample.ts` (código muerto).

### Fuentes validadas con request real (para lo que sigue)
- **Capacidad de pago = FAS Teórico** de BCR: `bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-1`
  (HTML por grano: FOB, retenciones, gastos, **FAS Teórico u$s**) + PDF de metodología. Base según Lautaro;
  después él pasa su propio modelo para chequear. Complemento: MINAGRI.
- **Sintéticos (pago final por letra)**: IAMC `iamc.com.ar/informeslecap/` — "Informe Letras y Bonos del
  Tesoro" trae el **pago al vencimiento (valor final)** por letra (PDF por fecha). Emisor oficial = Min. Economía.
- **CBOT (maíz/trigo/soja Chicago)**: no hay skill dedicado en gauss; se cubre con `barchart` / `investing` /
  `yahoo-finance`. `primary` es solo Matba ROFEX (no CBOT).
- **Pases CEM `/api/v2/spread`**: existe pero devolvió HTTP 400 con params mínimos (necesita product/from/to);
  NO fue necesario: los pases se calculan desde los cierres que ya guardamos.
- **Pizarra granos**: el `/api/v2/spot-prices` de CEM es **solo dólar** (BNA/USD G/BCRA), no granos → la
  pizarra USD de soja/maíz/trigo sale de **CAC-BCR** (scrape) o del FAS teórico BCR + override manual.
- **Noticias (nuevo pedido)**: `bcr.com.ar/es/mercados/investigacion-y-desarrollo/resumen-de-noticias/resumen-de-diarios`
  es el FORMATO que le gusta a Lautaro (HTML por categorías con links a las fuentes). Fuente propia a definir.
- **Reporte diario**: formato objetivo = **imagen/PDF para enviar por WhatsApp**.
- **Camiones en puerto**: fuente a confirmar (BCR suele tenerlo).

### ⚠ Cron de cierres NO corre solo (diagnóstico)
`.github/workflows/ingest-cierres.yml` **NO está en `main`** (la rama default). Los `schedule` de GitHub
Actions corren SOLO desde la rama default → nunca se disparó automático. Las 22.398 filas (hasta 2026-07-03)
son del backfill manual. **Para activarlo (lo hace Lautaro):** (1) mergear el workflow a `main`; (2) cargar
secrets del repo `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` (Settings → Secrets and variables → Actions).

### Pendiente de decisión de Lautaro (bloquea)
- **Arbitrajes reales**: regla de **vencimiento** por posición (para días→TNA) + fuente de **pizarra USD**
  (CAC scrape vs FAS teórico BCR vs override manual). Con eso Arbitrajes sale igual que Pases.
- **Capacidad de pago**: su propio modelo (fórmula + ejemplo numérico) además del FAS teórico de base.
- **Noticias**: qué fuente usamos (scrapear el resumen de BCR es su contenido editorial; mejor RSS de los
  medios originales o curaduría propia).
