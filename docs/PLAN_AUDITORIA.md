# PLAN DE AUDITORÍA INTEGRAL — RF AGRO

> **Qué es esto.** El plan maestro para auditar TODO el proyecto: datos, fórmulas, UX, código,
> infraestructura e historia. Se ejecuta en **7 etapas (E1→E7), una sesión de Claude Code por etapa**:
> Lautaro abre una sesión nueva y pega el prompt de la etapa (los prompts son autocontenidos, no
> dependen de ninguna conversación previa). Planificado el 21/07/2026 sobre un relevamiento completo
> del repo + la base viva (detalle: [`sesiones/2026-07-21-plan-auditoria.md`](sesiones/2026-07-21-plan-auditoria.md)).
>
> **Decisiones de Lautaro que rigen toda la auditoría (21/07/2026):**
> 1. Historia git **por PR/sesión** (commits individuales solo si un PR levanta sospecha).
> 2. Navegación: **build local en el sandbox con datos reales** (creds públicas Supabase anon +
>    Playwright, flag `AUTH_ENFORCED` apagado). Páginas admin incluidas.
> 3. Flujo por etapa: **informe de hallazgos → OK de Lautaro hallazgo por hallazgo → recién ahí corregir**.
> 4. Orden: **correctitud primero** (datos → fórmulas → UX → código → infra → historia → síntesis).
> 5. Perspectivas UX: **las 4** (mesa de trading, cliente productor/acopio, mobile ~390px, tema claro+oscuro).
> 6. Fórmulas: **las define Lautaro**. Toda duda se le presenta como PREGUNTA con ejemplo numérico;
>    nunca se asume que una fórmula está mal ni se la "corrige" sin su confirmación.

## Tablero de etapas (actualizar acá el avance)

| Etapa | Tema | Estado | Informe | PR |
|---|---|---|---|---|
| E1 | Datos y base de datos | **cerrada** (fase 2 aplicada; #2 diferido a E5) | `auditoria/E1-datos.md` | #50 |
| E2 | Fórmulas y lógica de negocio | **cerrada** (fase 2 aplicada; calibraciones de umbrales/params MESA y comisiones → E7; tests → E4) | `auditoria/E2-formulas.md` (+ anexo `E2-formulas-fichas.md`, 45 fichas) | #51 |
| E3 | UX / navegación página por página | **fase 1 + fase 2 hechas** (migración H1/H6 aplicada; `sample.ts` sin importadores) | `auditoria/E3-ux.md` | #57 |
| E4 | Código y arquitectura | **cerrada** (fase 2 aplicada; refactors grandes → E7; `sample.ts` desbloqueado por E3, borrado) | `auditoria/E4-codigo.md` | #55 |
| E5 | Infraestructura, ingestas y seguridad | **fase 1 hecha** (informe; espera decisión de Lautaro) | `auditoria/E5-infra.md` | #_ |
| E6 | Historia del repo (PRs + sesiones) | **cerrada** (fase 2 aplicada; mitigación DEA-SAGyP → E5) | `auditoria/E6-historia.md` | #56 |
| E7 | Síntesis y backlog maestro | pendiente | `auditoria/E7-sintesis.md` | — |

E1–E6 se ejecutan en ese orden (pueden intercalarse con los ciclos de corrección de etapas ya
aprobadas). **E7 es la única que exige que las 6 anteriores estén cerradas.**

## Modelo y estrategia de agentes por etapa (elegir el modelo AL ABRIR la sesión)

> Regla general: donde la etapa exige **juicio** (re-derivar fórmulas, evaluar seguridad, priorizar),
> usar el mejor modelo disponible (**Fable mientras dure; después Opus**); donde el trabajo es
> **mecánico con patrón claro** (recorrer, capturar, listar), **Sonnet** alcanza y rinde más por
> token. Los subagentes sugeridos son de solo lectura, para paralelizar — el ejecutor los lanza desde
> su sesión; nunca reemplazan la verificación propia.

| Etapa | Modelo | Estrategia de agentes sugerida |
|---|---|---|
| E1 | **Fable / Opus** (razonamiento sobre esquemas + SQL adversarial) | Subagentes en paralelo, uno por familia de cotejo contra fuente (CEM · Barchart · CAC · MAGyP · USDA/CONAB); el análisis de diseño y advisors lo hace la sesión principal |
| E2 | **Fable / Opus** (la etapa más exigente) | Verificación adversarial: para cada familia de fórmulas, un subagente RE-DERIVA el cálculo desde los docs SIN mirar la implementación; la sesión compara resultado vs código. Las fichas las escribe la sesión principal |
| E3 | **Sonnet** para recorrer/capturar; el juicio de las 4 lentes con **Opus** si está disponible | Paralelizar por grupo de páginas (públicas · comercio/mesa · admin+auth) con subagentes que navegan y capturan; el veredicto por página lo da la sesión principal |
| E4 | **Sonnet** | Subagentes por dimensión (duplicación · tests · perf/bundles); apoyarse en /code-review para el barrido |
| E5 | **Fable / Opus** (decisiones de seguridad y arquitectura) | Subagentes para leer runs de Actions en paralelo (uno por grupo de workflows); el análisis de riesgo lo hace la sesión principal |
| E6 | **Sonnet** (lectura mecánica de PRs/bitácoras) | Subagentes por lotes de ~10 PRs; la consolidación de contradicciones la hace la sesión principal |
| E7 | **Fable / Opus** (síntesis y priorización) | SIN paralelizar: necesita todo el cuadro junto |

## Reglas transversales (valen para TODAS las etapas; cada prompt las repite)

- **Protocolo del repo** (`docs/ESTADO.md`): rama `claude/auditoria-eN-<tema>` creada desde `main`
  actualizado; commits chicos; 1 PR por etapa, base `main`, draft hasta el OK; al cerrar, doc de
  sesión en `docs/sesiones/` + actualizar «Ahora» de `ESTADO.md`.
- **Dos fases dentro de la etapa**: (1) AUDITAR y entregar el informe **sin tocar nada** del código;
  (2) tras el OK de Lautaro hallazgo por hallazgo (columna «Decisión» del template), implementar SOLO
  lo aprobado, en la misma rama/PR. Lo aprobado pero grande (refactor, rediseño) NO se implementa en
  la etapa: se anota «diferido a E7» y se prioriza en el backlog maestro.
- **Informe**: `docs/auditoria/EN-<tema>.md` copiando [`auditoria/_TEMPLATE.md`](auditoria/_TEMPLATE.md).
  Cada hallazgo con evidencia verificable (archivo:línea, SQL corrido, screenshot, request real) —
  **cero hallazgos especulativos**: si no se pudo verificar, va en «Dudas», no en «Hallazgos».
- **No suponer**: toda ambigüedad de negocio/dato/alcance se le pregunta a Lautaro (AskUserQuestion),
  con contexto suficiente para responder sin scrollear. Preferir preguntar antes que asumir.
- **Código eficiente y no redundante** en toda corrección; español rioplatense, conciso.
- **Nunca** pushear a `main`, ni abrir PRs contra ramas `claude/*`, ni commitear secretos o bypasses
  locales de auth (ver E3).

## Preparación de entorno (referencia común; cada prompt trae su versión)

- `npm install` (el sandbox arranca sin `node_modules`).
- `.env.local` (gitignoreado) con `SUPABASE_URL` + `SUPABASE_ANON_KEY`: obtenerlos por el MCP de
  Supabase (`get_project_url` + `get_publishable_keys`, proyecto `lineup-argentina`, ref
  `gbpfgfeksqmzmsxnxiwg`). Son credenciales públicas (RLS solo-lectura); las de A3 NO hacen falta
  (los paneles degradan solos sin ellas).
- Datos reales en local: `NODE_USE_ENV_PROXY=1 npm run build && npm run start` (el fetch de Node no
  usa el proxy del sandbox sin esa var).
- Navegador: Playwright con `executablePath: '/opt/pw-browsers/chromium'` (NO correr
  `playwright install`).
- `npm run lint` + `npx tsc --noEmit` + `npm run build` antes de cualquier push (es lo que corre el CI).

---

# PROMPT E1 — Auditoría de datos y base de datos

Copiá desde acá hasta el fin del bloque en una sesión nueva:

```text
Sos el auditor de la etapa E1 (datos y base de datos) de la auditoría integral de RF AGRO.
Leé primero docs/PLAN_AUDITORIA.md (reglas transversales y este mismo encargo), docs/ESTADO.md y
docs/CONTEXTO.md. Trabajá en una rama claude/auditoria-e1-datos creada desde main actualizado.
FASE 1 = SOLO AUDITAR: no corregís nada hasta que Lautaro apruebe el informe hallazgo por hallazgo.

OBJETIVO: responder con evidencia "¿la base de datos, como está armada, tiene sentido? ¿lo que hay
guardado es correcto, completo y fresco?" para las 14 tablas, 9 vistas, 4 matviews y ~17 RPCs del
proyecto Supabase `lineup-argentina` (ref gbpfgfeksqmzmsxnxiwg). Tenés el MCP de Supabase (solo
lectura: list_tables, execute_sql para SELECTs, get_advisors). NO escribas en la base en fase 1.

QUÉ AUDITAR:
1. ESQUEMA — Dumpear el DDL vivo (columnas, tipos, PK/uniques, índices, RLS/policies, grants) de las
   5 tablas heredadas SIN migración de creación en el repo: djve, lineup, cbot_cierres,
   pizarra_historico, compras (las migraciones de supabase/migrations/ solo las alteran). Proponer
   versionarlo como migración-baseline. Evaluar el diseño de TODAS las tablas: claves naturales vs
   surrogate, tipos (numeric vs float, text vs enum), índices faltantes/sobrantes.
2. FRESCURA — última fecha por tabla vs su cadencia esperada (cierres y pizarra = diaria hábil,
   lineup = 2/día, compras = semanal, djve = diaria, noticias = horaria, estimaciones = por informe).
   Cruzar con los umbrales de scripts/healthcheck-frescura.mjs y señalar los huecos de monitoreo
   (se sabe que el healthcheck NO cubre compras, djve ni las matviews de mesa).
3. INTEGRIDAD — por tabla: duplicados por clave lógica, huecos de fechas hábiles, valores anómalos
   (outliers tipo ÷1000 — ya pasó en compras la semana del 08/07 — y >1e9 — ya pasó con floats mal
   parseados), montos negativos donde no corresponde, monotonía de los acumulados de compras,
   consistencia inter-objetos (compras vs compras_avance_hist; djve vs djve_cobertura/djve_embarques_mes;
   lineup vs sus 3 matviews; futuros_cierres vs futuros_cierres_ultimo vs vencimientos).
4. COTEJO CONTRA FUENTES — 5 a 10 valores por tabla contra la fuente primaria con requests reales:
   futuros_cierres ↔ API CEM (apicem.matbarofex.com.ar/api/v2/closing-prices, pública), cbot_cierres ↔
   Barchart, pizarra_historico ↔ CAC-BCR, djve y compras ↔ MAGyP, estimaciones_produccion ↔
   WASDE/CONAB/GEA/DEA, lineup ↔ HTML vivo de ISA (si accesible). Si una fuente no responde desde el
   sandbox, decilo y cotejá con lo que haya (docs de sesión traen valores verificados, ej. trigo 25/26
   Export 16.238.900 t). Cada cotejo queda documentado con el request y el valor obtenido.
5. DISEÑO/ALMACENAMIENTO — ¿matview vs vista es la elección correcta en cada caso (frecuencia de
   refresh vs costo de query)? ¿El crecimiento de lineup (~510k filas, snapshots diarios acumulados)
   es sostenible y está bien modelado (¿conviene tabla de visitas dedup materializada como está)?
   ¿calendario_informes (0 filas, el calendario se genera en código) tiene razón de existir?
   ¿La semántica de compras.fuente (LEGACY/AGROCHAT/MAGYP) es sólida o es una bomba de tiempo (ya
   causó 3 versiones de la matview)? ¿empresas/profiles/access_log/sesiones_activas están bien para
   el encendido del login?

HALLAZGOS SEMILLA (ya confirmados el 21/07 con get_advisors — verificá vigencia y completá el detalle,
no los re-descubras):
- 4 matviews de mesa legibles por anon vía API REST: lineup_visitas, lineup_densidad_hist,
  lineup_gap_hist, compras_avance_hist. Contradice el modelo "solo mesa" de /comercio/*. OJO: hoy con
  AUTH_ENFORCED apagado TODA la base de lectura es pública a propósito → esto es una DECISIÓN de
  modelo de datos que hay que ponerle enfrente a Lautaro (¿qué debe quedar público cuando prenda el
  login? ¿y mientras tanto?), no un fix automático.
- ~17 funciones SECURITY DEFINER ejecutables por anon y/o authenticated vía PostgREST (admin_*,
  registrar_sesion, tocar_sesion, handle_new_user, ingest_cierres_cem, refresh_compras_avance, etc.).
  Verificar UNA POR UNA cuáles tienen guard interno (is_admin() / service_role) y cuáles quedan
  efectivamente abiertas; probar con la anon key qué pasa al llamarlas. Especial atención:
  ingest_cierres_cem (¿escritura disparable por anon?) y registrar_sesion (spam).
- Leaked password protection de Supabase Auth deshabilitada.
- campana_ini_year sin search_path fijo.
- Performance: policies RLS con auth.<fn>() sin (select …) en profiles/access_log/sesiones_activas;
  policies permisivas duplicadas en empresas/profiles/sesiones_activas; FK profiles_approved_by sin
  índice; índices nunca usados: idx_lineup_port, estimaciones_lookup_idx, profiles_estado_idx.

ENTREGABLE: docs/auditoria/E1-datos.md copiando docs/auditoria/_TEMPLATE.md — hallazgos priorizados
con evidencia + sección «Dudas/decisiones para Lautaro» (ej. modelo de visibilidad de datos) +
propuesta de fix por hallazgo. Commit + PR draft base main. Presentale el informe a Lautaro y esperá
su decisión hallazgo por hallazgo (AskUserQuestion). FASE 2: implementá SOLO lo aprobado (migraciones
por el MCP con apply_migration si él lo aprueba, o dejarlas en el repo para aplicar después — preguntale);
lo aprobado pero grande se marca «diferido a E7». Cerrá con doc de sesión + ESTADO.md «Ahora».
Regla de oro: nada especulativo; lo no verificado va en «Dudas».
```

---

# PROMPT E2 — Auditoría de fórmulas y lógica de negocio

```text
Sos el auditor de la etapa E2 (fórmulas y lógica de negocio) de la auditoría integral de RF AGRO.
Leé primero docs/PLAN_AUDITORIA.md, docs/ESTADO.md, docs/CONTEXTO.md, docs/FORMULAS_EXCEL.md y
docs/negocio/ (01, 02 y 05 como mínimo). Rama claude/auditoria-e2-formulas desde main.
FASE 1 = SOLO AUDITAR. REGLA CENTRAL: las fórmulas las define Lautaro. Si una fórmula te parece
incorrecta, incompleta o inconsistente con los docs, NO la marques como error: presentásela como
PREGUNTA con un ejemplo numérico concreto ("con futuro 300, pizarra 280 y 45 días, hoy da X; ¿es lo
que esperás o debería dar Y porque Z?"). Solo es «hallazgo» un bug objetivo (código que no implementa
lo que el propio repo documenta, división por cero, etc.).

MÉTODO por cada fórmula/lógica: (a) leer la implementación; (b) re-derivarla y contrastarla contra
FORMULAS_EXCEL.md / CONTEXTO.md («Metodología de fórmulas») / docs/negocio/; (c) verificarla con UN
ejemplo numérico con datos reales (de la base por MCP Supabase o de la fuente) y dejar el ejemplo
escrito en la ficha; (d) revisar bordes: días=0 o negativos, división por 0, posiciones vencidas,
base 365 consistente (act/365 en todo), redondeos/formato es-AR, campañas que cruzan año.
Preparación para los datos: npm install; .env.local con SUPABASE_URL/SUPABASE_ANON_KEY obtenidas por
el MCP de Supabase (get_project_url + get_publishable_keys, ref gbpfgfeksqmzmsxnxiwg).

INVENTARIO COMPLETO A CUBRIR (ubicaciones ya relevadas el 21/07; si aparece lógica nueva, sumala):
1. Calculadoras — las 9 de src/lib/calculadoras.ts (a-fijar · por-porcentaje · negocios-con-pagos ·
   pago-diferido · pases · carry · costos · estrategias · negocios-de-planta; que NINGUNA quede sin
   ficha). Sus libs: fijar.ts (delta, TNA implícita, precioTasa), porcentaje.ts, diferido.ts (interés
   simple base 365 + inversas — cubre negocios-con-pagos Y pago-diferido: verificá los dos usos),
   pases.ts, arbitraje.ts (carry: tasaDirecta, tnaUSD act/365, teaUSD), costos.ts (¿el tarifario
   Cocos ARANCELES sigue vigente? cotejalo contra la web de Cocos), estrategias.ts (payoff por patas,
   27 PRESETS, primas por defecto pr() que decaen con la distancia al ATM — ¿criterio validado por
   Lautaro?, breakevens por interpolación, serieEscenarios ±3S) y src/components/calc-planta.tsx
   (ÚNICA calculadora con la fórmula inline en el componente: auditá los 6 rubros de descuento y
   proponé extraerla a lib).
2. Paneles granos: arbitrajes-cierres.ts (columna dinámica ajuste/último operado según rueda,
   recálculo de spread/directa/TNA sobre esa referencia), pases-cierres.ts (pase entre posiciones
   consecutivas, spreadSymbol A3), capacidad.ts (FAS teórico BCR: ¿la 2ª columna del HTML sigue
   siendo Up River?), mejor-caja (ranking por menor TNA), curva.ts/futuros.ts (filtro de posiciones
   vivas: ¿las DOS implementaciones dan lo mismo?).
3. Dólar/tasas: src/lib/market.ts — dólar futuro (directa, TNA, TEA=(Fut/Spot)^(365/d)−1, TEM),
   dólar linked (TC implícito px/100, spread vs oficial MAE), parsers de ticker parseDdf/vencFromTicker,
   LECAPs. Referencia = oficial mayorista MAE (UST$T): verificá que siga siendo ese ticker.
4. Mesa/comercio (src/lib/lineup/*, portado 1:1 de LineUps_Code Python): cobertura.ts (umbrales
   0.7/1.3 y mínimo 5000 t: literales del Python — ¿Lautaro los valida o eran provisorios?),
   estacional.ts (percentil estacional, ventana ±15d, mínimo 2 campañas), mesa_calor.ts (pesos
   0.35/0.30/0.35, bandas, matriz banda×dirección→acción, equivalente poroto 0.745 harina/0.19 aceite),
   temperatura.ts (3 patas, farmer selling por percentil calendario, SOJA_CRUSH sintético),
   semaforo.ts (cruce señal física × capacidad de pago), empresas.ts (gap 60d, avance, ritmo
   estacional k=0 vs k=1..5, PY/UY aparte), embarque.ts (programa mensual DJVE, cumplimiento solo mes
   en curso, mapeo a posición A3 en a3De()), campanas.ts (inicios de campaña por grano — cotejar con
   la función SQL campana_ini_year: ¿idénticas?).
5. Otros: compras/negociado.ts (campaña activa = mayor venta semanal, % sobre cosecha, % priceado,
   saldo a fijar), estimaciones.ts (Δ entre vintages, campaniaVigente prefiere campaña con producción),
   calendario.ts (~530 líneas: seeds 2026, reglas por día de semana, conversión wall-clock→UTC→AR con
   DST de EEUU/Brasil, feriados), derivadas.ts (joinFfill ≤3 ruedas, spread/ratio, alineación
   días-al-vto, percentil/mediana/bandas), noticias.ts (clustering jaccard≥0.5, score de relevancia,
   briefing), monitor-mercados.ts (¢/bu→USD/tn con los factores de ingest-cbot, maní ZCE en CNY→USD,
   parser de posición continua), habiles.ts/dates.ts (feriados hardcodeados, diasEntre a mediodía).
6. Transversal: los 6 parsers de mes/posición duplicados (curva, futuros, derivadas, embarque,
   market, monitor-mercados) — ¿devuelven lo mismo para los mismos inputs? Probálos.

ENTREGABLE: docs/auditoria/E2-formulas.md (usar _TEMPLATE.md) + un anexo «Fichas de fórmulas»: una
ficha por fórmula con {fórmula, implementación (archivo:línea), ejemplo numérico verificado, veredicto
OK / bug objetivo / PREGUNTA a Lautaro}. Las fichas después sirven de fixtures para los tests de E4 —
escribilas con números exactos. Commit + PR draft base main; informe → decisión de Lautaro por
hallazgo/pregunta → FASE 2 implementar solo lo aprobado (grande = «diferido a E7»). Cerrá con doc de
sesión + ESTADO.md. lint/tsc/build antes de pushear.
```

---

# PROMPT E3 — Auditoría UX / navegación página por página

```text
Sos el auditor de la etapa E3 (UX y navegación) de la auditoría integral de RF AGRO. Leé primero
docs/PLAN_AUDITORIA.md, docs/ESTADO.md, docs/CONTEXTO.md y los planes de origen de cada página
(docs/PLAN_UX_NAVEGACION.md, PLAN_PUERTOS.md, PLAN_MONITOR_MERCADOS.md, PLAN_LOGIN.md,
PLAN_GRAFICOS_SPREADS.md, PLAN_CALENDARIO_PRODUCCION.md). Rama claude/auditoria-e3-ux desde main.
FASE 1 = SOLO AUDITAR (una excepción técnica local abajo).

PREPARACIÓN: npm install; .env.local (gitignoreado) con SUPABASE_URL y SUPABASE_ANON_KEY obtenidas
por el MCP de Supabase (get_project_url + get_publishable_keys, proyecto ref gbpfgfeksqmzmsxnxiwg;
son claves públicas, RLS solo-lectura). Levantar con datos reales:
NODE_USE_ENV_PROXY=1 npm run build && npm run start. Navegar con Playwright usando
executablePath '/opt/pw-browsers/chromium' (NO playwright install). AUTH_ENFORCED queda apagado.
EXCEPCIÓN TÉCNICA: las páginas /admin y /comercio/{puertos,empresas,embarques,negociado,senal,
temperatura} exigen admin SIEMPRE (requireAdmin en src/lib/auth/dal.ts). Para poder verlas, hacé un
bypass LOCAL y TEMPORAL (ej. variable de entorno local que haga requireAdmin NO-OP, o comentar el
gate) que JAMÁS se commitea: antes de cada commit verificá con git diff que no queda rastro.

RECORRIDO: TODAS las rutas × 4 lentes × 2 temas × 2 viewports (~1440px y ~390px):
- (site): / (home), /granos, /dolar, /comercio, /comercio/puertos, /comercio/empresas,
  /comercio/embarques, /comercio/negociado, /comercio/senal, /comercio/temperatura, /calculadoras,
  /calculadoras/<los 9 slugs>, /graficos (los 2 modos, con interacción), /produccion, /noticias,
  /sin-acceso.
- (auth): /ingresar, /registro, /recuperar, /recuperar/actualizar, /completar, /pendiente,
  /sesion-cerrada. Y /bienvenida (landing).
- /admin (4 pestañas + /admin/datos con el uploader). Una ruta inexistente (404).
LENTES: (a) MESA — densidad de información, velocidad de lectura, frescura visible (sellos "datos al
HH:MM"), ¿el flujo de decisión (DIFERIR/VENDER YA/etc.) se entiende de un vistazo?; (b) CLIENTE
productor/acopio — ¿se entiende sin jerga? ¿los "¿Qué es esto?" alcanzan y están donde hace falta?
¿el onboarding landing→registro→pendiente es claro?; (c) MOBILE ~390px — tablas anchas (¿scrollean
bien?), cinta, gráficos, calculadoras táctiles, nav horizontal; (d) TEMA claro y oscuro — contraste,
marca de agua de charts, legibilidad de gráficos.

POR PÁGINA respondé explícitamente y por escrito:
1. «¿Muestra la información que Lautaro quería que muestre?» — cotejá contra el plan/doc de sesión
   que la originó (citá el doc). Si el plan y la página divergen, hallazgo; si el plan es ambiguo,
   pregunta a Lautaro.
2. ¿Qué se ve cuando una fuente falla? (degradación: probá matando la var de entorno o simulando
   Supabase caído si es viable; si no, auditá el código del estado vacío).
3. ¿Qué es mejorable con criterio objetivo? (jerarquía, redundancia, faltantes, textos, accesibilidad,
   performance percibida — qué bloquea el render).
4. Coherencia global: jerarquía del home, breadcrumbs, páginas huérfanas, consistencia de sellos de
   fuente, nomenclatura entre secciones.

HALLAZGOS SEMILLA (confirmados 21/07 — verificá y completá):
- La pizarra de la cinta del home sigue siendo EJEMPLO hardcodeado (src/lib/market.ts:250-252,
  sample:true) pese a que la pizarra real de CAC ya existe en pizarra.ts/pizarra_historico.
- implicitas-panel.tsx consume sample.ts (datos de ejemplo en producción) — es LA razón del noindex
  global del sitio. Preguntar a Lautaro qué quiere: implementarlo real (granos+dólar reales ya están)
  o sacarlo.
- Conviven arbitrajes-table.tsx y arbitrajes-editable.tsx: verificar si ambos se usan o uno es muerto.

ENTREGABLE: docs/auditoria/E3-ux.md (usar _TEMPLATE.md), organizado POR PÁGINA (así Lautaro decide
página por página), + carpeta docs/auditoria/screenshots-e3/ con capturas nombradas
<ruta>--<tema>--<viewport>.png (comprimidas; si pesan mucho, solo las que evidencian hallazgos).
Commit + PR draft base main; informe → decisión de Lautaro → FASE 2 implementar solo lo aprobado
(rediseños grandes = «diferido a E7»). Cerrá con doc de sesión + ESTADO.md. lint/tsc/build antes de
pushear y git diff limpio de bypasses.
```

---

# PROMPT E4 — Auditoría de código y arquitectura

```text
Sos el auditor de la etapa E4 (código y arquitectura) de la auditoría integral de RF AGRO. Leé
primero docs/PLAN_AUDITORIA.md, docs/ESTADO.md, docs/CONTEXTO.md y, si ya existen,
docs/auditoria/E1-datos.md y E2-formulas.md (sus hallazgos alimentan esta etapa — en particular las
fichas de fórmulas de E2, que acá se vuelven tests). Rama claude/auditoria-e4-codigo desde main.
FASE 1 = SOLO AUDITAR. Ojo: este es un repo Next.js 16 con breaking changes — leé la guía en
node_modules/next/dist/docs/ antes de opinar sobre patrones de Next (ej. proxy.ts ES el middleware).

QUÉ AUDITAR:
1. DUPLICACIÓN (semilla ya relevada el 21/07 — verificá, completá y proponé estrategia por caso):
   (a) 6 espejos manuales lib↔script que hay que mantener en sync a mano: noticias-clasificar.ts ↔
   scripts/ingest-noticias.mjs; compras/parse-agrochat.ts ↔ scripts/cargar-compras.mjs;
   lineup/campanas.ts ↔ SQL campana_ini_year; ADMIN_SEED_EMAILS (auth/config.ts) ↔ migración
   handle_new_user ↔ env ADMIN_EMAILS; factores ¢/bu→USD/tn en monitor-mercados.ts ↔ ingest-cbot.mjs.
   Para cada espejo: ¿módulo compartido, generación, o test de paridad que grite cuando divergen?
   (b) parsers de mes/posición (MESES/vencKey/vtoDePosicion) repetidos en curva.ts, futuros.ts,
   derivadas.ts, lineup/embarque.ts, market.ts, monitor-mercados.ts → proponer 1 util única.
   (c) fmtFecha duplicado (auth/admin.ts vs habiles.ts) y parser de user-agent duplicado
   (auth/admin.ts vs auth/session-id.ts).
2. ESTRUCTURA: market.ts monolítico (~535 líneas, con TODOs "Fase B/C" adentro: extraer tickers.ts,
   LECAPs sin TIR) → propuesta de partición; sample.ts (plan de retiro coordinado con lo que Lautaro
   decida en E3 sobre implicitas-panel — retirarlo habilita evaluar quitar el noindex global);
   globals.css con 1.452 líneas / ~763 clases custom y Tailwind v4 instalado pero casi sin uso en
   JSX → NO proponer migración big-bang: evaluar si el CSS custom está bien organizado (¿secciones,
   naming consistente, clases muertas?) y proponer criterio para lo nuevo. Detectar CSS/código muerto
   con evidencia (grep de uso real).
3. TESTS: hoy CERO (sin runner ni archivos de test; CI = lint+tsc+build). Proponer e implementar (en
   fase 2, si Lautaro aprueba) Vitest + paso en ci.yml, empezando por las libs PURAS ya diseñadas
   para eso: derivadas.ts, estimaciones.ts, compras/parse-agrochat.ts, lineup/mesa_calor.ts,
   lineup/estacional.ts, fijar.ts, diferido.ts, arbitraje.ts, pases.ts, calendario.ts, habiles.ts,
   noticias-clasificar.ts. Los casos salen de las fichas numéricas de E2 (fixtures exactos) — eso
   congela las fórmulas de Lautaro contra regresiones. Sumar tests de paridad para los espejos del
   punto 1 que queden como espejos.
4. CALIDAD: tsconfig sin noUncheckedIndexedAccess (pendiente declarado en CONTEXTO Fase B) — medir
   cuánto cuesta prenderlo; manejo de errores/Result y degradación uniforme entre libs (¿todas
   degradan con Meta/FuenteStatus o hay throws sueltos?); cantidad de fetches por regeneración ISR
   de cada página (¿React.cache() bien usado? ¿hay N+1 contra PostgREST?); tamaño de bundles client
   (npm run build lo reporta) y qué componentes client podrían ser server; imports server-only
   respetados; package.json (¿deps sin uso?).

ENTREGABLE: docs/auditoria/E4-codigo.md (usar _TEMPLATE.md) con hallazgos priorizados por
impacto×esfuerzo, señalando explícitamente los QUICK WINS (borrar muerto, unificar parsers, fixtures)
vs REFACTORS (partir market.ts, estrategia de espejos) — los refactors van «diferido a E7» salvo que
Lautaro pida lo contrario. Commit + PR draft base main; informe → decisión de Lautaro → FASE 2
implementar solo lo aprobado. Los tests nuevos deben correr en CI y pasar. Cerrá con doc de sesión +
ESTADO.md. lint/tsc/build (+ tests) antes de pushear.
```

---

# PROMPT E5 — Auditoría de infraestructura, ingestas y seguridad operativa

```text
Sos el auditor de la etapa E5 (infraestructura, ingestas y seguridad operativa) de la auditoría
integral de RF AGRO. Leé primero docs/PLAN_AUDITORIA.md, docs/ESTADO.md, docs/CONTEXTO.md,
docs/INFRAESTRUCTURA.md, docs/GUIA_LOGIN_SETUP.md y, si existe, docs/auditoria/E1-datos.md (los
hallazgos de advisors de E1 que sean operativos se resuelven acá si Lautaro los aprobó). Rama
claude/auditoria-e5-infra desde main. FASE 1 = SOLO AUDITAR. Tenés MCP de GitHub (runs de Actions:
actions_list/actions_get/get_job_logs) y MCP de Supabase (get_logs, list_edge_functions, get_advisors).

QUÉ AUDITAR:
1. LAS 14 INGESTAS (scripts/*.mjs + supabase/functions/lineup-ingest) — por cada una: (a) revisar los
   últimos ~10 runs reales del workflow en Actions (¿verdes de verdad? ¿cuánto tardan? ¿flaps?). OJO:
   no hay un .yml por ingesta — GEA + DEA + PAS comparten ingest-estimaciones-ar.yml (y PAS corre SOLO
   por workflow_dispatch en modo probe, sin schedule); mapeá script→workflow antes de buscar runs;
   (b) ¿qué pasa si la fuente cambia el HTML/JSON: falla ruidosamente o miente en verde? (el guard
   anti falso-verde existe en casi todos — verificar que cubre TODOS los caminos, no solo el modo
   diario); (c) fragilidad del parser. Ranking de riesgo ya relevado el 21/07 para arrancar:
   ingest-gea (regex sobre HTML BCR, ya se rompió una vez y quedó congelado en feb-2026) >
   ingest-pizarra (JSON embebido en drupalSettings) ≈ ingest-compras (comentarios HTML de widget
   Spry) ≈ ingest-noticias (múltiples parsers regex de 30 fuentes) > ingest-cbot (cookie XSRF +
   rate-limit 429) ≈ lineup-ingest (PHPSESSID + IP São Paulo) > ingest-pas (Cloudflare, NUNCA validado
   — cerrá de una vez: leé el log del último pas_probe y decidí con Lautaro si se activa o se
   descarta con respaldo por mail). Para los 3-4 más frágiles proponé endurecimiento concreto
   (validación de estructura esperada + alerta temprana, no reescritura).
2. MONITOREO — healthcheck-frescura.mjs NO cubre compras, djve ni las matviews MESA; umbrales
   hardcodeados (7d/45d/2d): ¿razonables por tabla? No hay alerta de "workflow en rojo hace N días"
   ni resumen semanal de salud: proponer el mínimo que cierre los huecos (sin infra nueva paga).
3. CRONS — coherencia de horarios UTC vs ART (invierno/verano), solapamientos, concurrency (solo
   noticias lo tiene: ¿los demás lo necesitan?), reintentos (pizarra 3 pasadas / lineup 2: ¿alcanza?),
   y el detalle de que los schedule corren solo desde main.
4. SEGUROS/SECRETOS — secrets de Actions (¿solo SUPABASE_URL/SERVICE_KEY? ¿alcance mínimo?), env vars
   de Vercel por scope, headers de seguridad en next.config, confirmar que no hay secretos en el
   historial git, allowlist del sandbox.
5. CAMINO AL ENCENDIDO DEL LOGIN — recorrer GUIA_LOGIN_SETUP.md contra el estado real: coherencia
   proxy.ts ↔ dal.ts ↔ RLS (¿algún camino donde el flag prendido rompa ISR o deje datos públicos que
   no deberían? — conectar con la decisión de visibilidad de datos que Lautaro tome en E1), sesión
   única, y el riesgo de mantenimiento de los hardcodeos con fecha de vencimiento: seed de
   vencimientos hasta 2027, FERIADOS_AR 2025-2027 en habiles.ts, SEED_ACTUAL=2026 en
   refresh-calendario.mjs y los seeds 2026 hardcodeados como arrays en src/lib/calendario.ts
   (WASDE_2026, CROP_PROGRESS_2026, etc.) — ¿quién y cuándo los renueva? Proponer recordatorio
   automatizado o generación.
6. HOSTING — decisión pendiente declarada: Vercel Hobby es no-comercial y hay que resolver ANTES de
   clientes reales. Armar la comparación (Vercel Pro vs alternativas razonables para Next 16 + ISR +
   server actions) con costos reales y una recomendación, para que Lautaro decida.

ENTREGABLE: docs/auditoria/E5-infra.md (usar _TEMPLATE.md) con hallazgos priorizados + la comparación
de hosting como sección aparte. Commit + PR draft base main; informe → decisión de Lautaro → FASE 2
implementar solo lo aprobado (cambios de workflows/scripts se prueban con workflow_dispatch cuando el
PR llegue a main — dejalo documentado como paso post-merge). Cerrá con doc de sesión + ESTADO.md.
lint/tsc/build antes de pushear.
```

---

# PROMPT E6 — Auditoría de la historia del repo (PRs + sesiones)

```text
Sos el auditor de la etapa E6 (historia del repo) de la auditoría integral de RF AGRO. Leé primero
docs/PLAN_AUDITORIA.md, docs/ESTADO.md y docs/CONTEXTO.md. Rama claude/auditoria-e6-historia desde
main. FASE 1 = SOLO AUDITAR. Tenés MCP de GitHub (list_pull_requests, pull_request_read) y el git
local (~106 commits en main, 06/07→20/07/2026). Nivel acordado con Lautaro: POR PR/SESIÓN — el diff
de commits individuales solo se mira si un PR levanta sospecha.

QUÉ AUDITAR (recorré los ~48 PRs y las ~29 bitácoras de docs/sesiones/ en orden cronológico):
1. PROMESAS ABIERTAS — todo "falta X" / "pendiente" / "FALTA" declarado en PRs y docs de sesión que
   nunca se cerró ni se canceló explícitamente. Semillas conocidas: validar PAS (BCBA) desde Actions
   (log del pas_probe sin leer desde el 12/07); backfill Wayback de compras (DESCARTADO el 19/07 pero
   citado como pendiente en textos previos — limpiar); Fase 2 del feed A3 (histórico intradiario,
   tabla snapshots); sintéticos TIR (espera tabla IAMC de Lautaro); confirmación de migraciones del
   20/07 aplicadas; prueba del uploader por Lautaro logueado; encendido de AUTH_ENFORCED + hosting;
   ítems v2 de gráficos. Armá la LISTA COMPLETA con estado real verificado en el código/base de HOY
   (no confíes en lo que dice el doc: verificá).
2. CONTRADICCIONES — ESTADO.md y CONTEXTO.md vs código real: módulos que dicen "EJEMPLO" y ya son
   reales (o al revés — ej. la cinta dice pizarra ejemplo: ¿ESTADO lo refleja?), conteos/estados
   desactualizados, decisiones registradas en un doc y pisadas después sin actualizar el primero.
3. TRES LISTAS DE PENDIENTES PARALELAS — el backlog de ESTADO.md («Plan RF AGRO»), los «Pendientes»
   de CONTEXTO.md y la lista v2 del panel de gráficos se solapan y divergen. Propuesta concreta de
   consolidación en UNA lista canónica (con Lautaro decidiendo dónde vive).
4. HIGIENE — ramas remotas ya mergeadas que ESTADO manda borrar y siguen vivas (listalas con
   evidencia); PRs cerrados sin merge cuyo contenido se perdió (¿algo valioso quedó afuera?, ej. el
   patrón PR #2); docs de planes ya 100% ejecutados que podrían archivarse o marcarse como cerrados.
5. PATRONES DE PROCESO — con la historia completa a la vista: ¿qué errores se repitieron entre
   sesiones (checkouts desactualizados, migraciones sin aplicar, verificaciones prometidas y no
   corridas)? Proponer 2-3 mejoras al protocolo de ESTADO.md, no más.

ENTREGABLE: docs/auditoria/E6-historia.md (usar _TEMPLATE.md) con: la tabla de promesas abiertas
(promesa · dónde se declaró · estado real verificado · propuesta: hacer/cancelar/preguntar), las
contradicciones con cita exacta, la propuesta de lista única, y la limpieza de ramas/docs. Commit +
PR draft base main; informe → decisión de Lautaro ítem por ítem → FASE 2: implementar SOLO lo
aprobado (correcciones a ESTADO/CONTEXTO, archivado de docs; el borrado de ramas remotas listalo
como comandos para que lo corra Lautaro — no borres ramas vos). Cerrá con doc de sesión + ESTADO.md.
```

---

# PROMPT E7 — Síntesis y backlog maestro

```text
Sos el auditor de la etapa E7 (síntesis final) de la auditoría integral de RF AGRO. Requisito: las
etapas E1–E6 están cerradas (informes en docs/auditoria/E1..E6 con la columna «Decisión» completa y
sus correcciones chicas ya mergeadas). Leé docs/PLAN_AUDITORIA.md, los 6 informes completos,
docs/ESTADO.md y docs/CONTEXTO.md. Rama claude/auditoria-e7-sintesis desde main. Esta etapa NO
descubre hallazgos nuevos: consolida y deja el plan de ejecución de lo que quedó grande.

QUÉ HACER:
1. FUSIONAR los 6 informes: deduplicar hallazgos que aparecieron en más de una etapa (mismo problema
   visto desde datos y desde UX, etc.), arrastrando la decisión de Lautaro de cada uno. Nada aprobado
   puede perderse; nada rechazado puede reaparecer.
2. MATRIZ impacto × esfuerzo de todo lo aprobado-y-pendiente (los «diferido a E7»): impacto para la
   mesa / para clientes / para la robustez; esfuerzo en sesiones estimadas.
3. BACKLOG MAESTRO ÚNICO: la lista consolidada que propuso E6 (reemplaza a las 3 listas paralelas),
   ordenada por la matriz, separando QUICK WINS restantes de REFACTORS, con dependencias explícitas
   (ej. "quitar noindex" depende de "retirar sample.ts"). Integrarle lo que ya vivía en el backlog de
   ESTADO.md que siga vigente (ítems 5, 11-21…), para que quede UNA sola fuente de verdad donde
   Lautaro prioriza.
4. UN PROMPT DE CORRECCIÓN POR LOTE: para cada refactor/lote grande aprobado, escribir un prompt
   autocontenido estilo los de PLAN_AUDITORIA.md (rama, alcance exacto, criterios de aceptación,
   verificación) listo para una sesión futura. Guardarlos en docs/auditoria/E7-sintesis.md.
5. ACTUALIZAR ESTADO.md (el backlog viejo apunta al maestro nuevo) y CONTEXTO.md SOLO si cambió algo
   estable. Marcar el tablero de PLAN_AUDITORIA.md como completo.

ENTREGABLE: docs/auditoria/E7-sintesis.md (resumen ejecutivo de TODA la auditoría en ≤2 páginas
arriba: qué se encontró, qué se corrigió, qué queda y en qué orden — escrito para que Lautaro se lo
pueda leer de una sentada) + backlog maestro + prompts de lotes. Commit + PR draft base main →
presentarlo a Lautaro → ajustar según su feedback → listo. Cerrá con doc de sesión + ESTADO.md.
```

---

## Notas de mantenimiento de este plan

- Cada etapa, al cerrar, actualiza SU fila del tablero de arriba (estado + link al informe + PR).
- Si una etapa descubre algo que le corresponde a otra etapa aún no corrida, lo anota en el informe
  propio bajo «Para E_N» — el prompt de esa etapa lo va a leer (todos arrancan leyendo los informes
  previos disponibles).
- Los hallazgos «semilla» citados en los prompts provienen del relevamiento del 21/07/2026 (dos
  agentes de exploración sobre el repo completo + MCP Supabase vivo + advisors). Si al ejecutar una
  etapa una semilla ya no se verifica, se registra como «resuelto antes de la auditoría» — no se
  fuerza el hallazgo.
