# PLAN PUERTOS — Line-up de buques y análisis de embarques (decisiones cerradas + fases)

> **Estado: PLAN APROBADO, LISTO PARA EJECUTAR.** Cerrado con Lautaro el 18/07/2026 (11 decisiones,
> abajo). Cubre el **ítem 6 del backlog** de `ESTADO.md` ("seguir desarrollando barcos / lineups en
> puerto"). Se ejecuta en **5 fases** (§5), cada una un PR verificable.
>
> ⚠️ Para el modelo que ejecute: leé además `CLAUDE.md` (carga `AGENTS.md` + `docs/ESTADO.md` +
> `docs/CONTEXTO.md`). **Este repo usa Next.js 16 con breaking changes: leé `node_modules/next/dist/docs/`
> antes de escribir código.** La lógica de negocio NO se inventa: se **porta** del repo de Lautaro
> **`lautaroronchi97-commits/LineUps_Code`** (Python/Streamlit, testeado, sobre la MISMA tabla `lineup`).

## 1. Objetivo (en palabras de Lautaro)

Una mejor versión de su proyecto LineUps_Code dentro de la web: información útil **con nombre de las
empresas que están operando** en los puertos. En principio **solo para él y Mauro** (la mesa); a los
clientes les llega vía el informe semanal (ítem 11 del backlog). Los análisis quedan para la mesa;
lo de DJVE sigue abierto.

## 2. Decisiones cerradas (18/07/2026 — NO re-preguntar, ya decidido)

| # | Tema | Decisión |
|---|------|----------|
| 1 | Audiencia | **Solo mesa (Lautaro + Mauro) por ahora**: las páginas de análisis van protegidas **SIEMPRE** (patrón `/admin`: gate aunque `AUTH_ENFORCED` esté apagado — hoy la web es pública y esto no puede quedar expuesto). **Previsto para abrir**: cuando se prenda el login se puede habilitar por permisos de sección. DJVE sigue pública; las DJVE nuevas se mostrarán en novedades (ítem 4 del backlog, fuera de este plan). |
| 2 | Ubicación | **Dentro de Comercio exterior** (`/comercio`), una **subpágina por análisis** (`/comercio/puertos`, `/comercio/empresas`, …). `/comercio` queda como hub: DJVE (pública) + tarjetas a los análisis (visibles solo para admins). |
| 3 | Orden | El de §5: dato vivo → foto operativa + cambios → empresas → embarques por mes → temperatura. |
| 4 | Gap por mes | Se hace, con la lectura de Lautaro: **hoy se declaran DJVE casi solo para el disponible**, así que los meses adelante suelen estar finos. El valor del panel es justamente detectar cuándo SÍ aparecen DJVE forward (presión a futuro). |
| 5 | Métricas por empresa | Buques próximos y ton por producto · cuán corta está (declarado DJVE − originado line-up) · ritmo vs su propia historia · share por producto/zona. **+ 2 pedidos nuevos**: (a) **avance exportado vs lo que prevé la Bolsa** por producto; (b) **separar qué DJVE y qué barcos corresponden a la cosecha nueva vs la vieja** (atribución de campaña). |
| 6 | Agrupación de empresas | Se mantiene `shipper_norm` de LineUps_Code (VITERRA-BUNGE como uno, etc.). El panel muestra **empresas operativas actualmente y productos importantes** (nada de colas largas). |
| 7 | Mapeo DJVE↔shipper | Se porta tal cual el de `cobertura.py`. Foco geográfico: **el Gran Rosario punta a punta (Gral. Lagos → Timbués/PGSM)** es lo más importante. |
| 8 | Productos | **Complejo soja** (SBS poroto · SBM+SHULLS sub. soja · SBO aceite) · **MAIZE** · **WHEAT** · **BARLEY** (forrajera; MALT excluido) · **SORGHUM** · **complejo girasol** (SFSEED · SFMP · SFO). **Fertilizantes NO.** |
| 9 | Zonas | **Solo Up River (Norte/Sur, clasificado por muelle con las regex de `config.py:zona_carga`) y Bahía Blanca.** Quequén, Uruguay, Alto Paraná, etc. → "Otros", fuera de los paneles por default. |
| 10 | Scraper | **Que corra solo**: Edge Function de Supabase (sa-east-1, IP distinta a la de GitHub Actions que ISA bloquea). Si ISA también la bloquea, **fallback: Lautaro lo corre desde su PC** con LineUps_Code (mismo upsert, misma clave única → idempotente, conviven sin conflicto). |
| 11 | Frecuencia | **2×/día: 10:00 y 22:00 ART.** |

## 3. Lo que ya existe (no rehacer)

- **Tabla `lineup` en Supabase** (`lineup-argentina`): 494.934 filas, 1.282 snapshots diarios,
  **2020-01-06 → 2026-07-06**, con `port · berth · vessel · ops(LOAD/DISCH) · cat · cargo · quantity ·
  dest_orig · area · shipper · eta/etb/ets · es_agro`. Clave única
  `(fecha_consulta,port,berth,vessel,cargo,quantity,eta,dest_orig,shipper,ops)` NULLS NOT DISTINCT.
- **Por qué se frenó**: ISA Agents bloquea las IPs de los runners de GitHub Actions; el paso del cron
  de LineUps_Code estaba en `continue-on-error` → quedaba verde sin traer line-up (falso verde). El
  último snapshot (06/07) entró el 08/07. **La fuente sigue viva y es pública** (scrape HTML de
  `isa-agents.com.ar/info/line_up_mndrn.php?select_day=DD&select_month=MM&select_year=YYYY&mode=Search`,
  sin login; sirve fechas pasadas → el hueco 07/07→hoy es backfilleable).
- **LineUps_Code** (repo de Lautaro, Python, con tests): `scraper.py` (fetch+parse, validación de
  headers, rollover de año en fechas "14-abr"), `config.py` (productos prioritarios, colapso
  SHULLS→SBM, **`zona_carga(port, berth)`** con regex por muelle Norte/Sur), `shipper_norm.py`,
  `cobertura.py` (gap DJVE vs line-up), `mesa_embarque.py` (gap por mes), `puerto.py`
  (congestión/sequía por zona), `mesa_calor.py` + `estacional.py` + `campanas.py` (índice de
  temperatura), `mesa_diff.py` (tape de cambios), `fas_comprador.py` (urgencia compradora).
- En esta web: panel DJVE (`djve.ts` + `djve-panel.tsx`) público en `/comercio`; sección `comercio`
  ya existe en `SECCIONES_META`; healthcheck de frescura (`healthcheck-frescura.mjs` + `healthcheck.yml`).

## 4. Arquitectura

- **Lectura**: la web NO pagina 494k filas. Vistas nuevas en Supabase (migración) con lectura anon:
  - `lineup_ultimo`: el último snapshot completo (filas de la última `fecha_consulta`).
  - `lineup_anterior`: el snapshot inmediato anterior (para el tape de cambios).
  - agregados históricos que hagan falta por fase (ej. serie semanal por producto/zona/shipper para
    "ritmo vs historia"), SIEMPRE pre-agregados en la vista, no en el request.
- **Lógica portada a TS** en `src/lib/lineup/` (espejo de los módulos Python, con los mismos nombres
  de conceptos): `config.ts` (productos/zonas/colapsos), `zonas.ts` (`zonaCarga`), `shippers.ts`
  (normalización), `cobertura.ts`, `embarque.ts`, `diff.ts`, `campanias.ts`. Los valores de las
  constantes se copian LITERALES de `config.py`/`shipper_norm.py` (no reinterpretar).
- **Gate mesa**: las subpáginas de análisis usan el guard de admin existente (mismo mecanismo que
  `/admin`: protegido SIEMPRE, flag prendido o no). Cuando Lautaro prenda el login y quiera abrirlas,
  se cambia el guard a permisos por sección (ya previsto en el modelo de empresas).
- **Escritura (scraper)**: Edge Function `ingest-lineup` en el proyecto `lineup-argentina` (Deno,
  sa-east-1): fetch ISA → parse (puerto del parser de `scraper.py`: validación de headers
  `EXPECTED_HEADERS`, `parse_quantity`, fechas cortas con rollover, dedup intra-batch) → upsert con la
  clave única existente → **guard anti falso-verde** (día hábil con 0 filas = error, mismo criterio que
  los 8 scripts del repo). La dispara `scripts/ingest-lineup.mjs` desde GitHub Actions
  (`ingest-lineup.yml`, 10:00 y 22:00 ART), una fecha por request. Backfill por dispatch (`from`/`to`).
- **Observabilidad**: sumar `lineup` al `healthcheck-frescura.mjs` (alerta si el último snapshot tiene
  más de 2 días hábiles). Así el falso verde de junio/julio no puede repetirse en silencio.

## 5. Fases (cada una = un PR, verificable por separado)

### Fase 0 — Dato vivo (scraper + backfill + healthcheck) — ✅ HECHA (18/07/2026)
Edge Function **`lineup-ingest`** (`supabase/functions/lineup-ingest/`, deployada en `lineup-argentina`,
región sa-east-1): warm-up de cookie → fetch ISA → parse (puerto fiel de `scraper.py`) → **upsert
idempotente** con la clave lógica (`on_conflict`, NULLS NOT DISTINCT). Restringida a rol `service_role`
(la anon key pública NO puede gatillarla → 403). La dispara **`scripts/ingest-lineup.mjs`** desde
**GitHub Actions** (`ingest-lineup.yml`, 10:00 y 22:00 ART), **una fecha por request** (parsear 490 filas
con deno-dom no entra en el límite de CPU de la función si se piden muchas fechas juntas → el script
itera por fecha). Guard anti falso-verde: ventana diaria entera vacía = `exit 1`. `lineup` sumado al
**healthcheck de frescura** (umbral 7 días, holgado por los huecos de ISA).

**Verificado (con datos reales):**
- **La IP de Supabase (São Paulo) SÍ pasa el filtro de ISA** (el bloqueo era solo a los runners de
  GitHub Actions) → el scraper automático es viable, NO hace falta el fallback PC.
- Parser fiel: 06/07 devolvió **exactamente 464 filas**, idéntico a lo que ya había en la base.
- Upsert **idempotente** (re-correr 16/07 dejó 490, no 980).
- **Backfill 07/07→16/07 aplicado**: 6 días nuevos con datos (07,08,10,13,14,16 = 2.853 filas). Huecos
  legítimos de ISA: 09/07 (feriado 9 de Julio), 15/07 y 17/07 (ISA no publicó, verificado por fetch
  directo), 11-12 y 18 (fin de semana). Último snapshot: **16/07** (antes 06/07).
**Nota**: la tabla `compras` (farmer selling, frenada 16/06) NO se toca acá; se reactiva en la Fase 4.
**Pendiente operativo (Lautaro):** el `schedule` corre desde la rama default → recién queda activo cuando
esto entre a `main`. Backfill futuro / re-scrape: dispatch de `ingest-lineup.yml` con `from`/`to`.

### Fase 1 — Foto operativa + tape de cambios (`/comercio/puertos`) — ✅ HECHA (18/07/2026)
La pantalla de pre-apertura: KPIs del último line-up (ton y buques por producto de los de la decisión 8,
por zona Up River N/S y Bahía) + **qué cambió vs el snapshot anterior** (buques nuevos, tonelaje que
apareció/desapareció por producto — lógica de `mesa_diff.py`) + tabla de buques filtrable (buque ·
muelle · zona · producto · ton · destino · **empresa** · ETB) con export CSV.

**Construido:**
- Vista `lineup_ultimas_ruedas` (últimas 2 fechas de consulta, `rueda_rank`) — evita traer 500k filas.
- `src/lib/lineup/config.ts` (productos prioritarios + colapso SHULLS→SBM), `zonas.ts` (`zonaCarga` por
  muelle, puerto de `config.py`), `shippers.ts` (`canonShipper`, puerto de `shipper_norm.py`), `foto.ts`
  (agregación server: por producto, por zona, tabla de buques, diff de buques nuevos ≥30kt).
- `src/components/lineup/foto-operativa.tsx` (panel: KPIs, caja "qué cambió", tablas por producto/zona)
  + `buques-tabla.tsx` (client: filtros producto/zona/búsqueda + export CSV).
- `/comercio/puertos` — gateada con `requireAdmin()` (protegida SIEMPRE, mismo patrón que `/admin`,
  decisión 1: solo mesa).

**Verificado con datos reales** (rueda 16/07 vs 14/07, vía dev server + Playwright headless):
- Agregación por producto validada 1:1 contra SQL a mano: Maíz 92 buques/3.118.960 t, Harina de soja
  70/1.885.090 t, total 187 buques/6.497.074 t — coincide exacto.
- El diff de buques nuevos funciona (17 buques nuevos detectados, con empresa ya normalizada:
  VITERRA-BUNGE, LDC, COFCO, MOLINOS, ACA…) y los deltas por producto colorean bien (verde/rojo/`=`).
- Screenshots claro + oscuro: diseño consistente con el resto de la web (mismo `Panel`/`SourceStamp`/
  `QueEsEsto`). lint + typecheck + build ✅.

### Fase 2 — Panel de empresas (`/comercio/empresas`) + semáforo físico→precio — ✅ HECHA (19/07/2026)
El pedido central. **Panel de empresas** (`/comercio/empresas`, `requireAdmin`): por exportador
normalizado — **gap de cobertura FOTO FORWARD 60d** (declarado DJVE vs originado line-up → señal
alcista/bajista, `cobertura.py`) · **avance de campaña** (declarado vs originado acumulado) · **ritmo
estacional** (line-up parado hoy vs lo normal para esta época, 5 campañas) · share por producto/zona ·
tabla filtrable + CSV. Tablas por producto con **campaña nueva/vieja** (atribución por embarque,
`campanas.py`) y **disponible (opción 30) / forward (opción 360)**. Más el **semáforo físico→precio**
(`/comercio/senal`, idea de Lautaro): cruza la señal física de cobertura con la capacidad de pago (FAS
teórico) y la pizarra por grano.

**Decisiones con Lautaro (19/07):** gap = las DOS lecturas (foto + avance) · ritmo = "line-up parado vs
lo normal" (estacional, no acumulado) · **transbordo PY/UY fuera del ratio** (no tiene DJVE argentina,
se muestra aparte) · **avance vs Bolsa/saldo exportable DESCARTADO** (fuera BCR) · roster depurado
2025-26 (+8 empresas, −OLAM/PROMASA, Glencore→Viterra, fix acento ACA). La DJVE es **solo registros**
(sin "cumplido" — se verificó): el cruce con line-up es la única forma; el `opcion` da gratis el split
disponible/forward.

**Datos:** migración `20260719120000_create_comercio_empresas.sql` (fn `campana_ini_year` + vistas
`djve_cobertura`, `lineup_originado_campana`, `lineup_estacional`). **Verificado 1:1 vs SQL** (maíz
cobertura 0,32 / soja 0,11 / cebada 1,98; originado dedup ~27 Mt) + ports 39/39 + lint/tsc/build. Detalle:
`sesiones/2026-07-19-comercio-empresas-fase-2.md`. **Falta:** render en navegador (MCP caído en la sesión
→ validar en el Preview).

### Fase 3 — Mesa de embarque (`/comercio/embarques`)
Gap (declarado − originado) por **mes de embarque × producto** (`mesa_embarque.py`), leído en el idioma
de las posiciones A3 ("maíz JUL caliente"), con la advertencia de la decisión 4 (DJVE mayormente
disponible). Si el dato acompaña, link/cruce con la curva A3 de la web.
**Verificación**: matriz contra SQL a mano de un mes con datos.

### Fase 4 — Temperatura de mercadería (`/comercio/temperatura`)
El índice MESA (CALIENTE/FIRME/NEUTRO/PESADO/MUY PESADO): gap de cobertura + densidad de line-up +
farmer selling, cada uno a percentil estacional de 5 campañas (`mesa_calor.py` + `estacional.py`).
Requiere **reactivar `update_compras`** (MAGyP, frenado; mismo problema de IP → misma Edge Function o
fallback PC). El índice degrada solo si falta farmer selling (así lo hace LineUps_Code).
**Verificación**: recomputar 2-3 índices contra el cálculo Python con los mismos datos.

### Transversal (cierra el ítem 6 del backlog)
Actualizar `ESTADO.md` + `docs/sesiones/` por sesión, `CONTEXTO.md` al final (fuente ISA + módulos).
El informe semanal (ítem 11) consumirá estos mismos módulos — no duplicar lógica cuando llegue.

## 6. Abiertos / riesgos

1. **Referencia de la Bolsa para "avance exportado"** (Fase 2): tenemos producción BCR-GEA en
   `estimaciones_produccion`; falta confirmar con Lautaro si compara contra producción o contra un
   saldo exportable/embarques proyectados de BCR (posible fuente nueva chica). Preguntar con un
   ejemplo numérico antes de codear esa tarjeta (regla del proyecto).
2. **IP de Supabase vs ISA**: no verificable hasta deployar la Edge Function. Mitigado por el
   fallback PC (decisión 10) y porque los paneles funcionan igual con el dato que haya.
3. **DJVE forward finas** (decisión 4): el gap por mes puede ser corto-céntrico; se muestra con esa
   lectura, no como defecto.
4. **`compras` frenada** (Fase 4): sin farmer selling el índice MESA corre degradado (65%), igual que
   en LineUps_Code.
