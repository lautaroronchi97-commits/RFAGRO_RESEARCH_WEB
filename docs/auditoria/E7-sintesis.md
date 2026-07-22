# Auditoría E7 — Síntesis y backlog maestro (2026-07-22)

- **Rama:** `claude/auditoria-e7-sintesis-a919cq` · **PR:** #_ (base `main`, draft hasta el OK)
- **Alcance:** etapa final de la auditoría integral ([`PLAN_AUDITORIA.md`](../PLAN_AUDITORIA.md)):
  fusionar los 6 informes E1–E6, deduplicar los hallazgos que aparecieron en más de una etapa
  arrastrando la decisión de Lautaro de cada uno, armar la matriz impacto × esfuerzo de lo
  aprobado-y-pendiente, y dejar el **backlog maestro único** (reemplaza las 3 listas paralelas,
  como propuso E6) + un prompt autocontenido por cada lote grande. **Esta etapa NO descubre
  hallazgos nuevos** — consolida.
- **Cómo se verificó:** lectura completa de los 6 informes (`E1-datos` · `E2-formulas` [+ fichas] ·
  `E3-ux` · `E4-codigo` · `E5-infra` · `E6-historia`), `PLAN_AUDITORIA.md`, `PLAN_BACKLOG.md`,
  `PLAN_INFORMES.md` (tablero), `GUIA_LOGIN_SETUP.md` (guía definitiva 22/07), `ESTADO.md` y
  `CONTEXTO.md`, cruzando cada «diferido a E7» / «Para E7» / decisión de Lautaro contra el estado
  real al 22/07/2026 (post PR #58/#59/#60). Cero código tocado: solo consolidación y documentación.

---

## Resumen ejecutivo de TODA la auditoría (léase de una sentada)

**Qué se hizo.** Entre el 21 y el 22/07/2026 se auditó el proyecto completo en 6 etapas, cada una
con su informe, tu decisión hallazgo por hallazgo, y su fase de corrección mergeada a `main`:
**E1 datos** (PR #50) · **E2 fórmulas** (PR #51) · **E3 UX** (PR #57) · **E4 código** (PR #55) ·
**E5 infraestructura** (PRs #58 + #59) · **E6 historia** (PR #56). En total: **~71 hallazgos con
evidencia verificable** (archivo:línea, SQL corrido, requests reales, screenshots, logs de Actions)
y **~30 preguntas de criterio** — todas con decisión tuya registrada. Cero hallazgos especulativos.

**La foto grande: el proyecto está sano donde más importa.**
- **Los datos guardados son correctos y fieles a la fuente** (E1): cotejo 1:1 exacto contra CEM,
  CAC, Barchart y MAGyP; matviews frescas; sin outliers vigentes.
- **Cero bugs de fórmula en 45 fichas** (E2): la metodología INTRATE act/365 del Excel está 1:1 en
  todas las libs, guards completos, controles históricos reproducidos exactos.
- **El sitio está muy bien en lo grueso** (E3): navegación coherente, temas parejos, degradaciones
  prolijas, el flujo de decisión de mesa se lee de un vistazo.
- **El código está en buen estado general** (E4): cero deps sin uso, degradación uniforme, cero N+1,
  `server-only` bien aplicado.
- **Cero secretos en 139 commits** (E5) y **53/54 PRs mergeados limpios con protocolo disciplinado** (E6).

**Lo que estaba mal y ya se corrigió** (todo mergeado, verificado en cada fase 2):
1. **Dos páginas de mesa caídas** por vistas sin materializar que tiraban timeout/500 bajo
   concurrencia (`djve_cobertura`, `djve_embarques_mes`, `lineup_estacional`) → las 3 materializadas.
2. **El refresh de matviews moría en silencio** (`statement_timeout=8s` de PostgREST vs una RPC que
   creció a 6 matviews; `ingest-lineup` rojo 6/6) → timeout por-función a 300s, cron verde.
3. **Falso-verde sistémico**: 22 caminos mapeados donde una ingesta parcialmente rota quedaba verde
   → guards por componente en GEA/pizarra/CBOT/cierres/noticias/USDA + alertas Resend en 6 workflows
   críticos + healthcheck ampliado a 17 checks (incl. matviews, vencimientos, seeds con vencimiento).
4. **La limpieza de E1 borró sin saberlo la semana real del 15/07 de `compras`** (`DELETE` por
   etiqueta sin filtro de fecha) → se auto-reparó con el cron del 23/07; el parser ahora descarta el
   grupo de paneles viejo de MAGyP y el upsert es `ignore-duplicates` (Agrochat manda). Lección de
   protocolo: DELETE de limpieza siempre con la clave completa observada.
5. **Espejos lib↔script que ya habían roto producción** (el fix ÷1000 de compras hubo que aplicarlo
   a mano en dos lados) → los scripts ahora **importan** las libs reales; +91 tests Vitest en CI con
   los fixtures exactos de E2 congelando tus fórmulas contra regresiones.
6. **~235 KB del SDK de Supabase viajaban al cliente en todas las páginas públicas** → `AuthMenu`
   lazy: `/comercio` 783→526 KB, `/graficos` 1.150→911 KB.
7. **Datos de ejemplo a la vista** (pizarra de la cinta hardcodeada, implícitas "Granos (ej.)") →
   cinta con pizarra real de CAC, serie de ejemplo eliminada, `sample.ts` borrado, **`noindex`
   global quitado**.
8. **Trampas del encendido del login desactivadas**: el proxy ya no bloquea `/api/views|informes/*`
   (la Routine MP3 sobrevive), `INFORME_TOKEN` por header + `timingSafeEqual`, CSP Report-Only +
   HSTS, mesa lee con service key y el revoke de las 7 matviews **ya está aplicado y verificado**,
   RPC muerta `ingest_cierres_cem` dropeada (con la lección: revocar PUBLIC, no solo anon).
9. **Mobile**: fin del scroll horizontal en todas las `(site)`; `/produccion` en pestañas; 404
   branded; DJVE sin ~70 filas vacías; sellos sin el puente "ISA Agents".
10. **Historia y docs**: PAS (BCBA) cerrado formalmente (Cloudflare 2/2, respaldo por mail),
    `PLAN_PUERTOS.md` al día, y las 3 listas de pendientes paralelas consolidadas — desde esta etapa,
    en el **backlog maestro de este archivo**.
11. **Decisiones de fórmula tuyas aplicadas** (E2): UST$T fijado a T+0, picker con vencimiento real,
    pases consecutivos agregados, aforo a % relativo, soja en equivalente poroto en el semáforo,
    extremos reales ("ilimitada") en estrategias + 4 presets nuevos.
12. **Hosting decidido y contratado**: Vercel Pro $20/mes, functions en gru1, spend limit.

**Lo que queda abierto** (el porqué de este documento) — en orden:
1. **Terminar el encendido del login** (Parte C: publicar la app de Google → `AUTH_ENFORCED=true`).
   Es lo único que está a mitad de camino HOY.
2. **DEA-SAGyP sigue bloqueada** — ni GitHub Actions ni la Edge Function de São Paulo conectan
   (`tcp connect error` 5/5). El dato está clavado al 13/07. Cubierta por healthcheck+alertas, pero
   hay que destrabar la fuente (lote L5).
3. **El backlog de producto**: informes automáticos MP1/MP2/MP4 (MP3 ya está — falta solo tu
   Routine), y los P1–P12 de `PLAN_BACKLOG.md` (P3/P4 con research hecho, esperan tus respuestas).
4. **Los 4 refactors de código aprobados-diferidos** (partir `market.ts`, util de mes/posición,
   motor de gráfico compartido, `noUncheckedIndexedAccess`) — lotes L1–L3.
5. **La calibración de parámetros de mesa** que quedaron marcados PROVISORIOS en el código
   (umbrales de cobertura, pesos/bandas/rindes del índice MESA, comisiones de estrategias) — lote L4.
6. **Robustez v2 de ingestas** (barrido de falso-verde en modos backfill + calendario desde el ICS
   de NASS + chequeo de erosión del roster) — lote L6.
7. **Pasos manuales tuyos chicos**: Routine MP3, borrar ramas mergeadas, suscripción mail PAS,
   responder P3/P4, confirmar el uploader, decidir H12 y girasol/sorgo.

**Nada aprobado se perdió; nada rechazado reaparece** — el registro completo está en las secciones
de abajo (§2 fusión, §5 rechazados).

---

## 1. Estado final por etapa

| Etapa | Hallazgos | Fase 2 | Quedó abierto (→ backlog §4) |
|---|---|---|---|
| E1 datos | 9 (+4 dudas) | 7 aplicados; #2 (visibilidad) diferido a E5 → **cerrado el 22/07** (service key + revoke aplicado); `calendario_informes` se conserva (decisión) | nada propio |
| E2 fórmulas | 6 (+11 preguntas, todas respondidas) | 5 aplicados + 8 respuestas implementadas; tests → E4 (hechos) | calibraciones r3/r4 + comisiones r9b → **L4** |
| E3 UX | 11 (+H12, +6 dudas) | 11 aplicados (incl. matviews H1/H6, aplicada 22/07); noindex quitado | **H12** (mobile /graficos, sin aprobar) · **D6** (montos VIEJA) |
| E4 código | 23 | 19 aplicados (incl. Vitest 91 tests, espejos por import real, bundle −235 KB) | #10/#11/#13/#14 → **L1–L3** |
| E5 infra | 14 (+22 caminos falso-verde) | 14 aplicados (todo aprobado); Partes A y B de la guía ejecutadas por Lautaro el 22/07 | **DEA** (#8, la Edge no alcanzó) → **L5** · barrido backfills + ICS NASS + roster → **L6** |
| E6 historia | 8 (+tabla de promesas) | 7 aplicados (docs consolidados, PAS cerrado) | ramas remotas (comandos) · uploader sin confirmar · girasol/sorgo (preguntar) |

## 2. Fusión: hallazgos que aparecieron en más de una etapa (dedup con decisión arrastrada)

> Regla de esta tabla: **una fila por problema real**, sin importar cuántas etapas lo vieron.
> La decisión es la de Lautaro en la etapa que lo cerró; el estado es el verificado HOY (22/07).

| Problema (una sola vez) | Lo vieron | Decisión arrastrada | Estado 22/07 |
|---|---|---|---|
| Visibilidad de datos de mesa: matviews/`lineup` legibles por anon vía API | E1 #2 → E5 Duda 5 | (a) mesa lee con service key + revoke a anon **al encendido** | ✅ CERRADO — `supabase.ts` prefiere service key; revoke de las 7 matviews **aplicado y verificado** (Parte B, 22/07) |
| Vistas pesadas sin materializar → timeout/500 (djve_cobertura · djve_embarques_mes · lineup_estacional) | E2 #1 · E3 H1/H6 | corregir (materializar, patrón `lineup_visitas`) | ✅ CERRADO — 3 matviews aplicadas; `/comercio/empresas`, `/senal` y `/embarques` pobladas |
| Refresh de matviews no corre / muere en silencio | E2 #2 → E5 #3 | corregir (causa raíz a E5) | ✅ CERRADO — `statement_timeout='300s'` por-función; `ingest-lineup` verde (dispatch 22/07) |
| DEA-SAGyP caída (timeout de conexión desde Actions) | E6 #1 → E5 #8 | Edge Function como ISA | ⚠️ **ABIERTO** — `dea-fetch` deployada pero MAGyP tampoco acepta São Paulo (`tcp connect error`); dato al 13/07; cubierto por healthcheck (9d) + alertas → **L5** |
| PAS (BCBA) "pendiente de validar" repetido en 4+ docs | semilla E1/E2/E5 → E6 #2 | cerrar: no automatizable (403 Cloudflare 2/2), respaldo mail | ✅ CERRADO en docs — falta el paso manual: **suscribirse al informe PAS por mail** |
| `ingest_cierres_cem` ejecutable por anon (SECURITY DEFINER con INSERT+HTTP) | E1 #1 → E5 #4 | revoke → al ver que PUBLIC lo neutralizaba, DROP | ✅ CERRADO — función dropeada; regla nueva: revocar incluye PUBLIC |
| Semántica de `compras.fuente` / convivencia MAGyP–Agrochat (y el DELETE que borró la semana 15/07) | E1 #3+Duda 2 → E5 #1/#2 | **(b)** MAGyP automática solo-INSERT + Agrochat manda (pisa la decisión provisoria de E1 "Agrochat única") | ✅ CERRADO — parser descarta el grupo viejo; upsert `ignore-duplicates`; semana 15/07 restaurada por el cron del 23/07 |
| Healthcheck sin cubrir compras/djve/matviews + umbrales flojos | E1 #4 → E5 #7 | corregir | ✅ CERRADO — 17 checks (matviews, `views_mercado`, `vencimientos` ≥180d, seeds ≥60d, DEA 9d) + alertas Resend |
| Datos de ejemplo a la vista (cinta pizarra · implícitas granos) → causa del `noindex` | semilla E3 · E6 → E3 H4/H5/D1-D2 → E4 #15 | conectar CAC real + sacar la serie + borrar `sample.ts` + quitar noindex | ✅ CERRADO — todo aplicado; el sitio ya es indexable (páginas de mesa mantienen su noindex propio) |
| `compras.*` en float8 (causa raíz del incidente ÷1000/6,4e15) | E1 →Para E4 → E4 #7 | migrar a `numeric` ahora | ✅ CERRADO — 9 columnas migradas, matview recreada idéntica |
| `campanas.ts` (TS) ↔ SQL `campana_ini_year` divergentes (SOJA_CRUSH) | E1 →Para E4 → E4 #3 | corregir + test de paridad | ✅ CERRADO — SQL actualizada; paridad 612/612 en Vitest |
| Espejos lib↔script (parse-agrochat, noticias-clasificar, factores CBOT, ADMIN_SEED_EMAILS) | E4 #2/#4/#5/#20 (semilla E2) | import real (no copias) | ✅ CERRADO — los `.mjs` importan `src/lib`; función SQL de chequeo de seeds |
| Cero tests / fichas E2 como fixtures | E2 #6 → E4 #12 | tanda completa | ✅ CERRADO — Vitest, 14 archivos, 91 tests verdes en CI |
| Fórmula de `calc-planta` inline + `precioConPago` duplicada | E2 →Para E4 → E4 #16 | corregir | ✅ CERRADO — `src/lib/planta.ts` extraída; import real |
| Prender `AUTH_ENFORCED` rompía flujos (proxy vs `/api/*` con token propio · Routine MP3) | E5 #5 (semilla MP3) | corregir antes del encendido | ✅ CERRADO — proxy deja pasar `/api/views|informes/*`; token por header Bearer |
| Hardcodeos con vencimiento (seed `vencimientos` · `FERIADOS_AR` · seeds calendario 2026) | E5 #9 (semilla E2 para feriados) | corregir | ✅ CERRADO — `vencimientos` se refresca cada noche desde CEM; test Vitest de feriados; checks de seed en healthcheck. La **versión mayor** (generar desde ICS NASS) → **L6** |
| Alertas de un solo canal (nadie vio DEA 5 días ni lineup 3 días en rojo) | E6 #1 (evidencia) → E5 #7 | mail Resend a lautaroronchi97@gmail.com | ✅ CERRADO — 6 workflows críticos con `if: failure()`; `RESEND_API_KEY` cargada y probada (3 alertas reales) |
| Tres listas de pendientes paralelas | E6 #5 (propuesta) → E7 | lista única | ✅ CERRADO — el backlog maestro es el **§4 de este archivo**; `ESTADO.md`/`CONTEXTO.md`/`PLAN_BACKLOG.md` apuntan acá |

**El resto de los hallazgos fue único de su etapa** y quedó cerrado en su propia fase 2 (verificación
en la tabla «Fase 2» de cada informe). Los únicos abiertos están en la matriz de abajo.

## 3. Matriz impacto × esfuerzo de TODO lo aprobado-y-pendiente

> Impacto: para la **mesa** (Lautaro/Mauro operando) · para **clientes** (productores/acopios) ·
> para la **robustez** (que nada se rompa/mienta en silencio). Esfuerzo en **sesiones estimadas**
> (una sesión = un PR). Los ítems 🔒 esperan un insumo/decisión de Lautaro como paso 1.

| Ítem | Origen | Mesa | Clientes | Robustez | Sesiones | Depende de |
|---|---|---|---|---|---|---|
| Encendido del login — Parte C (publicar app Google + `AUTH_ENFORCED=true`) | E5/guía | alto | **alto** | alto | manual (~30 min) | Partes A/B ✅ hechas |
| **L5** — DEA: destrabar la fuente | E5 #8 | **alto** | medio | alto | 0,5–1 | — |
| **MP1** — informe diario (placa WhatsApp) | PLAN_INFORMES | **alto** | **alto** | — | 1 | env vars Claude ✅ listas |
| **MP2** — informe semanal (PDF) | PLAN_INFORMES | alto | **alto** | — | 1 | MP1 |
| **MP4** — interpretación de informes de organismos | PLAN_INFORMES / ítem 21 | alto | alto | — | 1 | MP1 |
| Routine semanal MP3 | PLAN_INFORMES | alto | — | — | manual (~10 min) | prompt listo en la sesión MP3 |
| **P3** build — compras netas BCRA (API v4 var 78) | PLAN_BACKLOG | alto | medio | — | 1 | 🔒 respuestas a `negocio/07` |
| **P4** build — camiones en puerto (SAGyP diario + backfill 2018→) | PLAN_BACKLOG | alto | medio | — | 1–1,5 | 🔒 respuestas a `negocio/08` |
| **L4** — calibración de mesa (umbrales cobertura · parámetros MESA · comisiones estrategias · roster) | E2 r3/r4/r9b + E5 | **alto** | bajo | medio | 1 | 🔒 tus valores (paso 1 del prompt) |
| **P1** — Merval + EWZ + volumen Matba en el monitor | PLAN_BACKLOG / ítem 5 | medio | medio | — | 0,5 | — |
| **P2** — variación semanal USD (gráfico) | PLAN_BACKLOG / ítem 13 | medio | medio | — | 1 | — |
| **P5** — vista por grano | PLAN_BACKLOG / ítem 18 | medio | **alto** | — | 1 | — |
| **L6** — robustez ingestas v2 (backfills + ICS NASS + roster-erosión) | E5 →E7 | bajo | — | **alto** | 1 | — |
| **P6** — gráficos v2 (paquete) | PLAN_BACKLOG | medio | medio | — | 1–1,5 | 🔒 ejemplos P12/P17 (parcial); presets de usuario esperan login ON |
| **P7** — vista productor + PWA | PLAN_BACKLOG | — | **alto** | — | 1 | login ON conviene primero (noindex ya resuelto ✅) |
| **P8** — feed A3 histórico intradiario | PLAN_BACKLOG | medio | — | medio | 1 | 🔒 secrets A3 en GitHub (manual) |
| Extras de spec de puertos (matriz mes/zonas · "qué cambió" ampliado) | ítem 6 backlog | medio | — | — | 0,5–1 | — |
| **L1** — partir `market.ts` + util única de mes/posición | E4 #10+#11 | — | — | medio | 1 | mejor ANTES de P2/P6 (tocan lo mismo) |
| **L3** — `noUncheckedIndexedAccess` (152 errores, 32 archivos) | E4 #13 | — | — | medio | 1 | después de L1 (menos archivos que sanear) |
| **L2** — motor de gráfico SVG compartido | E4 #14 | — | — | bajo | 1 | mejor antes de P2 (que suma un chart) |
| **H12** — overflow mobile de `/graficos` | E3 | bajo | medio | — | 0,25 | 🔒 tu OK (quedó sin aprobar) |
| **D6** — montos "VIEJA" enormes en `/comercio/empresas` (¿acumulan campañas?) | E3 → E1/E2 | medio | — | — | 0,5 | 🔒 tu criterio, o se investiga |
| **P9** — sintéticos TIR | PLAN_BACKLOG | medio | medio | — | 1 | 🔒 tabla IAMC + tu fórmula |
| **P10** — estrategias avanzadas (primas reales · costos por pata) | PLAN_BACKLOG | medio | medio | — | 1–2 | 🔒 tus decisiones/ejemplos |
| **P11** — modelo propio de capacidad de pago | PLAN_BACKLOG | medio | bajo | — | 1 | 🔒 tu fórmula |
| **P12** — scoring de clientes | PLAN_BACKLOG | alto (producto) | — | — | 2+ | 🔒 datos de fijaciones |
| Girasol/sorgo en "Negocios de planta" | E6 promesas | bajo | bajo | — | 0,1 | 🔒 ¿sigue interesando? |
| Leaked password protection | E1/E5 | — | — | bajo | 1 click | 🔒 requiere Supabase Pro ($25/mes) — decidiste NO por ahora; re-evaluar si upgradeás |

## 4. BACKLOG MAESTRO ÚNICO

> **Desde el 22/07/2026 esta es LA lista donde se prioriza.** Reemplaza el checklist «Plan RF AGRO»
> de `ESTADO.md` (queda como histórico), los «Pendientes» de `CONTEXTO.md` (ya retirados por E6) y
> el tablero de `PLAN_BACKLOG.md` (absorbido — sus prompts P1–P12 siguen siendo los prompts de
> ejecución). Cada sesión que complete un ítem lo tacha ACÁ y anota el PR.
> El orden dentro de cada grupo sale de la matriz §3; Lautaro puede reordenar libremente.

### A. Pasos manuales de Lautaro (no son sesiones — son clics/respuestas; destraban lo demás)

- [ ] **A1. Terminar Parte C del login**: publicar la app de Google a producción (retomar la pantalla
  de "verificación de marca" con captura completa) → checklist de encendido (`GUIA_LOGIN_SETUP.md`
  Parte C): Mauro admin → aprobar clientes → `AUTH_ENFORCED=true` + Redeploy → validación 5 min.
- [ ] **A2. Crear la Routine semanal MP3** (cron `0 12 * * 5`, prompt exacto en
  [`sesiones/2026-07-21-informes-mp3-view-mercado.md`](../sesiones/2026-07-21-informes-mp3-view-mercado.md)).
  Sin esto el view de `/granos/view` no se regenera solo.
- [ ] **A3. Suscribirse por mail al informe PAS de la BCBA** (respaldo acordado al descartar la
  automatización — E6 #2).
- [ ] **A4. Borrar las ramas remotas ya mergeadas**: las 7 de
  [`E6-historia.md`](E6-historia.md) § «Higiene» + las de las auditorías mergeadas después
  (`claude/auditoria-e3-ux-auikht`, `claude/auditoria-e4-codigo-p28mxd`, `claude/auditoria-e5-infra`,
  `claude/auditoria-e6-historia-yk24fj`, `claude/e5-fix-edge-auth-jwt-role`,
  `claude/e5-parte-b-c-cierre` — mismo comando `git push origin --delete <rama>`).
- [ ] **A5. Responder las preguntas de P3** (`negocio/07`: ¿alcanza rezago ~3 hábiles o querés carga
  manual del día?) **y P4** (`negocio/08`: ¿visibilidad solo-mesa o pública? ¿alcance del backfill
  2018→?) → destraban los 2 builds del grupo C.
- [ ] **A6. Confirmar si ya probaste el uploader de `/admin/datos` logueado** (promesa abierta desde
  el PR #44; si no, probarlo con el próximo export de Agrochat).
- [ ] **A7. Decidir H12** (fix del overflow mobile de `/graficos`, 15 min de sesión — ¿va?) **y
  girasol/sorgo** en "Negocios de planta" (¿sigue interesando o se cierra sin hacer?).
- [ ] **A8. (Cuando corresponda) re-evaluar Leaked password protection** si algún día upgradeás
  Supabase a Pro — hoy decidido NO (plan Free).

### B. Quick wins restantes (fixes chicos, se pueden juntar en una sola sesión)

- [ ] **B1. H12** — `/graficos` overflow horizontal en mobile 390px (body=741px por el constructor;
  el fix de `.head-tools` de E3 no lo cubre). *Espera A7.*
- [ ] **B2. D6** — investigar los montos "VIEJA" de `/comercio/empresas` (soja 108,9 Mt / maíz
  395,3 Mt declarado campaña vieja: ¿acumulan varias campañas por diseño o es atribución errada?).
  Con evidencia SQL, o criterio directo de Lautaro.
- [ ] **B3. Girasol/sorgo** en el selector de "Negocios de planta". *Espera A7.*

### C. Features de producto (el valor nuevo; orden por matriz §3)

- [ ] **C1. MP1 — informe diario** (placa PNG WhatsApp; prompt en `PLAN_INFORMES.md`).
- [ ] **C2. MP2 — informe semanal PDF** (tras MP1; cierra también el remanente "reporte" del ítem 5
  viejo: metales/petróleo/Merval/SPY/EWZ al informe).
- [ ] **C3. MP4 — interpretación de informes de organismos** (tras MP1; borrador → OK en /admin →
  publica en /produccion).
- [ ] **C4. P3 build — compras netas BCRA** (fuente ya elegida: API v4 var 78; *espera A5*).
- [ ] **C5. P4 build — camiones en puerto** (fuente ya elegida: SAGyP diario + ~103 PDFs de
  historia; *espera A5*).
- [ ] **C6. P1 — Merval + EWZ + volumen Matba** en el monitor de `/granos`.
- [ ] **C7. P2 — variación semanal del USD** (gráfico en /dolar; *conviene después de L1/L2*).
- [ ] **C8. P5 — vista por grano** (compone libs existentes, cero lógica nueva).
- [ ] **C9. Extras de spec de puertos** (matriz por mes/zonas · "qué cambió" ampliado — lo que quedó
  fuera de las Fases 1-4).
- [ ] **C10. P6 — gráficos v2** (URL modo Período · ratio % · export PNG/CSV · media móvil ·
  vol/OI · guard parcial; P12/P17 del plan de gráficos esperan tus ejemplos; presets de usuario
  esperan login ON).
- [ ] **C11. P7 — vista productor + PWA** (mejor con login encendido: es para clientes reales).
- [ ] **C12. P8 — feed A3 histórico intradiario** (paso manual previo: secrets A3 en GitHub Actions).
- [ ] **C13. P9 — sintéticos TIR** 🔒 (tabla IAMC + fórmula tuya como paso 1).
- [ ] **C14. P10 — estrategias avanzadas** 🔒 (primas reales/costos: tus decisiones como paso 1).
- [ ] **C15. P11 — modelo propio de capacidad de pago** 🔒 (tu fórmula como paso 1).
- [ ] **C16. P12 — scoring de clientes** 🔒 (datos de fijaciones como paso 1; producto nuevo, por fases).
- [ ] **C17. Gráficos intradía** (consume la tabla `snapshots` de C12 — anotado al cerrar P8).

### D. Lotes técnicos aprobados (refactors/calibración/robustez — prompts en §6)

- [ ] **D1 = L5. DEA: destrabar la fuente** (incidente abierto — primero del grupo).
- [ ] **D2 = L4. Calibración de mesa** 🔒 (tus valores como paso 1 del prompt).
- [ ] **D3 = L6. Robustez de ingestas v2** (falso-verde en backfills + ICS NASS + roster-erosión).
- [ ] **D4 = L1. Partir `market.ts` + util única de mes/posición** (antes de C7/C10 idealmente).
- [ ] **D5 = L3. `noUncheckedIndexedAccess`** (después de L1).
- [ ] **D6 = L2. Motor de gráfico SVG compartido** (antes de C7 idealmente).

### Dependencias explícitas (grafo corto)

```
A1 (login ON) ──→ C11 (vista productor) · presets de usuario de C10 · marca de agua activa
A2 ──→ /granos/view se regenera solo
A5 ──→ C4 y C5
A7 ──→ B1 y B3
C1 (MP1) ──→ C2 (MP2) y C3 (MP4)
C12 (P8) ──→ C17 (gráficos intradía);  C12 espera secrets A3 en Actions (manual)
D4 (L1) ──→ D5 (L3 más barato) · conviene antes de C7/C10
D6 (L2) ──→ conviene antes de C7 (chart nuevo del USD semanal)
D2 (L4) 🔒 valores de Lautaro;  C13–C16 🔒 insumos de Lautaro
noindex→index: ✅ YA RESUELTO (E3/E4) — la dependencia que citaba PLAN_BACKLOG quedó caída
```

### Orden sugerido si Lautaro no reordena

**Ahora:** A1 + A2 (manuales) → C1 (MP1) → D1/L5 (DEA) → C2 (MP2).
**Después:** A5 → C4/C5 (P3/P4) → D2/L4 (calibración) → C3 (MP4) → C6 (P1) + B (quick wins).
**Luego:** D4/L1 + D6/L2 → C7 (P2) → C8 (P5) → D3/L6 → C10 (P6) → C11 (P7, ya con login) →
C12 (P8) → C9 → D5/L3 → C13–C16 a medida que estén los insumos.

## 5. Rechazados y descartados (para que NO reaparezcan)

| Qué | Dónde se decidió | Veredicto |
|---|---|---|
| Modelar planes Cocos Gold/Pro/AFI en `costos.ts` | E2 r9c | **No** — alcanza humana/jurídica |
| Migración de `globals.css` a Tailwind / reorganización big-bang | E4 | **No recomendada** — CSS custom bien organizado; Tailwind queda instalado sin uso |
| Unificar las policies permisivas duplicadas (advisor perf) | E5 #13b | **No, deliberado** — cambiar semántica de policies por un warning de perf en tablas de <100 filas no paga el riesgo |
| MAGyP como fuente única / apagar el cron de compras | E5 Duda 1 | **No** — decisión (b): MAGyP automática + Agrochat manda (pisa la provisoria de E1) |
| Avance vs Bolsa en el panel de empresas | PR #34, confirmado E6 #4 | **Descartado** en esa entrega |
| Backfill Wayback de `compras` | 19/07, confirmado E6 | **Descartado — NO reintentar** (0 capturas) |
| Automatizar PAS (BCBA) | E6 #2 | **Descartado** — Cloudflare 403 desde 2 IPs distintas; respaldo = mail (A3) |
| X/medios/Telegram para compras netas BCRA | research P3 | **Descartado** para automatizar — la API v4 tiene el dato oficial |
| BCR-prosa / dataPORTUARIA / CKAN para camiones | research P4 | **Descartados** — SAGyP es la fuente |
| Cloudflare Workers como hosting | E5 hosting | **Descartado por ahora** (el adapter no soporta el Node middleware que `proxy.ts` necesita) — re-evaluar en ~6 meses |
| `arbitrajes-table.tsx` como código muerto | semilla E3 | **Falso** — es el wrapper server de `arbitrajes-editable` |
| Borrar `calendario_informes` (0 filas) | E1 Duda 3 | **No** — se conserva como base del ítem 21/MP4 |
| `cierres-panel.tsx` huérfano | E4 | **Intencional**, documentado — no tocar |
| Leaked password protection ya | E5 #13c → sesión 22/07 | **Diferido a propósito** (requiere Supabase Pro $25/mes; plan Free confirmado) — solo vive como A8 |

## 6. Prompts de corrección por lote (autocontenidos, estilo PLAN_AUDITORIA)

> Cada uno se pega en una sesión nueva. Reglas transversales de siempre: rama desde `main`
> actualizado · 1 PR por lote, base `main`, draft hasta verificado · `npm run lint` + `npx tsc
> --noEmit` + `npm run build` (+ `npm test`) antes de pushear · doc de sesión + tachar el ítem en el
> backlog maestro (`auditoria/E7-sintesis.md` §4) al cerrar · Next.js 16 con breaking changes (leer
> `node_modules/next/dist/docs/`) · no suponer: dudas → AskUserQuestion.

### L1 — Partir `market.ts` + util única de mes/posición (E4 #10 + #11)

```text
Ejecutá el lote L1 del backlog maestro (docs/auditoria/E7-sintesis.md §4; leé antes ESTADO.md y
docs/auditoria/E4-codigo.md §A y §B — ahí está el diseño ya aprobado). Rama claude/lote-l1-market
desde main. Es REFACTOR PURO: cero cambios de comportamiento, cero fórmulas tocadas.
PARTE 1 — market.ts (546 líneas, 8 responsabilidades) → src/lib/market/{http,types,tickers,fuentes,
cinta,dolar-futuro,dolar-linked,volumen,lecaps}.ts según el §A EXACTO del informe E4, con
src/lib/market.ts como FACHADA de re-export (los 11 imports existentes de "@/lib/market" no se
tocan; getMaeOficial NO se re-exporta — es interno). Resolvé las 3 notas "Fase B" moviendo el parser
de tickers a tickers.ts; la nota "TIR pendiente" de LECAPs queda documentada en lecaps.ts (la TIR es
el backlog C13, no de este lote).
PARTE 2 — util única de mes/posición: extender src/lib/dates.ts con MESES_ES, mesIndice,
parsePosicion, vencKeyDePosicion, vtoDePosicion, posicionDeFecha, hoyVencKey y migrar los 9
call-sites de la tabla §B de E4 (curva.ts, futuros.ts, derivadas.ts, market/tickers.ts,
lineup/embarque.ts, graficos-client.tsx, periodo-panel.tsx, calc-fijar.tsx, negociado-chart.tsx).
MONTH_LETTER (bonos AR) y EN2ES/EN_IDX (monitor-mercados, meses en inglés) quedan FUERA — resuelven
otro problema. OJO: mantener la diferencia semántica intencional de filtro DISPO (futuros sí, curva
no) — que quede como parámetro explícito, no como copia.
CRITERIOS DE ACEPTACIÓN: (1) los 91+ tests existentes pasan SIN modificar sus expects; (2) sumá
tests de paridad de la util nueva reusando los 39 casos que E2 corrió (transcriptos en la ficha
transversal de E2-formulas-fichas.md); (3) `git grep "@/lib/market"` muestra los mismos 11
importadores; (4) diff de HTML servido en /granos, /dolar y / (home) idéntico byte a byte corriendo
local con datos reales (NODE_USE_ENV_PROXY=1) antes vs después — guardá la evidencia en el doc de
sesión; (5) lint/tsc/build/test verdes. PR draft base main; doc de sesión + tachar D4 en el backlog
maestro.
```

### L2 — Motor de gráfico SVG compartido (E4 #14)

```text
Ejecutá el lote L2 del backlog maestro (docs/auditoria/E7-sintesis.md §4; leé antes ESTADO.md y el
hallazgo #14 de docs/auditoria/E4-codigo.md). Rama claude/lote-l2-chart-engine desde main.
REFACTOR PURO de UI: cero cambios visuales ni de datos.
ALCANCE: evolucion-chart.tsx, compras/negociado-chart.tsx y dolar-futuro-chart.tsx reimplementan
cada uno constantes de tamaño/padding, escalas X/Y, yTicks, algoritmo de "punto más cercano" del
crosshair (onPointerMove/onPointerLeave) y tooltip por %. Extraé: hook useCrosshair(puntos, W, H,
pad) + componente base SvgLineChartBase parametrizado (children/slots para lo específico: gradiente
de área, series múltiples, tabla). Los 3 charts pasan a usarlos. NO tocar spread-chart.tsx (usa
recharts, patrón distinto) ni ChartMarca/ChartTabla (ya deduplicados).
CRITERIOS DE ACEPTACIÓN: (1) screenshots antes/después por chart (claro+oscuro, desktop+390px) sin
diferencia visual — Playwright con /opt/pw-browsers/chromium, datos reales; (2) el crosshair y el
tooltip se comportan igual (probar hover en puntos extremos y series con huecos); (3) ningún chart
nuevo de líneas SVG debería volver a copiar el motor — dejá un comentario-guía en el componente
base; (4) lint/tsc/build/test verdes. PR draft base main; doc de sesión + tachar D6 en el backlog
maestro. NOTA: si este lote corre antes que P2 (variación semanal USD), avisale a la sesión de P2
que su chart nuevo DEBE usar SvgLineChartBase.
```

### L3 — `noUncheckedIndexedAccess` (E4 #13)

```text
Ejecutá el lote L3 del backlog maestro (docs/auditoria/E7-sintesis.md §4; leé antes ESTADO.md y el
hallazgo #13 de docs/auditoria/E4-codigo.md). Rama claude/lote-l3-nuia desde main.
OBJETIVO: prender "noUncheckedIndexedAccess": true en tsconfig.json y sanear los ~152 errores en 32
archivos que E4 midió con una corrida real (si L1 ya corrió, serán menos — re-medí primero).
ESTRATEGIA en 2 tandas dentro del mismo PR: (1) los 3 archivos concentrados (calendario.ts 25,
graficos-client.tsx 14, evolucion-chart.tsx 14 ≈ 1/3 del total); (2) el resto disperso (1-5 por
archivo). REGLAS: el fix por defecto es el guard explícito (if (!x) …/?? fallback) que respete la
degradación existente — NUNCA el operador ! salvo invariante obvio y comentado en el mismo renglón;
prohibido cambiar comportamiento: si un guard nuevo cambia un resultado (antes crasheaba o daba
undefined silencioso), anotalo en el doc de sesión como bug latente encontrado. Los .match()[1] y
arr[i] de parsers son los candidatos a bug real — prestales atención especial.
CRITERIOS DE ACEPTACIÓN: (1) tsc limpio con la flag prendida EN el tsconfig.json real; (2) los 91+
tests pasan sin tocar expects; (3) build y páginas clave (/, /granos, /dolar, /graficos,
/produccion) renderizan igual con datos reales; (4) lista en el doc de sesión de todo lugar donde el
saneo reveló un bug latente (aunque sea "ninguno"). PR draft base main; doc de sesión + tachar D5.
```

### L4 — Calibración de parámetros de mesa (E2 r3 + r4 + r9b + roster E5)

```text
Ejecutá el lote L4 del backlog maestro (docs/auditoria/E7-sintesis.md §4; leé antes ESTADO.md,
docs/auditoria/E2-formulas.md (preguntas 3, 4 y 9b + respuestas) y los archivos con los parámetros
marcados PROVISORIOS: src/lib/lineup/cobertura.ts y src/lib/lineup/mesa_calor.ts). Rama
claude/lote-l4-calibracion desde main. REGLA CENTRAL: los valores los define Lautaro — este lote es
una entrevista estructurada + implementación de SUS números, no una calibración estadística propia.
PASO 1 (AskUserQuestion, con el efecto numérico de cada opción calculado con datos REALES del día):
(a) umbrales de cobertura 0,7/1,3 + mínimo 5.000 t + cortes de intensidad 60k-720k — mostrale qué
señal da HOY cada producto con los valores actuales y qué cambiaría con alternativas; incluí la
asimetría señalada por E2 (el mínimo de 5.000 t solo protege el lado alcista — ¿mínimo bajista
también?); (b) parámetros del índice MESA: pesos 0,35/0,30/0,35, bandas 80/60/40/20, umbral de
dirección 32.500 t, K=10 días, y los rindes de equivalente poroto 0,745 harina / 0,19 aceite
(mostrale la sensibilidad: en 10.000 t de aceite, 0,19→0,185 mueve ~1.400 t); (c) comisiones de
estrategias del catálogo (25 USD/ctto, IVA, tamaño de contrato — ESTRATEGIAS_CATALOGO.md) — ¿se
implementan en calc-estrategias reusando costos.ts, y con qué ejemplo numérico suyo?; (d) roster de
exportadores (shippers.ts): proponele el chequeo de erosión "share de OTROS > X% = aviso" y que fije
X.
PASO 2 (solo tras sus respuestas): aplicar los valores confirmados, SACAR las marcas "PROVISORIO"
del código reemplazándolas por un comentario "calibrado por Lautaro AAAA-MM-DD", actualizar los
tests afectados (mesa_calor/estacional tienen fixtures) con los valores nuevos COMO NUEVOS FIXTURES
aprobados, implementar comisiones si dio el OK (con su ejemplo como test), y el chequeo de erosión
del roster (en el propio getEmpresas o en el healthcheck — proponé el lugar).
CRITERIOS DE ACEPTACIÓN: cada valor cambiado tiene la decisión citada en el doc de sesión; /comercio/
temperatura y /empresas verificadas en navegador con datos reales antes/después (las señales pueden
cambiar — documentar el antes/después es parte del entregable); lint/tsc/build/test verdes. PR draft
base main; doc de sesión + tachar D2. Si Lautaro contesta "quedan como están", el lote cierra igual:
se saca PROVISORIO y se documenta que los validó.
```

### L5 — DEA-SAGyP: destrabar la fuente (E5 #8, incidente abierto)

```text
Ejecutá el lote L5 del backlog maestro (docs/auditoria/E7-sintesis.md §4; leé antes ESTADO.md,
el hallazgo #8 de docs/auditoria/E5-infra.md y el § Continuación de
docs/sesiones/2026-07-21-auditoria-e5-infra.md). Rama claude/lote-l5-dea desde main.
SITUACIÓN: datosestimaciones.magyp.gob.ar no acepta conexiones ni desde GitHub Actions (ConnectTimeout
4/4) ni desde la Edge Function dea-fetch en sa-east-1 (tcp connect error, timeout 240s) — el remedio
que funcionó para ISA acá NO alcanzó. El dato DEA está clavado (verificá la fecha real con SQL al
arrancar). Healthcheck (9d) + alertas ya avisan; este lote va por la fuente.
FASE RESEARCH (con requests reales, sin construir hasta cerrar con Lautaro): (a) ¿el bloqueo es por
IP de datacenter en general? probá el POST del CSV desde este sandbox y documentá el resultado;
(b) rutas alternativas al MISMO dato oficial: los PDFs mensuales de DEA (?mes=, ya identificados en
la sesión C del 12/07 como backfill), otra URL/subdominio de MAGyP que sirva el mismo CSV, o el
dataset en datos.gob.ar/CKAN si reapareció; (c) relay barato fuera de datacenters conocidos (ej.
Cloudflare Worker gratis con IP distinta — probá si MAGyP le responde; un worker de 20 líneas que
solo proxya ese POST); (d) último recurso: carga semi-manual (Lautaro baja el CSV del navegador y lo
sube por /admin/datos con una pestaña nueva — patrón uploader existente). Armá la comparativa
(fiabilidad · esfuerzo · mantenimiento) y presentásela con AskUserQuestion.
FASE FIX (tras su OK): implementar la opción elegida reusando el pipeline actual (ingest-dea.mjs
parsea/upsertea igual — solo cambia CÓMO llega el CSV); si es relay, el secreto/URL va en secrets de
Actions, nunca al repo; guard anti falso-verde intacto; probar end-to-end con dispatch al mergear y
verificar que estimaciones_produccion DEA avanza de fecha. Si NADA destraba la fuente, documentar el
cierre honesto (dato DEA discontinuado + quitarlo del comparador con sello claro) — que lo decida
Lautaro, no el silencio.
CRITERIOS DE ACEPTACIÓN: dato DEA fresco en la base (o decisión explícita de descarte), healthcheck
verde con el umbral que corresponda, doc de sesión con TODOS los intentos y sus resultados (para que
nadie re-pruebe caminos muertos). PR draft base main + tachar D1.
```

### L6 — Robustez de ingestas v2 (E5 → E7)

```text
Ejecutá el lote L6 del backlog maestro (docs/auditoria/E7-sintesis.md §4; leé antes ESTADO.md,
docs/auditoria/E5-infra.md Anexo A completo y su fase 2 — el camino DIARIO ya quedó cubierto; este
lote cierra lo que quedó). Rama claude/lote-l6-ingestas-v2 desde main.
ALCANCE (3 bloques):
1) FALSO-VERDE RESTANTE: barrer los caminos del Anexo A que la fase 2 de E5 NO cubrió — en
   particular los modos backfill/dispatch (caminos 1, 3, 5, 6, 8, 13, 15, 19, 20 del anexo: "backfill
   con parser roto y 0 filas = verde"). Regla uniforme: en modo backfill, N snapshots pedidos con 0
   filas parseadas = exit 1 (el patrón ya aplicado a compras en E5); json shape inesperado = error
   tipado, no []. El camino 20 (guard daily muerto de la Edge lineup-ingest) se resuelve borrando la
   capa redundante o activándola de verdad — elegí y documentá.
2) CALENDARIO DESDE EL ICS DE NASS: reemplazar los arrays hardcodeados 2026 de src/lib/calendario.ts
   (WASDE_2026, CROP_PROGRESS_2026, etc.) por generación desde el ICS oficial de NASS + calendarios
   publicados (los endpoints ya están validados en PLAN_CALENDARIO_PRODUCCION.md §8, OJO ICS sin
   TZID y ESMIS 0-indexed). Puede ser generación en build/cron que emite el seed versionado (mejor
   que fetch en runtime: /produccion es ISR y el calendario debe funcionar aunque NASS no responda).
   El check "seed <60 días de futuro" del healthcheck queda como red por si la generación se rompe.
   Si el ICS no cubre algún organismo (CONAB/BCR), su seed sigue a mano — documentar cuál y por qué.
3) ROSTER DE EXPORTADORES: si L4 ya fijó el umbral de erosión, implementarlo acá si aún no está;
   si L4 no corrió, proponer default (share de OTROS >25% en el line-up de la rueda = ::warning +
   fila en healthcheck) y confirmarlo con Lautaro.
CRITERIOS DE ACEPTACIÓN: (1) tabla en el doc de sesión "camino del Anexo A → cómo quedó cerrado"
(los 22 con estado final — completa, para cerrar el tema de una vez); (2) cada guard nuevo probado
con un dry-run forzando el fallo (fixture roto o flag); (3) el calendario generado reproduce 1:1 el
seed 2026 actual (diff vacío) ANTES de agregarle 2027; (4) dispatches de smoke-test documentados
como paso post-merge; (5) lint/tsc/build/test verdes. PR draft base main; doc de sesión + tachar D3.
```

---

## Cierre de la auditoría

Con esta síntesis, la auditoría integral **queda completa**: E1–E7 cerradas, tablero de
`PLAN_AUDITORIA.md` al día. La regla operativa desde acá:

1. **Se prioriza en el §4 de este archivo** (backlog maestro único). `ESTADO.md` conserva su
   protocolo de sesiones y el «Ahora»; su checklist viejo quedó como histórico apuntando acá.
2. Los **prompts de ejecución** viven donde siempre: P1–P12 en `PLAN_BACKLOG.md`, MP1–MP4 en
   `PLAN_INFORMES.md`, L1–L6 acá (§6).
3. Todo pendiente **nuevo** se agrega acá (§4), no en listas paralelas (regla de E6).
