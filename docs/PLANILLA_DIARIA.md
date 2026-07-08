# Planilla diaria de la mesa — modelos aprendidos (referencia futura)

> De `Planilla_diaria.xls` (herramienta de cálculo diario, ~2019). Modelos para
> futuras calculadoras/paneles. La hoja "Clientes" (emails/teléfonos reales) NO
> se documenta ni se sube: datos personales → van en base con login, nunca en repo.

## Hojas y modelos

- **Soja Mercado $**: disponible en pesos por mes con pago diferido (precio con
  pago / hoy / cobro, días desde negocio y desde el pago), TC Itaú / Nación
  comprador / BCRA A3500 / MAE. → ya reproducido en la calculadora de pago diferido.

- **Tasas implícitas**: matriz de dólar futuro por posición (DLR mm/aaaa): TC A3500,
  tasa **compuesta** y **simple**, tasa **entre meses**, días entre vencimientos y
  diferencia entre posiciones. → base para un panel de tasas implícitas más completo.

- **U$S x TT** (conversión Chicago → USD/tonelada) — CLAVE para el arbitraje CBOT:
  - Maíz: factor ≈ **0,3937** (1 tn ≈ 39,37 bushels).
  - Soja / trigo: factor ≈ **0,3674** (1 tn ≈ 36,74 bushels).
  - `USD/tn = precio_¢bushel × factor` (ajustando centavos). Aplica a strikes y primas.

- **Márgenes cbot**: maintenance margins de CME por producto/período (soja, maíz).

- **Maíz x Soja**: ratio maíz/soja (1er mes, diferencia, promedio) — señal de relación
  entre productos (conecta con la calculadora "por porcentaje" / #3).

- **cbot**: **arbitraje Matba ↔ Chicago** (entrada, cotización, puntos x bushel,
  USD x tn, relación con Chicago). → futuro panel/calculadora de arbitraje internacional.

- **Condiciones**: dispo SM/LG, estrategias 2x1, relación Sj×Mz.

- **Pase**: pases de soja (dispo SM/LG vs Mayo Matba), pase 75% / 50% hasta fechas.
  → conecta con la calculadora de pases (#6).

- **CyS**: calls de trigo (strike/prima) y promedio.

## Ideas de nuevas piezas que salen de acá
1. Panel de **tasas implícitas del dólar** completo (compuesta/simple/entre meses).
2. Calculadora/panel de **arbitraje Chicago ↔ Matba** (con los factores bushel→tn de arriba).
3. **Ratio maíz/soja** histórico (señal de relación entre productos).
4. **Márgenes CME** por producto (para dimensionar garantías al operar futuros).
