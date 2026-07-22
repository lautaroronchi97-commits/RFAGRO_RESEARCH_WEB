---
name: informe-diario
description: >-
  Procedimiento del informe diario de RF AGRO (MP1 de docs/PLAN_INFORMES.md):
  generar la placa PNG vertical de research diario (datos automáticos + color
  de la rueda de Lautaro + prosa con su voz), guardarla, mandarla por mail y
  dejarla en /informes. Usar cuando se pida "generá el informe diario" o la
  Routine diaria (post-cierre, días hábiles) lo dispare.
---

# Informe diario — procedimiento

Sos quien redacta y arma el informe diario de la mesa de RF AGRO. Todos los días
hábiles, post-cierre, generás UNA placa PNG (~1080×1600) con los datos del día +
prosa con la voz de Lautaro, la mandás por mail y queda en `/informes`. Es
DIARIO: no debe abrumar — una placa que se lee en 30-60 segundos.

## Requisitos (env vars del entorno)

| Var | Para qué |
|---|---|
| `INFORME_BASE_URL` | Base de la web (producción; `http://localhost:3000` en pruebas locales) |
| `INFORME_TOKEN` | Token del endpoint de datos y de la plantilla |
| `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` | Guardar el registro, leer el color de la rueda, subir el PNG (Storage) |
| `RESEND_API_KEY` + `RESEND_FROM` + `ADMIN_EMAILS` | Mandar el mail con la placa adjunta |

Si falta alguna, avisá el faltante en el resumen final y hacé lo que se pueda
(nunca inventes datos ni mandes el mail sin la key).

## Paso 0 — Voz (siempre antes de redactar)

Leé la skill `voz-lautaro` (`SKILL.md` + `references/ejemplos.md`). El molde es
el reporte **"Mesa de operaciones"** (recap diario): título de la jornada con
personalidad, comentario general en bullets, bloques por producto con precio +
variación + color, cierre con datos extras. Registro "placa": emojis
funcionales sí, hashtags no (esto no va a X, va por mail/WhatsApp).

## Paso 1 — Insumos (todos de la web; cero número inventado)

```
GET {INFORME_BASE_URL}/api/informes/datos?fecha=YYYY-MM-DD
    Authorization: Bearer {INFORME_TOKEN}
```

Sin `?fecha=` toma hoy (Córdoba). Devuelve: `cierres` (futuros por grano y
posición con `settlement` + `changePercent` vs la rueda anterior), `arbitrajes`
(spread/TNA disponible vs futuro), `pizarra` (CAC $ y USD por grano),
`dolarFuturo` (mayorista + curva DDF con TNA), `chicago` (los 5 de Chicago en
USD/tn + Δ), `noticias.destacados` (top 4 del día), `agenda` (informes de
hoy/mañana) y `color` (el texto que Lautaro cargó en `/admin/datos`, o `null`
si no cargó nada ese día — el informe sale igual).

Si la URL de producción no responde (la ruta recién deployada), levantá la web
local: `NODE_USE_ENV_PROXY=1 npm run build && npm run start` y usá
`http://localhost:3000`.

## Paso 2 — Redactar la prosa

Con el JSON del paso 1, armá:

- **titulo**: el título de la jornada, con personalidad según cómo estuvo el
  día ("DIA HISTORICO", "Que semanita…", "¡Volatilidad, al palo!" — ver
  `ejemplos.md`). Si `color` tiene texto, es tu insumo más rico para definirlo.
- **comentario**: 2-4 bullets (color de mercado del día). Integrá el `color`
  de Lautaro si existe; si no, describí el día con lo que dice `cierres` /
  `arbitrajes` / `noticias` (nunca inventes un negocio o sensación que no está
  en los datos ni en el color cargado).
- **lineas_por_grano**: un objeto `{ soj: "...", mai: "...", tri: "..." }` con
  UNA línea por grano (comentario breve del producto, en el tono del molde:
  "Al inicio de la rueda… los precios mejoraron…"). Basate en `changePercent`
  de `cierres` y el nivel de `pizarra`/`arbitrajes` de ese grano. Si un grano
  no tuvo cierres, decilo cualitativamente ("sin cierres hoy") en vez de
  inventar un movimiento.

Regla dura de `voz-lautaro`: **ni un número inventado**. Todo dato sale del
JSON del paso 1 o del `color` cargado por Lautaro.

## Paso 3 — Guardar el borrador

```
POST {SUPABASE_URL}/rest/v1/informes_generados
headers: apikey + authorization Bearer {SUPABASE_SERVICE_KEY},
         content-type: application/json, prefer: return=representation,resolution=merge-duplicates
body: [{ "tipo": "diario", "fecha": "YYYY-MM-DD", "titulo": "<titulo>",
         "prosa": { "titulo": "<titulo>", "comentario": [...], "lineas_por_grano": {...} },
         "estado": "borrador" }]
```

El UNIQUE `(tipo, fecha)` + `resolution=merge-duplicates` hace idempotente un
re-run del mismo día (pisa el borrador anterior si volvés a correr antes de
mandarlo). Guardá el `id` que devuelve la respuesta.

## Paso 4 — Screenshotear la placa

La plantilla (`/informes/plantilla/diario?fecha=YYYY-MM-DD&token={INFORME_TOKEN}`)
lee el borrador recién guardado y arma el layout con la marca de la web (tema
claro, decidido con Lautaro el 22/07). Con Playwright:

```bash
npm install playwright-core --no-save   # no está en package.json a propósito
```

```js
import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
// NO correr "playwright install": el chromium ya está en esa ruta.
const page = await browser.newPage({ viewport: { width: 1080, height: 1000 } });
await page.goto(`${INFORME_BASE_URL}/informes/plantilla/diario?fecha=${fecha}&token=${INFORME_TOKEN}`, { waitUntil: "networkidle" });
await page.screenshot({ path: `informe-${fecha}.png`, fullPage: true });
await browser.close();
```

## Paso 5 — Subir el PNG al bucket privado

```
POST {SUPABASE_URL}/storage/v1/object/informes/diario/{fecha}.png
headers: apikey + authorization Bearer {SUPABASE_SERVICE_KEY}, content-type: image/png
body: <bytes del PNG>
```

Guardá el path (`diario/{fecha}.png`) — es lo que va en `path_png` del registro
(`PATCH informes_generados?id=eq.{id}` con `{"path_png": "diario/{fecha}.png"}`,
mismos headers + `content-type: application/json`).

## Paso 6 — Mandar el mail

```
POST https://api.resend.com/emails
headers: authorization Bearer {RESEND_API_KEY}, content-type: application/json
body: { "from": "{RESEND_FROM}", "to": [...ADMIN_EMAILS separados por coma],
        "subject": "Informe diario RF AGRO — {fecha DD/MM}",
        "html": "<breve, 2-3 líneas + 'ver en /informes'>",
        "attachments": [{ "filename": "informe-{fecha}.png", "content": "<PNG en base64>" }] }
```

Si `RESEND_API_KEY` falta, saltealo y decilo en el resumen — no es motivo para
no completar el resto.

## Paso 7 — Marcar enviado

```
PATCH {SUPABASE_URL}/rest/v1/informes_generados?id=eq.{id}
headers: apikey + authorization Bearer {SUPABASE_SERVICE_KEY}, content-type: application/json
body: { "estado": "enviado" }
```

Recién ahí la fila aparece en `/informes` (RLS: anon solo ve `estado=enviado`).

## Paso 8 — Cierre

Resumen final: título del día, si el color de Lautaro estaba cargado o no, qué
insumo degradó (si alguno), y si el mail salió. Si algo falló a mitad de
camino, decilo fuerte — nunca en silencio (ej. "se generó el PNG pero no se
pudo mandar el mail: falta RESEND_API_KEY").

## Modo de prueba

Con `--fecha` (o pedido "en seco"): corré los pasos 1-4 y mostrá el PNG SIN
guardar en Supabase ni mandar mail — marcá "PRUEBA — no persistido".
