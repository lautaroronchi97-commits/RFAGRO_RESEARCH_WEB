# Sesión 2026-07-09 — Plan bases para gráficos de futuros

- **Rama:** `claude/futures-position-databases-j10vpr` · **PR:** #10 (base `main`, draft)
- **Objetivo pedido por Lautaro:** verificar las bases existentes y armar el plan para tener
  (1) posiciones CBOT desde 2020, (2) posiciones A3 desde 2020, (3) pizarra Rosario histórica
  en $ y US$ desde 2020 — insumos para gráficos de posiciones de futuros y spreads.

## Hecho
- **Auditoría de Supabase**: `futuros_cierres` arranca el 2021-07-08 (no 2020) · no existe tabla
  CBOT ni pizarra histórica · `vencimientos` solo tiene posiciones vivas.
- **Investigación de fuentes con requests reales** (dos agentes en paralelo + verificaciones
  propias) y **plan completo** en [`docs/PLAN_BASES_GRAFICOS.md`](../PLAN_BASES_GRAFICOS.md):
  tablas nuevas (`cbot_cierres`, `pizarra_historico`), scripts, crons y orden de ejecución.
- Solo docs en esta sesión: **no se construyó nada todavía** (plan → aprobación → construir).

## Decisiones tomadas (y por qué)
- **CBOT vía API interno de Barchart** (`/proxies/core-api/v1/historical/get`): única fuente
  gratis verificada que conserva contratos VENCIDOS con settlement + volumen + open interest.
  Fallback cron: Yahoo (solo vivos, sin OI). Fallback pago: Databento (~USD 0, crédito gratis).
- **CBOT acotado a 18 meses previos al vencimiento** (pedido de Lautaro de no irse a plazos
  largos) — a confirmar el corte exacto.
- **Pizarra histórica vía consulta oficial de CAC** (`/es/precios-de-pizarra/consultas`): serie
  completa 02/01/2020→hoy con $ y US$ en una request por grano. El US$ es de la propia CAC
  (BNA divisa comprador), no hay que reconstruirlo.
- **A3 2020 sin código nuevo**: dispatch del workflow existente con `from=2020-01-01`.

## Verificado
- CEM tiene cierres desde el **02/01/2020** (request real, SOJ.ROS/ENE20).
- Barchart devuelve vencidos completos (ZCH21/ZSK22/ZWZ23/ZSN20) y coincide tick a tick con
  Yahoo en settlement; CME/Stooq/Investing/Nasdaq CHRIS descartados con evidencia.
- CAC: 1.578 puntos por grano 2020→hoy con `y` ($) e `y_usd` (US$); TC implícito ≈ BNA divisa
  comprador publicado (1.482,98 ≈ 1.483 ✓); estimativos flagueables con `type=estimativo`.
- Solo docs → sin cambios de código que requieran lint/build (CI corre igual sobre el PR).

## Quedó pendiente / en vuelo
- Respuestas de Lautaro a las 4 preguntas del plan (horizonte CBOT, unidades ¢/bu→USD/tn,
  girasol/sorgo en pizarra, si disparar ya el backfill A3).
- Ejecutar los pasos 1–4 del plan en sesiones siguientes.

## Trampas descubiertas (para la próxima sesión)
- **Yahoo BORRA los contratos vencidos** (hasta los de hace 2 meses) → inútil para backfill.
- **CME bloquea IPs por scraping** en su web de settlements (nos pasó en vivo) y el FTP de
  settlements fue discontinuado en ene-2024.
- Barchart: precios fraccionarios (`"454-6"` = 454,75 ¢/bu) · `limit` máx 1000 · fila del día
  en curso es intradiaria (tomar T-1) · requiere cookies + header `x-xsrf-token` del overview.
- CAC: el export XLSX oficial trae SOLO pesos; el US$ está únicamente en el JSON
  `drupalSettings` de la página de consulta. La serie web arranca exacto el 02/01/2020.
- El US$ de CAC es **BNA divisa comprador**, NO el A3500 del BCRA (~0,4% de diferencia).
- CEM `/symbols` no lista posiciones vencidas → para TNA histórica usar `MAX(fecha)` por símbolo
  de `futuros_cierres` como proxy del vencimiento.
