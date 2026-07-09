# PLAN — Bases de datos para gráficos de posiciones de futuros y spreads

> Sesión 09/07/2026 (rama `claude/futures-position-databases-j10vpr`). Objetivo: dejar en Supabase
> las tres bases que alimentan los futuros gráficos de la web — (1) posiciones CBOT, (2) posiciones
> A3 desde 2020, (3) pizarra Rosario histórica en $ y US$. Todas las fuentes de este plan fueron
> **verificadas con requests reales** en esta sesión (no es documentación de terceros).
> Estado de avance: ver `docs/ESTADO.md`.

## Estado actual verificado (Supabase, 09/07/2026)

| Tabla | Qué tiene | Veredicto para los gráficos |
|---|---|---|
| `futuros_cierres` | SOJ/MAI/TRI A3, **2021-07-08 → 2026-07-08**, 22.443 filas (settlement, OHLC, volumen, OI) | Falta el tramo **2020-01-01 → 2021-07-07** |
| `vencimientos` | 41 símbolos (solo posiciones vivas) | Para históricos NO hace falta ampliar: `MAX(fecha)` por símbolo en `futuros_cierres` ≈ último día de negociación |
| CBOT | **no existe** | Crear (dataset 1) |
| Pizarra histórica | **no existe** (solo scrape del día en `pizarra.ts`) | Crear (dataset 3) |

---

## Dataset 1 — CBOT: maíz (ZC), soja (ZS), trigo (ZW) desde 2020

**Fuente elegida (verificada de punta a punta):** API interno de Barchart, sin login:
`GET https://www.barchart.com/proxies/core-api/v1/historical/get?symbol={SYM}&fields=tradeTime.format(Y-m-d),openPrice,highPrice,lowPrice,lastPrice,priceChange,volume,openInterest&type=eod&limit=1000&order=asc&startDate=&endDate=`
- Auth: visitar antes `barchart.com/futures/quotes/{SYM}/overview` con User-Agent de navegador,
  guardar cookies y mandar header `x-xsrf-token` (valor URL-decodificado de la cookie `XSRF-TOKEN`).
  Una sesión de cookies sirve para todos los símbolos.
- **Devuelve contratos VENCIDOS completos** (probado: ZCH21 564 filas 2018→2021, ZSK22, ZWZ23,
  ZSN20 desde 2016) y vivos hasta hoy (ZCZ26). `lastPrice` en días liquidados = settlement
  (validado tick a tick contra Yahoo). Trae **open interest** (Yahoo no).
- Trampas: precios en formato fraccionario CBOT (`"454-6"` = 454 6/8 ¢/bu → convertir en el
  script) · volumen/OI como string con miles · `limit` máx 1000 · la fila del día en curso es
  intradiaria (tomar T-1 o correr post-settle) · API no oficial → **correr el backfill YA** y
  que lo histórico quede nuestro en Supabase.

**Alcance (pedido de Lautaro: no irse a plazos largos):** solo cierres dentro de los **18 meses
previos al vencimiento** de cada contrato (`startDate` = vto − 18 meses). Meses de contrato:
ZC/ZW = H,K,N,U,Z (5/año) · ZS = F,H,K,N,Q,U,X (7/año) → **~110 contratos** desde 2020, ~1 request
c/u, una sola corrida de backfill.

**Fallback del cron (verificado):** Yahoo `query1.finance.yahoo.com/v8/finance/chart/{SYM}.CBT?range=5d&interval=1d`
— solo contratos vivos (los vencidos se borran por completo, hasta los de hace 2 meses), sin OI.
**Fallback pago si Barchart bloquea:** Databento (`GLBX.MDP3`, schema `ohlcv-1d`,
`stype_in=parent&symbols=ZC.FUT`) — el backfill entero son ~2-3 MB, lo cubre el crédito gratis
de USD 125 al crear cuenta.
**Descartados con evidencia:** CME oficial (solo ~5 días, bloqueó la IP por scraping, FTP
discontinuado ene-2024) · Stooq (challenge anti-bot, no scripteable) · Investing.com (Cloudflare +
solo contratos vivos) · Nasdaq CHRIS/SRF (deprecados).

**Tabla nueva `cbot_cierres`** (PK `symbol+fecha`, espejo de `futuros_cierres`):
`symbol` (ZCH21) · `fecha` · `producto` (ZC/ZS/ZW) · `posicion` (MAR21) · `vencimiento` ·
`settlement_centavos` (¢/bu crudo) · `open/high/low` · `volume` · `open_interest`.
Conversión a USD/tn en la capa web (factores ya validados en `docs/PLANILLA_DIARIA.md`:
maíz ×0,3937 · soja/trigo ×0,3674) — **confirmar con Lautaro antes de graficar**.

**Entregables:** `scripts/ingest-cbot.mjs` (mismo patrón que `ingest-cierres.mjs`: backfill con
`--from/--to` + cron de últimos días) · workflow `ingest-cbot.yml` (schedule post-settle CBOT,
~23:00 UTC L-V, + `workflow_dispatch` para backfill) · migración de la tabla.

## Dataset 2 — A3: SOJ/MAI/TRI desde 2020 (casi resuelto)

- **Verificado:** el CEM tiene cierres desde el **02/01/2020** (probado:
  `closing-prices?product=SOJ Dolar MATba&from=2020-01-02...` devolvió SOJ.ROS/ENE20 etc.).
- **No hay código nuevo:** correr el workflow `ingest-cierres.yml` a mano (Actions → Run workflow)
  con `from=2020-01-01`, `to=2021-07-08`. El script ya parte en ventanas de 180 días y hace upsert
  (re-correr es inocuo). Estimado: ~+6.500 filas.
- Vencimientos de posiciones vencidas: NO están en CEM `/symbols` (solo vivas, verificado) → para
  TNA histórica de spreads usar `MAX(fecha)` por símbolo como proxy del último día de negociación.

## Dataset 3 — Pizarra Rosario histórica en $ y US$ desde 2020

**Fuente elegida (verificada):** consulta histórica oficial de la propia CAC:
`GET https://www.cac.bcr.com.ar/es/precios-de-pizarra/consultas?product={13=soja|3=maíz|8=trigo}&type=any&period=day&date_start=2020-01-01&date_end=...`
- La serie completa viene embebida en el JSON `drupalSettings` de la página (`app_prices.plot.data`):
  cada punto trae fecha, **`y` = $/tn** e **`y_usd` = US$/tn**. Probado: soja = 1.578 puntos
  **2020-01-02 → hoy en UNA request**. La serie web arranca exactamente el 02/01/2020 — justo el
  rango pedido. (Girasol=9 y sorgo=6 también existen, salen gratis.)
- **US$ oficial de la CAC** (no hay que reconstruirlo): usa el dólar **BNA divisa comprador**
  (verificado numéricamente: 480.500 / 324,01 = 1.482,98 ≈ TC publicado 1.483). Ojo: NO es el
  A3500 del BCRA (~0,4% de diferencia, verificado contra API BCRA v4 idVariable 5). El TC
  implícito diario siempre se puede derivar como `y / y_usd`.
- **Estimativos:** los días sin pizarra la CAC publica precio estimativo (Dto. 1058/99);
  `type=any` los incluye con el mismo valor → flaguearlos con una consulta extra
  `type=estimativo` por grano (subconjunto exacto, verificado).
- Export XLSX oficial (`/es/api/prices/987/export?...`): solo trae $/tn → sirve de cross-check,
  no de fuente. Alternativa de respaldo verificada: series MAGyP Rosario (valores idénticos,
  solo $/tn). Descartados: datos.gob.ar (0 datasets), CEM spot-prices (sin granos, verificado),
  SIO Granos (inaccesible + conceptualmente es otra cosa: promedios de operaciones, no pizarra).

**Tabla nueva `pizarra_historico`** (PK `grano+fecha`):
`grano` (soja/maiz/trigo) · `fecha` · `precio_ars` · `precio_usd` · `es_estimativo` (bool).

**Entregables:** `scripts/ingest-pizarra.mjs` (backfill = 6 requests; cron = ventana móvil de
~10 días, que además **auto-corrige** las cotizaciones provisorias "sujetas a ajuste") · workflow
`ingest-pizarra.yml` (schedule ~21:00 UTC L-V + dispatch) · migración. El scrape actual del día
(`pizarra.ts`) queda como está para el panel en vivo.

---

## Orden de ejecución propuesto (una sesión por paso)

1. **Backfill A3 2020** (5 min, sin código): dispatch de `ingest-cierres.yml` con
   `from=2020-01-01, to=2021-07-08` + verificación por SQL.
2. **Pizarra histórica**: migración + `ingest-pizarra.mjs` + backfill + cron. (La más simple y
   la fuente más estable → primera.)
3. **CBOT**: migración + `ingest-cbot.mjs` + backfill (~110 contratos) + cron con fallback Yahoo.
   Correrla pronto: el API de Barchart es no-oficial y conviene capturar lo histórico ya.
4. **Gráficos en la web** (sesión aparte): curvas de posiciones (A3 + CBOT), spreads entre
   posiciones, arbitraje A3↔CBOT (con la conversión USD/tn confirmada), pizarra vs futuros.

## Preguntas abiertas para Lautaro (antes de construir)

1. **Horizonte CBOT:** ¿18 meses previos al vencimiento está bien, o preferís otro corte?
   (A3 hoy lista posiciones hasta ~12 meses.)
2. **Unidades CBOT:** guardamos ¢/bu crudo y convertimos a USD/tn al graficar con los factores
   de la planilla (maíz ×0,3937 · soja/trigo ×0,3674). ¿Confirmás factores y enfoque?
3. **Pizarra:** ¿sumamos girasol y sorgo ya que la misma consulta los trae gratis?
4. **Arranque:** ¿ejecuto ya el paso 1 (backfill A3, cero riesgo) o esperás a ver todo junto?
