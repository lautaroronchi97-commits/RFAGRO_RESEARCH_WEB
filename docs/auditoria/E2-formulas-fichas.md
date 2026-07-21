# Anexo E2 — Fichas de fórmulas (auditoría 21/07/2026)

> Anexo de [`E2-formulas.md`](E2-formulas.md). Una ficha por fórmula/lógica, con el ejemplo numérico
> EXACTO verificado con datos reales (fechas 17-21/07/2026, por REST contra la base viva). Estos
> números son los **fixtures** para los tests de E4 — no redondearlos al copiarlos.
> Método: derivación desde los docs ANTES de mirar el código (verificación adversarial por familia),
> comparación contra la implementación, ejecución del ejemplo, revisión de bordes.

## Familia 1 — Calculadoras core

### Ficha 1.1: Registro de calculadoras (calculadoras.ts)
- **Esperado:** 9 calculadoras registradas y mapeadas, slug inválido → 404 (ESTADO, Fase 4 UX).
- **Implementación:** `src/lib/calculadoras.ts:16-90` + `src/app/(site)/calculadoras/[slug]/page.tsx:57-80`.
- **Verificado:** cotejo 1:1 — `a-fijar`→CalcFijar · `por-porcentaje`→CalcPorcentaje ·
  `negocios-con-pagos`→CalcNegociosPago · `pago-diferido`→CalcDiferido · `pases`→CalcPases ·
  `carry`→CalcArbitraje · `costos`→CalcCostos · `estrategias`→CalcEstrategias ·
  `negocios-de-planta`→CalcPlanta. 9/9, sin huérfanos. `dynamicParams=false` → slug inválido 404.
- **Veredicto:** **OK.** Detalle de prosa (no de código): el `comoSeCalcula` de "a-fijar" dice
  "la tasa que sale de esa diferencia" — la TNA implícita sale del cociente futuro/disponible, no del
  delta.

### Ficha 1.2: A fijar — delta, TNA implícita, resultado, precio a tu tasa (fijar.ts)
- **Esperado (docs):** CONTEXTO sesión 08/07 (solo deltas, SIN costo de oportunidad; toggle
  compro/vendo; comparador con tasa editable) + negocio/02 §6 (`Delta_puro = disponible − futuro A3`,
  positivo = malo para quien compró). Derivación: `delta = disp − fut` ·
  `TNA impl = (fut/disp − 1)×365/días` (INTRATE act/365) · `resultado = ±delta según lado` ·
  `precioTasa = disp×(1 + tasa×días/365)`.
- **Implementación:** `src/lib/fijar.ts:32-53`; verde de la TNA en `calc-fijar.tsx:171`
  (`tna > tasaComp`).
- **Ejemplo verificado (21/07/2026):** disponible = pizarra soja CAC 17/07 **336,96 USD**, futuro
  SOJ.ROS/NOV26 **349,3** (cierre 20/07), vto picker 2026-11-30 → **132 días**:
  `delta = −12,34` · `tna = 10,126415508359992 %` · `resultado(compro) = +12,34` ·
  `resultado(vendo) = −12,34` · `precioTasa(10%) = 349,1459506849315`.
- **Bordes:** vto pasado → días=0 → tna/precioTasa NaN (UI "—"), delta se sigue mostrando;
  disponible=0 → NaN sin crash; precio≤0 → fila filtrada; base 365 en todo. Probado.
- **Veredicto:** **OK.** (La diferencia de días del picker → PREGUNTA transversal, ficha 1.9.)

### Ficha 1.3: Por porcentaje — lleno y aforo (porcentaje.ts + calc-porcentaje.tsx)
- **Esperado (docs):** CONTEXTO 08/07: aforo (%) que RESTA al porcentaje lleno (a cliente).
  `lleno = neg/ref×100` · `a cliente = lleno − aforo` · inversa `precio = pct/100×ref`.
- **Implementación:** `src/lib/porcentaje.ts:12-18`; aforo inline `calc-porcentaje.tsx:41-42`.
- **Ejemplo verificado:** SOJ.ROS/NOV26 349,3 vs MAI.ROS/SEP26 190 (cierres 20/07):
  `lleno = 183,8421052631579 %` → aforo 2 → **a cliente 181,8421052631579 %**. Inversa:
  `precioDesdePct(183,842…, 190) = 349,3` exacto.
- **Bordes:** ref≤0 → NaN; aforo NaN → no muestra "a cliente". Probado.
- **Veredicto:** **OK.** Nota confirmable: el aforo se resta en **puntos porcentuales**
  (183,8% − 2 = 181,8%), no como % relativo (daría 180,2%) — coincide con la letra del doc.

### Ficha 1.4: Pago diferido — interés simple base 365 + inversas (diferido.ts + calc-diferido.tsx)
- **Esperado (docs):** FORMULAS_EXCEL r12-22: `pago_estándar = WORKDAY(hoy, 5 hábiles)`;
  `diferido = base × (1 + tasa × díasExcedentes/365)`, días = SOLO el excedente sobre los 5 hábiles.
- **Implementación:** `src/lib/diferido.ts:19-44` (factor/precioDiferido/precioConPago/tasaImplicita/
  diasDesdeTasa, con guards); fechas en `calc-diferido.tsx:72-88` (`sumarHabiles` + excedente
  `max(0, diasCorridos)`).
- **Ejemplo verificado:** base = pizarra soja 17/07 **$495.000**; negocio 21/07 → estándar +5 hábiles
  = **28/07/2026**; diferida 28/08/2026 → **31 días** excedentes; tasa 30%:
  `diferido = 495000×(1+0,30×31/365) = 507.612,3287671233`. Inversas cierran:
  `precioConPago = 495000` · `tasaImplicita = 29,999999999999993` · `diasDesdeTasa = 30,999999999999996`.
- **Bordes:** días=0 → diferido = base; factor=0 → NaN por guard; WORKDAY a mediodía UTC (inmune a
  DST). Borde técnico menor: `sumarHabiles` itera n veces sin clamp — un n gigante tipeado cuelga el
  tab del propio usuario (aplica también a calc-negocios-pago); sugerencia: clamp ≤365.
- **Veredicto:** **OK** (1:1 con el Excel documentado).

### Ficha 1.5: Negocios con pagos — descuento del futuro al pago (calc-negocios-pago.tsx, inline)
- **Esperado (docs):** CONTEXTO 08/07 (confirmado por Lautaro): `disponible = futuro ÷ (1 + tasa ×
  días/365)`, días del pago (hoy+5 hábiles, editable) al vto; `pesos = ⌊disponible × TC⌋`.
- **Implementación:** `src/components/calc-negocios-pago.tsx:30-41` — NO reusa `diferido.ts`, replica
  la misma matemática inline (duplicación menor, verificada idéntica).
- **Ejemplo verificado:** futuro SOJ.ROS/NOV26 **349,3**, vto real 2026-11-20, hoy 21/07 → pago
  28/07 → **115 días**; tasa 8%: `disponible = 340,71218599679315` · `descuento = 8,587814003206859`
  · `directa = 2,520547945205487 %` · `pesos(TC 1469) = 500.506` (floor). Consistencia INTRATE:
  `(ft/disp −1)×365/115 = 8,000000000000023 %` — recupera exacto la tasa cargada.
- **Bordes:** vto < pago → días=0 → disponible = futuro; ft≤0 → NaN; floor=ROUNDDOWN para positivos.
- **Veredicto:** **OK.** Dos notas: (1) FORMULAS_EXCEL r27-36 documenta la fórmula VIEJA
  (`base × (1 − tasa × meses_al_vto)`, meses=días/30 → daría ≈339,83 vs 340,71): el doc quedó
  desactualizado respecto de lo confirmado el 08/07 — alinear FORMULAS_EXCEL. (2) Fórmula inline en
  el componente en vez de reusar `precioConPago` — a E4.

### Ficha 1.6: Pases — spread, tasa directa, TNA, quita (pases.ts + calc-pases.tsx)
- **Esperado (docs):** FORMULAS_EXCEL r25-28 (`pase = larga − corta`; tasa directa del pase) +
  CONTEXTO 08/07 (quita USD sobre el spread lleno) + módulo Pases (TNA con días entre vtos).
- **Implementación:** `src/lib/pases.ts:10-20`; quita inline `calc-pases.tsx:32`; días
  `calc-pases.tsx:29` (`max(0, diasCorridos(vtoCorta, vtoLarga))`).
- **Ejemplo verificado (cierres 20/07):** SOJ NOV26 **349,3** → MAY27 **337,8** (invertido):
  `spread = −11,5` · quita 1 → **a cliente −12,5** · `dir = −3,2922988834812483 %` · 182 días
  (idéntico por picker fin-de-mes y por vencimientos reales 20/11→21/05) →
  `TNA = −6,602687321267339 %`. Contango MAI SEP26 190 → DIC26 194: spread +4 ·
  dir 2,1052631578947434 % · TNA(92d) 8,35240274599545 %.
- **Bordes:** vtoLarga<vtoCorta → días 0 → TNA NaN (no muestra tasa con signo invertido); corta=0 →
  NaN. Probado.
- **Veredicto:** **OK.**

### Ficha 1.7: Carry entre posiciones (arbitraje.ts + calc-arbitraje.tsx)
- **Esperado (docs):** FORMULAS_EXCEL r12-18: `dir = fut/pizarra − 1` · `TNA = dir×365/días`
  (INTRATE act/365) · `spread = fut − pizarra`; TEA estándar `(fut/pizarra)^(365/d) − 1`.
- **Implementación:** `src/lib/arbitraje.ts:13-32` (guards `!(x>0)` que atrapan NaN);
  `calc-arbitrale.tsx:35-53` señal por signo de TNA.
- **Ejemplo verificado (21/07):** cercana = pizarra soja 336,96, lejana = SOJ.ROS/NOV26 349,3,
  vto picker 30/11 → 132 días: `dir = 3,662155745489093 %` · `TNA = 10,126415508359992 %` ·
  `TEA = 10,456764980671252 %` · `spread = 12,34`. Con vto real 20/11 (122 días):
  TNA 10,956449566422286 % / TEA 11,360884999291576 %.
- **Bordes:** pizarra=0, días≤0, NaN → NaN. Probado.
- **Veredicto:** **OK.**

### Ficha 1.8: Negocios de planta — 6 rubros (calc-planta.tsx, inline)
- **Esperado (docs):** sesión 2026-07-11: final = arranque − Σ(flete + secada + merma + paritaria +
  embolsado + otros); secada = puntos × valor/punto (fijo 5 USD o editable); **merma = % sobre el
  ARRANQUE** (confirmado por Lautaro); defaults merma 0,3 / paritaria 4,5.
- **Implementación:** `src/components/calc-planta.tsx:64-81` (merma sobre arranque ✓, defaults ✓).
- **Ejemplo verificado:** arranque = pizarra soja 336,96; flete 10, secada 2 pts fijo → 10, merma
  0,3% → **1,01088**, paritaria 4,5, embolsado 3, otros 2 → gastos **30,51088** → **final 306,44912**.
- **Bordes:** arranque vacío/≤0 → "—"; inputs vacíos → 0; negativos no se clampean (input degenerado,
  sin crash).
- **Veredicto:** **OK** en fórmulas. Hallazgo de estructura: única calculadora 100% inline → extraer a
  `src/lib/planta.ts` (a E4).

### Ficha 1.9 (transversal familia 1): Días al vto del picker de curva — fin de mes vs vencimiento real
- **Esperado (docs):** CONTEXTO 09/07 documenta la simplificación: `vtoDePosicion("JUL26")` = último
  día del mes, "suficiente para el plazo". El panel Arbitrajes usa el vencimiento REAL de la tabla
  `vencimientos` (seed CEM `maturityDate`).
- **Implementación:** `src/lib/curva.ts:24-32` (fin de mes) vs `arbitrajes-cierres.ts` (tabla real).
- **Ejemplo verificado:** SOJ.ROS/NOV26 — vencimiento real **2026-11-20** vs picker **2026-11-30** →
  122 vs 132 días → TNA **10,96 %** (panel) vs **10,13 %** (calculadora) para el mismo par
  (−0,83 pp). En pases el efecto se cancela (182 días por ambos caminos); en toda tasa contra HOY
  sesga la TNA a la baja. El campo fecha es editable (es un default, no un techo).
- **Veredicto:** **PREGUNTA a Lautaro** — ¿el picker debería traer el vencimiento real de
  `vencimientos` (ya está en la base) en vez de fin de mes?

## Familia 2 — Estrategias con opciones + costos

### Ficha 2.1: Payoff por pata (estrategias.ts)
- **Esperado (docs):** ESTRATEGIAS_CATALOGO §fórmulas — FUT± = ±(P − entrada) · CALL+ = max(P−K,0) − prima ·
  CALL− = prima − max(P−K,0) · PUT± análogos, × contratos; combinado = Σ patas.
- **Implementación:** `src/lib/estrategias.ts:16-25` (`q = cttos × ±1` distribuye compra/venta;
  algebraicamente idéntico a las 6 fórmulas del doc).
- **Ejemplos verificados (ejecutados):** CALL+ K300 p10 ×2 → @320 = **+20**, @290 = **−20**; PUT+ K300
  p8 → @280 = **+12**, @310 = **−8**; FUT+ e320 ×3 @330 = **+30**; espejos de venta con signo invertido.
  Todos = valor analítico.
- **Bordes:** cttos NaN → 0 (pata neutra); prima negativa aceptada (input libre); patas vacías → 0.
- **Veredicto:** **OK.**

### Ficha 2.2: Los 27 presets vs catálogo
- **Verificado:** cotejo pata por pata de los 27 presets (`estrategias.ts:46-141`) contra
  ESTRATEGIAS_CATALOGO — tipo, lado, strike relativo (K± = ±1 paso) y multiplicadores ×2: **27/27
  coinciden**. Sanity ejecutado: bull call primas default (9/4) → @365 = +10, @275 = −5, BE = 325 ✓;
  collar piso −15/techo +15 ✓; sintético largo @340 = +20 ✓.
- **Faltantes vs catálogo (ausentes, no erróneos):** mariposa vendida, cóndor de calls, call/put
  backspread (sin justificación en docs); calendar/diagonal y 2x1/acumulador excluidos por el propio
  doc (requieren Black-76 / fuera del MVP). Además el catálogo define "Resultado = Σ patas −
  comisiones" (25 USD/ctto, IVA, tamaño de contrato) y la calc no descuenta comisiones — etapa (c)
  declarada pendiente en el propio catálogo, no bug.
- **Veredicto:** **OK** en lo implementado + **PREGUNTA** (¿sumar los 4 presets omitidos? ¿las
  comisiones siguen en el backlog?).

### Ficha 2.3: pr() — primas por defecto (decaen con distancia al ATM)
- **Esperado (docs):** NO EXISTE en docs — el catálogo dice que las primas reales vienen de la cadena
  CBOT/A3 "cuando se conecte la fuente". Es un default inventado en código ("Editable luego").
- **Implementación:** `src/lib/estrategias.ts:28-31` — `prima = max(1, round(0.6·S·e^(−0.7·d)))`,
  d = |K−B|/S. ATM ≈ 60% del paso; decae ~50% por paso; piso 1 USD; sin skew call/put.
- **Ejemplo (B=320, S=15):** ATM → **9** · ±1 → **4** · ±2 → **2** · ±3 → **1**.
- **Bordes:** S=0 → guard `(S||1)` → prima 1, sin NaN.
- **Veredicto:** **PREGUNTA a Lautaro** — placeholder razonable pero no validado. Efecto concreto: el
  collar default queda "gratis" (put 305 = 4 = call 335), lo que puede sugerir que el collar real es
  siempre costo cero. ¿Validás el default o preferís primas vacías hasta conectar la cadena?

### Ficha 2.4: breakevens() por interpolación
- **Implementación:** `src/lib/estrategias.ts:160-173` (cruce por cero + interpolación lineal, guard
  div/0).
- **Verificado:** con presets es EXACTO (la grilla 6S/60 = 0,1S hace que todos los strikes B±kS caigan
  en puntos de grilla): call+ K320 p9 → BE = **329 exacto**. Strike editado fuera de grilla → error
  ≤10% del paso (331,75 vs 331,9 analítico). **BE fuera de ±3S se pierde** (venta call prima 60 → BE
  380 > hi 365 → "—" aunque existe). Futuro → BE = [entrada] ✓; payoff plano → [] sin falsos BE ✓.
- **Veredicto:** **OK** (observación menor: BE fuera de rango no se reporta — inherente al método).

### Ficha 2.5: serieEscenarios() ±3S
- **Implementación:** `src/lib/estrategias.ts:146-157` — lo = max(0, B−3S), hi = B+3S, 61 puntos.
- **Bordes ejecutados:** S=0 → `[]` (sin div/0 ni loop); B=10 S=15 → lo clampeado a 0 (sin precios
  negativos); patas vacías → serie de ceros.
- **Veredicto:** **OK.**

### Ficha 2.6: Resumen máx G/P del componente (calc-estrategias.tsx)
- **Implementación:** `calc-estrategias.tsx:101-103` — maxG/maxP = max/min de la serie ±3S; prima neta
  = Σ(±p·cttos) con etiqueta costo/ingreso (convención correcta).
- **Ejemplo:** venta de call B=320 S=15 p=9 → muestra máx. ganancia **+9** (correcto) y máx. pérdida
  **−36** — que es el borde del rango: la pérdida real es **ilimitada** (@420 = −91). Mitigado porque
  la explicación del preset sí dice "pérdida ilimitada"; una pata manual no tiene ese texto.
- **Veredicto:** **PREGUNTA a Lautaro** — ¿mostrar "ilimitada" cuando la pendiente en el extremo del
  rango es no nula, en vez del número del borde?

### Ficha 2.7: costos.ts — tarifario Cocos + prorrateo TNA
- **Esperado (docs):** CONTEXTO 07-08/07: tarifario real Cocos, humana/jurídica, comisiones % TNA
  prorrateadas por plazo; fórmulas en el header del archivo (`com% = tna ? pct×días/365 : pct`;
  IVA sobre comisión+derechos).
- **Implementación:** `src/lib/costos.ts:27-73` (12 instrumentos, `comEfectivaPct`, `costoFila`).
- **Ejemplo verificado:** letras humana 1,5% TNA, 30 días, $1.000.000 → com% 0,12329% → comisión
  **$1.232,88** + derechos $100 + IVA $279,90 → total **$1.612,78 = 0,1613%**. Acciones 0,45% flat →
  $6.050 = 0,605%.
- **Cotejo Cocos:** la web oficial NO es alcanzable desde el sandbox (proxy 403/503). Cotejo por
  fuente secundaria (transcripción Rankia del tarifario, 21/05/2026): **12/12 valores coinciden**
  (acciones 0,45/0,40 · CEDEARs 0,45/0,25 · letras 1,5 TNA/0,25 · futuros 0,1/0,20 · cauciones 2/5 y
  10/10 TNA · cheque 1/1 TNA · etc.). El tarifario 2026 agrega planes Gold/Pro/AFI (0% en varios
  rubros) que la calc no modela.
- **Bordes:** monto=0 → NaN → "—"; días negativos → comisión negativa (sin guard, input libre, menor).
- **Veredicto:** **OK** en matemática; vigencia verificada por fuente secundaria + **PREGUNTA menor**
  (¿modelar los planes Gold/Pro o alcanza humana/jurídica?).

## Familia 3 — Dólar y tasas (market.ts)

> Las 3 APIs respondieron en vivo desde el sandbox el 21/07/2026: MAE `/resumen/FOR` y `/resumen/DDF`
> y data912 `/live/arg_notes`. Ejemplos con datos REALES.

### Ficha 3.1: Referencia oficial mayorista UST$T (getMaeOficial)
- **Esperado (docs):** CONTEXTO §Metodología: "Referencia oficial = oficial mayorista MAE (ticker
  UST$T de resumen/FOR). NO el minorista."
- **Implementación:** `src/lib/market.ts:165-172` — `find(ticker === "UST$T") ?? find(startsWith("UST$"))`
  sobre el array filtrado a `ultimo > 0`. Toma la PRIMERA fila por orden de array.
- **Verificado en vivo (21/07):** `/resumen/FOR` trae **DOS filas UST$T**: plazo `000` (T+0) =
  **1.481,00** y plazo `001` (T+1) = **1.482,50**. El código devuelve 1.481,00 (la primera). UST$T
  **sigue vigente** en la fuente.
- **Bordes:** sin UST$T → fallback `UST$` no matchea USMEP → null → panel degrada "MAE caído". OK.
- **Veredicto:** **PREGUNTA a Lautaro** — la elección T+0 vs T+1 es implícita (orden del array), y en
  plazos cortos es material: DLR JUL26 (1.488, 10 días) → TNA **17,25%** con spot 1.481 (T+0) vs
  **13,54%** con 1.482,5 (T+1). ¿Cuál es tu referencia (T+0, T+1 "divisa", o el A3500 de BCRA)? Si es
  T+0, conviene fijarlo por campo `plazo === "000"` y no por orden.

### Ficha 3.2: Dólar futuro — directa/TNA/TEA/TEM (getDolarFuturo)
- **Esperado (docs):** directa = Fut/Spot − 1 · TNA = directa×365/días · TEA = (Fut/Spot)^(365/d) − 1
  · TEM = (1+TEA)^(1/12) − 1 (CONTEXTO §Metodología).
- **Implementación:** `src/lib/market.ts:293-348` — idéntico, `dias = max(1, round(...))`.
- **Ejemplo verificado (REAL, 21/07):** DLR082026 ultimo **1.513**, spot **1.481**, venc 31/08 → 41
  días → directa **2,1607%** · TNA **19,24%** · TEA **20,96%** · TEM **1,599%** (recalculado a mano
  ✓). 9/9 posiciones vivas parsean y calculan.
- **Bordes:** días clampeado a 1 (sin div/0 ni exponente ∞); spot null/0 → tasas null + "parcial";
  TEA > −1 garantizado → TEM nunca NaN. Sin filtro de vencidos (hoy MAE no lista vencidos; latente).
- **Veredicto:** **OK.**

### Ficha 3.3: Parser parseDdf (tickers MAE DDF)
- **Implementación:** `src/lib/market.ts:176-186` — regex `^DLR(\d{2})(\d{4})$` (formato REAL de MAE;
  el "DLR/JUL26" de A3 vive en a3.ts), valida mes 1-12 / año 2000-2100; venc = último día calendario
  del mes (aproximación declarada "fino en Fase B").
- **Verificado (REAL):** DLR072026 → JUL26/2026-07-31 ✓; 9/9 tickers vivos; batería negativa
  (DLR132026, DLR001999, DLRAB2026…) → null ✓.
- **Bordes:** fin de mes en finde sobrecuenta 1-2 días → TNA levemente subestimada (OCT26: 21,26% vs
  21,47% real) — aproximación documentada en el código. TZ del server (UTC) puede correr ±1 día.
- **Veredicto:** **OK** (aproximación declarada, no bug).

### Ficha 3.4: Dólar linked — TC implícito/spread/TNA/TEA/TEM (getDolarLinked)
- **Esperado (docs):** TC implícito = Px/100 · spread = Oficial − TCimpl · tasas con Oficial/TCimpl.
- **Implementación:** `src/lib/market.ts:388-447` — idéntico (+ `difMep` informativo del panel).
- **Ejemplo verificado (REAL):** D31G6 c = **146.780** → tcImpl **1.467,8**; oficial 1.481; 41 días →
  spread **+13,2** · TNA **8,01%** · TEA **8,30%** · TEM **0,666%** (a mano ✓). 5/5 bonos D vivos OK.
- **Bordes:** px≤0 descartado (sin div/0); venc no parseable → tasas null; venc pasado → días=1 → TNA
  gigante (latente, feed hoy no trae vencidos).
- **Veredicto:** **OK.**

### Ficha 3.5: Parser vencFromTicker (linked + LECAPs)
- **Implementación:** `src/lib/market.ts:373-386` — regex `^[DS](\d{2})([EFMAYJLGSOND])(\d)$`; tabla
  de letras BYMA: E=ene F=feb M=mar A=abr Y=may J=jun L=jul G=ago S=sep O=oct N=nov D=dic; año 1
  dígito → `2020 + d` (ventana fija 2020-2029).
- **Verificado (REAL, 15 casos):** D30S6→30/09/2026 · D31L6→31/07/2026 · D31G6→31/08/2026 ·
  D31M7→31/03/2027 · D10Y7→10/05/2027 · S13N6→13/11/2026 — 13/13 tickers vivos coherentes (el linked
  más corto tiene tcImpl más pegado al oficial ✓). Negativos → null ✓.
- **Bordes:** ticker de 2030 caería a 2020 (pasado) → latente hasta que se emitan; día no validado
  contra mes (31/sep rodaría a 01/10) — sin casos reales. Nota: CONTEXTO dice "yy" (2 dígitos) pero el
  año real es 1 dígito — imprecisión del doc, el código sigue la realidad.
- **Veredicto:** **OK** (borde de década para Fase B).

### Ficha 3.6: LECAPs (getLecaps) e implícitas combinadas
- **LECAPs** (`market.ts:510-535`): filtra `^S\d`, excluye sufijo D (dollar-settled); SOLO precio +
  venc, ninguna tasa — fiel al estado "PARCIAL, TIR pendiente" que documenta CONTEXTO. 8 LECAPs reales
  listadas ✓. **OK.**
- **Implícitas combinadas** (`implicitas-panel.tsx:20-44`): no calcula nada — grafica las TNA de
  futuro y linked tal cual + granos de `sample.ts` marcado "(ej.)" y status parcial. Verificado: a 41
  días conviven Fut AGO26 19,24% y D31G6 8,01% (mismos valores de las fichas). **OK.**
- **Observación menor (cinta):** `market.ts:222` admite como "posición más cercana" contratos vencidos
  hace hasta 40 días (hoy inocuo, MAE no lista vencidos) — anotar para Fase B.
