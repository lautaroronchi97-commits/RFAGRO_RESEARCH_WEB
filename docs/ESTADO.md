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

## Ahora (última actualización: 10/07/2026, sesión portal de noticias)

**🟢 Portal de noticias rediseñado** (rama `claude/news-section-redesign-k3zctf`, detalle en
`docs/sesiones/2026-07-10-portal-noticias.md`). El panel Noticias pasó de una lista plana con las
categorías de BCR a un **portal con categorización PROPIA** (6 categorías por tema: Mercados/Economía/
Internacional/Clima/Logística/Empresas), **chips de filtro**, tarjetas con glifo + fuente + "hace X h",
y **15 fuentes** (se sumaron La Nación Campo, Clarín Rural, Agrositio, dataPORTUARIA, TodoAgro, Cebada
Cervecera, Agrofy News, G1 Brasil, World-Grain). Un **cron horario** (`ingest-noticias.yml` →
`scripts/ingest-noticias.mjs`) las ingesta a la **tabla Supabase `noticias`** (migración aplicada);
la web lee de ahí con fallback en vivo. lint+tsc+build OK, render verificado en claro/oscuro con datos
reales.

**En vuelo:** PR de esta sesión (portal de noticias), base `main`, draft hasta verificar.

**⚠️ Acción de Lautaro tras el merge (noticias):** el cron de noticias corre desde la rama default
(`main`), así que **queda activo recién al mergear**. Los secrets (`SUPABASE_URL`/`SUPABASE_SERVICE_KEY`)
ya existen (los usa `ingest-cierres`). Para la 1ª carga se puede lanzar a mano en Actions → "Run workflow".

**Sesión anterior (Feed A3 en vivo, ya en `main` vía PR #11):** Pases suma Comprador/Vendedor/Último/Vol
del pase real y Arbitrajes suma Comprador/Vendedor del futuro (frescura ~60s por ISR, degrada solo sin
credenciales). Detalle: `docs/sesiones/2026-07-09-feed-a3-en-vivo.md`. **Paso pendiente de Lautaro:**
validar puntas/último/vol con datos reales en horario de rueda (10:30–17:00). Para ver datos reales hay
que tildar el scope **Preview/Production** en las 3 vars A3 de Vercel
(`A3_API_BASE`/`A3_USERNAME`/`A3_PASSWORD`); sin creds las columnas se ven en "—" (esperado).

**Contexto previo (vigente):** producción sirve `main` con el rediseño premium + todos los paneles. El
cron de cierres (`ingest-cierres.yml`, 23:00 UTC hábiles) YA corre solo desde `main` (curva al día) — NO
hay que cargar secrets ni correr ingestas a mano.

**Ramas vivas y su veredicto:**
| Rama | Estado |
|---|---|
| `main` | Única rama de integración y producción. |
| `claude/news-section-redesign-k3zctf` | Sesión 10/07 (portal de noticias) → borrar tras merge. |

**Lo próximo (en orden — detalle en CONTEXTO «Pendientes»):**
1. **Fase 2 del Feed A3 — histórico intradiario**: cron GH Actions `*/15 13-20 * * 1-5` UTC +
   `scripts/ingest-rueda.mjs` + tabla `snapshots` + `ingest_log` (INFRAESTRUCTURA.md). Habilita gráficos
   intradía. (La frescura ya está resuelta web-directa; esto es SOLO para guardar historia.)
2. Sintéticos TIR (pago final por letra, IAMC). [Requiere tabla de Lautaro]
3. Fase B (resiliencia, tests, mobile) y backlog de datos (reactivar scrapers `lineup`/`compras`,
   lineups, calendario, reporte WhatsApp — lista completa en CONTEXTO «Pendientes» punto 5).
