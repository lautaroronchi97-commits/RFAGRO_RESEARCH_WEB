# Sesión 2026-07-21 — Plan de auditoría integral

- **Rama:** `claude/trading-project-audit-37aiqr` · **PR:** #_ (base `main`)
- **Objetivo pedido por Lautaro:** planificar (SIN tocar código) una auditoría integral de todo el
  proyecto — cada módulo, cada fórmula, cada página navegada, la base de datos, la infraestructura y
  la historia — con prompts listos para ejecutar en sesiones nuevas, una por etapa.

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

## Verificado
- Sesión SOLO de documentación (no se tocó `src/`, `scripts/`, `supabase/` ni configs) → lint/tsc/build
  no aplican; links internos de los docs nuevos revisados.
- Los datos citados en los prompts salen del relevamiento real de esta sesión (agentes + MCP), no de
  memoria: conteos de tablas, advisors, archivos:línea de cada fórmula, duplicaciones.

## Quedó pendiente / en vuelo
- **Ejecutar E1** (primer prompt de `PLAN_AUDITORIA.md`) cuando Lautaro abra la sesión.
- El tablero de `PLAN_AUDITORIA.md` se actualiza etapa por etapa.

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
