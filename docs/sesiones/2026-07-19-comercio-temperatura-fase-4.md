# Sesión 2026-07-19 — Comercio exterior Fase 4 (temperatura de mercadería · índice MESA)

- **Rama:** `claude/fase-4-temperatura-mesa-84g387` · **PR #36** (parcial) **MERGEADO** a `main`; el resto
  del índice va en un **PR nuevo** (protocolo de PR mergeado: rama reiniciada desde `main`).
- **Objetivo:** cerrar el ítem 6 del backlog (barcos/line-up), última fase del `PLAN_PUERTOS.md`: el
  índice de temperatura MESA (`/comercio/temperatura`), portando 1:1 `LineUps_Code` (`mesa_calor.py` +
  `estacional.py` + spec `ESPECIFICACION_MESA_CALOR.md`).

## Decisiones con Lautaro (previas a construir)
1. **Código MESA** = portar 1:1 desde su repo `LineUps_Code` (lo agregó a la sesión).
2. **Fuente farmer selling** = buscarla juntos (el dataset viejo murió → research, abajo).
3. **Índice** = las 3 patas con historia (backfill), pero al descubrir que la historia semanal de compras
   no está disponible directo, se acordó **"construir ya + intentar Wayback"**: índice sobre las 2 patas
   de demanda (con historia real) + reactivar el scraper live, y el farmer selling se prende solo si el
   backfill Wayback (desde Actions) junta ≥2 campañas.
4. **Alcance compras** = exportación + industria + revivir % cosecha/precio.

## Research de fuente (documentado en `docs/negocio/06_fuentes_comercializacion_granos.md` + `FUENTES.md` §13)
- **`compras` se frenó (11/06) porque MAGyP dio de baja el dataset CKAN** `compras-de-granos` (404), NO
  por bloqueo de IP. El dato vive en la **página institucional MAGyP "Compras y DJVE de Granos"**
  (`www.magyp.gob.ar`, server-rendered, alcanzable), con **ambos sectores**, multi-campaña y **archivo
  histórico semanal 2005→2026** — pero las **fotos semanales `01_embarque_*.php` están 404** (solo queda
  el índice de fechas). Wayback está **bloqueado por egress desde el sandbox** (corre desde Actions).
- Descartadas: SIO-Granos/Monitor (no responden a datacenter), BCBA (Cloudflare), BCR (republicador),
  **Agrochat** (chatbot, no feed), **Alphacast** (agregador de pago). Lautaro pasó un CSV de Agrochat
  ("SIOGRANOS últimos datos jul-2026"): verificado, es el **operado diario de SIO-Granos** (flujo diario,
  todos los sectores, sin campaña) → sirve para el **ítem 8 del backlog** (negociado/priceado), no para
  el acumulado por campaña/sector que necesita MESA.

## Hecho y verificado (commits en la rama)
1. **Fuente + docs** (`c91707a`).
2. **Scraper de compras** (`afc0316`): `scripts/ingest-compras.mjs` (parsea los 7 paneles Spry
   TabbedPanels de MAGyP, ambos sectores, todas las campañas: Semanal/Total Comprado/Precio Hecho/a
   Fijar/Fijado/Saldo/DJVE) + `.github/workflows/ingest-compras.yml` (cron lun/jue + dispatch backfill
   Wayback). Verificado 1:1 (trigo 16.238,9 kt · maíz 30.812,5 kt).
3. **Pata C2 densidad** (`992f448`): matview `lineup_densidad_hist` (Σ quantity ETB en 30d por producto,
   2020→2026). 1:1 vs SQL (MAIZE 16/07 = 2.817.120 tn / 107 buques).
   > (1-3 entraron a `main` en el PR #36; 4-8 son el PR nuevo.)
4. **Pata C1 gap** (`778b859`): matview `lineup_gap_hist` (declarado DJVE as-of `fecha_registro ≤ D` +
   ventana embarque solapando − originado). 1:1 vs SQL (MAIZE 16/07 declarado 7.173.438 / gap 4.356.318).
5. **Módulos puros** (`027792a`): `estacional.ts` (percentil estacional, ±15d, ≥2 campañas, alineado por
   semana-de-campaña) + `mesa_calor.ts` (bandas · dirección · matriz acción · equivalente poroto ·
   índice 0-100 renormalizado) + `campanas.ts` (fechasDeCampana/diaDeCampana/fechaEquivalente).
   **41/41 aserciones** vs `test_estacional.py` + `test_mesa_calor.py`.
6. **Página** (`575893e`): `temperatura.ts` (orquestación) + `temperatura-panel.tsx` (semáforo por
   producto) + `/comercio/temperatura` (`requireAdmin`) + tarjeta en el hub + estilos `calor-card`.
7. **Refresh** (`d3e0992`): `refresh_lineup_visitas()` refresca también densidad + gap (orden de
   dependencia); el cron de line-up las mantiene solas.

### Verificación end-to-end
- **Percentiles 1:1 vs SQL independiente** (día-de-campaña ±15, 5 campañas): MAIZE gap **39** / dens
  **94** · SBS gap **38** / dens **18**.
- **Render SSR con datos reales** (ruta temporal sin guard, borrada): Maíz FIRME **65** ↗ DIFERIR · Trigo
  FIRME **76** ↗ DIFERIR · Soja (crush, equiv. poroto) 🔥 CALIENTE **81** ↗ DIFERIR · Soja poroto PESADO
  **29** ↘ COMPRAR BARATO. Colores de banda + acciones OK.
- **lint + tsc + build ✅.** (No hubo screenshot Playwright: `playwright-core` no está en el entorno; se
  verificó el HTML servido, que trae los valores/colores/acciones correctos.)

## Quedó pendiente / en vuelo (para el PR nuevo o siguiente sesión)
- **Pata farmer selling (C3)**: degradada a null (índice sobre las 2 patas de demanda, pesos
  renormalizados — como LineUps_Code). Se prende cuando `compras` junte ≥2 campañas.
  - **Wayback = callejón sin salida (VERIFICADO al cierre de la sesión).** Se corrió el backfill desde
    Actions (run `29673387915`, con fix de reintentos `130f8e5`): Wayback devolvió **`0 snapshots`** de la
    página MAGyP → 0 filas. Es una `.php` profunda de gobierno, sin links entrantes, nunca crawleada.
    **NO reintentar por Wayback.** (El scraper live quedó robusto igual: `fetchTextRetry` con backoff.)
  - **Camino para prender C3 = Agrochat** (Lautaro confirmó que exporta series de cualquier período/corte):
    pedirle el **comprado por producto × sector (exportación+industria) × campaña, semanal, ~5 campañas** y
    exportarlo → armar **`cargar-compras.mjs`** (patrón `cargar_compras.py`) que suba el CSV/XLSX a Supabase
    → **C3 se enciende sola** (`temperatura.ts` ya renormaliza; falta solo poner `pctlFarmer` real +
    `avance = comprado_acumulado / producción_estimada` de `estimaciones_produccion`, industria para soja
    crush). Alternativa lenta: el scraper live acumula hacia adelante (~2 años para 2 campañas).
  - **Reemplazar las 715 filas viejas de `compras`** (flujo diario del scraper muerto, semántica
    incompatible con el acumulado semanal nuevo) — avisar a Lautaro antes de borrar.
  - Al prender: agregar el cómputo de `avance = comprado_acumulado / producción_estimada`
    (`estimaciones_produccion`), con la industria para la soja crush.
- **Extras de la spec** (no bloquean): matriz producto × mes de embarque (§6), vista por zona (§7),
  "qué cambió desde ayer" (§8). El core (semáforo por producto §9.2) está.
- **Idea de Lautaro**: bajar el operado diario SIO/BCR (negociado/priceado, a fijar/precio hecho) para el
  **ítem 8** — BCR es la vía scrapeable (candidata).

## Trampas / aprendizajes
- Carpetas `_nombre` en el App Router de Next son **privadas** (no ruteadas) → la ruta de verificación
  temporal daba 404 hasta renombrarla sin guión bajo.
- La página `/comercio/*` está **gateada siempre** con `requireAdmin` (aun con el flag apagado) → para
  verificar en local hay que usar una ruta sin guard (temporal) o el harness de datos.
- El SQL "rápido" de cross-check del percentil **falla para trigo** si no ajusta el año de campaña de
  diciembre (mes < mes_ini) → `campanas.ts` sí lo hace; confiar en el harness/página para WHEAT.
- `sbSelectAll(path, revalidate)`: el 2º arg es el revalidate del fetch-cache, no un page size (pagina
  interno).
