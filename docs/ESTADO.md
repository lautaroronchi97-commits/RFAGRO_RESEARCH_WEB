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

## Ahora (última actualización: 09/07/2026, sesión Feed A3 en vivo)

**🟡 Feed A3 en vivo — código listo, falta validar con datos reales.** Se conectó el cliente A3 (que
estaba escrito pero dormido) a los paneles: **Pases** suma Comprador/Vendedor/Último/Vol del instrumento
de pase real, **Arbitrajes** suma Comprador/Vendedor del futuro. Frescura ~60s por la regeneración ISR de
la página (NO un cron: un cron de 60s no existe gratis; el cron queda para el histórico). Todo degrada
solo sin credenciales. `lint`/`typecheck`/`build` ✅. Detalle: `docs/sesiones/2026-07-09-feed-a3-en-vivo.md`.

**En vuelo (paso de Lautaro):** validar datos reales en la **Preview del PR** — tildar el scope
**Preview** en las 3 vars A3 de Vercel (`A3_API_BASE`/`A3_USERNAME`/`A3_PASSWORD`), redeploy de la Preview,
y en horario de rueda (10:30–17:00) comparar puntas/último/vol contra eTrader/Excel. Al aprobar: destildar
Preview y mergear. Antes del merge, en la Preview sin creds las columnas se ven en "—" (esperado).

**Contexto previo (sigue vigente):** producción sirve `main` con el rediseño premium + todos los paneles.
El cron de cierres (`ingest-cierres.yml`, 23:00 UTC hábiles) YA corre solo desde `main` (curva al día).

**Ramas vivas y su veredicto:**
| Rama | Estado |
|---|---|
| `main` | Única rama de integración y producción. |
| `claude/feed-a3-live-plan-obxzcz` | Sesión Feed A3 en vivo (esta) → borrar tras merge. |

**Lo próximo (en orden — detalle en CONTEXTO «Pendientes»):**
1. **Fase 2 del Feed A3 — histórico intradiario**: cron GH Actions `*/15 13-20 * * 1-5` UTC +
   `scripts/ingest-rueda.mjs` + tabla `snapshots` + `ingest_log` (INFRAESTRUCTURA.md). Habilita gráficos
   intradía. (La frescura ya está resuelta web-directa; esto es SOLO para guardar historia.)
2. Sintéticos TIR (pago final por letra, IAMC). [Requiere tabla de Lautaro]
3. Fase B (resiliencia, tests, mobile) y backlog de datos (reactivar scrapers `lineup`/`compras`,
   lineups, calendario, reporte WhatsApp — lista completa en CONTEXTO «Pendientes» punto 5).
