# Plan — Panel de gráficos de spreads históricos entre cosechas

> Sesión 11/07/2026 (rama `claude/timeline-spread-charts-plan-3zlt1g`). Plan del panel que pidió
> Lautaro: gráficos de línea de tiempo para comparar spreads entre cosechas, combinando **todas**
> las posiciones de las 3 bases (A3, CBOT, pizarra), con período editable y campañas superpuestas.
> **Es un PLAN, no implementa nada.** Ninguna fórmula nueva se da por definida: todas van "a
> confirmar con ejemplo numérico" (regla del proyecto). Todo lo técnico fue **verificado hoy**
> contra el repo, la base real (solo SELECT) y los docs de Next 16 en `node_modules/next/dist/docs/`
> — la evidencia medida quedó en `docs/sesiones/2026-07-11-plan-graficos-spreads.md`. Bases:
> `docs/PLAN_BASES_GRAFICOS.md`. La sección más importante es la última: **decisiones de
> Lautaro** — respondió 26 de las 30 preguntas el 11/07; quedan 4 abiertas.

## 1. Objetivo y alcance

**Qué es:** un comparador genérico de series — pata A y pata B eligen mercado + grano + posición
libremente sobre `futuros_cierres` (31.049 filas, A3 2020→hoy), `cbot_cierres` (28.915 filas,
Chicago 2020→hoy, backfill verificado) y `pizarra_historico` (7.893 filas, 5 granos 2020→hoy) —
con métrica derivada (spread, ratio, base, alquiler qq, TNA) y **superposición de campañas** en un
eje X compartido. Los tres pedidos de Lautaro son configuraciones de ese motor:

| Caso canónico | Patas | Métrica |
|---|---|---|
| (a) Maíz ABR vs maíz JUL Rosario, por campaña | A3 `MAI.ROS/ABR*` vs `MAI.ROS/JUL*` | Spread USD |
| (b) Soja NOV Rosario vs soja NOV Chicago | A3 `SOJ.ROS/NOV*` vs CBOT `ZSX*` (`settlement_usd_tn`) | Spread USD / ratio % |
| (c) Pizarra vs posición de futuro A3 seleccionable | `pizarra_historico.precio_usd` vs `futuros_cierres` | Base (pizarra−futuro) |

**Casos de uso diarios (mensaje de Lautaro del 11/07 — "son todos ejemplos"):**

| Uso diario | Ejemplo suyo | Cómo lo cubre el motor |
|---|---|---|
| 1. Pizarra vs las posiciones A3 de la campaña vigente | Pizarra de maíz durante 2026 vs MAI JUL26 **y** DIC26 | Caso (c) generalizado: **una base vs VARIAS posiciones a la vez** → modo multi-posición (§3) |
| 2. Spread de esta campaña vs los históricos | Maíz JUL/DIC 2026 vs los años anteriores | Caso (a) + superposición de campañas |
| 3. Spread A3↔CBOT de esta campaña vs histórico | SOJ NOV26 vs ZS NOV26, la relación vs años anteriores | Caso (b) + superposición de campañas |
| 4. Spread entre productos vs histórico | Soja JUL vs maíz JUL 26, vs años anteriores | Spread genérico entre granos + superposición |

Los usos 2–4 confirman que la **superposición histórica aplica a TODAS las métricas** (spread mismo
grano, entre productos, A3↔CBOT y base pizarra−futuro), no solo al caso (a). El uso 1 agrega un
requisito nuevo: comparar **más de dos patas** (ver modo multi-posición en §3).

**Ancla de negocio** (`docs/negocio/02_logicas_y_principios.md` §1, textual): *"un spread solo
significa algo contra su propia historia entre posiciones específicas. El desvío del rango
histórico genera la señal, no el nivel absoluto."* El panel existe para ver ese desvío de un
vistazo.

**Límites duros y honestos:**
- Las 3 bases arrancan el **2020-01-02** — nada anterior existe ni se puede scrapear de las
  fuentes actuales. Las campañas **2018 y 2019 del Excel de Lautaro NO se pueden graficar**, y la
  campaña ABR20 quedó truncada (78 ruedas de ~250). **Lautaro decidió (11/07) aceptar el límite:
  no se cargan** (→ P26).
- CBOT guarda **solo 12 meses previos al vto** por contrato (decisión de Lautaro) → en ventanas
  más largas la pata CBOT sale parcial, marcada (→ P24).
- El US$ de pizarra es el **BNA divisa comprador de la CAC, NO el A3500** (~0,4% de diferencia,
  `docs/PLAN_BASES_GRAFICOS.md`). Afecta la lectura fina de la base pizarra−futuro y de cualquier
  ratio pizarra↔futuro → se declara en el panel (InfoTip de la serie pizarra).

## 2. Catálogo de gráficos priorizado

Anclado en `docs/negocio/01` (§3 estacionalidad, §4 spreads, §5 arbitraje de tasas), `02` (§1
señal, §2 base), `docs/PLANILLA_DIARIA.md` y `docs/FORMULAS_EXCEL.md`.

### v1 — los 3 pedidos + lo esencial

| # | Gráfico | Pregunta de negocio | Fórmula / estado |
|---|---|---|---|
| 1 | **Spread USD entre 2 patas** (genérico; cubre caso a) | ¿Cuánto paga el diferimiento/sustitución y cómo venía? | `B − A` en USD/tn. ✅ Minuendo decidido (P7): **lejana − cercana**; vtos iguales: **más caro − más barato** |
| 2 | **Ratio entre 2 patas + inverso** | Relación de sustitución entre productos | `A/B` con botón ⇄. ✅ Default decidido (P8): **maíz/soja ≈0,59** |
| 3 | **Superposición multi-campaña** (modo de vista de 1, 2, 5, 8) | ¿Dónde está ESTA campaña vs las mismas ruedas de las anteriores? | Sin fórmula nueva. ✅ Alineación decidida (P1/P2): días-al-vto por índice de rueda default; calendario en el toggle |
| 4 | **A3 vs CBOT misma posición** (caso b) | ¿Rosario caro o barato contra Chicago? | ✅ Decidido (P10): default **A3 − CBOT en USD/tn** (positivo = Rosario sobre Chicago); ratio a un click |
| 5 | **Base pizarra − futuro A3** (caso c) | ¿El disponible arbitra contra el término? (riesgo de base, timing de fijación) | ✅ Decidido (P11/P19): **pizarra − futuro**, estimativos graficados marcados distinto |
| 6 | **Banda histórica + campaña actual resaltada** (overlay de 3) | ¿La campaña actual está dentro o fuera de su rango? (LA señal) | Banda min/max o percentiles por punto del eje alineado. **A CONFIRMAR con ejemplo numérico** → P13 |
| 7 | **Termómetro "hoy vs historia"** (stat tile) | ¿En qué percentil de su propia historia está el spread hoy? | ✅ Muestra decidida (P14): **misma altura de campaña** (mismo días-al-vto de campañas previas) |
| 8 | ~~**Alquiler en qq**~~ | **ELIMINADO** (Lautaro 11/07: "no me interesa, era solo un ejemplo") | — |
| 9 | **Carry del spread en TNA** (mismo grano, 2 posiciones) | ¿Qué tasa anualizada paga rolear/diferir? | Confirmada en `src/lib/pases-cierres.ts`: `directa = larga/cercana − 1`, `TNA = directa × 365/días`. ✅ Decidido: vto proxy OK (P25) y **solo mismo grano** (P16) |

### v2 — segunda tanda

| # | Gráfico | Nota |
|---|---|---|
| 10 | TNA disponible↔futuro histórica | Fórmula ya confirmada (`FORMULAS_EXCEL.md`); vto proxy → P25 |
| 11 | Ratio maíz/soja continuo (front-month) | Necesita serie continua → empalme **A CONFIRMAR** → P17 |
| 12 | Relación % contra referencia ("180% pizarra maíz", "57% soja julio") | Semántica exacta **A CONFIRMAR** → P12 |
| 13 | Curva forward por grano con "fantasma" (hoy vs t−k) | Sin fórmula nueva |
| 14 | ~~Base en % (`pizarra/futuro − 1`)~~ | Descartada por ahora (P11: eligió solo la resta) |
| 15 | Histograma del spread con marcador "hoy" | Misma muestra que P14 |
| 16 | Volumen / open interest de las patas (subpanel) | Sin fórmula |
| 17 | Pizarra ARS vs USD (girasol/sorgo incl.) | ✅ Decidido (P23): histórico siempre USD; ARS por toggle |

### Ideas (backlog, validar interés)

Heatmap estacional (mes × campaña) · overlay de ventanas estacionales del posicionamiento (01 §3) ·
matriz posición×posición con TNA del pase + percentil (extiende "Mejor para hacer caja") ·
marcadores de eventos (informes USDA/BCR, engancha con el futuro calendario de `FUENTES.md`) ·
export PNG con marca para el reporte WhatsApp (backlog existente) · variación semanal USD ·
TC BNA implícito de pizarra (`ars/usd`) como chequeo de la fuente · small multiples anti-spaghetti ·
brush/minimapa de zoom.

## 3. Modelo de "serie" y "campaña"

- **Pata (plantilla):** fuente + grano + posición **sin año** — "maíz abril Rosario". Es lo que se
  elige en el constructor; el año lo ponen los chips de campañas. Pizarra no tiene posición (serie
  diaria continua).
- **Dos modos de vista ortogonales** (los usos diarios del 11/07 piden ambos):
  1. **Multi-campaña:** UNA relación (pata A vs pata B) × N campañas superpuestas — "maíz JUL/DIC
     26 vs años anteriores". Es el modo central del plan.
  2. **Multi-posición:** UNA campaña (típicamente la vigente) × N relaciones contra una base común
     — "pizarra de maíz 2026 vs JUL26 **y** DIC26" (una línea de base por posición, o las series
     crudas superpuestas). El constructor permite que la pata B sea **multi-select de posiciones**
     cuando hay una sola campaña activa (→ P30).
- **Campaña (instancia):** un contrato concreto de la plantilla (`MAI.ROS/ABR24` = campaña 2024).
  Ventana = `[vencimiento − W, vencimiento]` con **W = 12 meses default, editable** (≈ las 240–260
  ruedas de las hojas del Excel) (→ P3). Vencimiento de posiciones vencidas = **proxy
  `MAX(fecha)` por symbol** (la tabla `vencimientos` solo tiene vivas). Overshoot medido: ABR21
  operó hasta el 04/05/21 — sirve para ventanas (error de días sobre 365), **no** para TNAs
  históricas precisas (→ P25). En CBOT el proxy cae en el last trade real (verificado, excelente).
- **Dos patas de vto distinto** (maíz ABR vs soja MAY): la ventana termina en el **vto más
  temprano** (como el Excel, que corta en abril) (→ P4). Apareo de campañas entre plantillas = por
  año de posición (ABR27 ↔ MAY27) (→ P5).
- **Superposición — dos alineaciones de eje X, van LAS DOS como toggle** (✅ default confirmado
  11/07: días al vencimiento, por índice de rueda — P1):
  1. **Días al vencimiento** (x = días hasta el vto, todas terminan en x=0): es lo que el Excel de
     Lautaro hace *de facto* — la hoja resumen reusa las fechas de 2020 como eje de las 8 campañas
     = alinear por índice dentro de la ventana que termina en el vto. Superposición exacta, inmune
     a calendarios distintos entre años.
  2. **Calendario** (x = día-del-año, "de enero a diciembre" — lo que Lautaro *dijo*): directo si
     la ventana no cruza el año; la de un contrato abril va may→abr → el eje tiene que arrancar en
     un mes fijo configurable, o la línea se parte (→ P2).
  - ⚠️ NO alinear por índice de rueda **desde el arranque** de la serie: los arranques de listado
    son dispares (MAI ABR: 255–323 ruedas; mediana de ventana listada MAI 129 / SOJ 182 / TRI 164
    días). Siempre anclar al vencimiento o a fecha.
- **Join de calendarios distintos** (A3 vs CBOT vs pizarra; medido 2023: 244 vs 250 vs 243 ruedas,
  6 días A3 sin CBOT y 12 CBOT sin A3): el server devuelve series crudas fechadas y el join es
  client-side. ✅ Decidido (P18): **forward-fill acotado** — cada pata usa su último dato ≤ d,
  máx. 3 ruedas de antigüedad, punto marcado `filled`; la intersección estricta queda como opción
  secundaria. Sin esta política, los spreads A3↔CBOT saltarían en falso cada feriado de un solo
  país.
- Todas las transformaciones (ventana, alineación, join, derivadas) viven en **un módulo TS puro y
  testeable client-side** (`derivadas.ts`), NO en SQL — porque las fórmulas las define Lautaro y
  van a iterar.

## 4. Filtros y controles

| Filtro | Detalle | Cuándo |
|---|---|---|
| Fuente / grano / posición por pata | A3 · CBOT · Pizarra, independiente por pata. El picker sale del catálogo real de la base (no lista fija): 129 CBOT + 5 pizarra + **219 A3 solo `.ROS`** (decidido P21) | **v1** |
| Pata B opcional | Sin pata B = serie sola en modo "superponer" | **v1** |
| Pata B múltiple (modo multi-posición) | Con 1 campaña activa, la pata B acepta varias posiciones; cualquier serie puede ser la base (decidido P30) | **v1** |
| Métrica | Spread USD (default, P6) / Ratio con ⇄ / Superponer crudas | **v1** |
| Campañas a superponer | Chips multi-select 2020…2026 + "Últ. 3"/"Todas" (aviso fijo "histórico desde 2020") | **v1** |
| Ventana | 3/6/**12m al vto**/18/24m/custom; con 1 campaña o pizarra↔pizarra pasa a rango absoluto + atajos 1A/3A/5A/Todo | **v1** |
| Eje X | Días al vencimiento (default, P1) ↔ calendario | **v1** |
| Unidad pizarra | USD default / ARS por toggle (decidido P23) | **v1** |
| Estimativos pizarra | Se grafican marcados distinto (decidido P19) | **v1** |
| Banda histórica | Off / min-max / percentiles + qué campañas (→ P13) | v1 básica, v2 completa |
| Media móvil | Off default; sobre el spread calculado, 5 ruedas (decidido P15) | v2 |
| Ruedas sin volumen | Se grafican igual; filtro opcional (decidido P20) | v2 |
| Volumen/OI subpanel · export CSV/PNG · presets guardados | | v2 |

## 5. UX del panel

**Dónde vive: página propia `/graficos`** (no la home): la home es lectura pasiva de cierre con
~20 paneles e ISR 60s; esto es una herramienta exploratoria con estado propio, y además la lib de
charts pesa (Next code-splitea por ruta → la home no paga nada). Entrada "GRÁFICOS" en la nav del
masthead + mini-teaser en la home con sparkline del último preset (→ P29).

**Anatomía (desktop):** fila de **presets** (1 click) → **constructor** (pata A [fuente|grano|
posición] ⇄ pata B + modo + ventana + eje) → **chips de campañas** (un chip por año con swatch de
su color; **los chips SON la leyenda**: click on/off, hover aísla la serie; la vigente va con
trazo grueso) → **chart** (crosshair con snap a rueda + un solo tooltip multi-serie ordenado por
valor + línea de cero + punto "hoy" dorado, único uso del oro en el plot) → **KPI lateral** (valor
hoy, min/máx histórico a esta altura en v1; mediana y **percentil recién en Fase 2, post P13/P14**)
→ acciones `[Ver tabla] [CSV] [PNG] [Copiar link]`. Reusa el idioma existente: `Panel`/
`SourceStamp`, selects `.curva-pick`, chips `.news-chip`, tooltip/crosshair de
`implicitas-chart`/`dolar-futuro-chart`.

- **URL compartible = columna vertebral:** todo el estado en querystring
  (`/graficos?a=a3:mai:abr&b=a3:mai:jul&m=spread&c=24,25,26&eje=vto&v=12m`), sincronizado con
  `history.replaceState` (sin round-trip; la página NO se vuelve dinámica). Un preset es una URL.
  Se manda por WhatsApp.
- **Presets de fábrica:** los 3 casos canónicos + el par de validación del Excel (MAI ABR vs SOJ
  MAY). La lista definitiva quedó ABIERTA (P27: "quiero cambiar la lista") → Lautaro pasa sus
  pares diarios.
  **Presets guardados del usuario: localStorage en fase 1** (escribir en Supabase requiere auth,
  que no existe; el preset es una URL re-guardable) → migrar a tabla si algún día hay login (→ P28).
- **Frescura desigual por fuente** (hoy: A3 08/07, CBOT 09/07, pizarra 07/07): stamp "datos al
  DD/MM" **por serie**, no global.
- **Estados honestos:** skeleton de carga · vacío con CTA a presets · degradación con motivo
  (patrón Result + SourceStamp existente) · campaña con datos parciales = chip "parcial" ·
  combinación imposible = mensaje explícito ("girasol solo existe en pizarra CAC").
- **Mobile:** constructor colapsa a acordeón con resumen textual, chips scrolleables, tooltip fijo
  bajo el chart (no flota bajo el dedo), `touch-action: pan-y` (regla del repo).
- **Colores de campañas** (validados con el validador dataviz sobre `#FCFDF8` claro / `#0C130D`
  oscuro, PASS 4/4 en ambos temas; CVD adyacente ΔE 58,4 / 46,9): el color sigue a la campaña
  SIEMPRE (2024 = rosa en todo chart y sesión); la vigente se distingue por grosor, no por color.
  Tokens `--camp-2020…--camp-2027` en `globals.css` con override dark (mismo mecanismo del tema):

  | Campaña | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | 2027 |
  |---|---|---|---|---|---|---|---|---|
  | Light | `#2A78D6` | `#D96A2A` | `#0891B2` | `#B45309` | `#DB5A9B` | `#9333EA` | `#0F9E8C` | `#7C4FD0` |
  | Dark | `#3987E5` | `#D95926` | `#0AA2C0` | `#BE6A1C` | `#DB639E` | `#A55BEA` | `#0FA38E` | `#9085E9` |

  La identidad nunca es solo color (chips con año, tooltip nombrado, tabla alternativa). Si se
  cambia un hex, re-correr el validador.
- **Accesibilidad AA:** SVG `role="img"` + `aria-label`, tabla de datos alternativa siempre
  disponible, chips `<button aria-pressed>`, crosshair operable por teclado, `reduced-motion`
  respetado, colores de serie ≥3:1 en ambos temas (validado).

## 6. Arquitectura de datos

**Recomendada: página `/graficos` (shell estática, la home ISR no se toca) + panel client + route
handler `GET /api/series`** que hace **UN request PostgREST POR SÍMBOLO** para futuros (una
campaña nunca supera ~325 filas), con data cache de Next (`next: { revalidate: 3600 }` por serie,
compartida entre usuarios y combinaciones) + `Cache-Control: s-maxage=3600, stale-while-revalidate`
para la CDN de Vercel. Respuesta columnar `{ series: [{ id, meta, d: [fechas], v: [valores] }] }`.
Catálogo desde una **vista SQL nueva `series_catalogo`** — la única pieza de SQL imprescindible.

**Trampa crítica CONFIRMADA — el límite de 1.000 filas de PostgREST:** un request que supere 1.000
filas devuelve **HTTP 206 con solo las primeras 1.000**, y **`sbSelect`
(`src/lib/supabase.ts:39`) trata el 206 como éxito** → truncado silencioso (probado: 4 campañas =
1.226 filas → devuelve 1.000). Consecuencias de diseño:
- Futuros: el request por-símbolo queda siempre bajo el límite (~325 filas máx por contrato).
- **Pizarra y cualquier serie continua NO se salvan por-símbolo** (~1.580 filas por grano
  2020→hoy; el rango "Todo"/5A/3A lo supera) → `/api/series` **pagina explícitamente**
  (`Range`/`offset` en tandas de 1.000) para series continuas.
- El guard del 206 en `sbSelect` **no es defensa opcional: es prerequisito funcional del caso (c)**
  → Fase 0.

Otras cifras medidas: serie mínima `select=fecha,settlement` = 1,6 KB gzip en el wire
(~5 B/punto); `select=*` es **8,6× más** → select mínimo SIEMPRE. Panel típico (8 campañas × 2
patas) ≈ **25 KB gzip**. Cap de series por request (~24) en el handler.

**Alternativas descartadas:**

| Opción | Por qué no |
|---|---|
| (b) Cliente → PostgREST directo (anon key `NEXT_PUBLIC_`) | Sin cache compartida (cada usuario re-golpea Supabase, egress free tier 5 GB/mes expuesto a `select=*` en loop), cambia la postura server-only actual de las env vars, y el truncado de 1.000 filas hay que manejarlo igual. Fallback aceptable, no la recomendación |
| (c) Server component + `searchParams` | Verificado en docs Next 16: `searchParams` = página entera **dinámica** en cada request; combinaciones infinitas = sin ISR; cada toque de filtro = render server completo. UX y costo peores. Lo rescatable (URL compartible) se logra con `history.replaceState` |
| (d) JSON estáticos pre-publicados por el cron | Segunda ruta de datos que mantener, frescura atada al cron; los datos ya viven en Postgres. Solo si (a) quedara corta (no va a pasar con estos volúmenes) |

**Qué hay que crear en Supabase (una migración):** vista `series_catalogo` (`security_invoker` +
grant anon, mismo patrón que `futuros_cierres_ultimo`) — una fila por serie graficable (**353 en
el alcance default: 219 A3 `.ROS` + 129 CBOT + 5 pizarra; 383 si entran las otras plazas A3**,
→ P21), con `fuente, serie_id, raiz, grano, posicion, desde, hasta, ruedas, vol_total,
vencimiento (coalesce(vencimientos.vencimiento, MAX(fecha))), venc_estimado`. Vista simple, no
materializada (agrega ~68k filas con index-only scans; el fetch va con revalidate 1h).
**No hacen falta índices nuevos** (todo el acceso es por PK `(symbol,fecha)` / `(grano,fecha)`).
RPC `get_series(...)` como optimización futura, NO para v1.

**Riesgos y trampas verificados** (evidencia y cifras en
`docs/sesiones/2026-07-11-plan-graficos-spreads.md`):

| # | Trampa | Mitigación |
|---|---|---|
| 1 | HTTP 206/truncado silencioso en `sbSelect` | Fix Fase 0 (tratar 206 como error o paginar) + paginación explícita de series continuas en `/api/series` |
| 2 | Símbolos no-Rosario en `futuros_cierres` (`TRI.BA` ¡21 contratos, volumen real!, `ROSM`, `QQ`, `EXP`…) | Decidido (P21): el picker muestra solo `.ROS`; el catálogo igual expone `raiz` por si se suman |
| 3 | Nomenclatura vieja del CEM: posición `DIS` = diciembre (4 símbolos `*/DIS19`, muertos en ene-2020) | Normalizar `DIS`→`DIC` al derivar `posicion`, o excluir por ventana (caen fuera de cualquier campaña útil) |
| 4 | Ruedas sin volumen con settlement teórico (ABR21: 88/323 con vol 0) | Decidido (P20): se grafican igual; filtro opcional en v2 |
| 5 | Pizarra estimativa masiva: girasol **74%** de los días, sorgo **58%**, trigo 27%, soja 12%, maíz 7% | Flag `es_estimativo` viaja en el payload y se ve en el chart → P19 |
| 6 | US$ pizarra = BNA divisa comprador ≠ A3500 (~0,4%) | Se declara en el panel (InfoTip de la serie pizarra) |
| 7 | Vto proxy con overshoot (días post-vto en CEM) | Decidido (P25): proxy OK para v1 |
| 8 | Feriados cruzados A3/CBOT | Decidido (P18): ffill acotado a 3 ruedas, punto marcado |
| 9 | Frescura desigual por fuente | Stamp por serie |
| 10 | Región Vercel `iad1` vs Supabase `sa-east-1` (doble cruce de continente) | Evaluar setear funciones a `gru1` |
| 11 | Símbolos con `/` y `.` en URLs PostgREST | Comillas + URL-encoding (verificado que funciona) |
| 12 | `cacheComponents` de Next 16 | El repo NO lo usa → vale el modelo de cache actual (`revalidate`). No mezclar `use cache` en esta feature |

## 7. Librería de charts

**Recomendación única: Recharts `3.9.2` exacta** (MIT; ya estaba "previsto" en CONTEXTO; compat
React 19.2.4 / Next 16 **verificada hoy con instalación real** — resuelve `react-is@19.2.7` sola,
sin ERESOLVE). Es la única evaluada que cubre de fábrica las 9 features del panel: multi-serie,
tooltip compartido, leyenda clickeable, **bandas min-max** (Area de rango), **Brush nativo**, eje X
conmutable número/categoría (el corazón del modo días-al-vto ↔ calendario), theming por CSS vars
(es SVG → los tokens dark/light entran gratis, mismo modelo que los charts actuales), SSR-safe con
solo `"use client"`, TS nativo. Dataset chico (~2.000 puntos máx) → la ventaja de perf de canvas es
irrelevante.

**Trampas asumidas:** bundle **145 KB gzip que no tree-shakea bien → el panel vive en `/graficos`**
(la home queda liviana, mitigación clave para Hobby + celu). **Recharts 3 ≠ Recharts 2 del
training**: leer docs 3.x al implementar, no de memoria (`accessibilityLayer` ON por default,
`Customized` sin state interno, props deprecadas removidas).

**Plan B: uPlot 1.6.32 + uplot-react** (21 KB) solo si el peso resultara inaceptable medido con
`next build`: costos aceptados = tooltip/responsive DIY y theming por JS (canvas no lee CSS vars,
hay que recrear el chart al togglear tema). **Descartadas:** Observable Plot (sin leyenda
interactiva ni zoom), lightweight-charts (eje solo-tiempo mata el modo días-al-vto), visx/xychart
(mismas features, mucho más caro de desarrollar), seguir con SVG a mano (2/9 features; el resto es
escribir una mini-lib propia).

## 8. Fases de implementación

Cada fase termina en algo **verificable por Lautaro en una URL de preview**, con
`lint` + `tsc` + `build` verdes y su PR draft **base `main`** (protocolo de `ESTADO.md`). Nada de
la fase N+1 arranca sin validar la N.

**Fase 0 — ✅ HECHA (11/07):**
- Guard de HTTP 206/truncado en `src/lib/supabase.ts` + `sbSelectAll` (pagina con limit/offset para
  series continuas como pizarra). `sbSelect` ahora falla ruidoso (`reason: "truncated"`) ante el
  206 parcial en vez de tragar 1.000 filas en silencio.
- Flag estimativo en el scrape del día (`src/lib/pizarra.ts`): captura la clase `estimative` del
  board de CAC → `PizarraGrano.estimativo` → el panel Arbitrajes marca "estimativa" cuando la
  pizarra no está fijada (Dto. 1058/99), en vez de mostrarla como firme.

**Fase 1 — ✅ HECHA y VALIDADA (11/07):**
migración `series_catalogo` (351 series: 217 A3 `.ROS` + 129 CBOT + 5 pizarra) · `src/lib/series.ts`
(catálogo + fetch por símbolo, select mínimo, pizarra paginada) · `GET /api/series` +
`/api/series/catalogo` (data cache + `s-maxage`) · `src/lib/derivadas.ts` (join con ffill acotado
3 ruedas + spread lejana−cercana + ratio + alineación días-al-vto por índice de rueda y calendario)
· `src/components/graficos-client.tsx` + `spread-chart.tsx` (Recharts 3.9.2): constructor de 2 patas
genérico, chips de campañas por color, toggle de eje/métrica/ventana, presets "Maíz ABR vs JUL" y
"Maíz ABR vs Soja MAY (Excel)", estado en URL compartible · página `/graficos` + entrada en el nav.
**Validado contra el Excel de Lautaro:** el spread MAI ABR22−SOJ MAY22 al 2021-04-05 = **125,6**
(idéntico a la hoja "2022"); el ratio maíz/soja al 2022-02-14 = **0,5796** (idéntico a la celda U7
de su hoja resumen); KPI de la campaña vigente = 146,50 (= SOJ MAY27 332,5 − MAI ABR27 186).
`lint` + `tsc` + `build` verdes; panel ejercitado con Playwright en claro y oscuro, sin errores de
consola. Sin bandas ni percentil todavía (Fase 2, pendiente del ejemplo numérico P13).

**Validación con Lautaro (gate):** revisar la Fase 1 contra su Excel + contestar las PREGUNTAS de
la sección 9 (sobre todo P1–P11). Ninguna fórmula de Fase 2 se implementa sin su ejemplo numérico.

**Fase 2 — métricas confirmadas + los otros 2 casos** (P6–P25 ya decididas el 11/07):
ratio maíz/soja con ⇄ · base pizarra−futuro con estimativos marcados · A3 − CBOT con ffill de
feriados marcado · modo multi-posición (bases calculadas, cualquier serie como base) · banda
min–máx + mediana y percentil por altura de campaña (solo falta el ejemplo numérico, P13) ·
presets definitivos (post P27) · tabla alternativa + CSV · guard "parcial" por campaña.
**Entregable:** los 3 casos canónicos + alquiler operables en preview, cada uno validado con un
número del Excel o de la planilla diaria.

**Fase 3 — profundidad (según interés validado):**
TNA carry/arbitraje históricas (mismo grano, vto proxy — P16/P25 decididas) · serie continua
front-month (post P17) · curva forward con fantasma · volumen/OI subpanel · media móvil (P15
decidida) · export PNG (reporte WhatsApp) · heatmap estacional · marcadores de eventos · evaluar
región `gru1` en Vercel. (El import del Excel 2018/2019 se descartó: P26 = no.)

---

## 9. Decisiones de Lautaro (11/07) y preguntas restantes

Las 30 preguntas del plan se respondieron casi todas en el chat del 11/07 — **quedan 4 abiertas**
(al final de la sección). Registro compacto de lo decidido:

### A. Defaults de visualización — todos decididos

| P | Decisión |
|---|---|
| P1 | Eje X default = **días al vencimiento, por índice de rueda** (lo que su Excel hace de facto); calendario ene→dic queda como el otro modo del toggle |
| P2 | En eje calendario, ventanas que cruzan el año arrancan en **mes fijo configurable** (default: mes siguiente al vto) |
| P3 | Ventana default = **12 meses al vto (365 días corridos), editable** (3/6/18/24m/custom) |
| P4 | Patas con vto distinto: la ventana **corta en el vto más temprano** |
| P5 | Etiqueta de campaña = **año del contrato ("26")**; apareo entre patas por año del contrato |
| P6 | Modo default al abrir = **Spread US$** |
| P7 | Minuendo del spread = **convención fija lejana − cercana**; si los vtos empatan: **más caro − más barato** (como su Excel: soja−maíz). A3−CBOT y pizarra−futuro ya tienen su propia convención (P10/P11) |
| P8 | Ratio default = **maíz/soja (≈0,59)**, con botón ⇄ para invertir |

### B. Fórmulas

| P | Decisión |
|---|---|
| P9 | **ELIMINADA** — el alquiler en qq no le interesa ("era solo un ejemplo") → el gráfico #8 sale del catálogo v1 y el preset también |
| P10 | A3 vs CBOT: default **diferencia USD/tn, A3 − CBOT** (positivo = Rosario sobre Chicago); el ratio queda a un click |
| P11 | Base = **pizarra − futuro** (negativa = físico barato contra el término). Sin versión % → el v2 #14 queda descartado por ahora |
| P13 | Banda histórica: **sí, min–máx + mediana**. ABIERTO: el ejemplo numérico (regla del proyecto) y qué campañas la componen |
| P14 | Percentil "hoy vs historia": contra la **misma altura de campaña** (el mismo días-al-vto de las campañas previas) |
| P15 | Media móvil (v2): **sobre el spread ya calculado, 5 ruedas** |
| P16 | TNA **solo entre posiciones del mismo grano** (carry real) |

### C. Datos y alcance

| P | Decisión |
|---|---|
| P18 | Feriados A3↔CBOT: **repetir el último dato del mercado cerrado, marcado, máx. 3 ruedas** |
| P19 | Estimativos de pizarra: **se grafican marcados distinto** (punteado/atenuado) |
| P20 | Ruedas sin volumen (ajuste teórico): **se grafican igual**; filtro opcional en v2 |
| P21 | Selector A3: **solo `.ROS`** (219 contratos) |
| P22 | Girasol y sorgo: **entran** (pizarra vs pizarra o vs otros granos) |
| P23 | Histórico **siempre en USD**; ARS disponible por toggle |
| P24 | CBOT limitado a sus 12 meses: **OK**, pata marcada "parcial" en ventanas mayores |
| P25 | Vencimientos históricos por **proxy MAX(fecha): OK** para v1 |
| P26 | Campañas 2018/2019: **NO se cargan** — desde 2020 alcanza |

### D. UX

| P | Decisión |
|---|---|
| P28 | Compartir = **URL + guardado local** (sin login): alcanza |
| P29 | **Página propia `/graficos`** con enlace en el menú: OK |
| P30 | Multi-posición: **bases calculadas por default** (toggle a series crudas); la base puede ser **cualquier serie** (pizarra o un futuro, ej. MAI JUL vs SEP+DIC) |

### Quedan ABIERTAS (4)

1. **P27 — presets de fábrica.** La lista propuesta no lo convenció ("quiero cambiar la lista") →
   falta que pase los pares/vistas que mira todos los días. Mientras tanto, la Fase 1 usa como
   presets provisorios el caso (a) y el par de validación del Excel.
2. **P13 (parte) — ejemplo numérico de la banda** min–máx + mediana y qué campañas la componen
   (¿todas 2020→ o excluye alguna atípica, ej. 2020 COVID?). Gate de Fase 2; no bloquea Fase 1.
3. **P12 — relaciones %** ("180% pizarra maíz" / "57% soja julio"): necesita un ejemplo real suyo
   (v2, no urgente).
4. **P17 — empalme de la serie continua front-month** (v2): ejemplo numérico del cambio de mes.

### Mejora anotada fuera del panel (derivada de P19)

Lautaro preguntó si "la pizarra a veces sale estimativa" podía ser un problema que notó:
**verificado — sí**. El scrape del día (`src/lib/pizarra.ts`) que alimenta el panel **Arbitrajes**
extrae solo $ y US$ del HTML y **no captura el flag de estimativo** → los días sin pizarra fijada
el panel muestra la estimación de la Cámara como si fuera pizarra firme, sin marcar. Fix chico y
separado del panel de gráficos: capturar el flag en el scrape y marcarlo en el panel (candidato a
colarse junto a la Fase 0).
