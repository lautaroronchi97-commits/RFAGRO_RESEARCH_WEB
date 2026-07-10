# Sesión 2026-07-09/10 — Bases para gráficos de futuros (CBOT, A3 2020, pizarra)

- **Rama:** `claude/futures-position-databases-j10vpr` · **PR:** #10 (base `main`, draft)
- **Objetivo pedido por Lautaro:** verificar las bases existentes y dejar armadas/actualizadas las
  tres que alimentan los gráficos de posiciones y spreads: (1) CBOT maíz/soja/trigo desde 2020,
  (2) A3 maíz/soja/trigo desde 2020, (3) pizarra Rosario histórica en $ y US$ desde 2020.

## Hecho
- **Investigación de fuentes con requests reales** (2 agentes en paralelo) + plan aprobado por
  Lautaro → [`docs/PLAN_BASES_GRAFICOS.md`](../PLAN_BASES_GRAFICOS.md).
- **Pizarra histórica (`pizarra_historico`) — CARGADA COMPLETA**: migración
  `create_pizarra_historico` + backfill 2020-01-02→2026-07-07 de **soja/maíz/trigo/girasol/sorgo**
  (7.893 filas) en $ y US$, con `es_estimativo` flagueado. Fuente: consulta histórica oficial de
  CAC (`/es/precios-de-pizarra/consultas`, JSON `drupalSettings.app_prices.plot.data`). El backfill
  se hizo server-side con la extensión `http` de Postgres (troceado en ventanas de ~3 años porque
  CAC deja de embeber la serie en rangos amplios); la extensión se dropeó al terminar.
- **CBOT (`cbot_cierres`) — tabla + curva actual + pipeline**: migración `create_cbot_cierres`;
  cargadas las **20 posiciones vivas** (curva cercana maíz/soja/trigo) en ¢/bu **y USD/tn**;
  `scripts/ingest-cbot.mjs` (backfill 129 contratos / diario T-1) + `ingest-cbot.yml`.
- **A3 desde 2020 → COMPLETO**: corrido el backfill del workflow existente `ingest-cierres.yml`
  (`from=2020-01-01, to=2021-07-08`) — sin código nuevo (el CEM tiene datos desde 02/01/2020).
  `futuros_cierres` quedó en 31.049 filas, 2020-01-02 → 2026-07-08 (verificado por SQL).
- **Pizarra diaria**: `scripts/ingest-pizarra.mjs` + `ingest-pizarra.yml` (cron 21:00 UTC L-V).
- CI local (lint + typecheck + build) ✅.

## Decisiones tomadas (y por qué)
- **CBOT acotado a 12 meses previos al vto** (no 18): Lautaro quiere solo posiciones comparables
  con A3 para **ratios de posiciones cercanas**. 12 meses ≈ horizonte de A3.
- **CBOT en toneladas**: se guarda ¢/bu crudo + `settlement_usd_tn`. Factores **verificados**
  (U.S. Grains Council/CME): maíz 0.3936826 (56 lb/bu), soja/trigo 0.3674371 (60 lb/bu).
- **Pizarra: los 5 productos** (Lautaro: "guarda la pizarra de todos los productos").
- **US$ de pizarra viene de la CAC** (BNA divisa comprador) — no se reconstruye.

## Verificado
- Barchart devuelve vencidos completos y auth funciona en node (cookies de un símbolo sirven para
  todos). Conversión a USD/tn correcta (maíz DIC26 452¢ → 177,94 USD/tn; soja NOV26 1181,5¢ → 434,13).
- CAC: 5 series 2020→hoy, ~1.578 puntos c/u; soja 183 estimativos (coincide con la investigación).
- Estado Supabase post-sesión: pizarra_historico 7.893 (2020-01-02→2026-07-07) · cbot_cierres 20
  (curva de hoy) · futuros_cierres 22.443 (backfill 2020 en curso).

## Quedó pendiente / en vuelo
- **Backfill CBOT completo**: dispatch de `ingest-cbot.yml` con `backfill=true` **tras mergear el
  PR** (los workflows nuevos solo se disparan desde la rama default). Único faltante de las 3 bases.
- Gráficos en la web (sesión aparte): curvas, spreads, ratio A3↔CBOT, pizarra vs futuros.

## Trampas descubiertas (para la próxima sesión)
- **CAC no embebe la serie** si el rango es muy amplio (>~3 años) → trocear en ventanas ≤2-3 años.
- La extensión `http` de Postgres **sí llega a CAC** (útil para backfills puntuales); su timeout
  por defecto es 5s → subir con `http_set_curlopt('CURLOPT_TIMEOUT_MS','30000')`. El MCP corta a 60s
  → no meter más de ~2 fetches por query.
- CBOT: precios fraccionarios en octavos (`"565-2"`=565,25); la fila de hoy es intradía (tomar T-1);
  `limit` máx 1000 (alcanza para 12 meses).
- Workflows nuevos: GitHub solo permite `workflow_dispatch` de un workflow que ya está en la rama
  default → el backfill CBOT espera al merge.
