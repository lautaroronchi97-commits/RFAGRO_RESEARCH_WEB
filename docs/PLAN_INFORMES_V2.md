# PLAN INFORMES V2 — research multi-agente + aprendizaje continuo ("la bola de nieve")

> **Qué es esto.** Plan para llevar las 4 piezas de informes generados por LLM (diario MP1,
> semanal MP2, view de mercado MP3, interpretaciones MP4) "a otro nivel": un orquestador
> (Fable) que lanza agentes de research sobre fuentes externas además de la web propia, y un
> view semanal **acumulativo** — la tesis de la semana pasada + lo nuevo de esta semana, con
> switches cuando un evento la invalida — como piensa un trader real.
>
> **Pedido de Lautaro (24/07/2026, textual en espíritu):** "quiero indicar un poco qué mirar,
> pero también quiero que vea lo que yo no veo; que se nutra de nuestra web pero también del
> resto; cuestionalo antes de arrancar; quiero lo mejor".
>
> **Relación con [`PLAN_INFORMES.md`](PLAN_INFORMES.md):** aquel plan (MP1-MP4) sigue siendo la
> base — las tablas, endpoints, plantillas, Routines y gates humanos NO se tiran. Este plan
> los **nutre**. Las decisiones de v1 que no se tocan están listadas en §8.
>
> **Base de evidencia:** todo lo afirmado acá sale del research del 24/07 (3 agentes:
> sesgos/multi-agente con papers · informes agro profesionales + fuentes verificadas con
> requests reales HOY · inventario exacto del repo). Referencias en §12.
>
> **Auditado (24/07):** un agente adversarial cruzó este plan contra el código real y encontró
> 3 huecos críticos (el disparo de BCBA-PAS no matcheaba nunca · faltaba la señal de camiones
> ya construida en los insumos del view · el scorecard tenía un agujero de roll de contrato)
> + 8 más chicos. Todos corregidos en esta versión — quedan marcados **[fix auditoría]** donde
> aplica para que quede el rastro.

---

## 0. Resumen ejecutivo

1. **La idea es buena y los ingredientes son inusualmente buenos** (universo de datos propio
   ya verificado + skill de voz + loop de feedback ya construido + historial en base). El
   riesgo NO es de capacidad: es de **disciplina de diseño**. Los sistemas de este tipo
   fallan por 4 vías medidas: anclaje a la propia tesis, citas externas falsas (11-57% en
   agentes de research profundo), volumen que ahoga el criterio, y memoria acumulada que
   corrompe. Las 4 tienen mitigación estructural conocida — este plan las incorpora de raíz.
2. **La bola de nieve se implementa con 3 piezas**: lectura *a ciegas* de los datos nuevos
   ANTES de ver la tesis previa (el anclaje no se arregla con instrucciones — está medido);
   **invalidadores numéricos pre-declarados e inmutables** chequeados mecánicamente al inicio
   de cada corrida (el switch se gatilla por condición, no por re-deliberación); y un
   **scorecard automático** (¿el view acertó contra el precio?) — sin eso no hay forma de
   saber si la bola de nieve mejora o degrada.
3. **El research externo entra por fan-out de agentes de SOLO lectura** con lentes distintas
   (Chicago/fondos, Sudamérica/clima, macro AR, expectativas), presupuesto fijo, y "pasaporte"
   por dato (URL + fecha + cita textual, verificado mecánicamente). La síntesis y la decisión
   son SIEMPRE de un solo hilo (el orquestador). Fuentes ya verificadas con requests reales:
   CFTC COT (posicionamiento de fondos, sin key), DTN (expectativas pre/post-WASDE, sin
   paywall), Crop Progress USDA (TXT parseable), EIA etanol, clima SMN/NOAA (§3).
4. **Dónde se aplica**: la reforma grande es **view-mercado** (interno mesa, falsable, sin
   riesgo de firma = el laboratorio perfecto). Interpretaciones suma "expectativa vs dato"
   (el salto de calidad más concreto: hoy compara vintage vs vintage; los desks reales
   comparan contra lo que el mercado esperaba). El semanal suma la sección "El mundo esta
   semana" + integra switches y scorecard. **El diario casi no se toca** (su valor es salir
   siempre, rápido, todos los días).
5. **Prerrequisito antes de sofisticar** (V0): verificar que las 3 Routines existentes
   disparen de punta a punta (hoy 0 disparos reales verificados) y hacer girar el loop de
   feedback que ya existe y está vacío. No se construye el piso 2 sin pisar el piso 1.
6. **Decisiones de Lautaro ya tomadas** (§10, 24/07): nota 1-5 en el feedback del view SÍ ·
   el semanal se queda en 5 páginas (lo nuevo entra recortando, no sumando) · el COT vive en
   semanal y view, no en el diario · la key gratuita de USDA FAS la registra él antes de V0.

---

## 1. La crítica primero — qué puede salir mal (pedido explícito: "cuestionalo")

Cada riesgo con su evidencia y su mitigación de diseño. Los prompts de §9 las implementan.

| # | Riesgo | Evidencia | Mitigación estructural |
|---|--------|-----------|------------------------|
| **R1** | **Anclaje a la propia tesis + sycophancy.** La "bola de nieve" naive (mostrar la tesis previa y pedir "actualizala") produce deriva confirmatoria: el modelo lee la tesis vigente y el feedback de Lautaro como "opinión del usuario" y tiende a confirmarla. | Anclaje medido en LLMs; los modelos MÁS capaces se anclan MÁS consistentemente; CoT/"ignorá el hint"/reflection **no alcanzan** ([2412.06593](https://arxiv.org/abs/2412.06593)). Sycophancy estructural por RLHF ([2310.13548](https://arxiv.org/abs/2310.13548)). El orden de presentación cambia el resultado ([2411.16594](https://arxiv.org/pdf/2411.16594)). | **Blind-first**: el view provisorio se forma con los datos nuevos SIN ver la tesis previa; la reconciliación es un paso posterior y separado (§4 F2-F3). El feedback destilado se redacta como criterio impersonal, nunca como "a Lautaro le gustó X view". |
| **R2** | **Citas externas falsas o desviadas.** Abrir a fuentes externas rompe el universo cerrado que hace cumplible la regla "ni un número inventado": el agente puede citar una URL inventada, rota, o real-pero-que-no-dice-eso. | Tasa medida en deep-research agents: 11-57% de citas problemáticas; la exactitud CAE ~42% cuando la búsqueda se profundiza de 2 a 150 tool calls ([2605.06635](https://arxiv.org/html/2605.06635)). | **Pasaporte de dato** obligatorio (URL + fecha + cita textual copiada) + **verificación mecánica** antes de la síntesis (¿la URL responde? ¿la cita aparece en la página?). Búsquedas cortas y acotadas, no profundas. Un dato externo NUNCA pisa un dato propio: si contradicen, se muestran los dos. Jerarquía: oficial > bolsa > medio especializado > agregador. |
| **R3** | **Más contexto ≠ mejor criterio.** El multi-agente produce volumen (cada agente "justifica su existencia" trayendo hallazgos) y el informe se vuelve sábana. La cabeza de trader es selección, no acumulación. | Modo de falla taxonomizado (MAST, [2503.13657](https://arxiv.org/abs/2503.13657)); la mitigación probada es formato fijo + presupuesto de salida ([Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)). | **La salida no crece**: mismo template del view (3-5 argumentos máx.), semanal sigue en 5 páginas. El research externo COMPITE por los mismos slots contra los datos propios — no agrega secciones infinitas. Presupuesto de tool calls fijo por agente. |
| **R4** | **Fragilidad operativa.** Más pasos + fuentes externas = más puntos de falla. Un informe que a veces no sale es peor que uno simple que sale siempre. Las Routines corren solas post-cierre. | Experiencia propia del repo: BCBA/Cloudflare 403, DEA bloqueada a nivel TLS, ISA bloqueando IPs de Actions. | **El research externo NUNCA está en el camino crítico**: si un agente falla o una fuente no responde, el informe sale igual con los datos propios (mismo patrón "degrada honesto" de toda la web) y lo dice. El diario NO lleva multi-agente. |
| **R5** | **Consumo de la suscripción.** El multi-agente cuesta ~15x tokens que un run simple. Las Routines corren con la suscripción de Lautaro (decisión v1: no gastar en API). | Medido por Anthropic en su propio sistema de research ([fuente](https://www.anthropic.com/engineering/multi-agent-research-system)). | Multi-agente SOLO en las piezas semanales (view + semanal) y en interpretaciones (frecuencia de informes de organismos). Diario queda mono-hilo. **Medir el consumo real en la primera corrida** de cada pieza y anotarlo en el doc de sesión antes de escalar. |
| **R6** | **Memoria que corrompe.** Destilar automáticamente el feedback a "reglas" degrada: está medido que la consolidación continua termina RINDIENDO PEOR que no tener memoria. | Con actualización automática continua, un modelo falló 54% de problemas que ya resolvía sin memoria ([2605.12978](https://arxiv.org/pdf/2605.12978)). Context rot: todo lo que se relee cada semana compite contra el razonamiento ([Chroma](https://www.trychroma.com/research/context-rot)). | Feedback crudo fechado como fuente primaria (ya existe: `feedback_lautaro`); destilación a reglas **manual/esporádica** (sesión de mantenimiento, nunca la Routine); `aprendizajes.md` con **cap duro ~200 líneas** (para agregar hay que borrar o fusionar); cada regla con fecha + origen. El prompt semanal NO acumula el historial completo: entra solo el último view + el archivo capado + los datos frescos. |
| **R7** | **La firma de Lautaro.** Más contenido externo = más riesgo de publicar algo que él no revisó y no puede defender ante un cliente. | Regla de v1: "su firma nunca sale sin su ojo". | **Ningún gate humano se relaja**: interpretaciones siguen borrador→OK; el view sigue interno mesa; en el semanal, todo dato externo va con su fuente citada EN el texto (si un cliente pregunta "¿de dónde salió?", la respuesta está impresa). |
| **R8** | **Inconsistencia corrida a corrida.** Con búsqueda web, cada run es distinto; un research profesional tiene formato y criterio estables — si el informe cambia de personalidad cada semana, pierde marca. | Varianza conocida del multi-agente; mitigación = síntesis con template fijo ([Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)). | El esqueleto lo pone la skill (formato fijo, mismas secciones siempre); el research alimenta, no estructura. La voz la pone `voz-lautaro` (invariante). |
| **R9** | **Sin medición no hay "otro nivel".** "Más profesional" es subjetivo; sin señal objetiva, la bola de nieve puede degradar sin que nadie lo note. | Estándar de la industria: hit-rate por analista y Brier score ([2402.18563](https://arxiv.org/abs/2402.18563)). | **Scorecard automático** del view (§5): dirección + confianza contra el precio real a 1-4 semanas, computado de `futuros_cierres` que ya está en casa. Es la pieza que convierte "me parece que mejoró" en un número. |

**¿Puede salir muy bueno? Sí.** Lo que separa este proyecto de los que fracasan en esto:
(a) el universo de datos propio ya está verificado 1:1 contra fuentes (auditoría E1-E7) — la
mayoría arranca sin eso; (b) la voz ya está resuelta (`voz-lautaro`) — imitar la voz era "la
parte difícil" según la propia decisión de v1; (c) el loop de feedback ya está construido
(solo falta usarlo); (d) el view es **falsable** — se puede medir. La condición es respetar
las mitigaciones de arriba como reglas duras, no como sugerencias.

---

## 2. Principios de diseño (destilados del research — valen para las 4 piezas)

- **P1 — Dos anillos de datos.** Anillo 1 (números propios): el universo cerrado de siempre —
  todo número citado sale del JSON de insumos; regla "ni un número inventado" intacta.
  Anillo 2 (externo): entra SOLO con pasaporte (URL + fecha + cita textual) verificado
  mecánicamente. Un dato del anillo 2 nunca pisa uno del anillo 1.
- **P2 — Lectura ciega antes de memoria.** Datos frescos → lectura independiente → recién ahí
  la tesis previa / el historial. Nunca al revés. (Es la única mitigación de anclaje con
  respaldo empírico; instruir "no te anches" está medido que NO funciona.)
- **P3 — Fan-out solo para recolectar; síntesis y decisión de un solo hilo.** Los subagentes
  leen con lentes distintas y devuelven hallazgos estructurados; el orquestador redacta solo
  y decide solo. Nada de "debate libre hasta consenso" (degenera en conformismo medido).
- **P4 — Salida de tamaño fijo.** El template no crece con el research. Criterio = qué quedó
  afuera.
- **P5 — Invalidadores numéricos, pre-declarados, inmutables.** Cada tesis lleva 2-3
  condiciones de invalidación con umbral medible contra datos que la web computa. El agente
  tiene PROHIBIDO editarlos en corridas posteriores (anti "mover los arcos") — solo Lautaro.
  Cada corrida arranca chequeándolos mecánicamente.
- **P6 — Episodios crudos por default; destilación gateada y capada.** El feedback vive crudo
  y fechado en la base; las reglas destiladas viven en un archivo con tope duro que se edita
  a mano, esporádicamente, con gate de señal ("¿una corrida futura actúa mejor por esto?").
- **P7 — Research aditivo, nunca camino crítico.** Toda pieza nueva degrada honesto: sin
  fuente externa, el informe sale igual y lo dice. Cero dependencia nueva para que "salga".

---

## 3. Fuentes externas nuevas (verificadas con requests reales el 24/07/2026)

### Las que entran (Top 5 por valor/esfuerzo)

| Fuente | URL / mecanismo | Qué aporta | Cadencia | Verificado |
|---|---|---|---|---|
| **CFTC COT desagregado** | `cftc.gov/dea/newcot/f_disagg.txt` (CSV plano) o API Socrata `publicreporting.cftc.gov/resource/72hh-3qpy.json` (JSON filtrable, histórico completo, sin key) | **Posicionamiento de fondos** (managed money neto + Δ semanal) en maíz/soja/trigo CBOT — EL dato que separa un informe de mesa de uno de diario ("fondos vendidos récord = cualquier susto climático dispara short covering") | Viernes ~15:30 ET (dato del martes) | ✅ 200 ambos, formato estable |
| **DTN pre/post-report** | `dtnpf.com/agriculture/web/ag/news/` + descubrimiento por Google News RSS la semana del informe | **Tablas de expectativas de analistas vs dato** (Avg/High/Low) para WASDE/Stocks/Acreage — habilita "el mercado esperaba X, salió Y" (hoy MP4 solo compara vintage vs vintage) | Pre ~T-3 y post cada informe USDA | ⚠️ Portada/índice 200 sin paywall; **[fix auditoría, MEDIO]** un chequeo posterior mostró que el TEXTO COMPLETO de artículos individuales pide login — no confirmado si la tabla de expectativas específica queda visible sin loguearse. Re-verificar con un artículo pre/post-WASDE completo antes de V2; si el gate la tapa, degradar a Pro Farmer como primario. |
| **USDA Crop Progress** | ESMIS API (`usda.library.cornell.edu/api/v1/...CropProg?latest=true`, sin key) → TXT plano | **Condición de cultivo EEUU** (% bueno/excelente por estado, vs año pasado) — el driver de Chicago de mayo a septiembre, hoy ausente del stack | Lunes 16:00 ET (abr-nov) | ✅ API 200 + TXT 200 parseable |
| **USDA FAS Export Sales** | `api.fas.usda.gov/api/esr/...` — **requiere key GRATIS** (registro 2 min) | Demanda EEUU semanal por país; lectura pro = "ritmo acumulado vs necesario para la meta WASDE" (la meta ya está en casa) | Jueves 8:30 ET | ⚠️ 403 sin key; key gratuita → **pedir a Lautaro que la registre** (§10) |
| **EIA etanol + AMS GTR** | `ir.eia.gov/wpsr/table9.csv` · `ams.usda.gov/.../gtr` (PDF semanal) | Demanda de maíz para etanol · fletes barcaza/oceánico (proxy gratis del Baltic) | Mié / Jue | ✅ 200 ambos |

### Secundarias (baratas, para los agentes de contexto)

- **Google News RSS** (✅ 200; ya se usa en `ingest-noticias.mjs` — es extender queries, no
  construir): descubrimiento de wires Reuters/Bloomberg ags en inglés.
- **World-Grain RSS** (✅ 200) · **Pro Farmer** (✅ 200) · **Canal Rural Brasil RSS** (✅ 200,
  complementa CONAB con el día a día) · **Notícias Agrícolas** (⚠️ homepage scrapeable, sin RSS).
- **Clima**: SMN Argentina JSON (✅ 200 sin auth) · NOAA CPC hazards (✅ 200 HTML) · Drought
  Monitor JSON (✅ 200) · ORA/INTA ya relevados en `FUENTES.md`.

### Las que NO (verificado, no insistir)

AgWeb (403 PerimeterX) · Successful Farming (402) · Agrolink (403) · CME FTP settlements
(403 explícito anti-scraping) · INMET Brasil (connection reset, mismo patrón TLS que
DEA-SAGyP) · Baltic Dry gratis (no existe; el flete oceánico del GTR es el sustituto).

### Decisión de arquitectura: fetch-en-vivo, no ingesta nueva (v1)

Los agentes fetchean estas fuentes **en el momento de la corrida** (cero infra nueva, cero
cron nuevo, cero tabla nueva). Para percentiles históricos de posicionamiento, la API Socrata
del CFTC ya trae el histórico completo filtrable — se computa al vuelo, no hace falta
acumular nada propio. Si en unas semanas una fuente demuestra valor sostenido y hace falta
historia propia (ej. COT diario en el panel web, no solo en informes), AHÍ se promueve a
ingesta con el patrón de siempre — decisión aparte, no de este plan.

---

## 4. Arquitectura de la corrida semanal del view v2 (el corazón del plan)

La Routine del viernes (MP3) pasa de "un prompt lineal" a un pipeline orquestado. La skill
la define paso a paso; el orquestador es la propia sesión (**hoy Opus** — Lautaro lo puso a
mano, ver §10 pregunta 5 — el diseño del pipeline es agnóstico al modelo; Fable cuando esté
disponible para Routines), los agentes son subagentes de solo lectura.

**[fix auditoría, MENOR] Precondición no confirmada**: el diseño F1/F4 asume que una sesión
corriendo como Routine puede invocar el tool de subagentes para lanzar el fan-out en
paralelo de verdad. Ningún doc del repo lo confirma (`PLAN_INFORMES.md` solo define el
worker como "una sesión nueva de Claude Code"). El prompt V0/V1 debe verificarlo primero —
si no está disponible, el "fan-out" en la práctica corre secuencial (cambia la matemática de
consumo de R5).

```
F0  Chequeo mecánico de invalidadores            (sin LLM opinando: dato vs umbral)
F1  Fan-out de recolección (4 agentes paralelos, SOLO lectura, presupuesto fijo)
F2  View provisorio A CIEGAS                     (datos propios + hallazgos verificados;
                                                  SIN ver la tesis previa)
F3  Reconciliación                               (recién acá: tesis previa + F0 + scorecard
                                                  → CONFIRMA / AJUSTA / SWITCH)
F4  Abogado del diablo                           (agente rojo ataca la tesis final)
F5  Verificación de pasaportes                   (mecánica: URL responde, cita presente)
F6  Salida con template fijo + guardado + scorecard
```

- **F0 — Invalidadores primero.** Se leen los `invalidadores` estructurados del view vigente
  (§5) y se chequean contra los insumos de HOY, mecánicamente. Si uno disparó → la corrida
  arranca sabiendo que hay switch (o ajuste fuerte) que explicar; no se "re-delibera" si
  mantener: la condición pre-declarada manda. (Disciplina "states and dates" de los desks;
  anti "mover los arcos".)
- **F1 — Cuatro lentes, presupuesto fijo (~10-15 tool calls c/u), salida JSON con pasaporte:**
  1. *Chicago/fondos*: COT (posición managed money + Δ + percentil histórico vía Socrata),
     Crop Progress en temporada, export sales si hay key, etanol; wire de la semana.
  2. *Sudamérica/clima*: Brasil (Canal Rural/Notícias Agrícolas, CONAB propio), clima AR
     (SMN/ORA) y EEUU (CPC/Drought Monitor), bajante del Paraná si aplica.
  3. *Macro AR*: retenciones/política/dólar — Google News + los datos propios de `/dolar`.
  4. *Expectativas*: agenda propia de informes próximos 14 días + qué espera el mercado de
     cada uno (DTN/Pro Farmer pre-report si estamos en semana de informe).
  Cada hallazgo: `{tema, dato, fuente_url, fecha_pub, cita_textual, relevancia_por_grano}`.
  Regla de cada agente: mejor 3 hallazgos con pasaporte firme que 10 flojos; devolver vacío
  es una respuesta válida.
- **F2 — Blind-first.** El orquestador arma el view provisorio por grano (dirección +
  confianza + argumentos) usando el checklist de la mesa de siempre (demanda física →
  oferta → fundamentals → precio → contexto) sobre insumos propios + hallazgos F1
  verificados. **No lee la tesis previa todavía** (mitigación R1, la única con respaldo).

  **Las preguntas de la mesa (ejemplos de Lautaro, 24/07 — cabeza de mercado):** el
  checklist ordena, pero el análisis se hace preguntando como un trader, no llenando un
  formulario. Ejemplos del tipo de pregunta que el view tiene que hacerse:
  - **¿Por qué se está moviendo el precio HOY, de verdad?** El plano local puede reaccionar
    por algo distinto a la tendencia de fondo: maíz local subiendo porque hay barcos
    cargando y la lluvia no deja entrar a cosechar — el view puede ser bajista y el precio
    subir por logística de corto. Separar el driver coyuntural del estructural, y
    preguntarse qué pasa cuando el driver de corto se agota (¿cuando el productor coseche
    arranca la presión de cosecha, o se sostiene?).
  - **¿El nivel de precios tiene sentido con el balance?** Cosecha récord con precios
    firmes es una pregunta, no un dato — ¿quién está pagando y por qué?
  - **¿Quién pone el precio?** ¿El productor reteniendo (farmer selling bajo) o la
    exportación apretando (línea de barcos, gap de cobertura)? **[fix auditoría, CRÍTICO]**
    Esta pregunta la responde un dato propio que hoy NO está en los insumos del view:
    `getSenalCamiones()` (`src/lib/camiones/camiones.ts`) — el diferencial de percentiles
    estacionales barcos-vs-camiones construido en C5 (23/07) exactamente para esto. Falta
    sumarlo al `Promise.all` de `src/app/api/views/insumos/route.ts` (mismo patrón que
    `temperatura`/`empresas`, service key, cero fetch nuevo) y a la tabla de insumos de la
    skill. Sin este fix, F1/F2 saldrían a buscar afuera algo que ya está calculado adentro.
  - **¿Caros o baratos contra Chicago?** Paridad/premios: FAS vs pizarra vs CBOT (todo en
    casa) — si el local está caro contra el mundo, la corrección puede venir por paridad
    aunque el view local sea alcista.
  - **¿En el mundo sobra o falta?** Balance mundial y relaciones stock/consumo (WASDE; la
    lente 1 de F1 lo trae con pasaporte si no está en casa). ¿La demanda está activa o
    comprada?
  - **¿Algún activo muy correlacionado está con problemas?** Los mercados de aceites se
    mueven todos juntos y afectan a la soja (palma/canola/girasol → aceite de soja →
    poroto); energía → etanol → maíz. Un quiebre en el correlacionado es señal aunque el
    propio grano no haya hecho nada todavía. **[fix auditoría, MEDIO]** Aceite y harina de
    soja (el correlacionado más directo) YA están en `chicago`/`getMonitorMercados()`
    (anillo 1, sin fetch nuevo, ya en USD/tn) — mirarlos primero ahí. Palma/canola/girasol
    sí requieren research externo (lente 1 de F1).

  Son **ejemplos, no una lista cerrada** — hay miles. La regla del prompt es explícita:
  **cabeza de mercado y mente abierta** — si el mercado se está moviendo por algo que el
  checklist no lista, eso es justamente lo que hay que detectar y explicar, no ignorar
  porque "no estaba en el formulario". (Esto convive con "ni un número inventado": la
  pregunta puede ser libre, la respuesta cita datos.)
- **F3 — Reconciliación.** Recién ahora entra: view vigente + resultado F0 + scorecard.
  Reglas: si F0 disparó un invalidador → SWITCH/AJUSTE obligatorio explicando el gatillo.
  Si no disparó y el provisorio coincide → CONFIRMA (la evidencia nueva se suma a la tesis:
  la bola de nieve crece). Si no disparó pero el provisorio DIVERGE → el switch requiere
  justificación explícita de por qué la evidencia nueva pesa más que la tesis acumulada
  (y queda marcado). La confianza se mueve de a 1 punto la mayoría de las semanas — "update
  a lot, but not too much" (superforecasters): muchas actualizaciones chicas, pocas grandes.
  **Recorrido de la tesis (aporte de Lautaro, 24/07)**: en cada reconciliación, el view se
  **cuestiona contra el precio** — pregunta obligatoria, NO regla mecánica de cierre:
  ¿cuánto del movimiento esperado ya se materializó desde que la tesis nació (dato propio:
  precio desde la fecha del view inicial) y qué recorrido le queda? La respuesta puede ser
  perfectamente "la línea bajista sigue" — pero tiene que estar **justificada contra el
  precio ya recorrido**, no asumida: un CONFIRMA con el movimiento ya producido debe decir
  de dónde sale el recorrido restante. CUMPLIDA existe como salida posible (la tesis no
  tiene más recorrido → neutral explicándolo), no como default. El anti-patrón que esto
  evita: el informe bajista que sale DESPUÉS de la baja sumado como evidencia bajista
  fresca, sin preguntarse cuánto ya estaba en el precio.
- **F4 — Abogado del diablo.** Un agente con mandato único: atacar la tesis final (buscar el
  dato en contra más fuerte, propio o externo). Sus ataques con sustancia entran a
  `en_contra` o bajan la confianza; no es "una opinión más que se promedia" — es input
  obligatorio de la síntesis. (Estructural, no decorativo: es lo que está medido que reduce
  el groupthink.)
- **F5 — Pasaportes.** Verificación mecánica de cada cita externa que quedó en el view (la
  URL responde, la cita textual aparece). Lo que no verifica, se cae o se degrada a
  "cualitativo sin cita". (Mitigación directa del 11-57% medido.)
- **F6 — Salida.** Template fijo de siempre + campos nuevos (§5). El view guarda su relación
  con el anterior, sus invalidadores estructurados nuevos (pre-mortem: "la tesis ya falló,
  ¿por qué?" → los invalidadores salen de ahí), y la evidencia externa con pasaportes.

**Presupuesto total estimado**: 5-6 agentes (4 lentes + rojo) + orquestador, acotados. Se
mide en la primera corrida real y se anota (R5).

---

## 5. La bola de nieve en datos (migración mínima + scorecard)

### Migración (una sola, aditiva — `views_mercado`)

```sql
alter table views_mercado
  add column relacion_previa text check (relacion_previa in ('inicial','confirma','ajusta','switch','cumplida')),
  add column view_previo_id uuid references views_mercado(id),
  add column invalidadores jsonb default '[]',   -- [{condicion, umbral, dato_ref, disparado_en}]
  add column evidencia_externa jsonb default '[]', -- pasaportes [{dato, url, fecha_pub, cita}]
  add column nota_lautaro smallint check (nota_lautaro between 1 and 5); -- decisión 24/07
```

- `invalidacion` (texto libre) se mantiene como el resumen legible; `invalidadores` es la
  versión estructurada que F0 chequea mecánicamente (`dato_ref` = qué insumo mirar, ej.
  `"chicago.trigo.usd_tn"` o `"temperatura.TRIGO.indice"`).
- **Inmutabilidad**: la skill tiene prohibido editar los `invalidadores` de un view vigente
  en corridas posteriores; solo se escriben al crear una tesis nueva (inicial o switch) o si
  Lautaro los cambia a mano. Un invalidador disparado se marca (`disparado_en`), no se borra.

### Scorecard (lib pura, cero tabla nueva)

`src/lib/views-scorecard.ts`: para cada view histórico con ≥7 días de vida, computa contra
`futuros_cierres` el retorno a 1/2/4 semanas y lo cruza con la dirección → **hit-rate
direccional** por grano y global, y Brier sobre la confianza mapeada a probabilidad.
Computado al vuelo (siempre actualizado, nada que mantener). Se muestra en `/granos/view`
(la UI está ~80% lista: el historial ya se lista; se suma la columna resultado + badge de
switch) y entra como insumo de F3 (la corrida sabe cómo le fue viniendo).

**[fix auditoría, CRÍTICO] Metodología de selección de contrato — fijar en t0, nunca
re-elegir.** "La posición más cercana" cambia con el tiempo: un contrato puede vencer entre
la fecha del view y la medición a 4 semanas, y si el scorecard re-elige "la más cercana" en
cada fecha de medición, el retorno mide en parte el salto de rolleo (contango/backwardation),
no el movimiento que la tesis predijo — contamina el hit-rate/Brier que §11 usa como vara de
éxito. Regla obligatoria: **la posición se fija UNA VEZ, al momento t0 del view** (la más
cercana en esa fecha), y se mide el retorno de ESA MISMA posición en t0+n; si esa posición ya
venció antes de t0+n, el scorecard degrada a `null` para esa ventana (no re-elige otra) — se
documenta como "sin medición, contrato venció" en vez de ensuciar el número.

### UI `/granos/view` (cambios chicos)

- Badge **SWITCH** / **CONFIRMA** en vigentes e historial (computable ya con los datos que
  `getViewsMercado` trae; con la columna nueva queda explícito).
- Fila de scorecard por grano (hit-rate 4 semanas, N de views, racha).
- Los invalidadores vigentes con su estado (🟢 lejos / 🟡 cerca / 🔴 disparado) — así Lautaro
  ve DE UN VISTAZO qué tendría que pasar para que la mesa cambie de opinión.
- **Nota 1-5 junto al feedback de texto** (decisión de Lautaro, 24/07): un selector chico al
  lado del textarea existente, mismo server action → RPC (`admin_feedback_view` extendida con
  el parámetro nuevo). Es la señal estructurada que el loop de §7 usa junto al scorecard.

---

## 6. Qué cambia en cada pieza

### 6.1 `view-mercado` (V1 — la reforma grande)

Todo §4 + §5. Además: el Paso 0 de calibración se mantiene (voz + `aprendizajes.md` + feedback
crudo), pero se mueve DESPUÉS de F2 (blind-first: la calibración de criterio no debe teñir la
lectura de datos; se aplica al redactar, no al leer). La regla de la mesa no cambia: el
mercado manda sobre el view; coherencia con el semáforo MESA o disenso explícito.

### 6.2 Interpretaciones MP4 (V2 — el salto de calidad más concreto)

Respuesta a la pregunta de Lautaro ("¿usar las interpretaciones que ya tenemos o leer todo
de cero?"): **las dos cosas, en capas distintas — nunca resumir el resumen.**

- **Números: SIEMPRE de cero, del dato crudo propio** (`cambios` exactos de
  `construirCambios`, como hoy). Resumir interpretaciones anteriores acumula pérdida
  (teléfono descompuesto) y viola el anillo 1.
- **Criterio: de las interpretaciones PUBLICADAS.** Las que Lautaro aprobó/editó son criterio
  validado — qué le importa, qué descartó, qué tono. Se leen como calibración (igual que
  `aprendizajes.md`), no como fuente de datos.
- **Lo nuevo (research)**: dos capas que hoy no existen —
  1. **Expectativa vs dato**: para informes USDA, el agente busca la tabla de expectativas
     (DTN pre-report, Pro Farmer) y la interpretación pasa de "el USDA recortó X vs el mes
     pasado" a "el mercado esperaba A, salió B → sorpresa alcista/bajista/neutra" — que es
     lo ÚNICO que explica la reacción del precio. Con pasaporte; si no se consigue, la
     interpretación sale como hoy (P7). La estructura suma un paso: **cuánto ya estaba en
     el precio** — qué hizo el precio en los días PREVIOS al informe (dato propio,
     `cbot_cierres`/`futuros_cierres`): si la baja ya se produjo antes de que salga el
     dato, la interpretación lo dice ("el mercado lo venía descontando: Chicago cayó X%
     en la semana previa") en vez de anunciar una baja que ya pasó.
  2. **Reacción del mercado**: qué hizo Chicago ese día (ya está en casa —
     `cbot_cierres`/monitor) citado junto a la sorpresa: "el mercado esperaba A, salió B,
     Chicago reaccionó +C%". Cero fuente nueva.
- GEA/DEA/CONAB no tienen encuestas de expectativas públicas → para esos, la capa 1 degrada
  a "vs el consenso implícito" (la estimación previa del mismo organismo + qué decían los
  otros organismos), que ya está en casa.
- **BCBA-PAS (decisión de Lautaro, 24/07): lo carga él en cada salida** por `/admin/datos`
  → entra a `estimaciones_produccion` como cualquier organismo y la interpretación se
  genera sola **del dato crudo** (anillo 1), no de un resumen. **[fix auditoría, CRÍTICO]**
  El disparo actual (Paso 9 de `informe-diario`) filtra `informesHoy` por
  `fecha_publicacion === hoy` — como Lautaro sube el PAS con la fecha REAL del informe
  (que puede ser de días atrás), ese filtro nunca matchea el día de carga y el disparo
  falla en silencio (nunca hay error, simplemente "no hay nada que hacer"). La tabla YA
  tiene la columna que lo resuelve: `estimaciones_produccion.actualizado_en timestamptz`
  (se setea a `now()` en cada upsert de `admin_upsert_estimaciones`) — pero ni
  `/api/informes/datos` ni `/api/views/insumos` la seleccionan hoy. Fix: sumar
  `actualizado_en` al `select` de ambas rutas y disparar el Paso 9 también cuando
  `actualizado_en::date === hoy` (no solo `fecha_publicacion === hoy`). Si Lautaro además
  comparte su propia lectura del PAS, se trata igual que el "color de la rueda" del
  diario: **citable como lectura de la mesa, nunca fuente de números ni algo que el
  modelo "corrige"** — si su lectura y el dato difieren, se muestran las dos.
- **[fix auditoría, MEDIO] Pasaporte también en `interpretaciones`.** La migración de §5 le
  suma `evidencia_externa jsonb` a `views_mercado`, pero `interpretaciones` (tabla separada,
  `supabase/migrations/20260723170000_mp4_interpretaciones.sql`) no la tiene — el dato
  externo quedaría enterrado en `borrador_md`/`publicado_md` (texto libre), sin campo que
  F5 pueda re-verificar mecánicamente. Fix: sumar la misma columna
  `evidencia_externa jsonb default '[]'` a `interpretaciones` en la migración de V2.
- El gate no cambia: borrador → OK de Lautaro → publicar.

### 6.3 Informe semanal MP2 (V3)

- **Sección nueva "El mundo esta semana"** (media página, presupuesto fijo): posicionamiento
  de fondos (COT: neto + Δ + lectura), condición/avance EEUU en temporada, Brasil en una
  línea, clima si movió precio. Cada dato con su fuente citada en el texto (R7). Si el
  research falla → la sección dice "sin lectura externa esta semana" y el PDF sale igual.
- **Agenda con expectativas**: la sección de agenda pasa de "qué sale la semana que viene" a
  "qué sale Y qué espera el mercado" (si hay pre-report disponible).
- **Integración de la bola de nieve**: si el view v2 hizo SWITCH esta semana, es candidato
  automático a bullet del resumen ejecutivo (regla 3 del criterio del Paso 2 ya lo insinúa —
  ahora hay dato estructurado para dispararlo). El scorecard se menciona 1 vez por mes
  (transparencia estilo "what we got wrong" de los desks serios — construye confianza).
- **Sigue siendo 5 páginas — decidido por Lautaro el 24/07** (P4: la restricción de tamaño es
  la que fuerza el criterio; si algo nuevo entra, algo viejo sale).
- **[fix auditoría, MEDIO] La sección necesita un slot nuevo en la plantilla, no solo en la
  skill.** `src/app/informes/plantilla/semanal/page.tsx` tiene sus 5 páginas fijas y
  completas hoy (tapa/resumen · granos · dólar+Chicago · comercio exterior · view+agenda);
  no hay "relleno" identificable para cortar sin decidirlo a mano. El prompt V3 tiene que
  incluir explícito: editar `page.tsx` para insertar el bloque en la página de dólar/Chicago
  y decidir qué se recorta de esa página para no sumar hoja (y no romper el chequeo
  `/Count 5` que la propia skill exige al final del Paso 5). Como el tamaño está fijado, la
  primera corrida real muestra el recorte propuesto a Lautaro antes de darlo por bueno.

### 6.4 Informe diario MP1 (V4 — mínimo, a propósito)

- **Sin multi-agente** (R4/R5: su valor es salir SIEMPRE, en minutos).
- **Sin bloque propio de COT — decidido por Lautaro el 24/07**: el posicionamiento de fondos
  vive en el semanal y en el view, no en la placa diaria (es un dato que cambia una vez por
  semana; el diario no se abruma).
- Único agregado: si la lente 1 del view del viernes dejó algo vigente (ej. "fondos vendidos
  récord"), el diario PUEDE citarlo como contexto en el comentario — leyendo de
  `evidencia_externa` del view vigente (dato ya verificado, cero fetch nuevo). Es oportunista
  y opcional, no una sección fija.
- Queda explícito: el diario es la pieza que NO se sofistica.

---

## 7. Aprendizaje continuo (el loop formalizado)

Hoy: el loop existe y está vacío (`aprendizajes.md` sin reglas, 0 feedbacks, 0 disparos
reales de Routines). Formalización:

1. **Episodios crudos** (fuente primaria): `feedback_lautaro` por view (ya existe) + **nota
   1-5** (`nota_lautaro`, decidido el 24/07 — hace medible la calibración) + el scorecard
   (señal objetiva de acierto contra precio). Las tres señales son distintas y se leen juntas:
   la nota dice si el view le sirvió, el scorecard si acertó — un view puede acertar y ser
   poco útil, o fallar y estar bien razonado.
2. **Destilación gateada**: una **sesión de mantenimiento mensual** (o cuando se acumulen
   ≥4 feedbacks) lee episodios + scorecard y propone ediciones a `aprendizajes.md`. La
   Routine NUNCA destila (R6). Gate por regla: "¿una corrida futura actúa mejor por esto?";
   promoción solo por repetición (≥2 episodios) o marca explícita de Lautaro ("siempre X").
3. **Cap duro**: `aprendizajes.md` ≤ ~200 líneas. Lleno = para agregar hay que borrar o
   fusionar. Formato por regla: `[fecha] [origen: view/feedback que la generó] regla`.
4. **Lo que entra al prompt semanal**: último view + invalidadores + `aprendizajes.md` capado
   + scorecard resumido. El historial largo vive en la base y se consulta por excepción
   (context rot).

---

## 8. Lo que NO cambia (decisiones de v1 que este plan respeta)

- **Motor = Routines con la suscripción** (API paga sigue descartada; plan B documentado
  intacto en `PLAN_INFORMES.md`).
- **Gates humanos**: interpretaciones borrador→OK; view interno mesa; "su firma nunca sale
  sin su ojo".
- **Regla "ni un número inventado"** — extendida, no relajada: anillo 1 igual que siempre;
  anillo 2 solo con pasaporte verificado.
- **Formatos y entrega**: placa PNG diaria, PDF semanal 5 páginas, mail Resend + `/informes`,
  plantillas y branding actuales (el rebranding ROFO AGRO es A1, otro carril).
- **Voz**: `voz-lautaro` en los registros de siempre.
- **Endpoints**: `/api/views/insumos` y `/api/informes/datos` se extienden aditivamente si
  hace falta; no se reescriben.

---

## 9. Fases de ejecución (cada una = una sesión con su prompt; regla de siempre: rama desde `main`, PR propio)

| Fase | Qué | Depende de |
|---|---|---|
| **V0** | Piso 1: verificar las 3 Routines de punta a punta + primer feedback real | Lautaro (10 min) |
| **V1** | `view-mercado` v2: migración + skill pipeline F0-F6 + scorecard + UI | V0 |
| **V2** | Interpretaciones v2: expectativa vs dato + reacción del mercado | — (paralela a V1) |
| **V3** | Semanal v2: "El mundo esta semana" + agenda con expectativas + switch/scorecard | V1 (usa sus campos) |
| **V4** | Diario: contexto del view vigente + medición de consumo global | V1 |

### PROMPT V0 — verificar el piso antes de construir el piso 2

> Sesión corta de verificación, con Lautaro presente idealmente. (1) Revisar los runs de las
> 3 Routines (diaria 18:30 ART L-V, view viernes 9:00, semanal viernes 19:00): ¿dispararon?
> ¿terminaron? Leer el resultado real de cada una (Supabase: `informes_generados`,
> `views_mercado`; Storage; mails). Arreglar lo que haya fallado (env vars, timeouts, pasos
> de la skill que en la práctica no funcionan). (2) Pedirle a Lautaro que deje su PRIMER
> feedback en `/granos/view` sobre el view vigente — el loop de aprendizaje arranca ahí.
> (3) Recordarle la API key gratuita de USDA FAS (ya decidió registrarla, §10.1 —
> api.fas.usda.gov) y cargarla como env var del entorno de Claude (`USDA_FAS_API_KEY`).
> (4) Anotar en el doc de
> sesión el consumo/duración observado de cada Routine como línea de base. (5) Confirmar si
> una sesión corriendo como Routine puede invocar el tool de subagentes (Agent/Task) — es
> precondición de todo el fan-out de V1; si no puede, avisar antes de diseñar V1 como
> paralelo de verdad. Criterio de cierre: las 3 Routines con ≥1 corrida real verificada de
> punta a punta.

### PROMPT V1 — view-mercado v2 (la bola de nieve)

> Leé `docs/PLAN_INFORMES_V2.md` §§2, 4, 5 y 6.1 (el diseño completo, con la evidencia en
> §1 y los fixes de auditoría marcados **[fix auditoría]** en el texto — son parte del
> alcance, no opcionales) y la skill actual `.claude/skills/view-mercado/`. Construí: (1) la
> migración aditiva de `views_mercado` (§5) — aplicarla por MCP CON OK de Lautaro, como
> siempre; sumá también `getSenalCamiones()` al `Promise.all` de
> `src/app/api/views/insumos/route.ts` y a la tabla de insumos de la skill (dato propio, C5,
> hoy ausente); (2) la skill
> reescrita con el pipeline F0-F6 — respetando: blind-first estricto (la tesis previa no
> entra al contexto hasta F3), las "preguntas de la mesa" de §4 F2 en el prompt de análisis
> (con la regla explícita "cabeza de mercado y mente abierta": los ejemplos orientan, no
> limitan — driver coyuntural vs estructural, quién pone el precio, paridad vs Chicago,
> stock/consumo mundial, correlacionados como el complejo de aceites para la soja),
> invalidadores inmutables chequeados en F0, 4 lentes de
> recolección con presupuesto ~10-15 tool calls y salida JSON con pasaporte (fuentes de §3:
> COT Socrata, Crop Progress ESMIS, DTN vía Google News RSS, SMN/CPC; jerarquía oficial >
> bolsa > medio > agregador; devolver vacío es válido), agente rojo en F4, verificación
> mecánica de pasaportes en F5, template de salida SIN crecer (3-5 argumentos máx.), y el
> chequeo de **recorrido de tesis** en F3 (cuestionar el view contra el precio: cuánto ya
> se movió y qué recorrido queda — la línea puede seguir, pero justificada; CUMPLIDA es
> salida posible, no automática);
> (3) `src/lib/views-scorecard.ts` (hit-rate direccional 1/2/4 semanas + Brier contra
> `futuros_cierres`, lib pura testeada con fixture real — **metodología de contrato fijada
> en t0, nunca re-elegir la posición más cercana en cada medición**: fix de auditoría, es
> lo que hace confiable la vara de éxito de §11); (4) UI `/granos/view`: badges
> CONFIRMA/AJUSTA/SWITCH/CUMPLIDA, fila de scorecard, invalidadores con estado 🟢🟡🔴, y el
> **selector de nota 1-5** junto al textarea de feedback (decisión §10.2 — extender la RPC
> `admin_feedback_view` con el parámetro nuevo, no crear otra) —
> y sumá los 5 campos nuevos al `select` explícito y al tipo `ViewMercado` de
> `src/lib/views-mercado.ts` (hoy es una lista de columnas, no `select("*")` — sin este
> cambio los badges no tienen de dónde leer aunque la migración esté aplicada). Verificación:
> lint/tsc/tests/build + una corrida completa EN SECO (sin guardar) mostrando las 6 fases y
> el consumo total; los números del scorecard cotejados 1:1 por SQL contra `futuros_cierres`
> (incluido un caso con rolleo de contrato en el medio de la ventana, para probar que degrada
> a null en vez de mezclar posiciones). La primera corrida real la dispara la Routine del
> viernes — dejarla apuntando a la skill nueva. Actualizar `aprendizajes.md` con el cap y
> formato de §7 (sin inventar reglas: sigue vacío hasta que haya feedback).

### PROMPT V2 — interpretaciones v2 (expectativa vs dato)

> Leé `docs/PLAN_INFORMES_V2.md` §6.2 y el Paso 9 de `.claude/skills/informe-diario/` (los
> fixes marcados **[fix auditoría]** son parte del alcance). PRIMERO: re-verificar con un
> request real que un artículo pre/post-WASDE COMPLETO de DTN (no solo la portada) muestra
> la tabla de expectativas sin login — si el gate la tapa, usar Pro Farmer como primario y
> anotarlo. Modificá el Paso 9: antes de redactar, para informes USDA, un paso de research
> acotado (≤10 tool calls) busca la tabla de expectativas pre-report y la reacción de
> Chicago del día (dato propio, `chicago` del JSON). El borrador pasa a la estructura: qué
> se esperaba → qué salió → sorpresa → reacción del precio → qué implica → qué mirar. Con
> pasaporte (URL + fecha + cita) para todo dato externo, verificado antes de citar y
> guardado en una columna nueva `evidencia_externa jsonb default '[]'` en `interpretaciones`
> (mismo shape que `views_mercado`, migración en esta fase) — no solo enterrado en el
> markdown; si no se consigue expectativa, la interpretación sale con el formato actual y lo
> dice ("sin encuesta de expectativas a mano"). La estructura incluye SIEMPRE el paso
> "cuánto ya estaba en el precio" (run-up previo al informe, dato propio). Para
> GEA/DEA/CONAB: consenso implícito = estimación previa del organismo + qué decían los
> otros (todo en casa). **BCBA-PAS — fix del disparo (crítico)**: sumar la columna
> `actualizado_en` (ya existe en `estimaciones_produccion`, se setea sola en cada upsert) al
> `select` de `/api/informes/datos` y `/api/views/insumos`, y disparar el Paso 9 también
> cuando `actualizado_en::date === hoy` — el filtro actual solo por `fecha_publicacion`
> nunca matchea el día real en que Lautaro sube el PAS (lo hace con la fecha real del
> informe, que puede ser de días atrás) y el disparo fallaría en silencio. Su lectura
> propia, si la comparte, se trata como el color de la rueda (citable, nunca fuente de
> números). Las interpretaciones PUBLICADAS previas se leen como calibración de criterio
> (qué priorizó/descartó Lautaro), NUNCA como fuente de números. El gate borrador→OK no se
> toca. Verificación: regenerar en seco la interpretación del WASDE #673 (10/07) con el
> formato nuevo y comparar contra la publicada — mostrársela a Lautaro; y probar el fix del
> disparo con un caso sintético de PAS cargado hoy con `fecha_publicacion` de 3 días atrás.

### PROMPT V3 — informe semanal v2 (el mundo esta semana)

> Leé `docs/PLAN_INFORMES_V2.md` §6.3 y la skill `.claude/skills/informe-semanal/`.
> Requiere V1 mergeado. Sumá al Paso 1-3: (a) un paso de research acotado (1-2 agentes,
> presupuesto fijo) que arma "El mundo esta semana" — COT con Δ semanal y percentil
> (Socrata), Crop Progress en temporada, Brasil en una línea (Canal Rural RSS), clima solo
> si movió precio — cada dato con fuente citada EN el texto del PDF; si falla, la sección
> degrada honesta y el PDF sale igual; (b) agenda con expectativas (pre-report si hay);
> (c) reglas nuevas del criterio del Paso 2: SWITCH del view v2 = candidato automático a
> bullet del resumen ejecutivo; scorecard mencionado 1 vez por mes. El PDF sigue en 5
> páginas (**decidido por Lautaro, §10.3 — la 6ª página está descartada**): editá
> `src/app/informes/plantilla/semanal/page.tsx` para insertar el bloque en la página de
> dólar/Chicago (hoy no hay relleno "de sobra" — decidí explícito qué se recorta de esa
> página y mostrale el recorte a Lautaro en la primera corrida antes de darlo por bueno).
> Verificación: PDF en seco de la semana corriente con la sección nueva poblada de datos
> reales verificados + `/Count 5`.

### PROMPT V4 — diario (retoque) + medición

> Leé `docs/PLAN_INFORMES_V2.md` §6.4. Dos cosas chicas: (1) el diario puede citar en el
> comentario un dato de `evidencia_externa` del view vigente si es relevante al día (cero
> fetch nuevo — ya está verificado); la skill lo dice explícito y mantiene la regla de NO
> multi-agente en el diario. (2) Consolidar la medición: con las 4 piezas corriendo, anotar
> en el doc de sesión el consumo y duración reales de cada Routine (línea de base V0 vs
> ahora) y proponerle a Lautaro ajustes si algo se fue de rango. Cierre del plan: actualizar
> el tablero de §9 y el backlog maestro (E7 §4).

---

## 10. Decisiones de Lautaro (respondidas el 24/07, antes de mergear el plan)

1. **API key de USDA FAS**: **la registra él antes de V0** (gratis, api.fas.usda.gov) → se
   carga como env var `USDA_FAS_API_KEY` del entorno de Claude. Habilita export sales
   semanales de EEUU en la lente 1 de F1.
2. **Feedback con nota: SÍ, 1-5** además del texto libre → columna `nota_lautaro` en la
   migración de §5 + selector en `/granos/view` (§5 UI) + insumo del loop (§7).
3. **Semanal: dentro de las 5 páginas.** "El mundo esta semana" entra recortando contenido
   de la página de dólar/Chicago; el PDF NO crece (§6.3).
4. **COT: solo en semanal y view**, no en la placa diaria (§6.4).
5. **Modelo de la Routine del view** (única que queda abierta, no bloquea nada): hoy Opus,
   puesto a mano por Lautaro. Cuando Fable esté disponible para Routines se evalúa subirlo —
   el pipeline de V1 es agnóstico al modelo.

---

## 11. Cómo sabemos que quedó 10/10 (criterios medibles, no vibes)

| Criterio | Medición | Umbral |
|---|---|---|
| El view es falsable y se mide | Scorecard visible en `/granos/view` | Hit-rate computado sobre ≥8 views por grano |
| Cero citas rotas | F5 en cada corrida | 100% de pasaportes verificados o degradados explícitos |
| La bola de nieve es disciplina, no deriva | `relacion_previa` en el historial | Switches raros y SIEMPRE con gatillo citado (invalidador o divergencia justificada) |
| El loop gira | `aprendizajes.md` | ≥1 destilación con ≥1 regla real en el primer mes con feedback |
| No se rompió lo que andaba | Routines | 0 corridas fallidas por causa del research externo (degradación honesta siempre) |
| El costo es conocido | Docs de sesión | Consumo por Routine medido en V0 y re-medido en V4 |

---

## 12. Referencias del research (24/07/2026)

**Sesgos y arquitectura**: anclaje en LLMs y fallo de las mitigaciones por instrucción
([arXiv:2412.06593](https://arxiv.org/abs/2412.06593), [2511.05766](https://arxiv.org/html/2511.05766)) ·
sycophancy ([2310.13548](https://arxiv.org/abs/2310.13548)) · sesgo posicional y swapping
([2411.16594](https://arxiv.org/pdf/2411.16594)) · debate multi-agente y conformismo
([2305.14325](https://arxiv.org/abs/2305.14325), [2509.05396](https://arxiv.org/html/2509.05396)) ·
abogado del diablo estructural ([IUI 2024](https://dl.acm.org/doi/10.1145/3640543.3645199),
[2502.06251](https://arxiv.org/html/2502.06251v1)) · taxonomía de fallas multi-agente MAST
([2503.13657](https://arxiv.org/abs/2503.13657)) · sistema de research de Anthropic (+90% pero
~15x tokens; presupuestos, jerarquía de fuentes, rúbrica)
([post](https://www.anthropic.com/engineering/multi-agent-research-system)) · contexto compartido
y decisión single-thread ([Cognition](https://cognition.com/blog/dont-build-multi-agents)) ·
citas falsas en deep research 11-57% ([2605.06635](https://arxiv.org/html/2605.06635),
[2604.03173](https://arxiv.org/html/2604.03173v1), [DEER 2512.17776](https://arxiv.org/pdf/2512.17776)).

**Disciplina de trader**: superforecasters "update a lot, not too much"
([Good Judgment](https://goodjudgment.com/superforecasters-toolbox-beliefs/)) · kill criteria
"states and dates" (Annie Duke, [Behavioral Scientist](https://behavioralscientist.org/annie-duke-quit-mental-models-to-help-you-cut-your-losses/)) ·
breakpoints y anti goalpost-moving ([Resonanz](https://resonanzcapital.com/insights/position-sizing-sell-discipline-a-modern-allocators-framework)) ·
pre-mortem ([HBR](https://hbr.org/2007/09/performing-a-project-premortem)) · forecasting con
LLM + retrieval medido por Brier ([2402.18563](https://arxiv.org/abs/2402.18563)).

**Memoria**: consolidación automática corrompe ([2605.12978](https://arxiv.org/pdf/2605.12978)) ·
markdown + gate + cap en producción ([Agent Memory Engineering](https://nicolasbustamante.com/blog/agent-memory-engineering)) ·
context rot ([Chroma](https://www.trychroma.com/research/context-rot)).

**Fuentes verificadas y estructura de informes pro**: BCR Informativo Semanal (edición 2253,
24/07) · StoneX (páginas de producto) · DTN post-WASDE julio 2026 (tablas expectativa vs dato,
sin paywall) · CFTC (`f_disagg.txt` y Socrata, 200) · ESMIS/Crop Progress (200) · EIA
`table9.csv` (200) · AMS GTR (200) · SMN (200) · verificaciones negativas: AgWeb 403,
Successful Farming 402, Agrolink 403, CME FTP 403, INMET reset TLS.
