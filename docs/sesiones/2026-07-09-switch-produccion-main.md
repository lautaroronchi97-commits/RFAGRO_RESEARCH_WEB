# Sesión 2026-07-09 — Switch de producción a `main` (verificado)

- **Rama:** `claude/pending-tasks-review-72ywwf` · **PR:** base `main`
- **Objetivo pedido por Lautaro:** repasar qué tareas quedaban pendientes; terminó siendo la
  ejecución guiada de los pasos manuales del switch (PLAN_ORGANIZACION_REPO.md) y su verificación.

## Hecho
- Auditoría del estado real vs `ESTADO.md` (que había quedado desactualizado): PR #8 ya estaba
  mergeado, la default de GitHub ya era `main` y las ramas viejas ya estaban borradas.
- Guía a Lautaro para los pasos de Vercel: **Branch Tracking → `main`** (Settings → Environments →
  Production) y **Promote to Production** del deployment del merge del PR #8 (cambiar el tracking
  NO redeploya solo — solo aplica a los próximos pushes).
- Verificación programática de producción (https://rfagro-research-web.vercel.app): el CSS servido
  pasó de los colores del tema oscuro viejo (`#080c09`…) a los tokens premium (`#060A07`/`#0C130D`),
  y el HTML contiene todos los paneles (Arbitrajes, Pases, Noticias, Calculadoras, Dólar futuro,
  Dólar linked, Capacidad, LECAPs).
- Actualización de la sección «Ahora» de `docs/ESTADO.md` (switch completo, cancha limpia).

## Decisiones tomadas (y por qué)
- Ninguna decisión de negocio/fórmulas. Solo cierre operativo del plan de organización del repo.

## Verificado
- lint / typecheck / build (docs-only, pero el CI corre igual).
- Producción en vivo: CSS premium + paneles presentes (curl + grep de tokens y títulos).
- GitHub: `ls-remote` muestra solo `main` (+ la rama de esta sesión); HEAD branch = `main`.
- Actions: run #4 del cron (schedule, success, 09/07 00:07 UTC) salió desde la default vieja
  (pre-switch), como era esperable.

## Quedó pendiente / en vuelo
- **Chequeo del cron mañana (10/07)**: confirmar en Actions que la corrida de las 23:00 UTC del
  09/07 salió desde `main` y la curva quedó al día. Es el paso 6 (último) del plan.
- Después: arrancar el Feed A3 en vivo (punto 1 de «Lo próximo» en ESTADO).

## Trampas descubiertas (para la próxima sesión)
- Cambiar el **Branch Tracking** de Vercel no dispara un deploy: hay que promover a Production un
  deployment existente de `main` (menú "..." → Promote to Production) o esperar el próximo push.
- Los deployments con etiqueta "Preview" en Vercel son históricos e inofensivos; solo la fila con el
  badge azul **Production** sirve tráfico.
- El proyecto de Vercel NO es visible vía el MCP de Vercel conectado (el team `chona97` devuelve 0
  proyectos) → los pasos de Vercel se hacen desde el dashboard.
