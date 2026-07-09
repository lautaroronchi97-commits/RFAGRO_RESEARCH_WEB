# EL CORREACOPIO — Contexto de negocio

> Base de conocimiento de una mesa de trading de granos en Argentina.
> Referencia permanente de expertise para RF AGRO: cómo funciona la mesa, los
> instrumentos, las lógicas de decisión y la jerga. Los ejemplos numéricos son
> **siempre didácticos** (no reflejan mercado ni posición vigente).
> Los datos reales (exposición de pesos, view de TC, posición A3, caja) los
> provee Lautaro y cambian día a día; no están acá.

## 1. Estructura del negocio

Estructura **DUAL**:
1. **La corredora** — gana por comisiones haciendo negocios; matchmaking productor ↔ exportador.
2. **El correacopio** — estructura productos complejos, defiende precio, vende en bloques. NO opera en espejo: difiere tiempos de compra/venta para capturar margen. Métrica de éxito: **USD × Tns** al cierre de ejercicio.

Productos que permiten trading: **maíz, trigo y soja**.

**Dos ejes core de decisión:**
1. Exposición de moneda ARS vs USD (view alcista TC → exposición pesos baja/negativa; bajista → muy expuesto en pesos).
2. Relación disponible vs futuros A3 → capturar **tasa implícita (carry)** en cada venta.

Rutina: reunión operativa los lunes con view semanal; decisiones real-time.

## 2. Productos e instrumentos

**Tipos de negocios:**
- **(a) A FIJAR** — entrega en una fecha, pricing en otra. Pricing: vs mercado de fijaciones, pizarra, o por relación de otro producto (ej. "180% pizarra maíz", "57% soja julio"). Precio abierto → flexibilidad para hedgear. NO cuenta en exposición de pesos mientras está abierto (solo al fijarse).
- **(b) A PRECIO** — disponible o forward. Moneda ARS o USD. Pesificación automática/contractual/pactada. Plazo largo → quita.
- **(c) CANJE** — pricing vs deuda por retiro de insumos. Pricing como forward; suma **deuda por cobrar** (asegurar cobro).
- **(d) CARTA DE GARANTÍA** — pago anticipado antes de la entrega. **Consume caja** (se paga a 5 días hábiles).

**"A fijar por relación de otro producto":** vende un producto en exportación y compra el otro en A3 al mismo precio teórico; el cliente puede fijar contra el precio del otro producto en el plazo pactado. Arbitraje entre productos.

## 3. Pricing y formación de precios

Proceso mental (todo a la vez): precio (exportación + A3) · posición general de granos · particularidad de cobro → caja · factores (oferta/demanda, views, competencia, plazos, condiciones a fijar). Mismo análisis para compra y venta.

**REGLA DE ORO:** si el productor quiere vender a precio de mercado, se compra SIEMPRE (aunque contradiga el view), sobre todo si la exportación no está comprando. **El mercado manda sobre el view.**

**Paridad Matba como disparador:** spread va a desaparecer → presiona compra al productor; spread va a agrandarse → deja correr al máximo; posición diferida pagando paridad matba en exportación → probablemente arma posiciones.

**Quita por pesificación:** depende de destino (más laxo en sur de BsAs; Rosario cobra más), cliente, y posición de caja / hedge de pesos (sintéticos con tasa positiva → quitas chicas; pesos penalizan → quita mayor).

**Quita por pago diferido USD** (orden de magnitud): hasta 30 días 0 USD · plazos medios mín. 1 USD · largos 2-3 USD.

**Posicionamiento estacional (patrón, no regla):**
- **Soja:** cosecha (abr/may/jun) vendedor a fijar; después según carry; desde sept vendedor a precio arbitrando vs cosecha nueva.
- **Maíz:** mar/abr/may vendedor a precio; después a fijar plazo largo; desde nov a precio vs cosecha nueva.
- **Trigo:** cosecha (nov/dic/ene) vendedor a fijar; después según carry; desde jun/jul a precio vs cosecha nueva.

## 4. Estrategias de trading y cobertura

**Carry trade físico — dos variantes:**
- **A (ideal, "a fijar"):** compra a precio al productor + venta a fijar al exportador + hedge vendiendo A3. Captura carry si el spread A3 es jugoso.
  *Ej.: compra soja abril 320; vende soja julio a fijar, hedge venta A3 julio 330; en julio fija 328, recompra A3 330 → +8 USD/tn.*
- **B (alternativa, "a precio + armar sobre matba"):** venta a precio al exportador + hedge comprando A3. Gana si al delivery el físico entra más barato que matba.
  *Ej.: vende soja abril 320, compra A3 abril 320; al delivery recompra físico 310, vende A3 320 → +10 USD/tn.*

Decisión A vs B: ¿el exportador está comprando a fijar? Sí → A (flexibilidad); no → B.

**Riesgo de base (riesgo recurrente Nº1 de la variante A):** el spot (fijación) no arbitra contra el término porque el disponible está presionado (pizarra) o las fábricas pagan bajo por soja.

**Calidad Cámara vs Fábrica:** maíz y trigo se pueden caratular/entregar desde A3 (CÁMARA = CÁMARA); soja NO en general (se origina FÁBRICA, A3 es CÁMARA) → A3 solo referencia de precio para soja.

**Juego de entregas:** con cupos y disponible presionado, comprás barato jugando con entregas entre meses (ej. maíz mar 190 vs abr 185; cliente vendió abril y entrega en marzo → das cupos, ganás 5). Lógica inversa si los precios se dan vuelta.

**Análisis de spreads:** nunca aislados; contra la **historia** entre posiciones específicas. Desvío del rango histórico = señal.

**Exposición de pesos:** se ajusta el hedge siempre; zonas de TC dinámicas (NO pesos / SÍ pesos / medias); pico de atención antes de las 15hs (cierre futuros); tolerancia ~1000M de holgura operativa.

## 5. Operatoria financiera

Estilo **financiero**: se miran tasas implícitas de los granos y se vende el de **menor tasa** para esperar el de **mayor tasa** (arbitraje de tasas). *Ej.: vender maíz junio con pago tasa 0% → volcar a compra de soja con pago descontando 5 USD.*

**Instrumentos:** LECAPs (TC breakeven oficial/MEP, techo banda) · dólar futuro (DLR) · dólar link · FCI MM / t+1 · PF / PF UVA · sintéticos (LECAP + dólar futuro). Cauciones NO se usan (restricción).

**Dinámica de caja:** consumen caja las cartas de garantía (pago 5 días hábiles); liberan caja las ventas a exportación (cobro 3 días hábiles post facturación). "A fijar" NO impacta caja ni exposición hasta fijarse.

**Matriz de tasas (LECAPs):** termómetro de demanda · referencia para cotizar pago diferido · FCI MM vs LECAP para excedentes · "mix de LECAPs" (tasa promedio entre 2 vtos) cuando falta la del mes.

## 6. Excel "Real Time" de arbitrajes (herramienta diaria)

9 pestañas con feed Reuters/Refinitiv:
- **Tasas de interés** — base LECAPs/DLR/link; TC breakeven; matriz de sensibilidad (define "FIN COLOCACIÓN").
- **Dólar sintético** — sintético por posición (LECAP + dólar futuro) vs dólar futuro directo.
- **Calculadora sintéticos y dif** — precio lleno del sintético; disponible con pago diferido; ejecución.
- **Arbitrajes (la principal)** — spot vs futuro (maíz/soja/trigo) con tasa directa y **TNA USD** por posición. TNA alta/positiva → comprar spot + vender diferido; negativa → vender spot + recomprar futuros.
- **Pases de granos** — spreads entre posiciones.
- **Letras vs cauciones** — arbitraje de tasa corta.

## 7-11. Riesgo, impositivo, calidad, logística, flujo (resumen)

- **Riesgo de crédito:** dos patas (crédito a productores en compra; crédito de exportadores en venta). Gestionado por área específica, no por la mesa.
- **Regulatorio:** no tomar caución (habilita USD MULC a dueños); no dejar girados los bancos los viernes; MATEX limitado a ~1500M/día; contrapartida líquida por ser ALYC.
- **Calidad:** descuentos de puerto replicados al cliente; en soja, FÁBRICA (origen) vs CÁMARA (A3) impide caratular.
- **Logística:** cruzar posiciones da cintura; diferir lo que está en carry, recibir antes lo invertido; interdependencia con cuperos.
- **Flujo:** cierre → cupo → descarga → aplicación CP/CTG → facturación → cobro → liquidación final (con análisis de calidad).

## 12. Glosario (jerga)

A FIJAR (entrega y pricing en fechas distintas) · A PRECIO · A3 (MATBA-ROFEX) · ALYC · ARMAR SOBRE MATBA · BYMA · CANJE · CARATULAR (entregar físico desde A3) · CARRY (tasa implícita disponible↔futuro) · CARTA DE GARANTÍA · CP/CTG · CUPOS · CUPEROS · DESCARGA CORTA · DJVE · FCI MM · FIJACIÓN · HEDGE GENERAL · LECAP · MATEX · MULC · PARIDAD MATBA (físico = A3) · PESIFICACIÓN (TC ref: BNA divisa comprador del día) · RELACIÓN −X VS POS (físico X USD más barato que A3) · ROE · ROLEAR · SINTÉTICO · SOBRE LA PAR · TC BREAKEVEN · TECHO DE BANDA · VENDER PARIDAD MATBA · ZONAS DE TC.
