# ESTADO — tablero vivo del repo (leer SIEMPRE antes de trabajar)

> Este archivo es cómo se comunican las sesiones de trabajo entre sí. Cada sesión lo lee al arrancar
> (entra automáticamente vía `CLAUDE.md`) y lo actualiza al cerrar. Es CORTO a propósito: la foto de
> **ahora**. El manual estable del proyecto es [`CONTEXTO.md`](CONTEXTO.md); el detalle de cada sesión
> vive en [`sesiones/`](sesiones/).

## Protocolo de sesiones (obligatorio)
1. **Al arrancar**: leer este archivo + la última entrada de `docs/sesiones/`. Trabajar en una rama
   `claude/*` creada **desde `main`**. Si la rama de la sesión no sale de `main` actualizado, rebasear
   primero (`git fetch origin main && git rebase origin/main`).
2. **Durante**: commits chicos y frecuentes. `npm run lint` + `npx tsc --noEmit` + `npm run build` antes
   de pushear (el CI corre eso mismo).
3. **Al cerrar**: en el MISMO PR de la sesión —
   - crear `docs/sesiones/AAAA-MM-DD-tema.md` (copiar [`sesiones/_TEMPLATE.md`](sesiones/_TEMPLATE.md));
   - actualizar la sección **«Ahora»** de este archivo (qué quedó hecho, qué quedó en vuelo);
   - tocar `CONTEXTO.md` SOLO si cambió algo estable (stack, fuentes, fórmulas, reglas).
4. **PRs**: un PR por sesión, **base `main`**, draft hasta que esté verificado. NUNCA contra otra rama.
5. **Prohibido**: pushear a `main` directo · abrir PRs contra ramas `claude/*` · duplicar apuntes de
   sesión en `CONTEXTO.md` (van en `sesiones/`).

## Ahora (última actualización: 22/07/2026 — auditoría E5 infra CERRADA (fase 1+2, quedan pasos manuales de Lautaro en la guía) · auditoría E4 código CERRADA (fase 1+2) · auditoría E3 UX FASE 1+2 HECHAS · auditoría E6 historia CERRADA · MP3 view de mercado MERGEADO · research P3/P4 HECHO · auditoría E2 CERRADA)

**🏗️ AUDITORÍA E5 (infraestructura, ingestas y seguridad operativa) — CERRADA (fase 1 + fase 2,
TODO aprobado por Lautaro el 22/07) — rama `claude/auditoria-e5-infra`, PR #58.** Quinta etapa de la
auditoría integral: 14 ingestas × ~120 runs reales de Actions + monitoreo + crons + secretos + camino
del login + hosting. Informe: **[`auditoria/E5-infra.md`](auditoria/E5-infra.md)** (14 hallazgos + 22
caminos de falso-verde + salud por workflow + hosting con precios verificados). **Fase 1 — lo más
grave que apareció:** (1) la fase 2 de E1 **borró sin saberlo la semana real del 15/07 de `compras`**
(`delete where fuente='MAGYP'` sin filtro; el cron del lunes ya había cargado 23 filas reales + 7
basura de un 2º grupo de paneles viejo de la página MAGyP) — se auto-repara el jueves 23/07; (2)
`ingest-lineup` **rojo 6/6** (la RPC de refresh creció a 6 matviews y el `statement_timeout=8s` de
PostgREST la mataba); (3) el revoke de E1 sobre `ingest_cierres_cem` **neutralizado por el grant a
PUBLIC** (anon la ejecutaba — test empírico); (4) prender `AUTH_ENFORCED` **rompía la Routine MP3**
(el proxy bloqueaba `/api/views/insumos` antes del token); + DEA caída 4/4, alertas de un solo canal,
hardcodeos con vencimiento sin aviso, pizarra T-1, INFORME_TOKEN por query. **Verificado BIEN:** cero
secretos en 139 commits · crons sin líos de DST · cierres/cbot/conab/usda/noticias verdes de verdad ·
CONAB "vieja" es la fuente, no la ingesta · PAS ya cerrado por E6. **Fase 2 HECHA el 22/07 (todo
aprobado):** por MCP → `ALTER FUNCTION refresh_lineup_visitas SET statement_timeout='300s'` (refresh
medido 28,8 s, aplicado + refresh manual) · DROP `ingest_cierres_cem` · RLS initplan `(select
auth.uid())` · **Edge Function nueva `dea-fetch`** (sa-east-1, mismo remedio que ISA; `ingest-dea.mjs`
la invoca) · redeploy `lineup-ingest` v3 (auth por comparación de service key, adiós decode sin
firma). En el repo → **compras decisión (b)**: MAGyP sigue automática, parser descarta el grupo viejo
(verificado: 30→23 filas todas del 15/07), upsert `ignore-duplicates` (MAGyP solo inserta, Agrochat
manda) · **guards por componente** en GEA/pizarra/CBOT/cierres/noticias/USDA (los 22 caminos de
falso-verde del Anexo A) · **alertas Resend** en rojo (6 workflows críticos → lautaroronchi97@gmail.com)
· healthcheck ampliado (17 checks: +views_mercado, +vencimientos-futuro ≥180d, +seed-calendario ≥60d,
DEA 16d→9d) · `ingest-cierres.mjs` ahora **refresca `vencimientos` cada noche** desde CEM /symbols
(el CEM ya lista DIC27, el seed moría en SEP27) · test Vitest que exige `FERIADOS_AR` del año próximo
desde octubre · 4º cron de pizarra (18:00 ART, fin del T-1) · barrido de 13 workflows (permissions,
timeouts, concurrency —group `compras` compartido—, nvmrc, actions v5, `replace_legacy` default
false) · proxy deja pasar `/api/views|informes/*` (token es su auth) + cap 2 MB en POSTs públicos ·
`INFORME_TOKEN` por header Bearer + timingSafeEqual (skill MP3 y prompt MP1 actualizados) · CSP
Report-Only + HSTS · `src/lib/supabase.ts` prefiere `SUPABASE_SERVICE_KEY` (server-only) + migración
de **revoke de las 7 matviews de mesa versionada SIN aplicar** (se aplica en el encendido). **Hosting
DECIDIDO: Vercel Pro $20/mes 1 asiento + gru1 + spend limit, se contrata ANTES de clientes.**
**Próximo paso — pasos manuales de Lautaro, EN ORDEN, en la «Guía definitiva 22/07» al tope de
[`GUIA_LOGIN_SETUP.md`](GUIA_LOGIN_SETUP.md):** Parte A Vercel Pro → Parte B pre-encendido (mergear
PR #58 · `SUPABASE_SERVICE_KEY` en Vercel · secret `RESEND_API_KEY` en GitHub · dispatches de prueba
· aplicar revoke · leaked protection · borrar Edge Functions fantasma) → Parte C encendido del login.
Detalle: [`sesiones/2026-07-21-auditoria-e5-infra.md`](sesiones/2026-07-21-auditoria-e5-infra.md).

**🧑‍💻 AUDITORÍA E4 (código y arquitectura) — CERRADA (fase 1 + fase 2) — rama
`claude/auditoria-e4-codigo-p28mxd`, PR #55.** Cuarta etapa de la auditoría integral. **Fase 1**: 4
sub-auditorías en paralelo (duplicación · estructura/código muerto · tests/fixtures · calidad/perf) con
evidencia archivo:línea, 23 hallazgos. **Veredicto: código en buen estado general** (0 deps sin uso,
`server-only` bien aplicado, degradación uniforme con solo 2 `throw` sueltos en todo `src/lib/`, 0 casos
de N+1, `globals.css` bien organizado — 20 secciones, solo 3/500 clases muertas). Lo más grave: el
espejo `compras/parse-agrochat.ts` ↔ `scripts/cargar-compras.mjs` **ya había causado un bug real en
producción** (fix ÷1000 del 20/07 a mano en los dos lados) y tenía una divergencia nueva activa;
`lineup/campanas.ts` ↔ SQL `campana_ini_year` **ya divergían** (SOJA_CRUSH); un hallazgo de
**performance real**: todas las páginas públicas mandaban el SDK completo de Supabase (~235 KB) al
bundle del cliente por un import estático de `AuthMenu`. Lautaro contestó las dudas en el chat (sin
scrollear el informe) y aprobó todo salvo los refactors grandes → **fase 2 HECHA el mismo día**:
espejos con **import real** (`cargar-compras.mjs`/`ingest-noticias.mjs` ya no reimplementan, importan
`src/lib` directo — Node 22 puede importar `.ts` sin flags); **3 migraciones SQL** (SOJA_CRUSH en
`campana_ini_year` · función de chequeo de `ADMIN_SEED_EMAILS` · `compras.*` migrado a `numeric`, con
recreación de la matview `compras_avance_hist`); **`AuthMenu` con `next/dynamic({ssr:false})`** —
`/comercio` bajó de ~783 KB a **526 KB** First Load JS, `/graficos` de 1.150 KB a **911 KB**; los 11
quick wins restantes (dedup de helpers, `arNum` null-safe, try/catch en upload y proxy, `calc-planta.tsx`
extraído a lib, fallback de empresa unificado, código muerto borrado); y **Vitest completo**: 14
archivos, **91 tests verdes**, sobre las 12 libs puras aprobadas + `campanas.ts` + `dates.ts`, con los
fixtures exactos de `E2-formulas-fichas.md`, corriendo en CI. **Diferido a E7** (aprobado): partir
`market.ts` · unificar los 9 parsers de mes/posición A3 · motor de gráfico SVG compartido ·
`noUncheckedIndexedAccess`. **`sample.ts` (hallazgo #15) desbloqueado por la fase 2 de E3** (sacó la
serie de ejemplo de `implicitas-panel.tsx`, sample.ts quedó sin importadores) **→ borrado en esta misma
sesión**, al mergear ambas ramas. Informe: [`auditoria/E4-codigo.md`](auditoria/E4-codigo.md). Detalle:
[`sesiones/2026-07-21-auditoria-e4-codigo.md`](sesiones/2026-07-21-auditoria-e4-codigo.md).

**🖥️ AUDITORÍA E3 (UX / navegación) — FASE 1 (informe) + FASE 2 (fixes aprobados) HECHAS — rama
`claude/auditoria-e3-ux-auikht`, PR #57.** Recorrido de las ~38 rutas × 4 lentes (mesa · cliente · mobile
390px · tema claro/oscuro) con build local + datos reales + Playwright (152 capturas en
`auditoria/screenshots-e3/`; bypass local `E3_AUDIT_BYPASS` para las gateadas, revertido y git diff limpio).
**Veredicto: el sitio muy bien en lo grueso.** Informe con 11 hallazgos + 6 dudas:
**[`auditoria/E3-ux.md`](auditoria/E3-ux.md)**. **Lautaro aprobó y se implementó la FASE 2 en la misma rama:**
**H2** header mobile colapsa (fin del scroll horizontal ~95px en todas las `(site)`) · **H3** sacado "ISA
Agents" de los sellos de line-up (puertos → "Elaboración propia RF AGRO") · **H4** cinta con **pizarra real
de CAC** (soja 339,7, fin del ejemplo hardcodeado) · **H5** sacada la serie "Granos (ej.)" de Implícitas ·
**noindex global QUITADO** (ya no hay dato de ejemplo a la vista; las páginas de mesa mantienen el suyo) ·
**H7** DJVE oculta los ~70 productos sin actividad · **H8** `/produccion` en **pestañas Calendario/
Estimaciones** (fin del scroll de 20.000px) · **H9** **404 branded** (adiós al default de Next en inglés) ·
**H10** `granos/view` sin error crudo de Postgres · **H11** back-links redundantes fuera. Verificado en
navegador + lint/tsc/build ✅. **H1/H6** (`/comercio/embarques` vacía + RITMO de empresas en "—", por las
vistas `djve_embarques_mes`/`lineup_estacional` no materializadas que tiran **HTTP 500 bajo concurrencia**):
**migración `20260721180000` APLICADA por MCP (a pedido de Lautaro) y verificada** — las dos pasaron a
matview y ahora aguantan la concurrencia (0/12 fails, antes 12/12 y 10/10 en 500). Las páginas se pueblan
en la próxima regeneración ISR / al mergear a `main`. **Pendiente menor:** **H12** (`/graficos` overflow
mobile por su chart, no aprobado) · **D6** montos "VIEJA" de empresas → E1/E2. Detalle:
[`sesiones/2026-07-21-auditoria-e3-ux.md`](sesiones/2026-07-21-auditoria-e3-ux.md).

**🕰️ AUDITORÍA E6 (historia del repo) — CERRADA — rama `claude/auditoria-e6-historia-yk24fj`, PR
#56.** Recorridos los 54 PRs y las 29 bitácoras de `docs/sesiones/` en orden cronológico.
**Hallazgo operativo (no documental) más importante: la ingesta DEA-SAGyP viene fallando por timeout
de conexión** a `datosestimaciones.magyp.gob.ar` — nadie lo había notado en 5 días (ni la auditoría
E1 del mismo 21/07); el dato de DEA quedó parado en el snapshot del 13/07. Se re-corrió el dispatch
en esta sesión para descartar que fuera transitorio: **falló una 3ª vez con el mismo error**,
confirmado persistente → **diferido a E5** para la mitigación (reintentos/backoff o mover a Edge
Function, como ya se hizo con `lineup`/ISA). **Segundo hallazgo: el probe de PAS (BCBA) ya había
corrido el 12/07 y ya había contestado** (HTTP 403, Cloudflare bloquea también las IPs de GitHub
Actions) — nadie leyó el log en 9 días; **cerrado formalmente** (`ESTADO.md`/`CONTEXTO.md`/
`PLAN_CALENDARIO_PRODUCCION.md`/`PLAN_BACKLOG.md` actualizados, respaldo = mail de Lautaro). Además:
**`PLAN_PUERTOS.md` corregido** (quedó sin tocar desde el 18/07 pese a que sus Fases 2-4 se
completaron los días siguientes — banner y Fase 4 actualizados) · **lista única de pendientes**
(`CONTEXTO.md` retiró su propia sección «Pendientes», apunta a este archivo + `PLAN_BACKLOG.md`; la
lista v2 de gráficos de acá apunta a **P6**) · **7 ramas remotas con PR ya mergeado sin borrar**
(comandos en el informe, sin borrar ninguna) · tabla "Ramas vivas" vieja de este archivo marcada
obsoleta · 3 migraciones con version de Supabase distinto al nombre de archivo, comentadas. Lo bueno
verificado: 53/54 PRs mergearon limpio (el único cerrado sin merge, #2, tuvo su contenido rescatado
sin pérdida) y el protocolo de sesión se sostuvo con disciplina real. **Pendiente real que sigue
abierto**: si Lautaro ya probó el uploader de `/admin/datos` logueado (sin confirmar). Informe:
[`auditoria/E6-historia.md`](auditoria/E6-historia.md).

**🔮 MP3 — VIEW DE MERCADO POR GRANO (PLAN_INFORMES) — CÓDIGO EN `main`, PENDIENTE 1 PASO MANUAL DE
LAUTARO: crear la Routine semanal.** Lautaro validó el primer view en `/granos/view` y se mergeó el
PR #53 (rama `claude/mp3-lee-prompt-th37ix`). **Único pendiente que queda: crear la Routine semanal**
(cron `0 12 * * 5` = 9:00 ART viernes, modelo Opus/Fable) desde su sesión de Claude, con las env vars
`INFORME_BASE_URL`/`INFORME_TOKEN` (mismo valor en Vercel)/`SUPABASE_URL`/`SUPABASE_SERVICE_KEY`
configuradas en el entorno — **prompt exacto listo** en
[`sesiones/2026-07-21-informes-mp3-view-mercado.md`](sesiones/2026-07-21-informes-mp3-view-mercado.md#quedó-pendiente--en-vuelo).
Sin la Routine, el view no se regenera solo — hay que dispararla a mano o esperar a que Lautaro la cree.

Se ejecutó el PROMPT MP3 **antes
que MP1** (pedido explícito; la dependencia era blanda — MP3 solo reusa el patrón). **Base**: tabla
`views_mercado` (migración `20260721150000`, APLICADA por `execute_sql` — el canal de aprobación del
MCP sigue caído) con RLS interno-mesa DE VERDAD (SELECT solo admin por `is_admin()`, anon revocado;
feedback por RPC `admin_feedback_view` con guard). **Código**: endpoint `/api/views/insumos?token=`
(env `INFORME_TOKEN`, patrón del `/api/informes/datos` de MP1) que junta TODOS los insumos reusando
las libs reales (temperatura/semaforo/empresas/embarques/negociado/estimaciones/curva/pases/
arbitrajes/capacidad/pizarra/chicago/dólar/noticias/agenda) · skill **`.claude/skills/view-mercado/`**
(procedimiento semanal + loop de calibración por feedback + regla dura "ni un número inventado") ·
página **`/granos/view`** (`requireAdmin` SIEMPRE): view vigente por grano + historial + **campo de
feedback de Lautaro** (server action → RPC), links desde `/granos` y `/comercio/temperatura`.
**Primer view REAL guardado (21/07)**: soja **ALCISTA 4/5** (crush MESA 85,1 CALIENTE · farmer pctl
0 · DJVE 60d ratio 0,08 · FAS +2,1 vs pizarra · Chicago 449,3) · maíz **NEUTRAL 3/5** (demanda corta
8,58 Mt declaradas vs 2,34 originadas PERO cosecha récord 68 Mt y Chicago flojo) · trigo **NEUTRAL
3/5** (line-up pctl 93 firme HOY pero gap cerrándose y programa AGO chico; "VENDER YA" compartido).
Verificado: lint/tsc/build ✅ · RLS por SQL (anon denied, no-admin 0 filas/"solo admin") · números
1:1 vs insumos/SQL · navegador claro/oscuro (bypass y policy temporales revertidos). **Próximos
pasos: (1) Lautaro lee `/granos/view` logueado y deja feedback → OK → merge; (2) post-merge crea la
Routine semanal** (cron `0 12 * * 5` = 9:00 ART viernes, modelo Opus/Fable, prompt en el doc de
sesión) con env vars `INFORME_BASE_URL`/`INFORME_TOKEN` (mismo valor en Vercel)/`SUPABASE_URL`/
`SUPABASE_SERVICE_KEY` en el entorno de Claude. La sección del semanal la integra MP2. Detalle:
[`sesiones/2026-07-21-informes-mp3-view-mercado.md`](sesiones/2026-07-21-informes-mp3-view-mercado.md).

**🔎 RESEARCH P3 (compras netas BCRA) + P4 (camiones en puerto) — HECHO, build espera OK de Lautaro —
rama `claude/research-p3-p4-phases-u4e8k3`, PR #52.** Solo docs (pedido explícito: fases de research de
`PLAN_BACKLOG.md`, cero código). **P3** → [`negocio/07_fuente_compras_netas_bcra.md`](negocio/07_fuente_compras_netas_bcra.md):
la **API v4 del BCRA ya tiene el dato oficial** — var 78 "Variación de reservas internacionales por
compra de divisas" (diaria, M USD, 2003→hoy = 5.768 filas, backfill en 2 requests, rezago ~3 hábiles).
Semántica verificada 1:1: es la compra neta al **sector privado** (el MULC), var 78 = var 47 ÷ TC
mayorista SIEMPRE, incluso los 14 días desde 2025 con operaciones al Tesoro (var 48) ≠ 0. X/medios
descartados para automatizar; volumen MAE queda como color del día. **P4** →
[`negocio/08_fuente_camiones_puerto.md`](negocio/08_fuente_camiones_puerto.md): **SAGyP/MAGyP publica
la entrada diaria de camiones** por zona portuaria (4) y producto (6) + vagones + camiones en playa
(página de logística, mismo dominio que `ingest-compras.mjs`), **rezago 1 día hábil** (al 21/07 llegaba
al 20/07) y con **historia diaria 2018→hoy en ~103 PDFs mensuales** (formato estable verificado en
ambas puntas; identidades zona=producto=total cierran; extractor de PDF sin dependencias probado).
BCR = solo prosa · dataPORTUARIA = noticias · CKAN MAGyP muerto → descartadas. Cada informe cierra con
comparativa + arquitectura del build + **preguntas abiertas para Lautaro** (P3: ¿alcanza rezago 3
hábiles o quiere carga manual del día? · P4: visibilidad solo-mesa vs pública, alcance del backfill).
**Próximo paso: Lautaro responde esas preguntas → recién ahí correr las fases build** (prompts P3/P4
de `PLAN_BACKLOG.md`, tablero actualizado). Detalle:
[`sesiones/2026-07-21-research-p3-p4.md`](sesiones/2026-07-21-research-p3-p4.md).

**🧮 AUDITORÍA E2 — CERRADA (fase 1 + fase 2) — rama `claude/e2-formulas-go9i9y`, PR #51.**
Lautaro contestó los 6 hallazgos y las 11 preguntas en bloque (21/07) y la FASE 2 quedó implementada:
**base** — `djve_cobertura` materializada (migración `20260721120000`, aplicada por MCP: anon pasó de
timeout 57014 a HTTP 200 en 2,5 s → `/comercio/empresas` y `/comercio/senal` vuelven) + refresh de las
matviews gap/densidad (al 20/07). **Código** — UST$T fijado a plazo `000` (T+0, su referencia) ·
picker de calculadoras con vencimiento REAL de `vencimientos` (TNA alineada con el panel) · pases:
se AGREGARON los consecutivos (SEP/NOV etc.) · aforo pasó a % RELATIVO (183,8% aforo 2 → 180,17%) ·
semáforo: soja en equivalente poroto (unificado con temperatura) · estrategias: 4 presets nuevos (31),
"Máx. pérdida/ganancia" con extremos REALES ("ilimitada" / payoff en P=0) + nota "primas estimativas".
**Docs** — plan calendario y FORMULAS_EXCEL corregidos (BCR ADELANTA por feriado — verificado con el
GEA real del 08/07; fórmula vigente de negocios-con-pagos), comentarios obsoletos limpiados.
**Diferido:** calibración de umbrales de cobertura y parámetros MESA (provisorios, marcados en código)
+ comisiones de estrategias → **E7** · tests con los fixtures de las 45 fichas → **E4** · causa raíz del
refresh que no corrió el 20/07 + `lineup_estacional` intermitente → **E5**. Planes Cocos Gold/Pro → no.
Detalle FASE 1 abajo; informe con decisiones: [`auditoria/E2-formulas.md`](auditoria/E2-formulas.md).

**🧮 AUDITORÍA E2 (fórmulas y lógica de negocio) — FASE 1 (el informe) — rama
`claude/e2-formulas-go9i9y`.** Se auditó TODO el inventario del PROMPT E2 con verificación adversarial
(derivar desde docs → comparar código → ejemplo numérico con datos reales → bordes). **Veredicto: cero
bugs de fórmula en 45 fichas** — INTRATE act/365 1:1 en todas las libs, base 365 consistente, guards
completos, paridad server/cliente exacta, controles históricos reproducidos (Excel 125,6 y 0,5796 ·
trigo 16.238.900 t · pctl 59/23 · cumplimiento 146% · `campanas.ts` 612/612 vs SQL · factores CBOT
idénticos). Lo que apareció: **1 bug de RUNTIME** (`djve_cobertura` timeout 57014 por anon desde el
backfill 2011-2025 → **`/comercio/empresas` y `/comercio/senal` degradan HOY**; fix = materializar
patrón `lineup_visitas`), matviews gap/densidad al 16/07 vs line-up 20/07 (refresh no corrió → E5),
2 desfasajes doc↔código (el corrimiento por feriado del calendario está BIEN en el código —
verificado contra el GEA real del 08/07 — y mal en el plan; FORMULAS_EXCEL r27-36 documenta la
fórmula vieja de negocios-con-pagos), y **11 PREGUNTAS de criterio** para Lautaro (las top: dos filas
`UST$T` T+0/T+1 en MAE que mueven la TNA corta ~3,7 pp · picker de curva fin-de-mes vs vto real
(−0,8 pp TNA) · umbrales/pesos/rindes heredados del Python sin validar · primas default de
estrategias). Informe: **[`auditoria/E2-formulas.md`](auditoria/E2-formulas.md)** + anexo
[`auditoria/E2-formulas-fichas.md`](auditoria/E2-formulas-fichas.md) (45 fichas con números exactos =
fixtures para los tests de E4). **Las decisiones ya están tomadas y aplicadas — ver el bloque de
cierre arriba.** Detalle:
[`sesiones/2026-07-21-auditoria-e2-formulas.md`](sesiones/2026-07-21-auditoria-e2-formulas.md).

**🗃️ AUDITORÍA E1 (datos y base de datos) — CERRADA — rama `claude/auditoria-e1-datos-vjmwzd`, PR #50.**
Primera etapa de la auditoría integral ejecutada. **Veredicto: los datos guardados son correctos y fieles a
la fuente** — cotejo 1:1 exacto con requests reales (futuros ↔ CEM 11/11 filas, pizarra ↔ CAC $495.000 soja
17/07, CBOT ↔ Barchart 1203 ¢/bu → 442,03 USD/tn, compras ↔ trigo 25/26 Export 16.238.900 t); matviews
frescas; la limpieza monótona de compras clampea los defectos viejos. Lo que fallaba era de **modelo,
gobierno y monitoreo**. Informe: **[`auditoria/E1-datos.md`](auditoria/E1-datos.md)** (9 hallazgos + Anexo A
DDL vivo de las 5 tablas heredadas + Anexo B frescura). **Fase 2 aplicada** (por MCP + versionada): revoke
`ingest_cierres_cem` a anon (era ejecutable sin guard + INSERT/HTTP → anon ahora 404); borradas 7 filas
huérfanas `fuente=MAGYP`; `campana_ini_year` con search_path; índice en `profiles.approved_by` + drop
`idx_lineup_port` muerto; clamp del único saldo negativo; **healthcheck** ahora cubre `djve`+`compras`+3
checks de matview-refrescada (15 verdes); **migración-baseline** del DDL heredado. **DIFERIDO a E5:** el
cierre RLS de `lineup`+matviews de mesa — las páginas `/comercio/*` las leen con la **anon key server-side**
(no con el JWT), así que revocar las rompería; se cierra al prender el login. **Para E4:** `compras` en
`double precision` vs `numeric`, `campana_ini_year` duplicada en `campanas.ts`. Detalle:
[`sesiones/2026-07-21-auditoria-e1-datos.md`](sesiones/2026-07-21-auditoria-e1-datos.md).

**🔍 PLAN DE AUDITORÍA INTEGRAL (solo docs, cero código) — rama `claude/trading-project-audit-37aiqr`.**
Lautaro pidió auditar TODO el proyecto (módulos, fórmulas, páginas navegadas, base de datos, infra,
historia) planificando primero, sin tocar una línea. Resultado: **[`PLAN_AUDITORIA.md`](PLAN_AUDITORIA.md)**
— 7 etapas con **un prompt autocontenido por etapa** para ejecutar en sesiones nuevas (E1 datos/base →
E2 fórmulas → E3 UX 4 lentes → E4 código → E5 infra/seguridad → E6 historia por PR → E7 síntesis +
backlog maestro), con flujo *informe → OK de Lautaro hallazgo por hallazgo → recién corregir* y plantilla
en `auditoria/_TEMPLATE.md`. Se relevó base para no re-descubrir: `src/` completo (fórmulas localizadas
archivo:línea), 14 ingestas/13 workflows/21 migraciones, y la base viva por MCP (advisors ya marcaron:
matviews de mesa legibles por anon vía API, ~17 RPC SECURITY DEFINER ejecutables por anon/authenticated,
5 tablas heredadas sin DDL en el repo, healthcheck sin cubrir compras/djve/matviews) — todo precargado
como "semilla" en los prompts. **Próximo paso: ejecutar el PROMPT E1** de `PLAN_AUDITORIA.md` en una
sesión nueva. Detalle: [`sesiones/2026-07-21-plan-auditoria.md`](sesiones/2026-07-21-plan-auditoria.md).

**📰 PLAN DE INFORMES AUTOMATIZADOS (ítems 11 y 21) — misma sesión y PR #49.** Segundo plan del día:
**[`PLAN_INFORMES.md`](PLAN_INFORMES.md)** — 4 mini-proyectos con un prompt autocontenido c/u:
**MP1 informe diario** (placa PNG para WhatsApp: datos de la web + "color de la rueda" que Lautaro
carga en /admin + prosa `voz-lautaro` molde "Mesa de operaciones") → **MP2 informe semanal** (PDF
research 3-5 páginas; cierra de paso el ítem 13) → **MP3 view de mercado por grano** (alcista/bajista/
neutral con research citando datos de la web; interno mesa primero) → **MP4 interpretación de informes
de organismos** (ítem 21; borrador → OK en /admin → publica en /produccion). **Worker = Routines de
Claude Code** (sesiones programadas, corren con la suscripción de Lautaro — decisión: no gastar en
API; OpenRouter evaluado y descartado, plan B = GH Actions + API Anthropic documentado). Render =
página Next oculta que reusa libs + CSS reales; entrega = Resend + página `/informes`. **Próximo paso
de este plan: ejecutar el PROMPT MP1** (antes, Lautaro configura las env vars del entorno de Claude
Code — listadas en el plan).

**🗂️ PLAN DEL BACKLOG COMPLETO — misma sesión y PR #49.** Tercer plan del día:
**[`PLAN_BACKLOG.md`](PLAN_BACKLOG.md)** — tabla de mapeo de TODOS los pendientes a su plan (los ya
cubiertos apuntan a auditoría E3/E4/E5 o a informes MP1-4, sin duplicar) + **12 prompts autocontenidos
P1→P12** para los que no tenían: P1 Merval/EWZ/vol. Matba · P2 variación semanal USD · P3 compras
netas BCRA · P4 camiones en puerto · P5 vista por grano · P6 gráficos v2 · P7 vista productor + PWA ·
P8 feed A3 intradiario · P9 sintéticos TIR · P10 estrategias avanzadas · P11 capacidad de pago propia ·
P12 scoring de clientes. Los que esperan insumos de Lautaro (P9-P12, parte de P6) llevan el insumo
como paso 1 del prompt. Con esto **TODO pendiente del proyecto tiene dueño**: se ejecuta pegando el
prompt correspondiente de los 3 planes en una sesión nueva; el backlog maestro único lo consolida la
etapa E7 de la auditoría.

## Anterior (20/07/2026 — fix compras ÷1000 + prompt Agrochat en el uploader)

**🔧 FIX DE DATOS (compras semana 08/07 ÷1000) + PROMPT AGROCHAT EN EL UPLOADER — rama
`claude/pendientes-4c5ovu`.** Al probar el uploader (`/admin/datos`) apareció que **toda la semana del
08/07/2026 estaba cargada ÷1000** (30 filas, todas las columnas): venía así desde la carga original del
19/07 y el saneamiento del 20/07 solo había tocado los valores *gigantes* (>1e9), no estos *chicos*. Se
reescribieron las 30 filas con los valores del CSV verificado del repo (control: trigo 25/26 Export
16.088.400→**16.238.900**, coincide 1:1 con MAGyP) por `execute_sql` (la RPC `admin_upsert_compras` exige
`is_admin()`, no corre por MCP) + `refresh_compras_avance()`; 0 caídas de acumulado desde 2025.
**Causa raíz:** el export **"Última Semana" de Agrochat viene en MILES de toneladas** (trigo 16238,9), la
base guarda toneladas enteras → subirlo tal cual mete la semana ÷1000. **Fix de proceso:** componente
`src/app/admin/datos/prompt-agrochat.tsx` (client, botón copiar) con el **prompt canónico** que le pide a
Agrochat el export en **toneladas enteras** con la cabecera y unidades exactas; Lautaro lo copia cada
semana cambiando solo la fecha. **Guard de unidades HECHO** (`actions.ts` + checkbox "forzar" en
`uploader.tsx`): en la previsualización avisa y en la confirmación **bloquea** si el acumulado subido cae
>50% vs el último acumulado de esa clave ya en la base (imposible en un acumulado → señal de export en
miles), salvo que se tilde "forzar". Umbral de bloqueo: ≥3 filas sospechosas y ≥30% de las comparables.
lint/tsc/build ✅.

## Anterior (20/07/2026 — Home = novedades del día)

**🏠 HOME = NOVEDADES DEL DÍA (ítem 4 del backlog) HECHO — rama `claude/desarrollos-pendientes-unm9cg`.**
Se dio vuelta la jerarquía del home (antes: cinta + grilla de secciones del rediseño UX #22). Ahora `/` es
un tablero de novedades: **Novedades del día** (titular destacado grande + hasta 7 titulares más, de
`getNoticias().destacados`) → grid `home-panels` con **El mercado hoy** (`src/components/mercado-hoy.tsx`,
nuevo — **reusa `getMonitorMercados()`** del #42: los 5 granos de Chicago en USD/tn + Δ del día con
semáforo) + **Próximos informes** (`InformesPanel`, reusado) + **Última estimación** (`EstimacionesMini`,
reusado; degrada a nada si la tabla está vacía) → **grilla de secciones compacta** al pie ("Explorá el
sitio"). El dólar no se repite en "El mercado hoy" (ya vive en la cinta). Se preservó el filtro de permisos
por sección con el login prendido (mercado hoy = `granos`; informes/estimación = `produccion`). lint/tsc/
build ✅; navegador claro+oscuro con datos reales (soja NOV26 450,1 USD/tn, coincide 1:1 con el monitor de
`/granos`). **Trampa:** el checkout arrancó 50 commits atrás del main real (#46) → se reancló la rama antes
de construir. Detalle: [`sesiones/2026-07-20-home-novedades.md`](sesiones/2026-07-20-home-novedades.md).

**📈 MONITOR DE MERCADOS (Chicago + macro) — HECHO Y VERIFICADO — rama `claude/todo-implementation-7nockf`,
PR #42.** Panel nuevo en `/granos` **debajo de la tabla de Arbitrajes**: bloque **agro destacado** (soja ·
aceite de soja · harina de soja · maíz · trigo de Chicago, posición continua, **normalizados a USD/tn**)
+ bloque **macro/referencias informativo** (**maní ZCE** · WTI · oro · plata · DXY · USD/BRL · SPY con su
unidad propia). **View-only**
(pedido explícito: nada se guarda — sin tabla, sin cron, como el feed A3): `src/lib/monitor-mercados.ts`
(fetch batch `spark` de Yahoo con `React.cache()`+`revalidate:30`, parser de posición robusto, conversión
a USD/tn con los factores de `ingest-cbot.mjs`) + `src/components/monitor-mercados.tsx` (server component,
hereda el refresh de la página) + bloque CSS chico en `globals.css`. **Maní** agregado a pedido de Lautaro:
no cotiza en Chicago → único futuro del mundo = **Bolsa de Zhengzhou (ZCE, China)**, contrato `PK`, traído
del continuo de Sina (`nf_PK0`, parse por índice sin GBK) y pasado a USD/tn con `CNY=X`; va **separado** de
Chicago, encabezando el bloque de referencias con tag "China" (benchmark internacional, no el maní argentino). **Fuente** elegida del catálogo de
skills de gauss y verificada con request real (endpoint `spark`, 1 request → los 11 sin auth, requiere
User-Agent). **Delay medido: futuros + DXY 10 min exactos, SPY y USD/BRL en tiempo real**; se investigó si
alguna fuente del catálogo baja el delay → **NO** (10 min es el piso de licencia CME/ICE; Barchart medido
= 10,0 min igual; Investing 403 Cloudflare; tabla en el plan §3.b) → sello honesto "futuros demorados
~10 min" (nombra CBOT·NYMEX·COMEX·ICE). **Cadencia objetivo (1 min) sin infra nueva**: viaja en el ISR de
30 s que `/granos` ya tiene. **Verificado**: lint/tsc/build ✅ · lógica 1:1 vs datos reales (soja 1.226,5
¢/bu → 450,7 USD/tn, etc.) · SSR con valores reales · navegador claro+oscuro. Decisiones (20/07): solo
continuo · visibilidad sección "granos" · WTI. Plan: **[`PLAN_MONITOR_MERCADOS.md`](PLAN_MONITOR_MERCADOS.md)**;
detalle: [`sesiones/2026-07-20-plan-monitor-mercados.md`](sesiones/2026-07-20-plan-monitor-mercados.md).
**PR #42 MERGEADO a `main`.** (Antes en el día: PR #41 mergeado — repaso del backlog
contra la nota vieja de Lautaro, ítem 21 nuevo.)

## Anterior (20/07/2026 — Tabla de datos + marca de agua en todos los gráficos)

**📊 TABLA DE DATOS + MARCA DE AGUA EN TODOS LOS GRÁFICOS — rama `claude/data-table-charts-2m8nvd`,
PR #43 (MERGEADO).** Pedido de Lautaro: doble lectura curva+número en cada chart + el **logo completo** como
marca de agua. **Fundaciones**: `ChartTabla` (`chart-tabla.tsx`, tabla genérica **SIEMPRE visible** bajo el
gráfico — sin toggle, decisión 20/07 —, reusa `.tbl` con header sticky + scroll propio, el caller formatea
es-AR) y `ChartMarca` (`chart-marca.tsx`, overlay server-safe del logo; opacidad y tamaño centralizados en
`.cm-marca` de `globals.css`, debajo del tooltip — subida a **.20/.22 claro/oscuro** a pedido de Lautaro para
que se note más) + asset **`public/rfagro-logo-marca.svg`** (logo completo limpiado de los halos del
auto-trace SOLO en la zona del isotipo — los blancos del wordmark son los contadores de las letras, se
conservan). **Integrado en todos los gráficos**: `/graficos` (los 2 modos; la tabla sale de las MISMAS rows
que dibuja Recharts, X con el formato del tooltip, banda mín/med/máx) · `/produccion` (evolución: fecha ×
organismo) · `/dolar` (tabla de la curva con SPOT + **pivot** de implícitas plazo × serie) · calcs "a fijar"
y "estrategias" (**solo marca** — sus tablas de escenarios ya listan los mismos datos). **Cero fórmulas
tocadas**; `watermark.tsx` (login) intacto. **Verificado**: lint/tsc/build + navegador claro/oscuro con datos
reales cotejados 1:1 contra KPIs/leyendas (soja MAY/JUL mín 5,10/máx 9,40 · dólar SPOT 1.478,5/DIC26 1.625,0 ·
implícitas 10d 11,1% · producción 149,00 Mt) + cero errores de consola. Cierra el pendiente "tabla
alternativa" de la v2 de gráficos (se hizo siempre visible). **Seguimiento (PR #45, MERGEADO)**: el gráfico
nuevo `/comercio/negociado` (histograma de SIO Granos, llegó en el PR #44 después de arrancar el #43) también
recibió su tabla + marca — mismo patrón, reusa `ChartMarca`/`ChartTabla` (rama `claude/negociado-tabla-marca`;
tabla semana/mes × Exportación/Industria/Total en t; verificado en navegador claro/oscuro con datos sintéticos
porque la página exige admin). Con esto **TODOS los gráficos de la web** quedaron con la doble lectura + marca.
Ojo sandbox: se creó `.env.local` (gitignoreado) con las creds públicas de Supabase para builds con datos.
Detalle: [`sesiones/2026-07-20-tabla-datos-y-marca-graficos.md`](sesiones/2026-07-20-tabla-datos-y-marca-graficos.md).

## Anterior (20/07/2026 — Negociado por producto (SIO Granos) + uploader admin de compras)

**📊 NEGOCIADO POR PRODUCTO (ítems 8 y 9 del backlog, convergen) + UPLOADER ADMIN — rama
`claude/volumen-siogranos-analysis-iq6dnd`, PR #44.** Página nueva **`/comercio/negociado`** (solo mesa,
`requireAdmin`) sobre la serie semanal de `compras` (SIO Granos): KPIs de la última semana (total negociado
todos los granos, grano líder), **tabla por producto/campaña** (campaña activa = mayor venta semanal; semanal,
Δ vs semana anterior, acumulado, **% sobre cosecha** vía `compras_avance_hist`, **% priceado** = (precio hecho
+ fijado)/acumulado, saldo a fijar; filtro por sector + CSV) e **histograma SVG** apilado Exportación+Industria
con toggle **Semanal (52 sem.) / Mensual (24 meses)** y selector de grano. Lee `compras` SIN filtrar `fuente`
(cuando el cron MAGyP sume semanas nuevas, aparecen solas). UI dice **SIO Granos** (Agrochat = puente, no se
nombra). **Uploader `/admin/datos`** (pestaña nueva): Lautaro sube el export de Agrochat (**CSV o .xlsx** —
xlsx parseado SIN dependencias, ZIP+inflateRaw, seriales de fecha manejados) → **Previsualizar** (resumen sin
escribir, claves existentes vs nuevas) → **Confirmar** (upsert por lotes vía RPC `admin_upsert_compras` +
refresh del avance; sin service key en la web). `serverActions.bodySizeLimit=16mb`. **2 migraciones nuevas**
(las aplica el orquestador por MCP): `20260720120000_admin_carga_compras.sql` (las 2 RPC SECURITY DEFINER con
guard `is_admin()` + **fix de seguridad**: drop de las policies públicas de INSERT/UPDATE de `compras` +
revoke) y `20260720150000_compras_avance_todas_fuentes.sql` (**matview v3**: el cron MAGyP pisa la última
semana por la clave UNIQUE y le cambia `fuente` → con el filtro `AGROCHAT` la última semana quedaba parcial y
rompía el `pctlFarmer`; ahora filtra solo `LEGACY`. De paso quedó **verificado empíricamente** que MAGyP y
Agrochat fechan igual el corte semanal: mismas claves). **Fix `num()`** en cargador y parser: el export trae
floats con punto decimal (`64099.99…`) que el parser viejo rompía (6,4e15) — **base SANEADA por MCP en esta
sesión** (529 valores en 477 filas corregidos; post-fix 0 valores >1e9; ya no hace falta re-subir el CSV).
**Verificado**: parser = 9.522 filas idénticas al dry-run del mjs (CSV y xlsx generado); `getNegociado()`
offline contra la serie real (total semanal 2.568.000 t; trigo 25/26 Exportación 16.238.900 t = el valor
verificado 1:1 con MAGyP); code review adversarial (4 fixes menores aplicados); lint/tsc/build. **Falta**:
confirmar las 2 migraciones aplicadas + que Lautaro pruebe el uploader logueado. Detalle:
[`sesiones/2026-07-20-negociado-siogranos-uploader.md`](sesiones/2026-07-20-negociado-siogranos-uploader.md).

## Anterior (19/07/2026 — Farmer selling C3 LIVE · serie Agrochat cargada · fix modelo)

**🌡️ ÍNDICE MESA — 3ª PATA (FARMER SELLING / C3) LIVE — PR #39 (base) MERGEADO + carga corrida; fix del
modelo en el PR #40 (rama `claude/desarrollos-pendientes-tqgic8`).** Al mergear el #39 se corrió el workflow
*Cargar serie histórica de compras*: **9.522 filas cargadas** (7 granos, 8 campañas, hasta 08/07/2026). Al
verificar con datos reales aparecieron 2 cosas, corregidas en el **PR #40**: (a) **modelo** — en cada fecha
conviven varias campañas; ahora se toma la **campaña activa = la de mayor venta semanal** (no la que recién se
planta) y el percentil es **calendario** (hoy vs misma fecha ±15d, últimos 5 años); (b) **refresh** — refrescar
las 4 matviews por PostgREST daba timeout (hizo fallar el 1er run del cargador tras subir bien los datos) → RPC
liviana `refresh_compras_avance()`. **Verificado por SQL** (lo que muestra la página): maíz avance 49,7%→pctl
59 · soja 43,3%→pctl 5 (retención fuerte) · trigo 71,2%→pctl 23. C3 corre con las **3 patas**. Detalle del build
inicial abajo; el fix en el mismo doc de sesión.

### Build inicial (PR #39, mergeado)
**ÍNDICE MESA — 3ª PATA (FARMER SELLING / C3) — rama `claude/desarrollos-pendientes-tqgic8`, PR #39.** Cierra la Fase 4: la pata de OFERTA (avance de ventas del productor) dejó de degradar a null.
Lautaro exportó de **Agrochat** la serie histórica semanal de comercialización (7 granos × 2 sectores ×
**8 campañas 19/20→26/27** × 389 semanas, en toneladas) → **verificada 1:1** (trigo 25/26 Exportador =
16.238.900 tn coincide con el scrape MAGyP de la Fase 4; volúmenes sensatos vs producción; identidades
contables cierran al 0,004%; defectos del origen —spike de 49,9 Mt, caídas en campañas viejas— registrados
y limpiados). **Decisión "juntemos todo"**: el avance SUMA Exportador + Industria (soja: SOJA_CRUSH y SBS
usan el total de poroto). **Matview `compras_avance_hist`** = comprado acumulado (suma de sectores + limpieza
monótona `min`-de-derecha que descarta spikes) / producción USDA AR (último vintage/campaña, Mt→tn);
`temperatura.ts` computa el `pctlFarmer` (percentil estacional) → índice con las 3 patas; panel con fila
"pctl farmer". **Base**: columnas ricas en `compras` (semanal/precio hecho/fijado/saldo/djve + `fuente`),
scraper vivo `ingest-compras.mjs` actualizado. **Cargador `cargar-compras.mjs` + workflow `cargar-compras.yml`**
(+ CSV versionado en `data/compras/`). **Verificado**: lógica de la matview por SQL sintético (spike
clampeado, suma de sectores, join USDA), transform del cargador (dry-run 9.522 filas), lint/tsc/build.
**FALTA (1 paso): al mergear el PR #39, correr el workflow *Cargar serie histórica de compras*
(workflow_dispatch)** — NO es disparable desde la rama (GitHub sólo despacha workflows de la default → 404)
→ carga las 9.522 filas + refresca la matview → **C3 queda live**. Hasta entonces el índice degrada solo a
las 2 patas de demanda (idéntico a antes; `compras` quedó vacía tras borrar las 715 filas LEGACY viejas). El
workflow carga los 7 granos + columnas ricas → habilita también el **ítem 8** del backlog (negociado/priceado
por producto). Detalle:
[`sesiones/2026-07-19-farmer-selling-c3-agrochat.md`](sesiones/2026-07-19-farmer-selling-c3-agrochat.md).

## Anterior (19/07/2026 — Comercio exterior Fase 4: temperatura de mercadería · índice MESA)

**🌡️ COMERCIO EXTERIOR — FASE 4 HECHA (temperatura de mercadería · índice MESA) — cierra el ítem 6 del
backlog.** Rama `claude/fase-4-temperatura-mesa-84g387`. El **PR #36 (parcial) se mergeó a `main`** (fuente +
scraper de compras + densidad C2); el resto del índice va en un **PR nuevo** (protocolo de PR mergeado: rama
reiniciada desde `main`). Página **`/comercio/temperatura`** (`requireAdmin`, solo mesa): semáforo por
producto — índice 0-100 por **percentil estacional** de las 2 patas de **demanda** (gap de cobertura C1 =
`lineup_gap_hist` · densidad de line-up C2 = `lineup_densidad_hist`, ambas 2020→2026) + momentum (dirección
del gap) → acción (DIFERIR / VENDER YA / COMPRAR BARATO). Soja crush por equivalente poroto. **Portado 1:1 de
`LineUps_Code`** (`estacional.ts` + `mesa_calor.ts`, **41/41 tests**). **La pata de OFERTA (farmer selling C3)
degrada a null** (índice sobre las 2 de demanda, pesos renormalizados) hasta que `compras` junte historia:
**MAGyP dio de baja el dataset CKAN** que usaba el scraper viejo (por eso `compras` se frenó el 11/06, no fue
IP) → fuente nueva = página institucional MAGyP "Compras y DJVE de Granos" (**scraper reactivado**,
`ingest-compras.mjs`, ambos sectores, verificado 1:1); su historia semanal solo es reconstruíble por
**Wayback desde Actions** (pendiente de correr). Research de fuente en
[`negocio/06_fuentes_comercializacion_granos.md`](negocio/06_fuentes_comercializacion_granos.md) + `FUENTES.md`
§13. **Verificado** 1:1 vs SQL independiente (MAIZE gap 39 / dens 94 · SBS 38 / 18) + render SSR con datos
reales (Maíz FIRME 65 · Trigo FIRME 76 · Soja crush 🔥 CALIENTE 81 · Soja poroto PESADO 29) + lint/tsc/build.
**Falta (para retomar):** prender la pata C3 vía **Agrochat** — **Wayback quedó DESCARTADO** (backfill corrido
desde Actions = **0 capturas** de la página MAGyP; no reintentar). Lautaro exporta de Agrochat el *comprado por
producto × sector × campaña, semanal, ~5 campañas* → armar `cargar-compras.mjs` + poner `pctlFarmer` real en
`temperatura.ts`. · reemplazar las 715 filas viejas de `compras` (semántica incompatible) · extras de la spec
(matriz por mes/zonas/"qué cambió"). Detalle:
[`sesiones/2026-07-19-comercio-temperatura-fase-4.md`](sesiones/2026-07-19-comercio-temperatura-fase-4.md).

## Anterior (19/07/2026 — Comercio exterior Fase 3: mesa de embarque + research DJVE + backfill)

**🚢 COMERCIO EXTERIOR — FASE 3 HECHA (mesa de embarque + research DJVE + backfill 2011-2025) — rama
`claude/fase-3-pr-pendiente-dkwjc0`, PR #35.** Antes de construir, Lautaro pidió **research de cómo
funcionan las DJVE** ("menos información antes que incorrecta") → 3 investigaciones con fuentes primarias
documentadas en **[`negocio/05_djve_marco_y_circuito.md`](negocio/05_djve_marco_y_circuito.md)** (qué fija
una DJVE · regímenes 30/360 · el granel declara VENTANA MENSUAL por norma · el forward paga el 90% de los
derechos a 5 días hábiles · el line-up "ve" ~10 días · cronología de retenciones 2023-2026). Eso definió el
diseño: **`/comercio/embarques`** (solo mesa, `requireAdmin`) = matriz **programa declarado por mes ×
producto** (split disponible/forward, referencia "programa final año pasado"), **cumplimiento del mes en
curso** (único cruce físico válido contra line-up, line-up>declarado es sano) y **tablas en idioma A3**
(mes → posición SOJ/MAI/TRI + ajuste). **Backfill DJVE 2011-2025 APLICADO** (+326.580 filas desde los XLS
oficiales SSMA, verificado por año; columna nueva `cosecha` para la era ROE; la cobertura de Fase 2 ya lo
refleja). **Perf**: dedup de visitas materializado (`lineup_visitas` + RPC de refresh llamada por
`ingest-lineup.mjs`) → las vistas de Fases 2-3 pasaron de ~6 s a ~66 ms; `lineup_originado_campana`
recreada 1:1. Migración `20260719180000` (por `execute_sql`; el canal de aprobación del MCP volvió a
caerse — workarounds en el doc de sesión). **Verificado 1:1 vs SQL** (maíz JUL 3.854/AGO 2.998 kt ·
cumplimiento 146% · A3 337,9) + navegador claro/oscuro real + lint/tsc/build. **Falta:** Fase 4
(temperatura, requiere reactivar `compras`). Detalle:
[`sesiones/2026-07-19-comercio-embarques-fase-3.md`](sesiones/2026-07-19-comercio-embarques-fase-3.md).

## Anterior (19/07/2026 — Comercio exterior Fase 2: empresas + semáforo)

**🚢 COMERCIO EXTERIOR / PUERTOS — FASE 2 HECHA (empresas + semáforo físico→precio) — rama
`claude/comercio-exterior-fase-2-id2fql`, PR #_.** Lo que quedó del PR #33. Se pensaron las lógicas con
Lautaro antes de construir. **Panel de empresas `/comercio/empresas`** (solo mesa, `requireAdmin`): por
exportador normalizado — **gap de cobertura foto-forward 60d** (declarado DJVE vs originado line-up →
señal alcista/bajista, `cobertura.py`), **avance de campaña**, **ritmo estacional** (line-up parado hoy
vs lo normal para esta época, 5 campañas), share por producto/zona, tabla filtrable + CSV; + tablas por
producto con **campaña nueva/vieja** y **disponible (op30)/forward (op360)**. **Semáforo físico→precio
`/comercio/senal`** (idea nueva): cruza la señal física de cobertura con la capacidad de pago (FAS
teórico) y la pizarra por grano. **Decisiones (19/07):** gap = las dos lecturas · ritmo = "line-up parado
vs lo normal" (estacional) · **transbordo PY/UY fuera del ratio** (no tiene DJVE argentina) · avance vs
Bolsa **descartado** · roster depurado 2025-26 (+8 empresas, −OLAM/PROMASA, Glencore→Viterra, fix acento
ACA). La DJVE es **solo registros** (sin "cumplido" — verificado): el cruce con line-up es la única forma.
Migración `20260719120000` (fn `campana_ini_year` + vistas `djve_cobertura`, `lineup_originado_campana`,
`lineup_estacional`). **Verificado 1:1 vs SQL** (maíz cobertura 0,32 · soja 0,11 · cebada 1,98) + ports
39/39 + lint/tsc/build. **Falta:** render en navegador (el MCP estuvo caído para escritura → validar en el
Preview del PR) y Fases 3-4 (mesa de embarque · temperatura). Detalle:
[`sesiones/2026-07-19-comercio-empresas-fase-2.md`](sesiones/2026-07-19-comercio-empresas-fase-2.md).

## Anterior (18/07/2026 — Puertos/line-up Fase 0 + Fase 1)

**🚢 PUERTOS / LINE-UP (ítem 6 del backlog) — PLAN CERRADO + FASE 0 (dato vivo) + FASE 1 (foto operativa)
HECHAS — rama `claude/desarrollos-pendientes-ypxvfd`, PR #33.** Se retoma el line-up de buques de ISA
Agents (tabla `lineup`, 6 años de historia, scraper frenado desde el 06/07). Lautaro pasó su repo
`LineUps_Code` (Python/Streamlit sobre la MISMA base) → la lógica se **porta**, no se reinventa. **Plan**
en [`PLAN_PUERTOS.md`](PLAN_PUERTOS.md) (11 decisiones + 5 fases): solo mesa (análisis protegidos siempre,
DJVE pública), subpáginas en `/comercio`, productos = complejos soja/girasol + maíz/trigo/cebada/sorgo,
zonas Up River N/S + Bahía. **Diagnóstico del freeze**: ISA bloquea las IPs de GitHub Actions (falso verde),
no se perdió la fuente. **Fase 0 (dato vivo) HECHA y verificada**: Edge Function **`lineup-ingest`** en
Supabase (sa-east-1 São Paulo, IP que ISA sí acepta) que fetchea+parsea (puerto fiel de `scraper.py`)+
upsertea idempotente, restringida a `service_role`; disparada por `scripts/ingest-lineup.mjs` +
`ingest-lineup.yml` (10:00 y 22:00 ART, una fecha por request); `lineup` sumado al healthcheck. **Backfill
07/07→16/07 aplicado** (2.853 filas; último snapshot 16/07 vs 06/07 antes). **Fase 1 (foto operativa) HECHA
y verificada**: página nueva **`/comercio/puertos`** (gateada `requireAdmin()`, protegida siempre — solo
mesa) con KPIs del último line-up, **qué cambió vs la rueda anterior** (buques nuevos con empresa
normalizada), tablas por producto y por zona (Up River N/S + Bahía), y tabla de buques filtrable + export
CSV. Lógica portada: `zona_carga` (por muelle), `shipper_norm` (~18 exportadores canónicos), `mesa_diff`
(buques nuevos ≥30kt). **Verificado 1:1 contra SQL** (rueda 16/07: 187 buques, 6.497.074 t) + navegador
claro/oscuro real. **Falta**: Fases 2-4 (empresas, mesa de embarque, temperatura) y que Lautaro mergee a
`main` para que el cron de Fase 0 arranque. Detalle:
[`sesiones/2026-07-18-puertos-fase-0.md`](sesiones/2026-07-18-puertos-fase-0.md).

## Anterior (17/07/2026 — Landing institucional)

**🏛️ LANDING INSTITUCIONAL (ítem 3 del backlog) HECHA — rama `claude/desarrollos-pendientes-dbq59w`, PR #32.**
`/bienvenida` dejó de ser la landing mínima de login y pasó a ser la **página de venta** de RF AGRO (enfoque de
venta, estilo [Praxis](https://praxis.chetech.com.ar/)). Se **movió fuera de `(auth)`** a `src/app/bienvenida/`
con layout propio (topbar + footer); la URL sigue siendo `/bienvenida`. Secciones: hero ("Dejá de tomar decisiones
a ciegas") → problema → cómo funciona (01·02·03) → servicios (6) → **vistazo al tablero** (mockups ilustrativos,
sin datos reales, chip "Vista previa") → por qué RF AGRO → **para acopios** (replicá el correacopio) → equipo (sin
nombres, "más de 10 años") → FAQ ("no reemplaza a tu corredor") → **formulario de contacto** (Resend a
`ADMIN_EMAILS`, honeypot, degrada sin key). Link "Conocé RF AGRO →" en el footer del dashboard. **Textos = borrador
que Lautaro edita.** Estilos `lp-*` nuevos, claro/oscuro. lint/tsc/build ✅; navegador claro+oscuro + formulario
end-to-end ✅. Detalle: [`sesiones/2026-07-17-landing-institucional.md`](sesiones/2026-07-17-landing-institucional.md).

**🎨 LOGO REAL INTEGRADO (ítem 2 del backlog) HECHO — rama `claude/desarrollos-pendientes-dbq59w`.** La marca
dejó de ser 100% tipográfica: Lautaro pasó el logo real (isotipo de 3 símbolos — trigo amarillo · trigo verde
con espiga dorada · gota de soja — + wordmark "RF AGRO" + "Consultora de agronegocios"). Se guardó como assets
en **`public/`** (`rfagro-isotipo.svg` 34 KB · `rfagro-logo.svg` completo). El **isotipo real** reemplaza el
glifo `WheatMark` en header, landing, auth, admin y footer; el wordmark sigue en **texto** (así se adapta al
tema claro/oscuro — el logo del cliente es un auto-trace con fondo blanco y verde oscuro que en el tema "rueda"
quedaba apagado). **Fondo transparente** (pedido de Lautaro) quitando la 1ª ruta del trazado. **Favicon nuevo**
(espiga simple, legible a 16px). Feedback de Lautaro atendido: se **limpiaron los halos de borde** que el
auto-trace mostraba en el tema oscuro (se quitaron las rutas de baja saturación). **Proxy** ajustado para no
redirigir los assets de marca cuando se prenda el login. lint/tsc/build ✅ (el entorno arrancó sin
`node_modules` → `npm install`); navegador claro/oscuro ✅.
Detalle: [`sesiones/2026-07-17-logo-real-integrado.md`](sesiones/2026-07-17-logo-real-integrado.md).

## Anterior (17/07/2026 — Login Etapa 3: hardening + encendido)

**🔐 LOGIN ETAPA 3 (sesión única · marca de agua · landing · listo para encender) HECHA — PR #_ (rama
`claude/login-stage-3-kqt0pg`).** Cierra el módulo de login (las 3 etapas). **Sesión única por usuario** (anti-préstamo):
el login en un 2º dispositivo desplaza al 1º, que al navegar cae en `/sesion-cerrada` ("tu cuenta se abrió en otro
dispositivo") — enforcement en el **proxy** (`tocar_sesion` por request, `session_id` del JWT decodificado local,
**signOut LOCAL** para no matar la sesión buena), evento `kickeado` en `access_log`, botón "Cerrar sesión" por usuario
en `/admin`. **Duración 7 días** renovables por `last_seen`. **Marca de agua** sutil (email en diagonal, `mask-image`
sobre `var(--ink)` → sigue el tema, opacidad .05/.06) sobre las páginas de datos. **Landing pública mínima**
`/bienvenida` (el proxy manda ahí al visitante sin sesión, solo con el flag prendido). **`/api/series` protegida** con
el flag prendido (401/403), pública e igual que hoy con el flag apagado. Migración nueva
`20260717120000_auth_sesion_unica.sql` (tabla `sesiones_activas` + 4 RPC, **aplicada** por `execute_sql`).
lint/tsc/build ✅; **backend por SQL** (kicked/expired/adopt/guard + RLS anon=0, cliente=solo la suya); **navegador con
el flag PRENDIDO** (anon key real + usuario de prueba aprobado, borrado al final): landing → login → tablero con marca
de agua (claro/oscuro) → sección permitida/`/sin-acceso`/`/api/series` 403 → **sesión única kickea al 1º**; y **flag
apagado = web idéntica a hoy** (`/` tablero, sin landing ni marca de agua, cache público intacto). **Falta solo el
encendido manual de Lautaro** (`AUTH_ENFORCED=true` + promover a Mauro + aprobar clientes — checklist en
[`GUIA_LOGIN_SETUP.md`](GUIA_LOGIN_SETUP.md)) y resolver **hosting** antes de clientes reales.
Detalle: [`sesiones/2026-07-17-login-etapa-3.md`](sesiones/2026-07-17-login-etapa-3.md).

**🔐 LOGIN ETAPA 2 (panel admin + permisos + emails) HECHA — PR #29 (rama `claude/login-stage-2-a8wr99`).** Sobre la
base de la Etapa 1: **panel `/admin`** (route propio, estética premium) con 4 pestañas — **Pendientes** (aprobar
eligiendo/creando empresa · rechazar · badge de conteo), **Usuarios** (bloquear · cambiar empresa · promover/degradar
admin · override individual de secciones), **Empresas** (crear/renombrar + checkboxes de las 7 secciones + conteo) y
**Actividad** (historial filtrable por usuario/empresa/fecha, paginado, con dispositivo/navegador/IP). **Enforcement
real de permisos por sección**: cada página llama `requireSeccion()` (NO-OP con el flag apagado → ISR intacto), la nav
y la home filtran por permisos, y `/sin-acceso` recibe a quien entra a una sección que no tiene. **`/admin` protegido
SIEMPRE** (aun con el flag apagado), así se puede aprobar clientes antes de encender. **Registro de visitas** por beacon
liviano (throttle 10 min en RPC, sin service key). **Emails Resend** (aviso a admins por registro + al cliente al aprobar,
degrada sin key). Migración nueva `20260716180000_auth_admin_panel.sql` (4 RPC de lectura + la de visitas).
**Las DOS migraciones de auth quedaron APLICADAS a la base** (Etapa 1 estaba pendiente; se aplicaron por `execute_sql`
del MCP). lint/tsc/build ✅; backend verificado end-to-end por SQL (RLS admin/cliente, aprobación, override, throttle,
**guard anti-escalada**); navegador (flag off) = web idéntica a hoy + `/admin`→307 a `/ingresar`.
**Falta (manual de Lautaro):** env vars en Vercel (`NEXT_PUBLIC_SUPABASE_*`, y para emails `RESEND_API_KEY`/`RESEND_FROM`/
`ADMIN_EMAILS`) + Google OAuth — todo en [`GUIA_LOGIN_SETUP.md`](GUIA_LOGIN_SETUP.md). **Sigue Etapa 3** (sesión única,
marca de agua, landing mínima, encendido de `AUTH_ENFORCED`) — prompt en `PLAN_LOGIN.md` §5.3.
Detalle: [`sesiones/2026-07-16-login-etapa-2.md`](sesiones/2026-07-16-login-etapa-2.md).

**🔐 LOGIN ETAPA 1 (base de auth) HECHA — PR #28 (rama `claude/pending-tasks-list-2m6y6u`).** Construida sobre
Supabase Auth + `@supabase/ssr`: capa `src/lib/auth/` (config/env/client/server/session/dal/log), migración
`20260716120000_create_auth_base.sql` (tablas `empresas`/`profiles`/`access_log` + `is_admin()` + trigger de alta
que siembra a `lautaroronchi97@gmail.com` como admin + RLS), pantallas premium en el route group `(auth)`
(`/ingresar` `/registro` `/pendiente` `/recuperar` `/completar` + callback OAuth + server actions), y el gate en
`src/proxy.ts` (¡en Next 16 el middleware se llama **proxy**!) detrás del flag **`AUTH_ENFORCED` (apagado)**.
**Clave: con el flag apagado la web queda igual que hoy.** (La migración de Etapa 1, que había quedado pendiente de
aplicar, se aplicó en la sesión de Etapa 2.) Detalle: [`sesiones/2026-07-16-login-etapa-1.md`](sesiones/2026-07-16-login-etapa-1.md).

**📋 PLAN DE LOGIN CERRADO (ítem 7 del backlog) — [`PLAN_LOGIN.md`](PLAN_LOGIN.md).** 15 decisiones cerradas con
Lautaro (registro autoservicio + aprobación manual · 1 sesión activa por usuario · permisos por sección a nivel
empresa + override · todo tras login con landing mínima · historial de logins/actividad · mail a admins por
registro · sesión 7 días · marca de agua sutil · feature flag `AUTH_ENFORCED` que entra APAGADO · Supabase Auth).
**3 etapas = 3 PRs** (Etapa 1 ✅). Hosting (Vercel Pro vs alternativas): sesión aparte ANTES de clientes reales.
Detalle del plan: [`sesiones/2026-07-16-plan-login.md`](sesiones/2026-07-16-plan-login.md).

**✅ Feed A3 por WebSocket (adiós 429) MERGEADO a `main` (PR #27).** El REST `marketdata/get` es de a un
símbolo y A3 lo rate-limitea (429) → dropeaba posiciones. `src/lib/a3-live.ts` ahora abre **una conexión WS**
y suscribe todo en un `smd`; verificado en rueda abierta 15/15 símbolos sin 429, coincide con el Excel de
Lautaro. Detalle: [`sesiones/2026-07-13-arbitrajes-en-vivo.md`](sesiones/2026-07-13-arbitrajes-en-vivo.md) (Follow-up 2).

**✅ Arbitrajes en vivo — 1ª columna + fix "no actualiza" MERGEADO a `main` (PR #26).** Fuera de rueda =
último ajuste; en rueda = último operado de A3, spread/tasa/TNA recalculados; header "Últ. operado" + punto
en vivo; refresh por poll cada 30s con rueda abierta (`refresh-on-focus.tsx` + `algunaRuedaAbierta`);
`/granos` a `revalidate=30`. (Pizarra no se tocó — cron, va aparte.)

---

## Plan RF AGRO (backlog priorizado por Lautaro, registrado 13/07/2026)

> Lista de tareas que Lautaro quiere hacer. **Las fechas/semanas son solo agrupación de orden, NO
> deadlines duros** — no hay que forzar nada por calendario. Cada sesión que arranque revisa esta lista,
> marca lo que se hizo (`[x]`) y anota en «Ahora» el detalle. Si una tarea ya tiene algo hecho o
> relacionado en el repo, se anota el link para no duplicar research.
>
> **Repaso 20/07/2026**: Lautaro trajo una nota vieja con pendientes sueltos. Cruzada contra esta lista:
> ya estaban cubiertos por los ítems 4, 5, 6 (con el fix de la pata C3 en el PR #40), 7/10, 8, 9, 16, 18,
> 19 y la sección "Pendiente del panel de gráficos (v2)" más abajo (tabla de datos en gráficos). Lo único
> nuevo fue el ítem 21 (resumen/interpretación de informes), agregado abajo.
>
> **Mapeo 21/07/2026**: TODOS los pendientes de esta lista (y los de CONTEXTO + gráficos v2) quedaron
> mapeados a un plan ejecutable en [`PLAN_BACKLOG.md`](PLAN_BACKLOG.md) (tabla de mapeo + prompts
> P1→P12; lo ya cubierto apunta a `PLAN_AUDITORIA.md` o `PLAN_INFORMES.md`).

**Bloque 1**
- [x] 1. **Verificación de bases de datos + resiliencia de ingestas — HECHO (13/07, PR #25).** Auditoría
  en vivo de las 10 tablas + 8 crons + 10 scripts. Hallazgo raíz: **"falso verde"** (0 filas → `upsert([])`
  no hace POST → run verde sin insertar) que dejó a **BCR-GEA congelado en feb-2026**. Arreglos: guard
  anti falso-verde en los 8 scripts (0 filas live = `exit 1`) + aislar pasos del workflow AR; cron de
  pizarra a **10:30/10:45/11:00 ART**; **healthcheck de frescura** diario (`healthcheck-frescura.mjs` +
  `healthcheck.yml`, rojo+mail si algo se atrasa); y **descongelado de GEA** por dispatch (live #196 julio
  + backfill Wayback mayo). Detalle: [`sesiones/2026-07-13-verificacion-bases-datos.md`](sesiones/2026-07-13-verificacion-bases-datos.md).
- [x] 2. **Logo real integrado — HECHO (17/07, rama `claude/desarrollos-pendientes-dbq59w`).** Assets en
  `public/` (`rfagro-isotipo.svg` = 3 símbolos · `rfagro-logo.svg` = logo completo). Header/landing/auth/
  admin/footer usan el isotipo real + wordmark en texto; favicon nuevo; fondo transparente; halos de borde
  del tema oscuro limpiados. Detalle: [`sesiones/2026-07-17-logo-real-integrado.md`](sesiones/2026-07-17-logo-real-integrado.md).
- [x] 3. **Landing institucional — HECHO (17/07, rama `claude/desarrollos-pendientes-dbq59w`, PR #32).**
  `/bienvenida` reconvertida en página de venta (hero → problema → cómo funciona → servicios →
  vistazo al tablero → por qué → acopios → equipo → FAQ → formulario). Enfoque de venta, estilo Praxis,
  mockups llamador (sin datos reales), formulario por Resend, link "Conocé RF AGRO" en el footer. Textos
  = borrador editable. Detalle: [`sesiones/2026-07-17-landing-institucional.md`](sesiones/2026-07-17-landing-institucional.md).
- [x] 4. **Home = novedades del día — HECHO (20/07, rama `claude/desarrollos-pendientes-unm9cg`).** `/` pasó
  a: **Novedades del día** (titular destacado + hasta 7) → **El mercado hoy** (Chicago en USD/tn, reusa
  `getMonitorMercados` del #42) + **Próximos informes** + **Última estimación** → grilla de secciones
  compacta al pie. Detalle: [`sesiones/2026-07-20-home-novedades.md`](sesiones/2026-07-20-home-novedades.md).
- [ ] 5. Extender el reporte diario: Matba (volumen) + CBOT + metales + petróleo + Merval + SPY + EWZ
  (hoy `cbot_cierres` ya tiene CBOT maíz/soja/trigo; falta sumar metales/petróleo/Merval/SPY/EWZ — ver
  fuentes candidatas `barchart`/`investing`/`yahoo-finance` en `CONTEXTO.md`). **Precios Chicago**: el
  dato ya está (`cbot_cierres`) y se usa en `/graficos` (preset "Chicago", A3 vs CBOT); falta sumarlo acá,
  al reporte diario/semanal. La **vista web en vivo** de Chicago + macro ya está HECHA (20/07, PR #42):
  Monitor de mercados en `/granos` (soja/aceite/harina/maíz/trigo en USD/tn + WTI/oro/plata/DXY/USD-BRL/SPY),
  [`PLAN_MONITOR_MERCADOS.md`](PLAN_MONITOR_MERCADOS.md). Lo que falta del ítem 5 es sumar estos datos al
  **reporte diario/semanal** (metales/petróleo/Merval/SPY/EWZ) — otra tarea.
- [~] 6. **Barcos / lineups en puerto — EN CURSO (plan + Fases 0, 1, 2 y 3 hechas).** Plan cerrado
  ([`PLAN_PUERTOS.md`](PLAN_PUERTOS.md), 11 decisiones + 5 fases, lógica portada de `LineUps_Code`).
  **Fase 0 (dato vivo) HECHA** (18/07): scraper reactivado vía Edge Function de Supabase, backfill,
  healthcheck. **Fase 1 (foto operativa) HECHA** (18/07): `/comercio/puertos` con KPIs, tape de cambios,
  tablas por producto/zona y buques. **Fase 2 (empresas + semáforo) HECHA** (19/07): `/comercio/empresas`
  (gap de cobertura + señales + avance + ritmo estacional + campaña nueva/vieja + share) y
  `/comercio/senal` (semáforo físico→precio); verificado 1:1 contra SQL. **Fase 3 (mesa de embarque)
  HECHA** (19/07): `/comercio/embarques` (programa DJVE por mes × producto en idioma A3), sobre el
  research verificado de DJVE (`negocio/05`) + backfill 2011-2025 de la tabla `djve`. **Fase 4
  (temperatura · índice MESA) HECHA** (19/07): `/comercio/temperatura` (semáforo por producto, índice
  0-100 por percentil estacional de las 2 patas de demanda + momentum → acción; portado 1:1 de
  `LineUps_Code`). El scraper de `compras` se reactivó (nueva fuente MAGyP); la pata de farmer selling
  degrada hasta que junte historia (backfill Wayback pendiente). Detalle:
  `sesiones/2026-07-19-comercio-temperatura-fase-4.md`.

**Bloque 2**
- [~] 7. Login (cliente / Lautaro / Mauro) — roles distintos, hoy la web es 100% pública/anónima.
  **Plan cerrado 16/07 → [`PLAN_LOGIN.md`](PLAN_LOGIN.md)** (15 decisiones + 3 prompts de ejecución).
  **Las 3 etapas HECHAS en código:** Etapa 1 (base de auth, PR #28), Etapa 2 (panel admin + permisos + emails,
  PR #29) y **Etapa 3** (sesión única + marca de agua + landing + hardening, rama `claude/login-stage-3-kqt0pg`).
  El flag `AUTH_ENFORCED` **sigue apagado**: falta solo el **encendido manual de Lautaro** (checklist en
  `GUIA_LOGIN_SETUP.md`) y resolver hosting. Se marca `[x]` cuando prenda y valide.
- [x] 8. **Total negociado por producto — HECHO (20/07)** junto con el 9: página `/comercio/negociado`
  (volumen semanal por producto, Δ, histograma, % sobre cosecha, % priceado, saldo a fijar). El dato de
  SIO Granos es semanal (no hay corte diario). Detalle:
  [`sesiones/2026-07-20-negociado-siogranos-uploader.md`](sesiones/2026-07-20-negociado-siogranos-uploader.md).
- [x] 9. **SIOGRANOS semanal/mensual — HECHO (20/07)**, converge con el ítem 8: mismo panel, histograma
  con toggle Semanal/Mensual + uploader admin `/admin/datos` para actualizar la serie (export Agrochat
  CSV/xlsx). Detalle: [`sesiones/2026-07-20-negociado-siogranos-uploader.md`](sesiones/2026-07-20-negociado-siogranos-uploader.md).

**Bloque 3**
- [~] 10. Terminar login (si sigue abierto del bloque 2). **Código de las 3 etapas HECHO** (ver ítem 7);
  queda el encendido manual (`AUTH_ENFORCED=true`) + hosting. Se marca `[x]` cuando Lautaro prenda y valide.
- [~] 11. Automatizar informe diario/semanal — **PLAN CERRADO (21/07)** en
  [`PLAN_INFORMES.md`](PLAN_INFORMES.md) (MP1 placa PNG diaria + MP2 PDF semanal, con prompts listos;
  decisiones: Routines de Claude como worker, prosa `voz-lautaro`, color de la rueda por /admin,
  entrega mail + `/informes`). Falta ejecutar MP1 y MP2.
- [ ] 12. Acumulado de rueda USD + compras BCRA (compras netas BCRA hoy es proxy/manual, ver módulo 7
  "Panel cambiario" en `CONTEXTO.md`).
- [ ] 13. Variación semanal del USD (gráfico).
- [ ] 14. Movimiento de camiones en puerto (fuente a confirmar, probablemente BCR).
- [ ] 15. Comercio exterior (incluye tablas DJVE) — solo si sobra tiempo. Ya existe `djve`/`djve_resumen`
  en Supabase y el sitemap del rediseño UX ya reservó la sección "Comercio exterior"; falta el contenido.

**Bloque 4 (post-Bloque 3)**
- [ ] 16. Cron/automatizaciones — revisión integral (todos los workflows de GitHub Actions: cierres,
  USDA/CONAB/estimaciones AR, noticias, calendario).
- [ ] 17. Comercio exterior (si no cerró antes, ver ítem 15).
- [ ] 18. Vista por grano (hoy los paneles son transversales a los 3 granos; falta una vista filtrada
  por un solo grano).
- [ ] 19. Mejora front-end general · revisión de calculadoras · pegar `ESTADO.md`/`CONTEXTO.md` (mantener
  la documentación de sesiones al día).
- [ ] 20. Skill de escritura · skill de informes (herramientas internas de generación de contenido).
- [ ] 21. **Resumen/interpretación de informes** (nuevo, anotado 20/07): lectura automática de los
  informes que ya se ingestan (WASDE/PSD, CONAB, BCR-GEA, DEA-SAGyP, DJVE) para armar un resumen en
  lenguaje llano de "qué cambió y qué implica" — hoy `/produccion` y `/comercio` muestran los datos crudos
  + tarjetas de cambios numéricas, pero no una interpretación redactada. Podría apoyarse en la skill
  `voz-lautaro` para el tono. **PLAN CERRADO (21/07): es el MP4 de
  [`PLAN_INFORMES.md`](PLAN_INFORMES.md)** (alcance decidido: por informe individual, borrador → OK
  de Lautaro en /admin → publica en /produccion). Falta ejecutarlo (requiere MP1 antes).

---

**Contexto previo (12/07/2026 — Rediseño UX «web en capas» MERGEADO · Sesión C estimaciones Argentina):**

**✅ REDISEÑO UX «WEB EN CAPAS» MERGEADO a `main` (PR #22).** [`docs/PLAN_UX_NAVEGACION.md`](PLAN_UX_NAVEGACION.md): se dejó la tira vertical larga y se pasó a
**sitio por páginas (hub)** — portada tablero → clickeás un tópico y entrás a esa sección con link propio.
Decisiones de Lautaro: multipágina (no acordeón/pestañas de esqueleto) · **sin** vista trader "tira" (todos
por secciones) · calculadoras con **link propio** por calc · Noticias sección propia + titulares en Inicio ·
DJVE → sección propia "Comercio exterior" · fuentes **"institución sí, puente no"** (mostrar el organismo/
mercado de origen, ocultar el proveedor técnico; nunca "vía") · explicaciones "¿Qué es esto?" por calc/reporte.
Sitemap: Inicio · Granos · Dólar y tasas · Comercio exterior · Calculadoras · Gráficos · Producción · Noticias,
con layout compartido `(site)/layout.tsx`. **Fase 0 hecha** (layout compartido: route group `src/app/(site)/`,
nav a client component `usePathname`, URLs intactas). **Fase 1 (estructural) hecha** (sellos = `[origen] ·
Actualizado HH:MM` con nombre propio de institución — Matba Rofex, Bolsa de Comercio de Rosario, MAE, Mercado
de deuda local, SAGyP, USDA·CONAB; pie sin chips técnicos; cinta "prov."; marca `.st-prov`). Todo con
build/lint/tsc ✅. **Falta de Fase 1:** las notas al pie de los paneles aún nombran puentes → se limpian en la
**Fase 5** (capa explicativa). **Fase 2 hecha** (páginas por grupo aditivas `/granos /dolar /comercio
/calculadoras /noticias`; nav a los 7 destinos reales, activo por `pathname`; logo → Inicio). **Fase 3 hecha**
(la home dejó de ser la tira: ahora es el tablero = cinta + "Lo importante hoy" con titulares del día + grilla
de 7 tarjetas por sección; se sacaron los paneles de la home → fin de la duplicación). **Fase 4 hecha**
(calculadoras con link propio: `src/lib/calculadoras.ts` + `/calculadoras` índice de tarjetas + ruta dinámica
`/calculadoras/[slug]` con las 9 en SSG, slug inválido → 404). **Fase 5 hecha** (capa explicativa: componente
`que-es-esto.tsx` desplegable "¿Qué es esto?" en las 9 calcs + todos los reportes, reemplazando las notas al
pie; **se sacaron TODOS los puentes** que quedaban → barrido del HTML servido limpio; cierra el pendiente de la
Fase 1). **Fase 6 hecha** (migas de pan `Inicio › Sección › Subpágina` en el layout, `breadcrumbs.tsx`; nav
mobile scrollea horizontal; `noindex` se mantiene por datos provisorios). **✅ PLAN UX COMPLETO (Fases 0→6),
MERGEADO a `main` (PR #22).** Todo con build/lint/tsc ✅.
Detalle: [`sesiones/2026-07-12-plan-ux-navegacion.md`](sesiones/2026-07-12-plan-ux-navegacion.md).

**✅ SWITCH COMPLETO. Producción (Vercel) sirve `main`** con el rediseño premium + todos los paneles
de datos reales. Default de GitHub = `main` · Vercel Branch Tracking = `main`.

**Hecho esta sesión (rama `claude/session-c-local-production-pvqf6f`, PR #23 MERGEADO a `main`) — Sesión C: estimaciones Argentina:**
- **Ingestas + workflow**: `scripts/ingest-gea.mjs` (BCR-GEA: tablas `bcr-estimaciones` de soja/maíz/trigo +
  fecha/PDF del informe; **backfill Wayback** 2020→hoy por CDX), `scripts/ingest-dea.mjs` (DEA-SAGyP: POST del CSV
  oficial → nacional por cultivo/campaña de los 6 granos, snapshot semanal = vintage), `scripts/ingest-pas.mjs`
  (BCBA-PAS **probe-first, pendiente de validar desde Actions** — el dominio está tras Cloudflare; no inserta datos
  sin verificar ni scrapea noticias). Workflow único `ingest-estimaciones-ar.yml` (GEA mié + DEA vie + dispatch).
- **Comparador AR real**: la lib/UI ya eran genéricas → con GEA + DEA + USDA la pizarra muestra BCR vs SAGyP vs USDA
  lado a lado ("quién está más alcista"), el gráfico de evolución (BCR vs USDA por campaña) y las tarjetas de cambios.
  Dos fixes: `campaniaVigente` prefiere la última campaña **con producción** (BCR-trigo 29,5 de 2025/26, no "—" de
  2026/27); y la tarjeta de "Cambios" ahora usa el organismo real (antes mostraba "USDA" en la tarjeta de SAGyP).
- **Verificado**: lint/tsc/build ✅; parsers y lógica contra datos reales (GEA soja 51,5 / maíz 68 / trigo 29,5 Mt;
  backfill feb-2026 soja 48,0 = coincide con el plan; DEA soja 22/23 25,0 Mt = la sequía, soja 24/25 51,1 Mt); UI en
  navegador claro/oscuro (comparador AR de 3 vías, screenshots).
- **✅ SUPABASE POBLADO (12/07, post-merge)**: se corrieron los `workflow_dispatch` y **terminaron en verde** —
  *Ingesta estimaciones Argentina* (`backfill_gea` + `dea_since=2019` + `pas_probe`), *Ingesta USDA* (backfill 2020→
  + PSD) e *Ingesta CONAB* (full). Como cada script sale con error si el upsert falla, el `success` confirma que los
  datos entraron. Los crons ahora mantienen solo. **OJO ISR**: `/produccion` es estática con `revalidate=3600` →
  la pizarra real aparece en la próxima regeneración (~1 h) o con cualquier redeploy en Vercel.
- **⚠️ PAS (BCBA) — validar**: el `pas_probe` corrió dentro del run de Argentina; **falta leer el log** (Actions →
  *Ingesta estimaciones Argentina* → paso "PAS (BCBA)") para ver si la IP de Actions pasó el Cloudflare. Si pasó,
  endurecer el parser de `ingest-pas.mjs` con el HTML real y activarlo en el schedule; si no, respaldo por mail.
  El comparador AR ya es sólido con BCR + SAGyP + USDA. Detalle: [`sesiones/2026-07-12-estimaciones-argentina.md`](sesiones/2026-07-12-estimaciones-argentina.md).
- **✅ Módulo Calendario + estimaciones COMPLETO (A+B+C) y poblado**: solo resta validar el PAS (arriba).

**Hecho antes (rama `claude/session-b-pr20-wwijnz`, PR #21 mergeado) — Sesión B: ingestas USDA + CONAB:**
- **Ingestas + workflows**: `scripts/ingest-usda.mjs` (WASDE = producción por país incl. mundo + vintages;
  PSD bulk = área/rinde de los 6 granos + producción de girasol/sorgo/cebada — ZIP descomprimido sin
  dependencias), `scripts/ingest-conab.mjs` (`LevantamentoGraos.txt`, 27 UF → nacional Brasil, milho = 3
  safras, vintages 2017/18→hoy, fecha derivada por cadencia), `scripts/refresh-calendario.mjs` (centinela
  mensual del seed del año siguiente). Workflows `ingest-usda.yml` / `ingest-conab.yml` / `refresh-calendario.yml`.
- **UI de `/produccion`**: reemplazado el bloque "En construcción" por la **pizarra de estimaciones** (última
  por organismo/país/grano + Δ vs anterior, filtrable), el **gráfico de evolución** (SVG multi-serie, USDA vs
  CONAB) y las **tarjetas de cambios** del último informe (`estimaciones-panel/cliente.tsx`, `evolucion-chart.tsx`,
  `src/lib/estimaciones.ts`). **Home**: mini-tabla "Última estimación" (USDA, `estimaciones-mini.tsx`).
- **Verificado**: lint/tsc/build ✅; parsers y lógica contra datos reales (soja AR 48→50 Mt, soja BR CONAB
  177,6→180,25 Mt, maíz EEUU 406,4 Mt en Mt — no bushels); UI en navegador claro/oscuro (screenshots).
- **⚠️ FALTA POBLAR Supabase**: el MCP de este entorno no resolvió la aprobación de escritura. **Tras el merge,
  correr los `workflow_dispatch`**: *Ingesta USDA* backfill (from 2020-01) + snapshot_psd=true, e *Ingesta CONAB*
  full=true → después el cron mantiene solo. Hasta entonces la UI muestra el roadmap (degrada solo).
  Detalle: [`sesiones/2026-07-12-estimaciones-usda-conab.md`](sesiones/2026-07-12-estimaciones-usda-conab.md).
- **Sesión C (Argentina) HECHA** (arriba) — solo resta poblar Supabase por dispatch + validar el PAS desde Actions.

**Hecho antes (PR #20) — módulo Calendario de informes + estimaciones de producción:**
- **[`PLAN_CALENDARIO_PRODUCCION.md`](PLAN_CALENDARIO_PRODUCCION.md)**: investigación verificada con
  requests reales del núcleo v1 (USDA WASDE/PSD/NASS, CONAB, BCR-GEA, BCBA-PAS, DEA-SAGyP): qué publica
  cada uno, calendarios oficiales 2026, endpoints de datos e histórico/vintages desde 2020. FAO-AMIS tiene
  un proxy BigQuery abierto con vintages 2020→hoy de FAO+IGC+USDA (tier-2, candidato barato a sesión B).
  Un 2º pase de verificadores re-testeó los ~50 endpoints: todo se sostiene (ESMIS 0-indexed, ICS NASS
  sin TZID, Wayback OK para backfill GEA — en §8 del plan).
- **✅ SESIÓN A del build hecha**: tablas `calendario_informes` + `estimaciones_produccion`
  (migración `20260712020000`), motor `src/lib/calendario.ts` (seed oficial 2026 + reglas + hora DST-aware),
  panel "Próximos informes" en la home y **página nueva `/produccion`** con el calendario cronológico
  filtrable + sección de estimaciones "en construcción". Verificado con navegador (claro/oscuro) + build.
- **Sigue: Sesión B (USDA+CONAB) y C (Argentina)** — ingestas + vintages + pizarra de estimaciones +
  gráficos. El `refresh-calendario.yml` va con la B (en v1 el calendario rinde solo desde código).

**✅ LAS 3 BASES DE GRÁFICOS ESTÁN COMPLETAS (verificado por SQL el 11/07):** PR #10 mergeado
(merge #14) y **backfill CBOT ya corrido** — `futuros_cierres` 31.049 filas (2020-01-02→08/07,
feriado 9/7 de por medio) · `cbot_cierres` **28.915 filas, 129 contratos** (→09/07) ·
`pizarra_historico` 7.893 filas (→07/07). Los 3 crons corren solos. Ya no queda nada pendiente de
[`PLAN_BASES_GRAFICOS.md`](PLAN_BASES_GRAFICOS.md).

**✅ PANEL DE GRÁFICOS DE SPREADS COMPLETO Y EN PRODUCCIÓN (PR #17 mergeado, merge `55c68c0`)**
([`PLAN_GRAFICOS_SPREADS.md`](PLAN_GRAFICOS_SPREADS.md)) — página `/graficos` con dos modos:
- **Modo Campañas** (superponer años alineados al vto): motor de 2 patas (A3/CBOT/pizarra) × métrica
  (spread/ratio/crudas) · presets **15 calendar spreads** por grano (con salto de campaña) + **entre
  productos** + **Chicago** (A3 vs CBOT, mapeo empírico por correlación) · **banda histórica**
  min–máx+mediana · **percentil** hoy vs historia · **mes** en el eje días-al-vto.
- **Modo Período** (base vs varias posiciones sobre un año, eje calendario): base pizarra/posición,
  todas las posiciones que cotizan (las 2 cosechas) + filtro, presets de pizarra, cada línea hasta
  su vto.
- **Fase 0 (fixes):** guard del truncado 206 + `sbSelectAll` paginado (`supabase.ts`) · flag
  estimativo en `pizarra.ts` → el panel Arbitrajes marca "estimativa".
- **Arquitectura:** vista `series_catalogo` (351 series), `series.ts`/`derivadas.ts`,
  `/api/series` + `/api/series/catalogo`, Recharts 3.9.2, estado del modo Campañas en la URL.
- **Validado contra el Excel** (Playwright, claro/oscuro): spread 2021-04-05 = 125,6; ratio U7 =
  0,5796. Mapeo CBOT confirmado por SQL (ej. maíz ABR↔CBOT MAY, soja NOV↔CBOT JUL). CI verde.
  Decisiones (30 preguntas) e historia en `docs/sesiones/2026-07-11-plan-graficos-spreads.md`.

**Pendiente del panel de gráficos (v2, no bloquea nada):** persistir el modo Período en la URL ·
ratio/base en % · guardar presets del usuario (requiere login) · export PNG/CSV · media móvil ·
volumen/OI (tabla alternativa → **HECHO** 20/07, ver arriba) · P12/P17 (esperan ejemplos de Lautaro) ·
import de campañas 2018/19. Mapeado completo con prompt de ejecución en **P6 de
[`PLAN_BACKLOG.md`](PLAN_BACKLOG.md)** (retirado de acá el 21/07 por la auditoría E6, para no
mantener dos copias — ver [`auditoria/E6-historia.md`](auditoria/E6-historia.md)).

**Recién entrado a `main` de otras sesiones (contexto + pendientes de Lautaro):**
- **Calculadora "Negocios de planta" (PR #18, mergeada):** `src/components/calc-planta.tsx` en
  Calculadoras — arranca de un precio (pizarra CAC editable) y descuenta 6 rubros (contra flete,
  secada, merma volátil, paritaria, embolsado, otros) → Precio final + Total de gastos.
  Detalle: `docs/sesiones/2026-07-11-calc-negocios-planta.md`.
- **Portal de noticias (PR #12):** panel Noticias rediseñado (categorización propia por 6 temas, chips,
  15 fuentes) + cron horario `ingest-noticias.yml` → tabla `noticias`. Pendiente: 1ª carga a mano
  (Actions → *Ingesta noticias* → Run workflow); el cron arranca solo al estar en `main`.
  Detalle: `docs/sesiones/2026-07-10-portal-noticias.md`.
- **Feed A3 en vivo (PR #11):** Pases suma Comprador/Vendedor/Último/Vol del pase real y Arbitrajes suma
  Comprador/Vendedor del futuro (frescura ~60s por ISR, degrada solo sin creds). Pendiente: validar con
  datos reales en horario de rueda (10:30–17:00) tildando el scope Preview/Production en las 3 vars A3 de
  Vercel. Detalle: `docs/sesiones/2026-07-09-feed-a3-en-vivo.md`.

**Ramas vivas y su veredicto:** ⚠️ tabla **congelada al 12/07/2026** (ninguna de estas ramas existe ya
— se limpiaron sin volver a este apunte). Para las ramas remotas vivas de HOY y los comandos de
limpieza, ver [`auditoria/E6-historia.md`](auditoria/E6-historia.md) § «Higiene de ramas remotas»
(auditoría del 21/07).

**Lo próximo (en orden — detalle en CONTEXTO «Pendientes»):**
0. **Gráficos de spreads — v2** (panel ya en producción): persistir el modo Período en la URL ·
   ratio/base en % · export PNG/CSV · media móvil · volumen/OI · presets del usuario (login) ·
   P12 (relaciones %) y P17 (serie continua) con ejemplos de Lautaro · import 2018/19. Lista
   completa arriba en «Ahora».
1. **Módulo Calendario + estimaciones — COMPLETO y poblado** (A+B+C + dispatches corridos en verde). Solo resta:
   **validar el PAS (BCBA)** — leer el log del `pas_probe` (Actions → *Ingesta estimaciones Argentina* → paso "PAS
   (BCBA)"); si la IP de Actions pasó el Cloudflare, endurecer el parser de `ingest-pas.mjs` con el HTML real y
   activarlo en el schedule; si no, respaldo por mail. Opcional: backfill histórico DEA por PDFs mensuales (`?mes=`)
   y el candidato tier-2 `ingest-amis.mjs` (proxy BigQuery de FAO-AMIS, vintages de 3 organismos).
2. **Fase 2 del Feed A3 — histórico intradiario**: cron GH Actions `*/15 13-20 * * 1-5` UTC +
   `scripts/ingest-rueda.mjs` + tabla `snapshots` + `ingest_log` (INFRAESTRUCTURA.md). Habilita gráficos
   intradía. (La frescura ya está resuelta web-directa; esto es SOLO para guardar historia.)
3. Sintéticos TIR (pago final por letra, IAMC). [Requiere tabla de Lautaro]
4. Fase B (resiliencia, tests, mobile) y backlog de datos (reactivar scrapers `lineup`/`compras`,
   lineups, calendario, reporte WhatsApp — lista completa en CONTEXTO «Pendientes» punto 5).
