# Plan de organización del repo (09/07/2026)

> Para Lautaro. Explica qué estaba pasando con las ramas, qué ya quedó resuelto en el PR de esta
> sesión, y los **6 pasos manuales** (con cada click) que faltan para cerrar el tema. Tiempo total: ~10 min.

## 1. Qué estaba pasando (el diagnóstico)

Tu sensación era correcta: **no estabas trabajando sobre tu última actualización**. El repo tenía DOS
"troncos" avanzando en paralelo sin verse entre sí:

```
                    ┌── PR #5, #6 (rediseño premium) ──►  main
(base común 07/07) ─┤
                    └── PR #1, #3, #4, #7 (datos, calculadoras,
                        noticias, CONTEXTO) ──►  claude/new-session-frovqj  ◄─ default + producción
```

- **`main`** tenía el rediseño premium pero **ninguno** de los 39 commits de datos.
- **`claude/new-session-frovqj`** (la rama *default* de GitHub y la que sirve Vercel en producción)
  tenía todos los datos pero **no** el rediseño → la web pública nunca mostró el diseño nuevo.
- Cada tronco actualizaba **su propio `CONTEXTO.md`** → cada sesión nueva leía una historia incompleta.
- El cron de cierres no corre porque los `schedule` de GitHub Actions solo corren desde la rama
  default y además faltan los secrets.

**Causa raíz:** cuando abrís una sesión nueva de Claude, su rama se crea desde la rama **default** de
GitHub. Como la default era `claude/new-session-frovqj` pero el rediseño se mergeó a `main`, cada mitad
del trabajo quedó en un tronco distinto.

## 2. Veredicto rama por rama

| Rama | Qué tiene | Veredicto |
|---|---|---|
| `main` | Rediseño premium (PRs #5/#6) | **Se queda**: será LA única rama de integración y producción |
| `claude/new-session-frovqj` | Datos/calculadoras (PRs #1/#3/#4/#7) | Borrar al final (paso 6), cuando ya nada la apunte |
| `claude/pending-tasks-vzoa3c` | Nada propio (100% integrada) | Borrar |
| `claude/financial-data-web-infra-whg41m` | Código viejo superado por el PR #4; su apunte de CONTEXTO ya fue rescatado | Borrar |
| `claude/premium-web-design-k60hly` | Nada propio (100% en `main`) | Borrar |
| `claude/repo-branch-organization-lh2siw` | El PR de unificación de esta sesión | Borrar después de mergearlo |

Los 7 PRs históricos están todos cerrados; no hay trabajo colgado en ningún PR abierto.
**Nada de lo que se borra pierde trabajo** — se verificó commit por commit.

## 3. Qué ya quedó hecho en el PR de esta sesión

- **Unificación**: merge de `main` (rediseño) sobre la línea de datos → una sola historia con TODO.
  El único conflicto real era `globals.css`; se resolvió conservando el diseño premium + las clases de
  los módulos nuevos (calculadoras, noticias, curva, pizarra editable). Verificado con build.
- **`CONTEXTO.md` único**: junta las sesiones de los dos troncos + un apunte valioso (Supabase, API del
  CEM) que estaba solo en una rama huérfana, y corrige datos viejos ("Supabase no conectado" ya no era cierto).
- **Sistema de comunicación entre sesiones** (lo que pediste, en `docs/`):
  - **`docs/ESTADO.md`** — tablero vivo: qué hay en producción, qué está en vuelo, qué sigue. Entra por
    `CLAUDE.md`, así que **toda sesión nueva lo lee automáticamente al arrancar** — este es el archivo
    que pediste para "entender dónde estamos".
  - **`docs/sesiones/`** — un markdown por sesión (con plantilla). Como cada sesión crea SU archivo,
    nunca más dos sesiones pisándose el mismo doc.

## 4. Tus 6 pasos manuales (en este orden)

**Paso 1 — Revisar y mergear el PR de unificación.**
En GitHub → pestaña **Pull requests** → abrí el PR de esta sesión. Abajo en la conversación vas a ver el
deploy de **Vercel (Preview)** — entrá a ese link y chequeá que se vea el diseño premium CON todos los
paneles y calculadoras. Si está bien: botón **"Ready for review"** (si sigue en draft) y después
**"Merge pull request"** → **"Confirm merge"**.

**Paso 2 — Hacer que `main` sea la rama default de GitHub.**
En el repo → **Settings** (arriba a la derecha) → **General** → sección **Default branch** → click en el
ícono de flechitas (⇄) → elegí `main` → **Update** → confirmá. Desde acá, toda sesión nueva de Claude
sale de `main`, y los crons de Actions corren desde `main`.

**Paso 3 — Cargar los secrets del cron.**
**Settings** → **Secrets and variables** → **Actions** → botón **"New repository secret"**, dos veces:
- Name: `SUPABASE_URL` → Value: la URL del proyecto (Supabase → Project Settings → API → Project URL).
- Name: `SUPABASE_SERVICE_KEY` → Value: la clave **service_role** (misma pantalla de API; es la SECRETA,
  no la anon). Con esto el cron de cierres queda activo (corre 23:00 UTC, L-V).

**Paso 4 — Apuntar producción de Vercel a `main`.**
Vercel → tu proyecto → **Settings** → **Environments** → **Production** → en **Branch Tracking** poné
`main` → **Save**. Después andá a **Deployments** y verificá que haya un deploy de producción desde
`main` (si no arrancó solo: en el último deploy de `main`, menú "..." → **Promote to Production** /
**Redeploy**).

**Paso 5 — Verificar la web.**
https://rfagro-research-web.vercel.app tiene que mostrar el diseño premium con todos los paneles de
datos reales. Si algo se ve mal, avisame en una sesión nueva ANTES del paso 6.

**Paso 6 — Borrar las ramas viejas.**
GitHub → **Code** → link **"Branches"** (al lado del selector de ramas) → tachito 🗑 en:
`claude/pending-tasks-vzoa3c`, `claude/financial-data-web-infra-whg41m`,
`claude/premium-web-design-k60hly`, `claude/repo-branch-organization-lh2siw` (ya mergeada) y, último,
`claude/new-session-frovqj`. GitHub no deja borrar la default, por eso el paso 2 va antes. Si te
arrepentís, GitHub permite restaurar una rama borrada desde su PR.

**Bonus (recomendado) — Poner la curva al día.**
**Actions** → workflow **"Ingesta cierres"** → **Run workflow** (sin inputs) → Run. Los cierres estaban
congelados al 03/07; esto los actualiza ya mismo sin esperar al cron de la noche.

## 5. Cómo trabajamos de ahora en más (el protocolo)

Está formalizado arriba de todo en `docs/ESTADO.md` (toda sesión lo lee sola). En corto:

1. **Una sesión = una rama `claude/*` salida de `main` = un PR con base `main`.**
2. Al cerrar la sesión, Claude deja: su log en `docs/sesiones/AAAA-MM-DD-tema.md` + la sección «Ahora»
   de `ESTADO.md` actualizada, en el mismo PR.
3. **Mergeá el PR de una sesión antes de arrancar la siguiente** (o al menos mirá «En vuelo» en
   `ESTADO.md`). Así nunca más se superpone trabajo.
4. `CONTEXTO.md` queda como manual estable (fuentes, fórmulas, stack) — ya no acumula apuntes de sesión.

## 6. Qué NO hacer (las tres cosas que causaron este lío)

- ❌ Mergear PRs a una rama que no sea `main`.
- ❌ Tener dos sesiones editando `CONTEXTO.md` en ramas distintas a la vez.
- ❌ Dejar PRs de sesiones sin mergear mientras arrancás sesiones nuevas de features.
