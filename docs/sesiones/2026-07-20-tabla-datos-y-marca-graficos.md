# Sesión 2026-07-20 — Tabla de datos + marca de agua en gráficos

- **Rama:** `claude/data-table-charts-2m8nvd` · **PR:** #_ (base `main`)
- **Objetivo pedido por Lautaro:** que cada gráfico de la web tenga (a) una **tabla con los
  mismos datos que dibuja** (doble lectura número/curva), **siempre visible** debajo del chart,
  y (b) una **marca de agua con el logo completo** de ROFO AGRO dentro del área del gráfico.

## Hecho
- **Fundaciones (commit `d885274`)** — 2 componentes genéricos + asset:
  - `public/rofoagro-logo-marca.svg` — derivado de `rofoagro-logo.svg` (logo completo) apto para
    marca de agua: se quitaron los **31 halos pálidos** del auto-trace (chroma<30, lum>185)
    **solo en la zona del isotipo** (y<1000); los blancos del wordmark son los contadores de las
    letras y se conservan (quitarlos deja las letras macizas). Verificado sobre fondo claro y
    oscuro: sin cajas ni halos.
  - `src/components/chart-marca.tsx` (**`ChartMarca`**): overlay del logo para meter dentro del
    contenedor `position:relative` de cada chart. Server-safe, sin props; tamaño (55% del ancho)
    y **opacidad centralizada** (.06 claro / .07 oscuro) en `.cm-marca` de `globals.css`.
    `pointer-events:none`, `aria-hidden`, `z-index:0` (debajo de `.cv-tip` → el tooltip queda
    por encima).
  - `src/components/chart-tabla.tsx` (**`ChartTabla`**): tabla genérica **siempre visible** bajo
    el gráfico (sin toggle — decisión de Lautaro). El caller formatea los números (es-AR); la
    tabla muestra tal cual, `null` → "—". Reusa `.tbl` (header sticky) con scroll vertical propio
    (max-height 320px) + horizontal interno (`.ct-scroll`).
  - `globals.css`: bloques `.cm-*` / `.ct-*` nuevos, claro/oscuro con los tokens.
- **Integración en todos los gráficos (commit `402cf10`)** — solo presentación, **cero fórmulas
  tocadas**:
  - **`/graficos`** (`spread-chart.tsx`): marca en un wrapper relativo alrededor del
    `ResponsiveContainer` (los dos modos, Campañas y Período, la heredan) + tabla derivada de las
    **MISMAS rows** que dibuja Recharts — X con el formato del tooltip (`"257 · MAY"` / fecha
    ISO), columna por campaña/posición, banda mín/mediana/máx cuando está visible.
  - **`/produccion`** (`evolucion-chart.tsx`): marca en `.chart-wrap` + tabla una fila por fecha
    de publicación × columna por organismo (formato del tooltip, "USDA (Mt)" / "CONAB (Mt)").
  - **`/dolar`** (`dolar-futuro-chart/panel.tsx` + `implicitas-chart/panel.tsx`): marca en la
    curva de futuro y en implícitas; tabla "Datos de la curva" (Posición/Precio, mismos points
    del panel, SPOT incluido) y **tabla pivot** de implícitas (plazo × serie, armada en el panel
    server).
  - **`/calculadoras`** (`calc-fijar.tsx` + `calc-estrategias.tsx`): **solo marca** en los charts
    de delta y payoff — sin tablas nuevas (ver Decisiones).

## Decisiones tomadas (y por qué)
- **Alcance = TODOS los gráficos de la web** (no solo `/graficos`): /graficos (2 modos),
  /produccion, /dolar (curva + implícitas) y las 2 calcs con chart. Pedido de Lautaro.
- **Tabla siempre visible, no alternativa/toggle** — decisión de Lautaro (20/07): la doble
  lectura curva+número tiene que estar sin clicks. Cierra (distinto a como estaba anotado) el
  pendiente "tabla alternativa" de la v2 del panel de gráficos.
- **Las 2 calculadoras NO llevan tabla nueva**: "a fijar" y "estrategias" ya tienen su tabla de
  escenarios con los mismos datos del chart → duplicarla era ruido. Solo se les sumó la marca.
- **Asset de marca = logo COMPLETO** (`rofoagro-logo-marca.svg`, derivado de `rofoagro-logo.svg`),
  no el isotipo — pedido explícito. Se limpió el ruido del auto-trace SOLO donde corresponde
  (zona del isotipo); a baja opacidad los knockouts del wordmark no se notan.
- **Opacidad/tamaño centralizados en `.cm-marca`** (un solo lugar en `globals.css`): si Lautaro
  la quiere más tenue, es un cambio de 1 línea.
- **La tabla no re-formatea nada**: recibe strings ya formateados por el caller (mismo formato
  del tooltip de cada chart) → imposible que tabla y curva difieran.

## Verificado
- `npm run lint` ✅ · `npx tsc --noEmit` ✅ · `npm run build` ✅ (2º build con creds Supabase para
  que las páginas ISR salgan con datos reales).
- **Navegador (Playwright, `next start` + `NODE_USE_ENV_PROXY=1`, claro y oscuro)** — valores
  cotejados 1:1 contra los KPIs/leyendas de cada panel:
  - `/graficos` Campañas (Soja MAY/JUL): 258 filas, 1ª fila 5,10 = "Mín ventana", 9,40 = "Máx
    ventana"; Período (Pizarra maíz 2026): 130 filas, "—" en posiciones que no cotizan.
  - `/produccion` (soja Brasil 22/23): 48 filas; 149,00 = arranque de la línea; tooltip
    "USDA · 156,00 Mt · WASDE #641" OK.
  - `/dolar`: curva SPOT 1.478,5 / JUL26 1.483,0 / DIC26 1.625,0 = tabla KPI; implícitas pivot
    11 plazos (10d 11,1% = TNA JUL26 · 17,4% = D31L6).
  - Calcs: barras −8/−13/−20/−30 = columna Delta; payoff ±15 = Máx ganancia/pérdida.
  - Marca sutil en todos, tooltip por encima, estado en URL del modo Campañas intacto, cero
    errores de consola, layout sin roturas. Screenshots en el scratchpad de la sesión.
- **Sin tocar**: `watermark.tsx` (marca de agua del email, login — es OTRA feature) y fórmulas.

## Quedó pendiente / en vuelo
- Nada bloqueante. Dos observaciones menores, dentro de lo aceptable:
  - En `/dolar` implícitas, plazos repetidos de "Granos (ej.)" colapsan en una celda con " · ".
  - La marca en la calc "a fijar" se percibe un poco más (chart alto y de fondo vacío); si
    Lautaro la quiere más tenue → bajar la opacidad en `.cm-marca` (un solo lugar).
- El pendiente v2 "guard \"parcial\"" (aviso de datos incompletos en la tabla) sigue abierto —
  esta sesión solo cerró la parte de la tabla.

## Trampas descubiertas (para la próxima sesión)
- **El logo completo también es auto-trace**: para usarlo como marca hubo que limpiar halos, pero
  **solo en la zona del isotipo** (y<1000) — los blancos del wordmark son los contadores de las
  letras; el filtro chroma/luminancia a ciegas las deja macizas.
- **El sandbox no tenía `.env.local`** → /graficos y /produccion degradaban a vacío/roadmap en el
  build. Se creó `/home/user/ROFOAGRO_RESEARCH_WEB/.env.local` con `SUPABASE_URL` +
  `SUPABASE_ANON_KEY` (la publishable, pública por diseño, vía MCP de Supabase); está
  gitignoreado (verificado con `git check-ignore`) y queda en el sandbox para futuras sesiones.
- Para que la marca quede **debajo del tooltip** alcanza con `z-index:0` en el overlay: `.cv-tip`
  ya flota por encima; no hace falta tocar los charts SVG.
