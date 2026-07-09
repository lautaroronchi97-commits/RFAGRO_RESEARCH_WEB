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

## Ahora (última actualización: 09/07/2026, sesión organización del repo)

**Producción (Vercel)**: sigue sirviendo `claude/new-session-frovqj` (datos reales SIN el rediseño
premium). El switch a `main` está pendiente de los pasos manuales de Lautaro (abajo).

**En vuelo:**
- PR de unificación (`claude/repo-branch-organization-lh2siw` → `main`): junta las dos historias
  (rediseño premium + datos/calculadoras/noticias), CONTEXTO único y este sistema de handoff.
  **Hasta que se mergee y se hagan los pasos manuales, NO arrancar trabajo nuevo de features.**

**Pasos manuales pendientes (Lautaro — detalle paso a paso en
[`PLAN_ORGANIZACION_REPO.md`](PLAN_ORGANIZACION_REPO.md)):**
1. Revisar la Preview del PR de unificación y mergearlo.
2. GitHub: rama default → `main`.
3. Vercel: Production Branch → `main`.
4. Verificar la web en producción (diseño premium + paneles de datos).
5. Borrar las ramas viejas (lista en el plan).
6. Al día hábil siguiente: chequear en Actions que el cron de cierres haya corrido desde `main`.

**Dato verificado 09/07**: el cron de cierres YA corre solo (secrets cargados, run #4 por schedule
exitoso, curva al día hasta el 08/07) — NO hay que cargar secrets ni correr ingestas a mano.

**Ramas vivas y su veredicto:**
| Rama | Estado |
|---|---|
| `main` | Única integración/producción (tras el switch). |
| `claude/repo-branch-organization-lh2siw` | PR de unificación en vuelo → borrar tras merge. |
| `claude/new-session-frovqj` | Default/producción VIEJA → borrar al final del switch. |
| `claude/pending-tasks-vzoa3c` | 100% integrada → borrar. |
| `claude/financial-data-web-infra-whg41m` | Código superado (PR #4); apunte rescatado a CONTEXTO → borrar. |
| `claude/premium-web-design-k60hly` | 100% en `main` → borrar. |

**Lo próximo (después del switch, en orden — detalle en CONTEXTO «Pendientes»):**
1. Feed A3 en vivo (pases: cotización/volumen/bid-ask).
2. Sintéticos TIR (pago final por letra, IAMC).
3. Fase B (resiliencia, tests, mobile) y backlog de datos (reactivar scrapers `lineup`/`compras`,
   lineups, calendario, reporte WhatsApp — lista completa en CONTEXTO «Pendientes» punto 5).
