# PLAN DEL BACKLOG — RF AGRO (pendientes sin plan previo)

> ⚠️ **TABLERO ABSORBIDO por el backlog maestro (22/07/2026, auditoría E7).** La priorización y el
> estado de cada ítem viven ahora en **[`auditoria/E7-sintesis.md`](auditoria/E7-sintesis.md) §4**
> (una sola lista canónica, como anticipaban las Notas de este plan). Este archivo sigue vigente
> como **biblioteca de prompts**: los P1–P12 de abajo son los prompts de ejecución que el backlog
> maestro referencia. No mantener acá estado paralelo.

> **Qué es esto.** El tercer plan del 21/07/2026: cierra el círculo sobre TODOS los pendientes del
> proyecto. Los que ya tienen plan propio quedan mapeados (tabla abajo, sin duplicar); los que no,
> reciben acá su **prompt autocontenido** (P1→P12), mismo estándar y reglas que
> [`PLAN_AUDITORIA.md`](PLAN_AUDITORIA.md) y [`PLAN_INFORMES.md`](PLAN_INFORMES.md).
>
> **Decisiones de Lautaro (21/07):** solo los ítems NO cubiertos reciben prompt · los bloqueados por
> insumos suyos reciben prompt igual, con **su insumo como paso 1** · compras netas BCRA arranca
> investigando automatización (scrape/fuentes semi-oficiales) · camiones en puerto arranca con
> research de fuente validado con requests reales antes de construir.

## Tabla de mapeo — TODOS los pendientes y dónde vive su plan

| Pendiente (origen) | Dónde se resuelve |
|---|---|
| Backlog 5 — extender reporte: CBOT/metales/petróleo/SPY | ✅ ya en el monitor (PR #42) y entra a los informes vía MP1/MP2. Remanente (Merval·EWZ·volumen Matba) → **P1** |
| Backlog 6 — puertos/line-up (extras de spec: matriz mes/zonas, "qué cambió" ampliado) | Pendiente menor → se prioriza en el backlog maestro de **E7** (auditoría) |
| Backlog 7/10 — login: encendido + hosting | Encendido = manual de Lautaro (`GUIA_LOGIN_SETUP.md`); revisión del camino + hosting → **E5** (auditoría) |
| Backlog 11 — informe diario/semanal | **MP1 + MP2** ([`PLAN_INFORMES.md`](PLAN_INFORMES.md)) |
| Backlog 12 — acumulado rueda USD + compras netas BCRA | **P3** |
| Backlog 13 — variación semanal USD (gráfico web) | **P2** (el PDF semanal ya lo cubre MP2) |
| Backlog 14 — camiones en puerto | **P4** |
| Backlog 15/17 — comercio exterior / tablas DJVE | ✅ hecho en los PRs de /comercio (fases 0-4); verificación de completitud → **E3/E6** (auditoría) |
| Backlog 16 — revisión integral de crons | **E5** (auditoría) |
| Backlog 18 — vista por grano | **P5** |
| Backlog 19 — mejora front-end · revisión calculadoras · docs al día | **E3 + E4** (auditoría; docs al día además en cada cierre de sesión) |
| Backlog 20 — skill de escritura · skill de informes | `voz-lautaro` ya existe; las skills de informes las crean **MP1-MP4** |
| Backlog 21 — resumen/interpretación de informes | **MP4** ([`PLAN_INFORMES.md`](PLAN_INFORMES.md)) |
| Gráficos v2 (URL modo Período · ratio % · export · media móvil · vol/OI · P12 · P17 · import 18/19 · guard parcial) | **P6** (presets de usuario esperan el login prendido) |
| CONTEXTO 1 — Fase 2 feed A3 (histórico intradiario) | **P8** |
| CONTEXTO 2 / C3 — sintéticos TIR | **P9** (insumo Lautaro paso 1) |
| CONTEXTO 3 — Fase B (resiliencia · tests · mobile) | **E4** (tests/calidad) + **E3** (mobile) + **E5** (resiliencia) — auditoría |
| CONTEXTO 4 / C4 — vista productor · PWA · robots→index · compras BCRA manual | **P7** (compras BCRA → P3; robots→index depende de retirar `sample.ts`, decisión en E3) |
| CONTEXTO 6 — estrategias avanzadas (costos/IVA · primas reales · calendarios · acumulador) | **P10** |
| CONTEXTO 7 — modelo propio de capacidad de pago | **P11** (insumo Lautaro paso 1) |
| CONTEXTO 8 — módulo scoring de clientes (`negocio/03`) | **P12** (insumo Lautaro paso 1; datos personales NUNCA al repo) |
| Cinta con pizarra de ejemplo · `implicitas-panel` con `sample.ts` | **E3** (auditoría, semilla ya cargada) |
| PAS (BCBA) sin validar | **Cerrado por E6 (21/07):** `pas_probe` ya había corrido el 12/07 y confirmó Cloudflare también desde IPs de GitHub Actions (HTTP 403) — descartado automatizar, respaldo por mail |

## Tablero de los prompts de este plan

| P | Tema | Bloqueado por | Modelo sugerido | Estado |
|---|---|---|---|---|
| P1 | Merval + EWZ + volumen Matba en el monitor | — | Sonnet | pendiente |
| P2 | Variación semanal del USD (gráfico en /dolar) | — | Sonnet | pendiente |
| P3 | Compras netas BCRA + acumulado de rueda USD | — | Fable/Opus (la fase research decide fuente y arquitectura) | **HECHO (23/07, C4)** — ingesta automática + panel + backfill 2003→hoy. `sesiones/2026-07-23-c4-compras-bcra.md` |
| P4 | Camiones en puerto (research → ingesta → panel) | build espera OK de Lautaro a [`negocio/08`](negocio/08_fuente_camiones_puerto.md) | Fable/Opus (ídem P3) | **research HECHO (21/07)** — fuente elegida: SAGyP/MAGyP entrada diaria |
| P5 | Vista por grano | — | Sonnet | pendiente |
| P6 | Gráficos v2 (paquete) | — | Sonnet | **HECHO (23/07, C10)** — P12/P17 resueltos con tu respuesta ("pizarra maíz vs soja" = el ratio en %; "son pizarras" = sin serie front-month que construir). `sesiones/2026-07-23-c10-graficos-v2.md` |
| P7 | Vista productor + PWA | robots→index depende de E3 | Sonnet | pendiente |
| P8 | Feed A3 Fase 2 — histórico intradiario | — | Sonnet | pendiente |
| P9 | Sintéticos TIR | tabla IAMC de Lautaro (paso 1) | Fable/Opus (validación de fórmulas financieras) | pendiente |
| P10 | Estrategias avanzadas | primas/decisiones de Lautaro (paso 1) | Fable/Opus (ídem P9) | pendiente |
| P11 | Modelo propio de capacidad de pago | fórmula de Lautaro (paso 1) | Fable/Opus (ídem P9) | pendiente |
| P12 | Scoring de clientes | datos de fijaciones (paso 1) | Fable/Opus (diseño de producto + modelo AHP + privacidad) | pendiente |

> Regla de modelos (igual que en los otros planes): **juicio → Fable mientras dure, después Opus;
> build con patrón claro → Sonnet**. Dentro de la sesión, subagentes de solo lectura para paralelizar
> verificaciones (cotejos contra fuentes, navegación); las decisiones y el código, la sesión principal.

**Orden sugerido** (Lautaro elige libremente; son independientes salvo lo anotado): P1→P2 (chicos,
valor inmediato) → P8 (habilita intradía) → P5 → P3/P4 (research) → P6 → P7 → P9/P10/P11 cuando estén
los insumos → P12 al final (producto nuevo).

## Reglas transversales (cada prompt las asume)

Las mismas de los otros dos planes: rama `claude/backlog-pN-<tema>` desde `main` actualizado · 1 PR
por prompt, base `main`, draft hasta verificado · doc de sesión + «Ahora» de `ESTADO.md` al cerrar ·
`lint`+`tsc`+`build` antes de pushear · **no suponer** (dudas → AskUserQuestion a Lautaro) · fórmulas
las define Lautaro (duda = pregunta con ejemplo numérico) · fuentes nuevas se validan con requests
reales ANTES de construir · Next.js 16 con breaking changes (leer `node_modules/next/dist/docs/`) ·
entorno: `npm install`; `.env.local` con `SUPABASE_URL`/`SUPABASE_ANON_KEY` vía MCP Supabase
(`get_project_url` + `get_publishable_keys`, ref `gbpfgfeksqmzmsxnxiwg`); datos reales con
`NODE_USE_ENV_PROXY=1`; Playwright en `/opt/pw-browsers/chromium` · migraciones en
`supabase/migrations/` aplicadas por MCP con OK de Lautaro.

---

# PROMPT P1 — Merval + EWZ + volumen Matba en el monitor

```text
Ejecutá el pendiente P1 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero: reglas transversales;
+ docs/ESTADO.md y docs/CONTEXTO.md). Rama claude/backlog-p1-monitor desde main.
OBJETIVO: completar el set de referencias del Monitor de mercados de /granos (src/lib/monitor-mercados.ts
+ src/components/monitor-mercados.tsx, PR #42) con lo que falta del ítem 5 del backlog: (a) MERVAL y
(b) EWZ en el bloque macro/referencias — misma fuente Yahoo spark batch que ya usa el monitor (probá
los símbolos con un request real: EWZ directo; Merval probablemente ^MERV; validá que el spark los
devuelva y con qué delay); (c) VOLUMEN de la rueda de Matba/A3 por grano — fuente CEM pública ya
conocida (apicem.matbarofex.com.ar/api/v2/daily-trading-volume; validá el shape con request real),
mostrado donde mejor calce (KPI chico en el monitor o junto a Arbitrajes — proponéselo a Lautaro con
screenshot antes de fijarlo). View-only como todo el monitor: nada se guarda, hereda el ISR de 30s.
Al agregar símbolos: unidades correctas (Merval en puntos, EWZ en USD), tags claros, y el sello de
delay honesto que el monitor ya usa. Los informes MP1/MP2 (si ya existen) los heredan solos vía
getMonitorMercados — verificá que no rompés su JSON.
VERIFICAR: valores 1:1 contra la fuente con la web corriendo local (NODE_USE_ENV_PROXY=1), navegador
claro/oscuro, lint/tsc/build. PR draft base main; doc de sesión + ESTADO (marcar el remanente del
ítem 5 como hecho).
```

---

# PROMPT P2 — Variación semanal del USD (gráfico en /dolar)

```text
Ejecutá el pendiente P2 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero; + docs/ESTADO.md y
docs/CONTEXTO.md). Rama claude/backlog-p2-usd-semanal desde main.
OBJETIVO (ítem 13 del backlog): un gráfico de variación semanal del dólar en /dolar. Datos: el oficial
mayorista MAE es en vivo (market.ts) pero NO se guarda historia propia → primero verificá qué historia
hay disponible: (a) futuros DLR por posición SÍ tienen cierres diarios si se guardan… revisá si
futuros_cierres los incluye (es CEM granos: probablemente NO); (b) el CEM /api/v2/spot-prices publica
dólar (BNA/USD G/BCRA) con historia — validá con request real rango y cadencia; (c) alternativa BCRA
API v4 (mayorista A3500 histórico, ya usada en el repo). Elegí la fuente con datos verificados y
proponésela a Lautaro (AskUserQuestion) ANTES de construir. Si hace falta tabla nueva
(dolar_historico) + cron de ingesta: patrón idéntico a ingest-pizarra (script + workflow + guard anti
falso-verde + healthcheck). Gráfico: SVG server-side como los existentes (o Recharts como /graficos),
con ChartMarca + ChartTabla como TODOS los gráficos de la web (patrón del 20/07), variación semana a
semana y las últimas N semanas; claro/oscuro. El PDF semanal (MP2 de PLAN_INFORMES) reusa esta serie
cuando exista — dejalo anotado en su tablero si MP2 aún no corrió.
VERIFICAR: valores cotejados contra la fuente, navegador claro/oscuro + mobile, lint/tsc/build.
PR draft base main; doc de sesión + ESTADO (ítem 13 hecho).
```

---

# PROMPT P3 — Compras netas BCRA + acumulado de rueda USD

```text
Ejecutá el pendiente P3 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero; + docs/ESTADO.md,
docs/CONTEXTO.md — módulo 7 "Panel cambiario"). Rama claude/backlog-p3-bcra desde main.
OBJETIVO (ítem 12): sumar al panel cambiario (src/components/panel-cambiario.tsx) las compras netas
del BCRA en el MULC y el acumulado (diario/mensual/anual), hoy inexistentes porque no hay API oficial.
DECISIÓN DE LAUTARO YA TOMADA: arrancar por RESEARCH DE AUTOMATIZACIÓN (no por carga manual).
FASE RESEARCH (no construyas nada hasta cerrarla con Lautaro): investigá y probá con requests reales
las fuentes candidatas del dato diario de compras netas: (a) BCRA oficial — la API v4 de monetarias
(ya usada en el repo) y las planillas/series del sitio (¿alguna serie publica el resultado del MULC
con qué rezago?); (b) informes/feeds semi-oficiales que lo publican a diario (analistas en X, informes
de consultoras, Telegram) — evaluá estabilidad y licitud del scrape; (c) el volumen MAE ya mostrado
como proxy. Armá una tabla comparativa (dato exacto vs estimado · rezago · fragilidad) y presentásela
a Lautaro con tu recomendación (AskUserQuestion). Si ninguna fuente automática es digna, el fallback
acordado es carga manual en /admin (patrón "color de la rueda" de MP1) — que él lo decida.
FASE BUILD (tras su OK): tabla bcra_mulc (fecha PK, compras_netas_usd, fuente) + ingesta (patrón
scripts/ingest-*.mjs + workflow + guard + healthcheck) o form admin según lo decidido; panel: dato
del día + acumulados + mini-serie, con sello de fuente honesto (si es estimado/manual, se dice).
VERIFICAR: valores cotejados contra la fuente elegida, claro/oscuro, lint/tsc/build. PR draft base
main; doc de sesión (registrar el research aunque la fuente elegida falle después) + ESTADO.
```

---

# PROMPT P4 — Camiones en puerto (research → ingesta → panel)

```text
Ejecutá el pendiente P4 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero; + docs/ESTADO.md,
docs/CONTEXTO.md y docs/FUENTES.md §logística). Rama claude/backlog-p4-camiones desde main.
OBJETIVO (ítem 14): panel de movimiento de camiones en puerto (arribos diarios por grano/terminal,
señal de presión de oferta física que complementa el line-up de /comercio).
FASE RESEARCH primero (decisión de Lautaro: la fuente NO está definida): investigá y validá con
requests reales las candidatas — BCR (publica arribo de camiones a puertos del Gran Rosario:
localizá el dato exacto, formato, historia disponible, cadencia), dataPORTUARIA, CIARA-CEC, y
cualquier otra de FUENTES.md. Para cada una: endpoint/HTML real probado, historia hacia atrás,
cadencia, fragilidad del parser. Presentale a Lautaro la comparación y tu recomendación
(AskUserQuestion), incluyendo QUÉ panel imaginás (diario + estacionalidad vs 5 campañas, como el
ritmo de /comercio/empresas) — que él apruebe fuente Y alcance antes de construir.
FASE BUILD (tras su OK): tabla camiones (clave fecha+terminal/zona+grano según la fuente) + script
ingesta (patrón ingest-*.mjs, guard anti falso-verde, workflow, healthcheck) + backfill de la
historia que la fuente permita + panel en /comercio (visibilidad: preguntale si es solo mesa como
puertos o público como DJVE) con ChartMarca/ChartTabla.
VERIFICAR: parser contra HTML/CSV real (varios días), valores 1:1 contra la fuente, claro/oscuro,
lint/tsc/build. PR draft base main; doc de sesión + ESTADO (ítem 14).
```

---

# PROMPT P5 — Vista por grano

```text
Ejecutá el pendiente P5 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero; + docs/ESTADO.md y
docs/CONTEXTO.md). Rama claude/backlog-p5-vista-grano desde main.
OBJETIVO (ítem 18): hoy todos los paneles son transversales a los granos; falta la vista de UN grano
(soja | maíz | trigo) que junte todo lo suyo en una página: curva A3 completa + pases + arbitraje vs
pizarra + pizarra histórica + Chicago del grano + spreads clave (percentil vs historia, de
derivadas.ts) + su fila del índice MESA/temperatura + negociado/farmer selling + estimaciones de
producción del grano + noticias filtradas + view de mercado (si MP3 de PLAN_INFORMES ya existe).
DISEÑO primero: proponele a Lautaro (AskUserQuestion) estructura de ruta (/granos/soja o /grano/[slug];
OJO: /granos/view está RESERVADA para el view de mercado del MP3 de PLAN_INFORMES.md — si usás un
segmento dinámico bajo /granos, excluí "view" o preferí rutas estáticas por grano)
y un wireframe de bloques ANTES de codificar — qué va arriba, qué es solo mesa (los bloques de
/comercio son requireAdmin: en la vista por grano deben respetar el MISMO gate, no filtrarse).
REGLA CENTRAL: cero lógica nueva de datos — la página COMPONE lo que las libs ya devuelven
(getArbitrajes, getCurvaGranos, getMonitorMercados, getTemperatura, getNegociado, estimaciones,
noticias) filtrado por grano; si una lib no permite filtrar, extendela con un parámetro, sin duplicar.
ISR coherente con las páginas de origen (30-60s). Nav: entrada desde /granos (tabs o cards por grano).
VERIFICAR: cada número idéntico al panel de origen (cotejo 1:1 en navegador), permisos respetados con
flag on/off, claro/oscuro + mobile, lint/tsc/build. PR draft base main; doc de sesión + ESTADO (ítem 18).
```

---

# PROMPT P6 — Gráficos v2 (paquete)

```text
Ejecutá el pendiente P6 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero; + docs/ESTADO.md,
docs/CONTEXTO.md y docs/PLAN_GRAFICOS_SPREADS.md — el panel /graficos ya está en producción, PR #17).
Rama claude/backlog-p6-graficos-v2 desde main.
PASO 1 — INSUMOS DE LAUTARO (AskUserQuestion, antes de tocar código; "P12" y "P17" acá son los ítems
así numerados en PLAN_GRAFICOS_SPREADS.md, NO los prompts de PLAN_BACKLOG.md): (a) P12 "relaciones %" — pedile
1-2 ejemplos numéricos reales de qué quiere ver ("180% pizarra maíz", "57% soja julio": qué numerador,
qué denominador, qué serie resultante); (b) P17 "serie continua front-month" — pedile un ejemplo de
cómo empalma él las posiciones (¿salto seco al vencer? ¿ajuste por spread?); (c) ¿quiere el import de
campañas 2018/19 del Excel ahora o sigue pospuesto?; (d) prioridad dentro del paquete si no quiere
todo. Si no tiene los ejemplos a mano, P12/P17 se posponen y el resto del paquete avanza igual.
ALCANCE (todo sobre src/app/graficos + src/lib/series.ts/derivadas.ts, sin tocar fórmulas existentes):
1) persistir el estado del modo Período en la URL (el modo Campañas ya lo hace — mismo patrón);
2) métrica nueva ratio/base en % (pizarra/futuro − 1) en ambos modos; 3) export PNG (canvas del chart)
y CSV (las rows ya renderizadas en ChartTabla); 4) media móvil opcional (ventana elegible) como
overlay; 5) subpanel de volumen/OI (futuros_cierres ya trae volume/openInterest — verificá cobertura);
6) guard "parcial" (marcar la última vela si la serie del día está incompleta); 7) P12/P17 si hay
insumos; 8) import 2018/19 si Lautaro lo pide (tabla aparte como dice el backlog). Los presets de
usuario NO van (requieren login prendido — quedan anotados).
VERIFICAR: cada feature contra el Excel/datos reales como se hizo en el PR #17 (valores exactos en el
doc de sesión), links compartibles funcionan, claro/oscuro + mobile, lint/tsc/build. PR draft base
main; doc de sesión + ESTADO (lista v2 actualizada ítem por ítem).
```

---

# PROMPT P7 — Vista productor + PWA

```text
Ejecutá el pendiente P7 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero; + docs/ESTADO.md,
docs/CONTEXTO.md §C4 y docs/PLAN_LOGIN.md — el modelo de secciones por empresa ya existe). Rama
claude/backlog-p7-productor-pwa desde main.
OBJETIVO (C4): (a) VISTA PRODUCTOR — una presentación simplificada para el cliente productor: menos
densidad, los 3-4 números que le importan (pizarra del día, curva corta de su grano, dólar, titulares),
sin jerga de mesa. DISEÑO primero con Lautaro (AskUserQuestion): ¿es un modo de la home ("vista
simple"), una ruta /productor, o el comportamiento por defecto para empresas con pocas secciones?
¿Qué números exactos van? Mostrale wireframe antes de codificar. Reusar componentes existentes
(EstimacionesMini, MercadoHoy, cinta) — cero lógica de datos nueva. (b) PWA — manifest + service
worker mínimo (instalable en el celular del productor, icono de marca, sin caché agresiva de datos:
los precios NUNCA stale silenciosamente — estrategia network-first con fallback honesto "sin
conexión"). En Next 16 verificá el patrón vigente en node_modules/next/dist/docs/ antes de elegir lib
o manifest a mano. (c) robots→index NO va acá: depende de retirar los datos de ejemplo (decisión de
Lautaro en la etapa E3 de la auditoría) — dejalo anotado.
VERIFICAR: la vista productor validada por Lautaro con screenshots (es SU cliente: él decide), PWA
instalable probada con Playwright/Lighthouse local, sin regresión en la home actual, claro/oscuro +
mobile, lint/tsc/build. PR draft base main; doc de sesión + ESTADO.
```

---

# PROMPT P8 — Feed A3 Fase 2: histórico intradiario

```text
Ejecutá el pendiente P8 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero; + docs/ESTADO.md,
docs/CONTEXTO.md §"A3 — verificado OK" y docs/INFRAESTRUCTURA.md). Rama claude/backlog-p8-intradia
desde main.
OBJETIVO (Fase 2 del feed A3, pendiente desde el 09/07): guardar HISTORIA intradiaria de la rueda
(la web en vivo ya está resuelta por WebSocket + ISR — esto es SOLO persistencia para gráficos
intradía futuros). Diseño ya esbozado en INFRAESTRUCTURA.md: script scripts/ingest-rueda.mjs que abre
la MISMA conexión WS de src/lib/a3-live.ts (portá el cliente a .mjs o extraé lo común — ojo con el
espejo lib↔script: dejá UN módulo compartido o un test de paridad, no una tercera copia), toma el
snapshot de todos los instrumentos (granos DDA + dólar DDF: puntas, último, volumen) y upsertea en la
tabla nueva snapshots (symbol, ts, bid, ask, last, volume; PK symbol+ts truncado al intervalo) + una
tabla ingest_log liviana (corrida, filas, ok). Workflow cron */15 13-20 UTC L-V (dentro de la rueda;
confirmá el horario agro 10:30-17 ART con rueda.ts). Secrets: los A3 NO están hoy en GitHub Actions
(solo en Vercel) — el paso de configurarlos es MANUAL de Lautaro: dejáselo documentado con nombres
exactos (A3_API_BASE, A3_USERNAME, A3_PASSWORD). Guard anti falso-verde adaptado: fuera de rueda o
feriado, 0 filas es legítimo (usa ruedaAgroAbierta/habiles.ts — no enrojezcas al pedo); en rueda
abierta, 0 filas = exit 1. Sumar snapshots al healthcheck con umbral acorde (días hábiles). Retención:
preguntale a Lautaro si guarda todo o poda (>1 año) — la tabla crece ~15k filas/día.
VERIFICAR: correr el script a mano en horario de rueda contra la API real (si la sesión cae fuera de
rueda: modo dry documentado + verificación del parser con el snapshot del WS de a3-live), migración
aplicada por MCP con OK, lint/tsc/build. PR draft base main; doc de sesión + ESTADO (Fase 2 hecha;
los gráficos intradía que la consumen quedan como ítem nuevo del backlog).
```

---

# PROMPT P9 — Sintéticos TIR (C3)

```text
Ejecutá el pendiente P9 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero; + docs/ESTADO.md,
docs/CONTEXTO.md — fila 6 "Sintéticos/LECAPs" de la TABLA DE MÓDULOS (ojo: no el punto 6 de la lista
"Pendientes", que es otra cosa) y docs/FORMULAS_EXCEL.md). Rama claude/backlog-p9-sinteticos desde main.
PASO 1 — INSUMO DE LAUTARO (sin esto no se avanza): pedile la tabla de "pago final por letra"
(valor al vencimiento de cada LECAP/letra; fuente que él usa: IAMC iamc.com.ar/informeslecap/ o
Min. Economía) Y la fórmula del sintético COMO ÉL LA CALCULA, con UN ejemplo numérico completo
(letra, precio hoy, pago final, días, TIR esperada, y cómo se combina con el dólar futuro/linked para
el sintético). Las fórmulas las define él: implementá EXACTAMENTE su ejemplo y validá que tu código
lo reproduzca al centavo antes de generalizar.
BUILD: el panel sinteticos-panel.tsx ya muestra precios LECAP reales (data912) con TIR pendiente —
completalo: TIR de cada letra (con el pago final del insumo), sintético dólar (letra + futuro DLR de
market.ts) vs tasa linked directa, y el ranking que Lautaro defina. Si el pago final por letra
requiere actualización periódica: ¿tabla en Supabase con carga admin o parse del PDF del IAMC?
Investigá si el PDF/informe del IAMC es parseable con request real y proponéselo; si es frágil,
carga admin (patrón uploader existente).
VERIFICAR: el ejemplo numérico de Lautaro reproducido exacto (dejalo en el doc de sesión como
fixture), panel en claro/oscuro, degradación sin datos, lint/tsc/build. PR draft base main; doc de
sesión + ESTADO (C3 hecho).
```

---

# PROMPT P10 — Estrategias avanzadas

```text
Ejecutá el pendiente P10 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero; + docs/ESTADO.md,
docs/CONTEXTO.md — punto 6 "Estrategias" de la lista "Pendientes" (ojo: no la fila 6 de la tabla de
módulos, que es Sintéticos), docs/ESTRATEGIAS_CATALOGO.md y docs/ESTRATEGIAS_COMBINADAS.md; código:
src/lib/estrategias.ts + calc-estrategias.tsx + costos.ts). Rama claude/backlog-p10-estrategias
desde main.
PASO 1 — DECISIONES DE LAUTARO (AskUserQuestion, con ejemplos concretos por cada una): (a) costos/IVA
por pata: ¿el tarifario de costos.ts aplica por pata y cómo trata el IVA — con un ejemplo numérico
suyo de una estrategia de 2 patas con costos incluidos?; (b) primas/strikes REALES: ¿de dónde —
cadena de opciones de A3 (el REST bySegment ya trae opciones con strike+C/P que hoy se excluyen) o
CBOT? ¿en vivo o cierre?; (c) ¿cuáles de las avanzadas quiere ya: calendarios de dos vencimientos,
acumulador (path-dependent: definir con él la regla exacta de acumulación con ejemplo), otras del
catálogo?; (d) prioridad. NO implementes nada de fórmulas sin su ejemplo validado.
BUILD (según sus respuestas): traer la cadena real de opciones (nueva lib, validada con requests
reales contra A3), autocompletar primas/strikes en las patas (hoy las primas por defecto son
sintéticas con pr()), sumar costos por pata al resumen (reusar costos.ts, sin duplicar el tarifario),
y las estrategias nuevas como presets con su payoff (calendarios necesitan 2 vtos → extender el motor
de patas con cuidado: hoy asume un solo vencimiento; el acumulador puede necesitar simulación por
escenarios en vez de payoff cerrado — proponele el enfoque antes).
VERIFICAR: cada fórmula nueva contra el ejemplo numérico de Lautaro (fixtures en el doc de sesión),
payoffs de presets existentes SIN cambios (regresión visual/numérica), claro/oscuro, lint/tsc/build.
PR draft base main; doc de sesión + ESTADO.
```

---

# PROMPT P11 — Modelo propio de capacidad de pago

```text
Ejecutá el pendiente P11 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero; + docs/ESTADO.md,
docs/CONTEXTO.md — punto 7 "Modelo propio de Lautaro" de la lista "Pendientes" (ojo: no la fila 7 de
la tabla de módulos, que es el panel cambiario) y src/lib/capacidad.ts — hoy: FAS teórico BCR
scrapeado + override por env
CAPACIDAD_OVERRIDE). Rama claude/backlog-p11-capacidad desde main.
PASO 1 — INSUMO DE LAUTARO (sin esto no se avanza): su MODELO propio de capacidad de pago: la fórmula
completa (FOB, retenciones, gastos fobbing, embolsado/comercialización, margen industria si aplica —
lo que él use), CON un ejemplo numérico por grano resuelto a mano por él. Preguntale también qué
inputs quiere editables en la web y si el FAS de BCR queda al lado como referencia comparativa.
BUILD: lib capacidad-modelo.ts pura (testeable) que implementa SU fórmula exacta; el panel de
capacidad muestra las dos columnas (modelo RF AGRO vs FAS teórico BCR) con los inputs editables que
él pidió (patrón client de arbitrajes-editable) y sello honesto de qué es cada una; el override por
env queda como tercer nivel (emergencia). Inputs de mercado (FOB oficial, retenciones vigentes):
identificá la fuente con request real y preguntale si la automatizás o la carga él.
VERIFICAR: el ejemplo numérico de cada grano reproducido exacto (fixtures en el doc de sesión),
claro/oscuro, degradación, lint/tsc/build. PR draft base main; doc de sesión + ESTADO (pendiente 7
de CONTEXTO hecho).
```

---

# PROMPT P12 — Módulo scoring de clientes

```text
Ejecutá el pendiente P12 de docs/PLAN_BACKLOG.md de RF AGRO (leé ese doc primero; + docs/ESTADO.md y
SOBRE TODO docs/negocio/03_modulo_comportamiento_cliente_vendedor.md — la especificación completa del
producto: scoring AHP + P&L del cliente vendedor — y docs/negocio/04 §exports). Rama
claude/backlog-p12-scoring desde main. Es un PRODUCTO NUEVO de la consultora, no un panel más: andá
por fases y validá cada una con Lautaro.
REGLA INNEGOCIABLE: los datos de clientes (nombres, fijaciones, posiciones) son datos personales —
NUNCA al repo, NUNCA en tablas legibles por anon; solo en Supabase con RLS admin-only, y la página
correspondiente con requireAdmin (que protege SIEMPRE, aun con el flag apagado).
PASO 1 — INSUMO DE LAUTARO: los datos de fijaciones/posiciones de clientes en el formato que él pueda
exportar (docs/negocio/04 describe los exports de intranets de acopios que maneja). Pedile UNA muestra
anonimizada + el diccionario de campos, y con docs/negocio/03 a la vista confirmá con él: el modelo de
scoring exacto (criterios AHP y pesos — ¿los del doc siguen vigentes?), qué muestra el panel, y quién
lo ve (¿solo él?).
FASES sugeridas (cada una con su OK): (1) modelo de datos + uploader admin de los exports (patrón del
uploader de compras: previsualizar → confirmar, parser CSV/xlsx reusando parse-agrochat como base);
(2) motor de scoring puro y testeable implementando docs/negocio/03 con los pesos confirmados +
fixtures del ejemplo de Lautaro; (3) panel admin (ranking, ficha por cliente, P&L de fijaciones vs
mercado usando las curvas/pizarra que la web ya tiene). Alcance de la v1: lo que Lautaro marque —
mejor una fase sólida que tres a medias.
VERIFICAR: scoring contra el ejemplo a mano de Lautaro (fixture), RLS verificada con la anon key
(0 filas visibles), uploader end-to-end con la muestra, claro/oscuro, lint/tsc/build. PR draft base
main; doc de sesión + ESTADO (pendiente 8 de CONTEXTO en curso/hecho según fase).
```

---

## Notas

- Cada P, al cerrar, actualiza su fila del tablero. Cuando la auditoría llegue a **E7**, su backlog
  maestro absorbe este tablero (una sola lista canónica desde entonces — decisión ya tomada en E6/E7).
- P9, P10, P11 y P12 arrancan pidiendo el insumo de Lautaro: se pueden pegar igual hoy — el prompt
  guía qué pedir y en qué formato, y no avanza sin eso.
- Ningún prompt de este plan toca fórmulas existentes sin ejemplo numérico validado por Lautaro
  (regla de los tres planes).
