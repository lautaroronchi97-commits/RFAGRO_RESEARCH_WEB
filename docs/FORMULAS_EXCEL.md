# Fórmulas del Excel "REAL TIME v2.5" (Lautaro) — referencia para las calculadoras

> Extraídas del Excel real de arbitrajes (9 pestañas, feed Reuters). Son la fuente
> de verdad de las fórmulas de la mesa. En la web, el feed `[1]!lst?SÍMBOLO` se
> reemplaza por los cierres del CEM (tabla `futuros_cierres`) + precios en vivo.

## Tipo de cambio (hoja ARBITRAJES, r37)
- `TC oficial   = DLR spot` (feed `lst?DLR/SPOT`)
- `TC BNA       = DLR spot − 9`
- `precio del día (ARS) = pizarra_USD × TC BNA`

## Arbitrajes disponible ↔ futuro (hoja ARBITRAJES) — CALCULADORA CENTRAL
Por producto: se fija una **pizarra USD** (disponible) y por cada posición:
- `tasa directa = precio_futuro / pizarra_USD − 1`
- `TNA USD      = INTRATE(hoy, vto, pizarra_USD, precio_futuro, base act/365)`
              `= (precio_futuro / pizarra_USD − 1) × 365 / días`,  días = vto − hoy
- `spread      = precio_futuro − pizarra_USD`
- Tasas de puntas: `INTRATE(...)` con punta compradora (bpr) y vendedora (opr).
- `var ajuste  = ajuste_hoy − ajuste_previo`

Lectura (del contexto): **TNA USD alta/positiva → comprar spot + vender diferido**
(capturar tasa); **negativa → vender spot + recomprar futuros**. Solo se ejecuta si
hay oferta del productor y exportador tomando a fijar (riesgo de base).

## Pases entre posiciones (hoja PASES DE GRANOS)
- Pase directo del feed: `bpr/lst/opr?SÍMBOLO/POS1/POS2` (ej. `MAI.ROS/MAR26/ABR26`).
- Pase armado por patas: `= punta_pos_larga − punta_pos_corta` (N − L de ARBITRAJES).
- Segunda tabla: `tasa directa del pase` y `diferencial vs pizarra`.

## Disponible con pago diferido (hoja CALCULADORA SINTETICOS Y DIF, r12-22)
Confirma la calculadora ya implementada (`src/lib/diferido.ts`):
- `fecha_pago_estándar = WORKDAY(hoy, 5, feriados)`  (5 días hábiles)
- `precio_diferido = base × (1 + tasa × (fecha_simulada − fecha_pago_estándar)/365)`
  - interés simple, base 365, días = **solo el excedente** sobre los 5 hábiles.
  - En el Excel la tasa es `(caución 1 día − aforo TNA)`; en la web es configurable.

## Negocios con pago / a fijar (misma hoja, r27-36) — PRÓXIMA CALCULADORA
- `meses_al_vto = (fecha_fin_entrega − hoy) / 30`
- `precio_USD   = precio_base × (1 − tasa_descuento × meses_al_vto)`  (descuento simple)
- `precio_con_pago (ARS) = ROUNDDOWN(precio_USD × TC_del_día, 0)`
- `tasa directa = precio_base / precio_USD − 1`
- `TNA USD      = INTRATE(hoy, fecha_fin, precio_USD, precio_base)`

## Sintético de dólar (hojas DOLAR SINTETICO / SINTETICO DE SOJA)
- `TC en base a TEM LECAPS` por posición; `sintético = LECAP + dólar futuro`.
- Ejecución: lotes, contratos de dólar futuro a comprar, "letras finish a cubrir".
- (Pendiente de detallar cuando se implemente la calculadora de sintéticos.)

## Nota de implementación
`INTRATE(liq, venc, inversión, rescate, base=3)` (Excel) con base 3 = actual/365:
`= (rescate/inversión − 1) × 365 / (venc − liq)`.
