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

## Ahora (última actualización: 11/07/2026, sesión plan de gráficos de spreads)

**✅ SWITCH COMPLETO. Producción (Vercel) sirve `main`** con el rediseño premium + todos los paneles
de datos reales. Default de GitHub = `main` · Vercel Branch Tracking = `main`.

**✅ LAS 3 BASES DE GRÁFICOS ESTÁN COMPLETAS (verificado por SQL el 11/07):** PR #10 mergeado
(merge #14) y **backfill CBOT ya corrido** — `futuros_cierres` 31.049 filas (2020-01-02→08/07,
feriado 9/7 de por medio) · `cbot_cierres` **28.915 filas, 129 contratos** (→09/07) ·
`pizarra_historico` 7.893 filas (→07/07). Los 3 crons corren solos. Ya no queda nada pendiente de
[`PLAN_BASES_GRAFICOS.md`](PLAN_BASES_GRAFICOS.md).

**Hecho esta sesión (rama `claude/timeline-spread-charts-plan-3zlt1g`) — PLAN del panel de
gráficos de spreads entre cosechas ([`PLAN_GRAFICOS_SPREADS.md`](PLAN_GRAFICOS_SPREADS.md)):**
- Plan completo del panel que pidió Lautaro (sus 3 casos: maíz ABR vs JUL por campaña · soja NOV
  A3 vs Chicago · pizarra vs futuro seleccionable): catálogo de gráficos v1/v2/ideas, superposición
  de campañas (2 alineaciones de eje X), filtros, UX (`/graficos`), arquitectura (`/api/series` +
  vista `series_catalogo`), Recharts 3.9.2, fases 0→3.
- **⚠️ Bug real encontrado planificando:** PostgREST trunca a 1.000 filas con HTTP 206 y `sbSelect`
  lo trata como éxito (truncado silencioso) → Fase 0 del plan = fix en `src/lib/supabase.ts`.
- **Espera de Lautaro: responder las 29 PREGUNTAS del plan** (sección 9; P1–P11 antes de la Fase 2,
  ninguna bloquea la Fase 1) y aprobar → recién ahí se implementa.
  Evidencia medida en `docs/sesiones/2026-07-11-plan-graficos-spreads.md`.

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
| `claude/timeline-spread-charts-plan-3zlt1g` | Plan de gráficos de spreads (PR draft) → Lautaro responde preguntas → implementar. |
| `claude/futures-position-databases-j10vpr` · `claude/feed-a3-live-plan-obxzcz` · `claude/news-section-redesign-k3zctf` | PRs #10/#14, #11 y #12/#15/#16 ya mergeados → borrar. |

**Lo próximo (en orden — detalle en CONTEXTO «Pendientes»):**
0. **Gráficos de spreads**: Lautaro responde las preguntas de `PLAN_GRAFICOS_SPREADS.md` →
   Fase 0 (fix truncado 206 en `sbSelect`) → Fase 1 (caso maíz ABR vs JUL + par del Excel,
   validable contra su planilla).
1. **Fase 2 del Feed A3 — histórico intradiario**: cron GH Actions `*/15 13-20 * * 1-5` UTC +
   `scripts/ingest-rueda.mjs` + tabla `snapshots` + `ingest_log` (INFRAESTRUCTURA.md). Habilita gráficos
   intradía. (La frescura ya está resuelta web-directa; esto es SOLO para guardar historia.)
2. Sintéticos TIR (pago final por letra, IAMC). [Requiere tabla de Lautaro]
3. Fase B (resiliencia, tests, mobile) y backlog de datos (reactivar scrapers `lineup`/`compras`,
   lineups, calendario, reporte WhatsApp — lista completa en CONTEXTO «Pendientes» punto 5).
