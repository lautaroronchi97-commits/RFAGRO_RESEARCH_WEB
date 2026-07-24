# PLAN DE INFORMES AUTOMATIZADOS + INTERPRETACIÓN — ROFO AGRO

> **Qué es esto.** El plan de ejecución del **ítem 11 del backlog** (informe diario/semanal en
> imagen/PDF para WhatsApp) y de dos proyectos hermanos definidos con Lautaro el 21/07/2026: el
> **view de mercado por grano** y la **interpretación automática de informes de organismos** (ítem 21).
> Son **4 mini-proyectos (MP1→MP4), una sesión de Claude Code por mini-proyecto**: Lautaro abre una
> sesión nueva y pega el prompt correspondiente (autocontenidos, no dependen de ninguna conversación).
> Mismo estándar que [`PLAN_AUDITORIA.md`](PLAN_AUDITORIA.md).

## Tablero de avance

| MP | Tema | Depende de | Estado | PR |
|---|---|---|---|---|
| MP1 | Informe diario (placa PNG para WhatsApp) | — | **código HECHO** — falta que Lautaro cree la Routine diaria (paso manual, prompt en el doc de sesión) | #63 |
| MP2 | Informe semanal (PDF research) | MP1 | **base + gráfico HECHOS** — falta la skill (Lautaro quiere definir qué destacar cada semana antes) + Routine | #63 |
| MP3 | View de mercado por grano (research direccional) | MP1 (patrón; se ejecutó antes — dependencia blanda, ver nota) | **HECHO y MERGEADO** — falta que Lautaro cree la Routine semanal (paso manual, prompt listo en el doc de sesión) | #53 |
| MP4 | Interpretación de informes de organismos (ítem 21) | MP1 | **HECHO** — migración aplicada, probado con un informe real ya ingestado (USDA WASDE #673); primer borrador real queda sin publicar en `/admin/interpretaciones` para que Lautaro lo revise | #67 |

## Modelo recomendado por mini-proyecto (elegir AL ABRIR la sesión / crear la Routine)

| MP | Sesión de build | Routine en producción |
|---|---|---|
| MP1 | **Sonnet** (build con patrón claro); la calibración de la PRIMERA prosa y placa, con el mejor modelo disponible (**Fable/Opus**) — fija la vara | Routine diaria: **mínimo Sonnet** — la prosa con tu voz ES el producto; Haiku la dejaría genérica |
| MP2 | **Sonnet** | Routine semanal: **mínimo Sonnet** (prosa larga) |
| MP3 | **Fable / Opus** (el view es juicio puro: research direccional) | Routine semanal: **Opus** — acá el modelo importa más que en ningún otro lado |
| MP4 | **Sonnet** para el build; la generación de interpretaciones corre en la Routine diaria | Hereda la Routine de MP1 (mínimo Sonnet) |

> El modelo de una Routine queda fijado al crearla; cambiar el de una existente es con
> `update_trigger` y SOLO a pedido explícito de Lautaro. Si Fable sigue disponible al ejecutar,
> usarlo para MP3 y para la calibración inicial de MP1.

## Decisiones de Lautaro (21/07/2026)

1. **Contenido del diario**: los 4 bloques de datos de la web (granos A3+pizarra · dólar/tasas ·
   Chicago+macro · noticias+agenda) **+ su "color de la rueda"** (lo que él vio ese día: negocios,
   sensaciones), al estilo de sus posteos "Mesa de operaciones" de X (ejemplos reales en
   `.claude/skills/voz-lautaro/references/ejemplos.md`). **No debe abrumar: es diario.**
2. **Prosa IA desde v1**: título de la jornada + comentario general + 1-2 líneas por grano, con la
   skill `voz-lautaro`.
3. **Motor: la suscripción de Claude que Lautaro ya paga**, vía Routines de Claude Code (sesiones
   programadas). Gasto extra mínimo o nulo. Plan B documentado abajo.
4. **Entrega: mail a Lautaro (Resend) + sección `/informes` en la web.** Él reenvía por WhatsApp a mano
   (10 segundos y cero riesgo de que salga solo un informe con un dato errado).
5. **Color de la rueda: formulario en /admin; si un día no cargó nada, el informe sale igual** solo con
   los datos automáticos (degrada, nunca se traba).
6. **Formato: diario = placa PNG vertical (se lee entera en WhatsApp) · semanal = PDF de 3-5 páginas**
   tipo research de ALyC/banco (gráficos + interpretación). Branding = el de la web: tokens de
   `src/app/globals.css` + `public/rofoagro-logo.svg`/`rofoagro-isotipo.svg`.
7. **View de mercado: semanal, soja/maíz/trigo, interno mesa primero** (se abre a clientes cuando
   Lautaro valide la calidad); alimenta el informe semanal.
8. **Interpretaciones de organismos: borrador → OK de Lautaro en /admin → publicar.** Su firma nunca
   sale sin su ojo.

## Arquitectura común (el "worker" y la evaluación de lo que sugirió el amigo)

**El consejo del amigo, evaluado:**
- *"Necesitás un worker (no podés local salvo PC 24/7)"* → **correcto como concepto**, y ya está
  resuelto sin infra nueva: **Routines de Claude Code** — un cron que dispara una **sesión nueva de
  Claude en la nube** en el entorno del repo, sin PC prendida. Corre con la **suscripción que Lautaro
  ya paga** (tokens incluidos), que fue el pedido explícito ("quemar mis tokens, no gastar plata").
- *"Usá OpenRouter con Claude Haiku"* → **no hace falta por ahora**: OpenRouter es un intermediario
  para rutear entre proveedores; acá no hay necesidad multi-proveedor, y agrega un peaje por request
  y un tercero más en la cadena. Además Haiku solo dejaría la prosa con voz genérica (imitar la voz es
  la parte difícil).
- **Plan B (si las Routines resultaran poco confiables o los tokens de la suscripción no alcanzaran):**
  GitHub Actions (cron, ya es el patrón del repo) + **API de Anthropic directa** — Haiku 4.5 para lo
  mecánico y Sonnet 5 para la prosa. Costo estimado por informe diario: centavos de dólar (unos pocos
  miles de tokens de entrada + salida). Requiere cuenta de API y `ANTHROPIC_API_KEY` como secret.
  El switch es barato porque la skill y la plantilla no cambian: solo cambia QUIÉN redacta la prosa.

**Piezas comunes que MP1 construye y los demás reusan:**
- **Plantilla = página Next oculta** (`/informes/plantilla/...`, gateada por token en env): renderiza
  la placa/PDF **reusando las libs de datos existentes** (`arbitrajes-cierres`, `pizarra`, `market`,
  `monitor-mercados`, `noticias`, `calendario`, `compras/negociado`) y el CSS real de la web → cero
  duplicación de lógica y branding 1:1.
- **Skills del repo** (`.claude/skills/informe-diario/`, etc.): el procedimiento operativo que la
  sesión programada sigue paso a paso. La Routine solo dice "corré la skill X".
- **Supabase**: tablas `mesa_color`, `informes_generados` (+ `views_mercado` en MP3,
  `interpretaciones` en MP4), bucket privado de Storage `informes`, RPCs de escritura guardadas.
- **Entrega**: Resend (ya integrado en el repo) con el archivo adjunto + página `/informes` que lista
  el histórico con signed URLs.
- **Env vars del entorno de Claude Code** (las configura Lautaro una vez): `SUPABASE_URL`,
  `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_EMAILS`, `INFORME_TOKEN`.

## Reglas transversales (cada prompt las repite)

- Protocolo `docs/ESTADO.md`: rama `claude/informes-mpN-<tema>` desde `main` actualizado; 1 PR por
  mini-proyecto, base `main`, draft hasta verificado; doc de sesión + «Ahora» al cerrar;
  `npm run lint` + `npx tsc --noEmit` + `npm run build` antes de pushear.
- **No suponer**: dudas de negocio/contenido/tono → preguntar a Lautaro (AskUserQuestion). Las
  fórmulas y los umbrales los define él.
- **Nunca inventar datos** en la prosa: si un dato no está, se describe cualitativamente o se omite
  (regla dura de la skill `voz-lautaro`).
- Migraciones: dejarlas en `supabase/migrations/` y aplicarlas por MCP (`apply_migration`) con OK de
  Lautaro en la sesión.
- Repo Next.js 16 con breaking changes: leer `node_modules/next/dist/docs/` antes de escribir código.

---

# PROMPT MP1 — Informe diario (placa PNG para WhatsApp)

```text
Sos el ejecutor del mini-proyecto MP1 (informe diario) de ROFO AGRO. Leé primero docs/PLAN_INFORMES.md
COMPLETO (decisiones de Lautaro y arquitectura común — este encargo las asume), docs/ESTADO.md,
docs/CONTEXTO.md, la skill .claude/skills/voz-lautaro/SKILL.md Y sus references/ejemplos.md (los
posteos reales "Mesa de operaciones" son EL modelo del informe); y si ya existe
docs/auditoria/E1-datos.md, leelo también: la visibilidad de las tablas nuevas que vas a crear debe
respetar lo que Lautaro haya decidido ahí sobre datos públicos/privados. Rama
claude/informes-mp1-diario desde main. Preparación: npm install; .env.local con SUPABASE_URL/SUPABASE_ANON_KEY vía MCP de
Supabase (get_project_url + get_publishable_keys, ref gbpfgfeksqmzmsxnxiwg); datos reales locales con
NODE_USE_ENV_PROXY=1; Playwright con executablePath '/opt/pw-browsers/chromium'.

OBJETIVO: que todos los días hábiles, post-cierre, se genere solo una PLACA PNG vertical (~1080×1600)
de research diario con la marca de la web, mezclando los datos automáticos + el "color de la rueda"
que Lautaro carga a mano + prosa redactada con su voz; que le llegue por mail y quede en /informes.
Regla de oro: es DIARIO — no debe abrumar. Una placa que se lee en 30-60 segundos.

CONSTRUIR (en este orden):
1. MIGRACIÓN supabase/migrations/: tabla mesa_color (fecha date PK, texto text, actualizado timestamptz)
   — RLS: SELECT solo authenticated admin, escritura vía RPC admin_upsert_mesa_color con guard is_admin()
   (patrón de admin_upsert_compras en 20260720120000). Tabla informes_generados (id, tipo
   'diario'|'semanal', fecha date, path_png text, path_pdf text, titulo text, prosa jsonb, estado
   'borrador'|'enviado', creado_en) — escritura solo service_role; SELECT anon SOLO de filas
   estado='enviado' (la página pública lista desde ahí). Bucket privado de Storage `informes`.
   Aplicar por MCP con OK de Lautaro.
2. ADMIN: campo "Color de la rueda" en /admin/datos (pestaña nueva o sección): textarea grande,
   usable desde el celular, con la fecha de hoy precargada y lo último guardado visible; server action
   → RPC. Seguí el patrón de src/app/admin/datos/ existente.
3. DATOS DEL DÍA: route handler /api/informes/datos?fecha= con auth por HEADER
   `Authorization: Bearer <INFORME_TOKEN>` (401 sin él; NO por query string — decisión E5 #12a,
   y compare timing-safe: copiá el patrón de /api/views/insumos) que devuelve el JSON del día
   REUSANDO las libs existentes (no dupliques lógica):
   granos = getArbitrajes/pizarra (ajustes A3 con variación vs rueda anterior + pizarra CAC $ y USD),
   dólar = market.ts (mayorista, DLR próximas 2-3 posiciones con TNA, brecha), chicago =
   getMonitorMercados (los 5 de Chicago en USD/tn + Δ), noticias = getNoticias (top 3-4 del día),
   agenda = calendario.ts (informes de hoy/mañana), color = mesa_color de la fecha (o null).
4. PLANTILLA: página src/app/informes/plantilla/diario/page.tsx (server, dynamic, gateada por el
   mismo token por searchParam; robots noindex; excluida de la nav): la placa 1080 de ancho con el
   diseño de la web (tokens de globals.css, logo, JetBrains Mono para números, semáforo 🟢🔴🟡).
   Estructura (espejo del molde "Mesa de operaciones" de la skill): header con logo + "Mesa de
   operaciones Agro 🚜 [fecha]" + TÍTULO DE LA JORNADA (de la prosa) → comentario general (bullets,
   incluye el color de Lautaro integrado) → bloques Soja/Maíz/Trigo (precio + variación + 1 línea) →
   franja dólar & Chicago → pie con 2-3 titulares + agenda + disclaimer y sello "datos al HH:MM".
   Toma la prosa de informes_generados (fila borrador de la fecha). Antes de codificar el layout
   definitivo: generá 2 bocetos (tema claro y tema pizarra oscura) con datos reales y preguntale a
   Lautaro cuál va (AskUserQuestion con screenshots).
5. SKILL .claude/skills/informe-diario/SKILL.md: el procedimiento que la sesión programada ejecuta:
   (a) fetch del JSON de /api/informes/datos — la URL BASE viene de la env INFORME_BASE_URL
   (producción para la Routine; http://localhost:3000 para pruebas locales; token de env);
   (b) redactar la prosa con voz-lautaro — molde "Mesa de operaciones", registro placa (emojis
   funcionales sí, hashtags no), integrando el color de Lautaro si existe; NUNCA inventar un número:
   todos los datos salen del JSON; si un bloque vino degradado, se omite con gracia; (c) guardar
   {titulo, comentario, lineas_por_grano} en informes_generados (service key de env, estado borrador);
   (d) screenshotear la plantilla (misma URL base) con Playwright a PNG; (e) subir el PNG al bucket
   informes; (f) mandar el mail por Resend a ADMIN_EMAILS con el PNG adjunto y asunto "Informe diario
   ROFO AGRO — [fecha]"; (g) marcar estado='enviado'. Incluir modo de prueba (--fecha) y qué hacer si
   una fuente falla (generar igual, anotar la degradación en el mail).
6. PÁGINA /informes: lista del histórico (placa del día grande + archivo por fecha), signed URLs del
   bucket. Sección nueva "informes" en SECCIONES_META de src/lib/auth/config.ts (verificá que el
   panel admin de empresas la muestre en los checkboxes) + tarjeta en la grilla del home + nav.
   Con AUTH_ENFORCED apagado queda pública como el resto — correcto por ahora.
7. ROUTINE (paso manual de Lautaro, dejalo documentado en el PR y guialo): crear el trigger desde su
   sesión de Claude con create_trigger: cron "30 21 * * 1-5" (18:30 ART post cierre agro y pizarra —
   él ajusta), sesión nueva por disparo, prompt: "Corré la skill informe-diario del repo
   ROFOAGRO_RESEARCH_WEB y generá el informe diario de hoy siguiendo su procedimiento al pie de la
   letra. Si algo falla, avisá por mail a ADMIN_EMAILS con el error en vez de quedarte en silencio."
   Antes: configurar en el entorno de Claude Code las env vars SUPABASE_URL, SUPABASE_SERVICE_KEY,
   RESEND_API_KEY, RESEND_FROM, ADMIN_EMAILS, INFORME_TOKEN.

VERIFICAR (antes del OK final) — TODO EN LOCAL: las rutas nuevas NO existen en producción hasta que
este PR se mergee y deploye, así que la prueba de punta a punta corre contra tu build local
(NODE_USE_ENV_PROXY=1 npm run build && npm run start + INFORME_BASE_URL=http://localhost:3000).
Para escribir el borrador y mandar el mail de prueba necesitás SUPABASE_SERVICE_KEY y RESEND_API_KEY
en .env.local: pedíselas a Lautaro (que las cargue él en el entorno o te las pase por canal seguro —
JAMÁS al repo); si no las consigue en el momento, verificá hasta donde se pueda (JSON real → prosa →
placa renderizada) y dejá el guardado+mail como "probar en el primer disparo real de la Routine
post-merge", documentado en el PR. Para probar el form de color de /admin/datos en local usá un
bypass TEMPORAL de requireAdmin que JAMÁS se commitea (git diff limpio antes de cada commit — mismo
patrón que la etapa E3 de PLAN_AUDITORIA.md). Checklist: lint/tsc/build ✅ · JSON real → prosa
(mostrásela a Lautaro: ¿suena a él?) → placa renderizada (mostrale el PNG) → si hay creds, mail
recibido y /informes lo lista · el informe degrada bien sin color cargado · la plantilla con token
inválido da 401 · claro/oscuro de /informes en navegador. El PR queda draft hasta que Lautaro valide
el PNG de muestra. Post-merge: primer disparo real de la Routine supervisado (revisá su resultado y
el mail). Cerrá con doc de sesión + ESTADO.md («Ahora» + marcar avance del ítem 11).
```

---

# PROMPT MP2 — Informe semanal (PDF research)

```text
Sos el ejecutor del mini-proyecto MP2 (informe semanal) de ROFO AGRO. Requisito: MP1 mergeado y la
Routine diaria funcionando (si no, frená y avisale a Lautaro). Leé docs/PLAN_INFORMES.md COMPLETO,
docs/ESTADO.md, docs/CONTEXTO.md, la skill voz-lautaro (SKILL.md + references/ejemplos.md) y la skill
informe-diario ya creada (reusá su pipeline: datos → prosa → render → Storage → Resend → registro).
Rama claude/informes-mp2-semanal desde main. Misma preparación de entorno que MP1.

OBJETIVO: un PDF de 3-5 páginas tipo research de ALyC que salga solo los viernes post-cierre:
la semana en números + gráficos + interpretación larga con la voz de Lautaro, con la marca de la web.

CONSTRUIR:
1. DATOS SEMANALES: extender /api/informes/datos con ?tipo=semanal — variación SEMANAL por grano y
   posición (cierre viernes vs viernes anterior, desde futuros_cierres), pizarra semanal, variación
   semanal del dólar oficial y futuros CON GRÁFICO (esto cierra de paso el ítem 13 del backlog —
   marcalo), Chicago semanal, negociado SIO de la semana (reusar getNegociado — semanal por grano,
   Δ, % priceado), DJVE + line-up de la semana (reusar las libs de /comercio), agenda de informes de
   la semana próxima (calendario.ts), y el view por grano SI ya existe la tabla views_mercado de MP3
   (integrarlo; si no existe, la sección se omite y queda anotado).
2. PLANTILLA: src/app/informes/plantilla/semanal/page.tsx — formato A4 multipágina con CSS de print
   (@page, page-break), 3-5 páginas: (1) tapa con logo + título de la semana + resumen ejecutivo;
   (2) granos local con tabla y gráfico semanal; (3) dólar/tasas + Chicago; (4) comercio exterior +
   negociado; (5) view por grano (cuando exista) + agenda + disclaimer. Gráficos: SVG server-side
   como los que la web ya usa (reusar componentes/patrones existentes, ej. el histograma de
   negociado-chart o los SVG de evolución). Mismo gate por token.
3. SKILL .claude/skills/informe-semanal/: igual pipeline que la diaria pero: prosa registro "informe
   largo" de voz-lautaro (emojis casi nulos, desarrollo, cierre con opinión humilde), render con
   Playwright page.pdf() (formato A4), adjunto PDF en el mail.
4. ROUTINE (manual de Lautaro, documentado): cron "0 22 * * 5" (19:00 ART viernes — él ajusta),
   sesión nueva, prompt análogo al de la diaria apuntando a la skill informe-semanal.

VERIFICAR: lint/tsc/build ✅ · UN PDF real de punta a punta con la semana en curso, generado EN LOCAL
(las rutas nuevas no están en producción hasta el merge: build propio +
INFORME_BASE_URL=http://localhost:3000, mismas notas de creds que MP1), mostrado a Lautaro
página por página antes del OK · los números del PDF cotejados 1:1 contra las páginas de la web que
los originan (mismo valor en /granos, /comercio/negociado, etc.) · print CSS sin cortes feos. PR
draft hasta el OK. Cerrá con doc de sesión + ESTADO.md (ítem 11 completo si Lautaro valida; anotar
el avance del ítem 13).
```

---

# PROMPT MP3 — View de mercado por grano (research direccional)

```text
Sos el ejecutor del mini-proyecto MP3 (view de mercado por grano) de ROFO AGRO. Requisito: MP1 mergeado
(reusa patrón de skill + Routine + tablas). Leé docs/PLAN_INFORMES.md COMPLETO, docs/ESTADO.md,
docs/CONTEXTO.md, docs/negocio/ (01 y 02 enteros — ahí está cómo piensa la mesa) y la skill
voz-lautaro. Rama claude/informes-mp3-view desde main. Misma preparación de entorno que MP1.

OBJETIVO: una vez por semana, una sesión de research produce el VIEW por grano (soja, maíz, trigo):
dirección ALCISTA / BAJISTA / NEUTRAL + nivel de confianza + los argumentos + qué invalidaría la
tesis — como lo haría un research de ALyC, usando TODO lo que la web ya computa. INTERNO MESA primero:
lo lee Lautaro, lo califica, y recién cuando la calidad lo convenza se abre a clientes.

CONSTRUIR:
1. MIGRACIÓN: tabla views_mercado (id, grano, fecha date, direccion 'alcista'|'bajista'|'neutral',
   confianza smallint 1-5, horizonte text, tesis_md text, argumentos jsonb, invalidacion text,
   feedback_lautaro text null, creado_en) — RLS: SELECT solo admin (interno); escritura service_role.
2. SKILL .claude/skills/view-mercado/: el procedimiento de research semanal por grano. Insumos (todos
   de la web/base — citarlos con número exacto en la tesis): temperatura/índice MESA y sus 3 patas
   (matviews lineup_gap_hist/lineup_densidad_hist/compras_avance_hist vía /comercio/temperatura),
   cobertura por exportador y señal (/comercio/empresas y /comercio/senal), programa de embarques,
   negociado y % priceado (getNegociado), estimaciones de producción y sus últimos deltas
   (estimaciones.ts: ¿quién revisó qué?), precios y spreads (curva A3, percentil del spread vs
   historia en derivadas.ts, Chicago), FAS teórico vs pizarra (capacidad de pago), y las noticias de
   la semana por categoría. Estructura de salida POR GRANO: dirección + confianza + horizonte (ej.
   "próximas 4-8 semanas") + 3-5 argumentos CON números + factores en contra + "qué me haría cambiar
   de opinión" + 2 líneas de acción sugerida en idioma mesa (DIFERIR/VENDER/COMPRAR BARATO, coherente
   con el semáforo MESA — si el view contradice el semáforo, decirlo explícitamente y explicar por
   qué). Voz: voz-lautaro registro informe (humildad marca registrada: "a mi óptica", "esto es
   simplemente mi visión"). REGLA DURA: ni un número inventado; cada argumento cita su dato.
3. PÁGINA interna /granos/view (requireAdmin — ojo: requireAdmin protege SIEMPRE, aun con el flag
   apagado, como /comercio/*; y la ruta /granos/view queda RESERVADA para esto: el pendiente P5 de
   PLAN_BACKLOG.md crea vistas por grano bajo /granos y está avisado de no pisarla — si él ya corrió,
   coordiná el namespace): el view vigente por grano (dirección grande con color, tesis, historial
   de views anteriores con su feedback) + campo de feedback de Lautaro por view (server action →
   update de feedback_lautaro). Link desde /granos y /comercio/temperatura.
4. INTEGRACIÓN MP2: dejar lista la sección "view por grano" del semanal (si MP2 ya existe, activarla).
5. ROUTINE (manual de Lautaro, documentado): cron "0 12 * * 5" (9:00 ART viernes, ANTES del informe
   semanal para alimentarlo — él ajusta), sesión nueva, prompt apuntando a la skill view-mercado.
6. CALIBRACIÓN: las primeras 3-4 semanas son de ajuste declarado — el prompt de la skill incluye una
   sección "aprendizajes" que se actualiza con el feedback que Lautaro deja en cada view (la sesión
   semanal la lee antes de escribir). Documentar ese loop en la skill.

VERIFICAR: lint/tsc/build ✅ · generar UN view real de los 3 granos en la sesión y mostrárselo a
Lautaro (¿los argumentos citan datos reales? ¿la dirección se sostiene? ¿suena a él?) · cotejo de
cada número citado contra la página de la web que lo origina · página /granos/view en claro/oscuro
(para verla en local sin sesión admin: bypass TEMPORAL de requireAdmin que JAMÁS se commitea —
git diff limpio antes de cada commit, patrón de la etapa E3 de PLAN_AUDITORIA.md).
PR draft hasta el OK del primer view. Cerrá con doc de sesión + ESTADO.md.
```

---

# PROMPT MP4 — Interpretación automática de informes de organismos (ítem 21)

```text
Sos el ejecutor del mini-proyecto MP4 (interpretación de informes de organismos) de ROFO AGRO.
Requisito: MP1 mergeado (reusa Routine diaria, Resend, patrón admin). Leé docs/PLAN_INFORMES.md
COMPLETO, docs/ESTADO.md, docs/CONTEXTO.md, la skill voz-lautaro y src/lib/estimaciones.ts (ya
computa deltas entre vintages — es tu insumo principal). Rama claude/informes-mp4-interpretacion
desde main. Misma preparación de entorno que MP1.

OBJETIVO: cuando un organismo publica un informe que la web ya ingesta (USDA WASDE/PSD, CONAB,
BCR-GEA, DEA-SAGyP — y DJVE/compras si aporta), generar automáticamente un BORRADOR de lectura en
lenguaje llano con la voz de Lautaro ("qué cambió y qué implica"); Lautaro lo edita/aprueba en /admin
y recién ahí se publica en la web junto al dato. Los clientes leen la interpretación con su voz —
por eso NADA se publica sin su OK (decisión cerrada).

CONSTRUIR:
1. MIGRACIÓN: tabla interpretaciones (id, organismo, informe text, fecha_publicacion date, granos
   text[], borrador_md text, publicado_md text null, estado 'borrador'|'publicado'|'descartado',
   editado_en, creado_en; UNIQUE organismo+informe+fecha_publicacion) — RLS: SELECT anon SOLO
   estado='publicado'; el resto solo admin/service_role.
2. DETECCIÓN: paso nuevo al FINAL de la skill informe-diario (así no hay Routine extra): consultar
   estimaciones_produccion por vintages con fecha_publicacion posterior a la última interpretación
   registrada por organismo; si hay novedades, generar la interpretación de cada informe nuevo.
   (Si Lautaro prefiere una Routine separada, ofrecéselo — AskUserQuestion — pero la opción default
   es el paso en la diaria.)
3. GENERACIÓN (en la misma skill o una skill interpretar-informe que la diaria invoca): con los
   deltas que estimaciones.ts ya computa (organismo X revisó soja AR de A a B, área/rinde, vs qué
   esperaba el mercado si hay referencia en noticias) redactar 3-6 párrafos: qué publicó, qué cambió
   (números exactos), qué implica para precios/mesa, y qué mirar ahora. Voz voz-lautaro registro
   informe (framing didáctico: "Recordemos que…", "Dato no menor…"). REGLA DURA: solo números que
   están en la base; nada inventado. Guardar como borrador + mail de aviso a ADMIN_EMAILS con el
   texto y el link a /admin.
4. ADMIN: pestaña "Interpretaciones" en /admin: lista de borradores, editor de texto (el markdown
   crudo alcanza, con preview), botones Publicar / Descartar (server actions patrón admin/actions.ts;
   publicar copia borrador_md→publicado_md y estado='publicado').
5. WEB: en /produccion, junto a la pizarra/tarjetas de cambios del organismo correspondiente, la
   interpretación publicada más reciente ("La lectura de la mesa", colapsable, con fecha y sello).
   Si no hay publicada, no se muestra nada. Evaluar también un feed de interpretaciones en /informes.

VERIFICAR: lint/tsc/build ✅ · flujo completo con un informe REAL ya ingestado (simular la detección
con el último WASDE o GEA de la base): borrador generado (mostrárselo a Lautaro: ¿suena a él? ¿los
números son exactos?) → mail → editar en /admin → publicar → aparece en /produccion (claro/oscuro,
mobile; para las pantallas /admin en local sin sesión admin: bypass TEMPORAL de requireAdmin que
JAMÁS se commitea — git diff limpio, patrón E3 de PLAN_AUDITORIA.md) · un vintage repetido NO genera duplicado (probar la clave UNIQUE) · anon no ve borradores
(probar con la anon key). PR draft hasta que Lautaro apruebe el primer borrador publicado. Cerrá con
doc de sesión + ESTADO.md (marcar avance del ítem 21).
```

---

## Notas de mantenimiento

- Cada MP, al cerrar, actualiza su fila del tablero de arriba (estado + PR).
- Los horarios de las Routines están marcados [LAUTARO ajusta]: los crons se escriben en UTC
  (ART = UTC-3) y el mínimo es horario.
- Si en la práctica las Routines fallan seguido o consumen demasiado de la suscripción, activar el
  Plan B (GH Actions + API Anthropic) — el cambio es acotado: la skill pasa a script y la prosa la
  redacta la API; plantilla, tablas, Storage, mail y web quedan idénticos.
- Coordinación con la auditoría ([`PLAN_AUDITORIA.md`](PLAN_AUDITORIA.md)): la sección nueva
  "informes" en `SECCIONES_META` y la visibilidad de las tablas nuevas deben respetar lo que Lautaro
  decida en E1 sobre el modelo de datos público/privado. Si E1 se ejecuta antes que MP1, el ejecutor
  de MP1 debe leer `docs/auditoria/E1-datos.md`.
