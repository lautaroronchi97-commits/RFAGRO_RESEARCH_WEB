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

## Quedó pendiente / en vuelo
- **Todo el informe está en fase 1** — espera la decisión de Lautaro hallazgo por hallazgo
  (columna «Decisión Lautaro» de la tabla) antes de implementar cualquier fix en fase 2.
- 4 dudas de criterio para Lautaro (import real de los `.mjs` vs test de paridad congelado · alcance
  de la 1ª tanda de tests · si prender `noUncheckedIndexedAccess` en esta etapa o diferir a E7 · si
  migrar `compras.*` a `numeric` ahora o esperar la definición de `compras.fuente` de E1).
- Los tests nuevos (Vitest) NO se implementaron — quedan para fase 2 si Lautaro aprueba el hallazgo #12.

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
