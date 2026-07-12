# Plan — Calendario de informes + estimaciones de producción

> Sesión 12/07/2026 (rama `claude/production-forecast-calendar-zdpmd6`). Plan del módulo **Calendario de
> reportes + estimaciones de producción por organismo**, investigado con requests reales el 11-12/07/2026
> (todos los endpoints del núcleo verificados con evidencia; se citan abajo). Decisiones de alcance
> confirmadas por Lautaro en el hilo de la sesión. Foto viva del repo: [`ESTADO.md`](ESTADO.md).

## Qué se quiere (pedido de Lautaro)

1. **Calendario cronológico** de los reportes del negocio (semanales / mensuales / trimestrales).
2. **Última estimación de cada organismo**: cuánto proyecta USDA, BCR, BCBA, CONAB, DEA… para la
   producción de cada país y cada grano.
3. **Cambios entre la publicación anterior y la actual** de cada informe.
4. **Histórico de producción por región desde 2020** (como todas las bases de la web).

**Decisiones confirmadas (12/07/2026):**
- **V1 = núcleo de 5 organismos**: USDA (WASDE + PSD + NASS), CONAB, BCR-GEA, BCBA-PAS y DEA-SAGyP.
  Regionales AR (BCCBA/SIBER/BCP) e internacionales tier-2 (IGC/FAO-AMIS/ABARES/StatCan/MARS) → fase 2.
- **Ubicación**: panel compacto en la home (próximos informes + últimas estimaciones) + **página nueva
  `/produccion`** con el detalle (calendario completo, deltas, históricos, comparador).
- **Variables**: producción + área + rinde (stocks/exportaciones → fase 2; USDA/CONAB las traen).
- **Histórico**: por **país** + **evolución de la estimación de cada campaña publicación a publicación**
  (vintages). Detalle subnacional (provincia/UF/estado) queda para después — las fuentes ya lo traen.

---

## 1. Mapa de organismos (núcleo v1, todo verificado)

| Organismo | Región/granos | Informe clave | Sale | Acceso a datos | Vintages desde 2020 |
|---|---|---|---|---|---|
| **USDA — FAS PSD** | ~190 países + mundo; **los 6 granos** | Actualización mensual PSD (mismo día WASDE) | Día del WASDE, 13:00/14:00 AR | ✅ API JSON (key gratis, DEMO_KEY anda) + **CSV bulk sin auth** | Solo valor vigente → snapshot propio + CSVs WASDE |
| **USDA — WASDE (OCE)** | Mundo + país (AR/BR/US) en trigo/maíz/soja; sorgo/cebada solo EEUU; girasol NO | WASDE mensual | ~día 9-12, 12:00 ET | ✅ CSV tidy oficial por edición + XML/XLS | ✅ **un CSV por edición desde 2010** |
| **USDA — NASS** | Solo EEUU (nacional + estado) | Crop Production (mensual, mismo día WASDE) · Grain Stocks (trim.) · Crop Progress (lunes) | 12:00 ET / 16:00 ET | ✅ ZIPs de CSV por release + **calendario anual en ICS** + RSS del día | ✅ archivo ESMIS completo, sin auth |
| **CONAB** | Brasil por UF; los 6 granos (milho 1ª/2ª/3ª safra) | Levantamento mensual de grãos | ~día 11-15, **09:00 AR** | ✅ TXT plano sin auth (portal de informações) | ✅ **`LevantamentoGraos.txt` trae TODOS los levantamentos desde 2017/18** |
| **BCR — GEA** | Argentina nacional; **solo soja/maíz/trigo** | Estimación mensual (2° miércoles ~17-19h AR) + semanal zona núcleo (jueves) | 2° miércoles | ✅ Tabla HTML scrapeable (patrón CAC ya conocido) | Archivo de notas desde 2008 (número en el título) |
| **BCBA — PAS** | Argentina, 15 zonas; **los 6 granos** | Panorama Agrícola Semanal | **Jueves 15:00 AR** | ⚠️ Cloudflare bloquea bots en todo el dominio → plan B verificado: medios ya ingestados (agrositio/Infocampo) publican los números el mismo jueves | PDFs con id secuencial (~340 desde 2020); tablas zonales = imagen (OCR, no recomendado); nacional parseable del texto |
| **DEA — SAGyP (oficial)** | Argentina por provincia/departamento; los 6 granos + 30 cultivos | Informe mensual (jueves ~18-23) + semanal (jueves) | Jueves | ✅ CSV completo por POST sin auth (11,5 MB, serie 1969/70→hoy) | Solo valor vigente → snapshot propio; PDFs mensuales archivados desde 2020 (traen el delta oficial impreso) |

**Complemento del mismo día WASDE:** las circulares FAS (*World Agricultural Production*, *Grain/Oilseeds:
World Markets and Trade*) traen el país-por-país de girasol/cebada/sorgo que al WASDE le falta — pero esos
números YA están en PSD, así que **PSD es la fuente única de "producción según USDA"** y el WASDE aporta
las fechas + los vintages históricos de trigo/maíz/soja.

> **Verificación independiente (12/07):** un segundo pase de verificadores re-testeó los ~50 endpoints del
> núcleo de forma independiente — todos se sostienen (varios con match byte a byte). El ZIP de vintages
> WASDE 2016-2020 que había quedado sin bajar se descargó y abrió: 56 MB de CSVs, 7.080 filas Argentina,
> leyenda oficial "as it appeared at the time of publication". Las correcciones que dejó el pase están
> incorporadas en §8 (trampas).

### Tier-2 internacional (relevado y verificado — fase 2, con un candidato a v1)

| Organismo | Qué aporta | Acceso | Nota |
|---|---|---|---|
| **FAO-AMIS** ⭐ | Balances por país (AR/BR/US/mundo) de trigo/maíz/soja/arroz con **3 fuentes lado a lado: FAO-AMIS, IGC y USDA-PSD** | ✅ **Proxy BigQuery abierto** (`POST amis-9189b.appspot.com/fetch`, SQL sin auth) | La tabla `amis_data_archive` trae **110 vintages desde mar-2020** — deltas e histórico de 3 organismos gratis. **Candidato a colarse en la sesión B** (esfuerzo ~1 día); es backend interno sin doc pública → cachear, cron mensual, no martillarlo |
| **IGC** | Grain Market Report (11×/año, jueves) — único que cubre los 6 granos a nivel mundial | Summary gratis (HTML) + números por país vía AMIS (~1 GMR de lag); detalle directo = suscripción £900/año | Calendario oficial 2026 scrapeable (HTML trivial): GMR 16/07, 20/08, 17/09, 15/10, 19/11 |
| **ABARES** (Australia) | Trigo/cebada/sorgo por estado — competidor directo de AR en trigo/cebada | XLSX por edición; anti-bot bloquea el sandbox (probar desde Actions) | Trimestral, 1er martes mar/jun/sep/dic 8:00 AU = **la tarde-noche argentina del día ANTERIOR** (18/19hs) |
| **StatCan** (Canadá) | Trigo/cebada/canola por provincia, serie desde 1908 | ✅ API WDS verificada + CSV bulk | Sin vintages (revisa in-place) → snapshot propio. Producción final 2026: 4/12 anunciada |
| **UE** (DG AGRI + MARS) | Balances UE (trigo/cebada/girasol) + pronósticos de rinde (MARS, mueve Euronext) | API agrifood existe pero estaba SUSPENDED al probarla (reintentar); MARS = PDF/HTML | MARS 2026: 27/07, 24/08, 28/09, 26/10, 23/11 (lunes) |

### Evidencia clave (requests reales 11-12/07/2026)

- **PSD bulk**: `apps.fas.usda.gov/psdonline/downloads/psd_grains_pulses_csv.zip` (+ `psd_oilseeds_csv.zip`)
  → HTTP 200, regenerado el 10/07 15:34 GMT (= release WASDE julio). Códigos: soja `2222000`, maíz
  `0440000`, trigo `0410000`, girasol `2224000`, sorgo `0459200`, cebada `0430000`. Atributos: 28=Producción,
  4=Área cosechada, 184=Rinde. Países AR/BR/US, mundo=`00`. Muestra: maíz MY2026 AR 55.000 kt · BR 139.000 kt.
- **PSD API**: `api.fas.usda.gov/api/psd/commodity/0440000/country/all/year/2026?api_key=DEMO_KEY` → HTTP 200,
  125 países. `…/dataReleaseDates` dice exactamente qué (país, campaña) tocó cada release (191 combos en
  trigo jul-2026) — la base del panel de cambios.
- **WASDE vintages**: `usda.gov/sites/default/files/documents/oce-wasde-report-data-2026-07.csv` (uno por
  edición desde abr-2010, "as it was reported") → verificado 2021-01 y 2026-07. Ediciones corregidas llevan
  sufijo `-V2` (may/jun-2026). **Oct-2025 NO existió** (shutdown) — no asumir 12/año.
- **NASS calendario**: `nass.usda.gov/Publications/Calendar/2026/NassReleases2026.ics` → 567 VEVENTs 2026
  (hora "floating" = ET). RSS `nass.usda.gov/rss/reports.xml` = qué salió HOY (trigger). Archivo ESMIS:
  `esmis.nal.usda.gov/api/v1/release/findByIdentifier/{CropProd|GraiStoc|…}` sin auth, releases + ZIPs de CSV.
- **CONAB**: `portaldeinformacoes.conab.gov.br/downloads/arquivos/LevantamentoGraos.txt` → HTTP 200, 6,4 MB,
  53.031 filas `ano_agricola;safra;uf;produto;…;id_levantamento;area;producao;produtividade` — **todas las
  revisiones desde 2017/18**. Verificado: soja 2025/26 lev8→lev9 = 180.129,6 → 180.252,7 mil t. Se regenera
  a diario ~08:00 Brasília (el levantamento nuevo entra al TXT al día siguiente; el XLSX del boletín está el
  mismo día 09:00 AR). `OfertaDemanda.txt` = balance (stocks/export) por safra. Calendario oficial 2026 en PDF
  con las 13 fechas de grãos.
- **BCR GEA**: `bcr.com.ar/es/mercados/gea/estimaciones-nacionales-de-produccion/estimaciones` → tablas HTML
  `bcr-estimaciones {trigo|maiz|soja}` con área/rinde/producción, campaña actual + anterior (trigo 25/26
  29,5 Mt · maíz 68 Mt · soja 51,5 Mt). Archivo paginado `…/estimaciones-anteriores?page=N` hasta 2008.
- **Calendario BCR** (el que mencionó Lautaro): EXISTE y es parseable —
  `bcr.com.ar/es/api/paragraph-action/636/export` (ICS, 439 eventos) y `…/636/query?date_start=&date_end=`
  (JSON) — **pero está desactualizado**: cargado a full hasta 2024, casi vacío 2025/26 (jul-dic 2026 = `[]`,
  verificado). Sirve como histórico de fechas y formato; las fechas futuras se generan por regla.
- **BCBA**: TODO el dominio `bolsadecereales.com` (incl. PDFs y subdominios) devuelve el challenge JS de
  Cloudflare a IPs de datacenter (403 verificado con curl y WebFetch). Un humano en browser pasa sin problema.
  Patrón del PDF: `/imagenes/pass/YYYY-MM/{id}-pasYYYYMMDD.pdf`, id +1 por semana (1126 = 08/01/2026).
  Los números del PAS salen el mismo jueves en agrositio/Infocampo (fuentes que ya ingerimos en `noticias`).
  Lanzamientos de campaña en `perspectivasagricolas.com.ar` (WordPress SIN Cloudflare, wp-json OK).
- **DEA**: `POST datosestimaciones.magyp.gob.ar/reportes.php?reporte=Estimaciones` body `Dataset=Dataset` →
  HTTP 200, CSV 11,5 MB Latin-1 `;`, serie 1969/70 → 2025/26 por cultivo × campaña × provincia × depto.
  Informes PDF navegables por `?mes=YYYY-MM` (verificado hasta 2020-07); el mensual trae columnas
  "Jun 26 vs May 26" (delta oficial ya calculado). La copia CKAN (`datos.magyp.gob.ar`) rezaga meses — NO
  usarla como primaria.

---

## 2. Calendario de informes

### Cómo se arma (fechas oficiales + reglas)

Dos clases de eventos en la misma tabla:

1. **Fecha oficial** (`tipo=oficial`): el organismo publica el calendario del año →
   - **WASDE + Crop Production**: 12 fechas/año en la página del OCE + ICS de NASS. Restantes 2026:
     **12/08, 11/09, 09/10 (13:00 AR) · 10/11, 10/12 (14:00 AR)**.
   - **NASS** (Grain Stocks, Crop Progress, etc.): ICS anual (el de 2027 aparece ~oct-nov).
     Grain Stocks + Small Grains Summary: **30/09 13:00 AR**. Crop Progress: lunes 17:00 AR (18:00 en nov),
     hasta 30/11; con feriado pasa a martes (08/09, 13/10).
   - **CONAB grãos**: 13 fechas/año en PDF oficial. Restantes 2026: **14/07, 13/08, 15/09** (cierran
     2025/26) · **15/10, 13/11, 15/12** (abren 2026/27) · 14/01/2027 — siempre 09:00 AR.
2. **Regla** (`tipo=regla`, flag "estimada" en la UI): el organismo no publica fechas →
   - **PAS (BCBA)**: jueves 15:00 AR. · **GEA semanal**: jueves ~17:30 (viernes si feriado).
   - **GEA mensual**: 2° miércoles ~17-19h AR → 12/08, 09/09, 14/10, 11/11, 09/12 (estimadas).
   - **DEA semanal**: jueves ~17:00 (corre por feriados). **DEA mensual**: un jueves entre el 18 y el 23 →
     16-23/07, 20/08, 17/09, 22/10, 19/11, 17/12 (estimados).
   - **Informativo semanal BCR**: viernes. · **CONAB progresso de safra**: lunes 19:00 AR.
   - **Mercado (contexto, mismo calendario — fuentes de fechas verificadas 12/07)**: CFTC COT viernes
     15:30 ET (tabla HTML oficial con fechas exactas 2026 y corrimientos por feriado, verificada) ·
     EIA etanol miércoles 10:30 ET (tabla de excepciones verificada; ej. semana del 4-jul salió el 9-jul) ·
     NOPA crush ~día 15 12:00 ET (PDF oficial con las 12 fechas 2026, verificado) · USDA Export Sales
     jueves 8:30 ET (la página oficial de schedule da 403 Akamai a bots → generar por regla + feriados US) ·
     Export Inspections lunes · ERS Outlooks (~día 12-16; **API JSON de calendario verificada**:
     `ers.usda.gov/api/calendar/v2.0`).
   - **Eventos anuales**: Prospective Plantings (fin mar), Acreage (fin jun), Lanzamientos de campaña BCBA
     (fina ~mayo, gruesa ~sep — fecha se anuncia en perspectivasagricolas.com.ar).

### Tabla + generación

```sql
calendario_informes (
  organismo   text,        -- 'USDA' | 'CONAB' | 'BCR' | 'BCBA' | 'DEA' | 'CFTC' | ...
  informe     text,        -- 'WASDE' | 'Levantamento grãos' | 'PAS' | 'GEA mensual' | ...
  ts_utc      timestamptz, -- SIEMPRE en UTC; convertir a hora Córdoba solo al renderizar
  tz_origen   text,        -- 'America/New_York' | 'America/Sao_Paulo' | ... (el DST de EEUU
                           --  hace que 12:00 ET sea 13:00 o 14:00 AR según la época — NO
                           --  hardcodear el offset; Brasília = AR todo el año)
  tipo        text,        -- 'oficial' | 'regla' (la UI marca "estimada")
  estado      text,        -- 'programado' | 'publicado' | 'reprogramado'
  importancia text,        -- 'alta' | 'media' | 'baja'
  url         text,
  publicado_url text,      -- link al informe una vez que salió (lo completa el cron de ingesta)
  PRIMARY KEY (organismo, informe, (ts_utc::date))
)
```

- **Trigger de ingesta**: el mismo cron que corre post-evento consulta la API de ESMIS
  (`findByIdentifier/{wasde|CropProd|GraiStoc}` — ordena del más nuevo al más viejo **con `page=0`**,
  paginación 0-indexed) o la página del boletim CONAB hasta ver el release nuevo → marca el evento
  `publicado`, guarda `publicado_url` y encola la ingesta de datos.
- **Reprogramaciones pasan de verdad**: NASS reprogramó reportes el 22/06/2026 (por el cierre del
  24-26/12) y el shutdown de oct-2025 borró un WASDE — si una fecha cargada cambia, `estado='reprogramado'`
  + log. NASS avisa por `news.xml`.
- **Trampa del ICS de NASS**: los `DTSTART` vienen en hora ET "flotante" SIN `TZID` — parseados ingenuos
  como UTC quedan 4-5 horas corridos. Interpretarlos como `America/New_York`.
- **Agregadores comerciales descartados** (verificado): Barchart trading-calendar es calendario económico
  general (mezcla Crop Production con new home sales) y su ToS prohíbe redistribuir; Investing.com da 403
  Cloudflare. El calendario propio desde fuentes oficiales es el único camino sólido.

- **Seed inicial**: jul-dic 2026 con las fechas oficiales de arriba + generador de reglas (jueves/lunes/
  2° miércoles…) con corrección por feriados AR (tabla chica de feriados o lib en `habiles.ts`).
- **Cron `refresh-calendario`** (mensual): re-baja el ICS de NASS (y prueba el de 2027), re-chequea el
  ICS/JSON del calendario BCR por si lo reactivan, y avisa cuando falte el seed 2027 (WASDE/CONAB salen
  en dic-ene).
- Enero es el día más cargado del año (WASDE + Grain Stocks + Annual Summary + Winter Wheat Seedings,
  mismo día 12:00 ET) — la UI tiene que bancar varios eventos por día.

---

## 3. Estimaciones: modelo de datos (vintages)

**Una tabla genérica para los 5 organismos** — cada publicación es una fila nueva (NUNCA se pisa el
vintage anterior; así salen los deltas y la evolución):

```sql
estimaciones_produccion (
  organismo  text,     -- 'USDA' | 'CONAB' | 'BCR' | 'BCBA' | 'DEA'
  pais       text,     -- 'argentina' | 'brasil' | 'eeuu' | 'mundo'
  grano      text,     -- 'soja' | 'maiz' | 'trigo' | 'girasol' | 'sorgo' | 'cebada'
  campania   text,     -- '2025/26' (normalizada: USDA MY2025 = 2025/26)
  variable   text,     -- 'produccion' | 'area' | 'rinde'
  valor      numeric,  -- normalizado: Mt · Mha · tn/ha
  fecha_publicacion date,  -- el vintage
  informe    text,     -- 'WASDE #673' | '9º levantamento' | 'PAS' | 'GEA mensual' | 'DEA mensual'
  url        text,
  PRIMARY KEY (organismo, pais, grano, campania, variable, fecha_publicacion)
)
```

Normalización de unidades al ingerir: PSD viene en 1000 MT / 1000 HA / MT/HA · CONAB en mil t / mil ha /
kg/ha · BCR/BCBA/DEA en Mt / M ha / qq/ha. Guardamos Mt, Mha y tn/ha (la UI puede mostrar qq/ha).

**Deltas**: SQL puro — vintage N vs N-1 por (organismo, pais, grano, campania, variable). Además el WASDE
trae la columna del mes previo en el propio reporte y el PDF mensual de la DEA imprime "Jun vs May" (sirven
para validar el cálculo propio).

**Volumen estimado**: USDA ~78 releases × 6 granos × 4 regiones × 3 vars × ~3 campañas ≈ 15-20k filas ·
CONAB nacional ≈ 3-4k · BCR/BCBA/DEA ≈ 2-4k. Total < 30k filas — trivial para Supabase.

### Ingesta por organismo

| Script | Fuente | Cron (UTC) | Nota |
|---|---|---|---|
| `ingest-usda.mjs` | PSD bulk ZIPs (sin auth) filtrado a 6 granos × 3 vars × (AR/BR/US/mundo) | `30 16 9-13 * *` con guard: last-modified del ZIP vs último release ingerido | Snapshot = vintage propio. Backfill vintages 2020→hoy con los ~66 CSVs `oce-wasde-report-data-*.csv` (trigo/maíz/soja mundo+AR+BR+US; girasol/cebada/sorgo por país solo hacia adelante — **cada mes sin snapshotear es un vintage perdido**) |
| `ingest-conab.mjs` | `LevantamentoGraos.txt` + `OfertaDemanda.txt` | `30 11 * * 1-5` (08:30 AR, tras la regeneración de las 08:00 Brasília) | Latin-1, `;`; decimales con coma SOLO en OfertaDemanda; milho = 1ª+2ª+3ª; invierno por año calendario. Backfill = el mismo TXT (vintages 2017/18→hoy incluidos) |
| `ingest-gea.mjs` | Scrape tablas `bcr-estimaciones` + nota vigente (fecha/PDF) | `0 1 * * 4,5` (mié 22:00 AR post-informe; corre 2 días por feriados) | Solo inserta si hay vintage nuevo. Backfill: **Wayback Machine** (verificado: el snapshot de feb-2026 devuelve las tablas exactas de ese vintage — soja 48,0 / maíz 62,0 / trigo 27,7 Mt) con fallback al archivo `estimaciones-anteriores?page=N` (~72 notas desde 2020, número en el título). Ojo: Wayback está bloqueado por el proxy del sandbox pero NO desde Actions |
| `ingest-pas.mjs` | 1º: PDF oficial (id secuencial); 2º (plan B): regex sobre `noticias` ya ingestadas (agrositio/Infocampo del jueves) | `30 18 * * 4` (15:30 AR) | **Probar primero si GH Actions pasa el Cloudflare** (el sandbox no pasa). Vintage nacional por cultivo; por zona NO (tablas = imagen). Histórico 20 campañas por zona: descarga manual de Lautaro de `/datasets` (1 vez) |
| `ingest-dea.mjs` | POST CSV completo → agregar a nacional por cultivo/campaña | `0 12 * * 5` (09:00 AR viernes, post-informe del jueves) | Snapshot semanal = vintage propio. Backfill nacional 2020→hoy: PDFs mensuales por `?mes=` (opcional, sesión aparte) |

Los 5 scripts siguen el patrón de `ingest-cierres.mjs` (fetch → parse → upsert PostgREST con
`SUPABASE_SERVICE_KEY`); los secrets ya están cargados en GitHub. Workflows: uno por fuente como hasta
ahora (`ingest-usda.yml`, `ingest-conab.yml`, `ingest-estimaciones-ar.yml` — GEA+PAS+DEA agrupados con
lógica por día para no multiplicar YAML) + `refresh-calendario.yml`.

---

## 4. UI

### Home (compacto)

- **Panel "Informes"** (nueva sección o dentro de Granos): próximos ~7 días del calendario (organismo,
  informe, día/hora AR, badge "estimada" si es por regla) + las últimas 3-4 publicaciones con link.
- **Mini-tabla "Última estimación"**: producción de la campaña vigente por organismo para AR/BR/EEUU
  (soja/maíz/trigo al frente), con Δ vs publicación anterior en verde/rojo (semáforo existente).

### Página `/produccion` (detalle)

1. **Calendario cronológico**: lista por semana/mes (no hace falta un widget mensual tipo grilla en v1),
   filtros por organismo/importancia, hora AR siempre, feriados marcados.
2. **Pizarra de estimaciones**: grilla organismo × grano para cada país — última producción (Mt),
   Δ vs publicación anterior, fecha del dato y link al informe. Para Argentina: BCR vs BCBA vs DEA vs USDA
   lado a lado (el "quién está más alcista").
3. **Cambios de la última publicación**: para el último WASDE / levantamento / PAS / GEA / DEA — qué números
   tocó (grano, campaña, variable, antes → después). Sale de comparar vintages en SQL.
4. **Gráficos** (SVG a mano, patrón `dolar-futuro-chart`):
   - **Evolución de la estimación** de una campaña (ej. soja AR 2025/26): línea por organismo, eje x =
     fecha de publicación — el gráfico estrella del módulo.
   - **Histórico de producción** por campaña (2019/20 → hoy) por país/grano, barras por organismo.
5. Todo con `SourceStamp` (REAL + "datos al…") y degradación por panel como el resto de la web.

---

## 5. Fases de implementación (3 sesiones)

1. **Sesión A — Bases + calendario**: migraciones (`calendario_informes`, `estimaciones_produccion`) ·
   seed jul-dic 2026 + generador por reglas + feriados · `refresh-calendario.yml` · panel home "Informes" ·
   esqueleto `/produccion` con el calendario. *(El calendario ya rinde solo, sin esperar las ingestas.)*
2. **Sesión B — USDA + CONAB** (las 2 fuentes con vintages listos): `ingest-usda.mjs` + `ingest-conab.mjs` +
   crons + backfills (CSVs WASDE 2020→hoy; TXT CONAB completo) · pizarra de estimaciones + panel de cambios ·
   primer gráfico de evolución. **Prioridad: el snapshot PSD debe arrancar YA** (girasol/cebada/sorgo por
   país no se recuperan hacia atrás). *Candidato a colarse si sobra tiempo*: `ingest-amis.mjs` (proxy
   BigQuery de AMIS, sin auth, vintages 2020→hoy ya armados de FAO+IGC+USDA — suma la vista IGC/FAO
   por ~1 día de esfuerzo).
3. **Sesión C — Argentina**: `ingest-gea.mjs` + `ingest-dea.mjs` + `ingest-pas.mjs` (probar Cloudflare
   desde Actions; plan B noticias) + backfill GEA · comparador AR completo · históricos · aviso en cinta.

Cada sesión: lint + typecheck + build + verificación contra datos reales antes del PR (protocolo ESTADO).

## 6. Pendientes de Lautaro

1. **Nada bloqueante para v1** (el bulk PSD y todo CONAB/BCR/DEA van sin auth).
2. *(Opcional, 2 min)* API key de **NASS QuickStats** (form en quickstats.nass.usda.gov/api) — solo para
   detalle por estado EEUU (fase 2). *(Opcional)* key de **FAS OpenData** — consultas puntuales PSD.
3. **Suscribirse gratis al PAS por mail** (respaldo manual si Cloudflare bloquea Actions).
4. **Descargar 1 vez los XLSX de `bolsadecereales.com/datasets`** desde el browser (20 campañas × 6 cultivos
   por zona) y pasarlos — histórico BCBA resuelto sin OCR.

## 7. Ideas extra propuestas (a validar, no entran en v1 salvo que Lautaro pida)

- **Aviso en la cinta** el día de informe: "HOY 13:00 — WASDE" con link al calendario.
- **Marcar los eventos sobre los gráficos de futuros** que ya tenemos (`futuros_cierres`, `cbot_cierres`):
  ver el salto de precio que causó cada WASDE/levantamento.
- **Export ICS propio** (`/api/calendario.ics`): Lautaro se suscribe desde Google Calendar del celular.
- **Cruce con el portal de noticias**: la taxonomía "Informes" ya clasifica las notas de USDA/BCR →
  linkear la nota del día con el evento del calendario (y sirve de confirmación de que el informe salió).
- **Fase 2 de fuentes** (ya relevadas y verificadas — ver tabla tier-2 en §1): FAO-AMIS (la joya: proxy
  BigQuery con vintages de 3 organismos) · IGC · ABARES · StatCan · UE (DG AGRI + MARS) + BCCBA/SIBER
  (WordPress REST JSON verificado, entran fácil como link-out + cifras titulares) + BCP Bahía Blanca
  (Sway/WhatsApp, solo link-out).
- **"Sorpresa" del informe**: expectativas pre-WASDE (encuestas que publican los medios) vs dato real.

## 8. Trampas descubiertas (para las sesiones de build)

- **WASDE**: ediciones corregidas llevan sufijo `-V2` (probar sin y con) · oct-2025 no existió (shutdown),
  nov-2025 salió el 14/11 → no asumir 12/año · girasol NO está; sorgo/cebada solo EEUU → país-por-país va
  por PSD · 12:00 ET = 13:00 AR (mar-nov) / 14:00 AR (nov-mar) — EEUU cambia la hora, Argentina no.
- **PSD**: `Market_Year` N = campaña N/(N+1) · el campo month/Calendar_Year de cada fila = último release
  que la tocó (NO es dato mensual) · la base guarda solo el valor vigente → los vintages propios se
  construyen snapshoteando (empezar cuanto antes).
- **CONAB**: TXT en Latin-1 con `;` · decimales con coma SOLO en `OfertaDemanda.txt` · el TXT se regenera
  ~08:00 Brasília → el levantamento nuevo entra al día siguiente (mismo día = XLSX del boletín, 09:00 AR) ·
  Brasília = hora argentina todo el año (sin DST desde 2019).
- **BCR**: el calendario oficial existe (ICS + JSON) pero está vacío para 2025/26 → generar por regla y
  monitorear si lo reactivan · el semanal GEA es JUEVES (no miércoles) · el nombre de los PDFs no es
  predecible → tomar siempre el href del botón Descargar.
- **BCBA**: Cloudflare challenge en TODO el dominio para IPs de datacenter (sandbox bloqueado; GH Actions
  a probar) · tablas zonales del PDF son imágenes → vintage por zona requiere OCR (no recomendado) ·
  id del PDF +1 por semana · `perspectivasagricolas.com.ar` NO tiene Cloudflare (wp-json OK).
- **DEA**: CSV por POST `Dataset=Dataset`, Latin-1, `;`, 11,5 MB (161.807 filas) · la copia CKAN rezaga
  meses (no primaria) · horarios inferidos de Last-Modified (mensual ~11:30, semanal ~17:00 AR), no hay
  hora oficial · los nombres de los PDFs NO siguen un patrón uniforme entre años → scrapear hrefs, no
  construir URLs · una tabla del PDF mensual invierte el orden del encabezado ("May 26 vs Jun 26") y las
  flechas son glifos privados → endurecer el parser.
- **Sandbox**: `www.usda.gov` con curl se cuelga por el proxy (WebFetch anda; en Actions/Vercel no aplica) ·
  `web.archive.org` bloqueado por el proxy **pero verificado OK desde afuera** (usarlo desde Actions) ·
  el resto de los hosts del núcleo respondieron bien.

**Del pase de verificación independiente (12/07) — correcciones a tener en cuenta al construir:**
- **ESMIS**: la paginación es **0-indexed** — `results[0]` = publicación actual SOLO con `page=0` (con
  `page=1` arranca meses atrás; la trampa más probable del módulo). `start_date/end_date` se ignoran.
- **WASDE XML**: los países vienen con padding de espacios (`region4="        Argentina"`) → trim. El CSV
  tidy tiene 2 columnas extra (`ReliabilityProjection`, `AnnualQuarterFlag`).
- **CSVs WASDE**: la presencia de filas Argentina/Brasil quedó PLAUSIBLE pero sin ver el archivo completo
  desde el sandbox → **confirmar desde Actions antes de apostar el backfill de revisiones a esa vía**
  (plan B: XMLs de ESMIS, estructura idéntica 2020→2026, ya verificada con Argentina adentro).
- **PSD**: el CSV bulk tiene comas embebidas en nombres de commodities → parser CSV real, no split ·
  girasol exige bajar TAMBIÉN `psd_oilseeds_csv.zip` · QuickStats con key inválida devuelve HTTP 401.
- **CONAB**: el levantamento `099` = número FINAL de safras cerradas (no es un mensual más) → excluirlo o
  tratarlo aparte al calcular deltas · el índice lista 22 archivos .txt · validar la hora (9:00 AR) con el
  10º levantamento del 14/07.
- **BCBA**: los PDFs NO siempre explicitan el cambio ("sostenemos la proyección en X") → el delta se
  calcula SIEMPRE de la base propia, no del texto · el patrón de IDs secuenciales es hipótesis (no
  verificable por el 403) → validar desde un browser humano · en `perspectivasagricolas.com.ar` el wp-json
  útil es `/wp/v2/pages` (no `/posts`, que viene vacío).
- **BCR**: los títulos del archivo no SIEMPRE traen el tonelaje (ej. la nota del 13/05/2026) → fallback
  texto/PDF necesario; o directamente la vía Wayback (tablas exactas por snapshot, verificada).
