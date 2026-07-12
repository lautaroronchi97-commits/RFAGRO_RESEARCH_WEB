# PLAN — Rediseño de navegación "web en capas"

> Objetivo pedido por Lautaro: dejar de mostrar todo en una tira vertical larga y pasar a una web
> **navegable por secciones**: una portada tipo tablero donde clickeás un tópico y **entrás a esa parte**
> (con su propia dirección, compartible por link). Cada calculadora y cada reporte queda **explicado**
> (para qué sirve + cómo se hacen las cuentas) en lenguaje simple, sin revelar cómo se construyó la web ni
> por dónde se traen los datos. Se presenta como **producto propio de RF AGRO**.
>
> Este documento es SOLO el plan. No cambia código. La construcción va en sesiones siguientes, por fases.

---

## 0. Cómo está hoy (diagnóstico)

- **Una sola tira infinita.** `src/app/page.tsx` apila 22 paneles + 9 calculadoras bajo 4 títulos de
  texto (`Noticias` / `Granos` / `Calculadoras` / `Dólar y tasas`). No hay forma de "entrar a un tópico":
  se carga y scrollea todo junto. En celular son metros de scroll.
- **El menú mezcla dos cosas.** `src/components/site-header.tsx` combina **anclas** que saltan dentro de la
  home (`/#arbitrajes`, `/#pases`…) con **links a páginas** reales (`/graficos`, `/produccion`). Se ven
  iguales pero se comportan distinto, y no cubren todos los grupos (no existe "Calculadoras" como destino).
- **Ya hay dos páginas reales** (`/graficos` y `/produccion`): son la prueba de que el patrón "una página
  por tópico" ya funciona en el proyecto y conviene extenderlo a todo.
- **Se filtran las fuentes** en tres lugares: el sello de cada panel (`source-stamp.tsx`), los chips del pie
  de página (`site-footer.tsx`) y algunos textos sueltos (cinta, textos de `/produccion`).

---

## 1. Decisiones tomadas (confirmadas con Lautaro)

| Tema | Decisión |
|---|---|
| **Patrón de navegación** | **Sitio por páginas (hub).** Portada = tablero de tarjetas; cada grupo es su propia página con dirección propia. (No acordeón, no pestañas como esqueleto.) |
| **Agrupación** | Definida en este plan (§3). Se ajusta módulo por módulo si hace falta. |
| **Calculadoras** | Cada una con **link propio** (índice + una página por calculadora → se le manda a un cliente el link directo de UNA calculadora). |
| **Vista trader "tira"** | **No se conserva.** Se elimina la tira larga; todos (Lautaro y clientes) navegan por secciones. |
| **Noticias** | **Sección propia** con el portal completo + **titulares del día en el Inicio**. |
| **DJVE** | **Sección propia "Comercio exterior"** (hoy 1 panel; puede crecer). |
| **Fuentes** | Regla **"institución sí, puente no"** (§4): se muestra el organismo/mercado que ORIGINA el dato; se oculta SIEMPRE el proveedor técnico por el que se baja. Nunca la palabra "vía". |
| **Explicaciones** | Una por cada calculadora y cada reporte: "para qué sirve" + "cómo se hacen las cuentas", en criollo, cerradas por defecto, sin nombrar fuentes ni implementación (§5). |

---

## 2. Arquitectura (cómo se implementa, a alto nivel)

Esqueleto **multipágina** sobre Next.js App Router (App Router = cada carpeta con `page.tsx` es una ruta),
con **layout compartido** para no repetir el andamiaje (header + cinta + pie) en cada página.

```
src/app/
  layout.tsx                       (raíz: tema, tipografías, robots) — YA EXISTE
  (site)/                          (route group: NO cambia la URL, solo agrupa)
    layout.tsx                     (NUEVO: SiteHeader + Cinta + SiteFooter + RefreshOnFocus, UNA vez)
    page.tsx                       (Inicio = tablero)                         →  /
    granos/page.tsx                (NUEVO)                                    →  /granos
    dolar/page.tsx                 (NUEVO: dólar y tasas)                     →  /dolar
    comercio/page.tsx              (NUEVO: DJVE / comercio exterior)          →  /comercio
    calculadoras/
      layout.tsx                   (NUEVO: índice/nav de las 9)
      page.tsx                     (NUEVO: tablero de las 9 calculadoras)     →  /calculadoras
      [slug]/page.tsx              (NUEVO: una página por calculadora)        →  /calculadoras/a-fijar …
    graficos/page.tsx              (MOVER la que ya existe al route group)    →  /graficos
    produccion/page.tsx            (MOVER + pestañas Calendario/Estimaciones) →  /produccion
    noticias/page.tsx              (NUEVO: portal completo)                   →  /noticias
```

- **Layout compartido** (`(site)/layout.tsx`): renderiza header, cinta y pie **una sola vez**; cada página
  solo pone SUS paneles. Hoy cada `page.tsx` repite ese andamiaje a mano — esto lo elimina.
- **Navegación** con `<Link>` (ya se usa). El menú del header pasa a tener los **destinos reales** (Granos ·
  Dólar y tasas · Comercio exterior · Calculadoras · Gráficos · Producción · Noticias) — se termina la mezcla
  anclas/links. El **logo "RF AGRO" siempre lleva al Inicio** (estándar) y cada página muestra **migas de
  pan** (`Inicio › Sección › Subpágina`) para ubicarse y volver con un click.
- **Rendimiento**: cada página trae **solo lo suyo** (hoy la home regenera 31 componentes juntos). Cada
  ruta con su propio `revalidate`. Se puede bajar la cadencia de las páginas pesadas.
- **Las islas interactivas** (gráficos, calculadoras, noticias-client, pizarra editable) siguen igual: son
  Client Components que se montan dentro de su página.
- ⚠️ **Nota Next.js 16** (de `AGENTS.md`): antes de tocar rutas, leer la convención de *route groups* y
  *layouts* de esta versión en `node_modules/next/dist/docs/` — puede diferir de versiones previas.

---

## 3. Mapa del sitio (sitemap propuesto)

```
INICIO  (/)  — TABLERO, no la tira
   ├─ Cinta de precios (fija arriba, en el layout)
   ├─ "Lo importante hoy": titulares de noticias del día (link a la sección Noticias)
   └─ Grilla de tarjetas → una por sección, cada una con nombre + "para qué sirve" en 1 línea
                            (Granos · Dólar y tasas · Comercio exterior · Calculadoras ·
                             Gráficos · Producción · Noticias)

GRANOS  (/granos)
   ├─ Arbitrajes            (cuándo conviene vender a futuro vs. hacer caja hoy)
   ├─ Mejor para hacer caja (ranking de la salida más barata)
   ├─ Pases                 (costo/beneficio de correr la fecha de entrega)
   └─ Capacidad de pago     (referencia de cuánto puede pagar el comprador)

DÓLAR Y TASAS  (/dolar)
   ├─ Dólar futuro   ├─ Dólar linked   ├─ Implícitas combinadas
   ├─ Sintéticos · LECAPs   └─ Panel cambiario (volumen)

COMERCIO EXTERIOR  (/comercio)
   └─ DJVE (declaraciones de exportación)

CALCULADORAS  (/calculadoras)  — índice con las 9 en grilla simple (sin subgrupos), cada una con link propio:
   A fijar · Por porcentaje · Negocios con pagos · Pago diferido · Pases · Carry implícito ·
   Costos de operar · Estrategias con opciones · Negocios de planta

GRÁFICOS  (/graficos)      — YA EXISTE (spreads entre cosechas). Solo entra al layout y a la nav nueva.

PRODUCCIÓN  (/produccion)  — YA EXISTE. Se parte en dos pestañas para no re-scrollear:
   ├─ Calendario de informes      └─ Estimaciones de producción

NOTICIAS  (/noticias)      — portal completo (chips, categorías). En el Inicio van solo los titulares.
```

---

## 4. Regla de fuentes — "institución sí, puente no"

**Principio:** se muestra el **organismo o mercado que ORIGINA** el dato; se **oculta siempre** el proveedor
técnico / agregador / método por el que se baja. **Nunca** aparece la palabra "vía".

El sello de cada panel deja de mostrar el string técnico y pasa a mostrar **`[origen] · Actualizado HH:MM`**
(la hora ya la calcula `horaCordoba()`, con horario de verano contemplado). Se mantiene el ⚠ de "algún dato
puede estar demorado" pero con texto genérico.

**Tabla de aplicación (propuesta — confirmar las filas marcadas "a confirmar"):**

| Módulo | Origen a mostrar | Puente a ocultar |
|---|---|---|
| Arbitrajes / Mejor caja | Mercado de futuros · Bolsa/Cámara | endpoint técnico, scrape |
| Pases | Mercado de futuros | endpoint técnico |
| Capacidad de pago | Bolsa de Comercio | scrape |
| Dólar futuro / Panel cambiario | Mercado mayorista de cambios | — (ya es origen) |
| Dólar linked / Sintéticos · LECAPs | Mercado de deuda local | agregador |
| DJVE | Registro oficial de exportaciones | scrape |
| Producción / Estimaciones | Los organismos: USDA · CONAB · BCR · BCBA · SAGyP | endpoints, nombres de informe, base de datos |
| Gráficos (spreads) | Mercado de futuros local · Chicago · Bolsa/Cámara | endpoints técnicos |
| Noticias | El medio (el diario/portal linkeado) | el buscador de noticias intermediario |
| Cinta (dólar) | Mercado mayorista de cambios | agregadores |

**Focos a tocar (todos chicos y aislados):**
1. `src/components/source-stamp.tsx` — sacar el string técnico y dejar `[origen] · Actualizado HH:MM`.
   Cubre de una a todos los paneles porque todos rutean su origen por ahí.
2. `src/components/site-footer.tsx` — sacar los chips técnicos; dejar "Elaboración propia RF AGRO ·
   datos de mercado" + el disclaimer que ya está.
3. Textos sueltos — cinta (`title` con nombre de fuente) y textos de `/produccion` que hoy nombran
   endpoints/siglas técnicas → reescribir genérico.

> **Estados REAL/PARCIAL/EJEMPLO** (badge interno de honestidad de datos): NO revelan fuentes. **Decidido:**
> de cara al cliente se reemplaza ese badge por una **marca discreta "provisorio"** solo en los paneles que
> aún no son 100% reales (el resto, sin marca). No se inventa dato: se es prolijo, no engañoso.

---

## 5. Capa de explicaciones (para no técnicos)

Tres niveles de ayuda, reusando lo que ya existe (`InfoTip`, tokens `.strat-exp` / `.panel-note` /
`.prod-lede`), sin inventar CSS nuevo:

1. **Lede corto** arriba de cada página (1–2 frases: "para qué sirve esta sección").
2. **Bloque desplegable "¿Qué es esto?"** por calculadora y por reporte, **cerrado por defecto** (no molesta
   al que ya sabe), con dos subtítulos fijos: **"Para qué sirve"** y **"Cómo se hacen las cuentas"**.
3. **`InfoTip` inline** (el "?" que ya existe) para traducir términos sueltos (TNA, spread, disponible…),
   con un **glosario** único que comparte los textos.

**Regla de redacción:** hablar del **qué** (qué se compara, qué significa el número, qué decisión ayuda a
tomar). Nunca del **de dónde** (nada de instituciones-fuente ni siglas técnicas) ni del **cómo técnico**
(nada de scrape, tablas, APIs). Voseo, frases cortas.

**Ejemplo — Arbitrajes:**
> **Para qué sirve.** Te muestra cuánto te reconoce el mercado por esperar a entregar tu grano más adelante
> en vez de venderlo hoy. Si esa espera rinde una tasa alta en dólares, conviene vender a futuro y cobrar
> después; si rinde poco, conviene hacer caja hoy. Es la brújula para decidir cuándo vender.
> **Cómo se hacen las cuentas.** Tomamos el precio de venta de hoy y el precio para entregar en cada
> posición futura. La diferencia es el *spread*. Ese spread, como porcentaje sobre el precio de hoy, es la
> *tasa directa*; y llevada a un año según los días que faltan, la *tasa anual en dólares*. Podés cargar tu
> propio precio de hoy y todo se recalcula solo.

**Ejemplo — Pases:**
> **Para qué sirve.** Compara dos fechas de entrega del mismo grano y te dice cuánto cuesta (o cuánto te
> pagan) por "correr" la venta de la más cercana a la más lejana. Sirve para decidir si conviene estirar o
> adelantar un compromiso ya tomado.
> **Cómo se hacen las cuentas.** Es la diferencia de precio entre la posición cercana y la lejana; esa
> diferencia, anualizada por los días que hay entre una y otra fecha, te da la tasa del pase.

---

## 6. Plan de implementación por fases (bajo riesgo, commits chicos)

Cada fase: `npm run lint` + `npx tsc --noEmit` + `npm run build`, PR chico con base `main`, verificado en
navegador claro/oscuro. Ninguna fase toca fórmulas ni lógica de datos: es **relocalización + presentación**.

| Fase | Qué | Archivos clave |
|---|---|---|
| **0** | **Layout compartido** (sin cambio visual): route group `(site)/layout.tsx` con header + cinta + pie; que Inicio, `/graficos` y `/produccion` dejen de repetir el andamiaje. | `src/app/(site)/layout.tsx` (nuevo), `src/app/layout.tsx` |
| **1** | **Ocultar puentes + frescura**: sello → `[origen] · Actualizado HH:MM`; pie sin chips técnicos; textos sueltos genéricos (§4). | `source-stamp.tsx`, `site-footer.tsx`, `cinta.tsx`, `produccion/page.tsx`, `informes-panel.tsx` |
| **2** | **Rutas por grupo**: crear `/granos`, `/dolar`, `/comercio` moviendo los paneles desde `page.tsx` (solo mover JSX). | `granos/page.tsx`, `dolar/page.tsx`, `comercio/page.tsx` (nuevos) |
| **3** | **Inicio = tablero**: portada de tarjetas + "Lo importante hoy" (titulares + próximo informe + última estimación). Actualizar el menú del header a los destinos nuevos. | `(site)/page.tsx`, `site-header.tsx` |
| **4** | **Calculadoras sub-hub**: índice `/calculadoras` con las 9 + una página por calculadora (link propio). Producción con pestañas Calendario/Estimaciones. | `calculadoras/…` (nuevos), `produccion/page.tsx` |
| **5** | **Capa explicativa**: bloques "¿Qué es esto?" por calculadora y reporte + glosario, reusando `InfoTip`/`.strat-exp`. Redacción sin fuentes (§5). | componentes de cada panel/calc, nuevo bloque explicativo, glosario |
| **6** | **Pulido nav / mobile / accesibilidad**: menú responsive (drawer si hace falta), `aria-current` por ruta, foco/scroll al navegar. Evaluar sacar `robots noindex` cuando no quede nada "EJEMPLO" a la vista. | `site-header.tsx`, `layout.tsx` |

---

## 7. Decisiones cerradas (2ª ronda con Lautaro) y lo que queda fino

**Cerradas:**
- **Nombres del menú:** Granos · Dólar y tasas · Comercio exterior · Calculadoras · Gráficos · Producción ·
  Noticias (estilo "equilibrado").
- **Origen de Dólar linked / Sintéticos · LECAPs:** rótulo **"Mercado de deuda local"** (se oculta el agregador).
- **Calculadoras:** **sin subgrupos** — las 9 en una grilla simple, cada una con link propio.
- **"Lo importante hoy" (portada):** **solo titulares de noticias del día** (con link a Noticias).
- **Estado provisorio:** **marca discreta "provisorio"** en los paneles que aún no son 100% reales; el resto,
  sin marca (§4).
- **Ayudas de navegación:** **migas de pan** (`Inicio › Sección › Subpágina`) + **logo siempre-al-Inicio**.
  La **cinta clickeable queda para más adelante** (hoy el mapeo ítem→sección sería arbitrario).

**Fino, al construir (no bloquea):**
- Redacción final de cada explicación "¿Qué es esto?" (usar los ejemplos de §5 como molde).
- Cuántos titulares exactos en la portada (arrancamos con 3–4).
- Si más adelante Lautaro quiere reordenar/agrupar las 9 calculadoras, se cambia en un toque.

---

## 8. Qué NO cambia

- Ninguna **fórmula** ni **lógica de datos** (arbitrajes, pases, TNA, capacidad, etc. quedan idénticos).
- El **design system** "Pizarra electrónica" (`globals.css`): el vocabulario visual ya alcanza
  (`.wrap/.col/.panel/.sec-title/.strat-exp/.news-chip/.gx-preset`). La capa nueva es sobre todo estructura
  de rutas, casi sin CSS nuevo.
- Los dos **temas** (claro clientes / oscuro rueda) y el comportamiento de datos (ISR, `RefreshOnFocus`).
