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

## Ahora (última actualización: 09/07/2026, sesión switch de producción a `main`)

**✅ SWITCH COMPLETO. Producción (Vercel) sirve `main`** con el rediseño premium + todos los paneles
de datos reales (verificado contra el sitio en vivo: CSS con tokens premium `#060A07`/`#0C130D` y
paneles Arbitrajes/Pases/Noticias/Calculadoras/Dólar/Capacidad/LECAPs presentes). Hecho el 09/07:
PR #8 mergeado · default de GitHub = `main` · Vercel Branch Tracking = `main` + promote a Production ·
ramas viejas borradas (en GitHub solo queda `main`).

**En vuelo:** nada. La cancha está limpia para arrancar features nuevas desde `main`.

**Único chequeo pendiente (Lautaro, mañana 10/07):** en Actions, verificar que el cron de cierres
(`ingest-cierres.yml`, corre 23:00 UTC hábiles) haya corrido solo **desde `main`** (la corrida del
09/07 00:07 UTC salió desde la default vieja porque era pre-switch). Si corrió y la curva está al día,
listo; si no, avisar en la próxima sesión.

**Dato verificado 09/07**: el cron de cierres YA corre solo (secrets cargados, run #4 por schedule
exitoso, curva al día hasta el 08/07) — NO hay que cargar secrets ni correr ingestas a mano.

**Ramas vivas y su veredicto:**
| Rama | Estado |
|---|---|
| `main` | Única rama de integración y producción. |
| `claude/pending-tasks-review-72ywwf` | Sesión 09/07 (esta actualización de estado) → borrar tras merge. |

**Lo próximo (en orden — detalle en CONTEXTO «Pendientes»):**
1. Feed A3 en vivo (pases: cotización/volumen/bid-ask).
2. Sintéticos TIR (pago final por letra, IAMC). [Requiere tabla de Lautaro]
3. Fase B (resiliencia, tests, mobile) y backlog de datos (reactivar scrapers `lineup`/`compras`,
   lineups, calendario, reporte WhatsApp — lista completa en CONTEXTO «Pendientes» punto 5).
