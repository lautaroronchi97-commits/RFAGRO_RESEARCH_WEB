# Sesión 2026-07-21 — Auditoría E3 (UX / navegación)

- **Rama:** `claude/auditoria-e3-ux-auikht` · **PR:** #_ (base `main`, draft)
- **Objetivo pedido por Lautaro:** ejecutar la etapa E3 del PLAN_AUDITORIA — recorrer TODAS las rutas
  × 4 lentes (mesa · cliente · mobile · tema) y entregar el informe de hallazgos (FASE 1, sin tocar
  producto).

## Hecho
- **Informe [`auditoria/E3-ux.md`](../auditoria/E3-ux.md)**: 11 hallazgos priorizados + 6 dudas para
  Lautaro + análisis por página (4 preguntas del prompt) + "lo que está bien".
- **152 capturas** en [`auditoria/screenshots-e3/`](../auditoria/screenshots-e3/) (38 rutas × claro/
  oscuro × 1440/390px), comprimidas con `sharp` (45→18 MB).
- **Verificación técnica de degradaciones** con requests reales a PostgREST (anon) y MCP Supabase:
  se probó que las vistas **no materializadas** `djve_embarques_mes` y `lineup_estacional` tiran
  **HTTP 500 bajo concurrencia** (12/12 y 10/10), mientras las matviews (`djve_cobertura`,
  `lineup_embarcado_mes`) aguantan (0 fails) — causa raíz de la página vacía de embarques (H1) y la
  columna RITMO vacía de empresas (H6).

## Decisiones tomadas (y por qué)
- **Bypass de auth solo local y temporal** (`E3_AUDIT_BYPASS` env → NO-OP en `requireAdmin` + passthrough
  en `proxy.ts`) para ver `/admin` y `/comercio/*`. **Revertido y verificado con `git diff` limpio** +
  `grep` en cero antes de commitear (los 2 archivos de `src/auth` volvieron a su estado original).
- **Screenshots exhaustivos** (todas las rutas × 4 variantes) en vez de solo las de hallazgos: al ser una
  auditoría "página por página" para que Lautaro decida, conviene el registro completo; se comprimieron
  para que pesen razonable.
- **No se corrigió nada** (FASE 1). Las correcciones aprobadas van a FASE 2 en este mismo PR; los
  rediseños grandes (pestañas de producción) se marcan «diferido a E7» si Lautaro lo pide.

## Verificado
- `npm run lint` + `npx tsc --noEmit` + `NODE_USE_ENV_PROXY=1 npm run build` en **verde sin el bypass**.
- Build local con datos reales (Supabase anon) + navegación Playwright en claro/oscuro y 2 viewports.
- Overflow horizontal mobile medido (`document.scrollWidth`): 485px vs 390px en 10/11 rutas `(site)`,
  culpable `.head-tools` (w=475).

## Quedó pendiente / en vuelo
- **Decisión de Lautaro hallazgo por hallazgo** (columna «Decisión» del informe + las 6 dudas). Recién
  después → FASE 2 (implementar solo lo aprobado en esta rama).
- H1/H6 (materializar las 2 vistas) son fix de **datos → E5/E1**: se anotan en «Para otras etapas».

## Trampas descubiertas (para la próxima sesión)
- Las **vistas no-materializadas sobre `djve` (334k filas) tiran 500 bajo la concurrencia del build**
  (Next prerenderiza con 3 workers en paralelo). El `git grep view` en `pg_class` distingue matview de
  view: `djve_embarques_mes`, `lineup_embarcado_mes` y `lineup_estacional` son `view`; el resto matview.
- `pkill -f "next-server"` **se auto-mata** (su propio cmdline matchea el patrón → exit 144): matar por
  puerto (`fuser 3000/tcp`) o PID.
- Next 16 (Turbopack) **NO inlinea** `process.env` server no-`NEXT_PUBLIC_` — lo lee en runtime; pero
  `next start` toma la env del proceso, no siempre `.env.local` para vars custom → pasarla explícita.
- Playwright no viene instalado: `npm install playwright-core --no-save` + `executablePath
  '/opt/pw-browsers/chromium'` (NO `playwright install`). El tema se fuerza con `localStorage.theme`
  (next-themes, `attribute="data-theme"`).
