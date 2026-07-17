# Sesión 2026-07-17 — Landing institucional (presentación de servicios)

- **Rama:** `claude/desarrollos-pendientes-dbq59w` · **PR:** #32 (base `main`, junto con el logo)
- **Objetivo pedido por Lautaro:** ítem 3 del backlog — landing + presentación de servicios,
  separada del dashboard de datos. Enfoque de **venta** (atrapar al visitante), estilo referencia
  [praxis.chetech.com.ar](https://praxis.chetech.com.ar/).

## Hecho
- **`/bienvenida` reconvertida** en la landing institucional completa (scroll largo). Se **movió
  fuera del route group `(auth)`** (era una tarjeta de login) a `src/app/bienvenida/` con layout
  propio (`layout.tsx` = topbar + footer). La URL sigue siendo `/bienvenida` (ruta pública en
  `RUTAS_PUBLICAS`, path-based → moverla no rompe el gate).
- **Secciones** (`src/app/bienvenida/page.tsx`): hero (promesa) → problema → cómo funciona (01·02·03)
  → servicios (grilla de 6) → **vistazo al tablero** (mockups ilustrativos, sin datos reales, chip
  "Vista previa") → por qué RF AGRO (4 diferenciales) → **para acopios** (replicá el modelo de un
  correacopio) → equipo (sin nombres) → FAQ (`<details>`, sin JS) → contacto (formulario).
- **Topbar** (`components/landing/landing-topbar.tsx`): marca + anclas + Ingresar + CTA "Quiero
  asesoramiento" + toggle de tema. Nav oculta en mobile.
- **Formulario de contacto** (`components/landing/contacto-form.tsx` + `bienvenida/actions.ts` +
  `enviarConsulta` en `lib/auth/emails.ts`): server action pública, honeypot anti-spam, valida y
  envía por **Resend** a `ADMIN_EMAILS`. Degrada sin romper (loguea el lead si falta la key). Acuse
  neutral (no promete "te contactamos", pedido de Lautaro).
- **Estilos** `lp-*` nuevos en `globals.css` (reemplazan el bloque `.landing-*` de la landing
  mínima). Todo con tokens del tema → claro/oscuro solo. Reusa `.auth-btn` / `.auth-field`.
- **Link desde el dashboard**: "Conocé RF AGRO →" en el footer (`site-footer.tsx`).

## Decisiones tomadas (y por qué)
- **Página de venta, no folleto**: el producto (el tablero) es el protagonista, con capturas
  llamador. Decidido con Lautaro (12 preguntas de descubrimiento).
- **Textos** (borrador de Claude, editables por Lautaro). Confirmados por Lautaro: promesa "dejá de
  tomar decisiones a ciegas"; dolor = decidir sin comparar alternativas; **ambos públicos**
  (productores + acopios) con foco extra en **originación** para acopios; **más de 10 años** (no 8);
  servicio **premium a medida**; **no reemplaza al corredor, lo complementa** (FAQ dedicada); **sin
  precios** (presupuesto a medida); **sin nombres propios**; CTA = "Quiero asesoramiento".
- **Mockups ilustrativos** (no capturas reales): pedido de Lautaro de que sea un "llamador" no
  copiable; no hace falta dato real del día.
- **Contacto sin WhatsApp**, solo formulario (Resend). El acuse no promete contacto proactivo.
- **Sutil en el diferencial "alineados con tu resultado"** (sin mencionar comisiones), a pedido.

## Verificado
- `npx tsc --noEmit` ✅ · `npm run lint` ✅ · `npm run build` ✅ (`/bienvenida` queda estático).
- **Navegador** (server de producción): landing completa en **claro y oscuro**; **formulario
  end-to-end** (envío → acuse de éxito); FAQ abre/cierra; teaser legible. Screenshots en la sesión.

## Quedó pendiente / en vuelo
- El formulario **requiere `RESEND_API_KEY` + `ADMIN_EMAILS`** en Vercel para que los leads lleguen
  por mail (mismo requisito que los emails del login; hasta entonces el lead queda en los logs del
  server como backstop). No se persiste en base (decisión de alcance; se puede sumar una tabla
  `consultas` a futuro si Lautaro quiere no depender solo del mail).
- Textos = borrador para que Lautaro edite. Punto abierto marcado: encuadre del diferencial "del
  lado del cliente".
- La landing hereda `noindex` del root layout (todo el sitio es noindex por datos provisorios). Si
  se quiere indexar la landing para SEO, hay que overridear el `robots` en su metadata.

## Trampas descubiertas (para la próxima sesión)
- **`react/no-unescaped-entities`**: en el texto JSX no usar comillas ni apóstrofes rectos (`"` `'`).
  Los textos largos se pusieron en arrays de strings (donde las comillas SÍ están permitidas) y el
  JSX quedó sin comillas literales.
- Al mover una página de route group, **borrar la vieja** (si no, conflicto de ruta) y **limpiar
  `.next`** antes del typecheck (queda un `validator.ts` generado apuntando a la ruta vieja).
- Existe una skill **`voz-lautaro`** para su voz personal de mercado — usarla para los **informes**
  (ítem 11), no para copy institucional/de venta.
