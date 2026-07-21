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

## Familia 4 — Paneles de granos (arbitrajes, pases, capacidad, mejor caja, vivas)

> Datos de los ejemplos (REST anon, 21/07/2026): ajustes `futuros_cierres_ultimo` del 20/07 (16
> posiciones vivas), pizarra CAC viva del 17/07 (soja 336,96 US$ / 495.000 $ · maíz 185 · trigo 200 —
> 1:1 con `pizarra_historico`), `vencimientos` completa para las 16 vivas (cero huecos).

### Ficha 4.1: Arbitrajes — spread / tasa directa / TNA USD (arbitrajes-cierres.ts)
- **Esperado (docs):** FORMULAS_EXCEL §Arbitrajes: `dir = fut/pizarra − 1` · `TNA = dir×365/días`
  (INTRATE act/365, días = vto real − hoy) · `spread = fut − pizarra`.
- **Implementación:** `src/lib/arbitrajes-cierres.ts:58-69` (round2; `dias = diasHasta(vencimientos)`
  anclado a T12:00-03:00; guards `pizarra > 0`, `dias > 0`). Término a término igual al doc.
- **Ejemplos verificados (21/07):** SOJ NOV26 — 349,3 vs 336,96, vto 20/11 → 122 días: `spread 12,34`
  · `directa 3,66%` · `TNA 10,95%`. MAI DIC26 (194 vs 185, 153 d) → +9,00 / 4,86% / **11,59%**.
  TRI ENE27 (226,9 vs 200, 185 d) → +26,90 / 13,45% / **26,54%**.
- **Bordes (testeados):** pizarra=0 → directa/TNA null pero el spread se muestra igual (cosmético);
  sin vto → TNA null; vto pasado dentro del mes (24-31/07) → posición listada con TNA "—" (filtro de
  vivas es por mes); días=3 → TNA 912,5% (fiel a la fórmula). Precisión: la TNA se anualiza sobre la
  directa YA redondeada a 2 dec (±0,01 vs sin doble redondeo; idéntico server/client → consistente).
- **Veredicto:** **OK** (2 observaciones menores, no bugs).

### Ficha 4.2: 1ª columna dinámica + recálculo en vivo (arbitrajes-table/editable + rueda.ts)
- **Esperado (ESTADO, PR #26):** fuera de rueda = ajuste; en rueda y post-cierre = último operado A3;
  spread/directa/TNA recalculados sobre esa referencia con la MISMA fórmula.
- **Implementación:** `arbitrajes-table.tsx:25-62` (`modoOperado = ruedaAgroCorrioHoy() && fecha !==
  hoy && live responde`; cae al ajuste si A3 no responde); `rueda.ts:56-64` (L-V ≥10:30, sin tope →
  cubre post-cierre y se apaga cuando entra el ajuste del día); recálculo client
  `arbitrajes-editable.tsx:162-170` — **idéntico carácter por carácter** al server (mismo round2,
  base 365, guards) y usa los mismos días calculados en server (regeneración cada 30 s).
- **Ejemplo:** pizarra editada a 340 en SOJ NOV26 (ref 349,3, 122 d) → spread 9,30 · directa 2,74% ·
  TNA 8,20% — misma aritmética que el server.
- **Bordes:** input vacío/no numérico → "—"; feriado entre semana → modoOperado con last arrastrado
  (mitigado: el punto "vivo" queda apagado con vol 0); entre 17:00 y el cron CEM (23:00 UTC) sigue
  "Últ. operado" — comportamiento pedido.
- **Veredicto:** **OK** — paridad server/cliente exacta.

### Ficha 4.3: Pases (pases-cierres.ts)
- **Esperado (docs):** pase = ajuste larga − ajuste corta · directa = larga/corta − 1 · TNA =
  directa×365/(vto_larga − vto_cercana) · `spreadSymbol` formato A3 `SOJ.ROS/POS1/POS2`.
- **Implementación:** `pases-cierres.ts:57-84` (guards pc>0, dias>0; `ultimo` solo si ambas patas
  operaron — close>0; spreadSymbol ✓).
- **Ejemplos verificados (20/07):** SOJ JUL26 (339) / NOV26 (349,3), vtos 24/07→20/11 = 119 días:
  `+10,30 / 3,04% / TNA 9,32%`. MAI JUL26 (190,3) / AGO26 (188), 31 d: `−2,30 / −1,21% / −14,25%`
  (backwardation sensata).
- **Bordes:** falta vto → TNA null; días≤0 → null; cercana vencida dentro del mes → días entre vtos
  siguen bien (no dependen de hoy).
- **Veredicto:** **OK** en fórmulas + **PREGUNTA menor**: CONTEXTO habla de posiciones
  "consecutivas" pero el código arma la cercana contra CADA lejana (JUL26/SEP26, JUL26/NOV26, …) y no
  muestra p.ej. SOJ SEP26/NOV26 (= +5,80, 58 d, TNA 10,63%). ¿Es el esquema deseado? (Si sí, alinear
  CONTEXTO.)

### Ficha 4.4: Capacidad de pago — FAS teórico BCR (capacidad.ts)
- **Esperado (docs):** fila "FAS Teórico en u$s", 2º valor = Up River (Rosario) — elegido por
  Lautaro; override `CAPACIDad_OVERRIDE`.
- **Cotejo fuente VIVA (21/07, HTTP 200):** estructura intacta; fila Puerto = `SAGyP, Up River …` →
  **el 2º valor sigue siendo Up River**. Parser transcripto sobre el HTML vivo: TRI **211,09** ·
  MAI **194,96** · SOJ **341,81** (planilla 17/07), vs SAGyP 203,50/177,77/326,10.
- **Bordes:** BCR caída → degrada a pizarra sola; guard anti-pisadas evita que el sorgo contamine.
  2 menores para E4: comentario de `parseFas` (línea 50) dice "primer valor" y el código toma el 2º
  (comentario obsoleto); `if (v)` descarta valores 0 corriendo el índice (si SAGyP viniera vacía,
  `nums[1]` dejaría de ser Up River — hoy no ocurre).
- **Veredicto:** **OK** (verificado contra la fuente viva).

### Ficha 4.5: Mejor para hacer caja (mejor-caja-panel.tsx)
- **Esperado (docs):** negocio/01 §5 — "se vende el de MENOR tasa implícita".
- **Implementación:** `mejor-caja-panel.tsx:31-46` — reusa `getArbitrajes()` (cero fórmulas propias),
  min(TNA) por grano, orden ascendente.
- **Ejemplo verificado (21/07):** mínimos: SOJ = MAY27 **0,30%** · MAI = JUL27 **0,54%** · TRI =
  MAR27 **21,97%** → ranking 1º Soja, 2º Maíz, 3º Trigo — 1:1 con la semántica del negocio.
- **Bordes:** min con signo → una TNA negativa ganaría, y es coherente (esperar con tasa negativa es
  peor que vender hoy); TNA null se saltea.
- **Veredicto:** **OK.**

### Ficha 4.6: Filtro de posiciones vivas duplicado (curva.ts vs futuros.ts) + paridad transversal
- **Test de paridad ejecutado (22 casos + batería propia de 17):** `vencKey` de curva/futuros
  **matemáticamente idénticas** en todos los símbolos (misma regex, misma tabla, misma clave);
  `hoyVencKey` copia idéntica. Única divergencia: los casos `vencKey=0` (DISPO, vacío, malformados) —
  **futuros los CONSERVA** (disponible primero) y **curva los DESCARTA** — intencional y documentada.
  Verificado por REST: hoy la vista no tiene NINGUNA fila SOJ/MAI/TRI con posición no estándar → 
  impacto nulo. `FEB28 → 2028-02-29` (bisiesto OK).
- **Borde documental (hallazgo menor):** el comentario `futuros.ts:53` dice "DIS24 → 0" pero `DIS24`
  matchea la regex → vencKey 202400 → se descartaría como vencida, no se mostraría como disponible.
  Latente (no hay filas así). Corregir comentario o contemplar el prefijo DIS.
- **Bordes de plazo entre módulos:** arbitrajes/pases usan vto REAL (`vencimientos`); la curva de
  calculadoras usa fin de mes — mismo símbolo, hasta 7-10 días de diferencia (ver ficha 1.9).
- **Veredicto:** **OK** (sugerencia E4: unificar `vencKey`/`hoyVencKey` en un módulo único).

## Familia 6 — Otros módulos (negociado, estimaciones, calendario, derivadas, noticias, monitor, hábiles)

### Ficha 6.1: compras/negociado.ts — campaña activa / Δ / % cosecha / % priceado / saldo
- **Esperado (docs):** sesión 2026-07-20: campaña activa = la de MAYOR venta semanal; Δ vs semana
  anterior; acumulado; % cosecha vía `compras_avance_hist`; % priceado = (hecho+fijado)/acumulado;
  saldo a fijar; lee `compras` sin filtrar fuente; % cosecha solo con filtro "Todos".
- **Implementación:** `src/lib/compras/negociado.ts:94-246` + `negociado-tabla.tsx:51-66`.
- **Ejemplos verificados (REST, semana 08/07/2026):** trigo 25/26 Export acumulado **16.238.900 t**
  (= control MAGyP) ✓ · activa trigo 25/26 (234.100 > 48.700 de 26/27) ✓ · total semanal global
  **2.568.000 t**, líder MAIZE **1.380.600 t** (= ESTADO) ✓ · Δ trigo 25/26 Export = 150.500 −
  136.300 = **+14.200 t** · % priceado trigo 25/26 = (14.759.100+3.237.800)/19.883.200 = **90,5 %**
  (identidad priceado+saldo ≈ acumulado, dif 100 t de origen) ✓ · % cosecha 0,712149 → **71,2 %**
  (= 19.883.200/27.920.000 USDA, el valor de ESTADO) ✓.
- **Bordes:** producto atrasado usa SU última fecha; sin fila previa → Δ "—" (no 0); campañas sin
  movimiento se ocultan; histograma recorta 130 semanas por orden ISO.
- **Veredicto:** **OK.**

### Ficha 6.2: estimaciones.ts — Δ entre vintages + campaniaVigente
- **Esperado (docs):** pizarra con Δ vs vintage anterior de la MISMA campaña; `campaniaVigente`
  prefiere la última campaña CON producción (fix 12/07: BCR-trigo 29,5 de 2025/26, no "—" de 2026/27).
- **Implementación:** `src/lib/estimaciones.ts:169-179, 206-250, 271-302`.
- **Ejemplo verificado (datos reales):** BCR/argentina/trigo — 2026/27 solo `area` (6,95, GEA #196
  08/07), 2025/26 con producción → pizarra **29,5 Mt** (caso exacto del fix) ✓. Δ último vintage 0,00
  (29,5→29,5); salto 11/02→13/05 daría **+1,80** ✓.
- **Bordes:** campañas "YYYY/YY" ordenan bien como string; dos vintages con la misma
  fecha_publicacion → orden inestable (hoy imposible, PK incluye fecha).
- **Veredicto:** **OK.**

### Ficha 6.3: calendario.ts — conversiones TZ + corrimiento por feriado
- **Esperado (docs):** PLAN_CALENDARIO: WASDE 12:00 ET → 13:00 AR (EDT) / 14:00 AR (EST); CONAB
  09:00 Brasília = 09:00 AR (Brasil sin DST desde 2019); PAS jueves 15:00 AR; "GEA semanal: jueves
  ~17:30 (**viernes** si feriado)".
- **Verificado a mano:** (i) WASDE 12/08 12:00 EDT → **13:00 AR** ✓ y 10/12 12:00 EST → **14:00 AR**
  ✓; (ii) CONAB **09:00 AR** en jul y nov ✓ (Intl `America/Sao_Paulo` sin DST — asunción correcta);
  (iii) PAS 23/07 **15:00 AR** ✓. `nEsimoDiaDeSemana`: 2º mié ago = 12/08 = plan ✓.
- **Hallazgo (contradicción documental, NO bug de código):** `corrigeFeriadoAR`
  (`calendario.ts:161-168`) corre al hábil **ANTERIOR** y su docstring lo declara ("los informes AR
  se adelantan"); el call-site (`:280` "se corre a viernes por feriado") y el plan dicen corrimiento a
  **viernes**. Dirimido contra la realidad por SQL: el GEA real de la semana del feriado
  (jueves 09/07/2026) está fechado **2026-07-08 (miércoles)** en `estimaciones_produccion` ("GEA
  mensual #196") → **BCR efectivamente ADELANTA** → el código está bien y el plan + comentario del
  call-site están mal. Fix propuesto: corregir el comentario de `:280` y el plan; confirmar con
  Lautaro la regla para DEA (SAGyP) que comparte la función.
- **Veredicto:** **OK el código** + hallazgo documental (evidencia SQL) + confirmación DEA a Lautaro.

### Ficha 6.4: derivadas.ts — joinFfill / spread / ratio / percentil / bandas
- **Esperado (docs):** join por fecha con ffill ≤3 ruedas (P18); spread = lejana − cercana; banda
  min-máx + mediana; validaciones del Excel: spread 2021-04-05 = 125,6 · ratio U7 = 0,5796.
- **Implementación:** `src/lib/derivadas.ts:47-66, 75-88, 97-121, 194-210`.
- **Ejemplos verificados (futuros_cierres reales):** SOJ MAY22 304,1 − MAI ABR22 178,5 al 2021-04-05
  = **125,6** = Excel ✓ · ratio 238,8/412 al 2022-02-14 = **0,5796** = celda U7 ✓ ·
  `percentil(3,[1,2,3,4]) = 75` ✓ · `mediana([3,1,2,4]) = 2,5` ✓ · hueco de 4 ruedas → ffill emite
  hasta la 4ª y corta (maxGap 3) ✓.
- **Bordes:** serie vacía → []/NaN manejado por el caller; ratio con vb=0 → punto omitido;
  `ruedasHasta` proxy L-V sin feriados (aproximación documentada); `difDias` a mediodía −03:00.
- **Veredicto:** **OK.**

### Ficha 6.5: noticias.ts + noticias-clasificar.ts — clustering / score / clasificación
- **Esperado (docs):** dedup semántica: se unen si (≥4 tokens comunes Y jaccard ≥0,5) O (cifra
  distintiva compartida Y ≥3 tokens); score = 0,32·recencia + 0,3·cobertura + 0,2·tier +
  0,18·categoría (suma 1); clasificación = primera categoría del JSON que matchea.
- **Ejemplos verificados (títulos reales del 20/07):** par "soja US$450" La Nación vs Clarín →
  jaccard **0,231** (no une) pero cifra "450" compartida + ≥3 tokens → **clusterizan por la rama de
  cifra** ✓ (la regla completa es jaccard O cifra — el resumen "jaccard ≥0,5" de los docs es la
  mitad). Clasificación 3 reales: "…US$450…" → mercados ✓ · "Súper Niño" → clima ✓ · "USDA Crop
  Progress" → informes ✓. Gate: "La Yoli… Criollos" → null → filtrada ✓.
- **Bordes:** clustering greedy contra semilla (documentado); sin fecha → rec 0,15; `corteHabilesMs`
  sin feriados AR (documentado inline).
- **Veredicto:** **OK.**

### Ficha 6.6: monitor-mercados.ts — conversiones y parser de posición
- **Cotejo de factores vs `scripts/ingest-cbot.mjs` (carácter a carácter):** soja/trigo `0.3674371`,
  maíz `0.3936826` — **idénticos** en los tres granos (monitor-mercados.ts:58/61/62 vs
  ingest-cbot.mjs:34-36). Harina `1.1023113` y aceite `22.046226` re-derivados de la definición CME
  (1000/907,18474 y 1000/0,45359237/100) — exactos dígito a dígito.
- **Ejemplos verificados (los 4 del plan):** soja 1.226,5 ¢/bu → **450,66 ≈ 450,7** ✓ · maíz 473,25
  → 186,3 ✓ · harina 323 → 356,0 ✓ · aceite 72,06 → 1.588,7 ✓. Maní: CNY/tn ÷ (CNY/USD) = USD/tn
  (dimensionalmente correcto; Δ vs prevSettle de Sina, convención estándar de futuros documentada).
- **Parser `parsePos`:** "Soybean Futures,Nov-2026" → NOV26 · "…Sep-2" (año truncado) → SEP26
  (front-month) · "Crude Oil Sep 26" → SEP26 ✓. Borde: en la semana post-vencimiento un nombre
  truncado del mes corriente podría rotular el año viejo (cosmético).
- **Veredicto:** **OK.**

### Ficha 6.7: habiles.ts + dates.ts — feriados y días a mediodía
- **Implementación:** `habiles.ts:9-22` (feriados 2025-2027; 2027 "estimado — revisar");
  `dates.ts:7-28` (fechas a `T12:00:00-03:00`, round).
- **Ejemplos verificados:** `diasEntre` cruzando el arranque (08/03/2026) y el fin (01/11/2026) del
  DST de EEUU → **4 y 4 exactos** (el −03:00 fijo + mediodía absorben cualquier resto sub-día — ese
  es el porqué del mediodía) · `sumarHabiles(mié 08/07/2026, 1)` = **10/07** (saltea el feriado del
  09/07) ✓ · `sumarHabiles(vie 03/07, 5)` = **13/07** ✓.
- **Bordes:** fuera de 2025-2027 todo L-V cuenta hábil (sin lista); en 2027 conviven `2027-06-20`
  (domingo, redundante/typo inocuo) y `2027-06-21` — limpiar cuando Lautaro valide la lista 2027.
- **Veredicto:** **OK.**

## Familia 5 — Mesa / comercio exterior (src/lib/lineup/*)

> Port 1:1 de `LineUps_Code` (repo Python privado, NO está acá — la referencia son negocio/05, los
> docs de sesión de las Fases 0-4 y las migraciones SQL). Los tests del port (39/39 y 41/41 citados
> en ESTADO) NO están commiteados: fueron efímeros de sesión. El auditor armó suite propia en
> scratchpad (47 aserciones puras + harness con datos reales: módulos TS reales vs recomputación
> independiente).

### Ficha 5.1: campanas.ts — cotejo vs SQL campana_ini_year
- **Verificado:** cotejo exhaustivo TS vs reimplementación 1:1 de la SQL viva: **612/612 checks
  idénticos** (17 códigos × 12 meses × días 1/15/28). Bordes: SBS 15-mar→2025 / 1-abr→2026 · MAIZE
  1-mar→2026 · WHEAT 1-dic→2026 · SFSEED 1-feb→2026 · default ene. Única delta de cobertura:
  `SOJA_CRUSH: 4` existe solo en TS — correcto (sintético TS-only, nunca llega a la base). Trigo
  cruza el año ✓; bisiesto clampeado en `fechaEquivalente` ✓.
- **Veredicto:** **OK** — espejo exacto (el test de paridad para E4 sale gratis de acá).

### Ficha 5.2: cobertura.ts — gap foto-forward, umbrales 0,7/1,3, mín 5.000 t
- **Implementación:** `cobertura.ts:8-11, 21-24, 27-34, 42-60`.
- **Ejemplo verificado (rueda 20/07):** MAIZE declarado60d 8.577.497 / originado 2.335.750 → ratio
  **0,27 ALCISTA FAS** · SBS 0,08 ALCISTA · BARLEY 2,82 BAJISTA · SORGHUM 1,19 NEUTRO (consistente
  en signo con el 1:1 del 19/07; el drift es dato nuevo).
- **Bordes (testeados):** umbral exacto 0,7/1,3 → NEUTRO (desigualdad estricta); decl<5.000 nunca
  ALCISTA; decl≤0 ∧ orig≤0 → null; **decl=0 ∧ orig>0 → ratio ∞ → BAJISTA** aunque haya 1 t (el
  mínimo de 5.000 t solo protege el lado alcista). Sin div/0.
- **Veredicto:** **PREGUNTA a Lautaro** — (a) 0,7/1,3/5.000 t/cortes de intensidad 60k-720k son
  literales heredados de `cobertura.py` sin validación en el repo: ¿calibrados o provisorios?
  (b) ¿mínimo también del lado bajista? (hoy declarado 0 + originado 10.000 t → BAJISTA int. 1).

### Ficha 5.3: estacional.ts — percentil estacional ±15d, mín 2 campañas
- **Verificado (datos reales, snapshot 16/07):** módulo real vs recomputación independiente: MAIZE
  gap **39,4/39,4** · dens **94,4/94,4** · WHEAT 55,7 · 98,6 · SBS 38,0 · 17,5 — **8/8 idénticos** y
  coinciden con el 1:1 por SQL de la sesión (MAIZE 39/94, SBS 38/18).
- **Bordes (testeados):** 1 campaña → null; serie vacía → null; empates cuentan ≤ (percentil débil).
- **Veredicto:** **OK.**

### Ficha 5.4: mesa_calor.ts — pesos, bandas, matriz, equivalente poroto
- **Verificado:** `indiceCalor(80,60,30)` = 0,35·80+0,30·60+0,35·70 = **70,5** ✓ · sin farmer:
  46/0,65 = **70,77** (renormalización exacta) ✓ · `equivalentePoroto(745.000, 190.000)` =
  **2.000.000** ✓. Con datos reales (al 16/07): SOJA_CRUSH **87,5 CALIENTE ↗ DIFERIR** · MAIZE 56,4
  NEUTRO · WHEAT 76,1 FIRME. Bordes de banda exactos (80/79,99 · 20/19,99) ✓; pesos 0 → null sin
  div/0 ✓; rinde 0 → 0 ✓.
- **Veredicto:** **PREGUNTA a Lautaro** — mecánica OK; los literales **0,35/0,30/0,35**, bandas
  **80/60/40/20**, umbral dirección **32.500 t** (media Panamax), K=10 días y rindes
  **0,745 harina / 0,19 aceite** no tienen fuente en este repo (la spec vive en LineUps_Code).
  ¿Son tus parámetros de referencia o defaults del Python? (Sensibilidad: 10.000 t de aceite,
  0,19→0,185 mueve ~1.400 t de equivalente poroto.)

### Ficha 5.5: temperatura.ts — 3 patas + SOJA_CRUSH + degradación
- **Verificado (datos reales):** pipeline completo, módulos reales vs recomputación independiente:
  farmer MAIZE avance **49,7%** (08/07) → **pctl 59,1** (= "maíz 49,7%→pctl 59" del PR #40, exacto) ·
  WHEAT 71,2% → **22,7** (doc: 23 ✓) · SBS 43,3% → 0,0 (el doc del 19/07 decía 5: el dato cambió el
  20/07 con el fix ÷1000; la recomputación independiente da lo mismo que el módulo).
- **Bordes:** farmer <2 años → null → renormaliza; avance opcional; momentum degrada a SIN DATO;
  "hoy" por producto = máx fecha de SUS series (consistente aunque la matview se atrase).
- **Hallazgo operativo (no de fórmula):** `lineup_gap_hist`/`lineup_densidad_hist` llegan al
  **16/07** con `lineup` al **20/07** → el refresh post-ingesta no corrió (o falló en silencio). El
  índice muestra la foto del 16/07. → E5/healthcheck de matviews.
- **Veredicto:** **OK** (fórmulas).

### Ficha 5.6: semaforo.ts — señal física × capacidad × pizarra
- **Verificado:** soja = SBS+SBM+SBO: declarado 6.128.357 / originado 2.065.064 → ratio 0,34 ALCISTA
  (reusa `senalDe` exacta); spread = FAS − pizarra, resta directa; matriz 3×3 con degradación si
  falta FAS ✓.
- **Veredicto:** **OK** + pregunta menor: acá la soja suma poroto+harina+aceite en toneladas físicas
  SIN equivalente poroto (temperatura.ts sí lo usa) — ¿agregación intencional distinta?

### Ficha 5.7: empresas.ts — gap 60d, avance, ritmo, PY/UY aparte
- **Verificado (21/07):** tránsito PY/UY excluido = **223.058 t** de la rueda del 20/07 (≈3,4%,
  consistente con sesión); decisión "PY/UY fuera del ratio" respetada (`:136-140` `continue` antes de
  sumar); LD COMMODITIES → LDC ✓; ritmo con guards (sin historia → null; normal=0 → null) ✓;
  coerción `Number(camp_ini)` presente ✓.
- **BUG OBJETIVO (runtime, no de fórmula):** `djve_cobertura?select=*` — la query exacta de
  `getEmpresas` — devuelve **HTTP 500 `57014` statement timeout** vía PostgREST anon (reproducido
  2/2 por el auditor principal el 21/07 ~11:50 UTC, ~4-5 s cada intento; 3/3 por el subagente). La
  vista agrega los 334k de `djve` en cada request desde el backfill 2011-2025. Como `djveRes` es
  fatal (`empresas.ts:90-97`), **`/comercio/empresas` y `/comercio/senal` degradan a "fuente no
  disponible"**. Fix propuesto: materializar la vista (patrón `lineup_visitas`) o filtrar campañas
  viejas. (`lineup_estacional` falla intermitente 1/3 — vigilar.)
- **Menor:** exclusión PY/UY del TS incluye `\bPGY\b` (`shippers.ts:52`); las vistas SQL no (`\yPY\y|
  PARAGUAY|\yUY\y|URUGUAY`) → un shipper "… PGY" divergiría entre foto TS y originado SQL. Hoy ~0.
- **Veredicto:** **OK en fórmulas + BUG OBJETIVO operativo.**

### Ficha 5.8: embarque.ts — programa DJVE mensual, cumplimiento, a3De
- **Verificado (datos reales 21/07):** MAIZE jul-2026 = op30 1.153.251 + op360 2.700.818 =
  **3.854.069 t** (= "maíz JUL 3.854 kt" del 1:1 de la Fase 3, exacto) · embarcado jul-2026
  5.619.788 t / 214 buques → cumplimiento **146%** (= doc, leído como sano ✓) · año previo MAIZE
  jul-2025 = 4.659.773 t (el backfill alimenta la referencia) ✓ · embarcado solo i≤1 (mes corriente
  + borde) — coherente con "el line-up ve ~10 días" de negocio/05 ✓ · a3De: mes exacto o primera
  posición posterior ✓.
- **Veredicto:** **OK** (el módulo mejor anclado a doc).

### Ficha 5.9 (cortas): config.ts / zonas.ts / shippers.ts / foto.ts
- **config.ts:** roster decisión 8 exacto; MALT y fertilizantes → null ✓; SHULLS→SBM = el `case when`
  de todas las vistas ✓. **OK.**
- **zonas.ts:** berth antes que port; TERMINAL 6→Norte · GRAL. LAGOS→Sur · ING. WHITE→Bahía · SAN
  LORENZO s/berth→Norte · ROSARIO s/berth→Sur · QUEQUEN→Otros — ✓ decisión 9. **OK.**
- **shippers.ts:** primer match gana; ACA con tilde ✓; GLENCORE→VITERRA-BUNGE ✓; COFCO UY →
  {COFCO, UY} ✓; null→OTROS ✓. **OK** (nota PGY en 5.7).
- **foto.ts:** umbral buque nuevo 30.000 t (= `mesa_diff.py`, documentado "≥30kt" ✓); diff por buque,
  multi-cargo suma ✓; agregación verificada 1:1 vs SQL en Fase 1 (187 buques / 6.497.074 t). **OK.**

## Ficha transversal — Los 6 parsers de mes/posición duplicados

- **Alcance:** `curva.ts:18-39` · `futuros.ts:48-61` · `derivadas.ts:20-37,171` ·
  `market.ts:176-186` (parseDdf, dominio MAE `DLR<MM><YYYY>`) · `lineup/embarque.ts:31,76-79`
  (labelMes, dominio ISO) · `monitor-mercados.ts:89-118` (parsePos, dominio inglés Yahoo/Sina).
- **Test de paridad ejecutado (batería de 17 casos + 22 del subagente):** los `vencKey` de
  curva/futuros son **numéricamente idénticos en todos los inputs** (misma regex, misma tabla
  ENE..DIC, misma clave (2000+aa)·100+mm); `hoyVencKey` copia idéntica carácter a carácter;
  `mesDePosicion` (derivadas) consistente. Los otros 3 operan en dominios distintos (numérico MAE,
  ISO, inglés) con la MISMA tabla de nombres ENE..DIC → sin divergencia posible de meses.
- **Única divergencia real:** semántica del filtro con `vencKey=0` — futuros CONSERVA (disponible
  primero), curva DESCARTA — intencional y documentada; y el borde documental `futuros.ts:53`
  ("DIS24 → 0" pero DIS24 matchea la regex → 202400 → se descartaría como vencida). Verificado por
  SQL: **0 filas** con posición no estándar en `futuros_cierres` hoy → latente.
- **Veredicto:** **OK** — sin bug de paridad. Para E4: unificar `vencKey`/`hoyVencKey`/tabla de
  meses en un util único (6 copias es deuda, no defecto).
