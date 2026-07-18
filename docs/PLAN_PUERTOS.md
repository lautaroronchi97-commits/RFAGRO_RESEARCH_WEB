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
  los 8 scripts del repo). Programada 10:00 y 22:00 ART (cron de Supabase). Backfill del hueco por
  invocación manual con rango de fechas.
- **Observabilidad**: sumar `lineup` al `healthcheck-frescura.mjs` (alerta si el último snapshot tiene
  más de 2 días hábiles). Así el falso verde de junio/julio no puede repetirse en silencio.

## 5. Fases (cada una = un PR, verificable por separado)

### Fase 0 — Dato vivo (scraper + backfill + healthcheck)
Edge Function `ingest-lineup` + schedule 10/22 ART + backfill 07/07→hoy + healthcheck.
**Verificación**: correr la función real contra ISA (¿la IP de Supabase pasa?); si pasa, snapshot de
hoy en la tabla y hueco rellenado (conteo por `fecha_consulta` sin agujeros hábiles). Si NO pasa,
documentar y activar el fallback PC de Lautaro; las fases siguientes no dependen de esta.
**Nota**: la tabla `compras` (farmer selling, frenada 16/06) NO se toca acá; se reactiva en la Fase 4
que es quien la consume.

### Fase 1 — Foto operativa + tape de cambios (`/comercio/puertos`)
La pantalla de pre-apertura: KPIs del último line-up (ton y buques por producto de los de la decisión 8,
por zona Up River N/S y Bahía) + **qué cambió vs el snapshot anterior** (buques nuevos, tonelaje que
apareció/desapareció por producto — lógica de `mesa_diff.py`) + tabla de buques filtrable (buque ·
muelle · zona · producto · ton · destino · **empresa** · ETB) con export CSV.
**Verificación**: contra los números del snapshot real (06/07: maíz 3,58 Mt/129 buques, SBM 1,30 Mt,
etc., validados por SQL) + navegador claro/oscuro.

### Fase 2 — Panel de empresas (`/comercio/empresas`)
El pedido central. Por empresa (normalizada, solo operativas actualmente): buques próximos y ton por
producto · **gap de cobertura** (declarado DJVE − originado line-up, `cobertura.py`) · ritmo vs su
propia historia (misma ventana de años previos) · share por producto/zona. Más los dos análisis nuevos:
- **Avance exportado vs previsión de la Bolsa**: acumulado embarcado de la campaña por producto vs la
  estimación BCR que ya tenemos en `estimaciones_produccion`. ⚠️ ABIERTO §6.1: qué número exacto de la
  Bolsa usa Lautaro de referencia (producción vs saldo exportable).
- **Atribución de campaña**: separar DJVE y buques de cosecha nueva vs vieja (lógica `campanas.py`
  por producto + ventana de embarque; la tabla `djve` de esta base no trae campaña → se deriva).
**Verificación**: gap por empresa contra SQL a mano; los casos de mapeo DJVE↔shipper de `cobertura.py`.

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
