# Sesión 2026-07-11 — Plan panel de gráficos de spreads

- **Rama:** `claude/timeline-spread-charts-plan-3zlt1g` · **PR:** draft (base `main`)
- **Objetivo pedido por Lautaro:** plan (NO implementación) del panel de gráficos de línea de
  tiempo para comparar spreads entre cosechas — sus 3 casos: maíz ABR vs JUL Rosario por campaña,
  soja NOV Rosario vs soja NOV Chicago, pizarra vs futuro A3 seleccionable — con período editable,
  todas las posiciones combinables, campañas superpuestas (eje ene→dic), y propuestas de mejoras.
  Regla explícita: no suponer nada; toda ambigüedad = pregunta.

## Hecho
- **`docs/PLAN_GRAFICOS_SPREADS.md`** — el plan completo: catálogo de 9 gráficos v1 + 8 v2 + backlog
  de ideas, modelo de serie/campaña con las DOS alineaciones de eje X, filtros, UX (página
  `/graficos`, constructor de 2 patas, chips-leyenda por campaña, URL compartible), arquitectura
  (route handler `/api/series` + vista `series_catalogo`), librería (Recharts 3.9.2, plan B uPlot),
  fases 0→3, y **29 preguntas numeradas para Lautaro** con opciones y recomendación.
- Se analizó su Excel real (`SPREAD MAIZ ABRIL vs SOJA MAYO.xlsx`): una hoja por campaña
  (2018–2025, ~240–260 ruedas c/u terminando en el vto de abril; columnas spread, ratio y
  "Alquiler 18qq" = 18×soja/maíz) y la hoja resumen que superpone las 8 campañas usando las fechas
  de la hoja 2020 como eje X común → **alineación por índice de rueda dentro de la ventana que
  termina en el vto** (no calendario). Ese hallazgo define la pregunta P1 del plan.
- Proceso: workflow multi-agente (4 informes en paralelo: arquitectura de datos, catálogo de
  negocio, UX, librerías → síntesis → crítica adversarial anti-suposiciones que encontró 3
  bloqueantes y 7 menores, todos corregidos en el plan final).

## Decisiones tomadas (y por qué)
- El panel se planifica como **motor genérico de 2 patas × métrica × campañas**; los 3 pedidos son
  presets. Razón: "combinables todas las posiciones" pedido literal.
- **Ninguna fórmula nueva se da por definida** — el plan separa "confirmada en el repo/Excel"
  (spread B−A, ratio, alquiler qq, TNA de pases) de "a confirmar con ejemplo numérico" (bandas,
  percentil, empalme front-month, relaciones %).
- Fase 1 valida contra **el par exacto de su Excel (MAI ABR vs SOJ MAY)**, no solo el caso (a) —
  la crítica detectó que el gate original apuntaba a un par que el Excel no tiene.

## Verificado (evidencia medida, para no repetir el trabajo)
- **Bases completas 2020-01-02→hoy** (SQL directo): `futuros_cierres` 31.049 filas (al 08/07,
  feriado 9/7 de por medio) · `cbot_cierres` **28.915 filas — el backfill CBOT YA CORRIÓ** (129
  contratos: ZC 38 / ZS 53 / ZW 38, al 09/07) · `pizarra_historico` 7.893 (al 07/07). Cron
  `ingest-cierres` corriendo solo (últimos runs `schedule` success 09 y 10/07).
- 🚨 **PostgREST trunca a 1.000 filas con HTTP 206 y `sbSelect` (`src/lib/supabase.ts:39`) lo trata
  como éxito** (probado: 1.226 filas pedidas → 1.000 devueltas, silencioso). Fix = Fase 0 del plan;
  además pizarra (~1.580 filas/grano) obliga a paginar series continuas.
- Payloads medidos: serie mínima `select=fecha,settlement` (323 pts) = 1,6 KB gzip; `select=*` es
  8,6× más; panel típico (8 campañas × 2 patas) ≈ 25 KB gzip. PK `(symbol,fecha)` alcanza, sin
  índices nuevos.
- Next 16.2.10 (docs locales): repo sin `cacheComponents` → vale `revalidate`; GET route handlers
  dinámicos por default (cache = data cache del fetch interno + `s-maxage` CDN); `searchParams` en
  page = página entera dinámica (por eso se descartó server component para el panel).
- Recharts 3.9.2: instalación real contra React 19.2.4 OK (resuelve `react-is@19.2.7`, sin
  ERESOLVE); bundle ~145 KB gzip → página propia `/graficos`. uPlot 1.6.32 como plan B.
- Rarezas de datos para el picker: símbolos no-Rosario en `futuros_cierres` (`TRI.BA` 21 contratos
  hasta 2023, `ROSM`/`QQ`/`EXP`/`CHA.BS`/`DAI.BS`/`TDL.CM` marginales → P21) · posición `DIS` =
  diciembre en 4 símbolos `*/DIS19` muertos (normalizar `DIS`→`DIC`) · A3 `.ROS` = 219 contratos,
  todas las plazas = 249 · ruedas sin volumen con settlement teórico (MAI ABR21: 88/323) · pizarra
  estimativa: girasol 74% / sorgo 58% / trigo 27% / soja 12% / maíz 7% de los días · US$ pizarra =
  BNA comprador ≠ A3500 (~0,4%) · calendarios 2023: A3 244 vs CBOT 250 vs pizarra 243 ruedas (6
  días A3 sin CBOT, 12 CBOT sin A3) · vto proxy MAX(fecha) con overshoot (ABR21 operó hasta
  04/05/21).
- Paleta de 8 campañas validada (contraste 4/4 en ambos temas, ΔE CVD 58,4/46,9) — hexas en el plan.

## Quedó pendiente / en vuelo
- **Lautaro responde las preguntas del plan** (P1–P11 antes de Fase 2; ninguna bloquea Fase 1) y
  aprueba el plan → recién ahí se implementa (Fase 0: fix 206 · Fase 1: caso (a) + par del Excel).
- Sin cambios de código en esta sesión (solo docs) — no aplica lint/build.

## Trampas descubiertas (para la próxima sesión)
- El límite de 1.000 filas de PostgREST + el 206 silencioso de `sbSelect` afecta a CUALQUIER
  consumidor futuro de series largas, no solo a este panel.
- El Excel de Lautaro alinea campañas por índice de rueda (ventana al vto), NO por calendario —
  aunque él lo describa como "enero a diciembre". Confirmar default antes de dar por buena
  cualquier superposición.
- Excel del sistema: openpyxl anda para este archivo (no hizo falta el workaround XML de
  `docs/negocio/04`).
