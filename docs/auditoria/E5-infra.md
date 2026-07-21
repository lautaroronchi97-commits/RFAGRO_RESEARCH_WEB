# Auditoría E5 — Infraestructura, ingestas y seguridad operativa (2026-07-21)

- **Rama:** `claude/auditoria-e5-infra` · **PR:** #_ (base `main`, draft hasta el OK)
- **Alcance:** las 14 ingestas (`scripts/*.mjs` + Edge Function `lineup-ingest`) con sus últimos ~10
  runs reales de Actions cada una · monitoreo (`healthcheck-frescura.mjs`) · los 13 workflows/crons ·
  secretos e historial git · headers/hardening web · camino al encendido de `AUTH_ENFORCED` (proxy ↔
  dal ↔ RLS + hardcodeos con fecha de vencimiento) · comparación de hosting. Según el PROMPT E5 de
  [`PLAN_AUDITORIA.md`](../PLAN_AUDITORIA.md). Hereda y resuelve/reubica los diferidos operativos de
  E1 (#2 visibilidad de matviews), E2 (causa raíz del refresh que no corrió) y E6 (mitigación DEA).
- **Cómo se verificó:** MCP GitHub (runs y logs reales de los 13 workflows — ~120 runs revisados, con
  log de cada falla) · MCP Supabase (`get_advisors` security+performance, `list_edge_functions`,
  SQL de frescura/ACLs/roles sobre la base viva) · **tests empíricos con la anon key** (curl a RPCs y
  matviews) · **dry-run real de `ingest-compras.mjs`** contra la página viva de MAGyP · fetch del TXT
  vivo de CONAB · lectura línea por línea de los 15 scripts y 13 YMLs (6 subagentes de lectura; la
  verificación cruzada y las conclusiones son de esta sesión) · escaneo completo del historial git
  (139 commits) · investigación web con precios verificados para hosting. FASE 1: **cero escrituras**
  en la base (el único test de RPC usó producto inexistente y falló adentro sin insertar).

## Resumen ejecutivo

La infraestructura está mejor de lo que sugiere su tamaño (13 crons, 14 ingestas, cero secretos
filtrados en todo el historial git), pero la auditoría encontró **dos incidentes vivos que nadie vio**
y un **accidente de la propia auditoría integral**: (1) la limpieza de E1 (`delete from compras where
fuente='MAGYP'`, 21/07 03:35 UTC) borró sin saberlo **la semana real del 15/07** que el cron MAGyP
había cargado 12 horas antes — `compras` quedó clavada al 08/07 y el índice MESA corre con farmer
selling de 13 días; se auto-repara el jueves 23/07 cuando el cron reinserte (y también reinsertará
las 7 filas basura del 27/05, porque el parser lee un segundo grupo de paneles viejo de la página).
(2) `ingest-lineup` está **rojo 6/6 desde que estrenó el cron** — hoy el dato entra pero
`refresh_lineup_visitas` devuelve HTTP 500: la RPC creció a 6 matviews y el `statement_timeout=8s`
del rol `authenticator` (todo PostgREST, incluso con service key) la mata; las matviews de mesa están
al día de casualidad (la migración de E3 las repobló al recrearlas) y quedan viejas en el próximo
ciclo. Además: el revoke de E1 sobre `ingest_cierres_cem` quedó **neutralizado por el grant a PUBLIC**
(anon la ejecuta hoy — test empírico), hay **22 caminos de falso-verde** mapeados en las ingestas
(ninguna multi-componente tiene guard por componente), el sistema de alertas es un único canal débil
(mail default de GitHub — ya falló 2 veces según E6), prender `AUTH_ENFORCED` **rompe la Routine MP3**
(el proxy bloquea `/api/views/insumos` antes del token), y hay 3 familias de hardcodeos con fecha de
vencimiento sin ningún aviso (seed `vencimientos` hasta SEP27, `FERIADOS_AR` 2027 estimado, seeds
2026 del calendario). Hosting: recomendación **Vercel Pro ($20/mes, 1 asiento, functions en gru1)**.

## Hallazgos (priorizados, el más grave primero)

> La columna **Decisión** la completa Lautaro: `corregir` / `no` / `diferir a E7` / `preguntar más`.

| # | Hallazgo | Evidencia | Impacto | Esfuerzo | Propuesta de fix | Decisión Lautaro |
|---|---|---|---|---|---|---|
| 1 | **La semana real del 15/07 de `compras` fue borrada por la limpieza de E1.** Secuencia verificada: el cron MAGyP del lunes 20/07 15:01 UTC upserteó 30 filas `fuente=MAGYP` (log: "Compras vigente: 30 filas … OK") = 23 filas REALES de la semana 15/07 + 7 basura del 27/05; 12 h después la migración de E1 corrió `delete from compras where fuente='MAGYP'` **sin filtro de fecha** (creyendo que eran solo las 7 huérfanas observadas antes del run del lunes) y se llevó las 23 reales. Hoy `compras` termina en el **08/07** (13 días) → `pctlFarmer` del índice MESA y `/comercio/negociado` corren con dato viejo sin aviso (el healthcheck de compras tiene umbral 14d: recién enrojece el 22/07). | Log del run `29753262868` (job `88388995182`: "30 filas … Upsert … OK") · `supabase/migrations/20260721033519_e1_limpieza_compras.sql:7` (delete sin filtro) · SQL hoy: `max(fecha)=2026-07-08`, `count(fuente='MAGYP')=0` · **dry-run real de hoy**: `node scripts/ingest-compras.mjs --out` → 30 filas = {15/07: 16 EXP + 7 IND · 27/05: 7 IND} | **alto** — mesa (farmer selling, negociado) | S | **Se auto-repara el jueves 23/07** (el cron reinserta la semana 15/07)… junto con las 7 basura del 27/05. No hace falta rescatar datos; hace falta **decidir la fuente** (Duda #1) y arreglar el parser (hallazgo #2). Lección de proceso para el protocolo: un `DELETE` de limpieza siempre con la clave completa observada (acá: `and fecha='2026-05-27'`), nunca por etiqueta abierta. | |
| 2 | **El parser de `ingest-compras.mjs` lee un 2º grupo de paneles viejo de la página MAGyP** (la página tiene cada grano DOS veces: un grupo "AL 15/07/2026" y otro "AL 27/05/2026"; el regex itera todos) → cada corrida inserta 7 filas basura fechadas 27/05 (solo INDUSTRIA), las mismas que E1 catalogó de "test del scraper". Mientras el cron siga prendido, la basura vuelve 2 veces por semana. Además el cron activo **contradice la decisión registrada en E1** ("Agrochat es la fuente única de compras — decisión de Lautaro, 21/07"). | Página viva: `grep 'AL [0-9/]*' → AL 15/07/2026 y AL 27/05/2026`, 33 marcadores `TabbedPanelsContent`, cada label ×2 · `scripts/ingest-compras.mjs:134` (regex sin distinguir grupo) · dry-run de hoy con las 7 filas 27/05 · decisión en `20260721033519_e1_limpieza_compras.sql:4-6` vs cron vivo `ingest-compras.yml:13-14` | medio-alto — datos sucios recurrentes + decisión pisada | S | Según la Duda #1: (a) Agrochat única → **apagar el schedule** de `ingest-compras.yml` (dejar el dispatch); (b) MAGyP convive → filtrar paneles cuya fecha "AL" tenga >30 días o quedarse solo con el primer grupo, y definir convivencia de `fuente` sin pisadas. | |
| 3 | **`ingest-lineup` rojo 6/6 desde el estreno del cron (19/07) — falla activa: `refresh_lineup_visitas` devuelve HTTP 500** y las matviews de mesa quedan sin refresh. Causa raíz verificada: la RPC hoy refresca **6 matviews en un solo statement** (E2 le sumó `djve_cobertura`, E3 le sumó `djve_embarques_mes` + `lineup_estacional`) y TODO PostgREST pasa por el rol `authenticator` con `statement_timeout=8s` → 57014. Hoy gap/densidad están al 20/07 (= base) **de casualidad**: la migración de E3 del 21/07 las repobló al recrearlas; en el próximo ciclo quedan viejas. Los 4 rojos del 19-20/07 fueron la fuente ISA vacía (guard correcto); se recuperó sola el 21/07 (487 filas). | Runs `29800694927` y `29841765491` (21/07): "2026-07-20: 487 filas" + "ERROR: refresh_lineup_visitas devolvió HTTP 500" · `pg_get_functiondef(refresh_lineup_visitas)` = 6 REFRESH · `pg_roles`: `authenticator … statement_timeout=8s` · mismo 57014 que mató `cargar-compras.yml` (run `29692737322`) y que la matview `djve_cobertura` de E2 | **alto** — mesa (temperatura/empresas/embarques stale en silencio) + 2 rojos/día que enmascaran fallas nuevas | S | Migración: `ALTER FUNCTION refresh_lineup_visitas() SET statement_timeout = '300s';` (el SET por-función pisa el del rol durante la ejecución). Alternativa si aún así excede: partir en 2 RPC (lineup vs djve) o mover el refresh a `pg_cron`. Verificar con un dispatch al mergear. | |
| 4 | **El revoke de E1 sobre `ingest_cierres_cem` quedó neutralizado: anon la ejecuta HOY.** E1 revocó `anon, authenticated` pero el grant implícito a **PUBLIC** (`=X/postgres`, default de `CREATE FUNCTION`) sigue vivo y anon lo hereda. Test empírico: `POST /rest/v1/rpc/ingest_cierres_cem` con la anon key **entra al cuerpo de la función** y falla adentro con `function extensions.http_get(text) does not exist` — o sea (a) el revoke no protege, y (b) la función además está **rota** (la extensión `http` no está donde ella espera): es código muerto — el cron real (`ingest-cierres.mjs`) upsertea directo por PostgREST, no la usa nadie. | `pg_proc.proacl` de `ingest_cierres_cem` = `{=X/postgres,postgres=X,service_role=X}` · curl anon 21/07: HTTP 404 con error 42883 **desde adentro de la función** (llegó a ejecutar; sin insert) · advisor `anon_security_definer_function_executable` la sigue listando · E1 fase 2 la dio por cerrada ("anon ahora 404") | medio — seguridad (SECURITY DEFINER con INSERT+HTTP invocable por anon; hoy inofensiva solo porque está rota) | S | `DROP FUNCTION public.ingest_cierres_cem(text,date,date);` (nadie la usa) — o, si se quiere conservar, `REVOKE EXECUTE … FROM PUBLIC`. Regla general para fase 2 y futuras migraciones: todo revoke de función debe incluir **PUBLIC**, no solo anon/authenticated. | |
| 5 | **Prender `AUTH_ENFORCED=true` rompe `/api/views/insumos` (la Routine semanal MP3).** El proxy redirige a `/ingresar` toda ruta sin sesión que no esté en `RUTAS_PUBLICAS`, y ningún prefijo `/api` está — el endpoint tiene su propia auth por token pero **nunca llega a ejecutarse**: la Routine (fetch sin cookies) recibiría un 307→HTML en vez del JSON. El futuro `/api/informes/datos` (MP1) va a caer en la misma trampa. | `src/lib/auth/config.ts:65-74` (RUTAS_PUBLICAS sin `/api`) · `src/lib/auth/session.ts:99-104` (redirect) · `src/app/api/views/insumos/route.ts:31-38` (token) | **alto el día del encendido** — el flujo de informes muere junto con el login | S | Excluir del redirect los handlers con auth propia (`path.startsWith("/api/views/")`/`"/api/informes/"`) o sumarlos a `RUTAS_PUBLICAS` (su token ES su auth). Anotarlo en `GUIA_LOGIN_SETUP.md` y en el plan MP1. | |
| 6 | **Falso-verde parcial sistémico: 22 caminos mapeados; ningún guard es por componente.** Los guards anti falso-verde (E1/PR #25) son todos sobre el TOTAL del run: `ingest-cbot` con 34/35 contratos caídos = verde (catch por-contrato que solo loguea); `ingest-pizarra` con 4/5 granos muertos = verde, y no distingue "estructura Drupal rota" de "día sin dato" (`[]` en ambos); `ingest-gea` con 2/3 tablas sin matchear = verde, y si no puede leer la fecha del informe **inserta vintages con fecha "hoy"** (dato falso en verde); `ingest-noticias` con 25/26 fuentes caídas = verde (erosión invisible); `ingest-usda`: WASDE muerto + PSD vivo = verde **incluso en el healthcheck** (el PSD refresca la misma `fecha_publicacion`); casi todos los modos backfill quedan verdes con 0 filas aunque el parser esté roto. Lista completa con archivo:línea en el Anexo A. | Anexo A (22 caminos, archivo:línea) — top: `ingest-cbot.mjs:247-249,262` · `ingest-pizarra.mjs:74,78-79,157` · `ingest-gea.mjs:97,137-140,239` · `ingest-noticias.mjs:262,301` · `ingest-usda.mjs:369` + `healthcheck-frescura.mjs:56` | **alto** — robustez: es el mismo patrón "falso verde" que ya congeló GEA en feb-2026, ahora en versión parcial | M | Endurecimiento quirúrgico (sin reescrituras), por orden: (1) GEA: exigir las 3 tablas + `exit 1` si la fecha del informe no parsea (nunca fallback a "hoy"); (2) pizarra: `parseSerie` tipada (`{rota:true}` ≠ vacía) + guard por grano (soja/maíz/trigo); (3) CBOT: `if (ok < lista.length/2) exit 1` (el contador ya existe); (4) compras: exigir ≥6/7 paneles + backfill con "N snapshots y 0 filas = exit 1"; (5) noticias: umbral de fuentes OK (ej. <60% → exit 1) para frenar la erosión. Detalle por script en Anexo A. | |
| 7 | **Alertas = un único canal frágil (mail default de GitHub), ya fallado 2 veces.** Nada avisa activamente cuando un workflow queda en rojo: DEA estuvo 5 días roja sin que nadie lo note (E6) y `ingest-lineup` lleva 3 días rojo sin que nadie lo note (esta auditoría). Agravantes: el rojo "conocido" de DEA en `ingest-estimaciones-ar` enmascara futuros rojos de GEA (mismo semáforo); GitHub **deshabilita schedules tras 60 días sin commits**; los `::warning::` (refresh-calendario, probe PAS) demostraron ser invisibles. El healthcheck es la red real pero: DEA umbral 16d (enrojece recién el 29/07 por una caída del 16/07), no cubre las 3 matviews nuevas del 21/07 (`djve_cobertura`, `djve_embarques_mes`, `lineup_estacional`), ni `vencimientos`, ni `views_mercado`, ni ningún "seed de futuro" (hallazgo #9). | E6 (DEA 5 días, PAS 9 días) · esta auditoría (lineup 6/6 rojo, 3 días) · `healthcheck-frescura.mjs:49-69` (cobertura exacta) · `refresh-calendario.mjs:60-69` (`::warning` + exit 0) | **alto** — robustez de TODO el sistema de datos | M | Mínimo sin infra paga: (1) step `if: failure()` con mail vía **Resend** (la key ya existe) en `healthcheck.yml` + los 3-4 workflows críticos; (2) sumar al healthcheck: matviews nuevas (patrón matview-vs-base ya existente), `vencimientos` (`max(vencimiento) ≥ hoy+6m`), `views_mercado` (≤8d), y checks de seed (hallazgo #9); (3) bajar DEA a 9d; (4) mover el aviso del refresh-calendario al healthcheck (que sí enrojece). | |
| 8 | **DEA-SAGyP sigue caída (rojo persistente desde el 16/07, 4/4 corridas incl. el re-dispatch de E6)** — `ConnectTimeoutError` a `datosestimaciones.magyp.gob.ar:443` en 10 s, idéntico byte a byte: IPs de GitHub Actions filtradas por MAGyP (mismo patrón que ISA). Es el diferido explícito de E6 a E5. El dato DEA está clavado en el snapshot del 13/07. GEA sigue escribiendo bien en los mismos runs (el aislamiento de steps funciona). | Runs `29470023642` (16/07), `29583324682` (17/07, el cron del viernes), `29861219905` (21/07) — mismo error · SQL: DEA `max(fecha_publicacion)=2026-07-13` | **alto** — mesa (comparador AR sirve DEA viejo sin aviso) | M | Replicar la solución ya probada con ISA: **mover el fetch a la Edge Function de Supabase (sa-east-1)** — el POST del CSV es un solo request; la función lo baja y lo devuelve o lo sube a Storage, y el script sigue haciendo el parse/upsert. Plan B más barato: reintentos con backoff largo (3×60s) por si el filtrado es intermitente — pero 4/4 timeouts sugiere bloqueo estable, no congestión. | |
| 9 | **Tres familias de hardcodeos con fecha de vencimiento, todas con degradación silenciosa y cero aviso:** (a) seed de `vencimientos` = foto única del 08/07 hasta `MAI SEP27`; el comentario dice "refrescable por el cron" pero **ese cron no existe** (grep: 0 usos en scripts/workflows) → cuando A3 liste posiciones no sembradas, TNA de Arbitrajes/Pases = "—" y las calculadoras degradan al fin-de-mes (~7 días de error, TNA subestimada sin marca); (b) `FERIADOS_AR` 2025-2027 con 2027 "estimado — revisar"; en 2028 todo feriado cuenta hábil; (c) seeds 2026 del calendario (`WASDE_2026`, `CROP_PROGRESS_2026`, etc. + `SEED_ACTUAL=2026`): el 01/01/2027 los 4 informes oficiales de importancia alta **desaparecen de `/produccion` en silencio**; el centinela mensual solo emite `::warning::` que nadie mira (patrón PAS). | `supabase/migrations/20260708120000:20-62` (última `2027-09-23`) · `src/lib/habiles.ts:9-23` · `src/lib/calendario.ts:107-127` · `scripts/refresh-calendario.mjs:18,60-69` · `src/lib/vencimientos.ts:16-24`, `src/lib/curva.ts:27-36` (degradaciones) | medio — mesa/cliente (números levemente mal y agenda incompleta, sin que nadie sepa) | S-M | (a) sumar a `ingest-cierres.mjs` el upsert de `vencimientos` desde CEM `/api/v2/symbols` (~20 líneas; corre cada noche con la service key) + check en healthcheck; (b) test de Vitest "hay feriados del año próximo a partir de octubre" (corre en CI); (c) check en healthcheck "quedan <60 días de seed oficial" con constante `ULTIMO_SEED` sincronizada por comentario. | |
| 10 | **`pizarra_historico` corre sistemáticamente T-1 pese al diseño de 3 crons "10:30/10:45/11:00 ART"**: GitHub dispara los schedules con ~1h50 de delay real (runs de hoy: 12:22-12:39 ART) y aún así la pizarra de HOY no entró (3 runs verdes el 21/07; `max(fecha)=20/07` a las 20:40 ART) — el guard de ventana (`--days 10`) se satisface con días viejos, nunca exige "hoy". El panel Arbitrajes NO se ve afectado (usa el scrape vivo de `pizarra.ts`); afecta series históricas y gráficos. El healthcheck (7d) jamás vería un lag de 1 día. | Runs verdes de hoy `29843660714/29843920997/29845028523` (15:22-15:39 UTC) vs SQL `max(fecha)=2026-07-20` a las 23:40 UTC · `ingest-pizarra.mjs:155-159` (guard de ventana) · healthcheck log 21/07: pizarra "17/07, 4d ✓" | medio-bajo — gráficos con 1 día de atraso permanente | S | Agregar un 4º cron tarde (ej. `0 21 * * 1-5` = 18:00 ART) que sí capture el día, y/o que la ÚLTIMA pasada del día exija la fecha de hoy (o T-1 si aún no publica CAC, con `::warning`). Bajar el umbral del healthcheck de pizarra a 3-4 días. | |
| 11 | **Concurrency y timeouts ausentes donde hacen falta**: solo `ingest-noticias` tiene `concurrency`; **nadie** tiene `timeout-minutes` (default 6 h — un run colgado de noticias con `cancel-in-progress:false` encola ~6 corridas). Riesgos concretos: backfill CBOT × cron nocturno comparten el rate-limit de Barchart (el cron muere en 429); backfill lineup × cron = doble `REFRESH MATERIALIZED VIEW` concurrente; `ingest-compras` × `cargar-compras` × uploader admin = **tres escritores de la misma tabla** con un `--replace-legacy` (borrado) en el medio — y `cargar-compras.yml` **nunca tuvo un run verde** (1/1 falló en el refresh viejo) con `replace_legacy` default `true` y un CSV del repo que quedó atrás de los fixes hechos por SQL (÷1000): un re-dispatch descuidado pisa la serie saneada, sin el guard de unidades del uploader (vive en `admin/datos/actions.ts`, no en el parser compartido). | Grep `concurrency`/`timeout-minutes` (1 y 0 hits en 13 YMLs) · run `29692737322` (cargar-compras 1/1 rojo post-upsert) · `cargar-compras.yml:20-23,40` · guard de unidades solo en `src/app/admin/datos/actions.ts` | medio — robustez de datos ante operaciones simultáneas | S | (1) `concurrency` con `cancel-in-progress:false`: `group: compras` COMPARTIDO entre `ingest-compras` y `cargar-compras`; groups propios en cbot y lineup; (2) `timeout-minutes: 20` en todas las ingestas (30 en backfills); (3) `replace_legacy` default → `false` + aviso en la descripción del input; (4) portar el guard de unidades al parser compartido o al script del workflow. | |
| 12 | **Hardening web (pre-encendido del login):** (a) `INFORME_TOKEN` viaja por **query string** (queda en logs de Vercel/proxies) y el compare no es timing-safe — el mejor momento de arreglarlo es AHORA (la Routine consumidora aún no existe); (b) sin **CSP** (con login + cookies próximos, es el gap más relevante ante una XSS) y HSTS no declarado (hoy lo pone Vercel); (c) `bodySizeLimit: "16mb"` es **global**: también lo heredan las server actions públicas (contacto de la landing sin rate limit, actions de auth) → DoS barato/amplificación de factura; (d) los 13 workflows sin `permissions:` (GITHUB_TOKEN con default del repo; ninguno necesita escribir); (e) la Edge Function valida el rol decodificando el JWT **sin verificar firma** — la defensa real es `verify_jwt` del gateway, que no está versionado en el repo. | `src/app/api/views/insumos/route.ts:31-38` · `next.config.ts:12-29` · `src/app/bienvenida/actions.ts` (pública, caps de longitud pero sin rate limit) · grep `permissions:` = 0 hits · `supabase/functions/lineup-ingest/index.ts:196-204` | medio — seguridad operativa | S | (a) token a header `Authorization: Bearer` + `crypto.timingSafeEqual`; (b) CSP en modo `Report-Only` para arrancar (`default-src 'self'` + orígenes Supabase) + HSTS explícito al pasar a dominio propio; (c) chequeo de `content-length` temprano en `proxy.ts` para rutas públicas (el límite por-action no existe aún en Next); (d) `permissions: {contents: read}` en los 13; (e) versionar `verify_jwt` (config.toml) o comparar contra la service key por igualdad. | |
| 13 | **Higiene Supabase**: (a) 2 Edge Functions **fantasma** `lineup-probe` y `lineup-fetch` siguen ACTIVE y no están versionadas en el repo (sobras del desarrollo de la Fase 0); (b) advisors de performance pendientes de E1 que conviene cerrar ANTES del login (con tráfico autenticado se pagan por request): RLS initplan en `profiles`/`access_log`/`sesiones_activas` (`auth.uid()` sin `(select …)`), policies permisivas duplicadas en `empresas`/`profiles`/`sesiones_activas`; (c) leaked password protection de Auth sigue OFF; (d) `admin_*`/`registrar_sesion`/`tocar_sesion` siguen ejecutables por anon (guard interno verificado — devuelven vacío — pero el advisor las lista; revocar EXECUTE a anon las saca del mapa). | `list_edge_functions` (3 ACTIVE, solo 1 en repo) · advisors 21/07: 4× `auth_rls_initplan`, 4× `multiple_permissive_policies`, `auth_leaked_password_protection`, 20× funciones SECURITY DEFINER expuestas · curl anon a `admin_usuarios` → `[]` HTTP 200 (guard OK) | bajo-medio — robustez/costo por request post-login | S | (a) borrar las 2 funciones fantasma (o versionarlas si algo las usa — nada las referencia en el repo); (b) migración con `(select auth.uid())` + merge de policies duplicadas; (c) prender leaked password protection en el dashboard (1 click de Lautaro); (d) revoke EXECUTE a anon de las RPC que solo usan sesiones (`admin_*`, `tocar_sesion` la llama el proxy CON sesión) — **cuidado con PUBLIC** (hallazgo #4). | |
| 14 | **Menores de coherencia**: (a) el run del healthcheck corre a la 01:10 UTC (22:10 ART) — la extensión de E1 (15 checks) entró a `main` el 21/07 pero el run de esa noche todavía corrió la versión vieja de 9 checks: verificar mañana que corran los 15; (b) los 12 workflows de ingesta hardcodean `node-version: "22"` mientras CI usa `.nvmrc` — si `.nvmrc` sube, los crons prueban otra versión que la que valida CI (relevante: los `.mjs` ahora importan `.ts` de `src/lib`); (c) TODOS los jobs tiran el warning de deprecación Node 20 de `actions/checkout@v4`/`setup-node@v4`; (d) `refresh-calendario.yml` tiene 0 runs (primer disparo 01/08) — nunca se ejercitó end-to-end; (e) el header de `refresh-calendario.mjs` promete "exit ≠0" que el código deliberadamente no hace (comentario desactualizado); (f) `docs/INFRAESTRUCTURA.md` quedó congelado al 07-08/07 (pre-todo) — como con `PLAN_PUERTOS.md` en E6, conviene un banner de "histórico". | healthcheck run `29792427510` (9 checks) vs `scripts/healthcheck-frescura.mjs` en main (15) · grep `node-version` · logs de todos los runs · `refresh-calendario.mjs:10-11` vs `:60-69` | bajo | S | (a) mirar el run del 22/07; (b) `node-version-file: .nvmrc` en los 12; (c) subir a `checkout@v5`/`setup-node@v6` en un barrido; (d) dispatch de smoke-test tras el merge; (e) corregir el comentario; (f) banner en INFRAESTRUCTURA.md. | |

### Anexo A — los 22 caminos de falso-verde (evidencia archivo:línea)

| # | Camino | Evidencia |
|---|---|---|
| 1 | `ingest-cierres` backfill (`--from`): 0 filas → verde | `ingest-cierres.mjs:153` |
| 2 | `ingest-cierres` diario: 1 de 3 productos muerto → verde (guard agregado) | `ingest-cierres.mjs:135-141` |
| 3 | `ingest-cierres`: `json.data` no-array degrada a `[]` | `ingest-cierres.mjs:65` |
| 4 | `ingest-cbot` diario: 34/35 contratos caídos + 1 vivo → verde | `ingest-cbot.mjs:247-249,262` |
| 5 | `ingest-cbot` `--backfill`: 0 filas → verde | `ingest-cbot.mjs:262` |
| 6 | `ingest-pizarra` `--from`: 0 filas → verde | `ingest-pizarra.mjs:157` |
| 7 | `ingest-pizarra`: estructura Drupal rota = `[]` (indistinguible de "sin dato"); parcial por grano → verde | `ingest-pizarra.mjs:74,78-79,157` |
| 8 | `ingest-compras` `--backfill`: todos los snapshots fallados → "sin filas parseables" verde | `ingest-compras.mjs:319-321,344-345` |
| 9 | `ingest-compras` live: paneles sin matchear se saltan mudos | `ingest-compras.mjs:138,140` |
| 10 | `ingest-compras`: refresh de matview fallido solo loguea (mitigado por healthcheck) | `ingest-compras.mjs:362` |
| 11 | `ingest-noticias`: 25/26 fuentes caídas + 1 titular → verde | `ingest-noticias.mjs:262,272,301` |
| 12 | `ingest-usda` `--no-psd` (no-backfill): 0 filas → verde | `ingest-usda.mjs:369` |
| 13 | `ingest-usda` `--backfill-wasde`: backfill 100% fallido → verde | `ingest-usda.mjs:328-330,369` |
| 14 | `ingest-usda` cron: WASDE muerto + PSD vivo → verde (y healthcheck también) | `ingest-usda.mjs:369` + `healthcheck-frescura.mjs:56` |
| 15 | `ingest-gea` `--backfill`: catch por snapshot + 0 filas → verde | `ingest-gea.mjs:233-235,260-261` |
| 16 | `ingest-gea` live: 1-2 de 3 tablas sin matchear → verde parcial | `ingest-gea.mjs:97` |
| 17 | `ingest-gea` live: fecha del informe ilegible → vintage con fecha "hoy" (dato falso en verde) | `ingest-gea.mjs:137-140,239` |
| 18 | `ingest-pas`: Cloudflare → exit 0; 0 filas → exit 0 (verde en todos los caminos, por diseño probe) | `ingest-pas.mjs:141-145,177-180` |
| 19 | `ingest-lineup` `--date`/`--from`: 0 filas → verde (guard solo diario) | `ingest-lineup.mjs:102-105` |
| 20 | Edge `lineup-ingest`: su guard `daily` nunca se activa invocada por el script (capa redundante muerta) | `index.ts:214,254` vs `ingest-lineup.mjs:51` |
| 21 | `refresh-calendario`: todo error tragado → verde perpetuo (deliberado; el header dice lo contrario) | `refresh-calendario.mjs:31-33,60-69` |
| 22 | `cargar-compras` vía workflow: sin el guard de unidades del uploader (un export en miles pasa) | `cargar-compras.mjs:82-91` vs `admin/datos/actions.ts` |

### Anexo B — salud real de los 13 workflows (últimos ~10 runs c/u, al 21/07 23:59 UTC)

| Workflow | Cron (ART) | Veredicto | Duración típica | Nota |
|---|---|---|---|---|
| ingest-cierres | L-V 20:00 | 🟢 10/10 schedules | 9-14 s | 2 no-verdes fundacionales (08/07, backfill manual) |
| ingest-cbot | L-V 19:00 | 🟢 10/10 | 41-50 s | retry interno 429/5xx OK; sin DST issue (T-1 + 22 UTC) |
| ingest-pizarra | L-V 10:30/45/11:00 | 🟢 19/19 | 19-38 s | pero corre 12:2x ART real y captura T-1 (hallazgo #10) |
| ingest-noticias | cada hora :17 | 🟢 30/30 (144 hist.) | 25-36 s | cadencia real 1-3 h por drift de GitHub |
| ingest-compras | lun+jue 10:00 | 🟢 1/1 schedule | 16 s | pero ver hallazgos #1/#2 (verde ≠ dato útil) |
| cargar-compras | dispatch | 🔴 1/1 | 37 s | falso rojo documentado; nunca tuvo run verde |
| ingest-conab | L-V 08:30 | 🟢 9/9 | 11-21 s | fuente al 9º lev (TXT verificado) — la ingesta está bien |
| ingest-usda | 9-13 c/mes 17:00 | 🟢 4/4 | 12-16 s | próximo disparo 09/08 |
| ingest-estimaciones-ar | mié 22:00 + vie 09:00 | 🔴 desde 16/07 | 23-27 s | GEA escribe OK en los runs rojos; DEA ConnectTimeout 4/4 (hallazgo #8) |
| ingest-lineup | 10:00 + 22:00 | 🔴 6/6 desde estreno | 19-36 s | hoy: dato entra, refresh 500 (hallazgo #3) |
| healthcheck | 22:10 | 🟢 8/8 | 12-17 s | verde con 2 ingestas rotas (hallazgo #7) |
| refresh-calendario | día 1, 09:00 | ⚪ 0 runs | — | estreno 01/08 sin ejercitar |
| ci | push/PR | 🟢 | — | único con `.nvmrc` y cache npm |

Horarios verificados sin riesgo DST: WASDE (cron 20 UTC pasa el release en EDT y EST), CBOT (22 UTC
post-settle en CDT/CST + T-1), Brasil sin DST desde 2019, Argentina sin DST. Ningún cron queda
corrido media temporada.

## Comparación de hosting (decisión pendiente declarada — Vercel Hobby es no-comercial)

> Precios verificados el 21/07/2026 contra la página de cada proveedor (URLs en
> [`sesiones/2026-07-21-auditoria-e5-infra.md`](../sesiones/2026-07-21-auditoria-e5-infra.md)).
> Perfil: Next 16 App Router, ISR 30s-3600s en ~38 rutas, server actions con uploads 16 MB, proxy en
> cada request (con login: +1 RPC a Supabase por request), tráfico chico, usuarios en Argentina,
> Supabase en São Paulo, crons fuera del hosting (GitHub Actions), dueño principiante.

| Opción | Costo/mes | Fidelidad Next 16 | Latencia AR | Carga operativa (1-5) | Riesgo factura | Previews por PR |
|---|---|---|---|---|---|---|
| **Vercel Pro** | **$20** (1 asiento; el uso entra en el crédito de $20 incluido) | ★★★★★ referencia | **functions en gru1 (São Paulo), solo en Pro** — 1,8× tarifas | **1** | bajo-medio (activar spend limit) | ya funcionando |
| **Netlify Pro** | $20 (el Free no alcanza: 300 créditos = 20 deploys/mes y este repo mergea mucho; deploy = $0,10) | ★★★★ (runtime oficial, Next 16 soportado) | functions en `gru` (Pro) | 2 | medio (créditos) | sí |
| Cloudflare Workers + OpenNext | $5 | ★★★☆ — **bloqueo actual: el adapter no soporta Node middleware, y `src/proxy.ts` es exactamente eso** | la mejor edge (PoPs en Bs.As./Córdoba/Neuquén) | 3,5 | muy bajo | a configurar |
| VPS (Hetzner €3,79 / DO $6-24) + Coolify | fierro barato + **horas humanas** | ★★★★★ (`next start`) | sin región SA | **5** | nulo | a armar a mano |
| Railway / Render | ~$10-15 / $7-25 | ★★★★★ | sin región SA | 2,5 | medio / bajo | config extra |
| AWS Amplify | ~$1-5 | ★★☆ (soporte tardío de majors) | sa-east-1 | 3,5 | **alto** (facturación AWS) | sí |

**Recomendación: Vercel Pro, 1 asiento, $20/mes — upgrade in-place antes de cobrar al primer
cliente.** (a) Migración CERO: el protocolo entero (Preview URL por PR, branch tracking, env vars) ya
vive en Vercel; (b) para un dueño principiante el costo humano de migrar supera por años los $15/mes
de diferencia con Cloudflare; (c) Pro desbloquea functions en **gru1** = las regeneraciones ISR y el
futuro proxy-con-RPC quedan al lado de Supabase (hoy Hobby corre en Washington: ~5 round-trips ×
120-140 ms por navegación con el login prendido → fijar gru1 recorta eso a ~10-20 ms por trip); (d)
con este tráfico el precio es plano en la práctica. Acciones al upgradear: `regions: ["gru1"]`,
activar **spend limit**, revisar la primera factura (ISR writes del revalidate=30 es el único medidor
a vigilar). **2ª opción:** Netlify Pro ($20, runtime oficial, gru en Pro) como plan B si Vercel se
pone hostil. **Cloudflare ($5)**: re-evaluar en 6 meses — hoy el Node middleware lo bloquea.

## Dudas / decisiones para Lautaro

1. **Fuente de `compras` — la decisión del 21/07 quedó a mitad de camino** (hallazgos #1/#2). En E1
   dijiste "Agrochat es la fuente única", pero el cron MAGyP sigue corriendo 2×/semana y trae la
   semana nueva ANTES que tu upload manual (la del 15/07 la trajo el lunes; tu export de Agrochat
   llega cuando lo subís vos). Opciones: **(a)** Agrochat única → apago el schedule del cron (queda el
   dispatch manual) y la serie depende 100% de tu upload semanal; **(b)** MAGyP automática + Agrochat
   como enriquecimiento → arreglo el parser (filtra el grupo viejo 27/05) y defino que MAGyP solo
   INSERTA semanas nuevas (nunca pisa filas AGROCHAT). Mi recomendación es (b): te ahorra el upload
   rutinario y tu export queda para correcciones/backfill. ¿Cuál va?
2. **¿Aplico en fase 2 el fix del refresh (`ALTER FUNCTION … SET statement_timeout`) por MCP y corro
   un refresh manual?** Destraba `ingest-lineup` (hoy rojo 2×/día) sin esperar al merge del PR.
3. **Alertas por mail (hallazgo #7): ¿a qué casilla?** ¿`lautaroronchi97@gmail.com` solo, o también
   Mauro? Usaría Resend con la key que ya está en Vercel (habría que cargarla también como secret de
   GitHub Actions — la hacés vos en Settings → Secrets).
4. **DEA (hallazgo #8): ¿Edge Function (como ISA) o reintentos con backoff?** La Edge es la solución
   probada; los reintentos son 5 líneas pero probablemente no alcancen (4/4 timeouts idénticos).
5. **Visibilidad de datos al prender el login** (diferido de E1 que me toca cerrar): hoy 7 matviews de
   mesa son legibles por anon vía API porque las páginas `/comercio/*` leen con la anon key
   server-side. Antes del encendido hay que elegir: **(a)** las páginas de mesa pasan a leer con la
   service key (server-only) y se revoca anon de las 7 matviews — cierra el agujero de verdad;
   **(b)** se deja como está (con el flag apagado TODO es público a propósito, y el HTML de esas
   páginas ya exige admin). Recomiendo (a) como parte del checklist de encendido, no antes.
6. **Hosting: ¿confirmás Vercel Pro** ($20/mes, tu tarjeta, checklist de 3 pasos arriba)? No corre
   hasta que quieras cobrar a clientes, pero conviene decidirlo ya para el plan del login.
7. **Vercel env vars por scope**: el MCP de esta sesión no ve tu proyecto (scope personal). Checklist
   manual para vos (2 min): Settings → Environment Variables → verificar que `SUPABASE_SERVICE_KEY` /
   `RESEND_API_KEY` / `INFORME_TOKEN` / las 3 de A3 estén **solo en Production** (no Preview — un PR
   podría leerlas) y que las `NEXT_PUBLIC_*` sí estén en ambos.

## Lo que está BIEN (no tocar)

- **Cero secretos en 139 commits de historial** — greps de service keys, JWTs, passwords, tokens: solo
  nombres de env vars y placeholders. `.gitignore` correcto; el bypass E3 jamás se commiteó; `ci.yml`
  no expone secrets a PRs de fork. La disciplina "secretos solo en env" se cumplió de punta a punta.
- **`lineup-ingest` (Edge) es el patrón a imitar**: valida los 14 encabezados exactos de la tabla
  contra `EXPECTED_HEADERS` (un cambio de estructura = `headers_changed`, no filas basura), falla
  ruidoso, y el script trata el refresh de matview como fatal.
- **El aislamiento de steps de `ingest-estimaciones-ar`** funciona como se diseñó: GEA siguió
  escribiendo en los 4 runs rojos de DEA.
- Guards anti falso-verde del PR #25 en el camino diario de todas las ingestas (el hueco es lo
  parcial y los modos backfill, no el diseño).
- Horarios de crons: todos correctos frente a DST de EEUU/Brasil (verificado caso por caso).
- Server actions con doble guard (requireAdmin + `is_admin()` en SQL), honeypot en el contacto,
  `/api/series` gateada correctamente con el flag prendido, y el proxy degrada sin 500s si Supabase
  se cae (web "cerrada", no rota).
- `ingest-cierres`, `ingest-cbot`, `ingest-conab`, `ingest-usda`, `ingest-noticias`, `healthcheck`:
  verdes estables de verdad (runs revisados uno a uno). CONAB al 9º levantamento **no es atraso
  nuestro**: el TXT oficial todavía no trae el 10º con datos (verificado contra la fuente viva).
- **PAS (BCBA): ya cerrado por E6** — la semilla de este prompt ("nunca validado, cerrá de una vez")
  quedó resuelta antes de esta etapa: probe 403 Cloudflare 2/2, descartado, respaldo = mail de
  Lautaro. No se re-abre; solo se registra (regla del plan: "resuelto antes de la auditoría").

## Para E7 (hallazgos que le corresponden a otra etapa)

- Guard por componente como **política general** de ingestas (si el #6 se aprueba parcial, el barrido
  completo de los 22 caminos + tests de paridad es tarea de lote E7).
- Barrido `actions/checkout@v5` + `setup-node@v6` + `node-version-file` en los 13 workflows (junto a
  cualquier otro barrido de deps).
- Generar el calendario oficial desde el ICS de NASS en vez de arrays a mano (versión mayor del
  hallazgo #9c).
- Roster de exportadores (`shippers.ts`) sin chequeo de erosión ("share de OTROS > X%") — señalado
  por el sub-informe de login; es calibración de negocio, no infra.

## Fase 2 — correcciones implementadas (completar tras el OK)

| # hallazgo | Qué se hizo | Commit | Verificación |
|---|---|---|---|
