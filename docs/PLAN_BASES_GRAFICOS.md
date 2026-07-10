# Bases de datos para gráficos de posiciones de futuros y spreads

> Sesión 09–10/07/2026 (rama `claude/futures-position-databases-j10vpr`, PR #10). Objetivo: dejar en
> Supabase las tres bases que alimentan los gráficos de la web — (1) posiciones CBOT, (2) posiciones
> A3 desde 2020, (3) pizarra Rosario histórica en $ y US$. Todas las fuentes fueron **verificadas con
> requests reales** en esta sesión. Foto viva: `docs/ESTADO.md`.

## Estado de ejecución (10/07/2026)

| Dataset | Tabla | Estado | Detalle |
|---|---|---|---|
| Pizarra Rosario | `pizarra_historico` | ✅ **CARGADA** | 7.893 filas, 5 granos, **2020-01-02 → 2026-07-07**, $ y US$, estimativos flagueados |
| A3 (Matba/CEM) | `futuros_cierres` | ✅ **COMPLETA** | backfill 2020 corrido → **2020-01-02 → 2026-07-08** (31.049 filas) |
| CBOT (Barchart) | `cbot_cierres` | 🟡 **curva actual + workflow listo** | 20 posiciones vivas cargadas hoy; histórico completo (~129 contratos) al correr el backfill del workflow |

**Decisiones de Lautaro (confirmadas en el hilo):**
1. **Horizonte CBOT = solo posiciones comparables con A3** (no plazos largos). Implementado como
   **12 meses previos al vencimiento** de cada contrato → al stitchear da la curva cercana de cada
   día, que es lo que se compara con A3 para **ratios de posiciones cercanas**.
2. **CBOT en toneladas.** Guardamos ¢/bushel crudo (`settlement_cents`) **y** la conversión a
   **USD/tonelada** (`settlement_usd_tn`). Factores **verificados** (U.S. Grains Council / CME):
   maíz ×**0.3936826** (56 lb/bu), soja/trigo ×**0.3674371** (60 lb/bu). Coinciden con los de
   `docs/PLANILLA_DIARIA.md` (0,3937 / 0,3674) — acá con más decimales.
3. **Pizarra = todos los productos**: soja, maíz, trigo, girasol, sorgo.

---

## Dataset 1 — CBOT: maíz (ZC), soja (ZS), trigo (ZW)

**Fuente (verificada de punta a punta, incl. en node):** API interno de Barchart, sin login:
`GET https://www.barchart.com/proxies/core-api/v1/historical/get?symbol={SYM}&fields=tradeTime.format(Y-m-d),openPrice,highPrice,lowPrice,lastPrice,volume,openInterest&type=eod&limit=1000&order=asc&startDate=&endDate=`
- Auth: `GET /futures/quotes/{SYM}/overview` con User-Agent de navegador setea la cookie
  `XSRF-TOKEN`; mandarla URL-decodificada en el header `x-xsrf-token` + el `cookie`. **Una sola
  sesión de cookies sirve para todos los símbolos** (verificado en node).
- **Devuelve contratos VENCIDOS completos** (probado: ZCH21, ZSK22, ZWZ23, ZSN20) y vivos hasta hoy.
  `lastPrice` liquidado = settlement. Trae **open interest** (Yahoo no).
- Formato fraccionario CBOT: `"565-2"` = 565 + 2/8 = **565,25 ¢/bu** (octavos, siempre par →
  cuartos de centavo). Volumen/OI como string con miles.
- **Alcance = 12 meses previos al vto** (decisión 1). Meses: ZC/ZW = H,K,N,U,Z · ZS = F,H,K,N,Q,U,X.
  → **129 contratos** desde 2020 (verificado); **20 posiciones vivas** hoy.
- La fila del día en curso es intradía (OI=0, last≠settle) → el script toma **T-1**.

**Fallbacks:** cron → Yahoo `v8/finance/chart/{SYM}.CBT` (solo vivos, sin OI); pago → Databento
(`GLBX.MDP3`, `ohlcv-1d`) el backfill entero son ~2-3 MB (crédito gratis USD 125).
**Descartados con evidencia:** CME oficial (bloquea IP), Stooq (anti-bot), Investing (solo vivos),
Nasdaq CHRIS/SRF (deprecados).

**Tabla `cbot_cierres`** (PK `symbol+fecha`): `symbol` (ZCH21) · `fecha` · `root` (ZC/ZS/ZW) ·
`grano` (maiz/soja/trigo) · `posicion` (MAR21, formato A3) · `mes` (1° del mes de entrega) ·
`vencimiento` (por ahora null; proxy = `MAX(fecha)` por symbol) · `settlement_cents` (¢/bu) ·
`settlement_usd_tn` (USD/tn) · `open/high/low_cents` · `volume` · `open_interest`.

**Entregables:** `scripts/ingest-cbot.mjs` (`--backfill` enumera 129 contratos / diario = solo
vivas T-1) · `.github/workflows/ingest-cbot.yml` (schedule 22:00 UTC L-V + `workflow_dispatch` con
input `backfill`).

**Falta:** correr el backfill completo → **dispatch de `ingest-cbot.yml` con `backfill=true`**
(desde `main`, tras mergear el PR). Deja ~25-30k filas históricas.

## Dataset 2 — A3: SOJ/MAI/TRI desde 2020 (✅ completo)

- **Hecho:** el CEM tiene cierres desde el **02/01/2020**; se corrió el workflow `ingest-cierres.yml`
  con `from=2020-01-01, to=2021-07-08` (sin código nuevo). `futuros_cierres` quedó en **31.049 filas,
  2020-01-02 → 2026-07-08** (verificado por SQL).
- Vencimientos de posiciones vencidas: NO están en CEM `/symbols` → para TNA histórica de spreads
  usar `MAX(fecha)` por símbolo como proxy del último día de negociación.

## Dataset 3 — Pizarra Rosario histórica en $ y US$ (✅ cargada)

**Fuente (verificada):** consulta histórica oficial de CAC:
`GET https://www.cac.bcr.com.ar/es/precios-de-pizarra/consultas?product={id}&type=any&period=day&date_start=&date_end=`
(ids: **soja=13, maíz=3, trigo=8, girasol=9, sorgo=6**). La serie viene embebida en el JSON
`drupalSettings` → `app_prices.plot.data`: cada punto trae `x` (fecha), `y` ($/tn), `y_usd` (US$/tn).
- **US$ oficial de la CAC** (BNA divisa comprador; verificado 480.500/324,01 = 1.482,98 ≈ 1.483).
  NO es el A3500 (~0,4% de diferencia). TC implícito derivable como `y/y_usd`.
- **Estimativos** (días sin pizarra fijada, Dto. 1058/99): flagueados con `type=estimativo`
  (soja 183 — coincide exacto con lo verificado). Girasol/sorgo son mayormente estimativos (menos
  líquidos) → por eso tienen muchos flags.
- ⚠️ **Trampa:** CAC deja de embeber la serie si el rango pedido es muy amplio (>~3 años) → hay que
  **trocear en ventanas de ≤2-3 años** (el script node y el backfill lo hacen).
- Descartados: export XLSX (solo $), MAGyP (solo $, backup), datos.gob.ar (0 datasets), CEM
  spot-prices (sin granos), SIO Granos (otra cosa: promedios de operaciones).

**Tabla `pizarra_historico`** (PK `grano+fecha`): `grano` · `fecha` · `precio_ars` · `precio_usd` ·
`es_estimativo`. **Cargada** vía la extensión `http` de Postgres (backfill puntual; ya dropeada).

**Entregables:** `scripts/ingest-pizarra.mjs` (backfill `--from/--to` en ventanas de 2 años + cron
ventana móvil 10 días, que **auto-corrige** las cotizaciones provisorias) ·
`.github/workflows/ingest-pizarra.yml` (schedule 21:00 UTC L-V + dispatch). El scrape del día
(`pizarra.ts`) queda para el panel en vivo.

---

## Lo que falta (para cerrar las bases)

1. ~~Backfill A3 2020~~ → **HECHO** (`futuros_cierres` 2020-01-02 → 2026-07-08, 31.049 filas).
2. **Backfill CBOT completo** → tras mergear el PR (los workflows nuevos solo se pueden disparar
   desde la rama default): **Actions → Ingesta cierres CBOT → Run workflow → backfill = true**.
3. **Alta de secrets/crons:** los 3 workflows usan `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (ya
   cargados para el cron de cierres). Los nuevos crons (pizarra, CBOT) empiezan a correr solos una
   vez en `main`.

## Próximo (sesión de gráficos)

Curvas de posiciones (A3 + CBOT en USD/tn), spreads entre posiciones, **ratio/arbitraje A3↔CBOT**
sobre posiciones cercanas (con la conversión a toneladas ya hecha), pizarra vs futuros.
