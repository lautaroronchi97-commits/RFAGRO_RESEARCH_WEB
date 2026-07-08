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

> **Directorio completo de fuentes de noticias/informes/datos del agro** (relevamiento de Lautaro, 06/07/2026):
> [`docs/FUENTES.md`](FUENTES.md) — oficiales AR, bolsas, cadenas por cultivo, mercados, logística, clima,
> internacional (USDA/CONAB/etc.), consultoras, medios y calendario de publicación. Alimenta el módulo
> **Noticias** (fuentes propias) y el futuro **Calendario de informes**.
>
> **Base de conocimiento del negocio** (correacopio / mesa de trading, referencia permanente):
> [`docs/negocio/`](negocio/) — `01_contexto_negocio` (estructura, instrumentos, pricing, estrategias,
> financiero, glosario) · `02_logicas_y_principios` (reglas + **REGLAS DEL DELTA** §6) ·
> `03_modulo_comportamiento_cliente_vendedor` (scoring AHP + P&L, producto a futuro) ·
> `04_datos_y_workarounds` (intranets de acopios, reportes, parseo de exports). Sin datos personales.

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
| 1 | Arbitrajes | **REAL** (`arbitrajes-cierres.ts` + `arbitrajes-editable.tsx`): futuro (ajuste A3/CEM) vs pizarra USD de CAC (`pizarra.ts`, scrape + override). **Pizarra editable** (recalcula TNA en vivo). Spread + tasa directa + **TNA USD** (días al vto desde `vencimientos`) + Vol. |
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
- **Capacidad de pago REAL** (`capacidad.ts` + `capacidad-panel.tsx`): FAS Teórico de BCR (scrape de la
  planilla `#sheet` de "Precios FOB/FAS Argentina", fila "FAS Teórico en u$s", 2º valor = Up River Rosario;
  parser verificado). Muestra pizarra CAC al lado como contexto. Override `CAPACIDAD_OVERRIDE` para el
  modelo propio de Lautaro. Sin históricos (decisión de Lautaro). Ojo: el FAS tiene varias columnas
  (SAGyP/Up River/Brasil) — se toma Up River (Rosario), elegido por Lautaro.
- **Estado de rueda** (`rueda-status.tsx`): horarios oficiales Matba Rofex — Dólar 10:00–15:00, Agro
  10:30–17:00 (verificado en la página de horarios). Indicador abierto/cerrado en vivo, L-V, hora Córdoba.
  El reloj (`rueda-clock.tsx`) ya tickeaba solo (el `--:--:--` es el estado pre-hidratación).
- **Volumen en Arbitrajes** (columna Vol, desde `futuros_cierres.volume`). Volumen de pases NO disponible
  aún (el CEM no tiene instrumentos de pase → necesita el feed en vivo de A3).
- **Mejor para hacer caja** (`mejor-caja-panel.tsx`): ranking soja/maíz/trigo por MENOR tasa implícita
  (min TNA disponible vs posiciones siguientes). Reusa `getArbitrajes`.
- **Ajuste por posición fuera de pantalla**: se quitó `CierresPanel` de `page.tsx` (los datos quedan en
  Supabase para gráficos; el componente sigue en el repo por si se re-usa).
- **Pases = armados por patas** (verificado): el CEM NO publica instrumentos de pase (`MAI.ROS/POS1/POS2`);
  las cotizaciones de pase de la rueda + su volumen requieren el feed en vivo de A3 (cron 60s a definir).
- Limpieza: se quitó `pases` de ejemplo de `src/lib/sample.ts` (código muerto).

### Hecho (cont.) — pizarra editable, calculadoras, estrategias, noticias
- **Pizarra editable en Arbitrajes** (`arbitrajes-editable.tsx`, client): el disponible USD arranca con
  CAC y es editable con el precio del día → recalcula spread/tasa directa/**TNA en vivo** (días fijos del
  vto). Botón ↺ para volver al valor de CAC. El wrapper server pasa los datos al client.
- **Sección Calculadoras** (`page.tsx`): página agrupada en **Granos · Calculadoras · Dólar y tasas**
  (`.sec-title`), + **Noticias** arriba de todo.
- **Pago diferido → pesos** (`calc-diferido.tsx`): labels ARS + tasa pesos; el cálculo por interés simple
  no cambia (Lautaro: "está perfecto").
- **Negocios con pagos** (nueva, `calc-negocios-pago.tsx`): disponible USD = futuro ÷ (1 + tasa × días/365),
  interés simple; días del pago (hoy + 5 hábiles, editable) al vto; pesos = ⌊disponible × TC⌋ (TC a mano).
  Editables: futuro, vto, días de pago, tasa USD, TC. (Descuento simple confirmado por Lautaro.)
- **Carry implícito entre dos posiciones** (era "arbitraje disp/fut", `calc-arbitraje.tsx`): rename +
  relabel cercana/lejana; mismo cálculo (lejana/cercana − 1, TNA, spread).
- **Cotizador a fijar** (`calc-fijar.tsx` + `fijar.ts`): **solo deltas** (disponible − futuro), SIN costo
  de oportunidad; toggle **compro/vendo a fijar** (signo del resultado); **comparador con tasa editable**
  (TNA impl. vs tu tasa, verde si la supera; + "precio a tu tasa"); **tabla + gráfico del delta** (barras).
- **Cotizador por porcentaje** (`calc-porcentaje.tsx`): relabel (posición vendida / de fijación) + celda
  **Aforo (%)** que resta al **porcentaje lleno** (a cliente).
- **Cotizador con pases** (`calc-pases.tsx`): relabel (vendida / plazo de fijación) + **Quita (USD)** sobre
  el **spread lleno** (a cliente).
- **Estrategias con opciones** (`estrategias.ts` + `calc-estrategias.tsx`): reescrita como estrategias
  combinadas. Catálogo de ~27 estrategias (`docs/ESTRATEGIAS_CATALOGO.md`) mapeadas a **patas** (futuro/call/
  put, compra/venta, cttos); **menú con explicación al seleccionarla**; precio base + paso generan las patas;
  patas editables; **gráfico de payoff con breakevens** + línea del precio base; resumen (máx ganancia/pérdida,
  prima neta) + tabla de escenarios por strike. El collar quedó como un preset.
- **Noticias** (`noticias.ts` + `noticias-panel.tsx`): agregador con link-out (sin republicar texto).
  Scrape del **resumen de diarios de BCR** (categorizado: agronegocios/economía/región/internacionales, con
  link a la fuente) + **RSS** de InfoCampo, Bichos de Campo y Ámbito (de `FUENTES.md`). Parser verificado
  contra HTML+RSS reales. Cache 30 min, degrada solo. Panel arriba de todo.
- **Docs nuevos persistidos**: `FUENTES.md` (directorio de fuentes del agro), `docs/negocio/` (base de
  conocimiento del correacopio, con **REGLAS DEL DELTA** en 02 §6 / 03 §2), `ESTRATEGIAS_CATALOGO.md`.
- **CI corre lint**: `npm run lint` es parte del workflow `ci.yml` → correr `lint` + `typecheck` + `build`
  antes de pushear (una vez falló por `react/no-unescaped-entities` con comillas literales en JSX).

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

### Resuelto en la sesión (ya no bloquea)
- **Vencimiento por posición** (para días→TNA): sale del CEM `/api/v2/symbols` (`maturityDate`) → tabla
  `vencimientos`. No hizo falta regla manual.
- **Pizarra USD** de arbitrajes: **CAC-BCR** (scrape) + override `PIZARRA_OVERRIDE`; y editable en el panel.
- **Capacidad de pago**: **FAS teórico Up River (Rosario)** de BCR como base + override `CAPACIDAD_OVERRIDE`.
- **Noticias**: **BCR resumen + RSS** (InfoCampo, Bichos de Campo, Ámbito), link-out.
- **Cotizador a fijar**: solo deltas, sin costo de oportunidad, con comparador de tasa (confirmado).
- **Pago diferido**: pesos, interés simple (confirmado).

### Pendientes al cierre (para retomar)
1. **Cron de cierres (2 min de Lautaro)**: mergear `ingest-cierres.yml` a la rama default + cargar secrets
   `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`. Sin esto los cierres quedan al 3/7 (los `schedule` de Actions
   corren solo desde la rama default). Ídem para armar el resto de los crons (rueda, pizarra, ingest_log).
2. **Auto-curva A3 en las calculadoras**: que traigan la curva real por producto (desde `futuros_cierres`)
   en vez de precios a mano (hoy todas las calcs cargan precios manualmente).
3. **Feed A3 en vivo (cron 60s)**: cotizaciones de pase de la rueda + volumen de pases + comprador/vendedor
   (bid/ask) de arbitrajes/pases. El CEM (diario) no tiene nada de esto.
4. **Sintéticos TIR**: pago final por letra (IAMC `informeslecap` / Min. Economía).
5. **Estrategias**: costos/IVA por pata, primas/strikes reales (cadena CBOT/A3), avanzadas (calendarios de
   dos vtos, acumulador path-dependent).
6. **Modelo propio de Lautaro** para capacidad de pago (fórmula + ejemplo) vía `CAPACIDAD_OVERRIDE`.
7. **Fase 3**: calendario de informes (con `FUENTES.md`), lineups/camiones, reporte diario para WhatsApp,
   ratio maíz/soja, arbitraje Matba↔CBOT (factores bushel→tn en `docs/negocio/`).
8. **Módulo scoring de clientes** (`docs/negocio/03`): producto de consultora a futuro (no es panel de esta
   web; requiere datos de fijaciones de clientes + historial A3 externo).
