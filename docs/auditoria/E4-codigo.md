# Auditoría E4 — Código y arquitectura (2026-07-21)

- **Rama:** `claude/auditoria-e4-codigo-p28mxd` · **PR:** #_ (base `main`, draft hasta el OK)
- **Alcance:** los 4 puntos del PROMPT E4 de [`PLAN_AUDITORIA.md`](../PLAN_AUDITORIA.md): duplicación
  (espejos lib↔script/SQL/env, parsers de mes/posición, `fmtFecha`/user-agent), estructura
  (`market.ts`, `sample.ts`, `globals.css`, código muerto), tests (propuesta Vitest sobre las libs
  puras + fixtures de E2) y calidad (`noUncheckedIndexedAccess`, degradación/Result, fetches ISR,
  bundles, `server-only`, `package.json`). Incorpora además lo que E1 y E2 dejaron marcado
  explícitamente «Para E4» (ver sección homónima de cada informe).
- **Cómo se verificó:** lectura completa de cada archivo señalado + `grep`/`git log`/`git blame` para
  confirmar divergencias reales (no solo teóricas) + una corrida real de `npx tsc --noEmit` con
  `noUncheckedIndexedAccess:true` sobre un tsconfig temporal fuera del repo + `npm run build` leyendo
  `.next/diagnostics/route-bundle-stats.json` (Next 16/Turbopack ya no imprime la tabla de bundles en
  consola). Cuatro sub-auditorías en paralelo (duplicación · estructura/código muerto · tests/fixtures
  · calidad/perf), cada una con evidencia archivo:línea. No se modificó ni una línea de código (fase 1).
  `git diff` sobre `tsconfig.json` real: limpio.

## Resumen ejecutivo

El código está en **buen estado general**: cero dependencias sin uso, `server-only` bien aplicado
donde corresponde, degradación uniforme (patrón `Result`/`Meta`/`FuenteStatus`) en prácticamente todas
las libs de datos (solo 2 `throw` sueltos en todo `src/lib/`, y ninguno en una página pública), cero
casos de N+1 contra PostgREST, y `globals.css` —pese a ser grande— está razonablemente organizado (20
secciones con headers, naming por prefijo consistente, solo 3 de ~500 clases confirmadas muertas).

Lo que sí apareció, y es el corazón de esta etapa: **varios espejos manuales lib↔script/SQL/env que ya
divergieron en el pasado o divergen HOY mismo** — el más grave, `compras/parse-agrochat.ts` ↔
`scripts/cargar-compras.mjs`, ya causó un bug real en producción (el fix ÷1000 del 20/07 hubo que
aplicarlo a mano en los dos lados) y tiene una divergencia activa nueva (`fechaISO()` con fallback
ISO en un lado, no en el otro). `lineup/campanas.ts` ↔ la función SQL `campana_ini_year` **ya
divergen** (SOJA_CRUSH solo en TS). Hay además ~9 archivos con variantes del parser de mes/posición A3,
un módulo `market.ts` de 546 líneas con 8 responsabilidades mezcladas, un hallazgo de performance
concreto y accionable (todas las páginas públicas mandan el SDK completo de Supabase al bundle del
cliente por un import estático de `AuthMenu`, ~235 KB sin usar mientras el login está apagado), y CERO
tests pese a tener 12+ libs puras diseñadas para testear y 45 fichas numéricas de E2 listas como
fixtures.

Nada de esto es urgente en el sentido de "está roto hoy" — son riesgos de mantenibilidad y un
único hallazgo de perf real. Priorizados por impacto×esfuerzo abajo.

## Hallazgos (priorizados, el más grave primero)

> La columna **Decisión** la completa Lautaro: `corregir` / `no` / `diferir a E7` / `preguntar más`.

| # | Hallazgo | Evidencia | Impacto | Esfuerzo | Propuesta de fix | Decisión Lautaro |
|---|---|---|---|---|---|---|
| 1 | **Todas las páginas públicas mandan el SDK completo de `@supabase/supabase-js` (~235 KB sin comprimir) al bundle del cliente**, aunque `AUTH_ENFORCED` esté apagado y nadie use login. Causa: `site-header.tsx:6` importa `AuthMenu` (client component) de forma **estática** a nivel de módulo; el `{AUTH_ENFORCED && <AuthMenu/>}` de la línea 43 es condicional en runtime pero el *import* no lo es, así que Next lo incluye igual en el grafo de todas las páginas de `(site)`. | `npm run build` real: chunk `42tky_sr7ut4m.js` (241,4 KB) presente en TODAS las rutas públicas (`/comercio` 783 KB, `/dolar` 769 KB, `/noticias` 769 KB…); confirmado por strings del chunk (`socketAdapter`, `WebSocket not available`, GoTrue) = SDK completo, no solo Auth. | **medio-alto** (perf percibida en TODO el sitio, mesa y clientes por igual) | S | `next/dynamic(() => import("./auth-menu"), { ssr: false })` en `site-header.tsx`. | corregir — HECHO |
| 2 | **`scripts/cargar-compras.mjs` reimplementa (no importa) `compras/parse-agrochat.ts` y ya divergió una vez en producción**: el commit `6528079` (20/07) tuvo que arreglar el mismo bug de `num()` con floats (`64099.99999999999→6,4e15`) A MANO en los DOS lados. Hoy hay una divergencia NUEVA activa: `parse-agrochat.ts:97-103` (`fechaISO`) acepta fechas ya en formato ISO como fallback; `cargar-compras.mjs:74-77` no — la misma fila pasaría por el uploader web y fallaría silenciosamente (descartada) por el cargador `.mjs`. Verificado que `parseAgrochat()` SÍ es importable directo desde Node puro (probado, sin bloqueos: no usa `server-only` ni imports JSON crudos). | `git log` commit `6528079` · `src/lib/compras/parse-agrochat.ts:97-103` vs `scripts/cargar-compras.mjs:74-77` (comparados línea a línea) | **alto** (ya rompió datos reales una vez; mesa) | M | `cargar-compras.mjs` importa `parseAgrochat`/`claveFila` de `../src/lib/compras/parse-agrochat.ts` en vez de reimplementar `num`/`fechaISO`/`campaniaLarga`/`aFilaDB`/`GRANO_A_CODIGO`/`SECTOR_A_NORM`; el script queda solo con el `main()` de I/O. Revisar shape de `FilaCompra` (el mjs no tiene `precio_promedio_usd`/`porcentaje_cosecha`). | corregir — HECHO |
| 3 | **`lineup/campanas.ts` (TS) y la función SQL `campana_ini_year` YA divergen**: `campanas.ts:14` incluye `SOJA_CRUSH: 4` en `CAMPANA_CONFIG`; la función SQL (`supabase/migrations/20260719120000_create_comercio_empresas.sql:13`) no lo tiene → cae al `else` (año calendario sin ajuste estacional). Sin efecto hoy porque `SOJA_CRUSH` es sintético (solo TS, nunca se pasa como `cod` a una vista SQL — verificado con grep, 0 apariciones en migraciones), pero es la trampa exacta que produce un bug silencioso si una vista SQL futura empieza a usarlo. | `src/lib/lineup/campanas.ts:14` vs `supabase/migrations/20260719120000_create_comercio_empresas.sql:10-18` | **bajo hoy / medio si se usa** (mesa) | S (agregar `SOJA_CRUSH` a la SQL o comentar por qué se omite) / M (test de paridad automatizado, ver sección Tests) | | corregir — HECHO (quick win: SOJA_CRUSH agregado a la SQL) |
| 4 | **`ADMIN_SEED_EMAILS` (`auth/config.ts:19`) y el email hardcodeado en `handle_new_user()` (`supabase/migrations/20260716120000_create_auth_base.sql:86`) son el mismo dato en dos lenguajes, sin ningún mecanismo que avise si divergen.** Si se agrega un admin nuevo (ej. Mauro) en un solo lado, un usuario se registra y NO queda auto-aprobado como admin — bug de permisos silencioso. | `src/lib/auth/config.ts:19` vs `supabase/migrations/20260716120000_create_auth_base.sql:86` (comentario cruzado existe en ambos lados, pero sin verificación automática) | **medio** (seguridad/permisos) | S | Agregar una función SQL auxiliar de 1 línea que exponga el array embebido de `handle_new_user` (consultable desde afuera), y un script chico que la compare contra `ADMIN_SEED_EMAILS` antes de cada cambio de admins. | corregir — HECHO |
| 5 | **`noticias-clasificar.ts` está reimplementada función por función dentro de `ingest-noticias.mjs`** (solo el JSON de reglas `noticias-reglas.json` está compartido vía import). Riesgo: si se ajusta una regla de clasificación en un lado y no en el otro, el portal web clasifica distinto de lo que el cron guarda en la tabla `noticias` — sin re-clasificación retroactiva, queda inconsistente para siempre. Verificado que Node 22 (motor real del repo) puede importar el `.ts` directo, con un solo bloqueo puntual: falta `with { type: "json" }` en `noticias-clasificar.ts:1`. | `src/lib/noticias-clasificar.ts:1-95` vs `scripts/ingest-noticias.mjs:95-141` (bloque marcado explícitamente "espejo de...") | **medio** (contenido publicado) | S-M | Agregar `with { type: "json" }` al import JSON (inocuo para Next) + hacer que `ingest-noticias.mjs` importe `clasificarStrict`/`esRuido`/`esExcluido`/`esRelevante`/`clasificar` en vez de reimplementarlas. | corregir — HECHO |
| 6 | **`arNum()` en `pizarra.ts` no valida NaN** (a diferencia de la versión null-safe de `capacidad.ts`): `pizarra.ts:32-34` devuelve `Number(...)` sin `Number.isFinite`, y el tipo `PizarraGrano.usd: number` no admite null. Si CAC cambia el formato del HTML y el regex de `parseGrano` captura basura, un `NaN` puede propagarse visible a la UI de pizarra/arbitrajes. | `src/lib/pizarra.ts:32-34` vs `src/lib/capacidad.ts:36-39` (null-safe) | **medio** (robustez, visible al usuario si pasa) | S | Unificar a la versión null-safe; ajustar el tipo `PizarraGrano.usd`/`ars` a `number \| null` si corresponde (revisar call-sites: `capacidad-panel.tsx`, paneles de arbitrajes). | corregir — HECHO |
| 7 | **`compras.*` guarda montos en `double precision` (float)** mientras `futuros_cierres`/`pizarra_historico`/`cbot_cierres`/`djve` usan `numeric` — el float fue la causa raíz de los parseos rotos (6,4e15) del 20/07 (hallazgo cruzado, marcado «Para E4» por E1). | `docs/auditoria/E1-datos.md` Anexo A (`compras`: `toneladas float8`, etc.) | **medio** (integridad de datos, ya causó 1 incidente) | M (migración `ALTER COLUMN ... TYPE numeric` + verificar que ningún consumidor dependa de semántica float) | Migrar las columnas de monto de `compras` a `numeric`. | corregir — HECHO (migrar ahora) |
| 8 | **El upload de compras (`/admin/datos`) puede propagar una excepción sin capturar** si el `.xlsx` tiene un ZIP central-directory corrupto: `parseAgrochat()` → `unzip()` hace `throw` (`parse-agrochat.ts:215,220`) y `admin/datos/actions.ts:54` la llama sin try/catch dentro de la server action `procesarCarga()`. Rompe el patrón "nunca throw, siempre degrada" que sigue el resto del repo (solo 2 throws en todo `src/lib/`, ambos acá). | `src/lib/compras/parse-agrochat.ts:215,220` · `src/app/admin/datos/actions.ts:54` (sin try/catch) | **bajo-medio** (herramienta de un solo admin, no página pública) | S | Envolver la llamada a `parseAgrochat` en try/catch dentro de `procesarCarga()`, devolver `{error}` en vez de dejar subir la excepción. | corregir — HECHO |
| 9 | **`src/lib/auth/session.ts` (usado por `proxy.ts` en CADA request) es la única lib de I/O del repo sin el patrón Result/degradación**: 3 llamadas a Supabase Auth sin try/catch (`getUser()` línea 51-53, `getSession()` línea 122-124, `.rpc("tocar_sesion",…)` línea 131 — el único try/catch de la función envuelve solo el insert de auditoría). Hoy solo corre para `/admin/*` (bajo tráfico); si se prende `AUTH_ENFORCED` corre en TODO el sitio. | `src/lib/auth/session.ts:51-53,122-124,131` | **bajo hoy / alto si se enciende `AUTH_ENFORCED`** | S | Envolver las 3 llamadas con try/catch defensivo, siguiendo el mismo patrón `Result` que el resto del repo. | corregir — HECHO |
| 10 | **`market.ts` monolítico**: 546 líneas, 8 responsabilidades mezcladas (HTTP genérico, fuentes crudas de terceros, parsing de tickers, cinta, dólar futuro, dólar linked, volumen cambiario, LECAPs). Trae 3 notas "Fase B" sin resolver (parser de tickers a extraer, líneas 185, 195, 388) + LECAPs "parcial: TIR pendiente" (línea 542-543). 11 archivos importan de `market.ts` hoy; ninguno importa `getMaeOficial` (exportada pero de uso 100% interno). | `src/lib/market.ts` completo; TODOs en líneas 185, 195, 260, 388 | **bajo-medio** (mantenibilidad) | M | Partir en `src/lib/market/{http,types,tickers,fuentes,cinta,dolar-futuro,dolar-linked,volumen,lecaps}.ts`, con `market.ts` como fachada (re-export) para no tocar los 11 imports existentes. Ver detalle §A abajo. | diferir a E7 |
| 11 | **9 archivos con variantes del dict/array de meses ENE-DIC + 3 implementaciones casi idénticas de `vencKey`/`mesDePosicion`/`vtoDePosicion`**: `curva.ts`, `futuros.ts`, `derivadas.ts` (regex de parseo de posición) + `market.ts`, `lineup/embarque.ts`, `graficos-client.tsx`, `periodo-panel.tsx`, `calc-fijar.tsx`, `compras/negociado-chart.tsx` (arrays literales ENE..DIC). `curva.ts`/`futuros.ts` tienen `vencKey`/`hoyVencKey` literalmente pegados dos veces (verificado con `diff`, 0 diferencias salvo un comentario). E2 ya verificó que hoy NO divergen en comportamiento (39 casos de paridad), pero cualquier fix futuro (ej. el caso borde "DIS24" de `futuros.ts:53`) exige acordarse de tocar 3-9 lugares. | Ver detalle completo §B abajo (tabla archivo:línea) | **medio** (mantenibilidad — no hay bug hoy) | M | Extender `src/lib/dates.ts` (ya existe, ya es el lugar de fechas puras) con `MESES_ES`, `mesIndice`, `parsePosicion`, `vencKeyDePosicion`, `vtoDePosicion`, `posicionDeFecha`, `hoyVencKey`; migrar los 9 call-sites. `MONTH_LETTER` (bonos AR) y `EN2ES`/`EN_IDX` de `monitor-mercados.ts` (meses en inglés de Yahoo) quedan FUERA — resuelven un problema de codificación distinto. | diferir a E7 |
| 12 | **CERO tests en el repo** (CI solo corre lint+tsc+build). 12 libs puras ya diseñadas para testear (11 del encargo + `porcentaje.ts`, que quedó afuera de la lista pero tiene ficha de E2 lista) y `estrategias.ts`/`costos.ts`/`campanas.ts` como candidatas de una segunda tanda. 10/11 libs de la lista original ya tienen ficha directa en `E2-formulas-fichas.md` (12 fichas cubren esas 10); solo `compras/parse-agrochat.ts` no tiene ninguna (necesita casos armados a mano). Propuesta completa y ejemplos de test en la sección dedicada §C abajo. | `docs/auditoria/E2-formulas-fichas.md` (603 líneas, 45 fichas) · `.github/workflows/ci.yml` (sin paso de test) | **alto** (robustez — protege las fórmulas de E2 contra regresiones futuras) | M (fase 2: Vitest + ~14 archivos `*.test.ts` con los fixtures ya escritos en E2) | Vitest + `vitest.config.ts` + paso nuevo en `ci.yml` entre `typecheck` y `build`. Detalle §C. | corregir — HECHO (tanda completa) |
| 13 | **`tsconfig.json` sin `noUncheckedIndexedAccess`: prenderlo cuesta 152 errores reales en 32 archivos**, concentrados: 55 de los 152 en solo 3 archivos (`calendario.ts` 25, `graficos-client.tsx` 14, `evolucion-chart.tsx` 14). El resto (97 errores) disperso en 29 archivos más, 1-5 c/u. Corrida real confirmada (`npx tsc --noEmit` con la flag prendida en un tsconfig temporal fuera del repo; `tsconfig.json` real quedó sin tocar). | Corrida real de `tsc`; lista completa de 32 archivos con conteo en la transcripción del sub-auditor (disponible on-demand) | **medio** (atrapa bugs reales de índice — típicamente `.match()[1]`, `arr[i]` sin chequeo) | L (atacar los 3 concentrados primero acota ~1/3 del esfuerzo; el resto es trabajo disperso archivo por archivo) | Prender la flag y sanear en 2 tandas: (1) los 3 archivos concentrados, (2) el resto. | diferir a E7 |
| 14 | **Motor de gráfico SVG con crosshair interactivo triplicado**: `evolucion-chart.tsx`, `compras/negociado-chart.tsx`, `dolar-futuro-chart.tsx` reimplementan cada uno desde cero las mismas constantes de tamaño/padding, funciones de escala X/Y, generación de `yTicks`, el algoritmo de "punto más cercano" para el crosshair (`onPointerMove`/`onPointerLeave`), y el tooltip posicionado por %. `ChartMarca` (el watermark) SÍ está deduplicado — el motor de charting no. Sin evidencia de que hayan divergido en comportamiento (solo en features: gradiente de área, tabla de datos) — riesgo es de mantenimiento futuro (cada bugfix de interacción hay que aplicarlo 3 veces). | `src/components/evolucion-chart.tsx:10-14,102-123,158-179` vs `negociado-chart.tsx:17-19,72` vs `dolar-futuro-chart.tsx:9-13,27-51,82-106` | **bajo-medio** (mantenibilidad UI) | L | Extraer hook `useCrosshair(puntos,W,H,pad)` + componente base `SvgLineChartBase` parametrizado. No toca `spread-chart.tsx` (usa `recharts`, patrón distinto). | diferir a E7 |
| 15 | **`sample.ts` (57 líneas, 1 solo consumidor: `implicitas-panel.tsx`) — RESUELTO por E3.** Estaba bloqueado por la decisión de E3 sobre `implicitas-panel.tsx`; la fase 2 de E3 (PR #57, mergeado) sacó la serie "Granos (ej.)" del panel y quitó el `noindex` global. Al mergear ambas ramas, `sample.ts` quedó con **0 importadores** en todo el repo → borrado en esta misma sesión. | `src/components/implicitas-panel.tsx` (ya sin import de sample.ts, post-E3) · `git log` del merge de E4 con `main` (post PR #57) | **medio** (SEO/imagen — cruzaba con E3) | S | Borrado (`src/lib/sample.ts` eliminado). | corregir — HECHO (tras el merge con E3) |
| 16 | **`calc-negocios-pago.tsx:37` reimplementa inline la fórmula exacta de `precioConPago()`** (`diferido.ts:29-32`: `diferido / (1 + tasaPct/100 × dias/365)`) en vez de importarla — verificado carácter a carácter, misma fórmula. `calc-planta.tsx` es la ÚNICA calculadora con su fórmula de descuento (6 rubros) inline en el componente en vez de en una lib — tiene su propio `num()`/`n0()` locales también. (Hallazgo cruzado, marcado «Para E4» por E2.) | `src/components/calc-negocios-pago.tsx:37` vs `src/lib/diferido.ts:29-32` · `src/components/calc-planta.tsx:22-30,84+` (sin `src/lib/planta.ts`) | **bajo** (mantenibilidad — mismo resultado hoy) | S | `calc-negocios-pago.tsx` importa `precioConPago` de `@/lib/diferido`. Extraer la fórmula de 6 rubros de `calc-planta.tsx` a `src/lib/planta.ts` (nueva lib pura, testeable). | corregir — HECHO |
| 17 | **7 componentes calculadora repiten `num()` (parseo coma decimal) byte a byte; 5 repiten `fmtInput()`** (`d.toISOString().slice(0,10)`); `calc-diferido.tsx:39-46` reimplementa `hoyCordoba()` en vez de importarla de `habiles.ts` (que ya exporta esa función — `calc-negocios-pago.tsx` sí la importa bien). `overrides()` (leer JSON de una env var) duplicado en `capacidad.ts:41-48` y `pizarra.ts:47-54`. | `calc-arbitraje.tsx`, `calc-diferido.tsx`, `calc-fijar.tsx`, `calc-negocios-pago.tsx`, `calc-pases.tsx`, `calc-planta.tsx`, `calc-porcentaje.tsx` (todas con `num()`); `calc-diferido.tsx:39-46` | **bajo** | S | `numDeInput()`/`fmtInput()` a `src/lib/format.ts` (ya existe, ya tiene `nfmt`/`pfmt`); borrar el `hoyCordoba()` local; `leerOverrideEnv(envVar)` compartida. | corregir — HECHO |
| 18 | **`empresaDisplay()` diverge en el fallback de empresa no canónica**: `lineup/empresas.ts:70-73` usa `"OTROS"`, `lineup/foto.ts:74-77` usa `"—"` — misma `canonShipper()` compartida, solo el wrapper de display diverge. Inconsistencia de UX visible hoy entre `/comercio/empresas` y `/comercio/puertos` (mesa). | `src/lib/lineup/empresas.ts:70-73` vs `src/lib/lineup/foto.ts:74-77` | **bajo** (UX, mesa) | S | Unificar el texto de fallback (decidir uno), mantener el wrapper fino por shape de retorno distinto. | corregir — HECHO ("OTROS" en las 2 páginas) |
| 19 | **`fmtFecha` con el mismo nombre en `auth/admin.ts:140-152` y `habiles.ts:77-85` hace cosas distintas** (firma string vs Date, timezone Córdoba vs UTC, con/sin día de semana) — no es bug (son funciones genuinamente distintas, firmas de TS distintas evitan mezclarlas por error), pero confunde al leer. Igual para el parser de user-agent: mismo patrón de regex repetido entre `auth/admin.ts:155-177` y `auth/session-id.ts:35-51` — separados por una razón arquitectónica real (`session-id.ts` no puede importar `server-only` porque lo usa el proxy), pero la parte pura del regex es extraíble sin romper esa restricción. | `src/lib/auth/admin.ts:140-152,155-177` vs `src/lib/habiles.ts:77-85` vs `src/lib/auth/session-id.ts:35-51` | **bajo** (legibilidad) | S | Renombrar uno de los dos `fmtFecha` (ej. `fmtFechaAdmin`). Extraer `navegadorYSO(ua)` puro a `session-id.ts`, que `admin.ts` reusa. | corregir — HECHO |
| 20 | **Factores ¢/bu→USD/tn duplicados** entre `monitor-mercados.ts:58-62` e `ingest-cbot.mjs:34-36` — verificados idénticos carácter a carácter por E2, sin protección contra divergencia futura (`monitor-mercados.ts` no es Node-puro-importable por `server-only`+`react cache`, así que el fix es extraer SOLO las 4-5 constantes a un módulo sin dependencias). | `src/lib/monitor-mercados.ts:58-62` vs `scripts/ingest-cbot.mjs:34-36` | **bajo** | S | Nuevo `src/lib/factores-commodities.ts` (sin `server-only`, sin `react`) con las constantes; ambos lados lo importan. | corregir — HECHO |
| 21 | **`sumarHabiles(desde, n)` sin clamp de `n`**: con un `n` gigante (bug de UI o input malicioso) el `while` corre sin límite y cuelga el tab. (Hallazgo cruzado, marcado «Para E4» por E2.) `FERIADOS_AR` tiene una entrada redundante: `"2027-06-20"` es domingo (ya excluido por `esFinde`) — limpieza cosmética cuando Lautaro valide la lista 2027. `costos.ts:costoFila()` no guarda contra `dias` negativos (una comisión TNA con `dias<0` da una comisión % negativa sin guard). | `src/lib/habiles.ts:54-62` · `src/lib/habiles.ts:20` (`"2027-06-20"`) · `src/lib/costos.ts:56-68` | **bajo** (robustez de bordes) | S | Clamp de `n` (ej. `Math.min(n, 3650)` o validar en el caller); limpiar la fecha redundante cuando Lautaro confirme 2027; guard `dias >= 0` en `costoFila`. | corregir — HECHO |
| 22 | **6 funciones/constantes exportadas de `src/lib` sin ningún uso en todo el repo** (`tieneSenalGranos`, `CONGESTION_TN_SEMANA`, `HORIZONTE_CALOR_DIAS`, `construirVista`, `getA3MarketData`, `difDias`) + **3 clases CSS confirmadas muertas** de ~500 (`.gx-presets`, `.st-real`, `.st-ejemplo` — reemplazadas por versiones nuevas, verificado 0 matches en todo `src/`). `globals.css` por lo demás está bien organizado (20 secciones con headers, naming por prefijo consistente) — **no** se recomienda migración a Tailwind (instalado pero 0% usado en JSX, confirmado). | `src/lib/noticias-clasificar.ts:48` · `lineup/cobertura.ts:12` · `lineup/mesa_calor.ts:28` · `estimaciones.ts:344` · `a3.ts:77` · `derivadas.ts:26` · `globals.css:669,408,412` | **bajo** | S | Borrar las 6 funciones/constantes y las 3 clases CSS. Mantener el criterio actual (sección + prefijo por módulo) para CSS nuevo. | corregir — HECHO |
| 23 | **6 subpáginas de `/comercio` (puertos, embarques, empresas, temperatura, senal, negociado) son dinámicas, no ISR**, porque `requireAdmin()` llama `cookies()` siempre (no gateado por `AUTH_ENFORCED` como `requireSeccion`) — cada visita repite la query a Supabase sin caché entre requests. Es una decisión de producto correcta hoy (documentada en el propio código, `puertos/page.tsx:6-9`), no un bug — se anota para que quede explícito y se revierta solo si esas páginas se abren a clientes. | `src/app/(site)/comercio/puertos/page.tsx:6-9,18` (y análogas) | **ninguno** (nota, no fix) | — | Documentar explícitamente; revisar cuando/si esas páginas cambien a `requireSeccion`. | no (solo nota, sin fix) |

## §A — Detalle: partición propuesta de `market.ts`

```
src/lib/market/
  http.ts       — fetchJson, FetchResult, REVALIDATE, asNum/asStr/asObj/asArr (privados)
  types.ts      — Meta, FuenteStatus (compartidos, hoy importados por 3 componentes por nombre)
  tickers.ts    — parseDdf, MESES, MONTH_LETTER, vencFromTicker   ← resuelve las 3 notas "Fase B"
  fuentes.ts    — getDolarApi, getCriptoya, getMaeResumen, getNotes, getMaeOficial (uso 100% interno)
  cinta.ts      — getCintaData, CintaItem, CintaData
  dolar-futuro.ts   — getDolarFuturo, DFPosicion, DolarFuturoData
  dolar-linked.ts   — getDolarLinked, DLBono, DolarLinkedData
  volumen.ts    — getVolumenCambiario, VolCat, VolumenData
  lecaps.ts     — getLecaps, Lecap, LecapsData   ← nota "TIR pendiente" queda documentada acá

src/lib/market.ts  — queda como FACHADA: re-exporta getCintaData, getDolarFuturo, getDolarLinked,
                     getVolumenCambiario, getLecaps, CintaData, Meta, FuenteStatus.
                     NO re-exporta getMaeOficial (uso interno). Los 11 imports existentes de
                     "@/lib/market" no se tocan (mismo path, mismos nombres).
```

## §B — Detalle: los 9 archivos con variantes de mes/posición A3

| Archivo:línea | Nombre | Forma | Relación |
|---|---|---|---|
| `curva.ts:22-25`, `futuros.ts:48-51` | `MESES` | dict ENE→1..DIC→12 | idénticos byte a byte |
| `curva.ts:39-43`, `futuros.ts:54-61` | `vencKey` | regex → aaaamm | casi idénticos (firma admite `null` en uno) |
| `curva.ts:46-55`, `futuros.ts:68-77` | `hoyVencKey` | Intl.DateTimeFormat Córdoba | idénticos byte a byte |
| `derivadas.ts:20-23` | `MESES3` | mismo dict, otro nombre | contenido idéntico |
| `derivadas.ts:33-37` | `mesDePosicion` | regex → solo el mes | variante reducida de `vencKey` |
| `market.ts:187` | `MESES` (array, no dict) | usado en `parseDdf` | mismo contenido, estructura distinta |
| `lineup/embarque.ts:31` | `MES_ABREV` | array idéntico a `market.ts:187` | dirección inversa (Date→"JUL26") |
| `graficos-client.tsx:21`, `periodo-panel.tsx:16`, `calc-fijar.tsx:25`, `compras/negociado-chart.tsx:23` | `MESES` (array) | idéntico contenido | 4 componentes más |

`MONTH_LETTER` (`market.ts:384-386`, letra única para tickers de bonos AR) y `EN2ES`/`EN_IDX`
(`monitor-mercados.ts:89-92`, meses en inglés de Yahoo) son familia relacionada pero **no** duplicados
literales — quedan fuera de la unificación.

## §C — Detalle: propuesta de tests (Vitest)

**Las 11 libs del encargo + `porcentaje.ts` (12 en total) son puras** (función de sus inputs, sin
fetch/DB/FS async). Único punto con reloj de pared: `habiles.ts:hoyCordoba()` (llama `new Date()`
directo) — se testea con `vi.setSystemTime()`. Segunda tanda candidata, también pura y con fichas de
E2 listas: `costos.ts`, `estrategias.ts`, `lineup/campanas.ts`.

**Mapa lib → fichas de `E2-formulas-fichas.md`** (10/11 de la lista original tienen ficha directa):

| Lib | Fichas E2 |
|---|---|
| `derivadas.ts` | 6.4 + ficha transversal "6 parsers" |
| `estimaciones.ts` | 6.2 |
| `compras/parse-agrochat.ts` | **ninguna — necesita casos armados a mano** |
| `lineup/mesa_calor.ts` | 5.4 |
| `lineup/estacional.ts` | 5.3 |
| `fijar.ts` | 1.2 (+ actualización FASE 2) |
| `diferido.ts` | 1.4 |
| `arbitraje.ts` | 1.7 (+ actualización FASE 2) |
| `pases.ts` | 1.6 |
| `calendario.ts` | 6.3 |
| `habiles.ts` | 6.7 |
| `noticias-clasificar.ts` | 6.5 |
| `porcentaje.ts` (extra) | 1.3 |

**Estructura propuesta** (sin implementar en fase 1):
- Un `*.test.ts` al lado de cada lib (`src/lib/derivadas.test.ts`, `src/lib/lineup/mesa_calor.test.ts`,
  etc.) — no hay convención previa en el repo, se elige colocalización sobre carpeta centralizada.
- `vitest.config.ts` nuevo en la raíz: `environment:"node"` (las 12 libs no tocan el DOM), alias `@/*`
  desde ya (la 2ª tanda lo va a necesitar).
- `package.json`: `"vitest": "^3"`, `"@vitest/coverage-v8": "^3"` (opcional), scripts `test`/`test:watch`.
- `.github/workflows/ci.yml`: insertar `- run: npm test` entre `typecheck` y `build`.

**Espejos — viabilidad de test de paridad automatizado**: `lineup/campanas.ts` ↔ SQL es el más barato
(E2 ya corrió 612/612 casos a mano; portar esa tabla a `it.each` en `campanas.test.ts` es casi gratis).
`noticias-clasificar.ts`/`compras/parse-agrochat.ts` ↔ sus `.mjs` dependen de si se aprueba el
hallazgo #2/#5 (import real); si no, el test de paridad solo puede comparar contra una copia congelada
del bloque del script (documentada con la línea de origen), no contra el script real ejecutándose.

**Ejemplo de test** (patrón, con fixture real de la ficha 1.4 de E2):

```ts
import { describe, it, expect } from "vitest";
import { precioDiferido, precioConPago, tasaImplicita, diasDesdeTasa } from "./diferido";

describe("diferido.ts — ficha E2 1.4 (pizarra soja 17/07, 31 días excedentes, tasa 30%)", () => {
  const BASE = 495_000, TASA = 30, DIAS = 31;

  it("precioDiferido: interés simple base 365", () => {
    expect(precioDiferido(BASE, TASA, DIAS)).toBeCloseTo(507_612.3287671233, 6);
  });

  it("inversas cierran exacto", () => {
    const diferido = precioDiferido(BASE, TASA, DIAS);
    expect(precioConPago(diferido, TASA, DIAS)).toBeCloseTo(BASE, 6);
    expect(tasaImplicita(BASE, diferido, DIAS)).toBeCloseTo(30, 6);
    expect(diasDesdeTasa(BASE, diferido, TASA)).toBeCloseTo(31, 6);
  });
});
```

## Dudas / decisiones para Lautaro

1. **¿Aprobás mover la lógica de `noticias-clasificar.ts`/`parse-agrochat.ts` a ser importada REAL por
   los `.mjs`, o preferís mantenerlos separados con solo un test de paridad "congelado"?** La primera
   opción elimina el riesgo de raíz pero exige que los scripts de ingesta pasen a depender de `src/lib`
   (hoy son Node puro sin ninguna dependencia de Next) — no rompe nada verificado, pero es un cambio de
   arquitectura de las ingestas que preferimos confirmar antes de tocar 6 workflows de Actions.
2. **¿La tanda de tests de fase 2 va completa (12+ libs) o preferís empezar por un subconjunto chico
   para validar el patrón antes de escalar?** Podemos arrancar por las 3-4 más críticas (`fijar.ts`,
   `arbitraje.ts`, `diferido.ts`, `pases.ts` — el corazón de las calculadoras que usan clientes) y
   sumar el resto en una sesión aparte si el patrón funciona bien.
3. **`noUncheckedIndexedAccess` (hallazgo #13): ¿lo prendemos en esta etapa (L, ~152 errores) o queda
   diferido a E7 junto con los otros refactors grandes?** Recomendación: diferir — no es bloqueante y
   compite en esfuerzo con los quick wins de esta misma etapa.
4. **Hallazgo #7 (`compras.*` en `double precision` → `numeric`): ¿lo aprobás para esta etapa o
   preferís esperar a que se resuelva del todo la reactivación de la fuente MAGyP (duda #2 de E1,
   semántica de `compras.fuente`), ya que ambos tocan la misma tabla?**

### Respuestas de Lautaro (21/07/2026) — todas implementadas en fase 2

1. **Espejos lib↔script: import real.** `cargar-compras.mjs` y `ingest-noticias.mjs` importan las
   funciones reales de `src/lib` en vez de reimplementarlas.
2. **Tests: tanda completa** de las 12 libs (+ `campanas.ts` como bonus, ficha 5.1 "sale gratis").
3. **`noUncheckedIndexedAccess`: diferido a E7.** No se tocó `tsconfig.json`.
4. **`compras.*` → `numeric`: migrar ahora.** Independiente de la duda de `compras.fuente` (E1).
5. **Refactors M/L (market.ts, util de mes/posición, motor de gráfico compartido): ninguno ahora —
   diferidos a E7.**
6. **`empresaDisplay()`: unificar a `"OTROS"` en las dos páginas.**
7. **Los 11 quick wins restantes: aprobados en bloque.**

## Lo que está BIEN (no tocar)

- **Cero dependencias sin uso en `package.json`** — todas las que no tienen import directo (Tailwind,
  tipos, eslint, typescript) son tooling de build, esperado.
- **`server-only` bien aplicado**: 28 archivos lo declaran, cruzados contra los que hacen fetch/tocan
  Supabase — cobertura completa. Los 2 casos sin `server-only` (`auth/env.ts`, `auth/session.ts`) son
  correctos por diseño (env públicas / uso exclusivo del proxy).
- **Ningún secreto de servicio (`service_role`) en `src/`** — confirmado, solo vive en `scripts/*.mjs`
  y la edge function, tal como declara el propio código.
- **Cero N+1 contra PostgREST**: ~90 loops revisados en `src/lib`, ninguno con un fetch/query adentro.
  El único patrón de paginación real está encapsulado en `sbSelectAll` (`supabase.ts:65-95`).
- **Degradación uniforme casi sin excepciones**: 39 funciones envueltas en `React.cache()`, patrón
  `Result`/`Meta`/`FuenteStatus` consistente en 22+ libs revisadas, solo 2 `throw` en todo `src/lib/`
  (ambos en el mismo archivo, hallazgo #8).
- **`globals.css` bien organizado pese al tamaño**: 20 secciones con headers descriptivos, naming por
  prefijo de módulo consistente (`admin-*`, `lu-*`, `gx-*`, `cal-*`…), solo 3/500 clases confirmadas
  muertas (~0,6%) en un chequeo exhaustivo (no muestreado) contra los 119 `.tsx` del repo.
  **No** se recomienda ninguna migración a Tailwind ni reorganización big-bang.
- **`arbitrajes-table.tsx`/`arbitrajes-editable.tsx` NO son duplicación** — split legítimo
  server/client, el segundo es importado por el primero.
- **`cierres-panel.tsx` (huérfano) es intencional y ya está documentado** en `CONTEXTO.md` ("se quitó
  de `page.tsx`... el componente sigue en el repo por si se re-usa") — no requiere acción.
- **Los 6 parsers de mes/posición NO divergen en comportamiento hoy** (verificado por E2, 39 casos de
  paridad) — el hallazgo #11 es de mantenibilidad futura, no un bug presente.

## Para otras etapas

- **Para E5 (infra):** hallazgo #2 y #5 (espejos lib↔script) tocan directamente los workflows de
  ingesta (`ingest-noticias.yml`, el workflow de `cargar-compras.mjs`) — si se aprueba el import real,
  hay que verificar que el paso de Actions siga funcionando igual (Node 22 en el runner, confirmar
  versión exacta).
- **Para E7 (síntesis):** los refactors grandes (partición de `market.ts` #10, util único de
  mes/posición #11, motor de gráfico compartido #14, `noUncheckedIndexedAccess` #13) son candidatos
  naturales a diferir si Lautaro no los prioriza ahora — quedan documentados con esfuerzo estimado
  arriba para el backlog maestro.

## Fase 2 — correcciones implementadas (21/07/2026)

| # hallazgo | Qué se hizo | Migración / archivo | Verificación |
|---|---|---|---|
| 1 | `AuthMenu` pasa a cargarse `next/dynamic({ssr:false})` desde un wrapper client-only nuevo | `src/components/auth-menu-lazy.tsx` (nuevo) · `src/components/site-header.tsx` | `npm run build`: `/comercio` bajó de ~783 KB a **526 KB** First Load JS (uncompressed); `/graficos` de 1.150 KB a **911 KB** |
| 2 | `cargar-compras.mjs` importa `parseAgrochat` real de `parse-agrochat.ts` en vez de reimplementar el pipeline | `scripts/cargar-compras.mjs` | Corrido contra el CSV real del repo: 9.522 filas → 9.522 válidas; trigo 25/26 Export = **16.238.900 t** (= control verificado) |
| 3 | `SOJA_CRUSH` agregado al grupo de soja (mes 4) de la función SQL `campana_ini_year` | `supabase/migrations/20260721190000_e4_campana_ini_year_soja_crush.sql` (aplicada) | `select campana_ini_year('SOJA_CRUSH','2026-05-15')` = 2026, `('SOJA_CRUSH','2026-02-15')` = 2025 (= mismo comportamiento que SBS) |
| 4 | Función SQL `admin_seed_emails_actuales()` que expone el array embebido en `handle_new_user()`, para comparar contra `ADMIN_SEED_EMAILS` | `supabase/migrations/20260721190100_e4_admin_seed_emails_check.sql` (aplicada) | — |
| 5 | `noticias-clasificar.ts` importa JSON con `with {type:"json"}`; `ingest-noticias.mjs` importa `clasificar`/`esRuido`/`esExcluido`/`esRelevante`/`claveTitulo` reales (dedup por título ahora usa `claveTitulo`, no un `normalizar` local) | `src/lib/noticias-clasificar.ts` · `scripts/ingest-noticias.mjs` | `node scripts/ingest-noticias.mjs --dry-run`: 24/26 fuentes OK, titulares clasificados correctamente |
| 6 | `arNum()` unificado (null-safe) en `src/lib/env-utils.ts`; `pizarra.ts` descarta el grano si el número no parsea en vez de propagar NaN | `src/lib/env-utils.ts` (nuevo) · `src/lib/pizarra.ts` · `src/lib/capacidad.ts` | tsc/build |
| 7 | `compras.*` (9 columnas de monto) migradas de `double precision` a `numeric`; matview `compras_avance_hist` recreada idéntica | `supabase/migrations/20260721190200_e4_compras_numeric.sql` (aplicada) | Columnas confirmadas `numeric`; `compras_avance_hist` trigo 25/26 avance = **0,7121...** (= 71,2%, valor documentado) |
| 8 | `parseAgrochat()` envuelto en try/catch en la server action del uploader | `src/app/admin/datos/actions.ts` | tsc/build |
| 9 | 3 llamadas a Supabase Auth en `session.ts` (proxy) envueltas en try/catch defensivo | `src/lib/auth/session.ts` | tsc/build |
| 16 | `calc-negocios-pago.tsx` reusa `precioConPago` de `diferido.ts`; fórmula de `calc-planta.tsx` extraída a `src/lib/planta.ts` (pura) | `src/components/calc-negocios-pago.tsx` · `src/lib/planta.ts` (nuevo) · `src/components/calc-planta.tsx` | tsc/build |
| 17 | `numDeInput`/`fmtInputDate` centralizados en `format.ts` (7+5 call-sites actualizados); `hoyCordoba()` local de `calc-diferido.tsx` borrado (importa de `habiles.ts`); `leerOverrideEnv()` compartida en `env-utils.ts` | `src/lib/format.ts` · `src/components/calc-*.tsx` (7 archivos) · `src/lib/capacidad.ts` · `src/lib/pizarra.ts` | tsc/build |
| 18 | Fallback de `empresaDisplay()` unificado a `"OTROS"` en `lineup/foto.ts` (ya era así en `lineup/empresas.ts`) | `src/lib/lineup/foto.ts` | tsc/build |
| 19 | `fmtFecha` de `auth/admin.ts` (código muerto, 0 llamadas reales) borrado; `navegadorYSO(ua)` extraído a `session-id.ts` y reusado por `deviceDeUA` y `parseUserAgent` | `src/lib/auth/admin.ts` · `src/lib/auth/session-id.ts` | tsc/build |
| 20 | Factores ¢/bu→USD/tn extraídos a `src/lib/factores-commodities.ts`, importado por `monitor-mercados.ts` **y** `ingest-cbot.mjs` (Node 22 importa el `.ts` directo) | `src/lib/factores-commodities.ts` (nuevo) · `src/lib/monitor-mercados.ts` · `scripts/ingest-cbot.mjs` | `node --check` + import real corrido a mano |
| 21 | `sumarHabiles` clampeado a 3650 días; entrada redundante `"2027-06-20"` (domingo) sacada de `FERIADOS_AR`; `comEfectivaPct` de `costos.ts` clampea días negativos a 0 | `src/lib/habiles.ts` · `src/lib/costos.ts` | tsc/build |
| 22 | Borradas 6 funciones/constantes sin uso (`tieneSenalGranos`, `CONGESTION_TN_SEMANA`, `HORIZONTE_CALOR_DIAS`, `construirVista`+`VistaEstimaciones`, `getA3MarketData`+tipos, `difDias`) + 3 clases CSS muertas (`.gx-presets`, `.st-real`, `.st-ejemplo`) | 6 archivos de `src/lib` · `src/app/globals.css` | lint (0 warnings de unused) + tsc |
| 12 | Vitest instalado + `vitest.config.ts` + paso `npm test` en CI; 14 archivos `*.test.ts` (91 tests) sobre las 12 libs aprobadas + `campanas.ts` (paridad SQL) + `dates.ts` (bundlada con la ficha de `habiles.ts`), con los fixtures exactos de `E2-formulas-fichas.md` | `vitest.config.ts` (nuevo) · `package.json` · `.github/workflows/ci.yml` · 14 archivos `src/**/*.test.ts` | `npm test`: **91/91 tests verdes** en 14 archivos |
| 15 | `sample.ts` borrado — E3 (PR #57, mergeado) sacó su único consumidor (`implicitas-panel.tsx`) y quitó el `noindex` global; al mergear con `main` quedó con 0 importadores | `src/lib/sample.ts` (eliminado) | `grep -rl` de importadores → 0 resultados; lint/tsc/build ✅ |

**Diferidos a E7:** #10 (partir `market.ts`), #11 (util único de mes/posición), #13
(`noUncheckedIndexedAccess`), #14 (motor de gráfico SVG compartido).
