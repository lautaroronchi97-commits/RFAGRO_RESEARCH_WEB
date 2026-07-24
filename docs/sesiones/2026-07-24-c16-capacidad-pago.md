# Sesión 2026-07-24 — Capacidad de pago (BCR vs Nuestro vs Pizarra)

- **Rama:** `claude/c16-payment-capacity-formulas-0de77e` · **PR:** #76 (base `main`)
- **Objetivo pedido por Lautaro:** el pendiente P11/C15 del backlog maestro ("modelo propio de
  capacidad de pago"), pero con un pedido explícito distinto al del prompt original: en vez de
  que Lautaro aporte su fórmula a mano (paso 1 del prompt de `PLAN_BACKLOG.md`), pidió
  **investigar con mucha profundidad** las fórmulas de capacidad de pago (tema que él considera
  "controversial"), qué otras formas existen de calcularla y qué otros organismos la calculan —
  con **upgrade de modelo a Fable** para esa investigación — y construir con eso un modelo propio,
  usando MAGyP como fuente de FOB para automatizar a diario (o verificando si coincide con el que
  toma BCR). Pidió además que el tablero de capacidad de pago muestre, por grano: 1º el valor de
  BCR, 2º el nuestro, 3º la pizarra, con el diferencial de cada modelo para ver si el grano se
  está sobre- o sub-pagando. Adjuntó el PDF de metodología de BCR ("Metodología de FAS teórico
  EXPORTACIÓN y FAS Teórico INDUSTRIA", Dirección de Informaciones y Estudios Económicos, BCR,
  26/10/2021) como insumo.

## Investigación (con Fable, `Agent` con `model: "fable"`)

Se lanzó un research profundo (WebSearch/WebFetch) sobre 5 ejes, además de trabajo propio de
reconocimiento con requests reales (`curl`/`fetch` desde el sandbox). Resultado completo del
agente archivado en el historial de la sesión; resumen de lo accionable:

1. **FOB oficial de SAGyP/MAGyP**: existe una **API JSON pública sin auth**,
   `https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php?Fecha=dd/mm/aaaa`,
   verificada en vivo (24/07/2026): devuelve, por posición arancelaria (NCM) y ventana de
   embarque, el FOB oficial que fija la Subsecretaría de Mercados Agroalimentarios — la MISMA
   base imponible que usan los derechos de exportación. Es la vía que la propia página de "Precios
   FOB Oficiales" ofrece como **fallback explícito** para "situaciones técnicas" de red (el
   subdominio `monitorsiogranos.magyp.gob.ar` es uno de los que ya sabíamos bloqueados desde
   Actions/sandboxes — `www.magyp.gob.ar` no lo está, es el mismo dominio que ya usa
   `ingest-compras.mjs`). Desde abril 2025 (**Resolución 65/2025**) el FOB oficial se calcula con
   una metodología nueva, menos discrecional, más pegada a fuentes de mercado — reduce (no
   elimina) la brecha vs el FOB de broker que usa BCR.
2. **Otros organismos/entidades**: SAGyP publica su PROPIO FAS teórico (columna "FAS D.E.R." en
   `magyp.gob.ar/mercadosagropecuarios/precios.php`, marco normativo **Resolución 42/2007**, para
   soja/girasol siempre vía industria — capacidad de pago de la industria aceitera). La Bolsa de
   Comercio de Buenos Aires republica el FOB/FAS oficial (no calcula uno propio). La Cámara
   Arbitral de Bahía Blanca publica precios orientativos del físico, sin FAS propio. La Cámara
   Arbitral de Rosario es la contraparte de "lo que paga el mercado" (pizarra), no calcula FAS.
   Bolsa de Cereales de Córdoba usa el FAS teórico como referencia analítica sin metodología
   propia. Consultoras (fyo/Simón Santana, Márgenes Agropecuarios) publican análisis recurrentes
   "FAS teórico vs FAS de mercado" con la misma fórmula de fondo. **Caso de referencia real de la
   controversia**: en 2017 ASAGIR + el entonces Ministerio de Agroindustria + las Bolsas tuvieron
   que ACORDAR formalmente cómo calcular el FAS teórico del girasol porque las diferencias de
   criterio generaban "discusiones innecesarias" — la fórmula no es una verdad única, es materia
   de convención.
3. **Reintegros**: no hay evidencia de reintegro vigente para grano sin procesar (el propio Anexo
   1 del PDF de BCR no aplica ninguno en su ejemplo real; el régimen general de reintegros apunta
   a manufacturas). Se modela como parámetro en 0%, no como constante fija — por si algún día se
   reactiva.
4. **Gastos actualizados 2025/26**: no hay una tabla pública itemizada más nueva que el Anexo 1 de
   2021 — pero **BCR publica a diario los agregados** (impuestos/gastos portuarios/gastos
   comerciales, en USD/tn, por grano) en la misma planilla que ya scrapeábamos. Se usa ESO como
   semilla diaria en vez de perseguir un desglose que nadie publica actualizado.
5. **La controversia (por qué el FAS teórico y lo que paga el mercado difieren)**: la explicación
   dominante 2025-2026 es la **expectativa de baja de retenciones adelantada al precio** (con
   DEX 26% nominal, en oct-2025 el mercado pagaba una alícuota implícita de 16,5-18,5% —
   fyo/Infocampo); también compite la necesidad de originar contra DJVE ya registradas (documentado
   desde 2016) y que BCR **excluye por diseño** cualquier margen/prima de riesgo del exportador.
   Conclusión operativa: mostrar 3 lecturas lado a lado no es redundante, es la forma correcta de
   exponer una controversia real del mercado.

## Homologación del FOB oficial (posición NCM → grano)

La API de MAGyP identifica cada precio por una posición arancelaria opaca (ej. `10059010190Y`),
sin nombres legibles. Se homologó **empíricamente, no por nomenclador**: se pidió la misma fecha
(21/01/2025) a la API JSON y al dataset histórico de datos.gob.ar (`sspm-precios-fob-oficiales`,
que sí trae columnas con nombre legible, ej. `habas_soja_demas_granel_hasta_15_porciento_embolsado`)
y se matchearon los precios EXACTOS de ese día para desambiguar la posición correcta:

| Grano | Posición NCM homologada | Verificación |
|---|---|---|
| Soja | `12019000190C` | 420 (21/01/2025) = `habas_soja_demas...` exacto |
| Maíz | `10059010190Y` | 232 = `maiz_demas_grano...` exacto (**no** es pisingallo pese a compartir prefijo NCM de 8 dígitos con esa variedad, ni el maíz flint/plata premium) |
| Trigo | `10019900110W` | 229 = `trigo_granel...` exacto (**no** la familia `10011900*`, que resultó ser trigo duro/candeal, no el trigo pan que opera Argentina) |
| Sorgo | `10079000100W` | 205 = `sorgo_granifero_demas...` exacto |
| Girasol | `12060090910Y` | 445 = `semilla_girasol_unica_ind_demas...` exacto (**no** la posición `...290L`, que resultó ser girasol confitero, con un precio ~40% mayor) |

Cross-check adicional (23/07/2026, en vivo): los valores de estas posiciones (trigo 237, maíz 214,
soja 470, sorgo 223, girasol 502) coinciden casi exacto con la columna "SAGyP" que la propia BCR
muestra en su planilla — confirma que homologamos la misma referencia que usa BCR como base.

## Hecho

- **`src/lib/fob-oficial.ts` + `src/lib/fob-oficial-parse.ts`**: fetch del FOB oficial diario de
  SAGyP/MAGyP (server-only, cacheado como pizarra/capacidad), con reintento hacia atrás hasta 7
  días si el día pedido no tiene circular publicada todavía (fin de semana/feriado/aún no
  publicó). `filaSpot` (puro, testeado) elige la ventana de embarque más cercana entre las que
  publica cada posición.
- **`src/lib/capacidad-modelo.ts`**: lib pura del cálculo propio — misma estructura que BCR (FOB
  − derechos + reintegro − gastos portuarios − gastos comerciales), más un término EXPLÍCITO de
  margen de riesgo del exportador (default 0) que BCR omite por diseño — la controversia
  convertida en una perilla del modelo, no en un misterio escondido en la brecha. Alícuotas
  vigentes al 18/07/2026 (Decreto 877/2025 + Decreto 423/2026): soja 24% · maíz/sorgo 8,5% ·
  trigo/cebada 5,5% · girasol 4,5% (`docs/negocio/05`). `cfgSembrada()` siembra gastos
  portuarios/comerciales desde los propios a/b/c que publica BCR a diario (si BCR está caído, cae
  a un fallback fijo con el orden de magnitud del Anexo 1 del PDF 2021).
- **`src/lib/capacidad-bcr-parse.ts`**: reescritura del parser de la planilla de BCR. El parser
  viejo perdía sorgo/girasol enteros y tomaba un valor ambiguo para trigo/soja (mezclaba
  Trigo+Sorgo y Soja+Girasol en el mismo bloque HTML). Regla nueva, verificada por consistencia
  aritmética real contra el fixture (`impuestos ÷ FOB = alícuota DEX vigente`, exacto para los 5
  granos; `FOB − Total = FAS`, exacto): el primer valor numérico de cada fila de costos es siempre
  el grano listado primero en el bloque "Commodity" (columna SAGyP, sin los colspans de las
  posiciones forward "Up River"), y el ÚLTIMO valor es siempre el grano listado segundo (también
  SAGyP — sorgo y girasol solo cotizan spot en esa planilla, nunca forward).
- **`src/lib/capacidad.ts`**: orquesta las 3 fuentes (BCR + FOB oficial + pizarra) para los 5
  granos que BCR calcula (antes solo 3: soja/maíz/trigo — se sumaron sorgo y girasol, mismo
  universo que ya cubre `pizarra.ts`). Calcula `fasBcr`, `fasNuestro`, `pizarra`, y el diferencial
  de cada modelo teórico contra la pizarra (USD/tn y %). Overrides manuales por env:
  `CAPACIDAD_OVERRIDE` (legado, pisa el FAS de BCR) y `CAPACIDAD_MODELO_OVERRIDE` (pisa el FAS
  "Nuestro" ya calculado).
- **`src/components/capacidad-editable.tsx`** (client) + **`capacidad-panel.tsx`** (server):
  tabla con Grano | BCR | Nuestro | Pizarra | Dif. BCR | Dif. Nuestro, coloreada verde/rojo según
  el diferencial sea positivo (mercado paga por encima de lo teórico = "sobrepagado", bueno para
  el productor) o negativo ("subpagado", hay margen sin trasladar). Debajo, un desplegable
  "Ajustar los supuestos de 'Nuestro'" con 5 inputs editables por grano (retenciones, reintegro,
  gastos portuarios USD/tn, gastos comerciales %, margen de riesgo USD/tn) que recalculan el FAS
  propio EN VIVO en el navegador (mismas funciones puras de `capacidad-modelo.ts`, sin ir al
  servidor) — con botón ↺ por grano para volver a los supuestos sembrados de BCR.
- **`src/lib/lineup/semaforo.ts`**: ajustado el único consumidor existente de `CapGrano.fas`
  (la señal "físico → precio" de `/comercio/senal`) para seguir usando `fasBcr` — se dejó
  anclado a BCR a propósito (esa señal fue calibrada y verificada 1:1 contra ese número en su
  sesión original; cambiar la fuente por debajo la destunearía sin que nadie lo pidiera).

## Decisiones tomadas (y por qué)

- **Los derechos de exportación se calculan SIEMPRE sobre el FOB oficial**, nunca sobre un FOB de
  mercado/broker — es la base imponible legal, y es la recomendación explícita del research
  (evita el error metodológico de mezclar bases). Consecuencia: "Nuestro" y la columna SAGyP de
  BCR parten de la MISMA fuente de precio, así el diferencial entre ambos modelos aísla
  puramente la diferencia de SUPUESTOS de gastos, no de dónde sale el FOB.
- **FOB independiente, no reverse-engineered de BCR**: en vez de tratar de extraer con precisión
  la columna "SAGyP" del HTML de BCR (colspans ambiguos en las posiciones forward), "Nuestro" usa
  la API propia de SAGyP/MAGyP — una fuente separada que, además, es la misma fila que
  Lautaro pidió explorar ("importar los FOB de MAGyP"). BCR sigue siendo la fuente de la columna
  "BCR" (scrape de su planilla, ahora corregido).
- **Gastos sembrados desde BCR, editables, no inventados**: en vez de fijar un número propio sin
  respaldo, el día 1 "Nuestro" arranca calibrado contra el mismo costeo que publica BCR (la única
  fuente pública con el desglose actualizado, ajustada 1x/año por encuesta real a exportadoras) —
  Lautaro ajusta a mano si consigue mejores números (tarifas reales que le pasen sus contactos,
  corretajes distintos, etc.).
- **Margen de riesgo explícito (default 0)**: el research encontró que la explicación #1 de la
  brecha FAS-teórico-vs-mercado es algo que BCR excluye por diseño (riesgo/expectativa/
  competencia por originar) — se modela como un input visible en vez de dejarlo indistinguible
  dentro de "gastos comerciales".
- **Extensión a 5 granos** (se suman sorgo y girasol a los 3 que ya tenía el panel): BCR calcula
  FAS teórico para los 5, y `pizarra.ts` ya los traía (sumados en B3/22-23/07 para "Negocios de
  planta") — sin esto, "verificar contra BCR" hubiera quedado incompleto para 2 de sus 5 filas.
  Sorgo y girasol no tienen glifo propio en el sitio (solo tienen futuro A3 soja/maíz/trigo) — se
  muestran sin ícono en vez de inventar uno.
- **`semaforo.ts` se queda con `fasBcr`, no pasa a `fasNuestro`**: es una decisión conservadora —
  esa señal (`/comercio/senal`) fue construida y verificada 1:1 contra el número de BCR en su
  propia sesión; migrarla al modelo editable de esta sesión sin que nadie lo pidiera cambiaría su
  comportamiento (y su calibración) como efecto secundario no solicitado.

## Verificado

- **181/181 tests** (30 nuevos: `capacidad-bcr-parse.test.ts`, `capacidad-modelo.test.ts`,
  `fob-oficial-parse.test.ts`) — incluye 2 fixtures REALES (el HTML de la planilla de BCR
  capturado el 22/07/2026 en `src/lib/__fixtures__/capacidad-bcr-sheet.html`, y la respuesta real
  de la API de FOB oficial del 23/07/2026), con checks de consistencia aritmética contra las
  alícuotas vigentes documentadas.
- lint / `tsc --noEmit` / `npm run build` ✅.
- **Bug real encontrado y corregido antes de mostrarlo**: la primera versión de `cfgSembrada`
  dejaba `gastosComercialesPct` en unidades de "USD/tn" en vez de convertirlo a fracción del FOB
  (faltaba dividir por 100 después de armar el % — el factor de la fórmula se iba brutalmente
  negativo). Se detectó al levantar `/granos` con datos reales (FAS "Nuestro" daba −821 para soja,
  −8.998 para girasol) — nunca hubiera aparecido en un test que solo ejercitara
  `calcularFasTeorico` con un `cfg` armado a mano (el bug estaba en el "glue" de siembra, no en la
  fórmula pura). Se extrajo `cfgSembrada` a `capacidad-modelo.ts` (antes vivía sin exportar dentro
  de `capacidad.ts`, server-only, no testeable) y se agregó un test de regresión con los números
  reales del fixture de trigo.
- **Navegador con datos reales** (Playwright, Chromium headless, `/granos#capacidad`, claro y
  oscuro, desktop 1280px y mobile 390px): los 5 granos muestran BCR/Nuestro casi idénticos (misma
  fuente de FOB y gastos sembrados de BCR — soja 337,10 vs 337,10, girasol 376,96 vs 377,03) y
  Pizarra con diferenciales plausibles (soja +3,1% sobrepagado, sorgo −7,0% subpagado, girasol
  +19,4% sobrepagado — grano menos líquido). El desplegable "Ajustar supuestos" se probó
  interactivamente: subir retenciones de soja del 24% al 30% recalculó Nuestro de 337,10 a 308,90
  en vivo (verificado a mano: 470×0,06 ≈ 28,2 de baja, exacto), y el botón ↺ restauró el valor
  sembrado.

## Follow-up en la misma sesión/PR: FAS Teórico INDUSTRIA (soja) — 4ª lectura

Después del build inicial, Lautaro compartió un Google Sheet (`preciosFAS`, 4 pestañas:
Parámetros, InputsMercado, Crush, DesgloseCostos, FASExportacion) hecho por un tercero que
entiende la materia, "vigente 04/2026", pidiendo verificar el modelo. La hoja de Google no era
accesible (401, no pública) — exportó CSV de cada pestaña.

**Verificación del modelo de referencia**: internamente consistente y bien sourceado —
rindes de molienda (19,5% aceite / 71,2% harina / 6,0% cáscara / 3,3% desecho = 100,0%) coinciden
casi al decimal con el Anexo 2 del PDF de BCR 2021; retenciones aceite/harina 22,5% coinciden con
`docs/negocio/05`; fobbing poroto USD 8,2/tn está a 0,2 del que sembramos en vivo desde BCR (8,4);
y, crucialmente, **retenciones calculadas sobre FOB SAGyP (oficial), nunca sobre FOB mercado** —
la MISMA decisión de diseño que ya habíamos tomado para "Nuestro" (grano), confirmada
independientemente por un tercero.

**El hallazgo real**: ese documento no calcula lo mismo que ya construimos (FAS Teórico
EXPORTACIÓN, poroto sin procesar) — calcula el **FAS Teórico INDUSTRIA** de BCR (el complejo
aceite+harina que crushea la industria aceitera), la OTRA metodología del PDF (Anexo 2). En la
práctica argentina el número de industria suele ser el que de verdad mueve el precio que le pagan
al productor de soja (casi toda la soja se cruza acá, muy poca se exporta como poroto entero) —
justo el tipo de matiz "controversial" que motivó todo C16.

**Decisión (`AskUserQuestion`)**: Lautaro eligió sumar FAS Industria como 4ª lectura ("Soja
(industria)"), sin tocar el cálculo de grano ya construido.

**Build**:
- `capacidad-bcr-parse.ts`: nuevo `parseBcrIndustria()` — parsea la sección "Cálculo del FAS
  Teórico para la Industria Aceitera Exportadora" de la MISMA planilla de BCR (la que `parseBcr`
  descarta a propósito). Mismo criterio 1er/último valor (soja primero, girasol al final), con
  UNA mejora real de robustez descubierta acá: se agregó `contarColumnas()` — un chequeo contra
  la fila "Puertos/Ports" para NO asignarle al segundo grano un valor que en realidad pertenece
  al primero cuando una celda viene rota (encontrado con datos reales: la celda de pellets de
  girasol trae un typo real de BCR, `"v165,0"`, que no parsea como número — sin el chequeo, el
  código le asignaba a girasol el 2º valor de soja por error). Este chequeo NO se aplicó a
  `parseBcr` (la tabla de grano): ahí la fila de posiciones no tiene 1:1 con las filas de datos
  (colspans distintos), aplicarlo hubiera roto la extracción de sorgo que ya funcionaba.
- `capacidad-industria-modelo.ts`: fórmula pura, reproduce EXACTO el modelo de referencia
  (verificado línea por línea contra sus propios números de ejemplo) salvo la cáscara —
  omitida a propósito: ni la API de FOB oficial ni la planilla en vivo de BCR publican una
  posición propia para pellets de cáscara de soja, y ponerle un FOB inventado es peor que
  omitirla (subestima el precio compuesto ~6-8 USD/tn, documentado). Gastos comerciales
  calculados sobre la PIZARRA/A3 de soja (no el FOB) — así lo define el modelo de referencia,
  distinto del grano; no se tocó el grano para no cambiarle comportamiento sin que nadie lo pidiera.
- `fob-oficial.ts`: sumadas 2 posiciones más (`SOJ_ACEITE`=15071000100Q, `SOJ_HARINA`=23040010100B),
  homologadas con el MISMO cruce empírico que los 5 granos (fecha 21/01/2025 vs datos.gob.ar) —
  fuera del cómputo de status "real"/"parcial" de los 5 granos principales (es un cálculo aparte).
- `capacidad-editable.tsx`/`capacidad-panel.tsx`: fila nueva "Soja (industria)" en la MISMA tabla
  (mismas 6 columnas), con su propio bloque editable aparte (retenciones/fobbing/rinde por
  producto + gastos comerciales + costo de industrialización + margen de riesgo), recalculando en
  vivo con la misma arquitectura que el grano.

**Verificado**: 20 tests nuevos (194 total) con 2 fixtures reales más (HTML de la sección
Industria de BCR del 23/07/2026, con el typo real de girasol incluido — el caso que motivó el
chequeo de columnas; datos reales de la API de FOB oficial para aceite/harina) · lint/tsc/build ✅
· navegador con datos reales: fila "Soja (industria)" BCR=340,40 / Nuestro=335,85 / Pizarra=347,64
— ambos modelos teóricos bien por debajo de la pizarra (Dif. BCR +2,1%, Dif. Nuestro +3,5%),
consistente con la explicación de la controversia que dio el research (expectativa de baja de
retenciones adelantada al precio); edición en vivo probada a mano (retenciones aceite 22,5%→30%
recalculó 335,85→318,21, exacto: Δ=0,075×FOB oficial aceite×rinde aceite).

## Quedó pendiente / en vuelo

- **Girasol (industria)**: `parseBcrIndustria` YA extrae el FAS Teórico de girasol que publica
  BCR (columna "Complejo Girasol", verificado en el test — 486,8 el 23/07/2026), pero no se
  construyó un "Nuestro Industria" para girasol: el documento de referencia solo trajo parámetros
  de soja (rindes/retenciones/fobbing de girasol son distintos — otro rinde de aceite, sin la
  posición de harina de soja). Si Lautaro consigue esos parámetros, es una extensión chica sobre
  la misma `capacidad-industria-modelo.ts` (generalizar de "soja" a un 2º grano).
- **Cáscara de soja**: omitida del "Nuestro Industria" por no tener una posición NCM de FOB
  oficial verificada (ver `capacidad-industria-modelo.ts`) — subestima el precio compuesto en
  ~6-8 USD/tn. Si en algún momento se homologa esa posición (o Lautaro confirma que no existe FOB
  oficial para cáscara y hay que usar otra fuente), se puede sumar sin tocar el resto de la fórmula.
- **Confirmar con Lautaro** (es un modelo nuevo, "controversial" por su propio pedido): que la
  homologación de posiciones NCM es la correcta desde SU conocimiento de mercado (documentado
  arriba con la evidencia numérica, pero él puede confirmar con un vistazo si "trigo pan" /
  "maíz estándar" / "girasol aceitero" son efectivamente lo que opera todos los días) y que el
  criterio de sembrar los gastos desde BCR (en vez de, por ejemplo, un valor fijo propio) le sirve
  como punto de partida.
- **SAGyP publica su propio FAS teórico** (`magyp.gob.ar/mercadosagropecuarios/precios.php`,
  columna "FAS D.E.R.", marco Resolución 42/2007) — no se sumó como 4ª columna (el pedido fue
  BCR/Nuestro/Pizarra, 3 lecturas) ni se automatizó (no hay API, es HTML). Queda anotado como
  candidato si en algún momento se quiere una 4ª referencia 100% oficial sin editar.
- **El dataset histórico de datos.gob.ar** (`sspm-precios-fob-oficiales`, usado para homologar
  posiciones) está desactualizado como fuente de datos vivos (última fila real: 2025-01-21, pese
  a que el catálogo dice "actualizado hoy") — no se usa para nada en producción, solo sirvió para
  la homologación empírica de este research; si algún día hace falta un backfill histórico de FOB
  oficial, es la fuente más simple (aunque haya que reconciliar el corte de actualización).
- **No hay un backfill/tabla histórica** del FOB oficial ni del FAS "Nuestro" — como `pizarra.ts`
  y el `capacidad.ts` viejo, todo es lectura en vivo cacheada (sin tabla nueva en Supabase). Si
  más adelante se quiere graficar la evolución de "Nuestro" en el tiempo, hace falta un cron +
  tabla (no pedido en este alcance).

## Trampas descubiertas (para la próxima sesión)

- **La API de FOB oficial no publica el día corriente hasta que MAGyP emite la circular** —
  probado en vivo: pedir la fecha de HOY (24/07/2026, un viernes hábil) devolvió `[]` a media
  mañana, mientras que ayer y anteayer sí tenían datos completos. El código ya maneja esto
  (reintento hacia atrás hasta 7 días), pero si se construye algo nuevo sobre esta API hay que
  asumir el mismo patrón "T-1 hasta que publique" que ya tienen pizarra/CBOT.
- **Las posiciones NCM de la API NO tienen nombres legibles** y el comunicado oficial de 2022 que
  parece nombrar una posición ("1005.90.10 Maíz Pisingallo") puede no corresponder 1:1 al código
  compacto que devuelve la API hoy — la homologación por descripción textual sola hubiera sido un
  error real (casi se usó el prefijo NCM equivocado para maíz). La única forma confiable que
  encontramos fue el cruce numérico por fecha contra el dataset con nombres de datos.gob.ar.
- **La planilla de BCR mezcla dos granos por bloque HTML** (Trigo+Sorgo, Soja+Girasol) sin que el
  HTML lo declare limpiamente por columna (hay colspans no capturados por un parser simple de
  celdas) — la regla "primer valor = primer grano, último valor = último grano" funciona porque
  las columnas SAGyP (spot) de ambos son siempre las únicas sin variantes forward, pero es frágil
  si BCR cambia el layout de la planilla (agrega otra posición spot, por ejemplo). Si el parser
  empieza a fallar el test de consistencia aritmética (`impuestos ÷ FOB ≈ alícuota vigente`), es
  la primera pista de que el layout cambió.
