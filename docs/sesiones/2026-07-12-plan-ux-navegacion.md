# Sesión 2026-07-12 — Plan UX / navegación "web en capas"

- **Rama:** `claude/website-ux-redesign-plan-irvt6k` · **PR:** #_ (base `main`, draft)
- **Objetivo pedido por Lautaro:** dejar la tira vertical larga y pasar a una web navegable por secciones
  (portada tablero → clickear un tópico y entrar a esa parte, con link propio), cada calculadora/reporte
  explicado en criollo, sin mostrar por dónde se traen los datos.

## Hecho
- **Análisis de IA/UX** con agente especialista de front-end (inventario de los 22 paneles + 9 calculadoras,
  diagnóstico de la tira larga y del menú mezclado anclas/links, 3 arquitecturas comparadas).
- **[`docs/PLAN_UX_NAVEGACION.md`](../PLAN_UX_NAVEGACION.md)**: plan por fases (0→6) del rediseño de
  navegación.
- **Fase 0 construida — layout compartido (sin cambio visual):** route group `src/app/(site)/` con
  `layout.tsx` que monta el andamiaje común (masthead + `RefreshOnFocus` + veta `awn` + pie) una sola vez;
  las 3 páginas (`/`, `/graficos`, `/produccion`) se movieron a `(site)/` con `git mv` (URLs intactas) y
  dejaron de repetir ese andamiaje. El nav se extrajo a `src/components/nav-links.tsx` (client, `usePathname`)
  porque los layouts no re-renderizan al navegar; `site-header.tsx` perdió el prop `active`. La **cinta sigue
  solo en la home** (sumarla al resto es de la Fase 3).

## Decisiones tomadas (y por qué)
- **Navegación = sitio por páginas (hub)** — Lautaro eligió "clickear un tópico y entrar" (multipágina),
  no acordeón ni pestañas de esqueleto. Se reusa el patrón que ya funciona en `/graficos` y `/produccion`.
- **Sin vista trader "tira"** — se elimina el scroll largo; todos navegan por secciones (Lautaro no quiere
  conservar la tira).
- **Calculadoras con link propio** — índice + una página por calc, para mandarle a un cliente el link de UNA.
- **Noticias** = sección propia + titulares en el Inicio. **DJVE** = sección propia "Comercio exterior".
- **Fuentes: "institución sí, puente no"** — se muestra el organismo/mercado que ORIGINA el dato (USDA,
  CONAB, Bolsa/Cámara, Chicago, mercado de futuros); se oculta el proveedor técnico/agregador; nunca "vía".
  El sello pasa a `[origen] · Actualizado HH:MM`.
- **Explicaciones** = bloque desplegable "¿Qué es esto?" por calculadora y reporte ("para qué sirve" +
  "cómo se hacen las cuentas"), cerrado por defecto, sin nombrar fuentes ni implementación.
- **Sitemap**: Inicio (tablero) · Granos · Dólar y tasas · Comercio exterior · Calculadoras · Gráficos ·
  Producción · Noticias. Layout compartido `(site)/layout.tsx` (header + cinta + pie una sola vez).

## Verificado
- Es un plan (docs). No hay build para correr. Rama al día con `main` (0 adelante / 0 atrás) al arrancar.

- **Fase 1 construida (parte estructural) — sellos de origen sin puentes + frescura:** decisión de Lautaro =
  **nombre propio de la institución**. `meta.source` relabeleado en libs y paneles (CEM/Matba ROFEX → Matba
  Rofex · CAC/BCR → Bolsa de Comercio de Rosario · data912 → Mercado de deuda local · criptoya/dolarapi →
  Mercado de cambios · Supabase/MAGyP → SAGyP · USDA(WASDE+PSD)/CONAB → USDA · CONAB), sin sufijos internos
  (+override/+modelo propio/+A3 en vivo). `source-stamp.tsx` → `[origen] · Actualizado HH:MM` + marca discreta
  `provisorio` (nuevo `.st-prov`) en vez del badge REAL/PARCIAL/EJEMPLO. `site-footer.tsx` sin chips técnicos
  (→ "Elaboración propia"). `cinta.tsx` chip "prov." con title genérico. Relabel bulk con `scratchpad/relabel.mjs`.

## Quedó pendiente / en vuelo
- **Fase 1 — parte pendiente:** las **notas al pie** de cada panel (`<span class="k">Real</span> …`) todavía
  nombran puentes (CEM, Supabase, data912, WASDE…). Son la **capa explicativa** → se reescriben limpias en la
  **Fase 5** (bloques "¿Qué es esto?"), para no hacer el trabajo dos veces. (Se puede adelantar si Lautaro quiere.)
- **Siguen fases 2→6**: rutas por grupo (`/granos`, `/dolar`, `/comercio`) · inicio tablero · calculadoras
  sub-hub con link propio · capa explicativa "¿Qué es esto?" · pulido nav/mobile.

## Decisiones de detalle (2ª ronda, ya cerradas — §7 del plan)
- Nombres del menú: estilo "equilibrado" (Granos · Dólar y tasas · Comercio exterior · Calculadoras ·
  Gráficos · Producción · Noticias).
- Origen de Dólar linked / Sintéticos·LECAPs: rótulo "Mercado de deuda local".
- Calculadoras: sin subgrupos (las 9 en grilla simple, cada una con link propio).
- Portada "Lo importante hoy": solo titulares de noticias del día.
- Estado provisorio: marca discreta "provisorio" en los paneles aún no 100% reales.
- Ayudas de navegación: migas de pan + logo siempre-al-Inicio (cinta clickeable = más adelante).

## Trampas descubiertas (para la próxima sesión)
- Las fuentes se filtran en **3 lugares** a la vez: `source-stamp.tsx` (el principal, cubre casi todo),
  los chips de `site-footer.tsx`, y textos sueltos (cinta `title`, textos/metadata de `/produccion`).
- **Next.js 16**: antes de crear route groups/layouts, confirmar la convención de esta versión en
  `node_modules/next/dist/docs/` (AGENTS.md avisa que hay breaking changes vs. lo conocido).
- El acordeón/colapsable bajo ISR **no ahorra render ni fetch** (el contenido igual va al HTML, solo se
  oculta con CSS): sirve para ordenar, no para performance. Por eso el esqueleto es multipágina, no acordeón.
