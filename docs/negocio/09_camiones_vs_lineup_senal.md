# Research — Camiones en puerto vs line-up de barcos (señal de cuello de botella físico)

> **Extensión del research P4** ([`08_fuente_camiones_puerto.md`](08_fuente_camiones_puerto.md)) a
> pedido de Lautaro (23/07/2026): en vez de un panel aislado de camiones, **cruzar el ingreso de
> camiones a puerto contra el line-up de barcos** que ya vive en la tabla `lineup` (~511k filas,
> scraper vivo). Hipótesis: barcos esperando + camiones que no llegan = cuello de botella físico =
> **ALCISTA** (el exportador paga más para atraer mercadería); camiones fuertes sin barcos =
> sobreoferta en el margen = **BAJISTA**. Misma lógica ya validada en producción con
> `cobertura.ts` (declarado DJVE vs originado line-up) y `mesa_calor.ts` (percentil estacional).
> Ejecutado el **23/07/2026** con requests reales a SAGyP/MAGyP + SQL real contra Supabase.
> **NO se construyó nada** — este doc es el insumo para que Lautaro decida alcance.

## TL;DR

**Sí se puede, y los datos reales lo sostienen — con una condición de diseño y dos limitaciones
honestas.** La condición: la señal debe ser un **diferencial de percentiles estacionales**
(pctl line-up − pctl camiones), NUNCA un ratio con umbral fijo — la auditoría del 23/07 verificó
con SQL que los umbrales fijos heredados (0,7/1,3 de `cobertura.ts`) disparan señal el 74–95 %
de los días históricos porque nunca se calibraron contra la distribución argentina. Las
limitaciones: (1) el reporte de camiones **no tiene matriz zona×producto** (son dos aperturas del
mismo total) → la señal por producto es nacional y la señal por zona es todos-los-productos;
(2) los camiones entran a "puertos, **fábricas y molinos**" → incluyen consumo interno (molinería
de trigo, malterías) que el line-up no ve — para soja se resuelve comparando contra el complejo en
equivalente poroto (patrón ya existente), para trigo queda como ruido conocido. El ejemplo real del
22/07/2026 da una lectura coherente: **trigo con la mayor tensión** (line-up pctl 97 vs camiones
78 → diferencial +19), maíz y soja balanceados. **Recomendación de alcance: fases** — primero el
build P4 ya aprobado (tabla + backfill 2020→ + panel público) **con el bloque comparativo
barcos-vs-camiones adentro**, y recién después de la calibración L4 evaluar sumarla como 4ª pata
del índice MESA (como **percentil de camiones invertido**, no como diferencial, para no contar dos
veces la densidad que ya es la pata C2).

## FASE 1 — Verificación de la fuente con requests reales (23/07/2026)

### (a) La página diaria y el rezago

- Índice de logística: `https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/logistica/`
  → HTTP 200, 335 KB. El archivo "Entrada diaria de camiones y vagones a puertos, fábricas y
  molinos (por zona portuaria y por producto)" figura con **publicación 22-07-26**.
- La tabla diaria (`.php`, 70 KB, HTTP 200): mes de **julio 2026 completo hasta el 22-jul**.
  Consultada el **23/07** → **rezago 1 día hábil, re-confirmado** (igual que el research del 21/07).
- Muestra real del 22-jul-2026: Rosario y aledaños 3.854 · Dársena 111 · Necochea 425 ·
  B. Blanca 679 · **total 5.069** · trigo 600 · maíz 2.730 · sorgo 93 · cebada 104 · soja 1.383 ·
  girasol 159 (identidad zonas = productos = total ✓).

### (b) Los PDFs mensuales y el formato histórico

Se descargaron y parsearon **6 PDFs reales** (extractor sin dependencias, streams FlateDecode —
el mismo espíritu del research del 21/07, ahora probado sobre 6 archivos):

| Archivo | HTTP | Días parseados |
|---|---|---|
| `2026/total_mensual_may_2026.pdf` | 200 · 135 KB | 31 |
| `2025/total_mensual_jul_2025.pdf` | 200 · 135 KB | 31 |
| `2024/total_mensual_julio_2024.pdf` | 200 · 457 KB | 31 |
| `2023/total_mensual_julio_2023.pdf` | 200 · 87 KB | 31 |
| `2022/total_mensual_julio_2022.pdf` | 200 · 245 KB | 31 |
| `2021/total_mensual_julio_2021.pdf` | 200 · 242 KB | 31 |

**177 filas diarias parseadas, 0 identidades rotas** (zonas = productos = total en todas).
Formato idéntico al HTML del mes en curso: fecha + 13 columnas. Ojo naming: 2019–2024 usan el mes
completo (`total_mensual_julio_2024.pdf`), 2025–2026 abreviado (`total_mensual_jul_2025.pdf`),
2018 otro formato (`Total%20Mensual%20Julio%202018.pdf`) — el backfill 2020→ toca las dos primeras
variantes; conviene levantar las URLs del propio HTML (las lista todas) y no hardcodear el patrón.

**Corrección a `negocio/08`**: la tabla trae **UNA sola columna extra** al final —
"**vagones en playa**" — no dos ("vagones" + "camiones en playa" como decía el doc anterior). El
esquema de la tabla `camiones` propuesto allá se simplifica en una columna.

**⚠️ Agujero de junio 2026**: al 23/07 el PDF `total_mensual_jun_2026.pdf` **no existe (HTTP
404)** y el HTML solo muestra el mes en curso (julio). El PDF mensual se publica con semanas de
rezago (mayo 2026 es el último). Consecuencia para el build: **la ingesta diaria del HTML es
obligatoria desde el día 1** (si no se captura el mes en curso, ese mes queda en un limbo hasta
que salga su PDF); junio 2026 quedará como agujero transitorio del backfill hasta que aparezca.

### (c) Zonas: camiones vs `zonas.ts` — alinean PARCIALMENTE

Nombres EXACTOS del reporte (verificados en HTML y PDFs, estables 2021→2026):
`ROSARIO Y ALEDAÑOS` · `DARSENA BS AS-E. RIOS` · `PUERTO NECOCHEA` · `PUERTO B.BLANCA`.

| Zona camiones (SAGyP) | Line-up (`zonas.ts` / tabla `lineup`) | Alineación |
|---|---|---|
| ROSARIO Y ALEDAÑOS | Up River Norte + Up River Sur **sumadas** (ports `SAN LORENZO` + `ROSARIO`) | ✅ buena, pero **solo agregada** — camiones no distingue Norte/Sur |
| PUERTO B.BLANCA | Bahía Blanca | ✅ directa |
| PUERTO NECOCHEA | El port `NECOCHEA` **existe en la tabla** (13 buques / 293 kt en la última rueda) pero `zonas.ts` lo manda a `"Otros"` y queda fuera de los paneles | ⚠️ posible, requiere extender `zonas.ts` |
| DARSENA BS AS-E. RIOS | Disperso en ports chicos (`CAMPANA`, `ZARATE`, `SAN PEDRO`, `SAN NICOLAS`, `LIMA`, `DEL GUAZU`…) hoy en `"Otros"`; **frontera ambigua**: `RAMALLO` está mapeado a Up River Sur en `zonas.ts` y no se pudo verificar en qué zona lo cuenta SAGyP | ❌ floja — no recomendada para v1 |
| — | `NUEVA PALMIRA` / `MONTEVIDEO` (transbordo PY/UY, 286+135 kt esa rueda) | Sin contraparte de camiones (correcto: no son puertos argentinos) — **excluir del lado line-up** |

**Nota técnica que sale de acá**: la matview `lineup_densidad_hist` (la pata C2 del índice MESA)
**no filtra puerto** — incluye Nueva Palmira y Montevideo (~6 % del tonelaje de la última rueda).
Para la señal vs camiones hay que usar una densidad **solo puertos argentinos** (y por zona si se
quiere la vista zonal). Es la misma decisión que ya se tomó en Fase 2 de puertos ("transbordo
PY/UY fuera del ratio") pero que la matview de densidad no aplica.

### (d) Productos: mapeo directo con una trampa semántica

| Producto camiones | Código line-up (`config.ts`) | Nota |
|---|---|---|
| TRIGO | WHEAT | ⚠️ camiones incluye **molinos** (harina, consumo interno) que el line-up no ve |
| MAIZ | MAIZE | ✅ (algo de consumo interno: feedlots no, es entrada a puerto/fábrica) |
| SORGO | SORGHUM | ✅ |
| CEBADA | BARLEY | ⚠️ camiones incluye **malterías** (cervecera); el line-up excluye malta por decisión 8 |
| SOJA | **SBS + crush en equivalente poroto** (SBM/0,745 + SBO/0,19) | ✅ camiones alimenta fábricas → comparar contra el complejo entero, patrón `equivalentePoroto` ya existente |
| GIRASOL | SFSEED + SFMP/SFO (complejo) | mismo criterio que soja |

La nomenclatura no coincide letra a letra pero el mapeo es **1:1 sin ambigüedad** — es una tabla
de 6 entradas en el código, no un problema.

**No hay matriz zona×producto**: el reporte da el total del día abierto por zona Y abierto por
producto (dos marginales del mismo total, verificado por identidades). Por lo tanto: señal **por
producto = nacional** · señal **por zona = todos los granos juntos**. No existe "camiones de maíz
en Bahía".

## FASE 2 — Diseño de la señal

### La forma: diferencial de percentiles estacionales, no ratio con umbral

Las dos series miden cosas de naturaleza distinta (stock de bodega esperando en tn vs flujo de
descarga en camiones/día), así que un ratio crudo no tiene unidad interpretable ni distribución
estable. La forma que sí funciona — y que reusa TODO lo que ya está construido y auditado
(`estacional.ts`, ventana ±15 días × 5 campañas, `MIN_CAMPANAS=2`):

```
pctlLineup   = percentil estacional de la densidad de line-up (ETB ≤ 30 días,
               SOLO puertos argentinos), por producto o por zona
pctlCamiones = percentil estacional de la media móvil 7 días hábiles de camiones
               descargados, por producto o por zona
SEÑAL        = pctlLineup − pctlCamiones     ∈ [−100, +100]
```

- **Señal ≫ 0** → la bodega espera mucho más de lo normal pero la mercadería llega a ritmo normal
  o bajo → **cuello de botella físico → ALCISTA FAS** (la hipótesis de Lautaro).
- **Señal ≪ 0** → los camiones entran más fuerte de lo normal sin bodega esperando → sobreoferta
  en el margen → **BAJISTA**.
- **Señal ≈ 0** → flujo balanceado (puede ser "todo alto" — cosecha récord fluyendo — o "todo
  bajo"; el diferencial lo distingue de mostrar los dos percentiles por separado, que el panel
  debe hacer).

Ventajas concretas de esta forma:
1. **Sin conversión camiones→toneladas**: el percentil es adimensional. (Si se quiere mostrar la
   equivalencia en el panel: ~28–30 tn/camión, definir con Lautaro — es solo display.)
2. **Sin umbrales fijos que calibrar a ciegas**: los cortes para "tensión alta" se leen de la
   distribución del propio diferencial (el histograma histórico se puede computar en el build y
   mostrar dónde cae hoy) — la lección de la auditoría del 23/07 sobre 0,7/1,3.
3. **MA7 en la pata camiones**: el dato diario es ruidoso (domingos = 0, feriados, paros); la
   media móvil de días hábiles es lo que estabiliza sin perder la señal (mismo espíritu que la
   ventana de 30 días de `cobertura.ts`).
4. **Rezago compatible**: camiones T−1 hábil, line-up del mismo día → la señal se computa
   completa a T−1, más fresca que la DJVE (que el granel declara por ventana mensual).

Matiz honesto: los camiones descargan **a silo de terminal**, no al buque — un día flojo de
camiones no frena un embarque (la terminal tiene stock). La señal no es "el barco se queda sin
carga mañana" sino "la reposición viene persistentemente por debajo de lo que la bodega pide vs
lo normal de la época" — por eso MA7 y percentil, no valores diarios crudos.

### Ejemplo numérico REAL — 22/07/2026 (line-up por SQL vía MCP · camiones de los PDFs/HTML parseados)

**Por producto (nacional).** Historia camiones = julios 2021–2025 días 7–31 hábiles (n=120,
ventana asimétrica del ejemplo — el build usa ±15d completos); historia line-up = ±15 días
calendario, años 2021–2025 (n=66 y 57):

| Producto | Densidad line-up hoy | pctl line-up | Camiones MA7 hoy | pctl camiones | **Señal** | Lectura |
|---|---|---|---|---|---|---|
| Trigo | 453.350 tn | **97** | 552/día (media hist. 372) | 78 | **+19** | La bodega de trigo espera en máximos de la época y los camiones no acompañan a ese percentil → **tensión alcista leve** — consistente con el view MP3 del 21/07 ("line-up pctl 93 firme") |
| Maíz | 2.322.833 tn | 82 | 3.258/día (media hist. 2.284) | 78 | **+4** | Todo alto y balanceado: cosecha récord fluyendo — sin cuello |
| Soja (complejo, poroto eq) | 4.797.957 tn eq | 59 | 1.271/día (media hist. 1.194) | 51 | **+8** | Balanceado en niveles medios |

**Por zona (todos los granos, densidad line-up SOLO del port correspondiente):**

| Zona | Densidad line-up hoy | pctl | Camiones MA7 | pctl | **Señal** | Lectura |
|---|---|---|---|---|---|---|
| Gran Rosario (SAN LORENZO+ROSARIO ↔ "Rosario y aledaños") | 4.229.256 tn | 80 | 4.212/día (media hist. 2.700) | **92** | **−12** | Los camiones entran EN MÁXIMOS, por encima incluso del line-up alto → flujo bien abastecido, sin cuello (levemente bajista en el margen) |
| Bahía Blanca | 776.634 tn | 42 | 751/día (media hist. 878) | 36 | **+6** | Todo flojo y balanceado |

Las dos vistas se complementan y no se contradicen: la tensión de trigo es nacional (mucho trigo
sale por Bahía y Quequén además de Rosario), mientras que el agregado de Gran Rosario está
dominado por el maíz récord que fluye sin fricción. **La señal produce lecturas diferenciadas y
económicamente interpretables con datos reales — el cruce es viable.**

### Limitaciones que el build debe dejar a la vista

1. **Sin zona×producto** — no forzar esa vista, no existe en la fuente.
2. **Consumo interno adentro** (molinos de trigo, malterías de cebada): infla la pata camiones de
   esos granos con flujo que nunca verá un barco. Es un sesgo *estable* (la molinería es pareja en
   el año), así que el percentil estacional lo absorbe en gran parte — pero un boom/caída de
   consumo interno movería la señal sin mover la exportación. Nota al pie del panel.
3. **Ferrocarril y barcazas no están** en la pata camiones (los vagones vienen aparte y "en
   playa", no descargados/día en el mismo cuadro; la hidrovía trae soja paraguaya que sí carga en
   barcos). Otro sesgo estable, misma mitigación.
4. **Junio 2026 en agujero** hasta que salga su PDF.
5. Para v1 zonal: **solo Gran Rosario y Bahía Blanca** (Quequén posible extendiendo `zonas.ts`;
   Dársena no — frontera ambigua con Up River Sur por Ramallo/San Nicolás).

## FASE 3 — Alcance del build: recomendación

**Opción (c) — en fases, y la fase 1 va DENTRO del build P4 ya aprobado:**

- **Fase 1 (con el build P4, C5 del backlog maestro)**: tabla `camiones` + ingesta diaria del
  HTML + backfill PDFs 2020→ (todo ya decidido el 22/07) **+ el bloque "Barcos vs camiones"** en
  el panel: los dos percentiles lado a lado + el diferencial, por producto (nacional) y por zona
  (GR + BB), con su historia graficada. Costo marginal chico: la pata line-up es una variante con
  filtro de puerto de la densidad que ya existe; la pata camiones sale de la tabla nueva; el motor
  de percentiles (`estacional.ts`) se reusa tal cual.
- **Fase 2 (después de L4 — calibración de parámetros de mesa)**: evaluar sumar la 4ª pata al
  índice MESA en `temperatura.ts`/`mesa_calor.ts`.

**Por qué no meterla al índice MESA ya:**
1. Los pesos actuales (0,35/0,30/0,35) están marcados **PROVISORIOS** esperando L4 — sumar una
   pata nueva sin calibrar a un índice sin calibrar duplica la deuda en el peor momento (L4 está
   agendada "pronto", Lautaro se sienta con los números).
2. **Doble conteo**: el diferencial contiene `pctlLineup`, que YA es la pata C2 (densidad) del
   índice. Si algún día entra al índice, la forma correcta es la **pata camiones sola e
   invertida** — `100 − pctlCamiones` = "flujo físico retenido" — como componente de OFERTA junto
   al farmer selling C3 (C3 mide lo *vendido* en papeles; camiones mide lo *entregado* físico —
   son cosas distintas y complementarias). El diferencial queda como señal standalone del panel.
3. Unas semanas de serie viva al lado del índice permiten validar contra ruedas reales antes de
   dejar que mueva la acción sugerida (DIFERIR/VENDER YA) que la mesa ya usa.

## Preguntas abiertas para Lautaro (decidir antes del build)

1. **¿El bloque "Barcos vs camiones" puede ser público?** El panel de camiones ya lo decidiste
   público (22/07, como la DJVE) — pero esta señal es research de mesa con lectura direccional,
   más parecida a `/comercio/temperatura` (solo mesa). Opciones: (a) los datos crudos públicos y
   la señal solo mesa; (b) todo público; (c) todo el bloque solo mesa.
2. **¿Alcanza la vista por producto (nacional) + zonal GR/BB para v1?** ¿O querés que extendamos
   `zonas.ts` para sumar Quequén (line-up ya tiene el port NECOCHEA con datos)? Dársena la
   desaconsejo por la frontera ambigua.
3. **¿Confirmás fases (señal en el panel ahora, 4ª pata del índice MESA recién después de L4)?**
   Si preferís la pata ya, va como `100 − pctlCamiones` (flujo físico) con peso a definir en la
   misma L4.
4. Menor, para display: ¿28 o 30 tn/camión como equivalencia de referencia?

---

*Requests reales del 23/07/2026: índice logística MAGyP HTTP 200 · tabla diaria HTTP 200 (datos
al 22/07, consultada el 23/07) · 6 PDFs mensuales HTTP 200 (177 días parseados, 0 identidades
rotas) · `jun_2026.pdf` HTTP 404 · SQL contra Supabase `gbpfgfeksqmzmsxnxiwg` (densidad por
producto/zona + percentiles calendario ±15d 2021–2025). Fuente primaria del dato: WILLIAMS
ENTREGAS; sello en la web: SAGyP (regla "institución sí, puente no").*
