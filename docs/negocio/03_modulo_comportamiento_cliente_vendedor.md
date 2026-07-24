# Módulo comportamiento cliente vendedor — especificación

> Metodología propia de scoring de clientes vendedores de granos.
> **Estado:** especificación funcional completa. Diseñado para un correacopio;
> es un potencial **producto/metodología** ofrecible por ROFO AGRO a acopios y
> corredoras. Pendientes: prompt de implementación para IT + primer ángulo
> analítico a testear con datos reales.
>
> **Propósito:** clasificar el comportamiento de los clientes vendedores
> (productores y acopios): ¿este cliente le hace ganar o perder plata al
> negocio, y de qué manera? Combina un SCORE de comportamiento con una vista de
> P&L por cliente.

## 1. Arquitectura: 5 ejes con pesos AHP (editables)

| Eje | Peso | Qué mide |
|---|---|---|
| FIJACIÓN | 45% | Calidad de las decisiones de fijación del cliente |
| MIX NEGOCIOS | 21% | Composición de tipos de negocio (× TN) |
| FINANCIERO | 18% | Comportamiento financiero (float, previsibilidad) |
| ENTREGA | 11% | Cumplimiento y timing de entregas |
| PESIFICACIÓN | 5% | Comportamiento en pesificaciones (peso piso) |

## 2. Eje FIJACIÓN — sub-variables (versión vigente)

4 sub-variables (se eliminaron "Dejar correr" y "Permanencia", absorbidas por el Delta ajustado):

| Sub-variable | Peso | Qué mide |
|---|---|---|
| DELTA | 56% | Calidad del precio fijado vs referencia A3 |
| FRAGMENTACIÓN | 28% | En cuántos tramos fija (scoring CONTEXTUAL) |
| FIJAR ANTES | 9% | Anticipación de la fijación respecto al vencimiento |
| MONEDA | 7% | Elección de moneda al fijar |

**Reglas del Delta** (ver también `02_logicas_y_principios.md` §6):
- Referencia: futuro A3 **móvil** al momento de la fijación.
- `Delta_puro = precio disponible − futuro A3 de referencia`.
- `Delta_ajustado = Delta_puro − Costo_Oportunidad_Capital`.
- `Costo_Oportunidad_Capital = Tasa_capital_trabajo × fracción_año_en_MPF × precio_entrega`.
- Convención: **Delta POSITIVO = MALO**.
- Los tres números se muestran **separados y juntos**.

**Fragmentación contextual:** concentrar volumen en Delta favorable se PREMIA; en desfavorable se PENALIZA (no es conteo simple).

## 3. Vista P&L paralela (no es un eje — corre en paralelo al score)

`P&L por cliente = NEGOCIOS + FINANCIERO + COMISIONES`:
1. **Negocios:** `−Delta × TN` (solo para negocios "a fijar").
2. **Financiero:** `float × días × TAMAR` convertida a TC diario.
3. **Comisiones:** comisión de la corredora, directo del sistema.

## 4. Clasificación final

- Matriz **Score × P&L** → etiquetas granulares (Rentable sólido, Potencial, Riesgo, etc.) + **semáforo** de 3 colores.
- **Consistencia (transversal):** CONSISTENTE vs OCASIONAL — distingue evento aislado de patrón; define la respuesta comercial. No se deriva del score puro.
- **Share / fidelidad:** participación del correacopio en la producción total del cliente; fallback = consistencia interanual del volumen.

## 5. Fuentes de datos y mapeo

- **Primario:** "Fijaciones (eventos)" — criticidad CRÍTICA. Una fila por evento, ~21 columnas (vendedor, producto, fechas origen/fijación/vencimiento, peso, moneda, precio).
- **Enriquecimiento:** maestro "Clientes" (segmentación); "MPF Operativa" (inventario sin fijar vigente).
- **Gap crítico:** el Delta requiere join de fijaciones + pizarras histórico + historial de futuros A3 (fuente externa). Resolver la fuente 3 es prerequisito de implementación.

## 6. Principios de diseño y estado

- Todos los pesos son **editables** (parámetros, no constantes).
- Pendiente: (a) prompt/especificación técnica para IT; (b) primer ángulo analítico a testear con datos crudos reales.
- Como producto de consultora: adaptable a cualquier acopio/corredora con registro de eventos de fijación a nivel fila.
