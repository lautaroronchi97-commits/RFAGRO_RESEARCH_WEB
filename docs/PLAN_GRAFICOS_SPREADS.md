# Plan — Panel de gráficos de spreads históricos entre cosechas

> Sesión 11/07/2026 (rama `claude/timeline-spread-charts-plan-3zlt1g`). Plan del panel que pidió
> Lautaro: gráficos de línea de tiempo para comparar spreads entre cosechas, combinando **todas**
> las posiciones de las 3 bases (A3, CBOT, pizarra), con período editable y campañas superpuestas.
> **Es un PLAN, no implementa nada.** Ninguna fórmula nueva se da por definida: todas van "a
> confirmar con ejemplo numérico" (regla del proyecto). Todo lo técnico fue **verificado hoy**
> contra el repo, la base real (solo SELECT) y los docs de Next 16 en `node_modules/next/dist/docs/`
> — la evidencia medida quedó en `docs/sesiones/2026-07-11-plan-graficos-spreads.md`. Bases:
> `docs/PLAN_BASES_GRAFICOS.md`. La sección más importante es la última: **PREGUNTAS PARA
> LAUTARO** (30, consolidadas).

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
  ratio pizarra↔futuro (→ sub-pregunta en P11).

## 2. Catálogo de gráficos priorizado

Anclado en `docs/negocio/01` (§3 estacionalidad, §4 spreads, §5 arbitraje de tasas), `02` (§1
señal, §2 base), `docs/PLANILLA_DIARIA.md` y `docs/FORMULAS_EXCEL.md`.

### v1 — los 3 pedidos + lo esencial

| # | Gráfico | Pregunta de negocio | Fórmula / estado |
|---|---|---|---|
| 1 | **Spread USD entre 2 patas** (genérico; cubre caso a) | ¿Cuánto paga el diferimiento/sustitución y cómo venía? | `B − A` en USD/tn. Confirmada en el Excel (soja−maíz). Minuendo genérico → P7 |
| 2 | **Ratio entre 2 patas + inverso** | Relación de sustitución entre productos | `A/B` y `B/A` (Excel: maíz/soja ≈0,59 · soja/maíz ≈1,7). Default → P8 |
| 3 | **Superposición multi-campaña** (modo de vista de 1, 2, 5, 8) | ¿Dónde está ESTA campaña vs las mismas ruedas de las anteriores? | Sin fórmula nueva. Alineación de eje: dos modos (§3) → P1, P2 |
| 4 | **A3 vs CBOT misma posición** (caso b) | ¿Rosario caro o barato contra Chicago? | `dif = A3 − CBOT` y `ratio = A3/CBOT` (conversión a USD/tn ya en la base). Vista default y numerador → P10 |
| 5 | **Base pizarra − futuro A3** (caso c) | ¿El disponible arbitra contra el término? (riesgo de base, timing de fijación) | `pizarra_usd − futuro` (= −spread del panel Arbitrajes). Signo y versión % → P11. Estimativos → P19 |
| 6 | **Banda histórica + campaña actual resaltada** (overlay de 3) | ¿La campaña actual está dentro o fuera de su rango? (LA señal) | Banda min/max o percentiles por punto del eje alineado. **A CONFIRMAR con ejemplo numérico** → P13 |
| 7 | **Termómetro "hoy vs historia"** (stat tile) | ¿En qué percentil de su propia historia está el spread hoy? | `percentil(hoy, muestra)`. **A CONFIRMAR** qué muestra → P14 |
| 8 | **Alquiler en qq** | ¿Cuántos qq de maíz cuesta un alquiler pactado en qq de soja? | `qq × soja/maíz`, qq editable (default 18). Confirmada en el Excel. Par default → P9 |
| 9 | **Carry del spread en TNA** (mismo grano, 2 posiciones) | ¿Qué tasa anualizada paga rolear/diferir? | Confirmada en `src/lib/pases-cierres.ts`: `directa = larga/cercana − 1`, `TNA = directa × 365/días`. Días con vto **proxy** en históricos → P25. Entre granos distintos NO → P16 |

### v2 — segunda tanda

| # | Gráfico | Nota |
|---|---|---|
| 10 | TNA disponible↔futuro histórica | Fórmula ya confirmada (`FORMULAS_EXCEL.md`); vto proxy → P25 |
| 11 | Ratio maíz/soja continuo (front-month) | Necesita serie continua → empalme **A CONFIRMAR** → P17 |
| 12 | Relación % contra referencia ("180% pizarra maíz", "57% soja julio") | Semántica exacta **A CONFIRMAR** → P12 |
| 13 | Curva forward por grano con "fantasma" (hoy vs t−k) | Sin fórmula nueva |
| 14 | Base en % (`pizarra/futuro − 1`) | Si la quiere → P11 |
| 15 | Histograma del spread con marcador "hoy" | Misma muestra que P14 |
| 16 | Volumen / open interest de las patas (subpanel) | Sin fórmula |
| 17 | Pizarra ARS vs USD (girasol/sorgo incl.) | ARS histórico ¿sirve? → P23 |

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
  client-side con dos modos — **forward-fill acotado** (cada pata usa su último dato ≤ d, con tope
  de antigüedad a definir, punto marcado `filled`) o **intersección estricta** (solo días comunes,
  pierde ~5%). Default y tope → P18. Sin política explícita, los spreads A3↔CBOT saltan en falso
  cada feriado de un solo país.
- Todas las transformaciones (ventana, alineación, join, derivadas) viven en **un módulo TS puro y
  testeable client-side** (`derivadas.ts`), NO en SQL — porque las fórmulas las define Lautaro y
  van a iterar.

## 4. Filtros y controles

| Filtro | Detalle | Cuándo |
|---|---|---|
| Fuente / grano / posición por pata | A3 · CBOT · Pizarra, independiente por pata. El picker sale del catálogo real de la base (no lista fija): 129 CBOT + 5 pizarra + A3 según alcance de plazas → P21 (default `.ROS` = 219 contratos; con las otras plazas son 249) | **v1** |
| Pata B opcional | Sin pata B = serie sola en modo "superponer" | **v1** |
| Pata B múltiple (modo multi-posición) | Con 1 campaña activa, la pata B acepta varias posiciones (pizarra mz vs JUL+DIC) → P30 | **v1** |
| Métrica | Spread USD / Ratio (con ⇄ e input "× qq") / Superponer crudas | **v1** |
| Campañas a superponer | Chips multi-select 2020…2026 + "Últ. 3"/"Todas" (aviso fijo "histórico desde 2020") | **v1** |
| Ventana | 3/6/**12m al vto**/18/24m/custom; con 1 campaña o pizarra↔pizarra pasa a rango absoluto + atajos 1A/3A/5A/Todo | **v1** |
| Eje X | Días al vencimiento ↔ calendario (default → P1) | **v1** |
| Unidad pizarra | USD default / ARS (→ P23) | **v1** |
| Estimativos pizarra | Marcar o excluir (→ P19) | **v1** |
| qq del alquiler | Editable, default 18 | **v1** |
| Banda histórica | Off / min-max / percentiles + qué campañas (→ P13) | v1 básica, v2 completa |
| Media móvil | Off/5/10/20 ruedas (→ P15) | v2 |
| Ruedas sin volumen | Filtro opcional (→ P20) | v2 |
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
  MAY) + alquiler qq. Lista final de pares diarios → P27.
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
| 2 | Símbolos no-Rosario en `futuros_cierres` (`TRI.BA` ¡21 contratos, volumen real!, `ROSM`, `QQ`, `EXP`…) | El catálogo expone `raiz`; el picker agrupa por ella. ¿Se incluyen? → P21 |
| 3 | Nomenclatura vieja del CEM: posición `DIS` = diciembre (4 símbolos `*/DIS19`, muertos en ene-2020) | Normalizar `DIS`→`DIC` al derivar `posicion`, o excluir por ventana (caen fuera de cualquier campaña útil) |
| 4 | Ruedas sin volumen con settlement teórico (ABR21: 88/323 con vol 0) | Mostrar/marcar/filtrar → P20 |
| 5 | Pizarra estimativa masiva: girasol **74%** de los días, sorgo **58%**, trigo 27%, soja 12%, maíz 7% | Flag `es_estimativo` viaja en el payload y se ve en el chart → P19 |
| 6 | US$ pizarra = BNA divisa comprador ≠ A3500 (~0,4%) | Declararlo en el panel (stamp/InfoTip de la serie pizarra); sub-pregunta TC → P11 |
| 7 | Vto proxy con overshoot (días post-vto en CEM) | OK para ventanas; TNAs históricas → P25 |
| 8 | Feriados cruzados A3/CBOT | ffill acotado vs intersección → P18 |
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

**Fase 0 — fix independiente (corresponde ya, con o sin panel):**
guard de HTTP 206/truncado en `src/lib/supabase.ts`. Entregable: `sbSelect` falla ruidoso (o
pagina) ante respuesta parcial. Es prerequisito funcional de las series de pizarra (§6).

**Fase 1 — mínima demostrable (el caso (a) + el par del Excel andando):**
migración `series_catalogo` + grant anon · `src/lib/series.ts` (resolución de ids + fetch por
símbolo, select mínimo, paginación de series continuas, reusa `sbSelect`/Result) · `GET
/api/series` + `/api/series/catalogo` · `src/lib/derivadas.ts` (join con ffill acotado + spread
`B−A`, la única fórmula ya confirmada por el Excel; transformaciones días-al-vto y day-of-year) ·
página `/graficos` con Recharts: constructor 2 patas, chips de campañas, toggle de eje, presets
"Maíz ABR vs JUL Ros" (caso a) y "Maíz ABR vs Soja MAY Ros" (el par del Excel) · estado en URL.
**Entregable verificable:** URL de preview donde (1) el caso (a) superpone campañas 2020→2026, y
(2) el preset del par del Excel reproduce los números de **sus hojas 2021→2025 completas (y el
tramo 2020 desde enero)** — validación directa contra la planilla que Lautaro ya usa. Sin bandas,
sin percentil, sin ratio: solo lo confirmado.

**Validación con Lautaro (gate):** revisar la Fase 1 contra su Excel + contestar las PREGUNTAS de
la sección 9 (sobre todo P1–P11). Ninguna fórmula de Fase 2 se implementa sin su ejemplo numérico.

**Fase 2 — métricas confirmadas + los otros 2 casos:**
ratio + alquiler qq (post P8/P9) · base pizarra−futuro con flag estimativo (post P11/P19) · A3 vs
CBOT con política de feriados (post P10/P18) · banda histórica + percentil "hoy" (post P13/P14) ·
presets completos (post P27) · tabla alternativa + CSV · guard "parcial" por campaña.
**Entregable:** los 3 casos canónicos + alquiler operables en preview, cada uno validado con un
número del Excel o de la planilla diaria.

**Fase 3 — profundidad (según interés validado):**
TNA carry/arbitraje históricas (post P16/P25) · serie continua front-month (post P17) · curva
forward con fantasma · volumen/OI subpanel · media móvil (post P15) · export PNG (reporte
WhatsApp) · heatmap estacional · marcadores de eventos · import Excel 2018/2019 si P26 = sí ·
evaluar región `gru1` en Vercel.

---

## 9. PREGUNTAS PARA LAUTARO

Consolidadas de los 4 análisis (arquitectura, negocio, UX, librerías), deduplicadas. Formato:
contexto → opciones → nuestra recomendación. **P1–P11 conviene contestarlas antes de la Fase 2;
ninguna bloquea la Fase 1.** Las marcadas ✅ ya las respondió Lautaro el 11/07 (P1, P13, P26,
P30) — quedan 26 abiertas.

### A. Defaults de visualización

1. **Eje X default al superponer campañas.** ✅ **RESPONDIDA 11/07: días al vencimiento** (la
   alineación que su Excel hace de facto). El calendario ene→dic queda como el otro modo del
   toggle. Se implementa como **índice de rueda** (exactamente lo que hace su hoja resumen); días
   corridos queda como variante solo si la pide.
2. **Eje calendario que cruza el año.** La ventana de un contrato abril va mayo→abril: con eje
   ene→dic literal la línea se parte. Opciones: (a) el eje arranca en un mes fijo configurable
   (default = mes siguiente al vto, ej. MAY→ABR) · (b) ene→dic literal aunque se parta.
   **Recomendación: (a).**
3. **Ventana de campaña default.** Tus hojas son ~1 año antes del vto → el vto (~240–260 ruedas).
   Opciones: (a) 12 meses al vto, editable (3/6/18/24m/custom) · (b) toda la ventana listada
   (algunas posiciones cotizan 15–17 meses, otras solo 4–6). **Recomendación: (a)**, mostrando el
   rango real disponible por campaña. ¿Y la regla exacta es "N días antes del vto" o una fecha
   calendario fija (ej. 1/mayo del año anterior)?
4. **Dos patas con vto distinto** (maíz ABR vs soja MAY). ¿La ventana corta en el vto más temprano,
   como tu Excel que termina en abril? **Recomendación: sí (min de los dos vtos).**
5. **Etiqueta de campaña y apareo.** Opciones: (a) año del contrato ("2026" o "26") · (b) campaña
   comercial ("25/26"). **Recomendación: (a), "26".** ¿Y el apareo entre patas de distinto mes es
   siempre por año del contrato (ABR27 ↔ MAY27)? Confirmar con el caso trigo.
6. **Modo default al abrir el panel.** Opciones: Spread US$ · Ratio · Superponer crudas.
   **Recomendación: Spread US$.**
7. **Minuendo del spread genérico.** Tu Excel: soja − maíz. Para dos patas cualesquiera, opciones:
   (a) siempre "pata B − pata A" en el orden que las elegís, con botón ⇄ para invertir · (b)
   convención fija (lejana − cercana / cara − barata). **Recomendación: (a)** — explícito y sin
   magia.
8. **Ratio default.** Tu Excel muestra maíz/soja (~0,59) y el inverso soja/maíz (~1,7). Opciones:
   (a) uno solo con botón ⇄ · (b) ambos siempre. ¿Cuál primero? **Recomendación: (a), arrancando
   soja/maíz (1,7), que es el que alimenta el alquiler.**

### B. Fórmulas a confirmar con ejemplo numérico (regla del proyecto: sin ejemplo no se implementa)

9. **Alquiler qq.** En tu Excel: 18 × soja MAY / maíz ABR (futuros, no pizarra). Confirmá con
   número: soja MAY 300, maíz ABR 176 → 300/176 = 1,7045 → × 18 = **30,68 qq de maíz**. ¿Así? ¿Ese
   par es el default? ¿Sumamos otros pares (alquileres en qq de trigo)? qq editable, default 18.
10. **A3 vs CBOT.** Opciones de vista: diferencia en USD/tn · ratio % · ambas. ¿Numerador A3 o
    Chicago? **Recomendación: ambas vistas, default diferencia USD/tn con numerador A3** (positivo
    = Rosario sobre Chicago). Dame un ejemplo numérico del ratio como lo mirás vos.
11. **Base pizarra−futuro.** Opciones: (a) `pizarra − futuro` (negativa = físico barato, como tu
    "RELACIÓN −X VS POS") · (b) `futuro − pizarra` (como el spread del panel Arbitrajes).
    **Recomendación: (a)**, declarando el signo en pantalla. ¿Querés también la versión en %
    (`pizarra/futuro − 1`)? Sub-pregunta: el US$ de pizarra viene con el TC de la CAC (BNA divisa
    comprador, ~0,4% distinto del A3500) — ¿te sirve así o querés TC configurable?
12. **"180% pizarra maíz" / "57% soja julio".** ¿Qué series exactas grafica cada relación? ¿Precio
    del negocio ÷ pizarra del día? Dame un ejemplo real de cada una — sin eso no se puede
    implementar el gráfico #12.
13. **Banda histórica.** ✅ **RESPONDIDA 11/07: sí, min–máx + mediana.** Queda pendiente de la
    validación Fase 1→2: el **ejemplo numérico** (regla del proyecto) y qué campañas la componen
    (¿todas 2020→ o excluís alguna atípica, ej. 2020 COVID?).
14. **Percentil "hoy vs historia" (KPI).** ¿Contra qué muestra? Opciones: (a) el mismo
    días-al-vto de las campañas previas · (b) toda la historia del par · (c) últimos N años
    móviles. **Recomendación: (a)** — compara manzanas con manzanas a la misma altura de campaña.
    Ejemplo numérico requerido.
15. **Media móvil (v2).** ¿Ventana default (5/10/20 ruedas)? ¿Se suaviza el spread ya calculado o
    cada pata antes de restar? **Recomendación: el spread calculado, 5 ruedas.**
16. **TNA entre granos distintos.** ¿Tiene sentido para vos anualizar un spread soja/maíz, o la
    TNA queda restringida a dos posiciones del MISMO grano (carry real)? **Recomendación:
    restringirla a mismo grano.**
17. **Serie continua front-month (v2, #11).** Al vencer un contrato, ¿saltamos al siguiente sin
    ajuste (como tu hoja "Maíz x Soja") o hay que empalmar con ajuste? Ejemplo numérico del cambio
    de mes.

### C. Datos y alcance

18. **Feriados AR vs US en spreads A3↔CBOT** (medido: 6 días A3 sin CBOT y 12 CBOT sin A3 en 2023).
    Opciones: (a) repetir el último dato del mercado cerrado, marcado en el gráfico, con un tope de
    antigüedad — proponemos 3 ruedas pero es arbitrario, decilo vos · (b) graficar solo días
    comunes. **Recomendación: (a)** — es lo que hace cualquier mesa y no inventa precios.
19. **Pizarra estimativa** (girasol **74%** de los días, sorgo 58%, trigo 27%, soja 12%, maíz 7%).
    Opciones: (a) incluir marcada distinto (punteada/atenuada) · (b) excluir por default con toggle.
    **Recomendación: (a)** — excluirla dejaría girasol/sorgo casi sin serie.
20. **Ruedas sin volumen** (ajuste teórico; ej. MAI ABR21: 88 de 323 ruedas con volumen 0).
    Opciones: graficar igual · marcar · filtro opcional. **Recomendación: graficar igual con filtro
    opcional en v2** (el ajuste es el dato oficial).
21. **Series A3 no-Rosario** en la base: `TRI.BA` (21 contratos, volumen real, cotizó hasta 2023),
    `MAI.ROSM`, `SOJ.QQ`, `SOJ.EXP`, etc. Pediste "todas las posiciones combinables" — decidí el
    alcance exacto: (a) solo `.ROS` (219 contratos) · (b) `.ROS` + `TRI.BA` · (c) todas agrupadas
    por plaza (249). **Recomendación: (a) en v1, sumando `TRI.BA` si la usás.**
22. **Girasol y sorgo** (solo existen en pizarra). ¿Los querés en el comparador (pizarra vs
    pizarra, o girasol vs soja)? **Recomendación: sí, ya están en la base y no cuestan nada.**
23. **Pizarra en ARS.** La columna está completa 2020→hoy, pero es nominal con la inflación de por
    medio. ¿Te sirve el histórico en ARS para algo o el histórico va siempre USD y ARS queda para
    el día? **Recomendación: solo USD en históricos; toggle ARS igual disponible.**
24. **CBOT solo 12 meses por contrato** (tu decisión de alcance). En ventanas más largas la pata
    CBOT sale incompleta, marcada "parcial". ¿OK así? **Recomendación: OK; la ventana comparable
    con A3 es esa.**
25. **Vencimiento proxy para TNAs históricas.** Para contratos vencidos usamos MAX(fecha) por
    symbol (puede errar por días — el CEM publica ruedas post-vto). Sirve para ventanas de campaña;
    para TNA histórica (#9, #10) mete error chico en "días". Opciones: (a) aceptar el proxy ·
    (b) cargar vencimientos reales históricos a la tabla `vencimientos`. **Recomendación: (a) para
    v1; (b) si las TNAs históricas se vuelven centrales.**
26. **Campañas 2018/2019.** ✅ **RESPONDIDA 11/07: no se cargan — desde 2020 alcanza.** El panel
    arranca con el límite 2020-01-02 asumido. Si algún día cambia de idea, la vía es una tabla
    aparte `series_manuales` (nunca ingestar a `futuros_cierres`: la escribe el cron CEM y
    mezclar fuentes rompería la procedencia y la vista de posiciones vivas).

### D. UX y alcance del panel

27. **Presets diarios.** Con tus 4 ejemplos del 11/07 la lista propuesta queda: pizarra maíz vs
    JUL+DIC vigentes · MAI JUL vs DIC (multi-campaña) · SOJ NOV A3 vs ZS NOV (multi-campaña) ·
    SOJ JUL vs MAI JUL (multi-campaña) · MAI ABR vs SOJ MAY (tu Excel, validación) · alquiler
    18qq. ¿Confirmás esos 6? ¿Falta alguna relación que mires todos los días?
28. **Presets guardados / compartir.** Todo estado es URL (se manda por WhatsApp); "guardar vista"
    = localStorage por máquina (sin login no hay escritura segura en Supabase). Compartir presets
    entre vos y Mauro de forma persistente requiere pensar login más adelante. ¿Alcanza URL +
    guardado local por ahora? **Recomendación: sí.**
29. **Ubicación.** Página propia `/graficos` con entrada en el menú + teaser en la home (la home no
    carga el peso del panel). ¿OK? **Recomendación: sí.**
30. **Modo multi-posición** (tu ejemplo "pizarra de mz 2026 vs JUL y DIC"). ✅ **RESPONDIDA
    11/07: bases calculadas por default** (pizarra−JUL y pizarra−DIC como líneas de spread), con
    toggle a las series crudas. Sub-pregunta que queda: ¿lo usás solo con pizarra como base o
    también futuro vs varias posiciones (JUL vs SEP+DIC)?
