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

## Ahora (última actualización: 10/07/2026, sesión bases de gráficos)

**✅ SWITCH COMPLETO. Producción (Vercel) sirve `main`** con el rediseño premium + todos los paneles
de datos reales. Default de GitHub = `main` · Vercel Branch Tracking = `main`.

**Hecho esta sesión (PR #10, [`PLAN_BASES_GRAFICOS.md`](PLAN_BASES_GRAFICOS.md)) — bases para los
gráficos de posiciones y spreads:**
- **Pizarra Rosario histórica → tabla `pizarra_historico` CARGADA COMPLETA**: 5 granos (soja, maíz,
  trigo, girasol, sorgo), **2020-01-02 → 2026-07-07** (7.893 filas), en $ y US$, estimativos
  flagueados. Fuente: consulta histórica oficial de CAC. + script `ingest-pizarra.mjs` + cron.
- **CBOT → tabla `cbot_cierres`**: curva cercana actual cargada (20 posiciones vivas, ¢/bu **y
  USD/tn**) + `ingest-cbot.mjs` + workflow. **Falta el backfill histórico completo** (dispatch del
  workflow con `backfill=true`, tras mergear).
- **A3 desde 2020**: disparado el backfill de `ingest-cierres.yml` (`2020-01-01→2021-07-08`).

**En vuelo / pendiente de Lautaro:**
1. **Mergear el PR #10.** Recién ahí se pueden disparar los workflows nuevos (GitHub solo permite
   `workflow_dispatch` desde la rama default).
2. **Backfill CBOT completo:** Actions → *Ingesta cierres CBOT* → Run workflow → **backfill = true**
   (~129 contratos, ~25-30k filas).
3. **Verificar backfill A3 2020:** que `MIN(fecha)` de `futuros_cierres` sea 2020-01 (por SQL).

**Dato verificado 09/07**: el cron de cierres A3 YA corre solo (secrets `SUPABASE_URL`/
`SUPABASE_SERVICE_KEY` cargados) — los crons nuevos (pizarra, CBOT) usan esos mismos secrets y
arrancan solos al estar en `main`.

**Ramas vivas y su veredicto:**
| Rama | Estado |
|---|---|
| `main` | Única rama de integración y producción. |
| `claude/pending-tasks-review-72ywwf` | Sesión 09/07 (actualización de estado) → borrar tras merge. |
| `claude/futures-position-databases-j10vpr` | Sesión 09/07 (plan bases de gráficos, PR #10) → borrar tras merge. |

**Lo próximo (en orden — detalle en CONTEXTO «Pendientes»):**
0. Cerrar las bases de gráficos: mergear PR #10 → disparar backfill CBOT → **gráficos** (curvas,
   spreads, ratio A3↔CBOT, pizarra vs futuros). Detalle en `PLAN_BASES_GRAFICOS.md`.
1. Feed A3 en vivo (pases: cotización/volumen/bid-ask).
2. Sintéticos TIR (pago final por letra, IAMC). [Requiere tabla de Lautaro]
3. Fase B (resiliencia, tests, mobile) y backlog de datos (reactivar scrapers `lineup`/`compras`,
   lineups, calendario, reporte WhatsApp — lista completa en CONTEXTO «Pendientes» punto 5).
