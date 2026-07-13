# Sesión 2026-07-13 — Verificación de bases de datos + resiliencia de ingestas

- **Rama:** `claude/rf-agro-project-tasks-0vlpkz` · **PR:** #25 (base `main`)
- **Objetivo pedido por Lautaro:** registrar el plan RF AGRO hasta 31/7 en el proyecto, y arrancar por
  la Tarea 1 — verificar las bases de datos actuales (detalle, cómo se actualizan, si corren los crons) y
  definir un plan de mejora + horarios de actualización.

## Hecho

### Registro del plan (Tarea 0)
- Se agregó a `docs/ESTADO.md` la sección **«Plan RF AGRO (backlog priorizado)»** con las 20 tareas en 4
  bloques (las semanas son solo orden, no deadlines). Checklist vivo para las próximas sesiones.

### Verificación de bases (Tarea 1) — auditoría en vivo
Se auditaron las 10 tablas de Supabase (`lineup-argentina`), sus 8 crons de GitHub Actions y los 10
scripts de ingesta (workflow de 10 agentes en paralelo). Estado real al 13/07:
- **Al día / OK:** `futuros_cierres` (08/07 — 09-10/07 fue feriado 9 de Julio + puente, no hubo rueda,
  verificado por SQL: A3 no operó pero CBOT sí el 09/07), `cbot_cierres` (09/07, T-1 por diseño),
  `noticias` (horario), `estimaciones_produccion` USDA (10/07) y CONAB (15/06, mensual).
- **Crons nuevos sin ciclo completo aún** (mergeados 10-12/07): `cbot`, `pizarra`, `estimaciones-ar`.
  El de `estimaciones-ar` **nunca corrió por schedule** (1er cron mié 15/07); su único run fue el dispatch
  backfill del 12/07.
- **Externas (no este repo):** `lineup` (06/07, scraper ISA), `djve` (07/07, `update_djve.py`), `compras`
  (11/06, **frenado**), `vencimientos` (seed).

### Hallazgo raíz: el "falso verde"
Los 10 scripts compartían un defecto: si el parser devolvía **0 filas** (cambió el HTML, renombraron un
producto, interstitial de Cloudflare con status 200), `upsert([])` no hacía ningún POST y el script salía
**verde**. Un run verde de Actions NO garantizaba datos. **Es lo que dejó a BCR-GEA congelado en
feb-2026 sin alarma.** Verificado: el scraper GEA **funciona hoy** (dry-run live = 16 filas, informe #196
del 08/07, soja 51,5 / maíz 68 / trigo 29,5 Mt); GEA quedó viejo porque **el cron live nunca corrió** (el
único run fue `--backfill` Wayback, que solo tenía hasta feb-2026).

### Arreglos aplicados (P1→P4, todo verificado)
- **P2 — Guard anti falso-verde** en los 8 scripts: en modo diario/live, 0 filas = `exit 1` (falla
  ruidosa). Respeta semántica: en backfill un 0 es legítimo, y en USDA el WASDE del mes puede no haber
  salido (0 ok si el PSD trae filas). GEA/DEA cambian el `return` blando por `exit 1` en live. Además, en
  `ingest-estimaciones-ar.yml` el paso DEA corre aunque GEA falle (`if: !cancelled()`).
- **P4 — Cron de pizarra**: de `0 21 * * 1-5` (18:00 ART) a **tres corridas por día hábil 10:30/10:45/
  11:00 ART** (`30 13`, `45 13`, `0 14` UTC). Si la pizarra del día no salió a las 10:30, la agarra la de
  10:45 u 11:00. Idempotente (ventana móvil 10 días + upsert por `(grano,fecha)`), las 3 corridas son
  inocuas. Decisión de Lautaro.
- **P3 — Healthcheck de frescura**: `scripts/healthcheck-frescura.mjs` + `.github/workflows/healthcheck.yml`
  (diario 20:45 ART). Revisa `max(fecha)` por tabla/organismo vs umbral de cadencia; si algo se atrasó →
  `exit 1` → workflow rojo → GitHub avisa por mail. Umbrales: diarias 7d (tolera feriado+puente+finde),
  noticias 2d, mensuales (USDA/CONAB/BCR) 45d, DEA 16d. Probado con fetch mockeado sobre los máximos
  reales: pasa todo y **detecta el GEA atrasado (152d → exit 1)**.
- **P1 — Descongelar GEA**: se dispararon dos runs de `ingest-estimaciones-ar` en `main` — live (informe
  julio #196) + backfill Wayback (recupera el vintage de **mayo 13/05**; mar/abr/jun no están archivados
  en Wayback ni en la página live → pérdida aceptable). GEA pasa de feb-2026 a **feb + may + jul**.

## Decisiones tomadas (y por qué)
- **Horario de pizarra 10:30/10:45/11:00 ART** — pedido explícito de Lautaro (a esa hora ya debería estar
  publicada). Implementado como 3 schedules (no lógica de reintento en el script) porque el upsert ya es
  idempotente → más simple y robusto.
- **Guard = `exit 1` solo en modo live/diario**, no en backfill — para no generar falsas alarmas rojas en
  rangos históricos legítimamente vacíos.
- **Alerta del healthcheck = workflow rojo (mail default de GitHub)** — no se armó canal nuevo
  (issue/Slack) para no sumar infra; el mail de scheduled-workflow-failed alcanza.
- **Umbrales holgados** en el healthcheck (diarias 7d) — el mayor hueco legítimo de una serie diaria es
  ~5 días (feriado + puente + finde); 7d evita falsas alarmas sin dejar de detectar un freeze real.

## Verificado
- lint ✓ · tsc ✓ · build ✓ (con `npm ci`).
- `node --check` en los 8 scripts editados + el healthcheck nuevo.
- Scraper GEA live: dry-run = 16 filas, informe #196 08/07 (coincide con ESTADO).
- Backfill Wayback feb→jul: 2 snapshots (feb-11 ya estaba, **may-13 nuevo**).
- Healthcheck: smoke test con `fetch` mockeado sobre los máximos reales → detecta GEA atrasado, resto ✓.
- Datos de frescura y feriado 9/7 confirmados por SQL directo a Supabase (MCP).

## Quedó pendiente / en vuelo
- **Verificar que los dos dispatches de GEA terminaron en verde y que BCR avanzó** en Supabase (feb→jul).
- **Confirmar esta semana** el primer ciclo por schedule de `cbot` (dispara cada noche), `pizarra` (nuevo
  horario mañanero) y `estimaciones-ar` (mié 15/07 GEA + vie 17/07 DEA) — que el healthcheck quede verde.
- **PAS (BCBA)** sigue pendiente (Cloudflare) — sin cambios esta sesión.
- **Externas**: `compras` frenada desde junio, `lineup`/`djve` dependen de scrapers de afuera del repo —
  decisión aparte si se reviven.
- **Opcional a futuro:** destrabar el filtro T-1 de CBOT (deja 1 día hábil de atraso evitable, no urgente).

## Trampas descubiertas (para la próxima sesión)
- **Un run VERDE de una ingesta NO implica que entraron datos** (era así hasta esta sesión) — el
  `upsert([])` no hace POST. Con los guards nuevos, ahora 0 filas en live pinta rojo. Igual, ante "¿por qué
  la tabla X está vieja?", correr el dry-run del script (`--out /tmp/x.json`) antes de sospechar del cron.
- **GEA/estimaciones-ar**: el schedule corre GEA los mié y DEA los vie, pero **ambos steps corren en cada
  trigger** (no hay `if` por día) — es idempotente, así que está bien.
- **La página de BCR-GEA hoy NO tiene Cloudflare** y parsea bien; Wayback archiva GEA ~esporádico (no todos
  los meses) → los meses recientes solo salen del scrape live, no del backfill.
- **Los JSON de `actions_list` del MCP de GitHub vienen con metadata enorme del repo** (>100k chars por
  pocas corridas) → conviene parsear el archivo guardado, no leerlo entero.
