# Sesión 2026-07-24 — Plan informes v2 (research multi-agente + bola de nieve)

- **Rama:** `claude/informes-skills-alternativas-9fvo9f` · **PR:** #_ (base `main`)
- **Objetivo pedido por Lautaro:** llevar los informes/skills (diario, semanal, view,
  interpretaciones) "a otro nivel" con Fable orquestando agentes de research; view de
  mercado con **aprendizaje acumulativo** ("bola de nieve": la tesis previa + lo nuevo de
  cada semana, con switches por eventos) — pero ANTES cuestionarlo a fondo ("qué problemas
  podemos tener"), hacer research real sobre cómo hacerlo bien, y volcarlo en un plan. Solo
  planificación: **cero código en esta sesión**.

## Hecho

- **[`docs/PLAN_INFORMES_V2.md`](../PLAN_INFORMES_V2.md)** — el plan completo: crítica con
  evidencia (9 riesgos con mitigación estructural, §1) · 7 principios de diseño (§2) ·
  fuentes externas verificadas con requests reales HOY (§3) · arquitectura del pipeline
  semanal F0-F6 del view v2 (§4) · migración mínima + scorecard (§5) · qué cambia en cada
  pieza MP1-MP4 (§6) · loop de aprendizaje formalizado (§7) · qué NO cambia de v1 (§8) ·
  5 fases con prompts autocontenidos V0→V4 (§9) · preguntas para Lautaro (§10) · criterios
  de éxito medibles (§11) · referencias (§12).
- **Research previo (3 agentes en paralelo, base de todo el plan):**
  1. *Sesgos/multi-agente* (papers): el anclaje en LLMs NO se arregla con instrucciones
     (medido: CoT/"ignorá el hint"/reflection fallan; los modelos más capaces se anclan
     MÁS) → única mitigación robusta = **blind-first** (view provisorio sin ver la tesis
     previa, reconciliación después). Citas de deep-research agents: 11-57% problemáticas
     → **pasaporte** (URL+fecha+cita textual) verificado mecánicamente. Consolidación
     automática de memoria: medida como destructiva → destilación manual gateada + cap.
     Multi-agente: fan-out solo de lectura, síntesis single-thread, ~15x tokens.
  2. *Agro pro + fuentes* (verificado con requests reales 24/07): **CFTC COT** desagregado
     200 sin key (managed money = el dato que separa un informe de mesa de uno de diario) ·
     **DTN** publica las tablas de expectativas pre/post-WASDE sin paywall (habilita
     "expectativa vs dato", lo que hoy MP4 no tiene) · Crop Progress USDA en TXT parseable ·
     EIA etanol CSV · SMN JSON · AMS GTR. Bloqueados confirmados: AgWeb (403 PerimeterX),
     Successful Farming (402), Agrolink (403), CME FTP (403), INMET (reset TLS).
     Export Sales FAS: requiere key GRATIS (pedida a Lautaro en §10 del plan).
  3. *Inventario del repo*: `views_mercado` sin ninguna relación entre views consecutivos
     (la bola de nieve no tiene soporte en datos hoy) · `aprendizajes.md` VACÍO y 0 feedbacks
     (el loop existe pero nunca giró) · **0 disparos reales verificados de las 3 Routines**
     · endpoints de insumos aditivos (extender no rompe) · decisiones v1 que el plan respeta
     (Routines/suscripción, gates humanos, formatos).

## Decisiones tomadas (y por qué)

- **La bola de nieve = blind-first + invalidadores inmutables + scorecard** — las 3 piezas
  salen directo de la evidencia (anclaje no-instruible · anti "mover los arcos" de la
  disciplina de desks · sin medición no se sabe si mejora). El switch se gatilla por
  condición pre-declarada chequeada mecánicamente (F0), no por re-deliberación semanal.
- **Research externo con "dos anillos"**: números propios = universo cerrado de siempre;
  externos solo con pasaporte verificado; un dato externo nunca pisa uno propio.
- **Dónde sí / dónde no**: reforma grande en view-mercado (interno, falsable = laboratorio);
  expectativa-vs-dato en interpretaciones; "El mundo esta semana" en el semanal; **el diario
  NO se sofistica** (multi-agente prohibido ahí — su valor es salir siempre).
- **Interpretaciones previas: se usan como calibración de criterio, nunca como fuente de
  números** (responde la pregunta de Lautaro "¿mejores interpretaciones o leer de cero?":
  las dos, en capas — números siempre de cero del dato crudo, criterio de las publicadas).
- **Fetch-en-vivo, cero ingesta nueva en v1** (la API Socrata del CFTC ya trae histórico
  completo para percentiles al vuelo; promover a ingesta es decisión aparte si se consolida).
- **V0 antes que todo**: no se construye el piso 2 sin verificar el piso 1 (Routines nunca
  verificadas de punta a punta + loop de feedback vacío).
- **BCBA-PAS (Lautaro, en el chat)**: lo carga él en cada salida por `/admin/datos` → la
  interpretación se genera sola del dato crudo; su lectura propia (si la comparte) se trata
  como el "color de la rueda" — citable, nunca fuente de números ni "corregida". El disparo
  tolera carga con rezago (informe subido hoy con fecha de días atrás).
- **"Cabeza de mercado y mente abierta" (Lautaro, en el chat)**: el prompt de análisis del
  view lleva las "preguntas de la mesa" como ejemplos NO cerrados — driver coyuntural vs
  estructural (maíz local subiendo por barcos+lluvia con view bajista de fondo), ¿el nivel
  de precios tiene sentido con cosecha récord?, ¿quién pone el precio?, ¿caros/baratos vs
  Chicago?, ¿sobra o falta en el mundo (stock/consumo)?, ¿demanda activa?, correlacionados
  (aceites → soja). Regla explícita: si el mercado se mueve por algo fuera del checklist,
  eso es lo que hay que detectar, no ignorar.
- **Recorrido de la tesis (Lautaro, en el chat)**: en cada reconciliación el view se
  **cuestiona contra el precio** (¿cuánto del movimiento ya se produjo? ¿qué recorrido
  queda?) — pregunta obligatoria, no regla mecánica: la línea bajista puede seguir, pero
  justificada contra lo ya recorrido. CUMPLIDA (valor nuevo de `relacion_previa`) es salida
  posible cuando no queda recorrido, no default. Las interpretaciones suman el paso "cuánto
  ya estaba en el precio" (run-up previo al informe).

## Verificado

- Solo docs (cero código): no aplica lint/tsc/build más allá del CI normal del PR.
- Las verificaciones de fuentes externas (§3 del plan) son requests reales de HOY con status
  HTTP reportado tal cual, incluidas las negativas.

## Quedó pendiente / en vuelo

- **Lautaro lee el plan** y contesta §10 (key FAS gratis · nota 1-5 en feedback · 5 vs 6
  páginas · COT en diario sí/no · modelo de la Routine del view).
- Ejecutar **V0** (verificar Routines + primer feedback) y después V1→V4, cada una en su
  sesión con el prompt de §9.
- Registrar V1-V4 en el backlog maestro (`auditoria/E7-sintesis.md` §4) cuando Lautaro
  apruebe el plan.

## Trampas descubiertas (para la próxima sesión)

- **INMET (Brasil) tiene el mismo bloqueo TLS que DEA-SAGyP** (connection reset al Client
  Hello desde cloud) — no insistir desde Actions/sandbox.
- **CME FTP de settlements bloquea explícito** ("IP blocked, scraping prohibited") — no usar.
- Barchart news da 404 a curl directo (routing JS), pero el truco de cookie XSRF de
  `ingest-cbot.mjs` sería reutilizable si hiciera falta.
- La API Socrata del CFTC (`publicreporting.cftc.gov`) filtra por `commodity_name` y trae
  histórico completo en JSON sin key — mejor que parsear el TXT si se quiere percentil.
- El artículo pre-WASDE de DTN aparece ~2-3 días antes de cada informe; el mecanismo de
  descubrimiento correcto es Google News RSS la semana del informe (la query fuera de esa
  ventana viene vacía, es esperable, no un error).
