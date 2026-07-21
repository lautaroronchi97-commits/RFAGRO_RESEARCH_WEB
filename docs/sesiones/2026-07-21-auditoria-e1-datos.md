# Sesión 2026-07-21 — Auditoría E1 (datos y base de datos)

- **Rama:** `claude/auditoria-e1-datos-vjmwzd` · **PR:** #50 (base `main`, draft)
- **Objetivo pedido por Lautaro:** ejecutar la etapa E1 de la auditoría integral — ¿la base tiene sentido?
  ¿lo guardado es correcto, completo y fresco? (14 tablas, 9 vistas, 4 matviews, ~19 RPCs).

## Hecho
- **Informe `docs/auditoria/E1-datos.md`** (fase 1, solo auditar) con 9 hallazgos priorizados + Anexo A
  (DDL vivo de las 5 tablas heredadas) + Anexo B (frescura al 21/07) + «Dudas» + «Lo que está BIEN».
- **Cotejo 1:1 contra fuentes con requests reales** (todos exactos): futuros ↔ CEM (11/11 filas soja+maíz
  del 20/07), pizarra ↔ CAC (soja 17/07 $495.000), CBOT ↔ Barchart (soja NOV26 1203 ¢/bu → 442,03 USD/tn),
  compras ↔ verificado (trigo 25/26 Export 16.238.900 t). Verificado con la anon key que los guards
  `is_admin()` de los `admin_*` funcionan y que `lineup`/matviews SÍ se filtran por anon (fuga confirmada).
- **Fase 2 aplicada a la base viva por MCP** (2 migraciones, versionadas en el repo):
  - `20260721033455_e1_seguridad_indices.sql`: revoke EXECUTE de `ingest_cierres_cem` a anon/authenticated
    (verificado: anon→**HTTP 404**), `campana_ini_year` con `search_path`, +`profiles_approved_by_idx`,
    drop `idx_lineup_port` (muerto, sobre 509k filas).
  - `20260721033519_e1_limpieza_compras.sql`: borradas 7 filas huérfanas `fuente=MAGYP` (test parcial del
    27/05) + clamp del único saldo negativo + refresh de `compras_avance_hist`.
  - **Solo repo:** `00000000000000_baseline_tablas_heredadas.sql` (baseline idempotente del DDL de djve,
    lineup, cbot_cierres, pizarra_historico, compras) y `healthcheck-frescura.mjs` con +`djve` (5d),
    +`compras` (14d) y +3 checks de matview-refrescada (corrido: 15 checks verdes).

## Decisiones tomadas (y por qué)
- **#1 revoke ingest_cierres_cem, #3 borrar MAGYP, #6/#7/#9, #4 healthcheck, #5 baseline:** aprobados por
  Lautaro y aplicados (los de base por MCP; los de repo versionados).
- **#2 cierre RLS de lineup + matviews de mesa → DIFERIDO a E5.** Lautaro había aprobado "cerrar ya", pero
  al implementarlo se vio que las páginas `/comercio/*` leen esos objetos **con la anon key server-side**
  (no con el JWT del usuario) → revocar las rompería para todos, incluido admin. Con la evidencia, decidió
  cerrarlo junto con el encendido del login (E5), cuando el data-layer lea con el JWT.
- **compras.fuente:** Agrochat es la fuente única → se borró MAGYP; `fuente` queda como etiqueta.
- **calendario_informes:** se conserva (base futura para ítem 21/MP4).

## Verificado
- Cada número del informe salió de una query o request reproducible (MCP Supabase solo-lectura + WebFetch a
  CEM/CAC/Barchart + curl con anon key).
- Post-fix por SQL: MAGYP=0, negativos=0, search_path fijo, índice nuevo=1/viejo=0, `ingest_cierres_cem`
  proacl sin anon/authenticated y anon→404.
- `healthcheck-frescura.mjs` corrido con datos reales: 15 checks, todos ✓, exit 0.
- (No se corrió lint/tsc/build: los cambios de código son solo `scripts/healthcheck-frescura.mjs`, un .mjs
  standalone fuera del build de Next; el resto es SQL y docs.)

## Quedó pendiente / en vuelo
- **#2 (cierre RLS mesa) → E5**, acoplado al encendido de `AUTH_ENFORCED`.
- **Para E4:** `compras` guarda montos en `double precision` (raíz de los parseos rotos) vs `numeric` del
  resto → evaluar migrar; `campana_ini_year` (SQL) duplicada en `lineup/campanas.ts` (test de paridad);
  `djve.codigo_interno` null en 169.514 filas (era ROE) es por diseño.
- **Para E5:** Leaked Password Protection deshabilitada (config Auth); advisors RLS initplan + policies
  permisivas duplicadas (se pagan al prender el login).

## Trampas descubiertas (para la próxima sesión)
- **El data-layer de datos NO usa el login:** `src/lib/supabase.ts` lee TODO con `SUPABASE_ANON_KEY`, aun
  las páginas gateadas por `requireAdmin`. Cualquier cierre por RLS de datos que consuma la web tiene que
  coordinarse con un cambio de cliente (JWT o service-role), no es un revoke suelto.
- **`compras.fuente` mezclada en la matview:** `compras_avance_hist` filtra `fuente != LEGACY`, así que
  cualquier fila con `fuente` nueva (como las 7 MAGYP) entra sin querer. Ojo si se reactiva MAGyP.
- **La anon key pública lee TODA la base por PostgREST** (incluido `lineup` completo y matviews) — es el
  modelo actual a propósito, pero es la decisión de fondo a resolver en E5.
