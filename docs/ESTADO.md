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

## Ahora (última actualización: 11/07/2026, sesión calculadora negocios de planta)

**Hecho esta sesión (rama `claude/plant-business-calculator-0sf28m`) — calculadora "Negocios de planta":**
- Nueva calc (`src/components/calc-planta.tsx`) en la sección **Calculadoras**: arranca de un precio y
  descuenta seis rubros editables → **Precio final** + **Total de gastos** (todo USD, aritmética local).
- Rubros: **contra flete** · **secada** (`puntos × valor/punto`, modo Fijo 5 USD o "No fijo" editable, con
  desglose) · **merma volátil** (%, default 0,3, sobre el arranque) · **paritaria** (4,5) · **embolsado** ·
  **otros** (rubro abierto + concepto libre).
- **Arranque = pizarra CAC** (soja/maíz/trigo, `getPizarra()` en `page.tsx`) con selector de producto +
  precio editable (↺ vuelve a pizarra). lint/typecheck/build OK; aritmética y render verificados.
- Pendiente menor: girasol/sorgo en el selector (vía `pizarra_historico`) si Lautaro lo pide.
- Detalle: `docs/sesiones/2026-07-11-calc-negocios-planta.md`.

---

## Ahora previo (última actualización: 10/07/2026, sesión bases de gráficos)

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
- **A3 desde 2020 → COMPLETO**: backfill corrido y verificado — `futuros_cierres` ahora
  **2020-01-02 → 2026-07-08** (31.049 filas, +8.606 del tramo 2020→jul-2021).

**En vuelo / pendiente de Lautaro (bases de gráficos):**
1. **Mergear el PR #10.** Recién ahí se pueden disparar los workflows nuevos (GitHub solo permite
   `workflow_dispatch` desde la rama default).
2. **Backfill CBOT completo:** Actions → *Ingesta cierres CBOT* → Run workflow → **backfill = true**
   (~129 contratos, ~25-30k filas). Es lo único que falta para tener las 3 bases completas.

**Dato verificado 09/07**: el cron de cierres A3 YA corre solo (secrets `SUPABASE_URL`/
`SUPABASE_SERVICE_KEY` cargados) — los crons nuevos (pizarra, CBOT) usan esos mismos secrets y
arrancan solos al estar en `main`.

**Recién entrado a `main` de otras sesiones (contexto + pendientes de Lautaro):**
- **Portal de noticias (PR #12):** panel Noticias rediseñado (categorización propia por 6 temas, chips,
  15 fuentes) + cron horario `ingest-noticias.yml` → tabla `noticias`. Pendiente: 1ª carga a mano
  (Actions → *Ingesta noticias* → Run workflow); el cron arranca solo al estar en `main`.
  Detalle: `docs/sesiones/2026-07-10-portal-noticias.md`.
- **Feed A3 en vivo (PR #11):** Pases suma Comprador/Vendedor/Último/Vol del pase real y Arbitrajes suma
  Comprador/Vendedor del futuro (frescura ~60s por ISR, degrada solo sin creds). Pendiente: validar con
  datos reales en horario de rueda (10:30–17:00) tildando el scope Preview/Production en las 3 vars A3 de
  Vercel. Detalle: `docs/sesiones/2026-07-09-feed-a3-en-vivo.md`.

**Ramas vivas y su veredicto:**
| Rama | Estado |
|---|---|
| `main` | Única rama de integración y producción. |
| `claude/futures-position-databases-j10vpr` | Bases de gráficos (PR #10, ABIERTO) → mergear + backfill CBOT. |
| `claude/feed-a3-live-plan-obxzcz` · `claude/news-section-redesign-k3zctf` | PR #11 y #12 ya mergeados → borrar. |

**Lo próximo (en orden — detalle en CONTEXTO «Pendientes»):**
0. Cerrar las bases de gráficos: mergear PR #10 → disparar backfill CBOT → **gráficos** (curvas,
   spreads, ratio A3↔CBOT, pizarra vs futuros). Detalle en `PLAN_BASES_GRAFICOS.md`.
1. **Fase 2 del Feed A3 — histórico intradiario**: cron GH Actions `*/15 13-20 * * 1-5` UTC +
   `scripts/ingest-rueda.mjs` + tabla `snapshots` + `ingest_log` (INFRAESTRUCTURA.md). Habilita gráficos
   intradía. (La frescura ya está resuelta web-directa; esto es SOLO para guardar historia.)
2. Sintéticos TIR (pago final por letra, IAMC). [Requiere tabla de Lautaro]
3. Fase B (resiliencia, tests, mobile) y backlog de datos (reactivar scrapers `lineup`/`compras`,
   lineups, calendario, reporte WhatsApp — lista completa en CONTEXTO «Pendientes» punto 5).
