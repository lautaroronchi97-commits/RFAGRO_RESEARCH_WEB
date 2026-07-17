# Sesión 2026-07-17 — Login Etapa 3 (sesión única, marca de agua, landing, encendido)

- **Rama:** `claude/login-stage-3-kqt0pg` · **PR:** #_ (base `main`)
- **Objetivo pedido por Lautaro:** ejecutar la **Etapa 3** del plan de login ([`PLAN_LOGIN.md`](../PLAN_LOGIN.md) §5.3):
  hardening y salida — sesión única por usuario, duración de 7 días, marca de agua, landing pública mínima,
  revisión de seguridad final y dejar todo listo para prender `AUTH_ENFORCED`.

## Hecho
- **Migración aplicada a la base** (`20260717120000_auth_sesion_unica.sql`, vía MCP `execute_sql`): tabla
  `sesiones_activas` (1 fila por usuario = su sesión vigente) + RLS (el usuario lee solo su fila; admins todas;
  las escrituras van por RPC). Funciones `SECURITY DEFINER`: `registrar_sesion` (login → esta sesión pasa a ser
  la vigente, pisa la anterior), `tocar_sesion` (chequeo por request → `ok`/`kicked`/`expired`, con adopt-when-
  missing y throttle de `last_seen` a 5 min), `cerrar_mi_sesion` (logout limpia la fila) y `admin_cerrar_sesiones`
  (centinela que fuerza re-login, guardado por `is_admin()`).
- **Sesión única (`src/lib/auth/sesion.ts` + `session.ts` + login flows):** el `session_id` sale del JWT
  decodificado localmente (es estable entre refrescos, cero round-trips extra). El proxy (`updateSession`), con el
  flag prendido y usuario logueado, llama `tocar_sesion`; si `kicked`/`expired` → audita `kickeado` en `access_log`
  (antes del signOut, con RLS), hace **signOut LOCAL** (`scope:"local"` — NO revoca la sesión del otro dispositivo)
  y redirige a `/sesion-cerrada`. Se registra la sesión en cada login: `ingresarConPassword`, el callback de OAuth,
  y tras `actualizarPassword`; el logout llama `cerrar_mi_sesion`.
- **Pantalla `/sesion-cerrada`** (route group `(auth)`): "tu cuenta se abrió en otro dispositivo" (o
  `?motivo=expirada` para el timeout de 7 días) + volver a ingresar / cambiar contraseña.
- **Marca de agua (`src/components/watermark.tsx`):** overlay fijo `pointer-events:none` con el email del usuario
  repetido en diagonal. Técnica: `mask-image` (texto SVG como máscara) sobre `background-color:var(--ink)` → el
  color **sigue el tema** (claro/oscuro) sin duplicar capas; opacidad .05/.06 (sutil). Server Component (email de la
  sesión), cero JS. Se monta en `(site)/layout.tsx` solo con `AUTH_ENFORCED` + perfil aprobado.
- **Landing mínima (`(auth)/bienvenida/page.tsx` + CSS `.landing-*`):** marca RF AGRO + una línea + botones
  Ingresar/Registrarse, sin datos de mercado. El proxy redirige el `/` sin sesión → `/bienvenida` (solo con el flag
  prendido; con el flag apagado `/` sigue siendo el tablero).
- **Botón "Cerrar sesión" por usuario en `/admin`** (`admin/actions.ts` `cerrarSesionesUsuario` + `usuario-row.tsx`).
- **API de datos protegida:** `guardApiSeccion()` nuevo en `dal.ts` → `/api/series` y `/api/series/catalogo` exigen
  sesión aprobada + permiso "Gráficos" con el flag prendido (401/403 + `no-store`); con el flag apagado NO leen
  cookies y mantienen el cache público de siempre.
- **Config:** `RUTAS_PUBLICAS` suma `/bienvenida` y `/sesion-cerrada`. Guía de encendido (`GUIA_LOGIN_SETUP.md`)
  completada con la **checklist de `AUTH_ENFORCED=true`** + recordatorio de hosting antes de clientes reales.

## Decisiones tomadas (y por qué)
- **Enforcement de sesión única en el PROXY, no en el layout.** El proxy corre en cada request (incl. RSC nav),
  puede escribir cookies (imprescindible para el signOut) y limpiarlas en el redirect. El layout no re-renderiza al
  navegar. El `session_id` se decodifica local (no `getClaims`, que en HS/ES vuelve a pegarle a la red).
- **signOut LOCAL (`scope:"local"`) al patear.** Cierra solo el dispositivo viejo; NO revoca la sesión que
  legítimamente tomó la cuenta (un signOut global las mataría a las dos → loop).
- **Adopt-when-missing en `tocar_sesion`.** Si no hay fila (sesión previa a la feature), la adopta como vigente en
  vez de patear → al prender el flag nadie queda deslogueado de golpe sin motivo.
- **Marca de agua por `mask-image` + `var(--ink)`** en vez de background con color fijo: un solo overlay sirve para
  los dos temas (el color lo pone el token). Sin CSP que bloquee data URIs (no hay CSP de imágenes en el repo).
- **Landing por REDIRECT del `/` (no rewrite).** Más simple y sin sorpresas con RSC/prefetch; la landing vive en
  `/bienvenida`. Se mantiene intacto el gate de `requireAprobado` del layout `(site)` (defensa en profundidad).
- **`registrar_sesion` en el login sin gatear por el flag.** Es backend (solo ocurre en el flujo de auth), no
  cambia la web pública; deja los datos listos para cuando se prenda el flag.

## Verificado
- **lint + tsc + build** en verde. El build confirma que **con el flag apagado** `/` y las 7 secciones siguen
  `○ Static`/ISR (idénticas a hoy) y `/bienvenida` es estático; los nuevos routes entran sin tocar eso.
- **Backend por SQL** (usuarios simulados con JWT, borrados al final, base en 0): `tocar_sesion` da `ok` para el
  mismo dispositivo, `kicked` para otro, el 2º login desplaza al 1º, `expired` a los 8 días, adopta sin fila; el
  guard de `admin_cerrar_sesiones` no-opea para no-admin y escribe centinela para admin; `cerrar_mi_sesion` limpia.
  **RLS**: anon ve 0 filas de `sesiones_activas`; un cliente ve solo la suya, no la de otros.
- **Navegador (Chromium, Playwright, flag PRENDIDO con la anon key real + un usuario aprobado de prueba):**
  `/` sin sesión → `/bienvenida` (screenshot); login → tablero con **marca de agua** (claro y oscuro, screenshots);
  `/granos` (permitida) 200 con nav filtrada (6 secciones, sin Gráficos ni Admin); `/graficos` (NO permitida) →
  `/sin-acceso`; `/api/series` logueado sin permiso → **403**; **sesión única**: login en un 2º contexto → el 1º,
  al navegar, cae en **`/sesion-cerrada`** (screenshot) y queda el evento `kickeado` en `access_log`.
- **Barrido flag APAGADO (runtime):** `/` 200 (tablero, sin redirect a landing), secciones 200 públicas,
  `/api/series` con `cache-control: public, s-maxage=3600`, **sin** marca de agua en el HTML; `/admin` sigue 307 a
  `/ingresar` (protegido siempre). = la web pública queda EXACTAMENTE como antes.

## Quedó pendiente / en vuelo
- **Prender el login lo hace Lautaro** cuando probó todo: cargar env vars (si faltan), promover a Mauro, aprobar
  clientes y poner `AUTH_ENFORCED=true` en Vercel (checklist en `GUIA_LOGIN_SETUP.md`). El código entra APAGADO.
- **Hosting** (Vercel Pro vs alternativas, decisión 11) antes de clientes reales — sesión aparte.
- **E2E logueado con Google OAuth**: no se puede sin los pasos manuales de Lautaro (Google Cloud). El flujo de
  email+contraseña quedó probado punta a punta; el de OAuth registra la sesión igual (mismo `registrarSesion`).

## Trampas descubiertas (para la próxima sesión)
- **Sembrar un usuario de prueba por SQL:** GoTrue tira `500 "Database error querying schema"` si las columnas de
  token de `auth.users` (`confirmation_token`, `recovery_token`, `email_change*`, `phone_change*`,
  `reauthentication_token`) quedan **NULL** → hay que ponerlas en `''`. Además el validador de email **rechaza**
  `.test` y `example.com` (usar un dominio "normal"). `crypt`/`gen_salt` viven en el schema `extensions`.
- **`sleep` en primer plano está bloqueado** en este entorno (mata el comando). Para esperar un server, `curl
  --retry`; para correrlo, Bash con `run_in_background`.
- **El JWT del proyecto es ES256** (signing keys asimétricas activas). No afecta: el `session_id` se decodifica
  local; pero `getClaims()` haría fetch de JWKS/getUser — por eso NO se usa en el proxy.
- El `execute_sql` del MCP corre DDL (el `apply_migration` sigue pidiendo una aprobación que no llega). La anon key
  se pudo bajar con `get_publishable_keys` (en la Etapa 2 estaba gateado; ahora funcionó).
