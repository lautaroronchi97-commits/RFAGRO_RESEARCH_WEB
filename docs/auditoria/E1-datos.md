# Auditoría E1 — Datos y base de datos (2026-07-21)

- **Rama:** `claude/auditoria-e1-datos-vjmwzd` · **PR:** #_ (base `main`, draft hasta el OK)
- **Alcance:** las 14 tablas, 9 vistas, 4 matviews y ~19 RPCs del proyecto Supabase `lineup-argentina`
  (ref `gbpfgfeksqmzmsxnxiwg`): esquema, frescura, integridad, cotejo contra fuentes y diseño/almacenamiento,
  según el PROMPT E1 de [`PLAN_AUDITORIA.md`](../PLAN_AUDITORIA.md).
- **Cómo se verificó:** MCP Supabase de SOLO LECTURA (`list_tables`, `execute_sql` con SELECTs,
  `get_advisors` security+performance, `list_migrations`) el 21/07/2026; cotejo con requests reales a la
  API CEM (Matba Rofex), CAC-BCR y Barchart vía WebFetch; y prueba de las RPC con la **anon key pública**
  (`curl` a `/rest/v1/rpc/*`). **No se escribió nada en la base** (fase 1). Cada número de abajo salió de una
  query o request reproducible.

## Resumen ejecutivo

Los **datos guardados son correctos y fieles a la fuente**: el cotejo 1:1 dio exacto en futuros (11/11
filas CEM), pizarra (soja 17/07 = $495.000, CAC), CBOT (soja NOV26 17/07 = 1203 ¢/bu → 442,03 USD/tn) y
compras (trigo 25/26 Export 16.238.900 t, el valor verificado). Las matviews están **frescas** (reflejan la
última fila de su tabla base). **No hay** outliers >1e9 ni ÷1000 vigentes, ni acumulados rotos en las series
que se muestran hoy.

Lo que **sí requiere atención** es de **modelo, gobierno y monitoreo**, no de valores:
1. **Visibilidad de datos (DECISIÓN de Lautaro):** hoy TODA la base de lectura es pública por anon
   (matviews de mesa y `lineup` completo incluidos). Con `AUTH_ENFORCED` apagado es a propósito; hay que
   definir qué queda público al prender el login.
2. **`ingest_cierres_cem` es ejecutable por anon sin guard** y hace INSERT + HTTP saliente → único hallazgo
   de seguridad accionable ya (los `admin_*` sí tienen guard `is_admin()`, verificado con la anon key).
3. **7 filas huérfanas `fuente=MAGYP`** (todas fechadas 27/05/2026, solo INDUSTRIA) ensucian `compras` y su
   matview: es la "bomba de tiempo" de `compras.fuente`.
4. **Huecos de monitoreo:** el healthcheck NO cubre `compras`, `djve` ni las 4 matviews.
5. **5 tablas sin migración-baseline en el repo** (`djve`, `lineup`, `cbot_cierres`, `pizarra_historico`,
   `compras`) — el esquema vivo no está versionado.

Nada de esto rompe la web hoy. Los defectos de origen viejos (spike de 49,9 Mt, caídas en campañas 2020-22)
existen en la tabla cruda `compras` pero **están limpiados en la matview** que la web consume.

## Hallazgos (priorizados, el más grave primero)

| # | Hallazgo | Evidencia | Impacto | Esfuerzo | Propuesta de fix | Decisión Lautaro |
|---|---|---|---|---|---|---|
| 1 | **`ingest_cierres_cem(text,date,date)` es ejecutable por `anon` y `authenticated` sin guard interno**: es `SECURITY DEFINER`, hace `extensions.http_get` a la API CEM e `INSERT ... ON CONFLICT` en `futuros_cierres`. Cualquiera con la anon key puede disparar HTTP saliente + escritura desde la base. | `pg_proc.proacl` = `{anon=X, authenticated=X, ...}`; el cuerpo NO llama `is_admin()` ni chequea `service_role` (a diferencia de `admin_upsert_compras`, que sí). advisor `0028/0029`. | **alto** (robustez/seguridad) | S | `REVOKE EXECUTE ON FUNCTION ingest_cierres_cem FROM anon, authenticated;` (lo usa el cron con service_role, que conserva el EXECUTE). Migración chica. | |
| 2 | **Modelo de visibilidad: toda la base de lectura es pública por anon**, incluidas las 4 matviews de mesa (`lineup_visitas`, `lineup_densidad_hist`, `lineup_gap_hist`, `compras_avance_hist`) y la tabla `lineup` completa. Contradice el modelo "solo mesa" de `/comercio/*` (que sí gatea la **página** con `requireAdmin`, pero NO el dato en la API). | `curl` anon a `/rest/v1/compras_avance_hist` → devuelve filas; a `/rest/v1/lineup` → devuelve buques. advisor `0016` (matview in API) × 4. Policies `qual=true` para `anon`/`public` en las 14 tablas de datos. | **alto** (mesa/negocio) — pero es DECISIÓN, no bug | M | Ver «Dudas» #1. Requiere que Lautaro defina el mapa público/privado antes de tocar RLS/grants; probablemente convive con el encendido del login (E5). | |
| 3 | **7 filas huérfanas `fuente=MAGYP`** en `compras`, todas fechadas **27/05/2026** y solo sector **INDUSTRIA** (maíz/sorgo/cebada, campañas 24/25–26/27). Son un snapshot parcial de un test del scraper MAGyP reactivado que nunca se limpió. Entran a `compras_avance_hist` (filtra `fuente != LEGACY`) y pueden meter un punto fantasma en la serie INDUSTRIA. | `select fuente,count(*) from compras` → MAGYP=7, todas 27/05. `admin_upsert` no las pisa porque AGROCHAT no tiene esa clave-fecha. | **medio** (mesa) | S | Borrar las 7 filas MAGYP (o re-decidir la semántica de `fuente`, ver «Dudas» #2). `DELETE FROM compras WHERE fuente='MAGYP'` + `refresh_compras_avance()`. | |
| 4 | **El healthcheck de frescura NO cubre `compras`, `djve` ni las 4 matviews.** `compras` (semanal) y `djve` (diaria) pueden congelarse sin alerta; una matview sin refrescar mostraría datos viejos calladamente. | `scripts/healthcheck-frescura.mjs:48-58` (CHECKS): solo `futuros_cierres`, `cbot_cierres`, `pizarra_historico`, `lineup`, `noticias`, `estimaciones`. | **medio** (robustez) | S | Sumar 3 checks: `djve.fecha_registro` (umbral ~4d), `compras.fecha` (umbral ~10d) y un check de "matview refrescada" (comparar `max(fecha)` matview vs tabla base). Detalle de implementación → coordinar con E5. | |
| 5 | **5 tablas sin migración-baseline en el repo:** `djve`, `lineup`, `cbot_cierres`, `pizarra_historico` tienen su `CREATE` en el historial de migraciones de la base pero **el .sql no está en `supabase/migrations/`** (la carpeta arranca el 07/07); `compras` **no tiene migración de creación en ningún lado** (la primera que la menciona, `20260719...columnas_ricas`, la ALTER-a). El esquema vivo no es reproducible desde el repo. | `ls supabase/migrations/` (arranca 20260707) vs `list_migrations` (djve=20260425, lineup=20260418, cbot/pizarra=20260710 — ninguno en el repo; compras en ninguna). | **medio** (robustez) | M | Generar 1 migración-baseline idempotente (`CREATE TABLE IF NOT EXISTS` + índices + policies) por DDL dumpeado en el Anexo A, marcada como ya-aplicada. No cambia la base; versiona lo que hay. | |
| 6 | **`campana_ini_year` sin `search_path` fijo** (única función del proyecto sin `search_path` seteado). Riesgo de resolución de nombres si cambia el `search_path` de sesión; la usan 5 vistas de comercio. | advisor `0011`; `pg_proc.proconfig` = `null` para `campana_ini_year` (todas las demás tienen `search_path=public`). | bajo (robustez) | S | `ALTER FUNCTION campana_ini_year(text,date) SET search_path = public;` | |
| 7 | **`profiles.approved_by` es FK sin índice** + 3 índices nunca usados (`idx_lineup_port`, `estimaciones_lookup_idx`, `profiles_estado_idx`). Costo hoy nulo (tablas de auth vacías), pero `idx_lineup_port` pesa sobre 509k filas sin uso. | advisors perf `0001` y `0005`. | bajo (robustez) | S | Crear `profiles_approved_by_idx`; dropear `idx_lineup_port` (los otros dos se resuelven al prender el login/estimaciones, dejar). | |
| 8 | **Policies RLS con `auth.<fn>()` sin `(select …)`** en `profiles`/`access_log`/`sesiones_activas` + **policies permisivas duplicadas** en `empresas`/`profiles`/`sesiones_activas` (misma role+acción). Reevaluación por fila y doble chequeo. Irrelevante hoy (0-2 filas), pero se paga al prender el login. | advisors perf `0003` (×4) y `0006` (×4). | bajo (robustez, futuro) | S | Envolver `auth.uid()`→`(select auth.uid())` en las 4 policies; unificar las permisivas duplicadas (la `admin all` ya cubre el SELECT). Coordinar con E5 (encendido login). | |
| 9 | **`compras.saldo_a_fijar_tn = -300`** en 1 fila (cebada cervecera 22/23 Export, 18/01/2023). Único negativo de la tabla; defecto de origen del export Agrochat, no afecta lo que se muestra hoy. | `select ... where saldo_a_fijar_tn<0` → 1 fila. | bajo (dato) | S | Clampear a 0 esa fila (o dejar; es histórico viejo fuera de las campañas activas). | |

## Dudas / decisiones para Lautaro

1. **Modelo de visibilidad de datos (la más importante).** Hoy, con `AUTH_ENFORCED` apagado, la anon key
   lee TODO por la API REST: pizarra, futuros, CBOT, estimaciones, noticias… **y también** el line-up de
   buques completo (`lineup`) y las 4 matviews de mesa (`compras_avance_hist`, `lineup_gap/densidad_hist`,
   `lineup_visitas`). Las páginas `/comercio/*` están gateadas con `requireAdmin`, pero el **dato crudo no**:
   `curl` con la anon key lo devuelve igual.
   - **(a)** Cuando prendas el login, ¿qué debe quedar **público** (cliente/anónimo) y qué **solo mesa**?
     Mi lectura: público = pizarra, futuros, dólar, CBOT, estimaciones, noticias; solo-mesa = `lineup` +
     las 4 matviews + `djve` detallada. ¿Coincidís?
   - **(b)** **Mientras tanto** (login apagado, sitio con `noindex`), ¿lo dejamos abierto como está, o ya
     cerramos por RLS las matviews/`lineup` (que ni siquiera se muestran a un anónimo en la web)? Cerrarlas
     ahora no rompe nada visible y saca 5 warnings de seguridad.
   Según qué elijas, en fase 2 escribo las policies/grants; si es grande, va «diferido a E7».

2. **Semántica de `compras.fuente` (LEGACY / AGROCHAT / MAGYP).** Ya causó 3 versiones de la matview y hoy
   hay 7 filas MAGYP huérfanas (hallazgo #3). ¿La fuente MAGyP se va a reactivar de verdad como serie
   paralela, o Agrochat es la fuente única y MAGyP quedó descartada? Si es lo segundo, borro las 7 filas y
   propongo **eliminar la columna `fuente`** (o dejarla solo como etiqueta informativa, nunca como filtro de
   la matview). Si MAGyP vuelve, hay que definir cómo conviven dos acumulados de la misma clave sin pisarse.

3. **`calendario_informes` tiene 0 filas y el calendario se genera en código (`calendario.ts`).** ¿La
   dejamos como base para el futuro (marcar publicaciones desde la ingesta, ítem 21/MP4), o la borramos para
   no cargar una tabla-fantasma? No molesta, pero hoy no cumple ninguna función.

4. **Umbrales de frescura por tabla.** Para los 3 checks nuevos (#4): ¿`djve` = 4 días hábiles?, `compras` =
   10 días (2 semanas de gracia sobre la cadencia semanal)? Confirmame y los dejo fijados.

## Lo que está BIEN (no tocar)

- **Fidelidad a la fuente: verificada 1:1.** Futuros ↔ CEM (11/11 filas soja+maíz del 20/07 con settlement,
  volumen y OI exactos), pizarra ↔ CAC (soja 17/07 = $495.000), CBOT ↔ Barchart (soja NOV26 17/07 = 1203
  ¢/bu, conversión ×0,3674371 = 442,03 USD/tn exacta), compras ↔ el valor verificado (trigo 25/26 Export
  16.238.900 t). Los guardados no están adulterados.
- **Las matviews están frescas:** `compras_avance_hist` al 08/07 (= última compra), `lineup_*_hist` al 16/07
  (= último line-up). El refresh por RPC funciona.
- **La limpieza monótona de la matview de compras funciona:** las 9 caídas grandes del acumulado crudo
  (spike WHEAT 49,9 Mt en 2019/20, SFSEED, MALT, SORGHUM — todas 2020-2022, defectos de origen del export)
  están **clampeadas** por el `min OVER (... ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING)`. La web no
  las ve.
- **Los guards `is_admin()` de los `admin_*` andan:** con la anon key, `admin_usuarios`/`admin_empresas`
  devuelven `[]` e `is_admin()` devuelve `false`. `registrar_sesion`/`tocar_sesion` cortan si `auth.uid()`
  es null. `admin_upsert_compras`/`admin_refresh_compras_avance` exigen `is_admin()`. Bien hechos.
- **Claves y unicidad razonables:** PK naturales `(symbol,fecha)` en cierres, `(grano,fecha)` en pizarra,
  `(organismo,país,grano,campaña,variable,fecha_pub)` en estimaciones (modelo de vintages correcto),
  `link` en noticias; unique de negocio en `compras` y `djve`; `lineup_unique_row` con `NULLS NOT DISTINCT`
  (idempotencia de snapshots bien resuelta). No hay duplicados por clave lógica en ninguna tabla verificada.
- **Tipos consistentes con el uso:** `numeric` en precios/cierres (exacto), `date` para cortes diarios,
  `timestamptz` para auditoría. (La excepción `compras.*` en `double precision` se comenta en «Para E4».)

## Para otras etapas

- **Para E5 (infra/seguridad):** los hallazgos #1 (revoke `ingest_cierres_cem`), #4 (3 checks nuevos del
  healthcheck), #6/#7/#8 (advisors: search_path, índices, RLS initplan) son operativos — si Lautaro los
  aprueba acá, se pueden implementar en E1 o remitir a E5. La **Leaked Password Protection deshabilitada**
  (advisor auth) es de config de Supabase Auth → E5 al encender el login. La decisión de visibilidad
  (#2/Duda 1) se cruza con el encendido de `AUTH_ENFORCED`.
- **Para E4 (código):** `compras` guarda montos en **`double precision`** (float) mientras que
  `futuros_cierres`/`pizarra`/`cbot`/`djve` usan `numeric`. El float fue la causa raíz de los parseos rotos
  (6,4e15) del 20/07. Evaluar migrar `compras.*` a `numeric`. Además, `campana_ini_year` (SQL) está
  duplicada en `lineup/campanas.ts` (TS) — test de paridad. `djve.codigo_interno` es null en 169.514 de
  334.270 filas (era ROE 2011-2018, usan `cosecha`): las vistas de comercio filtran `codigo_interno in(...)`,
  así que esas filas quedan fuera por diseño — documentarlo para que nadie lo lea como bug.
- **Para E2 (fórmulas):** `futuros_cierres` ↔ `vencimientos` es consistente para las 16 posiciones vivas
  (todas tienen vencimiento cargado); `vencimientos` tiene 41 filas (18 ya vencidas) — sano.

## Fase 2 — correcciones implementadas (tras el OK de Lautaro, 21/07/2026)

| # hallazgo | Qué se hizo | Migración / archivo | Verificación |
|---|---|---|---|
| 1 | `REVOKE EXECUTE ON ingest_cierres_cem FROM anon, authenticated` (el cron la usa con service_role) | `20260721033455_e1_seguridad_indices.sql` (aplicada por MCP) | `curl` anon a `/rpc/ingest_cierres_cem` → **HTTP 404**; `proacl` sin anon/authenticated |
| 3 | Borradas las 7 filas `fuente=MAGYP` + refresh de la matview | `20260721033519_e1_limpieza_compras.sql` (aplicada) | `count(*) where fuente='MAGYP'` = **0** |
| 4 | Healthcheck: +`djve` (5d), +`compras` (14d) y +3 checks de matview-refrescada (matview vs base) | `scripts/healthcheck-frescura.mjs` | corrido con datos reales: 15 checks, todos ✓, exit 0 |
| 5 | Migración-baseline idempotente del DDL vivo de las 5 tablas heredadas (versiona lo que existe; no-op sobre esta base) | `00000000000000_baseline_tablas_heredadas.sql` (repo, NO re-aplicada) | `CREATE ... IF NOT EXISTS` + guards en DO blocks |
| 6 | `campana_ini_year` → `SET search_path = public` | `20260721033455_...` (aplicada) | `proconfig` = `{search_path=public}` |
| 7 | Creado `profiles_approved_by_idx`; dropeado `idx_lineup_port` (muerto) | `20260721033455_...` (aplicada) | `pg_indexes`: nuevo=1, viejo=0 |
| 9 | Clampeado a 0 el único `saldo_a_fijar_tn` negativo | `20260721033519_...` (aplicada) | `count(*) where saldo_a_fijar_tn<0` = **0** |

**Aprobado pero PENDIENTE de más definición (#2 — cierre de visibilidad):** ver nota abajo.
**Aprobado y dejado como está (Duda 3):** `calendario_informes` se conserva como base futura (ítem 21/MP4).

### Nota sobre el hallazgo #2 (cierre de RLS) → **DIFERIDO a E5** (decisión de Lautaro, 21/07/2026)

Lautaro aprobó primero "cerrar ya por RLS" el `lineup` + las 4 matviews de mesa. Al ir a implementarlo
apareció un **acoplamiento que impide el revoke directo**: las páginas de mesa (`/comercio/temperatura`,
`/empresas`, `/puertos`, `/negociado`) leen esos objetos **con la anon key server-side**
(`src/lib/supabase.ts` usa `SUPABASE_ANON_KEY`; ver `lineup/temperatura.ts:148-150`, `foto.ts:86`,
`empresas.ts:85-88`, `compras/negociado.ts:101`), NO con el JWT del usuario logueado. Revocar el acceso
anon **rompería esas páginas para todos, incluido admin**.

Presentada la evidencia, **Lautaro decidió diferirlo al encendido del login (E5)**: cuando `AUTH_ENFORCED`
se prenda y el data-layer de mesa pase a leer con el JWT del usuario (policies `is_admin()`/authenticated),
el cierre es natural y no rompe nada. Hoy no hay urgencia porque un anónimo igual no ve `/comercio/*` en la
web. **No se aplicó ningún cambio de RLS en E1.** → queda anotado para **E5** (ver «Para otras etapas»).

---

## Anexo A — DDL vivo de las 5 tablas heredadas (insumo del baseline, hallazgo #5)

> Dumpeado de la base viva el 21/07/2026. Es la referencia para la migración-baseline propuesta
> (`CREATE TABLE IF NOT EXISTS` + índices + RLS + policies, marcada como ya-aplicada). RLS habilitada en
> las 5; policy de lectura `qual=true` para `anon`/`public` (ver hallazgo #2).

### `lineup` (509.555 filas · PK `id` bigint serial)
- **Cols:** `id`, `fecha_consulta date`, `port text`, `berth text?`, `vessel text`, `ops text?`, `cat text?`,
  `cargo text?`, `quantity int4?`, `dest_orig text?`, `area text?`, `shipper text?`, `eta date?`, `etb date?`,
  `ets date?`, `remarks text?`, `es_agro bool default false`, `created_at timestamptz default now()`.
- **Unique:** `lineup_unique_row NULLS NOT DISTINCT (fecha_consulta, port, berth, vessel, cargo, quantity,
  eta, dest_orig, shipper, ops)`.
- **Índices:** `idx_lineup_fecha(fecha_consulta)`, `idx_lineup_cargo`, `idx_lineup_esagro`,
  `idx_lineup_shipper`, `idx_lineup_port` *(sin uso — hallazgo #7)*.
- **Policy:** `anon_select_lineup` SELECT anon `true`.

### `djve` (334.270 filas · PK `id` bigint serial)
- **Cols:** `id`, `anio int4`, `nro_djve text?`, `fecha_registro date?`, `fecha_presentacion date?`,
  `producto text?`, `toneladas numeric?`, `fecha_inicio_embarque date?`, `fecha_fin_embarque date?`,
  `opcion text?`, `razon_social text?`, `codigo_interno text?`, `actualizado_en timestamptz default now()`,
  `cosecha text?` *(era ROE)*.
- **Unique:** `idx_djve_unique_nro (anio, nro_djve)`. **Índices:** `idx_djve_anio`, `idx_djve_codigo`,
  `idx_djve_fecha_registro`.
- **Policy:** `anon_select_djve` SELECT anon `true`. `codigo_interno` null en 169.514 filas (pre-2018).

### `compras` (9.523 filas · PK `id` bigint serial)
- **Cols:** `id`, `fecha date`, `grano_raw text?`, `codigo_interno text`, `campana text`, `sector text`,
  `toneladas float8 default 0?`, `toneladas_a_fijar float8?`, `precio_promedio_usd float8?`,
  `porcentaje_cosecha float8?`, `actualizado_en timestamptz default now()?`, `semanal_tn float8?`,
  `precio_hecho_tn float8?`, `fijado_tn float8?`, `saldo_a_fijar_tn float8?`, `djve_tn float8?`,
  `fuente text?` (MAGYP/AGROCHAT/LEGACY). **⚠ montos en float8** → migrar a `numeric` (Para E4).
- **Unique:** `compras_campana_codigo_interno_sector_fecha_key (campana, codigo_interno, sector, fecha)`.
  **Índice:** `compras_codigo_campana_idx (codigo_interno, campana)`.
- **Policy:** `compras lectura publica` SELECT public `true`. **Sin creación versionada en ningún lado.**

### `pizarra_historico` (7.923 filas · PK `(grano, fecha)`)
- **Cols:** `grano text`, `fecha date`, `precio_ars numeric?`, `precio_usd numeric?`,
  `es_estimativo bool default false`, `actualizado_en timestamptz default now()`.
- **Índice:** `pizarra_historico_fecha_idx (fecha DESC)`. **Policy:** SELECT public `true`.
- Nota: girasol 74% y sorgo 57% de filas `es_estimativo=true` (CAC no publica pizarra diaria de esos granos)
  — no es un defecto, es cómo llega la fuente; documentar para E2/E3.

### `cbot_cierres` (29.026 filas · PK `(symbol, fecha)`)
- **Cols:** `symbol text`, `fecha date`, `root text?`, `grano text?`, `posicion text?`, `mes date?`,
  `vencimiento date?`, `settlement_cents numeric?`, `settlement_usd_tn numeric?`, `open/high/low_cents
  numeric?`, `volume int8?`, `open_interest int8?`, `actualizado_en timestamptz default now()`.
- **Índices:** `cbot_cierres_fecha_idx (fecha DESC)`, `cbot_cierres_grano_fecha_idx (grano, fecha DESC)`.
- **Policy:** `anon read cbot_cierres` SELECT public `true`.

## Anexo B — Frescura al 21/07/2026 (hallazgo #4)

| Tabla | Última fecha | Días | Cadencia | ¿Healthcheck? |
|---|---|---|---|---|
| futuros_cierres | 2026-07-20 | 1 | diaria hábil | ✅ (7d) |
| cbot_cierres | 2026-07-17 | 4 | diaria hábil T-1 | ✅ (7d) — falta el lunes 20/07, vigilar |
| pizarra_historico | 2026-07-17 | 4 | diaria hábil | ✅ (7d) — falta el lunes 20/07, vigilar |
| lineup | 2026-07-16 | 5 | 2/día (guarda 1 fecha) | ✅ (7d) — al borde |
| djve | 2026-07-16 | 5 | diaria | ❌ **no cubierto** |
| compras | 2026-07-08 | 13 | semanal | ❌ **no cubierto** |
| noticias | 2026-07-20 23:50 | <1 | horaria | ✅ (2d) — 104 filas con `fecha_pub` null |
| estimaciones (USDA/CONAB/BCR/DEA) | 07-10 / 06-15 / 07-08 / 07-13 | — | por informe | ✅ por organismo |
| **matviews** (compras_avance, lineup_gap/densidad/visitas) | frescas vs base | — | por refresh | ❌ **no cubierto** |

> Varias series diarias no tienen el lunes 20/07 al momento de la auditoría (puede ser cron aún no corrido
> hoy, no necesariamente un freeze). Se cruza con E5 (runs de Actions).

