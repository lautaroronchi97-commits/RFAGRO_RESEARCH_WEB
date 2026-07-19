# DJVE — Marco normativo, circuito del grano y comportamiento del exportador

> **Research verificado el 18/07/2026** (sesión Fase 3 de comercio exterior). Regla de este doc:
> **solo entra lo verificado contra fuentes primarias o contra nuestra propia base**; lo dudoso está
> marcado `NO CONFIRMADO` y NO debe usarse en lógica de paneles. Preferimos menos información antes
> que información incorrecta (regla de Lautaro).
>
> Fuentes primarias leídas completas: Ley 21.453 (texto actualizado InfoLeg) · Ley 26.351 ·
> Res. 128/2019 MAGyP (PDF BO) · Res. 152/2020 · Res. SAGyP 185/2025 · Manual ARCA RG 4977 (SIM) ·
> Com. BCRA "A" 8137. Secundarias: BCR (Informativo Semanal, "Cinco dudas"), Chequeado, CDA,
> Infobae/Ámbito/La Nación/Bichos de Campo. Verificación empírica: SQL sobre nuestras tablas
> `djve` (7.690 filas 2026) y `lineup` (494k filas).

## 1. Qué es una DJVE y qué fija

- Es la declaración jurada de una **venta al exterior YA CERRADA** (Ley 21.453). Se oficializa en el
  SIM (ARCA) **hasta las 11:00 del día hábil siguiente al cierre de la venta** (Res. 128/2019 art. 2,
  texto s/ Res. 152/2020). No es una "intención": refleja negocios reales — aunque el grano puede no
  estar comprado todavía (ver §5).
- **Qué fija (art. 6, Ley 21.453)**: la **alícuota de derechos de exportación Y la base imponible
  (precio FOB oficial)** vigentes a la fecha de cierre de venta. **NO fija el tipo de cambio** (ese es
  el del registro de la destinación aduanera al embarcar).
- **Novedad 2026**: el cronograma de baja de alícuotas del **Decreto 423/2026** se aplica **según la
  fecha de inicio del período de embarque declarado en la DJVE** (no la fecha de registro): declarar
  hoy un embarque 2027/2028 ya toma la alícuota futura menor. Cambia el incentivo clásico de
  "declaro hoy para congelar la alícuota de hoy".

## 2. Los dos regímenes: DJVE-360 y DJVE-30 (el campo `opcion`)

Hoy existen **dos** regímenes (no 5; los plazos 45/90/180 eran del viejo ROE Verde):

| | **DJVE-360** (`opcion=360`) | **DJVE-30** (`opcion=30`) |
|---|---|---|
| Vigencia | 360 días corridos desde el registro | 30 días corridos desde el registro |
| Ventana de embarque | La **elige el exportador** dentro de la vigencia: **30 días corridos si es granel, 90 días si es no-granel** (bolsas/contenedores). Puede arrancar hasta meses después del registro. | **Arranca el día del registro** (verificado: lag 0 en el 100% de nuestra base), fin ≈ +30 |
| Pago de derechos | **Anticipo del 90% dentro de los 5 días hábiles** del registro (Res. 152/2020; concepto 029 del SIM). No son 15 días — los "15 días hábiles" que circulan eran la condición **cambiaria** del Dto. 38/2025 (divisas), otra cosa. | Al oficializar la destinación (al embarcar). Sin anticipo. |
| Prórroga automática | +30 días corridos sin costo ni trámite | No tiene |
| Uso típico | Programar la campaña / fijar tratamiento fiscal | Disponible con mercadería originada, embarque inminente |

- Flexibilidad extra: el embarque puede **anticiparse hasta 15 días corridos** antes del inicio
  declarado (art. 9, Res. 128/2019).
- **Consecuencia clave para leer el dato** (norma + verificado en nuestra base): el tonelaje granel
  (barcos) declara **ventana de un mes concreto**; las DJVE-360 con ventana de ~90 días son carga
  no-granel minúscula. En nuestra base 2026: op360 con ventana ≤1 mes = **27,99 Mt en 1.044 DJVE**
  (prom. 26.800 t); op360 con ventana 1-3 meses = **0,32 Mt en 3.451 DJVE** (prom. **92 t** =
  contenedores). → *El "mes de embarque declarado" es un dato limpio para el volumen que importa.*

## 3. La economía del forward (por qué declarar 360 es una decisión cara)

- Declarar forward obliga a poner los derechos (90% del total) a los 5 días hábiles, **meses antes de
  cobrar el embarque** → inmoviliza capital. Con soja al 24% es mucha plata; con maíz al 8,5%,
  moderada. Un programa forward declarado es un **compromiso caro**, no un registro gratis.
- La falta de pago en término NO voltea la DJVE (art. 12) — sigue vigente, con sanciones DGA aparte.
- Por eso conviven: **op30 = flujo del disponible** (~5 Mt/mes estable en 2026) y **op360 = programa
  comercial + jugadas fiscales** alrededor de cambios de alícuota (§8).

## 4. Cumplido, tolerancia, prórrogas y multa

- La DJVE se da por **cumplida embarcando ≥90%** de lo declarado (tolerancia hasta +4% en más)
  (Res. 128/2019 art. 15; Ley 21.453 art. 9).
- **Multa por incumplir: 15% del valor FOB de la parte incumplida** (art. 9). Falsear datos: hasta 10%.
- Prórrogas: **automática +30 días** (no DJVE-30) · extraordinaria +30 por fuerza mayor (TAD) · y la
  SSMA puede dar por cumplida sin sanción. Además, ante shocks el Estado históricamente **prorrogó en
  masa por resolución** en vez de multar: COVID (Res. 173/2021), sequía-maíz (Res. 78/2023, +180 días),
  post-Decreto 682 (Res. 184/185-2025: **+360 días** a todas las DJVE previas al 22/09/2025).
- **No hay dato público de cumplimiento por DJVE** (el registro publica solo altas): el cruce
  estadístico contra line-up/embarques es la única forma — lo que hace la BCR y lo que hace nuestra
  Fase 2. `NO CONFIRMADO`: estadísticas de multas efectivamente aplicadas (nadie las publica).

## 5. ¿Hace falta tener el grano comprado? (Ley 26.351, viva pero condicional)

- **Se puede declarar sin tener la mercadería** — la DJVE declara una venta, no una tenencia.
- El **DNU 70/2023 NO derogó** ni la Ley 21.453 ni la 26.351 (verificado por texto + fichas de
  vigencia). Lo que sí se derogó: los **"Volúmenes de Equilibrio"** (cupos de DJVE trigo/maíz de la
  era 2021-2023), por Res. 302/2024.
- La Ley 26.351 solo se activa **si las alícuotas SUBEN** entre el registro y la oficialización: para
  conservar la alícuota vieja hay que acreditar tenencia o compra **anterior al aumento** (sementeras
  y opciones de futuros NO cuentan — Res. 128/2019 art. 19); si no se acredita, paga la alícuota
  nueva (no pierde la DJVE).
- Evidencia de que se declara sin comprar: BCR (soja 2024/25 al 15/08/2025: DJVE 8,35 Mt vs 6,9 Mt
  compradas) y el episodio sept-2025 (§8): ~80% de las DJVE del cupo en 6 empresas, cuestionadas por
  la SRA justamente por no tener el grano.

## 6. El circuito completo y sus tiempos (verificado)

```
venta externa → DJVE (hasta 11:00 del día hábil sig.) → [anticipo DE a 5 dh si es 360]
   → originación del grano (antes, durante o DESPUÉS de declarar)
   → logística interna: turnos STOP para descarga en terminal (STOP 5.0 en el Gran Rosario desde mar-2026)
   → nominación del buque → aparece en el line-up  ← MEDIANA 10 DÍAS antes del ETB (p25 6 · p75 14 · p90 18)
   → carga → cumplido aduanero (imputa la destinación a su DJVE, RG 4977)
   → liquidación de divisas: ≤30 días corridos post-cumplido (Com. "A" 8137, granos/aceites/harinas)
```

- El lead del line-up (mediana 10 días) está **medido sobre nuestra propia tabla `lineup`**
  (5.567 episodios buque-agro jul-2024→jul-2026) y es consistente con las circulares de NABSA
  (~3,5 semanas de horizonte máximo). → **El line-up solo "ve" ~2 semanas hacia adelante.**
- Una DJVE se cumple con **varias destinaciones/embarques parciales** (manual ARCA); operativamente
  un buque puede cargar contra varias DJVE (nada lo impide; `NO CONFIRMADO` como norma explícita).
- Los regímenes especiales de baja de retenciones ataron la liquidación de divisas **al registro de
  la DJVE** (no al embarque): Dto. 38/2025 = 95% en 15 dh; Dto. 682/2025 = 90% en **3 dh**.

## 7. Cómo leen las DJVE los analistas de referencia (BCR)

La BCR usa **los dos cruces a la vez** (Informativo Semanal, verificado con ejemplos 2025-2026):
1. **DJVE − comprado = lo que falta originar** (contra las compras del sector exportador, dato SAGyP).
2. **DJVE/programa − embarcado = lo que falta embarcar** — su "programa de embarques" sale del
   **line-up de las agencias marítimas** (NABSA citada nominalmente).

→ Nuestro gap de cobertura (Fase 2) y la mesa de embarque (Fase 3) replican la práctica del analista
de referencia del mercado; no es una metodología inventada.

## 8. Cronología de política 2023→2026 (por qué el ritmo de DJVE se distorsiona)

La serie de DJVE **no es una serie comercial pura**: alrededor de cada cambio de alícuota hay olas
fiscales. Eventos verificados (todos con norma + fuente):

| Fecha | Norma | Qué pasó | Efecto en DJVE |
|---|---|---|---|
| 13/12/2023 | Dto. 28/2023 | Dólar blend 80/20 | — |
| 2024 | — | Sin cambios de alícuotas (verificado por ausencia) | — |
| 27/01/2025 | Dto. 38/2025 | Baja temporal hasta 30/06/25 (soja 26, deriv. 24,5, cereales 9,5, girasol 5,5) + 95% divisas en 15 dh | Ventas +30% |
| 14/04/2025 | Dto. 269/2025 | Fin del dólar blend | — |
| 27/06/2025 | Dto. 439/2025 | Revierte la baja el 01/07 (salvo trigo/cebada 9,5) | **"Festival de DJVE": junio 2025 récord mensual (~21-23,5 Mt)** |
| 31/07/2025 | Dto. 526/2025 | Baja permanente (soja 26, maíz/sorgo 9,5…) | — |
| 22/09/2025 | **Dto. 682/2025** | **0% hasta 31/10 o USD 7.000 M; 90% divisas en 3 dh** | **Cupo agotado en 72 hs: 11,47 Mt** (subprod. soja 4,72 · poroto 2,69 · trigo 1,77 · maíz 0,95…) |
| 24/09/2025 | Res. 184/185-2025 | **+360 días de vigencia** a las DJVE previas al 22/09 | Protegió 63 Mt ya registradas |
| 12/12/2025 | Dto. 877/2025 | Baja permanente: soja 24, subprod. 22,5, trigo/cebada 7,5, maíz/sorgo 8,5, girasol 4,5 | Base del récord mar-2026 |
| Mar-2026 | — | — | **Récord histórico absoluto: 12,6 Mt (+71% i.a.); maíz 6,84 Mt (+134%)** |
| 03/06/2026 | **Dto. 423/2026** | Trigo/cebada 5,5 inmediato; cronograma 2027-28 **según período de embarque de la DJVE** (soja 24→21→15; maíz/sorgo 8,5→7,5→5,5) | 1S-2026: 52,3 Mt (+17% vs prom. 5 años) |

**Alícuotas vigentes al 18/07/2026**: soja poroto 24% · harina/aceite de soja 22,5% · maíz y sorgo
8,5% · trigo y cebada 5,5% · girasol 4,5% (derivados de trigo/cebada 1-3,5%).

## 9. Implicancias para NUESTROS datos y paneles (lo que NO teníamos en cuenta)

1. **A nuestra tabla `djve` le falta 2025 entero** (arranca el 02/01/2026, verificado). Las DJVE del
   "festival" de jun-2025 y de la ola del Dto. 682 (sept-2025, encima con **+360 días de prórroga**)
   tienen ventanas que caen en 2026 y hoy NO las vemos → **el "declarado" de la Fase 2 (cobertura y
   avance de campaña) está subestimado**, y cualquier comparación estacional de DJVE es imposible.
   **El backfill ES posible**: la SSMA publica **XLS acumulados por año, 2011→2025** (verificado por
   fetch), en `magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/djve/` (consulta "DJVE registradas
   y acumuladas aprobadas", selector de año; estructura 1:1 con nuestra tabla). Hay además una página
   especial con las DJVE del Dto. 682/2025.
2. **La ventana de embarque es un dato limpio para el tonelaje granel** (§2): mes concreto por norma.
   El ruido de ventanas de 90 días es no-granel y pesa 0,3% del tonelaje → se filtra, no se prorratea.
3. **`opcion=30` NO elige mes**: su ventana arranca el día del registro por definición. Es el flujo
   del disponible. El programa forward "de verdad" vive en las op360 con inicio > registro.
4. **El line-up ve ~10 días (mediana)** → un gap "declarado sin barcos" a 2-3 meses vista NO es señal
   de nada: es la física del dato. El cruce declarado-vs-originado por mes solo vale para el **mes en
   curso y ~2 semanas del siguiente**; más allá, lo que se muestra es el **programa declarado** (que
   tiene valor propio: es compromiso caro, §3).
5. **El mes en curso "sobre-originado" es esperable**: los buques de hoy cumplen DJVE con ventanas
   viejas (+ prórroga automática +30d + anticipación 15d + tolerancia 90%). Comparar barcos del mes
   contra DJVE con ventana en el mes subestima el declarado relevante. Leerlo como "cumplimiento",
   no como señal bajista.
6. **Las olas de DJVE se leen con el calendario de decretos al lado** (§8): un salto de registración
   puede ser fiscal y no comercial. Desde el Dto. 423/2026 (alícuota por período de embarque) el
   incentivo a "festivales pre-suba" se atenúa — la ola de maíz de jul-2026 (2,3 Mt el 13/07
   apuntando a ago-sep) es más consistente con el programa comercial de la cosecha récord (~45 Mt)
   que con una jugada fiscal.
7. **La DJVE es venta cerrada real** (≤ día hábil siguiente) → como dato de demanda comercial es
   duro; su debilidad es la distorsión fiscal episódica y que no publica cumplimiento.

## 10. No confirmado / abierto (NO usar en lógica de paneles)

- Transferencia/cesión de una DJVE a otro exportador: sin norma encontrada (ni permiso ni prohibición).
- Desistimiento voluntario de una DJVE: no previsto en el régimen vigente (solo fuerza mayor).
- Estadísticas de multas art. 9 aplicadas: no se publican.
- Qué pasa con la DJVE en un wash-out comercial (mar-2026 hubo wash-outs de harina de soja por el
  conflicto de Ormuz): sin fuente.
- Si el Dto. 423/2026 trae condición cambiaria asociada: las fuentes no mencionan ninguna.
- Com. "A" 8417 (abr-2026): existe, pero no pudimos leer si tocó el plazo de 30 días del agro.
- Fecha exacta de extinción del régimen ROE Verde.
