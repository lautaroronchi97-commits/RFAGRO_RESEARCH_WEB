# Sesión 2026-07-16 — Login Etapa 1 (base de auth)

- **Rama:** `claude/pending-tasks-list-2m6y6u` · **PR:** #28 (base `main`)
- **Objetivo pedido por Lautaro:** ejecutar la **Etapa 1** del plan de login ([`PLAN_LOGIN.md`](../PLAN_LOGIN.md) §5.1):
  base de autenticación con Supabase Auth, registro con aprobación, y gate detrás de un feature flag que
  entra **apagado** (la web sigue pública igual que hoy).

## Hecho
- **Deps:** `@supabase/supabase-js` + `@supabase/ssr` (0.12.3). Nada de UI nueva.
- **Capa de auth (`src/lib/auth/`):** `config.ts` (flag `AUTH_ENFORCED`, admin sembrado, 7 secciones, rutas
  públicas) · `env.ts` (credenciales `NEXT_PUBLIC_*`) · `client.ts` (browser) · `server.ts` (server, cookies
  async de Next 16) · `session.ts` (refresco + gate optimista para el proxy) · `dal.ts` (`getAuthUser`/`getPerfil`/
  `requireAprobado`/`puedeVerSeccion`, todo con `React.cache`) · `log.ts` (`access_log` con la sesión del usuario).
- **Migración `20260716120000_create_auth_base.sql`:** tablas `empresas`, `profiles` (1:1 con `auth.users`,
  con email/estado/rol/empresa/override), `access_log`; función `is_admin()` (SECURITY DEFINER, sin recursión de
  RLS); trigger `handle_new_user` (crea el perfil al registrarse, siembra `lautaroronchi97@gmail.com` como admin
  aprobado); trigger `protect_profile_fields` (un no-admin no puede auto-cambiarse estado/rol/empresa/permisos);
  RLS en todo (usuario lee/edita su fila; admins todo; log lo inserta el propio usuario, lo leen admins).
- **Pantallas (route group `(auth)` con estética premium):** `/ingresar` (Google + email/pass + link a recupero),
  `/registro` (Google o email/pass; pide nombre, empresa, teléfono), `/pendiente`, `/recuperar` + `/recuperar/
  actualizar`, `/completar` (post-Google: empresa/teléfono). Server actions en `src/app/auth/actions.ts`; callback
  OAuth/confirmación en `src/app/auth/callback/route.ts`. CSS `.auth-*` nuevo en `globals.css`.
- **Gate (`src/proxy.ts` — en Next 16 el middleware se llama `proxy`):** con el flag apagado hace passthrough
  inmediato (no toca Supabase ni cookies); con el flag prendido refresca la sesión y redirige a `/ingresar` a
  quien no tiene sesión. Defensa en profundidad: `(site)/layout.tsx` exige usuario aprobado (solo cuando el flag
  está prendido). Menú de sesión en el header (`auth-menu.tsx`, client) que también solo aparece con el flag on.
- **Docs:** `GUIA_LOGIN_SETUP.md` (pasos de Lautaro: migración, env vars, Google OAuth clic por clic) +
  `.env.local.example` actualizado.

## Decisiones tomadas (y por qué)
- **No romper el ISR (mejora sobre el §3.3 del plan):** en vez de un cookie firmado del "pase", el gate va
  **estrictamente detrás del flag**: con `AUTH_ENFORCED` apagado ni el proxy ni el layout leen cookies → las
  páginas de datos siguen `Static`/ISR **byte por byte como hoy** (verificado en el route table del build: `/`,
  `/granos`, `/dolar`… siguen `○ Static`). Con el flag prendido, la web es privada y el render dinámico por
  usuario es lo correcto. Más simple y con el mismo objetivo.
- **`access_log` sin service key:** lo escribe el **cliente autenticado del usuario** (RLS `with check
  user_id = auth.uid()`), así NO hay que shippear la service key (secreto de escritura) al runtime de la web.
  Más seguro que la nota del plan que sugería service key en route handlers.
- **Menú de sesión client-side:** el header lee el usuario en el navegador, no en el server, para no forzar
  render dinámico del header y preservar el ISR.

## Verificado
- **lint + tsc + build** en verde. Build: `/` y las 7 secciones siguen `Static`/ISR (flag apagado = web igual
  que hoy); `Proxy (Middleware)` registrado; las pantallas de auth existen.
- **Flag apagado (curl):** la home NO tiene menú de sesión (header intacto); `/ingresar` `/registro` `/pendiente`
  renderizan con la estética premium (Google + campos empresa/teléfono, etc.).
- **Flag prendido (curl, server local con creds dummy):** `/` → 307 a `/ingresar`; `/granos` → 307 a
  `/ingresar?next=%2Fgranos` (preserva destino); `/ingresar` sigue 200 (accesible sin sesión).

## Quedó pendiente / en vuelo
- **Aplicar la migración:** el MCP de escritura de Supabase de este entorno volvió a fallar (permisos, ya
  conocido). La migración está versionada; hay que correrla desde el **SQL Editor de Supabase** (o `supabase db
  push`). Está documentado en `GUIA_LOGIN_SETUP.md` §1.
- **Pasos manuales de Lautaro (Etapa 1):** cargar `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `NEXT_PUBLIC_SITE_URL`,
  `AUTH_ENFORCED=false` en Vercel; configurar Google OAuth (guía §3). Recién ahí se puede probar el registro real
  con Google (no se pudo testear acá sin esas credenciales).
- **Etapa 2** (panel admin: aprobar, empresas, permisos por sección, actividad, emails Resend) y **Etapa 3**
  (sesión única, marca de agua, landing, encendido del flag) — prompts en `PLAN_LOGIN.md` §5.2 y §5.3.

## Trampas descubiertas (para la próxima sesión)
- **Next 16 renombró `middleware` → `proxy`** (`src/proxy.ts`, `export function proxy`, runtime Node.js, no edge).
  `cookies()`/`headers()` son **async** (`await`). El patrón de @supabase/ssr usa `getAll`/`setAll` (los `get`/
  `set`/`remove` están deprecados).
- **El SDK de Auth necesita `NEXT_PUBLIC_*`** (corre en el navegador); la capa de datos vieja sigue con
  `SUPABASE_URL`/`SUPABASE_ANON_KEY` server-only. Son las mismas credenciales, distinto nombre.
- El gate en `session.ts` corta temprano si faltan las creds (`authConfigured()`), así el flag prendido sin
  credenciales NO cierra la web por error (degrada solo).
