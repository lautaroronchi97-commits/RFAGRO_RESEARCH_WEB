# Auditoría E_N — <tema> (AAAA-MM-DD)

- **Rama:** `claude/auditoria-eN-...` · **PR:** #_ (base `main`, draft hasta el OK)
- **Alcance:** <qué se auditó, según el prompt de [`PLAN_AUDITORIA.md`](../PLAN_AUDITORIA.md)>
- **Cómo se verificó:** <entorno, herramientas, datos usados — para que sea reproducible>

## Resumen ejecutivo (≤10 líneas)

<Lo más importante primero: qué está bien, qué está mal, qué requiere decisión de Lautaro.>

## Hallazgos (priorizados, el más grave primero)

> Regla: cada hallazgo con evidencia VERIFICABLE (archivo:línea · SQL corrido · screenshot · request
> real). Lo no verificado NO va acá — va en «Dudas». La columna **Decisión** la completa Lautaro:
> `corregir` / `no` / `diferir a E7` / `preguntar más`.

| # | Hallazgo | Evidencia | Impacto | Esfuerzo | Propuesta de fix | Decisión Lautaro |
|---|---|---|---|---|---|---|
| 1 | <una frase, el defecto concreto> | `src/...:123` / SQL / screenshot | alto·medio·bajo + a quién afecta (mesa/cliente/robustez) | S·M·L | <fix concreto> | |

## Dudas / decisiones para Lautaro

> Preguntas de criterio o negocio que la auditoría no puede resolver sola. Para fórmulas: SIEMPRE con
> ejemplo numérico ("hoy con inputs X da Y — ¿es lo esperado o debería dar Z porque W?").

1. <pregunta con contexto suficiente para responder sin scrollear>

## Lo que está BIEN (no tocar)

<Explícito, para que nadie "mejore" lo que ya funciona: decisiones acertadas verificadas.>

## Para E_N (hallazgos que le corresponden a otra etapa)

- <hallazgo → etapa destino>

## Fase 2 — correcciones implementadas (completar tras el OK)

| # hallazgo | Qué se hizo | Commit | Verificación |
|---|---|---|---|
