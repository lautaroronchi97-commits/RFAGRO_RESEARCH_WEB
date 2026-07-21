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

## Quedó pendiente / en vuelo

- **Lautaro responde las 7 Dudas del informe** (fuente de compras · fix del refresh por MCP · casilla
  de alertas · DEA Edge vs retry · visibilidad de matviews al prender login · Vercel Pro · checklist
  de env vars por scope) + la columna Decisión de los 14 hallazgos → **FASE 2** implementa solo lo
  aprobado en esta misma rama/PR.
- Paso post-merge documentado: los cambios de workflows/scripts de fase 2 se prueban con
  `workflow_dispatch` recién cuando el PR llegue a `main` (GitHub solo despacha workflows de la
  default).
- Verificaciones de seguimiento anotadas en el informe: el healthcheck del 22/07 debería correr los
  15 checks (la extensión de E1 recién entró a `main`) y el cron de compras del jueves 23/07
  reinserta la semana 15/07 (+ las 7 basura si no se corrige antes).
