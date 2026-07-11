# PLAN — Portal de noticias: relevancia estricta y anti-redundancia

> Plan de mejoras para ejecutar (NO ejecutado todavía). Nace de una auditoría crítica del portal
> (11 agentes, verificación adversarial) sobre el **corpus real de 371 titulares** de la tabla `noticias`
> (10/07/2026). Objetivo del dueño (Lautaro), textual: *"que la gente que use la web tenga información de
> mercado o contexto de economía/política para la toma de decisiones. No quiero información redundante o
> poco relevante."* Audiencia: productores/acopios (clientes) + mesa de trading.

## Decisiones de Lautaro (tomadas — NO re-preguntar)
1. **Criterio de relevancia: ESTRICTO.** Entra solo lo accionable (mercado de granos, macro dura, clima
   productivo, logística de granos, demanda internacional, informes). Sale: interés humano, fútbol/Mundial,
   macro blanda (plazo fijo, peajes, "clase media"), promo institucional, agtech promocional.
2. **Ganadería/carne/leche y economías regionales (yerba, vino, olivo, miel): FUERA del portal.** Salvo que
   el título también toque los 6 granos.
3. **Formato: BRIEFING arriba + chips.** Franja "Lo importante hoy" (6-10 títulos priorizados) sobre los
   chips por categoría.
4. **Solo REGLAS, nunca IA.** Sin modelo en el cron. Se asume el techo estructural (algún ruido sofisticado
   se colará) y se compensa con tiers de fuente + gating + dedup por evento + ranking.
5. **Chip "Informes" propio** (WASDE / PAS / GEA / CONAB / CFTC).
6. **"Internacional" = mercados/informes externos** (Chicago, China, Brasil productor, Mar Negro, USDA). El
   **clima externo que mueve Chicago va en Internacional**, no en Clima.
7. **Al colapsar un evento repetido gana la fuente por PRIORIDAD EDITORIAL:** BCR/bolsas y agencias
   (Reuters/USDA) > medios nacionales serios (La Nación, Ámbito, Infobae) > especializados > provinciales.

## Veredicto de la auditoría (verificado contra datos reales)
El sistema **clasifica bien el TEMA pero no resuelve la RELEVANCIA**. Dos defectos duros probados:
- **Ranking cronológico entierra lo importante:** los 8 titulares del fin de cosecha de soja (50,1 Mt, la
  nota de la semana) **no entran** al panel; sí quedan "la veterinaria que encontró su pasión viajando" y
  los peajes a la Costa, por ser más recientes. Mercados descarta 86 de 98 candidatos solo por reloj.
- **Redundancia de evento sin dedup:** ~24-27% del archivo es la misma historia repetida (WASDE = 21
  titulares; cosecha de soja = 8 medios; UE-biodiésel = 6; lanzamiento Congreso Aapresid ≈ 13). El dedup
  actual solo colapsa títulos idénticos normalizados.
- **"Mercados y precios" es cajón de sastre:** 59 de 121 notas (49%) llegan por *default* sin que ninguna
  palabra matchee — ahí viven "Haaland quiere ser el mejor agricultor de Noruega", la minería de litio y
  ferias gastronómicas. Y notas de mercado genuinas se fugan a otros chips.

La clasificación en sí está **sana** (0 desvíos de sus reglas): el problema NO es el clasificador, es que
**no existe un eje de prioridad ni dedup por evento**.

> ⚠️ **Advertencia transversal para quien ejecute:** la lógica del clasificador está **duplicada** — en
> `src/lib/noticias-clasificar.ts` y espejada en `scripts/ingest-noticias.mjs`. Todo cambio de reglas se
> toca en los DOS lados. Además la `categoria` se guarda EN la ingesta: cambiar reglas **no re-clasifica lo
> ya guardado** sin un backfill (re-correr el cron o un UPDATE). Ideal: unificar la lógica en un módulo
> único importado por ambos (ver Fase 4).

---

## Fase 1 — Quick wins de reglas (esfuerzo BAJO)
Archivos: `src/lib/noticias-reglas.json` (+ espejo en el script).

1. **Sacar `"congreso"` suelto de Economía** → frases inequívocas (`congreso de la nación`, `diputados`,
   `senado`, `proyecto de ley`, `sesión`). *Verificado: 1 palabra = 30% de los errores claros; el Congreso
   Aapresid hoy se parte en 4 categorías. Costo: 1 solo título legítimo se degrada.*
2. **Normalizar siglas antes de limpiar puntuación** (`EE.UU.`→`eeuu`, `U.E.`→`ue`) y **sumar gentilicios**
   frecuentes (`francia`, `irán`, `chino/s`, `brasileño/a`, `brasileira`, `europeo`). *Corrige fugas
   sistemáticas hacia mercados/economía.*
3. **Poda quirúrgica de listas de palabras** (sumar antes de restar, para no romper títulos que dependen de
   una palabra): Clima suma `anegamiento/s`, `seco`, `heat stress`, `storms`; `"brecha"` y `"fas"` pasan a
   **frase** (`brecha cambiaria` / `FAS teórico`) porque hoy capturan "brecha de rinde" y el panel FAS;
   sacar `vessel`/`shipping`/`port` en inglés de Logística (las 8 notas locales matchean por términos en
   español, no se rompe nada).
4. **Nuevas regex de ruido de alta precisión** (ya probadas contra el corpus, cero falsos positivos):
   `"Plazo fijo: cuánto…"`, peajes/vacaciones/Costa Atlántica, nombramientos y obituarios de World-Grain
   (`names`/`appointed`/`dies`/`CFO`), how-to y mascotas de G1 (`como montar`, `horta em casa`, `pets`).

## Fase 2 — Filtro de relevancia ESTRICTO (esfuerzo MEDIO) — el corazón del pedido
5. **Gating de fuentes generalistas** (Ámbito, La Nación, Clarín, G1, World-Grain): dejan de usar `default`
   temático. Si el título **no** tiene señal agro **ni** macro-dura → **se descarta** (no cae en Mercados).
   *Calibración OBLIGATORIA antes de activar (medido): el ratio sería ~30 ruidos fuera / ~28 buenos en
   riesgo. Primero completar keywords en inglés faltantes (`soy`, `milling`, `flour`) y armar la lista
   blanca macro con términos ESPECÍFICOS (no `"tasa"` sola, que deja pasar el plazo fijo).*
   - **Lista blanca macro-dura:** dólar, tipo de cambio, retenciones, derechos de exportación, brecha
     cambiaria, riesgo país, BCRA/reservas, liquidación de divisas, cepo, tasas de interés (no "plazo fijo").
6. **Ganadería y economías regionales → fuera** (decisión 2): lista de exclusión (`hacienda`, `novillo`,
   `feedlot`, `tambo`, `leche`, `yerba`, `vino`, `olivo`, `miel`, `algodón`) salvo co-ocurrencia con granos.
7. **Fallback sin señal → se descarta** (portal limpio; decisión 1). **Excepción:** las fuentes
   ESPECIALIZADAS mantienen su default temático (dataPORTUARIA→logística, AgWeb/DTN/Cebada→su tema) — esas
   ya son 0% ruido y no necesitan gate.
8. **Cola internacional de baja señal:** podar las radios rurales de EEUU de 1-2 notas (Oklahoma/Michigan
   Farm Report, etc.); mantener las canónicas (DTN, AgWeb, Farm Progress, Successful Farming, Pro Farmer).

## Fase 3 — Dedup por evento + briefing (esfuerzo MEDIO-ALTO) — resuelve "lo importante invisible"
9. **Dedup dura pre-cluster:** (a) título que es prefijo/subcadena de otro → duplicado (arregla truncados de
   RSS); (b) misma fuente + mismo día + alta similitud → duplicado (retitulados de Agrositio; **validar el
   umbral contra fuentes prolíficas antes de activar**); (c) **dedup por título también CONTRA la tabla**,
   no solo el batch de la corrida (hoy los duplicados entre corridas se acumulan — 4 exactos ya en base).
10. **Dedup SEMÁNTICA por evento (cluster):** agrupar notas del mismo hecho por **huella
    entidad+cifra** (`50,1`, `US$2.000 M`, `35 empleados`) + solapamiento de tokens, en ventana de 48-72 h.
    Se muestra **1 representante + badge "cubierto por N medios"**. El representante se elige por **prioridad
    editorial** (decisión 7). *La redundancia entre medios pasa a ser señal GRATIS de importancia (alimenta
    el ranking del punto 12). Libera ~25% del archivo.*
11. **Frescura honesta:** los 39 títulos sin `fecha_pub` (resumen BCR, Agrofy — 10,5%) se etiquetan
    **"s/f"** y rankean **debajo** de los fechados del día (hoy heredan `creado_en` y fingen ser de hoy: 12
    quedaban visibles, incluidos bombardeos a Irán de fin de junio). *No usar regex naive de año para
    detectar republicados: rompería "US$2000 millones" — excluir cifras monetarias.*
12. **Franja "Lo importante hoy"** (6-10 títulos) **+ ranking por relevancia dentro de cada chip**, con
    score = **recencia + tamaño de cluster + tier de fuente + tier de keyword**. *Reemplaza el orden por
    reloj. Verificado: el scoring por conteo de matches SIN pesos NO alcanza (6 de 10 casos emblemáticos son
    empates 1-1) — hay que diseñar pesos/co-ocurrencias. Con esto la cosecha de soja va arriba y Haaland no
    aparece.*

## Fase 4 — Taxonomía nueva + cobertura de mesa + higiene (esfuerzo MEDIO-ALTO)
13. **Taxonomía nueva (decisiones 5-6):**
    - **Chips:** `Lo importante hoy` (franja, transversal) · `Mercados y precios` (granos locales: pizarra,
      Matba/A3, molienda, exportación AR) · `Informes` (WASDE/PAS/GEA/CONAB/CFTC/export sales) ·
      `Internacional` (mercados/informes/clima EXTERNOS que mueven Chicago) · `Economía y política`
      (macro dura AR) · `Clima` (productivo argentino) · `Logística y puertos`. **Se elimina Ganadería** (fuera)
      y se evalúa fusionar `Empresas` (bajo volumen tras el filtro estricto) dentro de Mercados.
    - **Orden del clasificador** (primera-gana, específico→general): `informes` → `clima` (AR) → `logistica`
      → `internacional` → `economia` → `mercados`(default local). *El chip Informes primero resuelve el
      "clima-primero secuestra el WASDE": "USDA cuts corn stocks as weather looms" → Informes, no Clima.*
14. **Sumar fuentes de mesa faltantes** (hoy 0 titulares, medido): consultas/feeds dedicados para **CONAB**,
    **Matba/A3**, **CFTC/posición de fondos**, **export sales USDA semanales**, **liquidación semanal
    CIARA-CEC**. Son informes de calendario fijo → encajan con el Calendario de informes ya previsto.
15. **Higiene técnica:** unificar la lógica duplicada del clasificador en un módulo único + rutina de
    **backfill** (re-clasificar lo guardado cuando cambian las reglas).

---

## Qué NO tocar (funciona — protegerlo)
- **Categoría Clima:** 91% relevante, la mejor señal/ruido. Solo los ajustes quirúrgicos de Fase 1.
- **Regex de ruido actuales:** cero "dólar hoy"/"a cuánto cotiza" sobrevivieron (verificado). Se EXTIENDEN.
- **Fuentes especializadas 0%-ruido:** AgWeb, Agrolatam, Cebada Cervecera, Successful Farming, DTN,
  dataPORTUARIA. Y las queries `gn-intl`/`gn-informes` de Google News (traen lo mejor — el WASDE llegó
  completo y a tiempo; el problema es la repetición, que resuelve el dedup, no la fuente).
- **World-Grain y G1: FILTRAR, no dar de baja.** Mezclan basura (RRHH corporativo, mini-horses) con material
  ALTA que no llega por otro lado (heat wave EU/UK, tarifaço, StoneX).
- **Arquitectura base:** reglas en JSON compartido web/cron, defaults temáticos para especializadas, dedup
  por link, filtro de antigüedad 14 días, dedup por título exacto en render. Todo lo del plan es capa
  ENCIMA, no reemplazo.

## Notas de honestidad (techo del enfoque "solo reglas")
- Con reglas + tiers + cluster se resuelve el grueso, pero **algún ruido sofisticado se colará** (promo
  institucional bien redactada, opinión que parece dato). Es el costo de no usar IA — asumido por Lautaro.
- Dos ideas de la auditoría fueron **descartadas** por refutación (no van al plan): el filtro de antigüedad
  como anti-republicados (ya existe y no atrapa re-fechados como "Aapresid 2019"), y excluir palabras
  ganaderas a secas (rebotarían al default Mercados en vez de descartarse — por eso va como lista de
  EXCLUSIÓN dura, no como quita de la lista de Mercados).

## Orden sugerido de ejecución
Fase 1 (1 sesión) → Fase 2 con calibración medida (1 sesión) → Fase 3 dedup+briefing (1-2 sesiones) →
Fase 4 taxonomía+mesa (1-2 sesiones). Cada fase es mergeable por separado y mejora el portal sin esperar
a la siguiente. Medir el corpus después de cada fase (mismo método: bajar la tabla, contar ruido/dupes).
