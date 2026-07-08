# Estrategias combinadas de opciones — modelo (Excels INTAGRO)

> De `Estrategia_Combinadas_Intagro.xlsx` y `..._INTAGRO_ACG.xlsx`. Es el modelo
> para AMPLIAR la calculadora de opciones (#4), que hoy sólo hace piso-techo (collar).

## Catálogo de estrategias (hoja Parametros, col H)
Simples: Compra/Venta Futuro · Compra/Venta Put · Compra/Venta Call.
Combinadas:
- **Piso y Techo de venta / de compra** (collar) — ya implementado.
- Venta + Compra de Call · Venta + Lanzamiento de Call
- Compra + Compra de Put · Compra + Lanzamiento de Put
- Venta + Compra de Put · Venta + Lanzamiento de Put
- Compra + Compra de Call · Compra + Lanzamiento de Call
- **A fijar por otro producto** (ya implementado como #3).

## Productos y tamaño de contrato (col A/B)
Soja/Maíz/Trigo **MAT** = 100 t · Soja **CBOT** = 136 · Maíz **CBOT** = 127 ·
Trigo **CBOT** = 136 · Soja/Maíz/Trigo **Rofex** = 30 · Soja/Maíz/Trigo **CME Rofex** = 5.

## Modelo de cálculo (hoja "Datos y gráficos")
Cada estrategia se arma con PATAS, cada una es una fila de "Cotizaciones Mercado":
`TIPO (Futuro/Call/Put) · Producto · Mes · Año · Compra/Venta · Cttos · Strike ·
Prima/Precio · Tons · Valor futuro · comisiones · Tasa · IVA`.

Las patas se clasifican en 4 columnas: **Put Compra · Put Venta · Call Venta · Call Compra**
(+ Futuro Compra/Venta). El payoff a cada precio final P = suma de los payoffs de cada
pata − primas netas (calls y puts por separado) − comisiones. La hoja calcula la escala
del gráfico (máx/mín) automáticamente y grafica el resultado por precio.

Costos por pata: **comisión CBOT = 25 usd/contrato**, comisión %, IVA 21%, tasa de la opción.

## Datos de opciones reales
Las hojas **"Opciones SJ CBOT"** y **"Opc.MZ.CBOT"** traen la cadena de opciones de
soja/maíz de Chicago (strikes + primas) — sirven para precargar strikes/primas reales
cuando conectemos la fuente CBOT (skills gauss: barchart/investing).

## Próximo paso propuesto
Reescribir la calc #4 como **"estrategias combinadas"**: menú desplegable con las ~18
estrategias, patas editables (futuro + calls + puts), payoff genérico + gráfico + tabla de
escenarios. El collar actual queda como una de las opciones del menú.
