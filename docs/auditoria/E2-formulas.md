# Auditoría E2 — Fórmulas y lógica de negocio (2026-07-21)

- **Rama:** `claude/e2-formulas-go9i9y` · **PR:** #51 (base `main`, draft hasta el OK)
- **Alcance:** TODO el inventario del PROMPT E2 de [`PLAN_AUDITORIA.md`](../PLAN_AUDITORIA.md): las 9
  calculadoras y sus libs, paneles de granos (arbitrajes/pases/capacidad/mejor caja/curva-futuros),
  dólar y tasas (`market.ts` completo), mesa/comercio (`src/lib/lineup/*`, port de LineUps_Code),
  otros módulos (negociado, estimaciones, calendario, derivadas, noticias, monitor de mercados,
  hábiles/fechas) y el cotejo transversal de los 6 parsers de mes/posición duplicados.
- **Cómo se verificó:** verificación adversarial por familia (derivar la fórmula desde los docs ANTES
  de mirar el código → comparar → ejecutar UN ejemplo numérico con datos reales → bordes). Datos
  reales por REST anon contra la base viva (17-21/07/2026) y fuentes vivas: MAE `/resumen/FOR` y
  `/resumen/DDF`, data912, CAC-BCR, BCR FAS (HTTP 200 el 21/07). Cada número es reproducible; los
  ejemplos exactos están en el anexo **[`E2-formulas-fichas.md`](E2-formulas-fichas.md)** (45 fichas
  — son los fixtures para los tests de E4). No se modificó ni una línea de código (fase 1).

## Resumen ejecutivo

**Las fórmulas están bien.** Cero bugs de fórmula en las ~45 fichas: la metodología INTRATE act/365
del Excel está implementada 1:1 en todas las libs (arbitrajes, pases, carry, a-fijar, diferido,
dólar futuro/linked), base 365 consistente en todo el repo, guards de división por cero y días≤0 en
todas, y la paridad server/cliente del recálculo en vivo de arbitrajes es exacta. Los valores de
control históricos se reproducen exactos (spread Excel 125,6 · ratio 0,5796 · trigo 16.238.900 t ·
maíz pctl 59 · cumplimiento 146%), `campanas.ts` es espejo 612/612 de la SQL, y los factores
¢/bu→USD/tn son idénticos carácter a carácter entre monitor e ingesta.

Lo que SÍ apareció: **1 bug objetivo de runtime** (la vista `djve_cobertura` da statement timeout
por anon desde el backfill DJVE 2011-2025 → `/comercio/empresas` y `/comercio/senal` degradan a
"fuente no disponible" HOY), **2 desfasajes operativos/documentales** (matviews de gap/densidad
atrasadas vs el line-up; el corrimiento por feriado del calendario está bien en el código y mal en
el plan), y **una decena de PREGUNTAS de criterio** para Lautaro — la más importante: hay DOS filas
`UST$T` en MAE (T+0 y T+1) y el código elige una por orden de array, moviendo la TNA corta ~3,7 pp.

## Hallazgos (priorizados, el más grave primero)

> La columna **Decisión** la completa Lautaro: `corregir` / `no` / `diferir a E7` / `preguntar más`.

| # | Hallazgo | Evidencia | Impacto | Esfuerzo | Propuesta de fix | Decisión Lautaro |
|---|---|---|---|---|---|---|
| 1 | **`djve_cobertura` da statement timeout vía PostgREST anon** — es la query exacta de `getEmpresas` (`empresas.ts:90-97`, fatal) → **`/comercio/empresas` y `/comercio/senal` degradan a "fuente no disponible"**. La vista agrega los 334k de `djve` en cada request desde el backfill 2011-2025 (Fase 3). Filtrada por `cod` responde ~1 s. | `curl` anon `djve_cobertura?select=*` → HTTP 500 `57014` en ~4-5 s, reproducido 2/2 (21/07 11:50 UTC) + 3/3 por subagente. `lineup_estacional` falla intermitente (1/3). | **alto** (mesa: 2 páginas caídas) | S-M | Materializar la vista + RPC de refresh llamada por la ingesta (patrón `lineup_visitas`, que resolvió esto mismo en Fase 3), o filtrar campañas viejas en la vista. Migración chica. | **corregir — HECHO** (matview aplicada por MCP 21/07; anon HTTP 200 en 2,5 s) |
| 2 | **`lineup_gap_hist`/`lineup_densidad_hist` quedaron al 16/07 con `lineup` al 20/07** — el refresh post-ingesta no corrió (o falló en silencio) tras la ingesta del 20/07. `/comercio/temperatura` muestra la foto del 16/07 sin aviso. (Las fórmulas degradan consistentemente: "hoy" = máx fecha de sus series.) | REST: `lineup_ultimas_ruedas` rueda_rank=1 → 2026-07-20; `lineup_gap_hist` máx fecha → 2026-07-16. | **medio** (mesa) | S | Investigar el run de `ingest-lineup` del 20/07 (¿llamó la RPC de refresh? → E5) y afinar el check de matview del healthcheck para que compare contra la última rueda, no contra "días de atraso". | **corregir — refresh HECHO** (matviews al 20/07); causa raíz → E5 |
| 3 | **El corrimiento por feriado del calendario está bien en el CÓDIGO y mal en los DOCS.** `corrigeFeriadoAR` (`calendario.ts:161-168`) corre al hábil ANTERIOR ("los informes AR se adelantan"); el plan (`PLAN_CALENDARIO_PRODUCCION.md` §2: "viernes si feriado") y el comentario del call-site (`:280`) dicen lo contrario. Dirimido contra la realidad: el GEA de la semana del feriado del jueves 09/07 está fechado **2026-07-08 (miércoles)** en la base → BCR efectivamente ADELANTA. | SQL: `estimaciones_produccion` BCR → única fila de julio = `fecha_publicacion 2026-07-08`, "GEA mensual #196". | bajo (doc engañoso) | S | Corregir el comentario de `:280` y el plan §2. Confirmar con Lautaro la regla del DEA (SAGyP), que comparte la función (pregunta 11). | **corregir docs — HECHO** (y DEA también adelanta, resp. 11) |
| 4 | **`FORMULAS_EXCEL.md` r27-36 documenta la fórmula VIEJA de negocios-con-pagos** (`base × (1 − tasa × meses/30)`); el código implementa la confirmada por Lautaro el 08/07 (`futuro ÷ (1 + tasa×días/365)`), que además es la inversa exacta del INTRATE. Con los datos de hoy: doc ≈339,83 vs código 340,71. Dos verdades conviviendo. | Ficha 1.5 del anexo; `calc-negocios-pago.tsx:30-41` vs `FORMULAS_EXCEL.md:37-42`. | bajo (doc) | S | Actualizar FORMULAS_EXCEL §r27-36 a la fórmula vigente (dejando nota de que la vieja era de la hoja Excel). | **corregir — HECHO** |
| 5 | **3 comentarios que mienten sobre su propio código** (latentes, sin efecto hoy): (a) `futuros.ts:53` "DIS24 → 0" pero DIS24 matchea la regex → 202400 → se descartaría como vencida, no mostrada como disponible (0 filas así hoy, verificado por SQL); (b) `capacidad.ts:50` "primer valor" pero toma el 2º (Up River — el docstring del archivo sí está bien); (c) `capacidad.ts:82` `if (v)` descarta valores 0 CORRIENDO el índice → si la columna SAGyP viniera vacía, `nums[1]` dejaría de ser Up River. | Fichas 4.4, 4.6 y test de paridad ejecutado. | bajo (robustez) | S | Corregir los 2 comentarios; en (c) empujar también los 0 (o parsear por posición de columna). Puede ir acá o a E4. | **corregir — HECHO** (2 comentarios + filtro de ceros) |
| 6 | **Los tests del port de LineUps_Code (39/39 y 41/41 citados en ESTADO) no están commiteados** — fueron scripts efímeros de sesión. La suite propia del auditor (47 aserciones + harness con datos reales) quedó en scratchpad, fuera del repo. | `Glob`: cero `*.test.*` en el repo; ESTADO cita los conteos. | bajo (robustez) | M | → **E4** (Vitest + CI): las 45 fichas del anexo traen los fixtures exactos. | **diferir a E4** |

## Dudas / decisiones para Lautaro

> Regla de la etapa: las fórmulas las definís vos. Nada de esto es un error — son criterios que el
> código hoy resuelve de una manera y necesitan tu confirmación. Cada una con ejemplo numérico real.

1. **¿Cuál es TU dólar oficial de referencia: T+0, T+1 o el A3500 de BCRA?** MAE `/resumen/FOR` trae
   **dos filas `UST$T`**: plazo `000` (T+0) = 1.481,00 y plazo `001` (T+1) = 1.482,50 (valores reales
   del 21/07). El código toma la primera por orden de array (hoy la 000), sin elegir explícitamente.
   En plazos cortos es material: DLR JUL26 (1.488, 10 días) → TNA **17,25%** con 1.481 vs **13,54%**
   con 1.482,5. Si es T+0, fijamos `plazo === "000"` en el código (fix S).
2. **¿El picker de las calculadoras debería traer el vencimiento REAL en vez de fin de mes?** La curva
   autocompleta vto = último día del mes ("suficiente para el plazo", decisión 09/07); el panel
   Arbitrajes usa el vto real de `vencimientos`. Mismo par soja NOV26 hoy: calculadora TNA **10,13%**
   (132 días al 30/11) vs panel **10,96%** (122 días al 20/11 real). El campo es editable, pero el
   default sesga toda TNA contra hoy ~0,8 pp a la baja. La tabla `vencimientos` ya está en la base.
3. **Umbrales de cobertura (mesa): ¿0,7 / 1,3 / mín 5.000 t / cortes de intensidad 60k-720k son
   calibrados o provisorios del Python?** Y una asimetría: declarado 0 + originado 10.000 t →
   BAJISTA intensidad 1 (el mínimo de 5.000 t solo protege el lado alcista) — ¿querés mínimo también
   del lado bajista?
4. **Parámetros del índice MESA: ¿son tuyos o defaults del Python?** Pesos **0,35/0,30/0,35**, bandas
   **80/60/40/20**, umbral de dirección **32.500 t** (media Panamax), K=10 días, y sobre todo los
   rindes del equivalente poroto **0,745 harina / 0,19 aceite** (plausibles como rindes de crush,
   pero sin fuente en el repo). Sensibilidad: en 10.000 t de aceite, 0,19→0,185 mueve ~1.400 t.
5. **Primas por defecto de estrategias: ¿validás el placeholder?** `pr() = max(1, round(0,6·paso·
   e^(−0,7·distancia)))` — con soja B=320/paso 15: ATM 9, ±1 paso 4, ±2 pasos 2. No viene de ningún
   doc; efecto: el collar default queda "gratis" (put 305 cuesta 4 = call 335 cobra 4), lo que puede
   sugerir que el collar real es costo cero. ¿Lo dejamos hasta conectar primas reales o precargamos
   vacío?
6. **"Máx. pérdida" en estrategias de riesgo abierto:** hoy muestra el peor caso DENTRO de ±3 pasos
   (venta de call B=320 p=9 → "−36"), pero la pérdida real es ilimitada (@420 = −91). ¿Mostrar
   "ilimitada" cuando la pendiente en el borde del rango es no nula?
7. **Pases: ¿cercana contra CADA lejana (como está) o posiciones consecutivas (como dice CONTEXTO)?**
   Hoy soja muestra JUL26/SEP26, JUL26/NOV26, JUL26/MAY27… y NO muestra p.ej. SEP26/NOV26 (que sería
   +5,80 USD, 58 días, TNA 10,63%). Si el esquema actual es el querido, alineamos CONTEXTO.
8. **Aforo del cotizador por porcentaje: en PUNTOS porcentuales, ¿confirmado?** Hoy 183,8% lleno −
   aforo 2 = **181,8%** (puntos). Si fuera 2% relativo daría 180,2%. El código sigue la letra del doc.
9. **Estrategias/costos, 3 menores:** (a) faltan 4 presets del catálogo sin justificación (mariposa
   vendida, cóndor de calls, call/put backspread) — ¿los querés?; (b) las comisiones del catálogo
   (25 USD/ctto, IVA, tamaño de contrato) siguen sin implementar (etapa declarada pendiente) —
   ¿siguen en el backlog?; (c) el tarifario Cocos 2026 agrega planes Gold/Pro/AFI con 0% en varios
   rubros — ¿modelarlos o alcanza humana/jurídica? (los 12 valores actuales coinciden 12/12 con el
   tarifario vigente, cotejado por fuente secundaria — la web de Cocos no es alcanzable del sandbox).
10. **Semáforo físico→precio: la soja suma poroto+harina+aceite en toneladas FÍSICAS** (sin
    equivalente poroto), mientras `/comercio/temperatura` sí convierte a equivalente. ¿Agregación
    intencional distinta o unificar?
11. **Regla de feriado del DEA (SAGyP):** confirmado que BCR-GEA ADELANTA (hallazgo #3). ¿SAGyP
    también publica el hábil anterior, o el viernes? (comparten la función de corrimiento).

### Respuestas de Lautaro (21/07/2026) — todas implementadas en fase 2 salvo lo diferido

1. **UST$T = T+0 (plazo `000`)** → fijado explícito en `market.ts` (fallback: cualquier UST$T).
2. **Picker → vencimiento REAL** de `vencimientos` (fallback fin de mes si falta) → `curva.ts`.
3. **Umbrales de cobertura: PROVISORIOS → calibración en E7** (quedan como están, marcados en el código).
4. **Parámetros del índice MESA: quedan → revisar en E7** (marcados provisorios en `mesa_calor.ts`).
5. **Primas default: se dejan** + nota visible "primas estimativas" en la calculadora.
6. **"Máx. pérdida/ganancia": extremos REALES** — "ilimitada" si la pendiente sigue en el borde; hacia
   abajo se usa el payoff exacto en P=0 (venta de put K320 p9 → −311, no −36).
7. **Pases: se AGREGAN los consecutivos** (además de cercana vs cada lejana) → `pases-cierres.ts`.
8. **Aforo: pasa a % RELATIVO** (lleno × (1 − aforo/100)): 183,8% con aforo 2 → **180,17%** → `calc-porcentaje.tsx`.
9. **Estrategias/costos:** se agregaron los 4 presets faltantes (mariposa vendida · cóndor de calls ·
   call/put backspread → 31 presets) · comisiones del catálogo → **E7** · planes Cocos Gold/Pro → **no**.
10. **Semáforo: soja unificada a EQUIVALENTE POROTO** (harina ÷0,745 · aceite ÷0,19) → `semaforo.ts`.
11. **Feriado DEA: también adelanta** (igual que GEA) → comentarios y plan corregidos.

## Lo que está BIEN (no tocar)

- **La metodología del Excel, 1:1 y consistente**: INTRATE act/365 exacto en arbitrajes, pases,
  carry, a-fijar y negocios-con-pagos (la forma `÷(1+t·d/365)` recupera la tasa cargada con error
  1e-14); interés simple base 365 en diferido con inversas que cierran; TEA/TEM estándar en dólar
  futuro y linked, verificados a mano contra datos vivos de MAE/data912 (9/9 futuros, 5/5 linked,
  8 LECAPs). **Base 365 en TODO el repo, sin excepciones.**
- **Guards completos**: división por cero, días≤0, NaN, posiciones vencidas y series vacías manejados
  en todas las libs (probados, no solo leídos). Nada crashea con inputs degenerados.
- **Paridad server/cliente exacta** en el recálculo en vivo de arbitrajes (misma fórmula, mismos
  días, mismo redondeo) y `mejor caja` reusa `getArbitrajes` sin fórmulas propias (min con signo
  coherente con negocio/01 §5).
- **Controles históricos reproducidos exactos**: spread Excel 2021-04-05 = **125,6** y ratio U7 =
  **0,5796** (`derivadas.ts` sobre `futuros_cierres`); trigo 25/26 Export **16.238.900 t**, total
  semanal **2.568.000 t**, priceado 90,5%, cosecha 71,2% (`negociado.ts`); maíz avance 49,7% → pctl
  **59** y trigo 71,2% → **23** (fix PR #40, `temperatura.ts`); maíz JUL26 **3.854 kt** y
  cumplimiento **146%** (`embarque.ts`); BCR-trigo **29,5 Mt** de 2025/26 (`campaniaVigente`).
- **`campanas.ts` = espejo exacto de la SQL `campana_ini_year`: 612/612 checks idénticos** (la única
  delta es `SOJA_CRUSH`, sintético TS-only, correcta).
- **Percentiles estacionales verificados por recomputación independiente: 8/8 idénticos** con datos
  reales; renormalización de pesos del índice MESA exacta.
- **Factores ¢/bu→USD/tn idénticos carácter a carácter** entre `monitor-mercados.ts` e
  `ingest-cbot.mjs` (0.3674371 / 0.3936826), y harina/aceite re-derivados exactos de la definición
  CME. Los 4 ejemplos del plan del monitor se reproducen.
- **Calendario: las conversiones de timezone están perfectas** (WASDE 13:00 AR en EDT / 14:00 en
  EST; CONAB 09:00 AR — la asunción "Brasil sin DST" es correcta; PAS 15:00 AR), y `habiles.ts` a
  mediodía elimina los off-by-one de DST (probado cruzando ambos cambios de hora de EEUU).
- **Cotejos de fuente vigentes**: `UST$T` sigue en MAE (verificado en vivo); la 2ª columna del FAS
  BCR sigue siendo Up River (HTTP 200, parser reproduce TRI 211,09 / MAI 194,96 / SOJ 341,81);
  tarifario Cocos 12/12.
- **Los 6 parsers de mes/posición duplicados NO divergen** (test de paridad ejecutado, 39 casos):
  la única diferencia es semántica de filtro intencional (DISPO en futuros sí, en curva no).

## Para otras etapas

- **Para E4 (código):** extraer la fórmula de `calc-planta.tsx` a `src/lib/planta.ts` · reusar
  `precioConPago` en `calc-negocios-pago.tsx` (hoy inline duplicada, verificada idéntica) · unificar
  `vencKey`/`hoyVencKey`/tabla de meses (6 copias) · commitear los tests del port + fixtures de las
  45 fichas · clamp de `sumarHabiles` (n gigante cuelga el tab) · comentarios del hallazgo #5 ·
  días negativos en costos (comisión negativa sin guard) · limpiar `2027-06-20` (domingo redundante)
  de FERIADOS_AR cuando Lautaro valide la lista 2027.
- **Para E5 (infra):** investigar por qué no corrió el refresh de matviews tras la ingesta del 20/07
  (hallazgo #2) · `lineup_estacional` con timeouts intermitentes · el healthcheck de matviews debería
  comparar contra la última rueda.
- **Para E3 (UX):** la nota "futuros demorados", sellos y degradaciones de las páginas de comercio
  hoy caídas por el hallazgo #1 — verificar qué VE el usuario cuando `djve_cobertura` timeoutea.
- **Para E7:** si Lautaro aprueba cambios grandes de criterio (preguntas 3-5), son recalibraciones →
  backlog maestro.

## Fase 2 — correcciones implementadas (tras el OK de Lautaro, 21/07/2026)

| # hallazgo / respuesta | Qué se hizo | Migración / archivo | Verificación |
|---|---|---|---|
| 1 | `djve_cobertura` vista → **MATVIEW** + índice por `cod` + refresh sumado a `refresh_lineup_visitas()` (la RPC que ya llama la ingesta) | `supabase/migrations/20260721120000_e2_djve_cobertura_matview.sql` (aplicada por MCP) | `curl` anon `?select=*` → **HTTP 200 en 2,5 s** (9.508 filas; antes 500/57014) |
| 2 | Refresh corrido: matviews al día | `select refresh_lineup_visitas()` por MCP | `lineup_gap_hist`/`densidad` máx fecha = **2026-07-20** (= última rueda) |
| 3 | Comentarios de `calendario.ts` (:280/:299) + plan §2 corregidos: GEA/DEA se ADELANTAN | `src/lib/calendario.ts` · `docs/PLAN_CALENDARIO_PRODUCCION.md` | Evidencia SQL del GEA 08/07 en el hallazgo |
| 4 | FORMULAS_EXCEL r27-36 reescrito con la fórmula vigente (nota histórica de la vieja) | `docs/FORMULAS_EXCEL.md` | Ficha 1.5 |
| 5 | Comentarios `futuros.ts:53` y `capacidad.ts:50` corregidos; filtro de `parseFas` conserva los 0 (no corre el índice) | `src/lib/futuros.ts` · `src/lib/capacidad.ts` | lint/tsc/build |
| r1 | UST$T fijado a `plazo === "000"` (T+0) con fallbacks | `src/lib/market.ts` | Campo `plazo` verificado contra la respuesta viva de MAE |
| r2 | Picker de curva usa el vto real de `vencimientos` (fallback fin de mes) | `src/lib/curva.ts` | Soja NOV26 → 2026-11-20 (= panel Arbitrajes) |
| r7 | Pases consecutivos agregados (sin duplicar el par 0/1) | `src/lib/pases-cierres.ts` | Sanity: JUL/SEP · JUL/NOV · JUL/MAY7 · JUL/JUL7 + SEP/NOV · NOV/MAY7 · MAY7/JUL7 |
| r8 | Aforo a % relativo | `src/components/calc-porcentaje.tsx` (+ texto en `calculadoras.ts`) | 183,84…% × 0,98 = **180,1653%** |
| r9 | 4 presets nuevos (31 total) + nota "primas estimativas" + extremos reales ("ilimitada" / payoff en P=0) | `src/lib/estrategias.ts` · `src/components/calc-estrategias.tsx` | Sanity: backspread @380 = +31 · venta put maxP = −311 · venta call = "ilimitada" · collar ±15 intacto |
| r10 | Semáforo: soja en equivalente poroto (rindes de `mesa_calor.ts`) | `src/lib/lineup/semaforo.ts` (+ texto del panel) | 745.000 SBM → 1.000.000 eq · 190.000 SBO → 1.000.000 eq |
| r3/r4 | Umbrales de cobertura y parámetros MESA marcados PROVISORIOS en el código → calibración E7 | `src/lib/lineup/cobertura.ts` · `mesa_calor.ts` | — |
