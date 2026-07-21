# Sesión 2026-07-21 — Auditoría E2: fórmulas y lógica de negocio (fase 1)

- **Rama:** `claude/e2-formulas-go9i9y` · **PR:** #51 (base `main`, draft hasta el OK)
- **Objetivo pedido por Lautaro:** ejecutar el PROMPT E2 de `PLAN_AUDITORIA.md` (auditar TODAS las
  fórmulas del proyecto; fase 1 = solo informe, cero código tocado).

## Hecho
- **Informe [`auditoria/E2-formulas.md`](../auditoria/E2-formulas.md)** (6 hallazgos + 11 preguntas)
  + **anexo [`auditoria/E2-formulas-fichas.md`](../auditoria/E2-formulas-fichas.md)** con **45
  fichas** (una por fórmula, con ejemplo numérico EXACTO con datos reales → fixtures para E4).
- Cobertura completa del inventario del prompt: 9 calculadoras y sus libs · paneles granos
  (arbitrajes/pases/capacidad/mejor caja/curva-futuros) · `market.ts` completo · `src/lib/lineup/*`
  (8 módulos + 4 auxiliares) · negociado/estimaciones/calendario/derivadas/noticias/monitor/hábiles
  · cotejo transversal de los 6 parsers de mes/posición.
- Método: **verificación adversarial por familia** (6 subagentes en paralelo: derivar la fórmula
  desde los docs ANTES de mirar el código → comparar → ejecutar ejemplo con datos reales → bordes),
  con la sesión principal re-verificando los hallazgos no-OK (el timeout se reprodujo 2/2; la
  contradicción del calendario se dirimió por SQL contra el dato real).

## Decisiones tomadas (y por qué)
- **El hallazgo "corrigeFeriadoAR está al revés" se dirimió contra la realidad, no contra el doc:**
  el GEA #196 real está fechado 08/07 (miércoles, día hábil ANTERIOR al feriado del jueves 09/07) →
  el código está bien y el plan/comentario están mal. Quedó como hallazgo documental, no de código.
- **Discrepancias de criterio ≠ bugs:** umbrales del Python (0,7/1,3/5.000 t), parámetros del índice
  MESA (pesos/bandas/rindes), primas default `pr()`, UST$T T+0 vs T+1, picker fin-de-mes — todo va
  como PREGUNTA con ejemplo numérico, según la regla central del prompt.

## Verificado
- lint ✅ · tsc ✅ (el PR es solo docs; build de main sin cambios de código).
- Resultado global: **cero bugs de fórmula en 45 fichas**. 1 bug objetivo de RUNTIME
  (`djve_cobertura` timeout 57014 por anon → `/comercio/empresas` y `/comercio/senal` degradan hoy),
  1 desfasaje operativo (matviews gap/densidad al 16/07 vs line-up 20/07), 2 desfasajes doc↔código.
- Controles reproducidos exactos: Excel 125,6 y 0,5796 · trigo 16.238.900 t · pctl farmer 59/23 ·
  cumplimiento 146% · `campanas.ts` 612/612 vs SQL · percentiles 8/8 vs recomputación independiente
  · factores CBOT idénticos carácter a carácter · UST$T y FAS Up River vigentes en las fuentes vivas.

## Fase 2 (mismo día — Lautaro contestó los 6 hallazgos y las 11 preguntas en bloque)
- **Base:** `djve_cobertura` vista → MATVIEW + refresh en `refresh_lineup_visitas()` (migración
  `20260721120000`, aplicada por MCP): anon pasó de timeout 57014 a **HTTP 200 en 2,5 s** →
  `/comercio/empresas` y `/comercio/senal` vuelven. Refresh corrido: matviews gap/densidad al 20/07.
- **Código:** UST$T → `plazo === "000"` (T+0) · picker de curva → vto REAL de `vencimientos` · pases
  + consecutivos · aforo → % relativo · semáforo soja → equivalente poroto · estrategias → 4 presets
  nuevos (31), extremos reales ("ilimitada"/payoff en P=0), nota "primas estimativas".
- **Docs:** plan calendario + FORMULAS_EXCEL + comentarios obsoletos + CONTEXTO (UST$T) + umbrales/
  params MESA marcados PROVISORIOS en el código.
- **Decisiones registradas** en el informe (§Respuestas + tabla Fase 2 + columna «Decisión»).

## Quedó pendiente / en vuelo
- **E7:** calibración de umbrales de cobertura + parámetros MESA (provisorios) · comisiones de
  estrategias del catálogo. **E4:** tests con los fixtures de las fichas (incl. los actualizados de
  fase 2) + commitear los tests del port. **E5:** causa raíz del refresh que no corrió el 20/07 ·
  `lineup_estacional` con timeouts intermitentes. Planes Cocos Gold/Pro: NO (decisión).

## Trampas descubiertas (para la próxima sesión)
- **`djve_cobertura?select=*` timeoutea por anon** (~4-5 s → 57014) desde el backfill 2011-2025;
  filtrada por `cod` responde ~1 s. `lineup_estacional` falla intermitente (1/3). Ojo al navegar
  E3: esas páginas van a mostrar la degradación.
- MAE `/resumen/FOR` devuelve **dos filas UST$T** (plazo 000 y 001) — cualquier código que "busque
  UST$T" tiene que elegir plazo explícitamente.
- El límite de sesión de Claude puede cortar subagentes a mitad de auditoría: se reanudan con
  SendMessage sin perder contexto (pasó con 3 de 6 acá).
