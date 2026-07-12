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

- **Fase 2 construida — páginas por grupo + nav real:** nuevas rutas aditivas `src/app/(site)/{granos,dolar,
  comercio,calculadoras,noticias}/page.tsx` (cada una renderiza sus paneles bajo el layout compartido).
  `nav-links.tsx` = menú a los 7 destinos reales (Granos · Dólar y tasas · Comercio exterior · Calculadoras ·
  Gráficos · Producción · Noticias), activo por `pathname` con `startsWith` para subpáginas. `site-header.tsx`:
  el logo lleva al Inicio. La home sigue como tira larga hasta la Fase 3 (queda duplicación interina paneles
  home ↔ página de grupo). `/calculadoras` muestra las 9 juntas; la Fase 4 les da link propio.

- **Fase 3 construida — la home es el tablero:** `src/app/(site)/page.tsx` deja de ser la tira y pasa a
  portada = cinta + "Lo importante hoy" (titulares del día `noticias.destacados`, link-out + "Ver todas" a
  /noticias) + grilla de 7 tarjetas por sección (nombre + "para qué sirve") que linkean a cada grupo. Se
  quitan los paneles/calcs de la home → fin de la duplicación de la Fase 2. Estilos del hub en `globals.css`
  (`.hub-titulares`, `.hub-grid`, `.hub-card`, estética hairline + sombra + acento dorado).

- **Fase 4 construida — calculadoras con link propio:** `src/lib/calculadoras.ts` (registro slug/nombre/desc
  de las 9). `/calculadoras` pasa a índice de tarjetas (reusa `.hub-grid/.hub-card`). Ruta dinámica
  `/calculadoras/[slug]` con `generateStaticParams` (las 9) + `dynamicParams=false` (slug inválido → 404) +
  `generateMetadata` por calc + back link. Cada calc recibe su curva/pizarra (cache-deduped). Se puede mandar
  el link directo de UNA calc (ej. `/calculadoras/a-fijar`).

- **Fase 5 construida — capa explicativa + limpieza total de puentes (cierra también el pendiente de la Fase 1):**
  · **5a**: `src/components/que-es-esto.tsx` (`<details>` nativo, cerrado, "Para qué sirve" / "Cómo se hacen las
  cuentas"; estilos `.qee`) + explicaciones de las 9 calcs en `src/lib/calculadoras.ts`, renderizadas en
  `/calculadoras/[slug]`. · **5b**: se reemplazó la nota al pie de cada reporte por un "¿Qué es esto?" limpio y
  se sacaron TODOS los puentes que quedaban (arbitrajes, mejor caja, pases, capacidad +InfoTips · dólar
  futuro/linked/implícitas/sintéticos/cambiario · DJVE · noticias · estimaciones panel/cliente/mini · gráficos
  +página · calc-planta · cierres-panel · produccion). Barrido final de puentes en HTML servido = **limpio**.

- **Fase 6 construida — cierre:** `src/components/breadcrumbs.tsx` (client `usePathname`) monta las migas
  `Inicio › Sección › Subpágina` en el layout compartido (no en el Inicio; las subpáginas de calculadoras
  muestran el nombre de la calc). Estilos `.crumbs`. El nav ya scrollea horizontal en mobile → se deja.

## Estado: PLAN UX COMPLETO (Fases 0→6)
Sitio por páginas con portada tablero · calculadoras con link propio · fuentes "institución sí, puente no" ·
capa explicativa "¿Qué es esto?" en todo · migas de pan. Todo con build/lint/tsc ✅ en cada fase.

## Quedó pendiente / en vuelo
- **`robots noindex` se mantiene** hasta que no queden datos provisorios en pantalla (cinta pizarra de ejemplo,
  paneles parciales sin poblar). Cuando esté todo real, evaluar pasar a `index`.
- **Drawer/hamburguesa mobile** (opcional): hoy el nav de 7 ítems scrollea horizontal; si se quiere, se puede
  hacer un menú colapsable más adelante.
- Merge del PR #22 a `main` cuando Lautaro lo apruebe.

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
