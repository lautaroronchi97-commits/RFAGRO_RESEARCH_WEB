# Sesión 2026-07-21 — Auditoría E6 (historia del repo)

- **Rama:** `claude/auditoria-e6-historia-yk24fj` · **PR:** #_ (base `main`)
- **Objetivo pedido por Lautaro:** ejecutar la etapa E6 de `PLAN_AUDITORIA.md` — recorrer los ~54 PRs
  y las 29 bitácoras de `docs/sesiones/` en orden cronológico para levantar promesas abiertas,
  contradicciones ESTADO/CONTEXTO vs código real, las tres listas de pendientes paralelas, higiene de
  ramas/docs, y patrones de proceso repetidos.

## Hecho
- Fase 1 (informe): `docs/auditoria/E6-historia.md` con 8 hallazgos priorizados, tabla completa de
  promesas abiertas (14 filas) con estado verificado HOY, propuesta de lista única de pendientes,
  comandos de limpieza de ramas (para que Lautaro los corra), candidatos a marcar planes cerrados, y
  3 mejoras de proceso propuestas para `ESTADO.md`.
- 6 subagentes en paralelo (3 lotes de ~18 PRs vía el body completo de `list_pull_requests`, 3 lotes
  de ~10-13 bitácoras vía Read) extrajeron citas textuales de pendientes/decisiones; la verificación
  cruzada contra el código y la base viva la hizo esta sesión.
- Verificación viva (no solo lectura de docs): `list_branches` (7 ramas con PR mergeado sin borrar),
  `list_migrations` de Supabase (confirma las migraciones del 20-21/07 aplicadas, con 3 desfasajes de
  version vs nombre de archivo), `actions_list`/`get_job_logs` de GitHub (encontró que DEA-SAGyP viene
  fallando 2/2 corridas programadas desde el 16/07, y que el probe de PAS del 12/07 ya había
  contestado HTTP 403/Cloudflare y nadie lo había leído), `execute_sql` sobre `estimaciones_produccion`
  (confirma el atraso real de DEA: último informe 13/07), `list_triggers` (confirma que la Routine
  semanal de MP3 todavía no existe).

## Decisiones tomadas (y por qué)
- Nivel de auditoría por PR/sesión (no commit a commit) — pedido explícito de Lautaro en
  `PLAN_AUDITORIA.md`; ningún PR levantó sospecha como para bajar a nivel commit.
- No se borró ninguna rama ni se tocó código de producto en Fase 1 — solo se dejaron los comandos
  para que Lautaro los corra (regla del plan: "el borrado de ramas remotas listalo como comandos…
  no borres ramas vos").

## Verificado
- Los 54 PRs vía `list_pull_requests` (merged_at de cada uno) + `list_branches` (ramas remotas hoy).
- `get_job_logs` de las 2 últimas corridas programadas de *Ingesta estimaciones Argentina* (16/07 y
  17/07) — confirmado el fallo real de DEA-SAGyP con el traceback completo.
- `get_job_logs` del run del 12/07 con `pas_probe` — confirmado HTTP 403 de BCBA también desde IPs de
  GitHub Actions.
- `list_migrations` (Supabase, proyecto `gbpfgfeksqmzmsxnxiwg`) vs `ls supabase/migrations/` local —
  todas las migraciones hasta `mp3_views_mercado` están aplicadas; 3 con version distinto al nombre
  de archivo (aplicadas por `execute_sql` como workaround).
- `git log -1 -- docs/PLAN_PUERTOS.md` (18/07) vs `ESTADO.md` (declara el ítem 6 HECHO el 19/07) —
  confirma la contradicción del hallazgo #3.
- No se corrió `lint`/`tsc`/`build`: todos los cambios de la sesión (Fase 1 y 2) son `.md` y
  comentarios en 3 `.sql` de `supabase/migrations/` — cero archivos `.ts`/`.tsx` tocados. (El sandbox
  tampoco tenía `node_modules` instalado esta vez; no hizo falta instalarlo para este alcance.)

## Fase 2 (aplicada en la misma sesión, tras el OK de Lautaro)
- **DEA-SAGyP**: re-corrido el `workflow_dispatch` (run `29861219905`) — falló con el mismo
  `ConnectTimeoutError` que las corridas del 16/07 y 17/07. Confirmado que no es transitorio;
  diferido a **E5** para la mitigación (reintentos/backoff o Edge Function como `lineup-ingest`).
- **PAS (BCBA)**: cerrada la promesa — `PLAN_CALENDARIO_PRODUCCION.md`, `CONTEXTO.md` (2 lugares) y
  `PLAN_BACKLOG.md` actualizados de "pendiente de validar" a "descartado, confirmado 2/2 por
  Cloudflare (12/07 y el probe re-verificado en esta sesión)".
- **`PLAN_PUERTOS.md`**: banner a "PLAN COMPLETO", Fase 4 marcada `✅ HECHA (19/07)`, ítem 1 de
  "Abiertos/riesgos" tachado (ya resuelto en PR #34).
- **Lista única de pendientes**: `CONTEXTO.md` § Pendientes reemplazada por un pointer a
  `ESTADO.md`+`PLAN_BACKLOG.md` (con la regla de no volver a duplicar); `ESTADO.md` § gráficos v2
  comprimida a un pointer a **P6** de `PLAN_BACKLOG.md`.
- **Higiene de docs**: tabla "Ramas vivas" obsoleta de `ESTADO.md` reemplazada por nota + link a
  este informe; 3 migraciones `.sql` con version distinto al nombre de archivo, comentadas con el
  version real aplicado.
- **No se borró ninguna rama** (regla del plan: solo se dejan los comandos en el informe para que
  Lautaro los corra).

## Quedó pendiente / en vuelo
- Los 7 `git push origin --delete` de `auditoria/E6-historia.md` § «Higiene» — los corre Lautaro.
- Mitigación de fondo de DEA-SAGyP (reintentos/Edge Function) — diferida a **E5**.
- Uploader de `/admin/datos` probado por Lautaro logueado — sigue sin confirmar.
- Suscripción de Lautaro por mail al informe PAS — paso manual suyo, fuera del repo.

## Trampas descubiertas (para la próxima sesión)
- El `list_pull_requests` de GitHub MCP sin `minimal_output` devuelve el body completo de los 54 PRs
  y excede el límite de tokens de una sola llamada — el resultado se guarda en un archivo de
  `tool-results/`; conviene pedirlo una sola vez, guardarlo, y repartir el JSON en lotes para
  subagentes en vez de re-pedirlo por PR.
- `pull_request.merged` no viene poblado en el endpoint de LISTA de GitHub (solo en el de detalle) —
  hay que usar `merged_at != null` para saber si un PR mergeó, no el campo `merged`.
- El job log de un workflow con `if` condicionales en cada step muestra igual TODOS los steps
  (incluidos los `skipped`) — sirve para diferenciar "no corrió por diseño" (`skipped`, ej. PAS en
  modo diario) de "corrió y falló" (`failure`, ej. DEA en las corridas del 16-17/07).
