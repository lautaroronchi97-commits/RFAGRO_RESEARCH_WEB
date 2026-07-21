# Research P3 — Compras netas del BCRA en el MULC (fuente para el panel cambiario)

> **Fase RESEARCH del prompt P3 de [`PLAN_BACKLOG.md`](../PLAN_BACKLOG.md)** (ítem 12 del backlog:
> compras netas BCRA + acumulado de rueda USD). Ejecutada el **21/07/2026** con requests reales.
> **NO se construyó nada**: este doc es el insumo para que Lautaro elija fuente y alcance; la fase
> build corre en otra sesión tras su OK.

## TL;DR / Recomendación

**Existe el dato oficial, diario, en USD y por API — no hace falta scrape ni carga manual.**
La API v4 de monetarias del BCRA (la misma que ya figura como fuente en `CONTEXTO.md`) publica la
variable **id 78 — "Variación de reservas internacionales por compra de divisas"**: millones de USD
por día hábil, historia **desde 2003** (5.768 filas), sin auth. Se verificó que es **exactamente** la
compra neta de divisas al **sector privado** (la intervención en el MULC), sin mezclar operaciones
con el Tesoro. Único costo: **rezago ~3 días hábiles** (es la planilla "Series.xlsm" del BCRA).

Propuesta: ingerir la var 78 (+ 47/48 como columnas de contexto) a una tabla `bcra_mulc`, mostrar en
el panel cambiario el último dato + acumulados mensual/anual + mini-serie, con sello honesto
"BCRA · rezago ~3 días hábiles". El **color del día** lo sigue dando el volumen MAE que el panel ya
muestra (proxy en vivo). El fallback de carga manual en `/admin` queda descartado salvo que Lautaro
quiera el dato del día exacto (que solo circula por canales informales).

## Qué se probó (requests reales del 21/07/2026)

### (a) BCRA oficial — API v4 de monetarias ✅ GANADORA

`GET https://api.bcra.gob.ar/estadisticas/v4.0/monetarias` → 1.581 variables (paginado, `limit` máx
3000, `offset`). Tres variables relevantes, todas diarias, historia **2003-01-02 → hoy**:

| id | Descripción | Unidad |
|---|---|---|
| **78** | **Variación de reservas internacionales por compra de divisas** | **millones de USD** |
| 47 | Efecto monetario de las compras netas de divisas al sector privado y otros | millones de ARS |
| 48 | Efecto monetario de las compras netas de divisas al tesoro nacional | millones de ARS |

- **Serie**: `GET /estadisticas/v4.0/monetarias/78?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&limit=3000`.
  Historia completa = 5.768 filas → **backfill entero en 2 requests**. Sin auth, JSON limpio.
- **Semántica verificada** (clave): en TODOS los días chequeados, incluidos los 14 días desde 2025
  con var 48 ≠ 0, se cumple **var 78 = var 47 ÷ TC mayorista (var 5)** — NO incluye la var 48.
  Ejemplos: 15/07/2026 → 107.781 M ARS ÷ 1.475,44 = **73,0** = var 78; 18/05/2026 (día con venta
  al Tesoro de −2,37 B ARS) → var 78 = 158 = solo la pata privada. Conclusión: **la var 78 es la
  compra neta al sector privado = la intervención en el MULC**, que es el número que publican los
  analistas ("hoy el BCRA compró USD X millones").
- **Rezago medido**: al 21/07 el TC mayorista (var 5) llega al 20/07 pero las vars 47/48/78 llegan
  al **15/07** → **~3 días hábiles** (la categoría de la API es literalmente "Series.xlsm", la
  planilla de series diarias que el BCRA publica con ese rezago estándar).
- Muestra real (julio 2026, M USD): 01/07 +25 · 02/07 +25 · 03/07 +100 · 06/07 +81,5 · 07/07 +25 ·
  08/07 +34 · 13/07 +280 · 14/07 +532 · 15/07 +73.
- No hay ninguna serie del MULC más fresca en la API: se revisaron las 71 series diarias
  actualizadas al 17-20/07 (categoría "Informe Monetario Diario" incluida) — son TC y tasas, nada
  de divisas.

### (b) Semi-oficiales del día (X / Telegram / consultoras / medios) ❌ NO AUTOMATIZAR

Publican el número del día a las ~17 h (mismo día), pero: no hay API; X requiere auth y su scrape
viola TOS; los medios (Ámbito etc.) lo publican en prosa dentro de notas sin formato estable →
parser frágil y de licitud dudosa. Solo servirían para el **dato del día exacto**; no lo valen
frente a una serie oficial que llega 3 días después y un proxy en vivo que ya tenemos (volumen MAE).
Si algún día Lautaro quiere el dato del día en la web, el camino digno es **carga manual en /admin**
(patrón "color de la rueda" de MP1), no un scraper de X.

### (c) Volumen MAE como proxy del día ✅ YA ESTÁ EN EL PANEL

El panel cambiario ya muestra el volumen operado en MAE (en vivo). No dice cuánto compró el BCRA,
pero da el color de la rueda el mismo día. Se mantiene tal cual, complementando la serie oficial.

## Tabla comparativa

| Fuente | ¿Dato exacto? | Rezago | Historia | Fragilidad | Automatizable |
|---|---|---|---|---|---|
| **BCRA API v4 var 78** | **Sí (oficial, USD)** | ~3 días hábiles | 2003→hoy (5.768 filas) | Muy baja (API JSON estable, ya usada como patrón en el repo) | ✅ |
| BCRA API v4 vars 47/48 | Sí (oficial, ARS) | ~3 días hábiles | 2003→hoy | Muy baja | ✅ (contexto/validación cruzada) |
| X / Telegram / medios | Estimado del día | Mismo día | No | Muy alta + TOS | ❌ |
| Carga manual /admin | Lo que cargue Lautaro | Mismo día | No | Depende de la disciplina diaria | — (fallback) |
| Volumen MAE (proxy) | No (volumen total, no BCRA) | En vivo | — | Ya resuelto | ✅ (ya está) |

## Arquitectura propuesta para la fase build (a validar con Lautaro)

1. **Tabla `bcra_mulc`**: `fecha` PK · `compras_netas_usd` (var 78) · `compras_privado_ars` (var 47)
   · `compras_tesoro_ars` (var 48) · `fuente` (`'BCRA_API_V4'`). RLS lectura anon como el resto.
2. **Ingesta** `scripts/ingest-bcra-mulc.mjs` + workflow diario (patrón `ingest-pizarra`: guard
   anti falso-verde — ojo que acá "0 filas nuevas" es NORMAL por el rezago: el guard debe ser
   "la última fecha en base no más vieja que N hábiles", no "hoy insertó"), + alta en
   `healthcheck-frescura.mjs` con umbral acorde al rezago (~5-6 hábiles para no dar falsos rojos).
3. **Backfill**: 2 requests (`limit=3000` + offset) → 5.768 filas de una.
4. **Panel cambiario** (`panel-cambiario.tsx`): último dato oficial (con su fecha) + acumulado del
   mes y del año + mini-serie (con ChartMarca/ChartTabla como todos los gráficos) + sello
   "BCRA · dato oficial, rezago ~3 días hábiles". El volumen MAE del día queda donde está.

## Preguntas abiertas para Lautaro (decidir antes del build)

1. ¿Alcanza el dato oficial con rezago de 3 hábiles, o querés además cargar a mano el número del
   día (se pisa solo cuando llega el oficial)?
2. ¿El acumulado anual va por año calendario, o también por "año agrícola"/gestión?
3. ¿Visibilidad: sección `dolar` (como el resto del panel cambiario) — correcto?
