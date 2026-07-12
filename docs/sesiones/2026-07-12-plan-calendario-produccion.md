# Sesión 2026-07-12 — Plan calendario de informes + estimaciones de producción

- **Rama:** `claude/production-forecast-calendar-zdpmd6` · **PR:** #20 (base `main`, draft)
- **Objetivo pedido por Lautaro:** plan para el módulo de calendario de reportes + estimaciones de
  producción por organismo (USDA, BCR, BCBA, CONAB…): calendario cronológico, última estimación de cada
  organismo por país/grano, cambios entre publicaciones, histórico desde 2020.

## Hecho
- **Investigación completa** (9 clusters en paralelo + un 2º pase de 7 verificadores independientes que
  re-testearon los ~50 endpoints, todo con requests reales): USDA (WASDE + PSD + NASS), CONAB, BCR-GEA,
  BCBA-PAS, DEA-SAGyP, bolsas regionales (BCCBA/SIBER/BCP), internacionales tier-2 (IGC/FAO-AMIS/ABARES/
  StatCan/UE) y la infraestructura del calendario (ICS NASS, API ERS, CFTC/EIA/NOPA). Toda la evidencia
  quedó en el plan.
- Hallazgo tier-2: el backend de **FAO-AMIS es un proxy BigQuery abierto con los vintages mensuales desde
  mar-2020 de 3 organismos (FAO, IGC, USDA-PSD) lado a lado** — candidato barato a sumarse en la sesión B.
- Corrección clave del pase de verificación: **Wayback Machine funciona** (bloqueado solo por el proxy del
  sandbox) y devuelve las tablas GEA exactas por snapshot → es LA vía para el backfill de vintages BCR.
- **[`docs/PLAN_CALENDARIO_PRODUCCION.md`](../PLAN_CALENDARIO_PRODUCCION.md)**: mapa de organismos,
  endpoints verificados, diseño de tablas (`calendario_informes` + `estimaciones_produccion` con vintages),
  ingestas/crons por fuente, UI (home compacto + página `/produccion`), 3 sesiones de build, pendientes de
  Lautaro, ideas extra y trampas.

## Decisiones tomadas (y por qué)
- **V1 = núcleo de 5 organismos** (USDA+CONAB+BCR+BCBA+DEA) — confirmado por Lautaro; regionales e
  internacionales tier-2 a fase 2.
- **Home compacto + página `/produccion`** — confirmado por Lautaro (la home no aguanta el módulo entero).
- **Variables: producción + área + rinde** — confirmado (stocks/export a fase 2).
- **Histórico por país + vintages** (evolución de la estimación publicación a publicación) — confirmado.
- El calendario mezcla **fechas oficiales** (WASDE/NASS/CONAB publican el año entero) con **fechas por
  regla** marcadas "estimada" (PAS jueves 15:00, GEA 2° miércoles, DEA jueves) — porque BCR/BCBA/DEA no
  publican fechas futuras confiables.

## Verificado
- Solo docs en este PR (no toca código); lint/typecheck/build corridos igual.
- Endpoints del núcleo verificados con requests reales (11-12/07): PSD bulk + API (DEMO_KEY), CSVs vintage
  del WASDE, ICS de NASS, ESMIS API, TXTs de CONAB (con vintages 2017/18→hoy), tablas GEA + archivo,
  calendario BCR (ICS/JSON — existe pero vacío 2025/26), CSV DEA por POST, PDFs DEA desde 2020.
- BCBA: verificado que Cloudflare bloquea bots en todo el dominio (probar desde GH Actions en la sesión C;
  plan B por noticias ya validado con notas reales de agrositio/Infocampo).

## Hecho (cont.) — SESIÓN A del build (bases + calendario)
- **Migración `20260712020000_create_calendario_estimaciones.sql`** (aplicada vía MCP + versionada):
  tablas `calendario_informes` y `estimaciones_produccion` (una fila por vintage) con RLS de lectura anónima.
- **`src/lib/calendario.ts`**: motor del calendario en código — seed de fechas oficiales 2026 (WASDE,
  Grain Stocks, Crop Progress, CONAB) + generador por reglas (PAS jueves, GEA/DEA, CFTC, EIA, etc.) con
  corrección de feriados AR. Conversión de hora DST-aware (12:00 ET → 13:00 AR en verano boreal, 14:00 en
  invierno; verificado). No depende de la base ni de un cron: rinde solo.
- **`src/components/informes-panel.tsx`**: panel compacto en la home ("Próximos informes", 10 días, alta+media).
- **`src/app/produccion/page.tsx` + `src/components/calendario-cliente.tsx`**: página `/produccion` con el
  calendario cronológico completo (filtros por organismo + "solo alto interés", client-side) + sección de
  estimaciones "en construcción" (roadmap de las 5 fuentes).
- **`site-header.tsx`**: nav con ítem "Producción" + anchors `/#...` (funcionan desde cualquier página).
- CSS del módulo en `globals.css` (acento por organismo, temas claro/oscuro).

## Quedó pendiente / en vuelo
- **Sesión B** (USDA + CONAB: ingestas + vintages + pizarra de estimaciones + gráficos) y **C** (Argentina)
  del plan — ver fases en el doc. La sección "Estimaciones" de `/produccion` las espera.
- `refresh-calendario.yml` (cron): DIFERIDO a la Sesión B — en v1 el calendario se genera en código, no hay
  nada que refrescar hasta que la ingesta popule las tablas / se quiera auto-detectar el ICS de NASS 2027.
- Pendientes de Lautaro (ninguno bloquea v1): suscripción mail al PAS · descarga manual 1 vez de los XLSX
  de bolsadecereales.com/datasets · keys opcionales QuickStats/FAS.
- A confirmar desde GH Actions en el build: si los runners pasan el Cloudflare de bolsadecereales.com ·
  filas AR/BR dentro de los CSVs vintage del WASDE (plan B: XMLs de ESMIS, ya verificados).

## Trampas descubiertas (para la próxima sesión)
- Ver §8 del plan (la lista completa). Las gruesas: WASDE con sufijo `-V2` y oct-2025 inexistente ·
  PSD guarda solo el valor vigente → **empezar a snapshotear cuanto antes** (girasol/cebada/sorgo por país
  no se recuperan) · CONAB TXT en Latin-1 con `;` y el levantamento entra al TXT al día siguiente ·
  calendario BCR desactualizado (usar como formato, no como fuente de fechas) · GEA semanal es JUEVES ·
  Cloudflare en bolsadecereales.com · ESMIS es 0-indexed (`page=0` para lo último) · el ICS de NASS trae
  horas ET "flotantes" sin TZID (parseado ingenuo queda 4-5hs corrido) · CONAB lev `099` = final de safra
  cerrada (excluir de los deltas mensuales).
