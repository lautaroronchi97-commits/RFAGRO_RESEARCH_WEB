# Sesión 2026-07-16 — Plan de login (prompts listos)

- **Rama:** `claude/pending-tasks-list-2m6y6u` · **PR:** #28 (base `main`)
- **Objetivo pedido por Lautaro:** plan del login de clientes (ítem 7 del backlog), SIN ejecutar código —
  dejar "el prompt perfecto" para ejecutar en otras sesiones. Requisitos suyos: registro de clientes,
  varios usuarios por empresa, admins (él + Mauro) ven quiénes están registrados, permisos editables por
  cliente, login solo Google o email+contraseña, que no se presten usuarios, registro de quién abre la web.

## Hecho
- **[`docs/PLAN_LOGIN.md`](../PLAN_LOGIN.md)**: plan completo con las 15 decisiones cerradas (tabla §2),
  arquitectura (§3: Supabase Auth + `@supabase/ssr`, modelo de datos, enforcement por middleware sin
  romper ISR, sesión única, Resend, marca de agua), pasos manuales de Lautaro (§4) y **3 prompts
  autocontenidos** (§5) para ejecutar en 3 sesiones/PRs: Etapa 1 base de auth → Etapa 2 panel admin →
  Etapa 3 hardening (sesión única, marca de agua, landing mínima, encendido).
- Solo documentación: **cero código ejecutado**, a pedido de Lautaro.

## Decisiones tomadas (y por qué) — todas confirmadas por Lautaro vía cuestionario (12 preguntas, 3 tandas)
- **Supabase Auth** (no NextAuth): ya es la base del proyecto, cero servicio nuevo, RLS junto a los datos.
- **Registro + aprobación manual** con empresa asignada al aprobar — filtro humano de "manos incorrectas".
- **1 sesión activa por usuario** (anti-préstamo): el segundo login pisa al primero.
- **Permisos por sección a nivel empresa** + override individual opcional (7 secciones del sitio).
- **Todo tras login, solo landing mínima pública** (adelanta parte del ítem 3 del backlog).
- **Monitoreo = historial** (logins + secciones visitadas + dispositivo/IP); descartó presencia en vivo.
- **Mail a admins por registro nuevo** (Resend) + badge de pendientes.
- **Sesión 7 días renovable** · registro pide **nombre + empresa + teléfono** · admin seed
  `lautaroronchi97@gmail.com`, Mauro se promueve desde el panel.
- **Feature flag `AUTH_ENFORCED`**: entra apagado, Lautaro lo prende por env var tras probar.
- **Marca de agua sutil** con el email del usuario sobre las páginas de datos (disuasión de capturas).
- **Hosting**: quiere evaluar alternativas a Vercel Pro → sesión aparte; el login no ata al hosting.

## Verificado
- N/A (sesión de solo documentación; sin cambios de código, no aplica lint/build).

## Quedó pendiente / en vuelo
- Ejecutar las 3 etapas con los prompts de `PLAN_LOGIN.md` §5 (cada una = 1 sesión + 1 PR).
- Pasos manuales de Lautaro (§4): Google OAuth en Supabase (Etapa 1), Resend (Etapa 2), env vars y
  encendido del flag (Etapa 3). Falta el email de Mauro (se promueve desde el panel, no bloquea).
- **Sesión aparte**: comparativa de hosting (Vercel Pro vs alternativas) ANTES de invitar clientes reales.

## Trampas descubiertas (para la próxima sesión)
- Las páginas de datos son estáticas/ISR: el gate de auth va en middleware/proxy + layout, NUNCA volver
  dinámicas las páginas por leer la sesión adentro (se pierde el cache). Está detallado en §3.3 del plan.
- El SELECT anónimo de las tablas de datos de mercado sigue abierto por RLS aunque la web quede tras
  login (la anon key no se shippea al browser hoy, `supabase.ts` es server-only) — hardening opcional
  anotado en §6, no urgente.
- Enforcement nativo de sesión única / timebox en Supabase Auth puede estar gateado por plan → el plan
  manda implementación propia (`sesiones_activas`) como fuente de verdad y lo nativo como refuerzo.
