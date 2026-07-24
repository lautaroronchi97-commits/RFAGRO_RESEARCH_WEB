# Sesión 2026-07-24 — C13 · Sintéticos LECAP + dólar futuro con TIR

- **Rama:** `claude/backlog-p9-sinteticos` · **PR:** #_ (base `main`)
- **Objetivo pedido por Lautaro:** C13/P9 del backlog maestro — sintéticos LECAP + dólar futuro con
  TIR. Fórmula ya validada por él (chat + su Excel "REAL_TIME v2.5", hoja "DOLAR SINTETICO"); el
  insumo que faltaba era la fuente del "pago final por letra".

## Hecho
- **Fórmula pura y testeada** (`src/lib/sinteticos.ts`, sin `server-only` a propósito para poder
  testearla, mismo criterio que `derivadas.ts`/`fijar.ts`):
  - `calcularSintetico(spot, px, pagoFinal, dolarFuturo, dias)` → `{sinteticoAFinish, tasaDirecta, tna}`.
    `sint = spot × (pagoFinal/px)` · `directa = sint/fut − 1` · `TNA = directa × 365/dias` (act/365).
  - `emparejarSinteticos(...)` empareja cada letra con la posición de dólar futuro de su **mismo mes
    calendario** de vencimiento (criterio del Excel) y arma la fila con TNA sintético vs TNA del
    futuro directo + ventaja (pp).
- **Fuente del pago final = carga semi-manual** (`supabase/migrations/20260724140000_c13_lecap_pago_final.sql`,
  **aplicada** por MCP): tabla pública `lecap_pago_final` (ticker, pago_final, fecha_vencimiento) +
  RPC `admin_upsert_lecap_pago_final` con guard `is_admin()` (mismo patrón que `admin_upsert_estimaciones`
  de L5). Seed con los **3 valores verificados 1:1 contra el Excel** (S31L6 117,677 · S14G6 108,03 ·
  S31G6 127,064); el resto lo carga Lautaro por `/admin/datos`.
- **Fetcher server** (`src/lib/market/sinteticos.ts`, re-exportado por la fachada `market.ts`):
  `getSinteticos()` junta `getLecaps` (precio data912) + `getDolarFuturo` (posiciones + spot MAE) +
  el pago final de Supabase, y llama a la lib pura. Degrada honesto (status `parcial`, problemas
  listados) si falta cualquier pata.
- **Panel completo** (`src/components/sinteticos-panel.tsx`): tabla Letra · DLR · Precio · Pago final ·
  Sintético · TNA sint. · TNA fut. · Ventaja, con el **mejor sintético destacado** arriba (mayor TNA) y
  la fila resaltada. Si falta el pago final de una letra, las columnas del sintético van "—" (no se
  inventa). InfoTips + "¿Qué es esto?" con la fórmula.
- **Uploader admin** (`src/app/admin/datos/lecap-actions.ts` + `lecap-uploader.tsx`, wireado en
  `page.tsx`): se pega una letra por línea (`TICKER  PAGO_FINAL  [VENCIMIENTO]`, coma o punto decimal,
  fecha opcional), preview → confirmar. Acepta LECAP (S) y BONCAP (T).

## Decisiones tomadas (y por qué)
- **Fuente del pago final: carga semi-manual, NO automática.** Investigado con requests reales:
  - **BYMA** es la fuente última (verificado: los "Pago Final" del Excel coinciden 1:1 con lo que
    publica BYMA — cruzado contra `rendimientos.co`, que declara `fuente: BYMA`: S31L6 117,677 /
    S14G6 108,03 / S31G6 127,064, exactos). Pero el open-data de BYMA (`open.bymadata.com.ar`) es un
    feed de **precios/cotización**, no expone el importe al vencimiento; `public-bonds` volvió vacío.
  - **IAMC** (`iamc.com.ar/informeslecap/`): SSL roto / 502 desde el sandbox, y es un PDF diario frágil.
  - **MECON licitaciones**: letra por letra, muy laborioso.
  - **`rendimientos.co`**: tiene el dato exacto pero es un tercero no oficial → usado SOLO como
    verificación cruzada, nunca como fuente de producción (criterio del proyecto + indicación explícita).
  - Como el pago final **casi no cambia** (se fija en la emisión; solo se actualiza cuando el Tesoro
    licita letras nuevas, cada 1-2 meses) y el precio diario ya lo trae data912, la carga semi-manual
    (patrón DEA-SAGyP / camiones-Williams) es la arquitectura correcta, no un parche.
- **Emparejamiento por mismo mes calendario** (no "más cercano en días"): el criterio del Excel es la
  letra contra el DLR de su mismo mes (S31L6↔JUL26, S14G6 y S31G6↔AGO26). "Más cercano en días" mandaba
  S14G6 (14/08) a JUL26 (fin de julio, 14 días) en vez de AGO26 (17 días) — bug. Si no hay DLR del mismo
  mes, la letra se excluye (cruzar meses mezcla vencimientos distintos, no es un sintético limpio).
- **Alcance v1 = LECAPs (S) que ya trae data912.** La tabla y el uploader aceptan BONCAPs (T), pero el
  precio en vivo de los T no lo wirea `getLecaps` (filtro `/^S\d/`) — sumar T al feed queda como follow-up
  fácil (no toqué el fetch de data912 para no cambiar el panel de precios existente).
- **`pago_final` público (SELECT anon)**, igual que `compras_bcra`/`camiones`/`djve`: es dato de emisión
  de deuda soberana, sin nada sensible de mesa.

## Verificado
- **Fixture del Excel EXACTO** (test unitario `src/lib/sinteticos.test.ts`): con spot 1488, px 116,45,
  pago final 117,677, futuro 1498,5, 23 días → sint **1503,678626**, TNA **5,4843%** (clavado). La
  directa exacta de la fórmula da 0,34559% — el Excel muestra 0,34562% por redondeo intermedio del
  sintético; el output que importa (TNA) coincide.
- lint ✅ · `tsc --noEmit` ✅ · **154/154 tests** (7 nuevos) ✅ · `npm run build` ✅.
- **Live end-to-end con datos reales** (`NODE_USE_ENV_PROXY=1 npm run dev` + Supabase service key +
  MAE + data912, vía una ruta debug temporal ya borrada): spot 1491, panel con 5 filas —
  S31L6→JUL26 (sint 1.497,07, TNA +16,6% vs futuro +8,2% = ventaja +8,4%, destacado), S14G6/S31G6→AGO26,
  S15S6/S30S6→SEP26 sin pago final → "—" (degradación honesta). Emparejamiento 100% mismo-mes; S30O6
  (octubre) correctamente excluida por no haber OCT26 en el panel del momento.
- **Backend por SQL**: guard `is_admin()` rechaza a anon/no-admin ("solo admin"); parseo jsonb del RPC
  normaliza mayúsculas (`t30j6`→T30J6), preserva la fecha existente si viene vacía, acepta BONCAP;
  RLS anon ve el seed (3 filas). Todo con rollback salvo la migración (aditiva).

## Quedó pendiente / en vuelo
- **Verificación en navegador con sesión admin del uploader** de `/admin/datos` no se hizo (la página
  exige `requireAdmin` siempre, y el sandbox no tiene sesión admin real) — el backend quedó verificado
  por SQL; la primera carga real la hace Lautaro logueado. La lógica de precios/sintético SÍ se vio
  renderizada con datos reales en `/dolar` (no requiere login con `AUTH_ENFORCED` apagado).
- **BONCAPs (T) en el panel**: la tabla/uploader los soportan, pero falta wirear su precio en vivo
  (sumar el filtro `T` en `getLecaps` o un fetch aparte). Follow-up chico.
- **Screenshot claro/oscuro**: no hay Playwright en este entorno; se verificó el HTML renderizado con
  datos reales. El panel usa las clases temáticas estándar (`tbl`/`pos`/`neg`), sin diferencia de datos
  entre temas.

## Trampas descubiertas (para la próxima sesión)
- **`server-only` EXPLOTA en vitest/node** (su `index.js` default hace `throw`): cualquier lib con
  `import "server-only"` no se puede importar desde un test. Por eso la fórmula pura vive en
  `src/lib/sinteticos.ts` (sin server-only) y el fetcher en `src/lib/market/sinteticos.ts` (con
  server-only) — misma separación que ya usaban `derivadas.ts`/`fijar.ts` vs los `market/*`.
- **Carpetas `src/app/api/_algo/` con guión bajo** son PRIVADAS en Next (no ruteables) → una ruta debug
  `_debugsint` daba 404. Renombrar sin guión bajo.
- **data912 (`/live/arg_notes`) es flaky bajo hits repetidos**: pasó de 31 símbolos a 1 tras varias
  requests seguidas, y se recuperó solo en ~2-3 min. Además el **fetch data cache de Next
  (`revalidate:60`) cachea la respuesta vacía** del bache aun con la ruta `force-dynamic` → para una
  corrida limpia hay que reiniciar el dev server en frío con la fuente ya sana.
