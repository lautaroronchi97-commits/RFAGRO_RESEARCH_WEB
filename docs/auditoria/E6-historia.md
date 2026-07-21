# Auditoría E6 — Historia del repo (2026-07-21)

- **Rama:** `claude/auditoria-e6-historia-yk24fj` · **PR:** #_ (base `main`, draft hasta el OK)
- **Alcance:** los ~54 Pull Requests del repo (06/07→21/07/2026) y las 29 bitácoras de
  `docs/sesiones/`, recorridos en orden cronológico a nivel PR/sesión (no commit a commit, salvo que
  un PR levantara sospecha — ninguno lo hizo). Objetivo: promesas abiertas, contradicciones entre
  docs y código real, las tres listas de pendientes paralelas, higiene de ramas/docs, y patrones de
  proceso repetidos.
- **Cómo se verificó:** GitHub MCP (`list_pull_requests` con los 54 PRs completos, `list_branches`,
  `actions_list`/`get_job_logs` sobre corridas reales de Actions), Supabase MCP (`list_migrations`,
  `execute_sql` sobre `estimaciones_produccion`), `list_triggers` de Claude Code Remote (Routines
  vivas), y lectura directa del código/docs actuales del repo (grep/Read) para contrastar cada
  promesa contra el estado de HOY, no contra lo que dice el doc. 6 subagentes de lectura mecánica
  (3 lotes de PRs, 3 lotes de bitácoras) extrajeron las citas textuales; la consolidación,
  verificación cruzada contra el código/la base viva, y las contradicciones las hizo esta sesión.

## Resumen ejecutivo

De 54 PRs, 53 mergearon y 1 se cerró sin mergear (su contenido se rescató el mismo día en otro PR —
sin pérdida, ver Higiene). El proceso de "informe → OK → corregir" se sostuvo bien en general. El
hallazgo más importante de esta etapa es operativo, no documental: **la ingesta DEA-SAGyP viene
fallando por timeout de conexión**, y nadie lo notó en 5 días y varias sesiones (incluida la
auditoría E1 del 21/07) — el dato lleva 8 días sin refrescar. Se re-corrió el dispatch en esta misma
sesión (con el OK de Lautaro) para descartar que fuera transitorio: **falló una tercera vez con el
mismo error**, confirmando el bloqueo y quedando diferido a E5. Un segundo hallazgo cierra una
promesa que en realidad ya estaba resuelta desde hace 9 días: el probe de PAS (BCBA) SÍ corrió el
12/07 y su log ya dice todo lo que hacía falta saber (HTTP 403, Cloudflare bloquea también las IPs de
GitHub Actions) — nadie lo leyó hasta ahora; Lautaro dio el OK para cerrarlo formalmente. Aparte de
eso: dos contradicciones concretas entre `PLAN_PUERTOS.md` y la realidad (quedó sin tocar desde el
18/07 pese a que sus Fases 2-4 se hicieron los días siguientes), la consolidación de las tres listas
de pendientes que efectivamente divergían (con `PLAN_BACKLOG.md`, ya escrito el 21/07, como destino
único), y 7 ramas remotas con PR ya mergeado que nadie borró todavía (comandos listos para que
Lautaro los corra). Todo lo aprobado por Lautaro se aplicó en la Fase 2 de esta misma sesión.

## Hallazgos (priorizados, el más grave primero)

| # | Hallazgo | Evidencia | Impacto | Esfuerzo | Propuesta de fix | Decisión Lautaro |
|---|---|---|---|---|---|---|
| 1 | La ingesta **DEA-SAGyP** viene fallando hace 3 corridas seguidas (16/07, 17/07 y el re-dispatch de esta misma auditoría el 21/07) por timeout de conexión a `datosestimaciones.magyp.gob.ar`; nadie lo notó — ni la auditoría E1 del mismo 21/07, que sí tocó el healthcheck. El dato de DEA está parado en el snapshot del 13/07 (8 días de atraso hoy). | Runs `29583324682` (17/07), `29470023642` (16/07) y `29861219905` (21/07, re-dispatch de esta auditoría) del workflow *Ingesta estimaciones Argentina*, job "DEA (SAGyP)": `TypeError: fetch failed … ConnectTimeoutError … datosestimaciones.magyp.gob.ar:443, timeout: 10000ms` — **idéntico error en las 3 corridas**, confirma que no es transitorio. SQL: `select organismo,max(fecha_publicacion),max(actualizado_en) from estimaciones_produccion group by organismo` → DEA: último informe 2026-07-13, última carga 2026-07-13 16:56:48 (fue el dispatch manual, no el cron). El healthcheck (`scripts/healthcheck-frescura.mjs:59`) recién marca DEA en rojo a los **16 días** — no va a saltar hasta el 29/07. | **alto** — mesa: el comparador AR de `/produccion` sirve un DEA viejo sin avisar; robustez: un cron "vivo" que en realidad viene fallando 3/3 sin que el healthcheck lo cubra a tiempo. | S | **Confirmado persistente** (Fase 2 de esta auditoría: se re-corrió el dispatch el 21/07 y falló con el mismo error) — no es un problema transitorio del host. Como con BCBA, probablemente sea IP de GitHub Actions bloqueada/limitada por el propio servidor de MAGyP. Diferido a **E5**: mitigar con reintentos+backoff, o mover a la misma Edge Function de Supabase que ya resuelve el mismo problema para `lineup`/ISA. Bajar el umbral del healthcheck de DEA (hoy 16 días) o sumar una alerta de "N corridas seguidas en rojo". | hacer (re-correr, hecho) + diferir mitigación a E5 |
| 2 | El **probe de PAS (BCBA) ya corrió y ya contestó la pregunta**, hace 9 días — nadie leyó el log. Todos los docs desde el 12/07 (incluida la semilla de este mismo prompt E6 y las de E1/E2/E5) repiten "falta validar PAS / leer el log del pas_probe" como si siguiera abierto. | Run `29204876174` (12/07, `workflow_dispatch` con `pas_probe`), job "PAS (BCBA) — solo probe por dispatch": `BCBA estimaciones: HTTP 403 · 5842 bytes` → `##[warning] BCBA sigue detrás de Cloudflare desde esta IP — no se ingestó el PAS.` Mismo resultado que desde el sandbox (403), confirmando que **también las IPs de GitHub Actions están bloqueadas**, no es un problema del entorno de desarrollo. | medio — no es un bug, es una promesa ya cumplida que sigue viva en 4+ docs por no haberse leído el resultado. Confunde a cada sesión nueva que la re-lee como pendiente. | S | Cerrar formalmente: PAS NO es automatizable desde ningún runner disponible (confirmado dos veces, dos IPs distintas, mismo 403). Actualizar `ESTADO.md`/`CONTEXTO.md`/`PLAN_CALENDARIO_PRODUCCION.md` para que digan "descartado, confirmado por Cloudflare 2/2" en vez de "pendiente de validar", y activar el respaldo por mail que ya está documentado (suscripción de Lautaro al informe PAS). Sacar `ingest-pas.mjs --probe` del backlog. | **hacer (hecho)** |
| 3 | `PLAN_PUERTOS.md` no se tocó desde el 18/07/2026 (Fases 0-1) pese a que sus Fases 2, 3 y 4 se completaron los días siguientes — contradice a `ESTADO.md`, que da el ítem 6 del backlog por HECHO. | `git log -1 -- docs/PLAN_PUERTOS.md` → `2026-07-18`. El doc sigue con el banner **"Estado: PLAN APROBADO, LISTO PARA EJECUTAR"** (línea 3) y la sección "### Fase 4 — Temperatura de mercadería" en futuro ("Requiere reactivar `update_compras`… El índice degrada solo si falta farmer selling"), sin ningún `✅ HECHA`. `ESTADO.md`: "**COMERCIO EXTERIOR — FASE 4 HECHA … cierra el ítem 6 del backlog**" (19/07). | bajo — no rompe nada en producción, pero cualquiera que abra `PLAN_PUERTOS.md` (no `ESTADO.md`) cree que el plan sigue por ejecutar. | S | Agregar `✅ HECHA (19/07)` a las Fases 2-4 y cambiar el banner a "PLAN COMPLETO — ver ESTADO.md para lo que sigue (extras de spec → backlog E7)". | **hacer (hecho)** |
| 4 | Mismo doc, sección "6. Abiertos/riesgos", ítem 1 ("Referencia de la Bolsa para avance exportado") sigue listado como pregunta abierta pese a que la Fase 2 (PR #34, 19/07) ya la resolvió explícitamente como decisión de alcance. | `PLAN_PUERTOS.md:180-183` ("falta confirmar con Lautaro si compara contra producción o…") vs PR #34: **"Avance vs Bolsa/saldo exportable: descartado en esta entrega."** | bajo | S | Tachar el ítem 1 de "Abiertos/riesgos" con la cita de la decisión y el PR. | **hacer (hecho)** |
| 5 | Las **tres listas de pendientes paralelas** (backlog «Plan RF AGRO» de `ESTADO.md`, «Pendientes» de `CONTEXTO.md`, lista v2 de gráficos) efectivamente divergen — `CONTEXTO.md` quedó congelada el 09/07 y ya tiene varios ítems hechos sin marcar. | `CONTEXTO.md` § Pendientes ("actualizada 09/07/2026"), ítem 5: *"reactivar scrapers `lineup`/`compras` (frenados), panel de lineups, calendario de informes … SIO Granos, camiones en puerto, volumen por producto, % sobre cosecha, variación semanal USD"* — de esos 8 sub-ítems, **6 ya están hechos** (lineup: Fase 0 18/07 · compras: Fase 4 19/07 · panel de lineups: `/comercio/puertos` 18/07 · calendario de informes: módulo completo 12/07 · SIO Granos/volumen por producto/% sobre cosecha: `/comercio/negociado` 20/07) y solo camiones en puerto (research 21/07, build pendiente) y variación semanal USD siguen abiertos de verdad. `docs/PLAN_BACKLOG.md` (creado el mismo 21/07) ya arma la tabla de mapeo única que pide este hallazgo — pero ni `ESTADO.md` ni `CONTEXTO.md` apuntan todavía a ella. | medio — cada sesión nueva pierde tiempo re-triangulando cuál lista manda. | S | Ver «Propuesta de lista única» abajo. | **hacer (hecho)** |
| 6 | 7 ramas remotas con PR ya mergeado siguen sin borrar (todas de la última semana). | `list_branches`: `claude/auditoria-e1-datos-vjmwzd` (PR #50, merged 21/07) · `claude/e2-formulas-go9i9y` (#51, 21/07) · `claude/trading-project-audit-37aiqr` (#49, 21/07) · `claude/research-p3-p4-phases-u4e8k3` (#52, 21/07) · `claude/mp3-lee-prompt-th37ix` (#53, 21/07) · `claude/mp3-cierre-post-merge` (#54, 21/07) · `claude/pendientes-4c5ovu` (#48, 20/07). Las ramas viejas (anteriores al 20/07) SÍ se limpiaron — esto es solo el rezago de la última semana. | bajo | S | Ver comandos listos en «Higiene» abajo (los corre Lautaro, no esta sesión). | preguntar (comandos listos, los corre Lautaro) |
| 7 | La tabla **"Ramas vivas y su veredicto"** de `ESTADO.md` (dentro de la sección congelada "Contexto previo 12/07/2026") quedó 100% obsoleta: ninguna de las ramas que lista existe ya, y no incluye ninguna de las 7 ramas reales de hoy (hallazgo #6). | `ESTADO.md`, tabla bajo "Ramas vivas y su veredicto" (ramas `claude/login-stage-3-kqt0pg`, `claude/website-ux-redesign-plan-irvt6k`, etc. — ninguna existe en `list_branches` de hoy). | bajo — es una sección histórica, pero sin aviso de que está congelada puede leerse como estado actual. | S | Agregar una línea "⚠️ tabla congelada al 12/07, ver «Higiene» de `auditoria/E6-historia.md` para las ramas vivas de hoy" o borrarla directamente (ya no aporta nada, ni siquiera como historia — no quedó ninguna rama de esa lista). | **hacer (hecho)** |
| 8 | 3 migraciones aplicadas por `execute_sql` (workaround por la caída recurrente del canal de aprobación del MCP) quedaron con un **version timestamp distinto al nombre de archivo commiteado**. | `list_migrations` (Supabase): `20260720144443 admin_carga_compras` vs archivo `20260720120000_admin_carga_compras.sql`; `20260720192357 compras_avance_todas_fuentes` vs `20260720150000_...`; `20260721122520 e2_djve_cobertura_matview` vs `20260721120000_...`. | bajo — no rompe nada (las migraciones SÍ están aplicadas, confirmado), pero un `supabase migration list`/diff futuro puede confundir por el desfasaje. | S | Anotar en el propio archivo `.sql` (comentario) el version real aplicado cuando difiera del nombre, o adoptar la costumbre de pasarle a `execute_sql` literalmente el timestamp del nombre del archivo cuando se use como workaround de `apply_migration`. | **hacer (hecho)** |

## Promesas abiertas — tabla completa

> Estado verificado HOY (21/07/2026) contra código/base real, no contra lo último que dijo el doc.

| Promesa | Dónde se declaró | Estado real verificado | Propuesta |
|---|---|---|---|
| Validar PAS (BCBA) desde Actions | PR #23/#24, sesión 12/07-estimaciones-argentina, semilla de E1/E2/E5/E6 en `PLAN_AUDITORIA.md` | **Ya resuelto desde el 12/07**, nunca cerrado en los docs (hallazgo #2) | **Cerrado (Fase 2):** `ESTADO.md`/`CONTEXTO.md`/`PLAN_CALENDARIO_PRODUCCION.md`/`PLAN_BACKLOG.md` actualizados |
| DEA-SAGyP: crons mantienen el dato al día | PR #21/#23, "los crons mantienen solo" repetido en varios docs | **Roto** desde el 16/07, confirmado persistente con un 3er intento en Fase 2 (hallazgo #1) | Diferido a E5 (mitigación); dato sigue atrasado hasta que se resuelva |
| Backfill Wayback de `compras` (farmer selling histórico) | PR #33/#36/#37 lo dan como plan; PR #38 y `ESTADO.md` (19/07) lo declaran **DESCARTADO** explícitamente (0 capturas) | **Cerrado correctamente** — verificado que no queda ninguna mención viva sin actualizar (la única mención de "pendiente de correr" está en el mismo párrafo histórico que después dice "quedó DESCARTADO", no es una promesa colgada real) | Ninguna acción — ya está bien |
| Fase 2 del feed A3 en vivo (histórico intradiario: cron 15', `ingest-rueda.mjs`, tabla `snapshots`) | Declarado "fuera de alcance" desde PR #11 (09/07) | **Sigue sin implementar** — no existe `ingest-rueda.mjs` ni tabla `snapshots` en el repo. Mapeado a **P8** en `PLAN_BACKLOG.md` (21/07) | Ejecutar P8 cuando Lautaro priorice |
| Sintéticos TIR (pago final por letra, tabla IAMC) | PR #3 (08/07) en adelante, bloqueado por insumo de Lautaro | **Sigue sin insumo** — no hay tabla ni fórmula de TIR en `src/lib/market.ts`. Mapeado a **P9** | Esperar la tabla de Lautaro (paso 1 de P9) |
| Migraciones del 20/07 (`admin_carga_compras`, `compras_avance_todas_fuentes`) aplicadas | PR #44 (20/07) las deja "por confirmar" | **Confirmado aplicadas** (`list_migrations`, hallazgo #8 sobre el desfasaje de version) | Cerrar la promesa; queda solo el hallazgo #8 (cosmético) |
| Uploader de compras (`/admin/datos`) probado por Lautaro logueado | PR #44 (20/07): "Falta (manual): que Lautaro pruebe el uploader logueado" | **Sin confirmar** — ningún doc posterior (incl. las 2 auditorías del 21/07) menciona que se haya probado | Preguntarle a Lautaro si ya lo usó; si no, sigue como pendiente manual |
| Encendido de `AUTH_ENFORCED` + resolución de hosting | PR #28/#29/#30 (16-17/07), repetido consistentemente como pendiente manual grande | **Sigue apagado**, sin decisión de hosting — consistente en todos los docs, correctamente diferido, sin contradicción | Ninguna acción de esta auditoría — es una decisión de negocio de Lautaro |
| Render en navegador de la Fase 2 de empresas (`/comercio/empresas`, `/comercio/senal`) | PR #34 (19/07): "Render en navegador: NO se hizo… validar en el Preview" | **Nunca se confirmó explícitamente** — y de hecho la página estuvo efectivamente rota (timeout `djve_cobertura`, HTTP 57014) desde ese mismo 19/07 hasta que **E2 la arregló por otra vía** el 21/07 (no porque alguien siguiera la promesa de validar el Preview) | Ninguna acción — ya arreglada por E2; sirve como evidencia del patrón de proceso #1 (ver abajo) |
| Ítems v2 de gráficos (URL modo Período, ratio/base %, export PNG/CSV, media móvil, volumen/OI, presets de usuario, P12/P17, import 2018/19, guard "parcial") | PR #19 (11/07) | **Ninguno implementado** (verificado por grep: no hay persistencia de URL del modo Período, no hay export, no hay media móvil ni ratio en %) — mapeados a **P6** en `PLAN_BACKLOG.md` | Ejecutar P6 cuando Lautaro priorice (el propio P6 espera ejemplos de Lautaro para P12/P17) |
| Routine semanal del view de mercado (MP3) | PR #53/#54 (21/07): "único pendiente = que Lautaro cree la Routine" | **Confirmado que no existe** — `list_triggers` no muestra ningún cron recurrente para esto, solo recordatorios `send_later` ya disparados de sesiones anteriores | Ninguna acción — Lautaro tiene que crearla, prompt ya está escrito |
| Research P3 (compras BCRA)/P4 (camiones en puerto): fase build | PR #52 (21/07) | Esperando el OK de Lautaro a las preguntas de los informes `negocio/07`/`negocio/08` | Ninguna acción — gate correcto, reciente |
| Camino al encendido del login: coherencia RLS con datos que hoy son públicos por `AUTH_ENFORCED` apagado | PR #30, retomado en E1 (21/07) | **Diferido explícitamente a E5** por E1 (con motivo documentado: la web lee con la anon key server-side, no con el JWT — revocar rompería todo) | Ninguna acción de esta auditoría — ya tiene dueño (E5) |
| Backfill histórico DEA por PDFs mensuales, candidato `ingest-amis.mjs` (FAO-AMIS tier-2) | Sesión 12/07-estimaciones-argentina/usda-conab, marcados "opcional" | Sin novedad, siguen como mejoras opcionales no priorizadas | Ninguna acción — no bloquean nada |
| Girasol/sorgo en el selector de "Negocios de planta" | PR #18 (11/07), "pendiente menor" | Sin novedad — sigue sin agregarse (bajo impacto, decisión de Lautaro de no priorizarlo) | Preguntar si sigue interesando o se cierra sin hacer |

## Dudas / decisiones para Lautaro

> Respondidas en la misma sesión (Fase 1 → OK → Fase 2, todo en el mismo PR).

1. **DEA-SAGyP (hallazgo #1):** ✅ Lautaro pidió re-correr el dispatch ahora — se hizo (run
   `29861219905`, 21/07) y **falló con el mismo error** que las corridas del 16/07 y 17/07 (timeout de
   conexión a `datosestimaciones.magyp.gob.ar:443`). Confirmado que no es transitorio; queda diferido
   a **E5** para la mitigación (reintentos+backoff o Edge Function como `lineup-ingest`).
2. **PAS (hallazgo #2):** ✅ Lautaro confirmó cerrar la promesa y usar el respaldo por mail — docs
   actualizados en Fase 2 (`ESTADO.md`/`CONTEXTO.md`/`PLAN_CALENDARIO_PRODUCCION.md`/`PLAN_BACKLOG.md`).
   Falta que Lautaro se suscriba al informe PAS por mail (paso manual suyo, fuera del alcance del repo).
3. **Uploader de `/admin/datos`:** sigue sin confirmar si Lautaro ya lo probó logueado — no se resolvió
   en esta ronda de preguntas; queda anotado en la tabla de promesas abiertas para la próxima sesión.
4. **Lista única de pendientes:** ✅ Lautaro dio el OK — `CONTEXTO.md`, `ESTADO.md` y `PLAN_BACKLOG.md`
   actualizados en Fase 2 (ver «Propuesta de lista única»).

## Lo que está BIEN (no tocar)

- **53/54 PRs mergearon limpio**; el único cerrado sin merge (#2, "Calculadoras conectadas a la
  curva real de A3") tuvo su contenido rescatado el mismo día en el PR #4 — no se perdió nada. El
  patrón "PR#2→#4" que la auditoría venía a buscar como riesgo resultó estar bien manejado desde el
  primer día.
- El protocolo de sesión (`ESTADO.md` §1-5) se siguió con disciplina real: cada sesión leyó el estado
  anterior, dejó doc de sesión, actualizó «Ahora», y el patrón informe→OK→corrección se sostuvo en
  las auditorías E1/E2 tal como estaba diseñado.
- Las decisiones de alcance (recortes, exclusiones, "esto queda para después") quedaron consistentemente
  **documentadas y citables** en cada PR — no hay casos de alcance que se haya recortado en silencio.
- `PLAN_BACKLOG.md` (21/07) ya resuelve de fondo el problema de las 3 listas paralelas (hallazgo #5) —
  solo falta que los docs viejos apunten ahí; el trabajo de diseño ya está hecho.
- El `Wayback` de `compras` es un buen ejemplo de cómo SÍ se cierra un camino descartado: probado,
  documentado como callejón sin salida, con "NO reintentar" explícito — cero ambigüedad para la
  próxima sesión.

## Propuesta de lista única

`PLAN_BACKLOG.md` (creado 21/07) ya es, de hecho, la tabla de mapeo que este hallazgo pide — cubre
los 21 ítems del backlog de `ESTADO.md`, los 8 de `CONTEXTO.md` y los 8 de la lista v2 de gráficos,
apuntando cada uno a su plan (auditoría E3/E4/E5, MP1-4, o un prompt P1-P12 nuevo). Falta un solo
paso de higiene: que los documentos viejos dejen de mantener su propia copia y apunten ahí.

**Propuesta concreta (Fase 2, si Lautaro aprueba):**
1. `CONTEXTO.md` → reemplazar toda la sección `## Pendientes (lista canónica — actualizada 09/07/2026)`
   por 2-3 líneas: *"El backlog vivo vive en `ESTADO.md` («Plan RF AGRO») y su mapeo completo con
   prompts de ejecución en `PLAN_BACKLOG.md`. Esta sección se retiró el 21/07/2026 para no duplicar."*
2. `ESTADO.md` → la sección *"Pendiente del panel de gráficos (v2…)"* pasa a una sola línea: *"Ver
   **P6** en `PLAN_BACKLOG.md` (mapeo completo, 21/07)."*
3. `ESTADO.md` → el backlog «Plan RF AGRO» (bloques 1-4) queda como el ÚNICO checklist vivo con
   checkboxes (ya lo es de hecho); se le agrega una línea al inicio: *"Mapeo completo + prompts de
   ejecución de cada ítem → `PLAN_BACKLOG.md`."*
4. Regla nueva para el futuro (sumar a `ESTADO.md` §1-5): *"`CONTEXTO.md` no vuelve a tener su propia
   lista de pendientes — todo pendiente nuevo se agrega al backlog de `ESTADO.md` y, si hace falta un
   prompt propio, a `PLAN_BACKLOG.md`."*

## Higiene de ramas remotas (comandos para que los corra Lautaro — esta sesión NO borra nada)

Las 7 ramas con PR ya mergeado, listas para borrar:

```bash
git push origin --delete claude/auditoria-e1-datos-vjmwzd      # PR #50, mergeado 21/07
git push origin --delete claude/e2-formulas-go9i9y              # PR #51, mergeado 21/07
git push origin --delete claude/trading-project-audit-37aiqr    # PR #49, mergeado 21/07
git push origin --delete claude/research-p3-p4-phases-u4e8k3    # PR #52, mergeado 21/07
git push origin --delete claude/mp3-lee-prompt-th37ix           # PR #53, mergeado 21/07
git push origin --delete claude/mp3-cierre-post-merge           # PR #54, mergeado 21/07
git push origin --delete claude/pendientes-4c5ovu               # PR #48, mergeado 20/07
```

(No incluye `claude/auditoria-e6-historia-yk24fj`, la rama de esta sesión, ni `main`.)

## Docs de planes 100% ejecutados — candidatos a marcar cerrados

| Doc | Evidencia de cierre | Acción propuesta |
|---|---|---|
| `PLAN_BASES_GRAFICOS.md` | El propio doc y `ESTADO.md` lo declaran completo ("✅ LAS 3 BASES DE GRÁFICOS ESTÁN COMPLETAS… ya no queda nada pendiente") | Ya tiene el banner correcto — sin acción |
| `PLAN_PUERTOS.md` | Fases 0-4 hechas (18-19/07); doc sin tocar desde el 18/07 (hallazgos #3 y #4) | Actualizar banner + Fase 4 + §6, ver hallazgos #3/#4 |
| `PLAN_UX_NAVEGACION.md` | 6/6 fases hechas, PR #22 mergeado, sin pendientes citados en sesiones posteriores | Agregar banner "PLAN COMPLETO" si Lautaro quiere, no es urgente |
| `PLAN_MONITOR_MERCADOS.md` | Hecho y mergeado (PR #42, 20/07), sin pendientes fuera de mejoras "post-v1 opcionales" | Agregar banner "PLAN COMPLETO (mejoras opcionales en PLAN_BACKLOG P1)" |
| `PLAN_ORGANIZACION_REPO.md` | Histórico, switch a `main` completado y verificado (09/07) | Ya es puramente histórico — sin acción |
| `PLAN_CALENDARIO_PRODUCCION.md` | Núcleo completo (Sesiones A+B+C); solo falta PAS, que ya tiene dueño (E5, y hallazgo #2 de esta etapa lo cierra) | Actualizar cuando se cierre formalmente el PAS |
| `PLAN_GRAFICOS_SPREADS.md` | Core (Fase 0+1) completo y en producción; v2 mapeado a P6 | Sin acción — ya referencia correctamente sus pendientes |

## Para E5 (hallazgos que le corresponden a infraestructura)

- **DEA-SAGyP en rojo 2/2 corridas** (hallazgo #1) — el healthcheck necesita un umbral más chico para
  `DEA` o una alerta de "N corridas seguidas en rojo" (ya estaba pedido como semilla de E5; esta
  etapa aporta el caso real que lo confirma con evidencia).
- **PAS confirmado no-automatizable** (hallazgo #2) — E5 puede cerrar la decisión operativa (mail
  vs. reintentar) con esta evidencia ya en mano, sin tener que re-correr el probe.

## Para E3 (hallazgos que le corresponden a UX)

- La pizarra de la cinta (`market.ts:250-252`, `sample:true`) y `implicitas-panel.tsx` con
  `sample.ts` siguen exactamente igual que en la semilla de `PLAN_AUDITORIA.md` — verificado, sin
  cambios desde que se escribió esa semilla. `CONTEXTO.md` ya lo documenta correctamente en su tabla
  de módulos ("Pizarra en la cinta = ejemplo (falta usar CAC)") — no hay contradicción de docs acá,
  solo falta que E3 decida qué hacer con eso.

## Patrones de proceso (2-3 mejoras al protocolo de `ESTADO.md`)

1. **"Verificación prometida, nunca corrida" se repite** (A3 puntas en rueda con datos reales, render
   en navegador de la Fase 2 de empresas, log del probe de PAS, uploader logueado por Lautaro): la
   promesa queda enterrada en un párrafo largo de la sección «Ahora» y ninguna sesión posterior la
   vuelve a levantar hasta que, por casualidad, otro trabajo la toca (como pasó con `/comercio/empresas`,
   arreglada por E2 sin que nadie hubiera ido a confirmar el Preview). **Propuesta:** agregar a
   `ESTADO.md` una sub-sección fija y corta, tipo checklist, **"Verificaciones pendientes"** (separada
   de la prosa de «Ahora»), donde cada ítem se tacha SOLO cuando una sesión registra el resultado con
   evidencia (no con "listo, sigue").
2. **Migraciones aplicadas por `execute_sql` en vez de `apply_migration`** por la caída recurrente del
   canal de aprobación del MCP (mencionado en al menos 6 sesiones distintas desde el 16/07) generan
   drift entre el nombre de archivo commiteado y el version real en Supabase (hallazgo #8).
   **Propuesta:** cuando se use `execute_sql` como workaround de una migración, pasarle el mismo
   timestamp del nombre de archivo si la herramienta lo permite, o dejar un comentario en el propio
   `.sql` con el version real aplicado.
3. **Ramas/docs de plan sin actualizar tras las fases finales** (`PLAN_PUERTOS.md` es el caso
   confirmado, hallazgos #3/#4): cuando un plan tiene fases y cada fase se ejecuta en una sesión
   distinta, la última sesión de la serie debería volver al doc de plan original y marcar todas las
   fases + cerrar la sección de riesgos abiertos, no solo actualizar `ESTADO.md`. **Propuesta:**
   agregar al protocolo (`ESTADO.md` §3) un paso explícito: *"si esta sesión cierra la ÚLTIMA fase de
   un `PLAN_*.md`, volver a ese archivo y marcarlo completo (banner + cada fase), no alcanza con
   `ESTADO.md`."*

## Fase 2 — correcciones implementadas

| # hallazgo | Qué se hizo | Verificación |
|---|---|---|
| 1 (DEA-SAGyP) | Re-corrido `workflow_dispatch` de *Ingesta estimaciones Argentina* en `main` (run `29861219905`) para descartar timeout transitorio. | Falló con el mismo `ConnectTimeoutError` que las corridas del 16/07 y 17/07 — confirmado persistente. Diferido a E5 para la mitigación (no se tocó código de ingesta en esta etapa: E6 es de historia, no de infraestructura). |
| 2 (PAS) | `docs/PLAN_CALENDARIO_PRODUCCION.md` (nota de Cloudflare confirmado + punto 6.3), `docs/CONTEXTO.md` (2 menciones), `docs/PLAN_BACKLOG.md` (fila de la tabla de mapeo) actualizados de "pendiente de validar" a "descartado, confirmado 2/2". | Releído cada archivo tras el edit; sin menciones vivas de "PAS pendiente de validar" fuera de las secciones históricas frozen de `ESTADO.md` (que quedan como registro de lo que se sabía en su momento). |
| 3/4 (PLAN_PUERTOS.md) | Banner actualizado a "PLAN COMPLETO", Fase 4 marcada `✅ HECHA (19/07)` con el resumen real, ítem 1 de "Abiertos/riesgos" tachado con la cita de la decisión (PR #34). | Releído el archivo completo tras los 3 edits. |
| 5 (lista única) | `docs/CONTEXTO.md` § Pendientes reemplazada por un pointer a `ESTADO.md`+`PLAN_BACKLOG.md` con la regla "no se vuelve a duplicar"; `docs/ESTADO.md` § gráficos v2 comprimida a un pointer a **P6** de `PLAN_BACKLOG.md`. | Releídos ambos archivos; `PLAN_BACKLOG.md` no se tocó (ya cubría el mapeo). |
| 6 (ramas) | No se borró ninguna rama (regla del plan) — comandos `git push origin --delete` listos en este mismo informe para que los corra Lautaro. | — |
| 7 (tabla ramas obsoleta) | La tabla "Ramas vivas y su veredicto" de `ESTADO.md` (sección histórica 12/07) se reemplazó por una nota de "congelada" con link a este informe. | Releído. |
| 8 (migraciones con version distinto) | Comentario agregado en los 3 archivos `.sql` afectados (`20260720120000_admin_carga_compras.sql`, `20260720150000_compras_avance_todas_fuentes.sql`, `20260721120000_e2_djve_cobertura_matview.sql`) con el version real aplicado. | Releídos los 3 archivos; no se tocó ninguna sentencia SQL, solo comentarios. |
