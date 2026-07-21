# Research P4 — Movimiento de camiones en puerto (fuente para panel de /comercio)

> **Fase RESEARCH del prompt P4 de [`PLAN_BACKLOG.md`](../PLAN_BACKLOG.md)** (ítem 14 del backlog:
> arribos de camiones como señal de presión de oferta física). Ejecutada el **21/07/2026** con
> requests reales. **NO se construyó nada**: este doc es el insumo para que Lautaro apruebe fuente
> Y alcance del panel; la fase build corre en otra sesión tras su OK.

## TL;DR / Recomendación

**El dato oficial existe, es diario, con rezago de 1 día, abierto y con historia desde 2018.**
La página de logística de **SAGyP/MAGyP** ("Posición de Camiones y Vagones", sección de Mercados
Agropecuarios — el MISMO dominio institucional del que ya scrapeamos `compras`) publica la
**"Entrada diaria de camiones y vagones a puertos, fábricas y molinos (por zona portuaria y por
producto)"**: una tabla HTML del mes en curso, actualizada a diario (al 21/07 traía datos del
**20/07**), con **4 zonas portuarias + 6 productos + vagones + camiones en playa**. La historia
está en **PDFs mensuales 2018→hoy** (~103 archivos) con la MISMA tabla diaria adentro — backfill
de 8,5 años con granularidad diaria. BCR y dataPORTUARIA quedan descartadas como fuente de datos
(solo prosa/noticias). Fuente primaria del dato: WILLIAMS ENTREGAS (el sello en la web dice la
institución: **SAGyP**, regla "institución sí, puente no").

## Qué se probó (requests reales del 21/07/2026)

### (a) SAGyP/MAGyP — "Posición de Camiones y Vagones" ✅ GANADORA

Página índice: `https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/logistica/`
(HTTP 200, sin auth, sin Cloudflare). Archivos de la sección (con fecha de publicación real):

| Archivo | Publicación vista | Contenido |
|---|---|---|
| **Entrada diaria de camiones y vagones a puertos, fábricas y molinos (por zona portuaria y por producto)** (`.php`) | **20-07-26** | Tabla HTML del MES en curso, una fila por día |
| Comparativa Camiones y Vagones | 30-06-26 | Comparativas mensuales interanuales |
| Entrada diaria de camiones a puerto (formato viejo) | 17-10-25 | Frenado — ignorar |
| Movimiento Total Anual (2022/2023/…) | 11-06-26 | Totales anuales |

**Estructura de la tabla diaria** (verificada julio 2026): por día —
- **Zonas** (camiones): Rosario y aledaños · Dársena Bs As-E. Ríos · Puerto Necochea (Quequén) ·
  Puerto B. Blanca · **Total camiones**.
- **Productos** (total x producto): trigo · maíz · sorgo · cebada · soja · girasol · **Total**.
  (Son dos aperturas del MISMO total — no hay matriz zona×producto.)
- **Vagones** + **camiones en playa** (cola sin descargar — dato fino de congestión).
- Fila "Acumulados" del mes al pie.

**Frescura medida**: consultada el 21/07, la tabla llegaba al **20/07** (domingo 19/07 = 0, sano)
→ **rezago 1 día hábil**. Muestra real: 17-jul total 6.638 camiones (Rosario 5.068, maíz 3.969,
soja 1.476) · 20-jul 3.046.

**Historia**: los desplegables de la misma página listan **PDFs mensuales
`total_mensual_{mes}_{año}.pdf`** bajo `/informes/entrada_camiones/{año}/`, **2018 → 2026**
(~103 PDFs, ~130-215 KB c/u, descarga directa verificada con 200). Se abrieron dos de punta a
punta (may-2026 y ene-2018): **contienen la MISMA tabla diaria completa** (una fila por día del
mes, mismas 4 zonas + 6 productos + vagones), formato estable en 8 años (solo cambia cosmética
de encabezados). **Identidades verificadas** en may-2026: zonas 133.151+6.014+13.314+33.215 =
**185.694** = suma de productos 13.291+64.091+3.512+4.520+90.634+9.646 ✓. El texto se extrae
bien sin dependencias (streams FlateDecode + operadores de texto, mismo espíritu del xlsx-sin-deps
del uploader).

- **Fragilidad**: baja-media. HTML institucional simple (tabla estática, sin JS), mismo dominio y
  patrón que `ingest-compras.mjs` (que ya sobrevivió al apagón del CKAN: los datasets de
  `datos.magyp.gob.ar` para "camiones" dan **0 resultados** — el CKAN está muerto, la página
  institucional es EL canal). Riesgo real: renombres de archivo `.php` (URL con espacios y
  acentos) y el rezago de publicación humana (la página se regenera a diario hábil).

### (b) BCR ❌ COMO DATO / ✅ como cross-check editorial

La búsqueda del sitio (`/es/buscar?text=camiones`) devuelve **artículos**: Informativo Semanal,
comentarios diarios del mercado físico. El arribo de camiones al Gran Rosario que BCR publica va
**embebido en prosa** (o gráficos puntuales), sin dataset estructurado descargable estable →
parser de prosa = frágil y de alcance menor (solo Gran Rosario). Sirve como control de
consistencia periodístico, no como fuente de ingesta.

### (c) dataPORTUARIA ❌

Es un portal de noticias (secciones puertos/logística/campo). Sin datos estructurados de
camiones. Ya está como fuente de noticias en `FUENTES.md` — nada que agregar acá.

### (d) CIARA-CEC — no aplica

Publica liquidación de divisas (mensual), no logística de camiones.

## Tabla comparativa

| Fuente | Dato | Cadencia/rezago | Historia | Fragilidad | Automatizable |
|---|---|---|---|---|---|
| **SAGyP/MAGyP "Entrada diaria"** | **Camiones por zona (4) + producto (6) + vagones + en playa, oficial** | **Diaria, rezago 1 día hábil** | **2018→hoy (PDFs mensuales con detalle diario)** | Baja-media (HTML simple, dominio ya scrapeado) | ✅ |
| BCR (informes) | Gran Rosario, en prosa | Diaria/semanal | Dispersa en artículos | Alta (texto libre) | ❌ |
| dataPORTUARIA | Noticias | — | — | — | ❌ |

## Panel imaginado (para el OK de Lautaro)

**`/comercio/camiones`**, mismo espíritu que el ritmo estacional de `/comercio/empresas`:

1. **KPIs de la última rueda**: total camiones + Δ vs día anterior y vs mismo día de la semana
   pasada · camiones en playa (congestión) · producto líder.
2. **Estacionalidad**: media móvil 7 días de hoy **vs la banda de las últimas 5 campañas**
   (percentil estacional — con 8 años de historia sobra), total y por producto. Es la señal de
   "presión de oferta física" que complementa el line-up y el índice MESA.
3. **Apertura por zona** (Rosario/Bahía/Quequén/Dársena) y **por producto** (los 6).
4. **Vagones** como serie secundaria.
5. Gráficos con ChartMarca + ChartTabla (patrón 20/07) · sello "SAGyP · rezago 1 día hábil".

**Datos**: tabla `camiones` — `fecha` PK + columnas fijas (`ros_aledanos`, `darsena`, `quequen`,
`bahia_blanca`, `total_camiones`, `trigo`, `maiz`, `sorgo`, `cebada`, `soja`, `girasol`,
`vagones`, `camiones_en_playa`, `fuente`). Ingesta `ingest-camiones.mjs` (patrón institucional
MAGyP como `ingest-compras.mjs`): lee la tabla HTML del mes en curso y upsertea por fecha (los
días ya cargados se pisan idempotente) + guard anti falso-verde + healthcheck (umbral ~3 hábiles).
**Backfill**: script one-shot que baja los ~103 PDFs mensuales 2018→hoy y parsea la tabla diaria
(extractor sin dependencias ya probado en este research), con verificación por identidades
(zonas = productos = total) fila por fila.

## Preguntas abiertas para Lautaro (decidir antes del build)

1. **Fuente**: ¿OK SAGyP/MAGyP? (recomendada; única con dato estructurado).
2. **Visibilidad**: ¿solo mesa (`requireAdmin`, como `/comercio/puertos`) o público (como DJVE)?
3. **Backfill**: ¿toda la historia 2018→hoy, o alcanza 5 campañas (2021→) para la banda estacional?
4. **Alcance v1**: ¿entra "camiones en playa" y vagones, o arrancamos solo con camiones
   descargados por zona/producto?
