# 2026-07-21 — Auditoría E5: infraestructura, ingestas y seguridad operativa (FASE 1)

- **Rama:** `claude/auditoria-e5-infra` (desde `main` @ `5bb840f`) · **PR:** draft base `main`
- **Prompt:** PROMPT E5 de [`PLAN_AUDITORIA.md`](../PLAN_AUDITORIA.md) (quinta etapa de la auditoría
  integral). FASE 1 = solo auditar; el informe espera la decisión de Lautaro hallazgo por hallazgo.
- **Informe:** [`auditoria/E5-infra.md`](../auditoria/E5-infra.md) — 14 hallazgos + Anexo A (22
  caminos de falso-verde) + Anexo B (salud real de los 13 workflows) + comparación de hosting.

## Cómo se trabajó

6 subagentes de lectura en paralelo (fragilidad de las 15 piezas de ingesta · workflows/crons ·
camino del login + hardcodeos · secretos/hardening · runs de Actions en 2 grupos · research de
hosting con precios verificados por web) + verificación viva desde la sesión principal: MCP de
Supabase (advisors, ACLs, roles, frescura por SQL, Edge Functions), MCP de GitHub (logs de runs
puntuales), **tests empíricos con la anon key** (RPC `ingest_cierres_cem`, matview `djve_cobertura`,
RPC `admin_usuarios`), **dry-run real de `ingest-compras.mjs`** contra la página viva de MAGyP, y
fetch del TXT vivo de CONAB. Contratiempo operativo: el primer lanzamiento de subagentes murió por
límite de sesión de la cuenta (reset 23:30 UTC) — se relanzaron a las 23:32 y terminaron todos.

## Lo más importante que apareció (detalle en el informe)

1. **La semana del 15/07 de `compras` fue borrada por accidente por la fase 2 de E1.** El cron MAGyP
   del lunes 20/07 15:01 UTC cargó 30 filas `fuente=MAGYP` (23 reales de la semana 15/07 + 7 basura
   del 27/05 que mete un segundo grupo de paneles viejo de la página); 12 horas después la migración
   `20260721033519_e1_limpieza_compras.sql` corrió `delete … where fuente='MAGYP'` sin filtro de
   fecha, creyendo que borraba 7. Reconstruido con el log del run + el dry-run de hoy + SQL. Se
   auto-repara el jueves 23/07 (el cron reinserta), pero destapó que la decisión "Agrochat fuente
   única" convive con un cron MAGyP prendido → Duda #1 del informe.
2. **`ingest-lineup` rojo 6/6 desde que estrenó el cron** (19/07). Hoy el dato entra (ISA se
   recuperó sola el 21/07) pero `refresh_lineup_visitas` da HTTP 500: la RPC creció a 6 matviews
   (E2 + E3 le sumaron 3) y el `statement_timeout=8s` del rol `authenticator` la mata. Las matviews
   están al día de casualidad (la migración de E3 las repobló al recrearlas). Fix propuesto:
   `ALTER FUNCTION … SET statement_timeout`.
3. **El revoke de E1 sobre `ingest_cierres_cem` quedó neutralizado por el grant a PUBLIC** — test
   empírico: anon ejecuta la función HOY (falla adentro por `extensions.http_get` inexistente — o
   sea además está rota y es código muerto). Propuesta: DROP.
4. **22 caminos de falso-verde** mapeados en las ingestas (ningún guard es por componente):
   endurecimiento quirúrgico propuesto para GEA/pizarra/CBOT/compras/noticias.
5. **Alertas = mail default de GitHub**, ya fallado 2 veces (E6) + esta vez (lineup 3 días rojo sin
   que nadie lo vea). Propuesta: mail Resend en `if: failure()` + ampliación del healthcheck
   (matviews nuevas, vencimientos, views_mercado, seeds de futuro) + DEA a 9d.
6. **DEA sigue caída** (4/4 ConnectTimeout, incluido el cron del viernes) → propuesta: Edge Function
   sa-east-1 como con ISA (el diferido de E6).
7. **Prender `AUTH_ENFORCED` rompe `/api/views/insumos`** (el proxy redirige antes del token) → la
   Routine MP3 moriría el día del encendido. Fix de 1 línea + anotar en la guía y en MP1.
8. **Hardcodeos con vencimiento sin aviso**: seed `vencimientos` (hasta SEP27, el cron que promete
   el comentario no existe), `FERIADOS_AR` (2027 estimado, 2028 vacío), seeds 2026 del calendario
   (el 01/01/2027 los 4 informes oficiales desaparecen de `/produccion` en silencio).
9. **Pizarra histórica corre T-1** pese a los 3 crons (GitHub los dispara ~1h50 tarde y el guard de
   ventana nunca exige "hoy"): 3 runs verdes hoy y la pizarra del 21/07 no está.
10. Hardening: INFORME_TOKEN por query + compare no timing-safe (arreglar ANTES de crear la
    Routine), CSP ausente, `bodySizeLimit` 16 MB global, `permissions:` faltante en los 13 workflows,
    2 Edge Functions fantasma (`lineup-probe`/`lineup-fetch`) ACTIVE sin versionar.

## Lo verificado que está BIEN

Cero secretos en todo el historial git (139 commits) · `lineup-ingest` como patrón de parser robusto
(validación de 14 headers) · crons sin problemas de DST (verificado caso por caso contra WASDE/CBOT/
Brasil) · cierres/cbot/conab/usda/noticias/healthcheck verdes estables de verdad · CONAB "atrasada"
es la fuente, no la ingesta (TXT verificado: el 10º levantamento aún no tiene datos) · PAS ya cerrado
por E6 (semilla del prompt registrada como "resuelto antes de la auditoría") · server actions con
doble guard · el proxy degrada sin 500s si Supabase cae.

## Hosting — fuentes de precios (verificadas 21/07/2026)

- Vercel: https://vercel.com/pricing · https://vercel.com/docs/pricing/regional-pricing/gru1 ·
  https://vercel.com/docs/regions
- Netlify: https://www.netlify.com/pricing/ ·
  https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/ ·
  https://www.netlify.com/changelog/next-js-16-deploy-on-netlify/ ·
  https://docs.netlify.com/build/functions/optional-configuration/
- Cloudflare: https://developers.cloudflare.com/workers/platform/pricing/ ·
  https://opennext.js.org/cloudflare (limitación Node middleware) · https://www.cloudflare.com/network/
- Hetzner: https://www.hetzner.com/cloud/ · https://www.hetzner.com/pressroom/new-cx-plans/
- Railway: https://railway.com/pricing · https://docs.railway.com/deployments/regions
- Render (secundarias): https://costbench.com/software/developer-tools/render/
- AWS Amplify: https://aws.amazon.com/amplify/pricing/

**Recomendación: Vercel Pro $20/mes (1 asiento) + `regions: ["gru1"]` + spend limit; 2ª opción
Netlify Pro; Cloudflare re-evaluar en 6 meses (el adapter no soporta el Node middleware que
`src/proxy.ts` usa).**

## Fase 2 (22/07/2026) — TODO aprobado e implementado

Lautaro respondió las 7 Dudas en el chat y eligió «Implementá todos» para el resto. Tabla completa
con evidencia en `auditoria/E5-infra.md` § Fase 2. Resumen:

- **Por MCP a la base viva:** `ALTER FUNCTION refresh_lineup_visitas SET statement_timeout='300s'`
  (refresh medido 28,8 s + refresh manual) · `DROP FUNCTION ingest_cierres_cem` · RLS initplan
  `(select auth.uid())` en 4 policies. Migraciones versionadas `20260722013000/013100`. La
  `20260722013200` (revoke de las 7 matviews de mesa) quedó versionada **SIN aplicar** — se aplica
  en el encendido, cuando producción deploye con la service key.
- **Edge Functions (por MCP):** `dea-fetch` nueva (sa-east-1) + redeploy `lineup-ingest` v3 (auth
  por comparación directa de la service key). Ambas → 403 con anon (verificado por curl).
- **Ingestas:** compras decisión (b) (parser descarta el grupo viejo — dry-run real 30→23 filas —,
  upsert ignore-duplicates, guards por panel) · guards por componente en gea/pizarra/cbot/cierres/
  noticias/usda · `ingest-cierres.mjs` refresca `vencimientos` desde CEM /symbols · `ingest-dea.mjs`
  vía `dea-fetch`.
- **Monitoreo:** `scripts/alerta-mail.mjs` (Resend) + `if: failure()` en 6 workflows · healthcheck
  15→17 checks (views_mercado, vencimientos-futuro ≥180d, seed-calendario ≥60d, DEA a 9d).
- **Workflows:** permissions/timeouts/concurrency (group `compras` compartido)/nvmrc/actions v5/
  replace_legacy=false/4º cron de pizarra en los 13 YMLs.
- **Web:** proxy deja pasar `/api/views|informes/*` + cap 2 MB en POSTs públicos · INFORME_TOKEN por
  header Bearer + timingSafeEqual · CSP Report-Only + HSTS · `src/lib/supabase.ts` prefiere la
  service key (server-only).
- **Tests/docs:** test Vitest FERIADOS_AR año-próximo · guía definitiva de encendido (Vercel Pro +
  login) al tope de `GUIA_LOGIN_SETUP.md` · banner histórico en `INFRAESTRUCTURA.md` · skill MP3 y
  prompt MP1 con el token por header. Verificado: **lint + tsc + build + vitest** en verde.

## Quedó en manos de Lautaro (todo en la «Guía definitiva 22/07» de `GUIA_LOGIN_SETUP.md`)

- **Parte A:** contratar Vercel Pro (upgrade + spend limit + functions en gru1 + redeploy).
- **Parte B (post-merge del PR #58):** `SUPABASE_SERVICE_KEY` en Vercel (Production) +
  `RESEND_API_KEY` como secret de GitHub · dispatches de prueba (lineup / estimaciones-ar /
  healthcheck) · aplicar `20260722013200_e5_revoke_matviews_mesa.sql` · leaked password protection ·
  borrar Edge Functions fantasma `lineup-probe` / `lineup-fetch`.
- **Parte C:** encendido del login (checklist Etapa 3 + validación de 5 min).
- **Seguimiento automático:** el cron de compras del jueves 23/07 reinserta la semana 15/07 (ya sin
  la basura del 27/05); el healthcheck del 22/07 pasa a 17 checks.

## Continuación (mismo día, 22/07) — Parte A/B ejecutadas + Parte C en curso

**Vercel Pro contratado**: upgrade $20/mes + **spend limit $20 con "pausar implementaciones"
activado** (más conservador que los $40 sugeridos, decisión de Lautaro) + functions en `gru1`
(São Paulo).

**Al correr los dispatches de prueba post-merge del PR #58 aparecieron 2 bugs reales, arreglados
en el PR #59 (mismo día, mergeado):**

1. **403 en `lineup-ingest`/`dea-fetch`** — comparaban el bearer **string a string** contra
   `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`; el proyecto tiene en paralelo las keys legacy
   (JWT) y las nuevas (`sb_publishable_.../sb_secret_...`) y ese valor reservado no coincidía con
   el JWT legacy que manda `SUPABASE_SERVICE_KEY` (el secret de GitHub), aunque las dos son
   credenciales válidas. **Fix**: como el gateway (`verify_jwt=true`) ya valida la firma, es
   seguro decodificar el payload y exigir el claim `role=service_role`, sin depender de esa
   comparación. `lineup-ingest` v4 y `dea-fetch` v2 deployados por MCP; verificado con
   `lineup-ingest` → dispatch SUCCESS completo.
2. **DEA sigue sin conectar ni desde sa-east-1** — con el 403 resuelto, `dea-fetch` no llegaba a
   bajar el CSV de MAGyP. Subir el `AbortSignal` de 120s a 240s (dentro del wall clock limit de
   400s de Supabase) reveló la causa real: **`tcp connect error: Connection timed out` a los
   ~130s** — la conexión TCP nunca se completa, no es una respuesta lenta. Es la misma familia de
   bloqueo que ya afecta a GitHub Actions (E5 #8), ahora parece alcanzar también a sa-east-1.
   **Sin resolver** — necesita investigación aparte (¿bloqueo por rango de IP más amplio? ¿outage
   puntual?); el healthcheck (guard 9d) y las alertas Resend ya cubren la degradación mientras
   tanto. Documentado en el PR #59, no bloqueó el merge del fix del 403.

**Resto de Parte B, verificado en vivo:**
- `RESEND_API_KEY` cargada en GitHub → **confirmado**: 3 mails de alerta reales llegaron a
  lautaroronchi97@gmail.com durante las pruebas de DEA.
- `SUPABASE_SERVICE_KEY` en Vercel: el primer intento quedó **con el nombre cargado pero sin
  valor** (variable vacía) — Lautoro lo completó con la key real de Supabase (`service_role`,
  Settings → API) + redeploy. Verificado con `/comercio/puertos` mostrando datos reales.
- Migración `20260722013200_e5_revoke_matviews_mesa.sql` **aplicada por MCP** — verificado con
  curl que `anon` ahora recibe 401 en `lineup_visitas`, y que la web sigue sirviendo datos (con la
  service key) sin degradar.
- Edge Functions fantasma `lineup-probe`/`lineup-fetch` **borradas** por Lautoro (dashboard).
- Healthcheck fresco post-merge: **17/17 en verde** ("Todas las tablas al día ✔").
- **Leaked password protection: DEFERIDO A PROPÓSITO.** El toggle en Supabase se ve verde pero el
  advisor de seguridad lo sigue marcando deshabilitado — la función requiere **Supabase Pro
  ($25/mes)**, y el proyecto está en plan Free (verificado con `get_organization`). Lautoro decidió
  no contratarlo por ahora. Queda pendiente, no bloqueante.

**Parte C (encendido del login) — arrancada, no cerrada:**
- 4 env vars básicas cargadas en Vercel (`NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY`/`_SITE_URL`,
  `AUTH_ENFORCED=false`) + redeploy.
- Google OAuth configurado: credenciales creadas en Google Cloud Console, cargadas en Supabase
  (Authentication → Providers → Google), redirect URLs configuradas. **Login con Google probado
  y funciona** (Lautoro entró con su cuenta, quedó admin auto-aprobado).
- App name "RF AGRO" + logo (isotipo convertido a PNG 512×512 con `sharp`, mandado por
  `SendUserFile`) cargados en el consent screen de Google.
- **Pendiente, anotado para retomar**: publicar la app de Google a producción (para que cualquiera
  pueda loguearse, no solo el dueño del proyecto de Google) — chocó con un paso nuevo de Google
  ("Estado de verificación — la información de tu marca debe verificarse", botón "Verificar la
  marca" que aparecía deshabilitado). **Aclarado con Lautoro: publicar la app es gratis** (no
  requiere plan pago de Google ni de Supabase); lo único pago es sacar el texto
  "gbpfgfeksqmzmsxnxiwg.supabase.co" de la pantalla de Google por uno propio, que sí requiere
  Supabase Pro y es solo estético — no bloquea el login. Quedó sin resolver **qué botón exacto usar
  para publicar** dado el flujo nuevo de verificación de marca de Google; retomar pidiendo captura
  completa de la pantalla de OAuth consent screen.
- **AUTH_ENFORCED sigue en `false`** — la web sigue 100% pública, nada de esto afecta producción
  todavía.

**Próximo paso**: retomar Parte C — resolver el flujo de publicación de Google (o directamente
probar si ya funciona para otros usuarios sin publicar formalmente, dado que Lautoro es el único
que probó hasta ahora) → seguir el checklist de encendido de la Etapa 3 (aprobar a Mauro →
`AUTH_ENFORCED=true` → validación de 5 min).
