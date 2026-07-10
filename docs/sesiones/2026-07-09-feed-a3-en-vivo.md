# Sesión 2026-07-09 — Feed A3 en vivo (pases + arbitrajes)

- **Rama:** `claude/feed-a3-live-plan-obxzcz` · **PR:** #11 (base `main`)
- **Objetivo pedido por Lautaro:** Feed A3 en vivo — cotización/volumen/bid-ask de pases (con la
  idea original de "cron 60s en horario de rueda") + comprador/vendedor en arbitrajes.

## Hecho
- **`src/lib/a3-live.ts`** (nuevo, `server-only`): despierta el cliente A3 que estaba dormido
  (`src/lib/a3.ts`). Expone `getPasesLive()` / `getFuturosLive()` (ambas `cache()`) que devuelven
  `Map<símbolo, Puntas>` (bid/bidSize/ask/askSize/last/vol) + `mergeLiveMeta()`. Pide market data con
  worker-pool (concurrencia 6) y **deadline global 10s** para que la regeneración ISR no cuelgue.
  Parsing **tolerante** (BI/OF como array/objeto/número, TV como número/`{size}`/`{price}`) porque la
  API de A3 no está tipada de forma confiable.
- **Panel Pases** (`pases-panel.tsx`): 4 columnas nuevas **Comprador / Vendedor / Último / Vol** desde el
  instrumento de pase real `GRANO.ROS/POS1/POS2` (zip por `spreadSymbol`). Las columnas de cierre (Ajuste,
  Tasa directa, TNA, Días, Últ. op.) **no cambian**.
- **Panel Arbitrajes** (`arbitrajes-table.tsx` + `arbitrajes-editable.tsx`): 2 columnas display-only
  **Comprador / Vendedor** del futuro outright. No entran al recálculo de la pizarra editable.
- **`src/lib/rueda.ts`** (nuevo): horarios de rueda compartidos (extraídos de `rueda-status.tsx`) +
  `ruedaAgroAbierta()`, usado por el sello para no marcar PARCIAL fuera de rueda.
- **`src/lib/a3.ts`**: fix — invalida el token cacheado ante 401/403 (un token revocado a mitad de rueda
  envenenaba el caché de 23h de la lambda).
- **Enhebrado de símbolos** (aditivo, sin tocar fórmulas): `spreadSymbol` en `PaseSpread`, `symbol` en `ArbRow`.

## Decisiones tomadas (y por qué)
- **Arquitectura web-directa, no cron** — la web ya regenera cada 60s (`page.tsx` `revalidate = 60`) +
  refresh al volver a la pestaña; el cliente A3 ya estaba escrito. Conectarlo da frescura real ~60s sin
  infra nueva ni costo. Un cron externo de 60s **no existe gratis** (GitHub Actions = mín. 5 min con
  demoras de 5–15 min en horario de rueda; Vercel Hobby = crons 1×/día). El histórico intradiario queda
  para la Fase 2 (tabla `snapshots` de INFRAESTRUCTURA.md). Confirmado con Lautaro.
- **Fuera de rueda = último dato del día**: se muestra lo que devuelva A3 con la hora real en el sello;
  las puntas quedan "—" con el libro cerrado (como su Excel al cierre). Sin degradar el estado.
- **Validación por Preview temporal**: las vars A3 en Vercel están scopeadas a Production; Lautaro tilda
  "Preview" solo durante la validación y lo destilda al aprobar (credenciales nunca por chat/repo).
- **Nota sobre INFRAESTRUCTURA.md** ("A3 lo llama SOLO el cron / WebSockets no"): decisión explícita de
  ir web-directa; el README/env ya preveían A3 en la web. El cron queda para el histórico (Fase 2).

## Verificado
- `npm run lint` + `npm run typecheck` + `npm run build` ✅ (lo mismo que corre el CI).
- Prerender estático sin credenciales (sandbox): ambos paneles renderizan, columnas nuevas en "—",
  sello con ⚠ "A3 en vivo sin configurar", el resto intacto. **Falta validar datos reales** en Preview
  con credenciales, en horario de rueda (puntas/último/vol contra eTrader/Excel de Lautaro).

## Quedó pendiente / en vuelo
- **Validación con datos reales en Preview** (paso de Lautaro: tildar scope Preview en las 3 vars A3).
- **Fase 2 — histórico intradiario**: cron GH Actions `*/15 13-20 * * 1-5` UTC + `scripts/ingest-rueda.mjs`
  + migración `snapshots` (PK symbol+ts, RLS anon-read) + `ingest_log`. Habilita gráficos intradía.
- Autofill de la calculadora de pases con el pase en vivo. TNA sobre puntas en vivo (requiere fórmula +
  ejemplo numérico de Lautaro).

## Trampas descubiertas (para la próxima sesión)
- **El "cron de 60s" era un espejismo**: la frescura real ya la da la regeneración ISR de la página, no
  un cron. Un cron sirve para el HISTÓRICO, no para la frescura.
- **`src/lib/a3.ts` estaba completo pero era código muerto** (nadie lo importaba); ya está conectado.
- **Shape del market data de A3 no verificable sin credenciales** → parser tolerante + validación en
  Preview antes del merge. Si en producción alguna columna sale rara (p. ej. `TV`), es fix de una línea
  en `toPuntas`/`volumen` de `a3-live.ts`.
- El símbolo de pase de A3 (`GRANO.ROS/POS1/POS2`) NO existe en Supabase (los pases se calculan); se arma
  desde el símbolo real de la cercana + posición de la larga.
- **Merge/deploy:** el push directo a `main` está **bloqueado por el harness** (correcto: barrera
  "Prohibido pushear a main directo"). El merge del PR va por la **UI de GitHub** (web o celu:
  *Ready for review → Merge*) o por el MCP de GitHub cuando está conectado; NO por `git push origin HEAD:main`.
  En esta sesión el MCP de GitHub se desconectó y quedó pidiendo reauth → el merge lo hizo Lautaro desde el celu.
