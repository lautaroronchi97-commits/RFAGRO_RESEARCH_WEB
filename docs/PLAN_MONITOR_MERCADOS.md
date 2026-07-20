# PLAN — Monitor de mercados (Chicago + macro) debajo de Arbitrajes

> **Plan cerrado el 20/07/2026 con Lautaro. SOLO orquestación — el build va en una sesión aparte.**
> Pedido original: "un monitor donde lo que destaque sea lo vinculado al agro… los otros son más
> informativos", debajo de la tabla de arbitrajes, actualización 1 min si se puede (sino 5, sino 15),
> agro normalizado a tn, **sin guardar nada** (solo vista, como el feed A3 por WebSocket).

## 1. Qué es

Un panel nuevo en **`/granos`**, entre `<ArbitrajesTable/>` y `<MejorCajaPanel/>`, con dos bloques:

| Bloque | Instrumentos | Protagonismo |
|---|---|---|
| **Agro (destacado)** | Soja · Aceite de soja · Harina de soja · Maíz · Trigo (Chicago, posición continua) | Filas grandes, **USD/tn** como unidad principal |
| **Macro (informativo)** | Petróleo WTI · Oro · Plata · DXY · USD/BRL · SPY | Filas compactas, unidad propia de cada uno |

Por instrumento: **último precio · Δ del día ($ y %, semáforo verde/rojo) · posición del contrato**
(ej. "NOV26") · para los agro, la unidad original de Chicago como dato secundario (¢/bu, USD/st, ¢/lb).

## 2. Decisiones cerradas (20/07/2026)

| # | Decisión | Qué se decidió |
|---|---|---|
| 1 | Posiciones agro | **Solo la posición continua (front)** por producto — 1 fila, monitor compacto. (Consultado: se descartó la mini-curva de 3 posiciones.) |
| 2 | Visibilidad | **Sección "granos"** — misma que la tabla de arbitrajes de arriba (pública hoy; con el login prendido la ve quien tenga la sección). Se descartó gatearlo solo-mesa: es data informativa de mercado, no análisis propietario. |
| 3 | Petróleo | **WTI** (`CL=F`, NYMEX) — la referencia continua estándar. Brent descartado (se puede sumar después si lo pide). |
| 4 | Persistencia | **NADA se guarda** (pedido explícito): view-only como `a3-live.ts`. Sin tabla Supabase, sin cron, sin backfill. |
| 5 | Normalización | Los 5 agro en **USD/tn** (pedido explícito), con la unidad original de Chicago visible como secundaria — así la mesa lee el número "en idioma Chicago" cuando lo necesita. |
| 6 | Referencia del Δ | Δ del día vs **cierre anterior** (`previousClose` de la fuente) — mismo criterio que cualquier pizarra. |
| 7 | Sello de fuente | Regla del repo "institución sí, puente no": el sello nombra **CBOT · NYMEX · COMEX · ICE** (+ FX para USD/BRL), NUNCA el proveedor técnico. Y es honesto con el atraso: **"demorado ~15 min"** (stamps honestos, auditoría 07/07). |
| 8 | Trigo | Chicago **SRW** (`ZW=F`), la referencia que ya usa el repo en `cbot_cierres`. Kansas HRW queda afuera. |

## 3. Fuente (elegida de los skills de gauss, verificada con request real 20/07/2026)

Del catálogo [gauss314/skills](https://github.com/gauss314/skills) se evaluaron los 3 candidatos que
ya anticipaba `CONTEXTO.md`:

| Skill | Veredicto | Por qué |
|---|---|---|
| **`yahoo-finance`** | ✅ **ELEGIDA** | Un solo endpoint batch trae los 11 instrumentos, sin auth ni cookie. Verificada (abajo). |
| `barchart` | 🟡 Fallback | Ya dominada en el repo (`ingest-cbot.mjs`, cookie `XSRF-TOKEN`), pero es 1 request por símbolo + manejo de cookie → más frágil para un fetch cada 30 s. Queda como plan B documentado. |
| `investing` | ❌ Descartada | Requiere `curl_cffi` (bypass de Cloudflare) → no corre en el runtime Node de Vercel. |

**Endpoint verificado** (request real desde el sandbox, 20/07/2026):

```
GET https://query1.finance.yahoo.com/v7/finance/spark
    ?symbols=ZS=F,ZL=F,ZM=F,ZC=F,ZW=F,CL=F,GC=F,SI=F,DX-Y.NYB,BRL=X,SPY
    &range=1d&interval=15m
User-Agent: Mozilla/5.0            ← obligatorio (sin UA devuelve 429/403)
```

- **1 request → los 11 instrumentos**, HTTP 200, sin auth/crumb/cookie.
- De cada uno sirve el `meta`: `regularMarketPrice`, `previousClose`, `shortName` (trae la posición:
  "Soybean Futures,**Nov-2026**"), `currency` (`USX` = centavos), `regularMarketTime`.
- **Delay medido: ~12,5 min** (`regularMarketTime` vs reloj) — es el feed demorado del exchange,
  igual en toda fuente gratis (Barchart/Investing: 10-20 min). No hay CME tiempo real gratis → el
  sello dice "demorado" y listo.
- También existe `GET /v8/finance/chart/{symbol}` (verificado 200) — misma data de a un símbolo,
  útil como retry puntual.

**Valores de la verificación** (sirven de fixture de referencia para el build):

| Símbolo | Instrumento | Último (unidad origen) | × factor | USD/tn |
|---|---|---|---|---|
| `ZS=F` | Soja NOV26 | 1.223,00 ¢/bu | 0,3674371 | **449,4** |
| `ZL=F` | Aceite de soja DIC26 | 72,06 ¢/lb | 22,046226 | **1.588,7** |
| `ZM=F` | Harina de soja DIC26 | 323,00 USD/st | 1,1023113 | **356,0** |
| `ZC=F` | Maíz DIC26 | 473,25 ¢/bu | 0,3936826 | **186,3** |
| `ZW=F` | Trigo SRW SEP26 | 678,25 ¢/bu | 0,3674371 | **249,2** |
| `CL=F` | WTI SEP26 | 81,68 USD/bbl | — | — |
| `GC=F` | Oro AGO26 | 4.007,70 USD/oz | — | — |
| `SI=F` | Plata SEP26 | 56,995 USD/oz | — | — |
| `DX-Y.NYB` | DXY | 100,918 (índice) | — | — |
| `BRL=X` | USD/BRL | 5,0861 BRL | — | — |
| `SPY` | SPY | 745,08 USD | — | — |

**Factores de conversión a USD/tn** (los de soja/maíz/trigo son LOS MISMOS que ya usa el repo en
`ingest-cbot.mjs` / `docs/PLANILLA_DIARIA.md` — no inventar nuevos):
- Soja y trigo: ¢/bu × **0,3674371**
- Maíz: ¢/bu × **0,3936826**
- Harina de soja: USD/short ton × **1,1023113** (1 tn = 1,1023113 st)
- Aceite de soja: ¢/lb × **22,046226** (2.204,6226 lb por tn ÷ 100 ¢)

## 4. Cadencia — evaluación pedida ("1 min si se puede, sino 5, sino 15")

**✅ 1 minuto alcanzado SIN infraestructura nueva.** El monitor se monta sobre lo que ya existe:

- `/granos` ya regenera por **ISR cada 30 s** (`revalidate = 30`, puesto para la 1ª columna de
  Arbitrajes) y el cliente ya **pollea cada 30 s** con rueda abierta (`refresh-on-focus.tsx`).
- El fetch del monitor va **dentro de esa regeneración** (server-side, `React.cache()` dedup +
  `next: { revalidate: 30 }`) → frescura efectiva ~30-60 s, mejor que el objetivo de 1 min.
- Carga sobre la fuente: **máx ~120 requests/hora** (1 batch por regeneración, solo si hay visitas).
  Trivial — no hay riesgo de rate-limit.
- **Matiz conocido**: el poll del cliente corre en horario de rueda LOCAL (Matba 10:30–17:00);
  Chicago/macro operan casi 24 h. Fuera de la rueda local el dato se refresca igual con cada
  visita/focus de pestaña (y el delay de ~15 min de la fuente hace irrelevante afinar más). **v1
  sale así**; si la mesa quiere el poll también en horario CBOT nocturno, es un cambio chico en
  `refresh-on-focus.tsx` que se decide después de usarlo.

## 5. Arquitectura (para la sesión de build — acá NO va código)

Patrón calcado de `a3-live.ts` / `market.ts` (view-only, degrada solo):

1. **`src/lib/monitor-mercados.ts`** — fetch del batch `spark` con `React.cache()` +
   `revalidate: 30`, User-Agent fijo, `Result` tipado. Mapea cada símbolo a
   `{ grupo: "agro"|"macro", nombre, posicion, ultimo, cierreAnterior, delta, deltaPct, unidadOrigen,
   usdTn? , horaDato }`. La posición sale del `shortName` ("Nov-2026" → "NOV26"). Si la fuente
   falla o falta un símbolo → ese instrumento va `null` y el panel degrada (guard, sin romper la página).
2. **`src/components/monitor-mercados.tsx`** — server component. Bloque agro destacado (USD/tn
   grande + unidad Chicago secundaria + Δ con semáforo) arriba; bloque macro compacto abajo.
   `SourceStamp` con "CBOT · NYMEX · COMEX · ICE — demorado ~15 min" + hora del dato. Sin estado
   cliente: hereda el refresh de la página.
3. **Integración**: en `src/app/(site)/granos/page.tsx`, entre `<ArbitrajesTable/>` y
   `<MejorCajaPanel/>`. Nada más se toca.
4. **Explícitamente SIN**: tabla Supabase, cron, workflow, migración, backfill, `/api` nueva.

## 6. Verificación exigida al build (mismo estándar del repo)

- Valores 1:1 contra la fuente (curl independiente vs lo que renderiza la página).
- Conversiones contra los fixtures de la tabla §3 (y contra los factores de `ingest-cbot.mjs`).
- Degradación: simular fuente caída → la página `/granos` sigue entera, el monitor muestra "—".
- Navegador real claro/oscuro + `npm run lint` + `npx tsc --noEmit` + `npm run build`.
- En el sandbox, recordar `NODE_USE_ENV_PROXY=1` para ver datos reales en dev.

## 7. Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| Endpoint no oficial (puede cambiar sin aviso) | Guard + degradación limpia; fallback documentado = `barchart` (patrón cookie ya dominado en `ingest-cbot.mjs`). |
| Delay ~10-15 min del feed | Sello honesto "demorado ~15 min" + hora del dato visible. NO venderlo como tiempo real. |
| Rate-limit / bloqueo de UA | User-Agent de navegador (verificado necesario), 1 request/30 s server-side — carga mínima. Si algún día bloquean IPs de Vercel, se re-evalúa (mismo playbook que ISA/lineup). |
| Yahoo cambia el front-month del continuo en el roll | Es el comportamiento deseado (siempre el contrato más operado); la posición visible ("NOV26") hace el roll transparente para la mesa. |

## 8. Fuera de alcance (que nadie lo sume "de paso")

- Guardar historia de estos precios (pedido explícito: solo vista). Si algún día se quiere historia
  intradiaria, eso es la Fase 2 del feed A3 (tabla `snapshots`) — otra discusión.
- Alertas, gráficos, más símbolos (Brent, Merval, EWZ…), Kansas wheat: post-v1 si Lautaro los pide.
- El **reporte diario/semanal** (ítem 5 del backlog) NO queda cubierto por esto: el monitor es la
  vista web en vivo; el reporte sigue pendiente aparte.
