# Lógicas y principios de trading — aprendizajes validados

> Complemento de `01_contexto_negocio.md`. Reglas de decisión, principios y
> patrones validados en la práctica real de la mesa. Capa de "criterio" sobre
> la capa de "estructura".

## 1. Principios rectores

- **Regla de oro de mercado:** si viene precio de mercado y el productor quiere vender, se compra SIEMPRE (aunque contradiga el view), sobre todo si la exportación no está comprando. El mercado manda sobre el view.
- **Spreads nunca aislados:** un spread solo significa algo contra su propia historia entre posiciones específicas. El desvío del rango histórico genera la señal, no el nivel absoluto.
- **Datos crudos > reportes pre-digeridos:** el dato a nivel evento (una fila por evento) permite cross-tabulation y variables arbitrarias. Clave al pedir exports de sistemas de clientes.
- **El dinero muchas veces está en la logística:** cruzar posiciones da cintura; diferir lo que está en carry, recibir antes lo invertido.

## 2. Riesgo de base (riesgo recurrente Nº1 del carry "a fijar")

Cuando la variante A del carry físico no funciona, el causante típico es el **riesgo de base**: el disponible presionado no arbitra contra el término (fábricas pagan bajo por soja, o disponible presionado para pizarra). Todo diseño de carry para un cliente debe contemplar y cuantificar este riesgo.

## 3. Pesificaciones — lógica de gestión

- TC de referencia: **SIEMPRE BNA divisa comprador del día** que el productor decide fijar.
- No se gestionan aisladas: van al hedge general de monedas (exposición agregada de la mesa).
- Criterios de quita: destino geográfico, cliente, posición de caja y posibilidad de hedgear pesos con ganancia.

## 4. Patrones de comportamiento de clientes vendedores (validados)

1. **La fijación responde a necesidad financiera**, no a timing de mercado. El productor fija cuando necesita plata.
2. **El cliente especulador existe y es reconocible** (perfil distinto y estable).
3. **La fragmentación escala con el tamaño del contrato** (contratos grandes se fijan en más tramos).
4. **Acopio vs productor:** comportamiento claramente distinto → segmentos separados.
5. **Incumplimiento de cupo:** casi siempre clima/logística, no mala fe.
6. **Carta de garantía:** pedirla es señal POSITIVA (compromiso).
7. **Fragmentación contextual:** concentrar volumen en Delta favorable se premia; en desfavorable se penaliza. El mismo comportamiento cambia de signo según contexto.
8. **Consistencia como dimensión separada:** CONSISTENTE vs OCASIONAL es estructural, no se deriva del score puro. "Fijó mal de casualidad" ≠ "busca ganarte siempre".

## 5. Hallazgo estratégico competitivo

**La fijación larga en puerto** es el principal factor de pérdida competitiva de un correacopio contra AGD, ACA y exportadores directos. Los clientes se van porque los grandes ofrecen plazos de fijación más largos en puerto.

## 6. REGLAS DEL DELTA (base del análisis de fijaciones)

- **Referencia:** futuro A3 **móvil** determinado al momento de la fijación.
- **Delta_puro = precio disponible − futuro A3 de referencia.**
- **Delta_ajustado = Delta_puro − Costo_Oportunidad_Capital**, donde
  `Costo_Oportunidad_Capital = Tasa_capital_trabajo × fracción_del_año en MPF × precio_de_entrega`.
- **Convención de signo: Delta POSITIVO = MALO** (para quien compró el negocio).
- Los **tres números** (Delta puro, costo de oportunidad, Delta ajustado) se muestran siempre **separados y juntos**: cada uno cuenta una parte de la historia.

## 7. Gaps típicos de datos

El Delta completo requiere un join de tres fuentes que no suelen convivir:
1. Eventos de fijación (sistema interno del acopio/corredora).
2. Cotizaciones de pizarra histórico (sistema interno).
3. Historial de futuros A3 (fuente **externa**: Reuters/Refinitiv u otro; no suele estar en la intranet).

Este gap es esperable en cualquier cliente y se resuelve al inicio de todo proyecto de análisis.
