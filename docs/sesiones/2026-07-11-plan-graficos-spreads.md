# Sesión 2026-07-11 — Panel de gráficos de spreads (plan + Fase 0+1)

- **Rama:** `claude/timeline-spread-charts-plan-3zlt1g` · **PR:** draft (base `main`)
- **Objetivo pedido por Lautaro:** plan del panel de gráficos de línea de tiempo para comparar
  spreads entre cosechas — sus 3 casos: maíz ABR vs JUL Rosario por campaña, soja NOV Rosario vs
  soja NOV Chicago, pizarra vs futuro A3 seleccionable — con período editable, todas las posiciones
  combinables, campañas superpuestas, y propuestas de mejoras. **Tras aprobar el plan y responder
  las preguntas, dio el "dale" y se implementó Fase 0 + Fase 1 en la misma sesión.**

## Hecho — IMPLEMENTACIÓN (Fase 0 + 1)
- **Fase 0 (fixes independientes):** guard del truncado HTTP 206 en `src/lib/supabase.ts` +
  `sbSelectAll` paginado · flag `estimativo` en `src/lib/pizarra.ts` (clase `estimative` del board
  CAC) hilvanado hasta el panel Arbitrajes (`arbitrajes-cierres.ts`, `arbitrajes-table.tsx`,
  `arbitrajes-editable.tsx`, badge `.pz-estim`).
- **Fase 1 (panel `/graficos`):** migración `series_catalogo` (aplicada; 351 series) ·
  `src/lib/series.ts` + `series-types.ts` + `derivadas.ts` (motor puro: join ffill 3 ruedas, spread
  lejana−cercana, ratio, alineación días-al-vto por índice de rueda y calendario) · route handlers
  `/api/series` y `/api/series/catalogo` · `graficos-client.tsx` + `spread-chart.tsx` (Recharts
  3.9.2) · `src/app/graficos/page.tsx` · tokens `--camp-2020…2027` en `globals.css` · entrada
  "Gráficos" en el nav (`site-header.tsx`, anchors absolutos `/#`).
- **Validado contra datos reales + el Excel** (Playwright, claro y oscuro): spread MAI ABR22−SOJ
  MAY22 al 2021-04-05 = 125,6 = hoja "2022"; ratio maíz/soja al 2022-02-14 = 0,5796 = celda U7 del
  resumen; KPI vigente 146,50 = SOJ MAY27 − MAI ABR27. `lint`+`tsc`+`build` verdes, sin errores de
  consola. Trampa hallada y corregida: PostgREST NO acepta el símbolo entrecomillado (`eq."..."`
  devuelve []); va sin comillas, solo encodeando el `/` (`eq.MAI.ROS%2FABR22`).
- **Fase 2 parcial (mismo día, tras feedback de Lautaro sobre la preview):**
  - Banda histórica min–máx + mediana (P13: toggle Vista Líneas|Banda; sombra = campañas
    históricas, vigente gruesa encima) · KPI percentil hoy vs historia a la misma altura (P14) ·
    mes de referencia en el eje días-al-vto (proyectado desde el vto: 258→ABR, 0→ABR).
  - Recharts: la Area de la banda **no se dibuja dentro de `<LineChart>`** → hay que usar
    `<ComposedChart>` para mezclar Area + Line.
  - **Bug de alineación corregido:** la campaña en curso (vto futuro) se anclaba a su último dato,
    no al vto → quedaba mal contra las históricas. Ahora se corre por ruedas hábiles faltantes al
    vto (`ruedasHasta`), y queda a la misma altura de campaña (el percentil pasó de 71% a 86%, ya
    correcto).

---

## Hecho — Presets + análisis CBOT (iteración con Lautaro sobre la preview)
- **Presets de calendar spreads por grano** (lista de Lautaro): soja/maíz/trigo, 15 pares que
  avanzan por carry. **Offset de campaña** (`offsetB`): si el 2º mes < 1º, la pata B es de la
  campaña siguiente (soja NOV/MAY = Nov26 vs May27, verificado por SQL). Barra agrupada por grano.
- **Presets "entre productos"**: Maíz ABR/Soja MAY y Maíz JUL/Soja JUL. Se borró el preset "Excel"
  (era el mismo par, solo ejemplo).
- **Convenciones de signo** en `ordenarPatas` (P10/P11): A3 − CBOT (local minuendo) y pizarra −
  futuro (pizarra minuendo). Verificado: pizarra maíz − maíz ABR = +1,78 (pizarra sobre futuro).
- **Fix de hidratación:** el estado inicial sale de la URL (solo cliente) → el panel se gatea con
  `mounted` hasta el primer paint para no romper SSR.
- **Análisis empírico A3↔CBOT** (correlación de cambios diarios, solo ruedas líquidas; para elegir
  qué CBOT refleja cada posición local — pedido de Lautaro). Mejor CBOT por posición A3 (rnk 1):
  - **Maíz:** ABR→MAY (0,619 vs MAR 0,602) · JUL→MAY (0,636) · SEP→DIC (0,637≈SEP 0,633) · DIC→SEP
    (0,643 vs DIC 0,585).
  - **Soja:** MAY→MAY (0,643) · JUL→ENE/JUL/MAY (~0,66, empate) · NOV→JUL (0,686; la homónima NOV
    es la PEOR, 0,487 — la soja Nov local sigue al viejo cultivo de Chicago).
  - Hallazgo: la posición homónima NO siempre es la que mejor correlaciona; los presets de Chicago
    quedan pendientes de que Lautaro confirme el mapeo (por eso NO se hardcodearon).

## Hecho — PLAN (fase previa de la sesión)

## Hecho
- **`docs/PLAN_GRAFICOS_SPREADS.md`** — el plan completo: catálogo de 9 gráficos v1 + 8 v2 + backlog
  de ideas, modelo de serie/campaña con las DOS alineaciones de eje X, filtros, UX (página
  `/graficos`, constructor de 2 patas, chips-leyenda por campaña, URL compartible), arquitectura
  (route handler `/api/series` + vista `series_catalogo`), librería (Recharts 3.9.2, plan B uPlot),
  fases 0→3, y **30 preguntas numeradas para Lautaro** con opciones y recomendación.
- **Lautaro mandó en la sesión sus 4 usos diarios reales** (pizarra vs posiciones vigentes ·
  spread de la campaña vs históricos · A3↔CBOT vs histórico · entre productos vs histórico) →
  incorporados al plan (§1) + nuevo **modo multi-posición** (una base vs varias posiciones, §3,
  P30) + presets actualizados (P27).
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
- **Lautaro respondió 26 de las 30 preguntas** (11/07, vía chips en el chat, en 4 tandas). Todas
  las decisiones quedaron registradas en la sección 9 del plan. Las que se apartaron de nuestra
  recomendación: **spread = convención fija lejana−cercana** (no B−A con ⇄) · **ratio default
  maíz/soja** (no soja/maíz) · **el gráfico "alquiler en qq" se ELIMINÓ** ("no me interesa, era
  solo un ejemplo" — también su preset y su filtro).
- **Quedan 4 abiertas:** P27 (lista definitiva de presets — "quiero cambiar la lista", falta que
  pase sus pares diarios) · P13 (ejemplo numérico de la banda min–máx + mediana y qué campañas la
  componen) · P12 y P17 (ejemplos reales de relaciones % y empalme front-month, ambas v2).
  Ninguna bloquea Fase 0+1 → falta solo su "dale" para arrancar la implementación.
- Sin cambios de código en esta sesión (solo docs) — no aplica lint/build.

## Trampas descubiertas (para la próxima sesión)
- **El scrape del día `src/lib/pizarra.ts` NO captura el flag de pizarra estimativa** (solo extrae
  $ y US$ del HTML `board-{grano}`) → el panel Arbitrajes muestra estimativos como pizarra firme.
  Lautaro sospechaba justo esto ("la pizarra a veces sale estimativa, ¿podrá ser ese el
  problema?") — verificado que sí. Fix chico anotado en el plan, candidato a Fase 0.
- El límite de 1.000 filas de PostgREST + el 206 silencioso de `sbSelect` afecta a CUALQUIER
  consumidor futuro de series largas, no solo a este panel.
- El Excel de Lautaro alinea campañas por índice de rueda (ventana al vto), NO por calendario —
  aunque él lo describa como "enero a diciembre". Confirmar default antes de dar por buena
  cualquier superposición.
- Excel del sistema: openpyxl anda para este archivo (no hizo falta el workaround XML de
  `docs/negocio/04`).
