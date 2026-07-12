# Sesión 2026-07-12 — Plan UX / navegación "web en capas"

- **Rama:** `claude/website-ux-redesign-plan-irvt6k` · **PR:** #_ (base `main`, draft)
- **Objetivo pedido por Lautaro:** dejar la tira vertical larga y pasar a una web navegable por secciones
  (portada tablero → clickear un tópico y entrar a esa parte, con link propio), cada calculadora/reporte
  explicado en criollo, sin mostrar por dónde se traen los datos.

## Hecho
- **Análisis de IA/UX** con agente especialista de front-end (inventario de los 22 paneles + 9 calculadoras,
  diagnóstico de la tira larga y del menú mezclado anclas/links, 3 arquitecturas comparadas).
- **[`docs/PLAN_UX_NAVEGACION.md`](../PLAN_UX_NAVEGACION.md)**: plan por fases (0→6) del rediseño de
  navegación. Solo plan, no toca código.

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

## Quedó pendiente / en vuelo
- **Construcción por fases** (0→6 del plan), en sesiones siguientes. Nada tocado de código todavía.
- **Decisiones abiertas menores** (§7 del plan): rótulos client-facing exactos y rótulo de origen de
  Dólar linked/Sintéticos; agrupamiento fino de las 9 calcs; contenido exacto del "Lo importante hoy";
  cómo mostrar el estado EJEMPLO/PARCIAL a clientes.

## Trampas descubiertas (para la próxima sesión)
- Las fuentes se filtran en **3 lugares** a la vez: `source-stamp.tsx` (el principal, cubre casi todo),
  los chips de `site-footer.tsx`, y textos sueltos (cinta `title`, textos/metadata de `/produccion`).
- **Next.js 16**: antes de crear route groups/layouts, confirmar la convención de esta versión en
  `node_modules/next/dist/docs/` (AGENTS.md avisa que hay breaking changes vs. lo conocido).
- El acordeón/colapsable bajo ISR **no ahorra render ni fetch** (el contenido igual va al HTML, solo se
  oculta con CSS): sirve para ordenar, no para performance. Por eso el esqueleto es multipágina, no acordeón.
