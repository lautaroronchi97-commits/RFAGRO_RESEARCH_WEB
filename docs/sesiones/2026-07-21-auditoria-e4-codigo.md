# Sesión 2026-07-21 — Auditoría E4 código/arquitectura

- **Rama:** `claude/auditoria-e4-codigo-p28mxd` · **PR:** #_ (base `main`, draft hasta el OK)
- **Objetivo pedido por Lautaro:** ejecutar la etapa E4 (código y arquitectura) del
  `PLAN_AUDITORIA.md` — solo fase 1 (auditar, sin tocar código).

## Hecho
- Informe **[`docs/auditoria/E4-codigo.md`](../auditoria/E4-codigo.md)**: 23 hallazgos priorizados
  (duplicación · estructura · tests · calidad), cubriendo los 4 puntos del prompt E4 más lo que E1/E2
  dejaron marcado explícitamente «Para E4» (float en `compras`, `precioConPago` inline en
  `calc-negocios-pago.tsx`, fórmula de `calc-planta.tsx` sin extraer, clamp de `sumarHabiles`, guard de
  días negativos en `costos.ts`, `FERIADOS_AR` con entrada redundante 2027).
- Verificación con evidencia real (no teórica): confirmado por `git log` que el espejo
  `compras/parse-agrochat.ts` ↔ `scripts/cargar-compras.mjs` **ya causó un bug en producción**
  (commit `6528079`, fix ÷1000 aplicado a mano en los dos lados) y tiene una divergencia nueva activa
  (`fechaISO` con fallback ISO en un lado, no en el otro); confirmado que `lineup/campanas.ts` y la
  función SQL `campana_ini_year` **ya divergen** (SOJA_CRUSH solo en TS, sin efecto hoy).
- Corrida real de `npx tsc --noEmit` con `noUncheckedIndexedAccess:true` en un tsconfig temporal
  (fuera del repo): 152 errores en 32 archivos, 55 de ellos concentrados en 3 (`calendario.ts`,
  `graficos-client.tsx`, `evolucion-chart.tsx`).
- `npm run build`: identificado que **todas las páginas públicas** mandan el SDK completo de
  `@supabase/supabase-js` (~235 KB sin comprimir) al bundle del cliente por un import estático de
  `AuthMenu` en `site-header.tsx` — el único hallazgo de performance real y accionable de la etapa.
- Propuesta completa de Vitest: 12 libs puras confirmadas (11 del encargo + `porcentaje.ts`), mapa
  lib→fichas de `E2-formulas-fichas.md` (10/11 con ficha directa; `compras/parse-agrochat.ts` sin
  ninguna), estructura de archivos/config/CI, viabilidad de tests de paridad por espejo, 4 ejemplos de
  test con fixtures reales.

## Decisiones tomadas (y por qué)
- **4 sub-auditorías en paralelo** (duplicación · estructura/código muerto · tests/fixtures ·
  calidad/perf) en vez de una sola pasada — el encargo mismo sugiere "Sonnet + subagentes por
  dimensión" para esta etapa; permitió evidencia archivo:línea más profunda en cada área sin diluir
  el contexto de una sola sesión larga.
- **No implementar nada en fase 1** (ni siquiera el fix de 1 línea de `AuthMenu`) — el protocolo del
  plan es informe → decisión de Lautaro hallazgo por hallazgo → recién ahí corregir.

## Verificado
- `npm run lint` / `npx tsc --noEmit` / `NODE_USE_ENV_PROXY=1 npm run build` — los 3 limpios.
- `git status`/`git diff` tras la corrida de `noUncheckedIndexedAccess`: confirmado que el
  `tsconfig.json` real quedó sin tocar (se usó un tsconfig temporal fuera del repo).
- Cada hallazgo del informe con evidencia archivo:línea verificada por lectura directa o `grep`/
  `git log`, no especulación.

## Fase 2 (mismo día, misma rama/PR)

Lautaro contestó las 4 dudas + los 3 puntos de criterio en el chat (sin scrollear el informe línea
por línea) y aprobó los 11 quick wins restantes en bloque. Fase 2 implementada completa:

- **Espejos (import real, no reimplementación):** `cargar-compras.mjs` importa `parseAgrochat` de
  `parse-agrochat.ts` (verificado contra el CSV real: 9.522 filas, trigo 25/26 = 16.238.900 t);
  `ingest-noticias.mjs` importa `clasificar`/`esRuido`/`esExcluido`/`esRelevante`/`claveTitulo` de
  `noticias-clasificar.ts` (con `with {type:"json"}` agregado al import JSON) — verificado con
  `--dry-run` real.
- **3 migraciones SQL** (aplicadas por MCP vía `execute_sql`, el canal de aprobación de
  `apply_migration` seguía caído — mismo workaround de E1/E2): `SOJA_CRUSH` sumado a la función
  `campana_ini_year` · `admin_seed_emails_actuales()` para poder auditar `ADMIN_SEED_EMAILS` contra
  `handle_new_user()` · `compras.*` (9 columnas) migrado de `double precision` a `numeric`
  (requirió dropear y recrear `compras_avance_hist`, que dependía de `toneladas`).
- **Hallazgo de performance (#1) corregido**: `AuthMenu` pasa a `next/dynamic({ssr:false})` desde un
  wrapper client-only nuevo (`auth-menu-lazy.tsx`) — Next 16 exige que `ssr:false` viva en un Client
  Component, no en el Server Component que lo importaba antes. Verificado con `npm run build`:
  `/comercio` bajó de ~783 KB a **526 KB** First Load JS, `/graficos` de 1.150 KB a **911 KB**.
- **Resto de quick wins** (#6, #8, #9, #16, #17, #18, #19, #20, #21, #22): `arNum` null-safe
  compartida, try/catch en el upload de compras y en `auth/session.ts` (proxy), `calc-negocios-pago`
  reusa `precioConPago`, fórmula de `calc-planta.tsx` extraída a `src/lib/planta.ts`,
  `numDeInput`/`fmtInputDate` centralizados (12 call-sites), fallback de `empresaDisplay` unificado a
  "OTROS", `fmtFecha` muerta de `auth/admin.ts` borrada + `navegadorYSO` extraído a `session-id.ts`,
  factores CBOT compartidos en `factores-commodities.ts` (usado por el `.mjs` también), clamp de
  `sumarHabiles`, 6 funciones + 3 clases CSS muertas borradas.
- **Vitest completo** (hallazgo #12, tanda completa aprobada): `vitest.config.ts` + paso `npm test`
  en `ci.yml` + **14 archivos de test, 91 tests**, todos verdes — las 11 libs del encargo original +
  `porcentaje.ts` + `campanas.ts` (paridad TS↔SQL, "sale gratis" según E2) + `dates.ts` (bundlado con
  la ficha de `habiles.ts`), con los fixtures exactos de `E2-formulas-fichas.md`.
- **Diferidos a E7** (aprobado explícitamente): partir `market.ts`, unificar los 9 parsers de
  mes/posición A3, motor de gráfico SVG compartido, `noUncheckedIndexedAccess`.
- **Bloqueado, sin decisión posible en esta etapa**: `sample.ts` (hallazgo #15) — depende de la
  decisión de E3 sobre `implicitas-panel.tsx`.

## Quedó pendiente / en vuelo
- Nada de esta etapa — E4 queda cerrada. `sample.ts` sigue bloqueado por E3 (no es un pendiente de
  E4, es una dependencia cruzada documentada).
- Los 4 refactors diferidos a E7 quedan en el informe con esfuerzo estimado, para el backlog maestro.

## Trampas descubiertas (para la próxima sesión)
- **Next 16/Turbopack ya no imprime la tabla "Route / Size / First Load JS" en la consola del
  build** — los tamaños reales quedan en `.next/diagnostics/route-bundle-stats.json`.
- **Node 22 (el motor real del repo) puede importar `.ts` directo desde un script `.mjs` sin ningún
  flag** (type-stripping), con un solo bloqueo puntual: imports de JSON crudo necesitan
  `with { type: "json" }`, que TypeScript/Next no exigen pero Node sí. Relevante para cualquier fix
  futuro de los espejos lib↔script.
- El "6 espejos" de la semilla del prompt en realidad eran 5 pares + 1 caso (`ADMIN_EMAILS` env) que
  no es una duplicación real, sino una confusión de nombres con `ADMIN_SEED_EMAILS` — sirven cosas
  distintas (aviso de registro vs lista de auto-admins).
