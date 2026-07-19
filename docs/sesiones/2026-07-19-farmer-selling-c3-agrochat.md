# Sesión 2026-07-19 — Encender la pata farmer selling (C3) del índice MESA

- **Rama:** `claude/desarrollos-pendientes-tqgic8` · **PR #39** (base `main`).
- **Objetivo:** cerrar lo que quedaba de la Fase 4 (temperatura MESA): prender la 3ª pata (oferta =
  avance de ventas del productor), que hasta ahora degradaba a null. Lautaro exportó de **Agrochat** la
  serie histórica semanal de comercialización y pidió verificarla + "juntar todo".

## Verificación del export de Agrochat (antes de cargar)
CSV `data/compras/serie_agrochat_comercializacion_2019_2026.csv`: 7 granos × 2 sectores × **8 campañas
(19/20→26/27)** × 389 semanas, en toneladas. Verificado por 4 lados:
1. **Estructura** completa (las 10 columnas pedidas).
2. **Volúmenes vs producción**: todos sensatos (maíz ~45-50 Mt, trigo 13-23 Mt, soja 21-45 Mt) y el split
   por sector tiene lógica agronómica (soja/girasol → Industria/crush; cebada forrajera 100% Exportador).
3. **Cross-check con MAGyP**: `trigo 25/26 Exportador = 16.238.900 tn` coincide EXACTO con el scrape
   directo verificado en la sesión de Fase 4 → Agrochat sale de la misma base SIO-Granos.
4. **Identidades contables** (`total = precio_hecho + a_fijar`) cierran con mediana de error 0,004% (redondeo).

**Defectos del ORIGEN (no de Agrochat), registrados:** un spike imposible (trigo/Industria/19/20 = 49,9 Mt
una semana, se auto-corrige), ~128 "caídas" del acumulado concentradas en campañas VIEJAS (19/20-20/21) y
Industria; las campañas RECIENTES (las que usa el índice) están casi limpias. `compras_semanales` NO
reconstruye el acumulado (suma 4-5× en Industria) → NO se usa; se usa `total_comprado_acumulado`.

## Decisión de negocio
"**Juntemos todo**": el avance de ventas suma los dos sectores (Exportador + Industria). Para soja, tanto
SOJA_CRUSH como SBS usan el total de poroto vendido (misma oferta del productor).

## Hecho
1. **Base** (`20260719234500`, commit `31f873e`): columnas ricas en `compras` (semanal / precio hecho /
   fijado / saldo a fijar / djve + `fuente`); el scraper vivo `ingest-compras.mjs` ahora las llena.
2. **Cargador + workflow** (commit `cc12bfe`): `scripts/cargar-compras.mjs` (mapea grano→codigo, sector,
   campaña; guarda crudo con `fuente='AGROCHAT'`; dry-run `--out`; refresca la matview al terminar) +
   `.github/workflows/cargar-compras.yml` (workflow_dispatch, `--replace-legacy`) + el CSV versionado.
3. **Índice C3** (commit `bfbe3cd`): matview `compras_avance_hist` (`20260719236000`) = avance = comprado
   acumulado (suma de sectores + **limpieza monótona min-de-derecha** que descarta spikes) / producción
   USDA AR (último vintage por campaña, Mt→tn); refresh enganchado a `refresh_lineup_visitas`.
   `temperatura.ts` computa `pctlFarmer` (percentil estacional del avance, SOJA_CRUSH=SBS) → `indiceCalor`.
   Panel: fila "pctl farmer" por tarjeta.

## Verificado
- **Lógica de la matview con datos sintéticos** (por SQL): spike 9.999.999 → clampeado a 1.100.000; suma
  de sectores 1,1M+0,5M=1,6M; avance = 1,6M/49M = 0,033 (join USDA + Mt→tn OK).
- **Transform del cargador** (dry-run): 9.522 filas válidas, mapeo correcto, trigo 25/26 = 16.238.900.
- **lint + tsc + build** ✅. Los módulos puros (estacional/mesa_calor) siguen 41/41.

## Quedó pendiente / en vuelo
- **Cargar la serie real**: el workflow `cargar-compras` NO es disparable desde la rama (GitHub sólo
  despacha workflows de la rama default → 404). **Al mergear el PR #39, correr *Cargar serie histórica de
  compras* (workflow_dispatch)** → carga las 9.522 filas + refresca la matview → **C3 queda live**.
  (La tabla `compras` quedó vacía: se borraron las 715 filas LEGACY viejas.) Hasta entonces el índice
  degrada solo a las 2 patas de demanda, idéntico a antes.
- **Rich columns / otros 4 granos**: el workflow carga los 7 granos y todas las columnas (habilita también
  el **ítem 8** del backlog: negociado/priceado por producto).
- **Extras de la spec** (no bloquean): matriz producto × mes de embarque, vista por zona, "qué cambió".

## Fix post-merge (PR #40) — carga real + 2 correcciones
Al mergear el #39 se disparó el workflow y **cargó las 9.522 filas** (verificado: 7 granos, 8 campañas,
hasta 08/07/2026). Verificando con datos reales salieron 2 cosas:
1. **Modelo (campaña activa + percentil calendario)**: en cada fecha conviven varias campañas (la vieja
   casi liquidada, la actual, la nueva que recién se planta). El código las mezclaba, y `campana_ini_year`
   marcaba como activa la que recién arranca (~1% vendido). Ahora, por `(cod,fecha)` se toma la **campaña
   activa = la de mayor venta semanal**, y el percentil pasa a **calendario** (avance de hoy vs la misma
   fecha ±15d de los últimos 5 años — el farmer selling es estacional por calendario, no por semana-de-
   campaña como gap/densidad). La matview expone `semanal_tn`. Verificado por SQL: **maíz 49,7%→pctl 59 ·
   soja 43,3%→pctl 5 (retención fuerte) · trigo 71,2%→pctl 23**.
2. **Refresh (timeout)**: refrescar las 4 matviews juntas por PostgREST excede el statement timeout (57014)
   → **hizo fallar el 1er run del cargador** tras subir bien los datos. Se saca compras_avance de
   `refresh_lineup_visitas` y pasa a una RPC liviana propia `refresh_compras_avance()` que llaman el
   cargador y el scraper vivo. Migración `20260719238000`.

## Trampas / aprendizajes
- Un workflow nuevo NO se puede disparar por API desde una rama feature (debe estar en la default) → 404.
- Las campañas de MAGyP/SIO se etiquetan por año de cosecha, NO por el `campana_ini_year` del repo (que es
  para atribuir embarques). Para el farmer selling: elegir la campaña activa por venta semanal + calendario.
- `refresh_lineup_visitas` vía RPC (PostgREST) tiene statement timeout: no meterle matviews pesadas de más.
- El `total_comprado_acumulado` de la fuente SIO/MAGyP tiene spikes que revierten → como es acumulado
  (no decrece), se limpia con `min(...) over (... rows between current row and unbounded following)`.
- `compras_semanales` del export no cumsuma al acumulado (semántica ruidosa) → no usarla para acumular.
