# 06 — Fuentes de comercialización de granos (farmer selling / compras) + datasets MAGyP

> Research verificado el **19/07/2026** durante la Fase 4 (índice de temperatura MESA, que necesita el
> "farmer selling" = ritmo de ventas del productor). Objetivo: **encontrar la fuente viva** del dato de
> compras del sector exportador e industrial (la que alimentaba la tabla `compras`, frenada desde el
> 11/06/2026) y dejar registrado el mapa de fuentes para no volver a rastrearlo. Regla del proyecto:
> "menos información antes que incorrecta" → todo lo de acá se validó con **request real** desde este
> entorno (el mismo proxy que usan las ingestas).

---

## 0. TL;DR (la respuesta)

- **La tabla `compras` se frenó porque MAGyP dio de baja el dataset del portal de datos abiertos**
  (`datos.magyp.gob.ar/dataset/compras-de-granos` → hoy **404**), NO por bloqueo de IP. El scraper
  `update_compras.py` de LineUps_Code apuntaba ahí y quedó pegando a una URL muerta.
- **La fuente viva y oficial es la página institucional de MAGyP "Compras y DJVE de Granos"**
  (`www.magyp.gob.ar`), server-rendered en HTML, **alcanzable desde este entorno**, con:
  - **ambos sectores** (Exportador **e** Industria),
  - **multi-campaña** por grano (26/27, 25/26, 24/25…),
  - **archivo histórico semanal 2005→2026** (una página por año) → **backfill posible** (como se hizo con DJVE).
- Los subdominios `sio-granos.magyp.gob.ar` y `monitorsiogranos.magyp.gob.ar` **NO responden** desde
  IPs de datacenter (connection failed / `000`). La BCBA está tras Cloudflare (403). **BCR** responde
  pero es **republicador** (el número primario es de SAGyP). **Agrochat** (chatbot de la Bolsa de Cereales)
  **exporta series a pedido de cualquier período/dato → fuente MANUAL viable** (no automatizable, sí backfilleable).
  **Alphacast** es un agregador de pago/con cuenta.

---

## 1. Matriz de alcanzabilidad (desde este entorno, proxy de las ingestas)

| Fuente | Host | HTTP | Sirve para farmer selling |
|--------|------|------|---------------------------|
| **MAGyP institucional — Compras y DJVE de Granos** | `www.magyp.gob.ar` | **200** ✅ | **SÍ — fuente elegida** (live + histórico) |
| MAGyP datos abiertos (CKAN) | `datos.magyp.gob.ar` | 200 (API ok) | NO — el dataset de compras se dio de baja (§3) |
| SIO-Granos (app madre) | `sio-granos.magyp.gob.ar` | `000` ✗ | NO alcanzable desde datacenter |
| Monitor SIO-Granos | `monitorsiogranos.magyp.gob.ar` | `000` ✗ | NO alcanzable desde datacenter |
| Bolsa de Cereales (BCBA) | `bolsadecereales.com` | 403 (Cloudflare) | Bloqueado (igual que `ingest-pas`) |
| Bolsa de Comercio de Rosario (BCR) | `bcr.com.ar` | 200 ✅ | Republicador (informe HTML/PDF, no serie estructurada) |
| Agrochat (Bolsa de Cereales) | chatbot + export | manual | **SÍ (manual)** — exporta series de cualquier período/dato a pedido; no automatizable pero backfilleable |
| Alphacast | `alphacast.io` | 403 curl / `api.` 200 | Agregador de pago/con cuenta (no validado) |
| granos.ar | `granos.ar` | 200 (SPA 742 KB) | Agregador nuevo, a evaluar (no validado) |

> Nota de infra: `www.magyp.gob.ar` (institucional) y `datos.magyp.gob.ar` (CKAN) sí responden; los que
> caen son los subdominios `sio-granos.*` y `monitorsiogranos.*`. Coherente con la nota de LineUps_Code
> ("MAGyP bloquea IPs de datacenter") pero **acotada a los subdominios SIO**, no a todo MAGyP.

---

## 2. FUENTE ELEGIDA — MAGyP "Compras y DJVE de Granos"

### 2.1 URLs
- **Portada amistosa:** `https://www.magyp.gob.ar/mercadosagropecuarios/compras.php`
- **Página de datos (live, snapshot semanal):**
  `https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/areas/granos/_archivos/000058_Estadísticas/000020_Compras y DJVE de Granos.php`
  (encodeada: `.../000058_Estad%C3%ADsticas/000020_Compras%20y%20DJVE%20de%20Granos.php`;
  variante imprimible con `?accion=imp` — mismo contenido).
- **Archivo histórico (serie semanal por año, 2005→2026):**
  `.../000058_Estadísticas/_compras_historicos/{AAAA}/{AAAA}.php`
  (ej. `_compras_historicos/2024/2024.php`). Verificado: la página de 2024 trae **59 fechas
  semanales** distintas → es la serie semanal completa del año.

### 2.2 Estructura del dato (verificada el 08/07/2026 as-of)
- **Server-rendered**: HTML plano con tablas (jQuery viejo, sin API/JS/AJAX) → se scrapea como el resto
  (parser de tablas, estilo `ingest-gea.mjs`).
- **Una tabla por grano**: Trigo · Maíz · Sorgo · Cebada Cervecera · Cebada Forrajera · Soja · Girasol.
- **Dos sectores por grano**: `Compras Sector Exportador` y `Compras de la Industria` (a veces con
  fecha de corte distinta, ej. "Compras de la Industria (AL 27/05/2026)").
- **Filas por campaña** (columna `Cosecha`): 26/27, 25/26, 24/25… (varias campañas vivas a la vez).
- **Columnas**: `Semanal` · `Total Comprado (1)` · `Total Precio Hecho (2)` · `Total a Fijar (3)` ·
  `Total Fijado (4)` · `Saldo a Fijar (5)` · (+ columnas DJVE del mismo informe).
- **Unidad**: miles de toneladas (kt). Ej. Soja Exportador 25/26 `Total Comprado = 29.111,9` (≈29,1 Mt).
  **Confirmar la unidad exacta al parsear** contra un total conocido.
- **Comparativo interanual**: debajo de cada fila de campaña hay una fila entre paréntesis `(…)` que es
  el mismo dato **a la misma fecha del año/campaña anterior** (formato clásico del informe MAGyP).
- **As-of**: el encabezado dice "Compras y DJVE AL DD/MM/AAAA" → la fecha del snapshot.

### 2.3 Cómo alimenta el índice MESA (pata farmer selling)
El `mesa_calor.py` de LineUps_Code define el componente C3 así:
`avance = compras_acumuladas_campaña(producto, semana) ÷ producción_estimada(campaña)`, y lo compara al
**percentil estacional** de las mismas semanas de campaña de años previos (5 campañas).
- **Numerador** = `Total Comprado` de esta fuente (por grano/campaña/sector). Para soja la industria es
  el comprador natural del crush (spec MESA, decisión 4).
- **Denominador** = producción estimada, que **ya tenemos** en `estimaciones_produccion` (USDA/BCR-GEA/DEA).
- **Historia** = el archivo `_compras_historicos/{año}.php` (2005→) da la serie semanal para el percentil.

### 2.4 Plan de ingesta (para cuando se construya)
- **Live**: script `ingest-compras.mjs` (o Edge Function si hiciera falta; acá `www.magyp.gob.ar` responde
  a la IP de Actions — **confirmar en el primer run**) → parsea la página, upsertea en `compras` con la
  clave única `(campana, codigo_interno, sector, fecha)` (idéntica a `compras.sql`). Guard anti falso-verde.
- **Backfill**: iterar `_compras_historicos/{2021..2026}/{año}.php` (5+ campañas), parsear la serie
  semanal, upsertear. Verificar 1:1 por año contra un total conocido (patrón DJVE 2011-2025).
- **Alcance nuevo vs la tabla actual**: hoy `compras` sólo tiene sector EXPORTACION, sin `%cosecha` ni
  precio, y sólo 2026. La fuente nueva suma **INDUSTRIA**, el split **a fijar/fijado** (útil también para
  el ítem 8 del backlog: total priceado/negociado) y la **historia**. `%cosecha` se computa con
  `estimaciones_produccion` (no viene como columna directa).

---

## 3. Inventario de datasets MAGyP (CKAN `datos.magyp.gob.ar`) — pedido de Lautaro

CKAN API pública, sin auth: `https://datos.magyp.gob.ar/api/3/action/{package_search,package_show,...}`.

### 3.1 Farmer selling / compras — DADO DE BAJA
- `compras-de-granos` → **404** (era el que usaba `update_compras.py`). Ya no existe en el catálogo.
  Búsquedas de `compras`, `comercializacion`, `existencias`, `operaciones`, `DJC`, `compras-exportador`
  → **sin resultado** relevante. El dato migró a la página institucional (§2), no está en datos abiertos.

### 3.2 Lo que SÍ sobrevive en la org `mercados-agropecuarios` (SIO-Granos)
Son de **molienda / destino industrial** (grano que ENTRA a la industria), NO farmer selling:
- `molienda-granos`, `centros-acopio-granos`
- `soja-con-destino-industria`, `maiz-con-destino-industria`, `trigo-pan-con-destino-industria`,
  `trigo-candeal-con-destino-industria`, `cebada-con-destino-industria`, `girasol-con-destino-industria`,
  `sorgo-con-destino-industria`, `mijo-con-destino-industria`, `avena-con-destino-industria`,
  `centeno-con-destino-industria`, `lino-con-destino-industria`, `mani-con-destino-industria`,
  `arroz-cascara-con-destino-industria`, `semillas-algodon-con-destino-industria`
  - Cada uno trae recursos CSV: "Ingreso a la industria (aceitera/balanceadora)", "Producción de
    aceite/pellets/expellers", "Serie de tiempo". Ej. dataset id `soja-con-destino-industria`
    (`resource .../serie-tiempo-soja-destino-industria.csv`).
  - **Útil para**: molienda/crush (contexto de demanda de industria), NO para % de avance de ventas.

### 3.3 Otros datasets MAGyP relevantes al proyecto (referencia)
- `estimaciones-agricolas` (producción/área/rinde — ya lo usamos vía `ingest-dea.mjs` por el CSV oficial).
- `datos-comercio-exterior` (comercio exterior).
- Orgs útiles: `mercados-agropecuarios`, `direccion-de-estimaciones-agricolas`,
  `direccion-nacional-de-control-comercial-agropecuario` (ex-ONCCA, DJVE/DJC), `direccion-de-comercio-exterior-vegetal`.

---

## 4. Candidatas evaluadas (y por qué NO son la primaria)

- **SIO-Granos / Monitor SIO-Granos** (`sio-granos.magyp.gob.ar`, `monitorsiogranos.magyp.gob.ar`): es la
  app **madre** del dato diario (probable origen del dato que ya tenía `compras`), pero **no responde a
  IPs de datacenter** (`000`). Sólo serviría vía navegador en AR (fallback manual, estilo `cargar_compras.py`).
- **BCR (Bolsa de Comercio de Rosario)** (`bcr.com.ar`, responde 200): publica comercialización en el
  **Informativo Semanal** y **Panorama de Mercados**, pero es **republicador** — el número lo cita de
  SAGyP ("según SAGyP, 33,6 Mt de maíz comercializadas…"). Es HTML/PDF de análisis, no una serie
  estructurada con historia → peor que ir a la primaria (MAGyP §2). Sí sirve para **noticias/contexto**.
- **BCBA (Bolsa de Cereales de Buenos Aires)** (`bolsadecereales.com`): el **PAS** trae avance de
  comercialización, pero el sitio está **tras Cloudflare (403)** — mismo bloqueo que frena `ingest-pas`.
- **Agrochat** (Bolsa de Cereales): asistente de IA sobre las bases de datos de la BCBA. **Lautaro puede
  pedirle series de CUALQUIER período y de datos diversos, y exportarlas a CSV** (así trajo el operado
  diario de SIO-Granos de jul-2026 — verificado, consistente). O sea: **fuente MANUAL viable**, no una API
  automatizable, pero sirve para **backfillear a demanda** (patrón `cargar_compras.py`: Lautaro exporta →
  script de carga → Supabase). **Candidata fuerte** para: (a) la historia de farmer selling del índice
  MESA — si se le pide el comprado acumulado **por sector y campaña** (no el operado diario suelto que dio
  el primer CSV); (b) el operado diario/priceado del **ítem 8** del backlog. La ingesta *automática* sigue
  en MAGyP; Agrochat es el respaldo/backfill manual (y desbloquea C3 si Wayback no alcanza).
- **Alphacast** (`alphacast.io`): plataforma **agregadora** de series económicas (repo "Argentina
  Markets", API en `api.alphacast.io`). Probablemente hostee series SIO/MAGyP/BCR ya limpias, lo que
  ahorraría scraping — **pero** es de **pago/con cuenta** (el sitio da 403 a bots; free tier no
  confirmado). Candidata de respaldo si la primaria se complica; requeriría API key en secreto.
- **granos.ar**: "Monitor de Granos en tiempo real" (SPA 742 KB). Agregador nuevo; no evaluado su backend.
  Candidato a mirar si se busca un feed ya digerido.

---

## 5. Pendientes / a confirmar al construir
1. **IP de Actions vs `www.magyp.gob.ar`**: acá responde 200; confirmar en el primer run del cron que la
   IP del runner no reciba 403 (si pasara, Edge Function São Paulo o fallback carga manual `cargar_compras`).
2. **Unidad exacta** de las tablas (kt asumido) — validar contra un total conocido al parsear.
3. **Semántica de la fila entre paréntesis** (comparativo interanual) — confirmar antes de usarla.
4. **Mapeo grano→codigo_interno**: reusar `GRANO_COMPRAS_A_CODIGO` de `compras_fas.py` (Soja→SBS,
   Girasol→SFSEED, Cebada Forrajera→BARLEY, Cebada Cervecera→MALT, etc.).
5. **Soja crush**: el índice usa la demanda de industria (SBM+SBO → equivalente poroto); la compra de
   soja de la industria de esta fuente es el input correcto para C3 de soja.
