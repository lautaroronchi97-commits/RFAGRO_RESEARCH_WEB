# Estrategias con opciones — catálogo para la calculadora combinada

> Relevamiento (ROFO AGRO) del universo de estrategias de futuros/forwards + opciones,
> mapeado al modelo de **patas** del Excel INTAGRO (ver `docs/ESTRATEGIAS_COMBINADAS.md`).
> Objetivo: dejar todas **preseteadas** en la calc #4 (menú), con patas editables,
> tabla de escenarios y gráfico de payoff. Fuentes: AnalystPrep/FRM, CME Group
> "Self-Study Guide to Hedging with Grain and Oilseed Futures and Options",
> agoptimus (grain hedging), Macroption.

## Modelo de patas (leg)

Cada estrategia es un conjunto de **patas**. Una pata =
`{ tipo: FUT | CALL | PUT · lado: compra(+) | venta(−) · cttos · strike (opciones) · prima }`.

Payoff de cada pata a un **precio final P** (por tonelada):
- `FUT +`  → `P − entrada`   · `FUT −` → `entrada − P`
- `CALL +` → `max(P−K,0) − prima` · `CALL −` → `prima − max(P−K,0)`
- `PUT +`  → `max(K−P,0) − prima` · `PUT −` → `prima − max(K−P,0)`

**Resultado combinado(P) = Σ patas − comisiones.** Costos (de INTAGRO): comisión CBOT
25 USD/ctto, comisión %, IVA 21%, tasa de la opción. Tamaño de contrato por mercado
(MAT 100 t · CBOT soja 136 / maíz 127 / trigo 136 · Rofex 30 · CME Rofex 5).

Notación de strikes relativa al ATM (K): `K−` = OTM abajo, `K+` = OTM arriba, `K−−`/`K++` = más lejos.

## Catálogo

### 1. Básicas (1 pata)
| Estrategia | View | Patas |
|---|---|---|
| Compra de futuro | Alcista | FUT + |
| Venta de futuro | Bajista | FUT − |
| Compra de call | Alcista (riesgo limitado) | CALL + (K) |
| Lanzamiento de call | Bajista / ingreso prima | CALL − (K) |
| Compra de put | Bajista (riesgo limitado) | PUT + (K) |
| Lanzamiento de put | Alcista / ingreso prima | PUT − (K) |

### 2. Cobertura física (futuro/físico + opción) — las del productor/mesa
| Estrategia | View | Patas |
|---|---|---|
| **Call cubierto** (covered call) | Neutral/alcista suave, ingreso | FUT + · CALL − (K+) |
| **Put protector** (protective put) | Alcista con piso | FUT + · PUT + (K−) |
| **Collar / piso y techo** ✅ ya | Rango (piso y techo) | FUT + · PUT + (K−) · CALL − (K+) |
| **Fence** (put spread sobre futuro) | Protección más barata | FUT + · PUT + (K−) · PUT − (K−−) |

### 3. Direccionales sin futuro (túnel / sintéticos)
| Estrategia | View | Patas |
|---|---|---|
| Túnel alcista (risk reversal) | Alcista financiado | CALL + (K+) · PUT − (K−) |
| Túnel bajista | Bajista financiado | PUT + (K−) · CALL − (K+) |
| Futuro sintético largo | = comprar futuro | CALL + (K) · PUT − (K) |
| Futuro sintético corto | = vender futuro | CALL − (K) · PUT + (K) |

### 4. Verticales (spreads de precio, mismo vto)
| Estrategia | View | Patas |
|---|---|---|
| Bull call spread | Alcista moderado | CALL + (K) · CALL − (K+) |
| Bear call spread | Bajista moderado | CALL − (K) · CALL + (K+) |
| Bull put spread | Alcista moderado (crédito) | PUT − (K) · PUT + (K−) |
| Bear put spread | Bajista moderado | PUT + (K) · PUT − (K−) |

### 5. Volatilidad (mismo vto)
| Estrategia | View | Patas |
|---|---|---|
| Straddle comprado | Mucho movimiento | CALL + (K) · PUT + (K) |
| Straddle vendido | Poco movimiento | CALL − (K) · PUT − (K) |
| Strangle comprado | Mucho movimiento (más barato) | CALL + (K+) · PUT + (K−) |
| Strangle vendido | Poco movimiento | CALL − (K+) · PUT − (K−) |

### 6. Mariposas y cóndores (3–4 strikes)
| Estrategia | View | Patas |
|---|---|---|
| Mariposa comprada (butterfly) | Precio clava en K | CALL + (K−) · CALL −×2 (K) · CALL + (K+) |
| Mariposa vendida | Sale del rango | inverso de la anterior |
| Cóndor (call) | Rango amplio | CALL + (K−−) · CALL − (K−) · CALL − (K+) · CALL + (K++) |
| Iron condor | Rango (crédito) | PUT + (K−−) · PUT − (K−) · CALL − (K+) · CALL + (K++) |
| Iron butterfly | Clava en K (crédito) | PUT + (K−) · PUT − (K) · CALL − (K) · CALL + (K+) |

### 7. Ratios
| Estrategia | View | Patas |
|---|---|---|
| Ratio call spread | Alcista suave con techo | CALL + (K) · CALL −×2 (K+) |
| Ratio put spread | Bajista suave | PUT + (K) · PUT −×2 (K−) |
| Call backspread | Alcista fuerte | CALL − (K) · CALL +×2 (K+) |
| Put backspread | Bajista fuerte | PUT − (K) · PUT +×2 (K−) |

### 8. Calendarios (distintos vencimientos)
| Estrategia | View | Patas |
|---|---|---|
| Calendar spread | Theta / vol térmica | opción − (vto cercano) · opción + (vto lejano), mismo K |
| Diagonal | Direccional + theta | como calendar con distinto K |

> Los calendarios cruzan **dos vencimientos** → el payoff a vto de la cercana requiere
> valuar la lejana (Black-76). En una v1 se puede aproximar o marcar como avanzada.

### 9. Agro-específicas (INTAGRO / negocio)
| Estrategia | Nota |
|---|---|
| **A fijar por otro producto** ✅ ya (calc #3) | Arbitraje entre productos (ej. 114% maíz julio). |
| 2x1 | Ratio (una compra, dos ventas) — mencionado en la planilla diaria. |
| Acumulador (accumulator) | Exótica, **path-dependent con knock-out**: NO es payoff simple a vto → fuera del MVP; se documenta como avanzada. |

## Diseño de la calculadora (propuesta)

1. **Menú de estrategias** (las de arriba) → precarga las patas con strikes relativos al ATM.
2. **Patas editables**: agregar/quitar; por pata `tipo · lado · cttos · strike · prima`. + precio de entrada del futuro + producto/mercado (tamaño de contrato).
3. **Tabla de escenarios**: resultado a cada precio final en un rango (ej. ATM ±20%).
4. **Gráfico de payoff**: línea del resultado combinado vs precio final (SVG a mano), con línea de cero y **breakevens** marcados; verde arriba de cero, rojo abajo.
5. **Costos** (opcional v1): comisión/ctto, comisión %, IVA, tasa.

**Plan de build por etapas:** (a) motor de patas + payoff + gráfico con patas manuales; (b) menú de presets; (c) costos e IVA; (d) precarga de primas/strikes reales cuando se conecte la cadena de opciones (CBOT vía gauss / A3). El collar actual queda como un preset del menú.
