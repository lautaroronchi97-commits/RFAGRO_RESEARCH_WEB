# RF AGRO — Contexto del proyecto (handoff para sesiones nuevas)

> Web de research de mercado de granos (Argentina) para la consultora **RF AGRO** (Lautaro + Mauro).
> Doble uso: panel para Lautaro (datos varias veces por día) + datos de cierre para clientes
> (productores / acopios). El tiempo real tick-a-tick lo maneja Lautaro aparte (Excel + eTrader);
> esta web es **demorado / varias veces por día**, no realtime.
>
> **Deploy:** https://rfagro-research-web.vercel.app · **Rama de trabajo:** `claude/new-session-frovqj`

## Cómo trabajar con Lautaro (reglas)
- Principiante en programación: explicá cada comando/concepto paso a paso.
- **No supongas nada**; ante dudas de negocio/dato/alcance, preguntá antes de avanzar.
- Incremental: plan → aprobación → construir → mostrar funcionando → validar. Commits frecuentes.
- **Las fórmulas financieras las define él**: antes de implementar una, confirmala con un ejemplo numérico.
- Secretos SOLO en variables de entorno, NUNCA en el repo.
- Conciso, sin relleno. Español rioplatense.

## Stack
Next.js 16 (App Router) + TypeScript · Tailwind v4 · next-themes · gráficos SVG a mano (Recharts previsto) ·
Supabase (Postgres + Auth) **aún NO conectado** · Deploy en Vercel (auto-deploy al pushear la rama).
TZ America/Argentina/Cordoba.

## Design system — "Pizarra electrónica" (aprobado; "afinar estética" pendiente)
Tokens en `src/app/globals.css`. Paleta del logo: verdes (RF `#2F6E34` / AGRO `#4E9C3A`) + trigo `#EFBF2E`;
fondo claro `#EDF2E3`. Semáforo vivo: pos `#16A34A`/`#37D982`, neg `#DC2626`/`#FF5C5C`. Dos temas:
claro (clientes) / oscuro "rueda" (trader). Fuentes Inter + JetBrains Mono (números tabulares).
Marca: **RF AGRO** (nunca "CONSULTAR"). Glifos trigo/soja/maíz, cinta tipo pizarrón.

## Fuentes de datos (Fase 0, validadas con requests reales) — todo REST
| Dato | Fuente | Endpoint / nota |
|------|--------|-----------------|
| Futuros granos + dólar (reales) | **A3 / Cocos xOMS** (Primary) | `api.cocos.xoms.com.ar`: `POST /auth/getToken` → `GET /rest/marketdata/get`, `GET /rest/instruments/bySegment` (segmentos **DDA** granos, **DDF** dólar) |
| Dólar futuro, volumen rueda, **oficial mayorista** | **MAE** | `api.marketdata.mae.com.ar` → `/api/mercado/resumen/DDF`, `/volumen-categoria/{ARS\|USD}`, `/resumen/FOR` (ticker **`UST$T`** = oficial mayorista/A3500) |
| Dólar linked, LECAPs, bonos | **data912** | `data912.com/live/arg_notes` (serie `D*`=linked, `S*`=LECAP), `/live/arg_bonds` |
| Oficial / MEP / CCL / mayorista | dolarapi + criptoya | `dolarapi.com/v1/dolares`, `criptoya.com/api/dolar` |
| Macro / reservas | BCRA v4 | `api.bcra.gob.ar/estadisticas/v4.0/monetarias` (v3 deprecada) |
| Pizarra soja/maíz/trigo | **CAC-BCR** | `www.cac.bcr.com.ar/es/precios-de-pizarra` (scrape HTML; trae `$` y `US$` + TC BNA) |

## Metodología de fórmulas (confirmada con Lautaro)
- **Referencia oficial = oficial mayorista MAE** (ticker `UST$T` de `resumen/FOR`). NO el minorista.
- **Dólar futuro** (spot = mayorista MAE, base 365): directa = Fut/Spot − 1 · TNA = directa × 365/días ·
  TEA = (Fut/Spot)^(365/días) − 1 · TEM = (1+TEA)^(1/12) − 1.
- **Dólar linked** (vs oficial MAE, base 365, misma lógica): TC implícito = Px/100 · spread of. = Oficial − TCimpl ·
  TNA/TEA/TEM con Oficial/TCimpl. Vencimiento inferido del ticker (`D` + dd + letra-mes + yy).
- **Arbitrajes granos** (a implementar al enchufar A3): tasa directa = (precio futuro / pizarra USD) − 1 ·
  TNA USD = INTRATE(hoy, vto, pizarra, precio, act/365). Pizarra USD desde CAC (+ override manual).

## Estado de módulos (`src/components/`)
| # | Módulo | Estado |
|---|--------|--------|
| 0 | Cinta | REAL (dólares). Pizarra en la cinta = ejemplo (falta usar CAC). |
| 1 | Arbitrajes | **EJEMPLO** (`src/lib/sample.ts`). Pendiente: A3 futuros DDA + pizarra CAC. |
| 2 | Pases | **EJEMPLO**. Pendiente: A3 spreads calendario DDA. |
| 3 | Dólar futuro | REAL (MAE) + TNA/TEM/TEA. |
| 4 | Dólar linked | REAL (data912) + TNA/TEM/TEA + spread oficial MAE. |
| 5 | Implícitas combinadas | REAL (futuro + linked); granos = ejemplo. |
| 6 | Sintéticos/LECAPs | PARCIAL: precios LECAP reales; TIR/sintético pendiente ("pago final por letra"). |
| 7 | Panel cambiario | REAL (volumen MAE). Compras netas BCRA = pendiente (sin API; proxy / vía X). |

## Secretos / entorno
- **A3** en variables de entorno (Vercel → Settings → Environment Variables): `A3_API_BASE=https://api.cocos.xoms.com.ar`,
  `A3_USERNAME`, `A3_PASSWORD`. Local: `.env.local` (git lo ignora; plantilla en `.env.local.example`).
  `src/lib/a3.ts` las lee de env. **Nunca** en el repo.
- **Red del entorno web (sandbox):** allowlist con los hosts de datos. Si una fuente da 403 del proxy, falta el host.
- **Sandbox tip:** el `fetch` de Node no usa el proxy → para ver datos reales corriendo local en el sandbox,
  usar `NODE_USE_ENV_PROXY=1 npm run dev` (o build). En Vercel no hace falta.

## A3 — verificado OK
Token válido, 349 instrumentos DDA (granos) + 69 DDF (dólar), market data real llegando. Formatos de símbolo:
futuros `SOJ.ROS/JUL26`, pases `MAI.ROS/SEP26/DIC26`, dólar `DLR/JUL26`; opciones traen strike+`C/P` (excluir),
disponible = `/DISPO`. **Límites:** no hay cap diario documentado; A3 recomienda WebSocket para MD en vivo;
el caché de Next ya acota las llamadas (una regeneración por ventana, no por usuario). Todo hoy es **REST**.

## Pendientes (orden sugerido para retomar)
1. **Bajar** el endpoint de prueba `src/app/api/a3-check/route.ts` si sigue (ya se removió el 06/07).
2. **Enchufar Arbitrajes + Pases a A3 real** (segmento DDA) + **pizarra CAC** (scrape) con override manual.
3. **Cron (Vercel) + Supabase**: snapshots → histórico + acotar llamadas A3 + guardar el override manual de pizarra.
4. **Sintéticos**: pedir a Lautaro la tabla de "pago final por letra" → TIR + sintético (LECAP + dólar fut vs futuro directo).
5. Pizarra en la cinta desde CAC (hoy ejemplo).
6. Vista productor (tarjetas vendé/esperá), PWA instalable, calculadora US$/tn → camión/hectárea.
7. Pasada de "afinar estética".
8. Compras netas BCRA (vía X / carga manual) para el módulo 7.

## Comandos
- `npm run dev` (real en sandbox: `NODE_USE_ENV_PROXY=1 npm run dev`) · `npm run build` · push a la rama → deploy.
