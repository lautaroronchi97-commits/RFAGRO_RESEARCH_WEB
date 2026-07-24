# PLAN LOGIN — Autenticación, clientes y permisos (decisiones cerradas + prompts de ejecución)

> **Estado: PLAN APROBADO, LISTO PARA EJECUTAR.** Cerrado con Lautaro el 16/07/2026 (15 decisiones,
> abajo). Se ejecuta en **3 etapas = 3 sesiones = 3 PRs**, cada una con su prompt autocontenido (§5).
> Cubre los ítems **7 y 10 del backlog** de `ESTADO.md` y adelanta una landing mínima (parte del ítem 3).
>
> ⚠️ Para el modelo que ejecute: leé además `CLAUDE.md` (carga `AGENTS.md` + `docs/ESTADO.md` +
> `docs/CONTEXTO.md`) y respetá el protocolo de sesiones. **Este repo usa Next.js 16 con breaking
> changes: leé `node_modules/next/dist/docs/` antes de escribir código** (en especial lo relativo a
> middleware/proxy, route handlers y cookies).

## 1. Objetivo (en palabras de Lautaro)

Los clientes se registran y ven la información del research. Se registran varias personas por empresa.
Lautaro y Mauro (admins) ven quiénes están registrados, editan qué puede ver cada cliente, y tienen
registro de quién abre la web y cuándo. Que **no se puedan prestar usuarios** y que la información
**no llegue a manos incorrectas**. Login solo con **Google (Gmail)** o **email + contraseña**.

## 2. Decisiones cerradas (16/07/2026 — NO re-preguntar, ya decidido)

| # | Tema | Decisión |
|---|------|----------|
| 1 | Alta de clientes | **Registro autoservicio + aprobación manual**: cualquiera se registra, queda `pendiente` y NO ve ningún dato hasta que un admin lo aprueba y le asigna empresa. |
| 2 | Anti-préstamo | **1 sesión activa por usuario**: login en un segundo dispositivo cierra la sesión anterior ("tu cuenta se abrió en otro dispositivo"). |
| 3 | Permisos | **Por sección, a nivel empresa** (todos los usuarios de la empresa heredan), con **override individual opcional** por usuario. Secciones = las 7 del sitio: Granos, Dólar y tasas, Comercio exterior, Calculadoras, Gráficos, Producción, Noticias. |
| 4 | Qué es público | **Solo una landing mínima**; TODO el dashboard de datos queda tras login aprobado. |
| 5 | Monitoreo | **Historial de logins y actividad** (quién, cuándo, dispositivo/navegador, IP→ciudad, secciones visitadas). SIN presencia "en vivo"/heartbeat (descartado explícitamente). |
| 6 | Avisos | **Email a los admins** en cada registro nuevo + **badge de pendientes** en el panel admin. |
| 7 | Landing | **Mínima ahora** (marca + una línea + botones Ingresar/Registrarse, estética premium existente). La landing institucional completa es otra sesión (ítem 3 del backlog). |
| 8 | Duración de sesión | **7 días renovables con uso** (quien usa la web seguido no vuelve a loguearse; 7 días sin usar → re-login). |
| 9 | Datos del registro | **Nombre y apellido + empresa (texto libre) + teléfono**. Con Google, nombre/email vienen del OAuth y se piden los campos faltantes en un paso posterior. |
| 10 | Admins iniciales | **`lautaroronchi97@gmail.com` precargado**. El panel permite promover a otro usuario a admin → Mauro se promueve desde ahí cuando se registre. |
| 11 | Hosting | El login **no se ata a Vercel** (funciona en cualquier hosting Next.js). Evaluación Vercel Pro vs alternativas = **sesión aparte**; mientras tanto se desarrolla en el plan actual. |
| 12 | Marca de agua | **SÍ, sutil**: email del usuario logueado en diagonal, muy tenue, repetido sobre las páginas de datos (overlay CSS, no arruina la estética premium). |
| 13 | Encendido | **Feature flag `AUTH_ENFORCED`**: el código entra a producción APAGADO (web sigue pública); Lautaro lo prende por variable de entorno cuando probó todo. |
| 14 | Etapas | **3 etapas / 3 PRs** (§5): base de auth → panel admin → hardening. |
| 15 | Stack de auth | **Supabase Auth** (proyecto `lineup-argentina` ya conectado): Google OAuth + email/password, sin servicio nuevo. |

## 3. Arquitectura

### 3.1 Por qué Supabase Auth
Ya es la base de datos del proyecto (cero servicios nuevos, cero costo extra a esta escala), trae
Google OAuth + email/password + verificación de email + recupero de contraseña resueltos, y los
permisos viven en la misma base que los datos → se protegen con RLS. SDK oficial para Next.js App
Router: **`@supabase/ssr`** (sesión en cookies, compatible server components).

### 3.2 Modelo de datos (una migración por etapa, en `supabase/migrations/`)

```
empresas          id uuid PK · nombre text UNIQUE · created_at
                  secciones text[]  -- permisos: claves de sección permitidas, ej. '{granos,calculadoras,noticias}'

profiles          id uuid PK = auth.users.id (FK, on delete cascade)
                  nombre text · empresa_texto text · telefono text
                  estado text CHECK (pendiente|aprobado|rechazado|bloqueado) DEFAULT 'pendiente'
                  rol text CHECK (cliente|admin) DEFAULT 'cliente'
                  empresa_id uuid FK empresas NULL
                  secciones_override text[] NULL  -- si no es NULL, pisa las de la empresa
                  created_at · approved_at · approved_by uuid NULL

sesiones_activas  user_id uuid PK · session_id text · created_at · last_seen
                  device text · ip text        -- para "1 sesión activa": la última pisa a la anterior

access_log        id bigint PK · user_id uuid · ts timestamptz DEFAULT now()
                  evento text CHECK (login|logout|seccion|kickeado)
                  seccion text NULL · ip text NULL · user_agent text NULL
```

- **Trigger** `on auth.users insert` → crea `profiles` (SECURITY DEFINER). Si el email está en la
  tabla/lista de admins seed (`lautaroronchi97@gmail.com`) → `rol='admin', estado='aprobado'`.
- **RLS en todo**: `profiles` → el usuario lee/edita SOLO su fila (y solo campos de contacto);
  admins leen/editan todas (policy por `rol='admin'` vía función `is_admin()` SECURITY DEFINER —
  ojo recursión de policies). `empresas`, `access_log`, `sesiones_activas` → solo admins leen;
  inserts de log vía server (service key en route handlers/server actions, nunca en el cliente).
- Los datos de mercado NO cambian de esquema: se protegen a nivel **página** (middleware + server),
  no a nivel fila. (Hardening opcional futuro: cerrar el SELECT anónimo de las tablas de datos y
  leer con service key server-side — anotar, no hacer ahora.)

### 3.3 Enforcement (eficiencia: NO romper el ISR)

- **Middleware** (o `proxy.ts` — verificar el nombre/API en los docs de Next 16 del repo): corre
  antes del cache, así las páginas de datos siguen siendo **estáticas/ISR** (clave de performance
  del sitio, no convertir las páginas en dinámicas por auth).
  Lógica: sin `AUTH_ENFORCED` → passthrough total. Con flag: rutas públicas (`/`-landing, `/ingresar`,
  `/registro`, `/pendiente`, assets) pasan; el resto exige cookie de sesión Supabase válida +
  `estado='aprobado'` + permiso de la sección → si no, redirect (a landing, a `/pendiente` o a una
  página "sección no incluida en tu plan" según el caso).
- Para no pegarle a la base en CADA request desde el middleware: cachear el "pase" del usuario
  (estado + secciones + session_id) en un **cookie firmado corto (~5 min)** o claims del JWT,
  refrescado on-login y on-miss. Documentar el trade-off elegido.
- **Defensa en profundidad**: además del middleware, un check server-side en el layout del route
  group protegido (el middleware puede quedar mal configurado; el layout es la red).

### 3.4 Sesión única + duración (Etapa 3)
- Login exitoso → upsert en `sesiones_activas` con el `session_id` del JWT de Supabase. En cada
  validación (middleware/layout, con el cache de §3.3): si el `session_id` del cookie ≠ el registrado
  → `signOut` + mensaje "Tu cuenta se abrió en otro dispositivo" + evento `kickeado` en `access_log`.
- Si el plan de Supabase tiene el enforcement nativo de sesión única / timebox de sesiones
  (Auth → Sessions), usarlo como refuerzo; si está gateado a plan pago, la implementación propia
  de arriba es la fuente de verdad. **Verificar en el proyecto real, no asumir.**
- 7 días renovables: configurar inactivity timeout de Supabase Auth si el plan lo permite; fallback:
  check de `last_seen` en `sesiones_activas` (>7 días → signOut).

### 3.5 Emails (Etapa 2)
**Resend** (free tier 3.000/mes, de sobra): `RESEND_API_KEY` + `ADMIN_EMAILS` en env. Registro nuevo →
mail a admins con datos del solicitante + link al panel. Aprobación → mail al cliente "tu acceso está
activo". **Degradar sin romper**: sin API key, loguear y seguir (patrón Result del repo).

### 3.6 Marca de agua (Etapa 3)
Componente overlay en el layout protegido: email del usuario repetido en diagonal,
opacidad ~0.03–0.05, `pointer-events:none`, `user-select:none`, respetando ambos temas y
`reduced-motion`. Server component (el email viene de la sesión), cero JS extra en el cliente.

## 4. Pasos manuales de Lautaro (el ejecutor deja guía paso a paso en `docs/`)

1. **Google OAuth**: crear OAuth Client en Google Cloud Console (tipo Web), autorizar el callback de
   Supabase (`https://<ref>.supabase.co/auth/v1/callback`) y cargar client id/secret en Supabase →
   Auth → Providers → Google. (Etapa 1; la guía la escribe el ejecutor con URLs exactas del proyecto.)
2. **Resend**: crear cuenta, API key → `RESEND_API_KEY` en Vercel (scope Production+Preview). (Etapa 2.)
3. **Env vars Vercel**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas por
   diseño, RLS protege), `ADMIN_EMAILS`, y al final `AUTH_ENFORCED=true` para encender (decisión 13).
4. **Mauro**: se registra normalmente → Lautaro lo promueve a admin desde el panel (decisión 10).
5. **Antes de invitar clientes reales**: resolver hosting (Vercel Pro u alternativa — sesión aparte,
   decisión 11).

## 5. Prompts de ejecución (uno por sesión, copiar/pegar tal cual)

### 5.1 — ETAPA 1: base de autenticación

```text
Leé CLAUDE.md (carga AGENTS.md, docs/ESTADO.md y docs/CONTEXTO.md) y docs/PLAN_LOGIN.md COMPLETO.
Ejecutá la ETAPA 1 del plan de login: base de autenticación. Las decisiones del §2 del plan ya están
cerradas con Lautaro — no re-preguntes ninguna. Este repo usa Next.js 16 con breaking changes: leé
node_modules/next/dist/docs/ antes de escribir código (middleware/proxy, cookies, route handlers).
Trabajá en una rama claude/* creada desde main actualizado, protocolo de docs/ESTADO.md.

ALCANCE DE ESTA ETAPA (y nada más — panel admin es Etapa 2, sesión única/marca de agua/landing es Etapa 3):

1. Dependencias: @supabase/supabase-js + @supabase/ssr. Clientes Supabase para browser/server/middleware
   según el patrón oficial de @supabase/ssr para App Router. No toques src/lib/supabase.ts (lectura de
   datos existente): el auth va en módulos nuevos (src/lib/auth/*).
2. Migración SQL en supabase/migrations/ (timestamp + nombre descriptivo) con: tablas empresas, profiles,
   access_log según §3.2 del plan (sesiones_activas recién en Etapa 3), trigger de creación de profile
   al registrarse un usuario (con seed admin: lautaroronchi97@gmail.com → rol admin + estado aprobado),
   función is_admin() y RLS de TODO según §3.2. Aplicala vía el MCP de Supabase (apply_migration) si está
   disponible; si no, dejala lista y anotá en el PR que falta aplicarla.
3. Páginas (App Router, con la estética premium existente — tokens de globals.css, mismos patrones de
   componentes): /ingresar (botón "Continuar con Google" + form email/contraseña + link a recupero),
   /registro (Google o email+contraseña; pide nombre y apellido, empresa (texto libre) y teléfono;
   para OAuth, un paso post-callback que completa los campos faltantes en profiles), /pendiente ("tu
   registro está esperando aprobación"), recupero de contraseña (flujo completo de Supabase), y el
   callback de OAuth. Verificación de email activa para las altas con contraseña. Logout accesible
   desde el header cuando hay sesión.
4. Protección de rutas con feature flag AUTH_ENFORCED según §3.3 del plan: passthrough total si está
   apagado (LA WEB SIGUE EXACTAMENTE IGUAL QUE HOY — esto es un requisito duro); con flag prendido,
   todo el route group (site) exige sesión válida + estado aprobado, con redirects según §3.3. Implementá
   el cache del "pase" (§3.3) para no pegarle a la base en cada request y NO romper el ISR de las páginas
   de datos. Defensa en profundidad: check también en el layout protegido. El chequeo de permisos POR
   SECCIÓN se deja preparado (la función existe y lee empresa.secciones/override) pero la gestión de
   permisos es de la Etapa 2.
5. access_log: registrar eventos login y logout (server-side).
6. Registrar los pasos manuales de Google OAuth (§4.1) en docs/GUIA_LOGIN_SETUP.md con URLs exactas del
   proyecto (ref gbpfgfeksqmzmsxnxiwg), para que Lautaro lo haga clic por clic.

CALIDAD Y CIERRE:
- Secretos SOLO en env (nunca en el repo); .env.local.example actualizado.
- Eficiencia: server components por defecto, client components solo donde hay interacción; nada de
  librerías de UI nuevas; seguir los patrones existentes del repo (Result tipado, degradar sin romper).
- npm run lint + npx tsc --noEmit + npm run build en verde antes de pushear.
- Probá el flujo completo con navegador (Playwright/chromium disponible) en claro y oscuro: registro con
  email+contraseña, estado pendiente, login, logout, flag apagado = web pública intacta; y con
  AUTH_ENFORCED=true local: redirect a /ingresar, usuario pendiente → /pendiente. Si Google OAuth no se
  puede probar sin los pasos manuales de Lautaro, dejalo explícito en el PR.
- Cerrá la sesión según protocolo: docs/sesiones/AAAA-MM-DD-login-etapa-1.md + actualizar sección
  «Ahora» de docs/ESTADO.md (marcá progreso del ítem 7 del backlog) + PR draft con base main explicando
  qué se probó y qué pasos manuales quedan.
```

### 5.2 — ETAPA 2: panel admin (aprobaciones, empresas, permisos, actividad)

```text
Leé CLAUDE.md (carga AGENTS.md, docs/ESTADO.md y docs/CONTEXTO.md) y docs/PLAN_LOGIN.md COMPLETO.
La Etapa 1 (base de auth) ya está mergeada; verificalo en docs/ESTADO.md y en el código antes de
empezar. Ejecutá la ETAPA 2: panel de administración. Decisiones del §2 cerradas — no re-preguntes.
Next.js 16 con breaking changes: leé node_modules/next/dist/docs/ antes de escribir código.
Rama claude/* desde main actualizado, protocolo de docs/ESTADO.md.

ALCANCE DE ESTA ETAPA:

1. Sección /admin, visible y accesible SOLO para rol admin (middleware + layout + RLS; un cliente que
   adivina la URL no ve nada). Con la estética premium existente. Subsecciones:
   a. PENDIENTES: lista de registros esperando aprobación (nombre, email, empresa_texto, teléfono,
      fecha). Acciones: aprobar (elegir empresa existente o crear una nueva en el momento + asignar) ·
      rechazar. Badge con el conteo de pendientes visible en el header del admin.
   b. USUARIOS: todos los usuarios con estado, empresa, rol, último login (de access_log). Acciones:
      bloquear/desbloquear · cambiar de empresa · promover a admin / degradar (así Lautaro promueve a
      Mauro — decisión 10) · editar secciones_override individual (si es NULL hereda de la empresa).
   c. EMPRESAS: crear/editar/renombrar; editar permisos = checkboxes de las 7 secciones (claves y
      nombres canónicos de la nav existente: granos, dolar, comercio, calculadoras, graficos,
      produccion, noticias). Ver cuántos usuarios tiene cada empresa.
   d. ACTIVIDAD: historial por usuario y global de access_log (login/logout/secciones visitadas,
      dispositivo/navegador parseado del user_agent, IP), filtrable por usuario/empresa/fecha,
      paginado (puede crecer mucho — usar el patrón sbSelectAll/paginado del repo donde aplique).
2. Enforcement REAL de permisos por sección (la función quedó preparada en Etapa 1): con AUTH_ENFORCED
   prendido, un usuario sin permiso para una sección no la ve en la nav y si entra por URL directa ve
   una página "esta sección no está incluida en tu plan" (amable, con contacto). Invalidá el cache del
   "pase" (§3.3) cuando un admin cambia permisos/estado (bastará expirar el cookie corto).
3. Registro de visitas por sección en access_log: liviano y sin romper ISR (ej. beacon del cliente a un
   route handler que inserta server-side con throttle — máx. 1 evento por sección por sesión por X min).
4. Emails vía Resend según §3.5: aviso a ADMIN_EMAILS en cada registro nuevo (datos + link al panel) y
   aviso al cliente cuando lo aprueban. Degradar sin romper si falta RESEND_API_KEY. Actualizar
   docs/GUIA_LOGIN_SETUP.md con el paso a paso de Resend para Lautaro.
5. Migración SQL nueva si hace falta ajustar esquema/policies (nunca editar migraciones ya aplicadas).

CALIDAD Y CIERRE:
- lint + tsc + build en verde. Probar con navegador (claro/oscuro): flujo completo registro → mail (o
  log si no hay key) → aprobar desde el panel → asignar empresa → login del aprobado → permisos por
  sección (sacarle una sección y verificar nav + URL directa) → bloquear → verificar que no entra →
  promover admin. Verificar con un usuario NO admin que /admin es inaccesible.
- Cierre de sesión según protocolo: docs/sesiones/AAAA-MM-DD-login-etapa-2.md + «Ahora» de
  docs/ESTADO.md + PR draft base main.
```

### 5.3 — ETAPA 3: hardening (sesión única, marca de agua, landing, encendido)

```text
Leé CLAUDE.md (carga AGENTS.md, docs/ESTADO.md y docs/CONTEXTO.md) y docs/PLAN_LOGIN.md COMPLETO.
Etapas 1 y 2 ya mergeadas (verificalo). Ejecutá la ETAPA 3: hardening y salida. Decisiones del §2
cerradas — no re-preguntes. Next.js 16: leé node_modules/next/dist/docs/ antes de escribir código.
Rama claude/* desde main actualizado, protocolo de docs/ESTADO.md.

ALCANCE DE ESTA ETAPA:

1. SESIÓN ÚNICA por usuario según §3.4 del plan: migración de sesiones_activas + upsert en cada login +
   check integrado al "pase" del middleware/layout (si el session_id del cookie no es el vigente →
   signOut + pantalla "Tu cuenta se abrió en otro dispositivo" + evento kickeado en access_log, visible
   en el panel de actividad). Revisá si el proyecto Supabase real permite configurar single-session /
   timebox nativos (Auth → Sessions) y usalos como refuerzo si están disponibles en el plan actual;
   la implementación propia es la fuente de verdad. Botón "cerrar sesiones de este usuario" en /admin.
2. DURACIÓN 7 días renovables (§3.4): config de Supabase si el plan lo permite; fallback por last_seen.
3. MARCA DE AGUA (§3.6): overlay con el email del usuario en diagonal, opacidad muy baja, sobre todas
   las páginas de datos del route group protegido. Server component, ambos temas, sin arruinar la
   estética premium (validar visualmente con screenshots claro/oscuro).
4. LANDING MÍNIMA pública (decisión 7): con AUTH_ENFORCED prendido, el visitante sin sesión que llega a
   la raíz ve una página institucional simple — marca ROFO AGRO (glifos/design system existente), una
   línea de qué es el servicio, botones Ingresar y Registrarse. Sin datos de mercado. Con flag apagado
   la home actual no cambia. (La landing completa con contenido comercial es otra sesión del backlog.)
5. REVISIÓN DE SEGURIDAD final de todo el módulo (con AUTH_ENFORCED=true local):
   - Barrido del HTML servido: ninguna página de datos accesible sin sesión aprobada (probar URLs
     directas de las 7 secciones + /api/series y todo route handler de datos existente — protegerlos
     también si quedaron abiertos).
   - RLS: con la anon key sola (sin sesión), verificar que profiles/empresas/access_log/sesiones_activas
     no devuelven filas.
   - Flag apagado: la web pública queda EXACTAMENTE como antes (diff de HTML servido de la home).
6. Actualizar docs/GUIA_LOGIN_SETUP.md con la checklist de encendido para Lautaro (env vars según §4,
   probar con su usuario, promover a Mauro, prender AUTH_ENFORCED) y el recordatorio de resolver hosting
   (§4.5) antes de invitar clientes reales.

CALIDAD Y CIERRE:
- lint + tsc + build en verde. Probar con navegador (claro/oscuro): sesión única (login en dos contextos
  de navegador distintos → el primero queda kickeado con el mensaje correcto), marca de agua visible
  pero sutil en screenshots, landing pública, checklist de seguridad del punto 5 completa.
- Cierre según protocolo: docs/sesiones/AAAA-MM-DD-login-etapa-3.md + «Ahora» de docs/ESTADO.md (marcar
  ítems 7 y 10 del backlog como hechos cuando Lautaro encienda y valide) + PR draft base main.
```

## 6. Fuera de alcance (anotado para después)

- Landing institucional completa con contenido comercial (ítem 3 del backlog — necesita textos/logo de Lautaro).
- Presencia "en vivo" con heartbeat (descartada en decisión 5; se puede sumar después sobre `access_log`).
- Cerrar el SELECT anónimo de las tablas de datos de mercado (hardening opcional, §3.2).
- Presets de usuario en /graficos y demás features que requerían login (backlog gráficos v2 — ahora desbloqueadas).
- Evaluación de hosting Vercel Pro vs alternativas (decisión 11 — sesión aparte, antes de clientes reales).
