# Sesión 2026-07-22 — Auditoría E7: síntesis y backlog maestro

- **Rama:** `claude/auditoria-e7-sintesis-a919cq` · **PR:** #_ (base `main`, draft)
- **Objetivo pedido por Lautaro:** etapa final de la auditoría integral (PROMPT E7 de
  `PLAN_AUDITORIA.md`): fusionar los 6 informes E1–E6, deduplicar, matriz impacto × esfuerzo,
  backlog maestro único y un prompt por lote grande. Sin descubrir hallazgos nuevos, sin tocar código.

## Hecho

- **[`auditoria/E7-sintesis.md`](../auditoria/E7-sintesis.md)** — el entregable completo:
  - **Resumen ejecutivo de TODA la auditoría** (≤2 páginas): ~71 hallazgos + ~30 decisiones de
    Lautaro en 6 etapas (PRs #50, #51, #55, #56, #57, #58, #59); los 12 arreglos grandes ya
    mergeados; los 7 frentes que quedan abiertos, en orden.
  - **§1 estado final por etapa** (qué cerró cada fase 2, qué quedó abierto y a qué lote va).
  - **§2 fusión deduplicada**: 18 problemas que aparecieron en más de una etapa, una fila cada uno,
    con la decisión arrastrada y el estado verificado al 22/07 (invariante: nada aprobado se
    pierde, nada rechazado reaparece). Único incidente que sigue ABIERTO: **DEA-SAGyP** (MAGyP no
    acepta conexiones ni de Actions ni de la Edge en São Paulo).
  - **§3 matriz impacto × esfuerzo** de los 28 ítems aprobados-y-pendientes (impacto
    mesa/clientes/robustez · esfuerzo en sesiones · dependencias · 🔒 = espera insumo de Lautaro).
  - **§4 BACKLOG MAESTRO ÚNICO** en 4 grupos: A (8 pasos manuales de Lautaro), B (3 quick wins),
    C (17 features de producto — absorbe P1–P12 + MP1–MP4 + extras), D (6 lotes técnicos), con
    grafo de dependencias y orden sugerido. **Reemplaza las 3 listas paralelas** (propuesta de E6).
  - **§5 rechazados/descartados** (14 filas, para que no reaparezcan: Tailwind, Cocos Gold/Pro,
    Wayback compras, PAS, Cloudflare hosting, etc.).
  - **§6 seis prompts de lote autocontenidos**: L1 (partir `market.ts` + util mes/posición, E4
    #10+#11) · L2 (motor de gráfico SVG, E4 #14) · L3 (`noUncheckedIndexedAccess`, E4 #13) · L4
    (calibración de parámetros de mesa, E2 r3/r4/r9b + roster E5) · L5 (**DEA: destrabar la
    fuente**, E5 #8) · L6 (robustez de ingestas v2: falso-verde en backfills + calendario desde ICS
    NASS + erosión del roster, E5→E7).
- **`PLAN_AUDITORIA.md`**: fila E7 → cerrada + banner "AUDITORÍA INTEGRAL COMPLETA" con link al
  backlog maestro.
- **`ESTADO.md`**: bloque «Ahora» de E7 + el checklist «Plan RF AGRO» marcado como histórico
  apuntando al maestro.
- **`CONTEXTO.md`**: el pointer de «Pendientes» actualizado (backlog maestro = E7-sintesis §4).
- **`PLAN_BACKLOG.md`**: banner "tablero absorbido — este archivo queda como biblioteca de prompts
  P1–P12" (lo que sus propias Notas anticipaban).

## Decisiones tomadas (y por qué)

- **Los lotes son 6, no 4**: a los 4 refactors diferidos de E4 se sumaron la calibración de mesa
  (E2 la había mandado a E7 explícitamente) y los "Para E7" de E5 (robustez v2). DEA se separó en
  su propio lote (L5) porque es un **incidente abierto**, no un refactor — merece sesión enfocada.
- **El backlog maestro vive dentro de `E7-sintesis.md` §4** (no en un archivo nuevo): un solo
  documento con contexto + matriz + lista + prompts evita crear una 4ª ubicación; los demás docs
  apuntan ahí.
- **El checklist viejo de `ESTADO.md` se congela, no se borra**: es el registro de origen de los 21
  ítems y sus links; borrar historia no aporta.
- **La dependencia "robots→index" que citaba `PLAN_BACKLOG` (P7) se marcó caída**: el `noindex`
  global ya se quitó en E3/E4 — verificado en los informes.
- **Ramas a borrar**: a las 7 de E6 se sumaron las 6 de las auditorías mergeadas después (E3, E4,
  E5, E6, fix #59, cierre #60) — comandos en A4 del backlog; esta sesión no borra ramas (regla).

## Verificado

- Cross-check de cada «diferido a E7» / «Para E7» / decisión de los 6 informes contra el estado
  real al 22/07 (post PRs #58/#59/#60 y Partes A/B de la guía ejecutadas por Lautaro): el revoke de
  las 7 matviews figura APLICADO, la migración H1/H6 de E3 aplicada, healthcheck 17/17, DEA sigue
  bloqueada — todo tomado de `ESTADO.md` 22/07 + informes.
- Solo docs (cero código): no aplica lint/tsc/build más allá de que no se tocó nada que los afecte.

## Quedó pendiente / en vuelo

- **Presentar el informe a Lautaro** (este PR draft) → ajustar el orden del backlog según su
  feedback → ready for review.
- Los 8 pasos manuales del grupo A del backlog (login Parte C, Routine MP3, mail PAS, ramas,
  respuestas P3/P4, uploader, H12/girasol, leaked protection si upgradea Supabase).
- El PR # de esta sesión hay que anotarlo en el tablero de `PLAN_AUDITORIA.md` y en el encabezado
  de `E7-sintesis.md` al crearlo.

## Trampas descubiertas (para la próxima sesión)

- La decisión de E1 "Agrochat fuente única de compras" fue **pisada** por la de E5 (opción (b):
  MAGyP automática + Agrochat manda) — si alguien relee E1 sin E5, que no la resucite; quedó
  asentado en §2 y §5 de la síntesis.
- El revoke de funciones en Postgres debe incluir **PUBLIC** (lección E5 #4) — ya es regla, pero
  vale repetirla en cualquier migración futura de permisos.
