# Sesión 2026-07-11 — Calculadora negocios de planta

- **Rama:** `claude/plant-business-calculator-0sf28m` · **PR:** #_ (base `main`)
- **Objetivo pedido por Lautaro:** calculadora que arranque de un precio y vaya descontando rubros
  hasta el precio final, mostrando también el total de gastos en USD.

## Hecho
- **`src/components/calc-planta.tsx`** (nueva, client): calculadora "Negocios de planta". Arranca de un
  precio y resta, en orden, seis rubros editables. Aritmética 100% local (no toca datos de mercado):
  - **Precio de arranque:** selector de producto (pizarra CAC: soja/maíz/trigo) que autocompleta el USD,
    + input editable (botón ↺ para volver al valor de pizarra). Si CAC no responde, queda el input a mano.
  - **1) Contra flete** (USD) · se resta tal cual.
  - **2) Secada** = `puntos × valor por punto`. Dos modos (select `.calc-mode`): **Fijo** (5 USD/punto,
    solo se editan los puntos) o **No fijo** (habilita el input "USD por punto"). El desglose muestra
    "N puntos × X USD = Y USD".
  - **3) Merma volátil** (%, default 0,3) → `arranque × %/100`, SIEMPRE sobre el precio de arranque.
  - **4) Paritaria** (USD, default 4,5) · **5) Embolsado** (USD) · **6) Otros** (USD + concepto libre).
  - Salida: **Precio final (USD)** grande = arranque − suma de gastos, + **Total de gastos** con el
    desglose rubro por rubro.
- **`src/app/page.tsx`**: `getPizarra()` en el server → arma `pizarraProd` (SOJ/MAI/TRI con nombre y USD)
  y lo pasa a `<CalcPlanta pizarra={...} />`, ubicada en la sección **Calculadoras** (arriba de "Negocios
  con pagos").

## Decisiones tomadas (y por qué)
- **Merma sobre el precio de arranque** (no sobre el neto) — confirmado por Lautaro.
- **Secada valor del punto: fijo 5 USD por defecto + toggle "no fijo"** para editarlo — pedido de Lautaro.
- **Arranque = pizarra CAC (soja/maíz/trigo) en vivo, precio editable** (opción A) — girasol/sorgo quedan
  para más adelante vía `pizarra_historico` si hiciera falta. Como el precio es editable, la base siempre
  se puede pisar a mano.
- Se reutilizan clases existentes (`.calc`, `.calc-grid`, `.calc-mode`, `.calc-out`, `.pz-reset`,
  `.curva-pick`) — cero CSS nuevo, cero fórmulas de mercado nuevas.

## Verificado
- `npm run lint` + `npx tsc --noEmit` + `npm run build`: OK.
- Dev server (`NODE_USE_ENV_PROXY=1`): la página renderiza el panel con todos los rubros; el selector de
  pizarra trae dato real de CAC y autocompleta el precio de arranque (soja ≈ 324,01 USD).
- Aritmética chequeada aparte con dos casos (modo fijo y no fijo): precio final y total de gastos dan exacto.

## Quedó pendiente / en vuelo
- Girasol y sorgo en el selector de arranque (requeriría leer el último cierre de `pizarra_historico`).
- Otros rubros de planta si aparecen (zarandeo, descarga, etc.): hoy se cubren con el rubro abierto "Otros".

## Trampas descubiertas (para la próxima sesión)
- En el sandbox, CAC (`getPizarra`) puede responder parcial (a veces 1 de 3 granos). En Vercel llegan los 3.
  La calculadora degrada sola: sin pizarra, oculta el selector y deja el precio a mano.
