# Sesión 2026-07-20 — Plan Monitor de Mercados (Chicago + macro)

- **Rama:** `claude/todo-implementation-7nockf` · **PR:** #_ (base `main`)
- **Objetivo pedido por Lautaro:** SOLO orquestación (sin código) de un monitor de mercados debajo
  de la tabla de Arbitrajes: Chicago destacado (soja, aceite, harina, maíz, trigo en USD/tn) + bloque
  macro informativo (WTI, oro, plata, DXY, USD/BRL, SPY). Refresh 1 min si la infra lo permite.
  View-only, sin guardar nada. Usar los skills de gauss como catálogo de fuentes.

## Hecho
- **[`PLAN_MONITOR_MERCADOS.md`](../PLAN_MONITOR_MERCADOS.md)** — plan completo: decisiones,
  fuente verificada con request real, símbolos + factores de conversión a USD/tn (fixtures),
  evaluación de cadencia, arquitectura view-only para el build, verificación exigida, riesgos,
  fuera de alcance.
- Antes, en esta misma sesión (PR #41, ya mergeado): repaso de la nota vieja de pendientes de
  Lautaro contra el backlog de `ESTADO.md` (+ ítem 21 nuevo: resumen/interpretación de informes).

## Decisiones tomadas (y por qué)
- **Fuente = Yahoo Finance (skill `yahoo-finance` de gauss)** — único candidato con endpoint batch
  (1 request → los 11 instrumentos) sin auth. `barchart` queda de fallback (cookie, de a 1 símbolo);
  `investing` descartada (necesita `curl_cffi`, no corre en Vercel).
- **Solo posición continua (front) por producto agro** — consultado a Lautaro; descartó la mini-curva.
- **Visibilidad = sección "granos"** (la misma de la página) — consultado; descartó solo-mesa.
- **Petróleo = WTI** (`CL=F`) — consultado; descartó Brent y "ambos".
- **Cadencia: se cumple el objetivo de 1 min sin infra nueva** — el fetch va dentro del ISR de 30 s
  que `/granos` ya tiene para Arbitrajes + poll cliente existente. Sin cron, sin tabla, sin storage.
- Sello "institución sí, puente no": CBOT · NYMEX · COMEX · ICE + "demorado ~15 min" (stamp honesto).

## Verificado
- **Request real al endpoint batch** (`/v7/finance/spark`, 20/07): HTTP 200, los 11 símbolos con
  `regularMarketPrice`/`previousClose`/`shortName`/`currency`. Necesita User-Agent de navegador.
- **Delay medido con mercado abierto** (pedido de Lautaro: ¿alguna fuente de gauss con menos delay?):
  Yahoo = futuros + DXY **10 min exactos**, **SPY y USD/BRL en tiempo real (0 min)**. Barchart medido
  con el flow de cookie del repo = **10,0–10,1 min** (igual). Investing = 403 Cloudflare. Resto del
  catálogo barrido: nadie baja los 10 min (piso de licencia CME/ICE para feeds gratis) — tabla
  completa en el plan §3.b.
- Conversiones a USD/tn recalculadas con los factores que ya usa el repo (`ingest-cbot.mjs`):
  soja 1.223 ¢/bu → 449,4 · maíz 473,25 → 186,3 · trigo 678,25 → 249,2 · harina 323 USD/st → 356,0 ·
  aceite 72,06 ¢/lb → 1.588,7. Quedaron como fixtures en el plan §3.
- Sin código nuevo → no aplica lint/tsc/build (solo docs).

## Quedó pendiente / en vuelo
- **La sesión de build** (siguiente): `src/lib/monitor-mercados.ts` + `src/components/monitor-mercados.tsx`
  + integración en `/granos` entre `<ArbitrajesTable/>` y `<MejorCajaPanel/>`. Todo especificado en
  el plan §5-§6.
- Post-v1 (solo si Lautaro lo pide): poll del cliente también en horario CBOT nocturno · Brent ·
  más símbolos.

## Trampas descubiertas (para la próxima sesión)
- El endpoint `spark` de Yahoo **devuelve 429/403 sin User-Agent** de navegador — ponerlo siempre.
- **Medir el delay en sesión nocturna engaña**: `regularMarketTime`/`tradeTime` es el ÚLTIMO TRADE,
  no el atraso del feed — con rueda finita dio "12,5 min"; con mercado abierto son 10 min clavados.
- El `/quotes/get` de Barchart (a diferencia del `/historical/get` que usa `ingest-cbot.mjs`)
  devuelve **401 sin el header `referer`** del overview — con referer + cookie XSRF da 200.
- `currency: "USX"` = **centavos** (¢/bu o ¢/lb según el producto); harina viene en USD/short ton.
- El `shortName` trae la posición del contrato ("Soybean Futures,Nov-2026") → de ahí sale el "NOV26"
  visible; no parsear el símbolo.
- La ruta raw de los skills de gauss no es `main/<skill>/SKILL.md` a ciegas — navegar el repo para
  citar; lo que importa (endpoints) quedó verificado con requests propios.
