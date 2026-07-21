# Sesión 2026-07-21 — Plan de auditoría integral + plan de informes automatizados

- **Rama:** `claude/trading-project-audit-37aiqr` · **PR:** #49 (base `main`)
- **Objetivo pedido por Lautaro:** planificar (SIN tocar código) dos cosas: (1) una auditoría integral
  de todo el proyecto — cada módulo, cada fórmula, cada página navegada, la base de datos, la
  infraestructura y la historia; (2) el ítem 11 del backlog (informe diario/semanal para WhatsApp)
  más el view de mercado por grano y la interpretación automática de informes (ítem 21). En ambos
  casos el entregable son prompts autocontenidos para ejecutar en sesiones nuevas.

## Hecho
- **[`docs/PLAN_AUDITORIA.md`](../PLAN_AUDITORIA.md)**: el plan maestro — metodología, reglas
  transversales, tablero de avance y **7 prompts autocontenidos** (E1 datos/base → E2 fórmulas →
  E3 UX/navegación → E4 código/arquitectura → E5 infra/ingestas/seguridad → E6 historia por PR →
  E7 síntesis y backlog maestro). Cada prompt trae: preparación de entorno (build local con datos
  reales vía creds públicas anon + Playwright del sandbox), alcance exacto con archivos:línea,
  hallazgos "semilla" ya confirmados para no re-descubrirlos, formato de informe y el flujo
  informe → OK de Lautaro → corregir.
- **[`docs/auditoria/_TEMPLATE.md`](../auditoria/_TEMPLATE.md)**: plantilla de informe de hallazgos
  (tabla con evidencia/impacto/esfuerzo/propuesta + columna «Decisión Lautaro» + sección «Lo que está
  BIEN» + traspasos entre etapas).
- **Relevamiento de base**: 2 agentes de exploración (uno `src/` completo: 17 rutas + 69 componentes
  + ~55 libs con cada fórmula localizada; otro infra: 14 scripts de ingesta, 13 workflows,
  21 migraciones, Edge Function, 106 commits) + MCP Supabase vivo (14 tablas, conteos) + advisors
  oficiales de seguridad y performance. Todo citado como "semilla" en los prompts.

### Segundo plan de la misma sesión — Informes automatizados (ítems 11 y 21)
- **[`docs/PLAN_INFORMES.md`](../PLAN_INFORMES.md)**: 4 mini-proyectos con un prompt autocontenido
  cada uno — **MP1 informe diario** (placa PNG vertical para WhatsApp: 4 bloques de datos de la web +
  "color de la rueda" que Lautaro carga en /admin + prosa con `voz-lautaro` molde "Mesa de
  operaciones"), **MP2 informe semanal** (PDF 3-5 páginas tipo research de ALyC; cierra de paso el
  ítem 13), **MP3 view de mercado por grano** (dirección alcista/bajista/neutral con research citando
  los datos de la web; interno mesa primero), **MP4 interpretación automática de informes de
  organismos** (ítem 21; borrador → OK de Lautaro en /admin → publica en /produccion).
- **Arquitectura elegida**: el "worker" son **Routines de Claude Code** (sesiones programadas por cron
  que corren la skill del repo con la suscripción que Lautaro ya paga — su pedido: no gastar plata en
  API). Se evaluó y descartó por ahora el consejo externo de OpenRouter+Haiku (intermediario
  innecesario; Haiku dejaría la voz genérica); **plan B documentado**: GH Actions + API Anthropic
  directa. Plantilla de render = página Next oculta que reusa las libs y el CSS reales (cero
  duplicación, branding 1:1); entrega = Resend + página `/informes`.

### Tercer plan de la misma sesión — Backlog completo (todo pendiente con dueño)
- **[`docs/PLAN_BACKLOG.md`](../PLAN_BACKLOG.md)**: tabla de mapeo de TODOS los pendientes del
  proyecto (backlog de ESTADO + «Pendientes» de CONTEXTO + gráficos v2) a dónde vive su plan — los ya
  cubiertos apuntan a la auditoría (E3/E4/E5) o a informes (MP1-4), sin duplicar — y **12 prompts
  autocontenidos (P1→P12)** para los que no tenían plan: P1 Merval/EWZ/vol. Matba · P2 variación
  semanal USD · P3 compras netas BCRA (research de automatización primero) · P4 camiones en puerto
  (research de fuente primero) · P5 vista por grano · P6 gráficos v2 · P7 vista productor + PWA ·
  P8 feed A3 intradiario · P9 sintéticos TIR · P10 estrategias avanzadas · P11 modelo capacidad de
  pago · P12 scoring de clientes. Los bloqueados por insumos de Lautaro (P9-P12, P6 parcial) llevan
  **su insumo como paso 1 del prompt** (se pueden pegar hoy igual).

## Decisiones tomadas (y por qué)
- **Historia por PR/sesión**, no commit por commit — Lautaro (mejor costo/valor; el diff individual
  solo ante sospecha).
- **Navegación de auditoría: build local con datos reales** (anon key pública + Playwright), admin
  incluido con bypass local jamás commiteado — Lautaro.
- **Ejecutor: sesiones nuevas de Claude Code, 1 por etapa**, protocolo ESTADO.md — Lautaro.
- **Flujo: informe → OK hallazgo por hallazgo → recién corregir**; lo grande se difiere a E7 — Lautaro.
- **Orden: correctitud primero** (datos → fórmulas → UX → código → infra → historia → síntesis) — Lautaro.
- **UX con las 4 lentes**: mesa, cliente, mobile ~390px, tema claro+oscuro — Lautaro.
- **Regla de fórmulas**: las define Lautaro; toda duda se presenta como pregunta con ejemplo numérico,
  jamás como "error" — Lautaro.
- **Informes (21/07, segunda parte)**: diario = 4 bloques + color de la rueda, SIN abrumar; prosa IA
  desde v1; motor = suscripción Claude vía Routines (mínimo gasto); entrega = mail + web, reenvío
  manual a WhatsApp; color de la rueda por formulario /admin con degradación si falta; diario placa
  PNG / semanal PDF; view semanal 3 granos interno primero; interpretaciones SIEMPRE con aprobación
  previa — todas de Lautaro.

### Refinamiento final (con Fable, 21/07)
- **Auditoría adversarial de los 23 prompts**: un agente verificador contrastó cada afirmación de los
  3 planes contra el repo real → 12 problemas encontrados y corregidos. Los graves: la verificación
  end-to-end de MP1/MP2 apuntaba a producción cuando las rutas nuevas no existen ahí durante el PR
  (fix: `INFORME_BASE_URL` + prueba local documentada con sus creds); MP1/MP3/MP4 pedían probar
  pantallas `requireAdmin` sin traer el bypass local que sí tenía E3 (fix: agregado); colisión de
  numeración "P12/P17" (ítems del plan de gráficos vs prompts del backlog — desambiguado); posible
  colisión de rutas `/granos/view` entre MP3 y P5 (reservada en ambos lados); referencias `§6/§7` de
  CONTEXTO ambiguas (tabla de módulos vs lista de pendientes — explicitado); E5 asumía un workflow
  por ingesta (GEA/DEA/PAS comparten uno — aclarado); conteos menores (27 presets, no 30, etc.).
- **Matriz de modelo y agentes por prompt** agregada a los 3 planes: juicio (E1/E2/E5/E7, MP3,
  P3/P4/P9-P12) → Fable mientras dure, después Opus; build con patrón claro (E3/E4/E6, MP1/MP2/MP4,
  P1/P2/P5-P8) → Sonnet; Routines de informes → mínimo Sonnet (la prosa es el producto); subagentes
  de solo lectura para paralelizar cotejos/navegación, decisiones siempre en la sesión principal.

## Verificado
- Sesión SOLO de documentación (no se tocó `src/`, `scripts/`, `supabase/` ni configs) → lint/tsc/build
  no aplican; links internos de los docs nuevos revisados.
- Los datos citados en los prompts salen del relevamiento real de esta sesión (agentes + MCP), no de
  memoria: conteos de tablas, advisors, archivos:línea de cada fórmula, duplicaciones.

- **Backlog (21/07, tercera parte)**: solo los ítems sin plan reciben prompt (cero duplicación, con
  tabla de mapeo) · los bloqueados por insumos van con prompt igual y el insumo como paso 1 · compras
  netas BCRA arranca investigando automatización · camiones en puerto arranca con research de fuente
  validada con requests reales — todas de Lautaro.

## Quedó pendiente / en vuelo
- **Ejecutar E1** (primer prompt de `PLAN_AUDITORIA.md`) cuando Lautaro abra la sesión.
- **Ejecutar MP1** (primer prompt de `PLAN_INFORMES.md`); antes, Lautaro configura las env vars del
  entorno de Claude Code (SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_*, ADMIN_EMAILS, INFORME_TOKEN).
- Los tableros de ambos planes se actualizan etapa/MP por etapa/MP.

## Trampas descubiertas (para la próxima sesión)
- Los **advisors de Supabase** ya devuelven hallazgos reales hoy (matviews de mesa legibles por anon
  vía API; ~17 RPC `SECURITY DEFINER` ejecutables por anon/authenticated; policies RLS subóptimas) —
  están precargados como semilla en E1: verificar vigencia, no re-descubrir.
- **5 tablas heredadas sin DDL en el repo** (`djve`, `lineup`, `cbot_cierres`, `pizarra_historico`,
  `compras`): el esquema base solo vive en Supabase — E1 arranca dumpeándolo.
- El healthcheck de frescura **no cubre** `compras`, `djve` ni las matviews MESA (hueco de monitoreo,
  semilla de E5).
- `sample.ts` sigue vivo en producción vía `implicitas-panel` y la pizarra de la cinta sigue hardcodeada
  (`market.ts:250-252`) — es la causa del `noindex` global (semilla de E3).
