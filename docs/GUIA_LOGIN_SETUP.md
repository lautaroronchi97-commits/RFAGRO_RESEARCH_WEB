# GUÍA DE ENCENDIDO DEL LOGIN — pasos manuales de Lautaro

> Esta guía la va completando cada etapa del login. Ya cubre las **3 etapas**: Etapa 1 (base de
> autenticación), Etapa 2 (panel admin + emails) y Etapa 3 (sesión única, marca de agua, landing
> y **checklist de encendido** — sección final).
> Plan completo y decisiones: [`PLAN_LOGIN.md`](PLAN_LOGIN.md).

El proyecto Supabase es **`lineup-argentina`**, ref **`gbpfgfeksqmzmsxnxiwg`**.

---

## ⚡ GUÍA DEFINITIVA 22/07/2026 — Vercel Pro + encendido, EN ORDEN (E5 fase 2)

> Decisión de Lautaro (22/07): Vercel Pro se contrata YA (antes de clientes) y después se
> prende el login. Esta sección es la lista maestra en orden; el detalle de cada paso viejo
> sigue abajo en su etapa. Tiempo total estimado: ~30-40 min de clics.

### Parte A — Vercel Pro (hacelo primero; ~10 min)

1. Entrá a https://vercel.com → tu cuenta → el proyecto **rfagro-research-web** → arriba a la
   izquierda elegí el *scope* (equipo) dueño del proyecto → **Settings → Billing → Upgrade to
   Pro**. Es **US$20/mes por asiento** y alcanza con **1 asiento** (los deploys entran por
   GitHub, nadie más necesita cuenta de Vercel). Cargás la tarjeta y listo.
2. **Spend limit** (que no haya sorpresas): en *Billing* → *Spend Management* → activá el
   límite (ej. **US$40/mes**) con "pause projects" — con nuestro tráfico jamás se acerca; es
   un seguro.
3. **Functions a São Paulo** (esto es EL beneficio técnico del Pro): proyecto → *Settings* →
   *Functions* → *Function Region* → elegí **São Paulo (gru1)**. La base (Supabase) vive ahí:
   cada regeneración ISR y, con el login prendido, cada chequeo de sesión deja de viajar a
   Washington (~130 ms) y pasa a ~10-20 ms.
4. *Deployments* → botón **Redeploy** del último deploy de producción (para que tome la región).

### Parte B — pre-encendido técnico (después de mergear el PR #58)

1. **Mergeá el PR #58** (fase 2 de E5 — trae los fixes que el encendido necesita: el proxy ya
   no bloquea `/api/views/insumos`, la web de mesa puede leer con service key, alertas, etc.).
2. **Env var nueva en Vercel**: *Settings → Environment Variables* → agregá
   **`SUPABASE_SERVICE_KEY`** con scope **Production ÚNICAMENTE** (el valor está en Supabase →
   *Settings → API keys* → `service_role`). Con esto las páginas de mesa leen salteando RLS.
   Aprovechá y verificá que estén: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `INFORME_TOKEN` y las `RESEND_*`
   (sensibles = solo Production, como ya dejaste el 22/07). Después: **Redeploy**.
3. **Secret nuevo en GitHub** (para los avisos de crons rotos): repo en GitHub → *Settings →
   Secrets and variables → Actions → New repository secret* → nombre **`RESEND_API_KEY`**,
   valor = la misma key `re_...` de Resend que está en Vercel. (Opcional: `RESEND_FROM` si ya
   verificaste dominio.) Sin esto los workflows andan igual; solo no mandan el mail de alerta.
4. **Probá los crons arreglados** (Actions → cada workflow → *Run workflow* en `main`):
   *Ingesta line-up* (tiene que salir VERDE — antes moría en el refresh),
   *Ingesta estimaciones Argentina* (tiene que salir VERDE — DEA ahora va vía Edge Function) y
   *Healthcheck* (todos ✓). El de compras se prueba solo el jueves 23/07 a las 10:00.
5. **Aplicá el cierre de las matviews de mesa** (recién DESPUÉS del paso 2 + redeploy):
   Supabase → *SQL Editor* → pegá el contenido de
   `supabase/migrations/20260722013200_e5_revoke_matviews_mesa.sql` → *Run*. Verificación:
   `/comercio/temperatura` logueado como admin se ve igual que antes. (Para revertir:
   `grant select on public.<matview> to anon, authenticated;`)
6. **Un click en Supabase**: *Authentication → Sign In / Up → Passwords* → activar **Leaked
   password protection** (chequea contraseñas filtradas contra HaveIBeenPwned).
7. **Higiene opcional**: *Edge Functions* → borrar `lineup-probe` y `lineup-fetch` (sobras del
   desarrollo de la Fase 0 de puertos; la única viva es `lineup-ingest` + la nueva `dea-fetch`).

### Parte C — prender el login

Seguí el checklist de la **Etapa 3 §3** de abajo (cuenta admin OK → Mauro → aprobar clientes →
`AUTH_ENFORCED=true` en Production → Redeploy). Validación de 5 minutos post-encendido:

- Ventana de incógnito → `rfagro-research-web.vercel.app` → tiene que aparecer **/bienvenida**.
- Logueado vos → tablero completo + marca de agua + `/comercio/temperatura` visible.
- `curl -H "Authorization: Bearer <INFORME_TOKEN>" https://<tu-dominio>/api/views/insumos`
  → JSON (200); sin el header → 401. **Ojo MP3**: el token ahora va por header — el prompt de
  la Routine semanal ya quedó actualizado en la sesión MP3.
- Si algo se rompe feo: `AUTH_ENFORCED=false` + Redeploy y la web vuelve a ser pública al toque.

---

## Etapa 1 — lo que hay que hacer para probar el login

Nada de esto cierra la web: mientras `AUTH_ENFORCED` no esté en `true`, la web sigue
pública igual que hoy. Estos pasos habilitan que vos y Mauro puedan registrarse y probar.

### 1. Aplicar la migración de la base (crea las tablas del login)

La migración está en el repo: `supabase/migrations/20260716120000_create_auth_base.sql`.
Crea las tablas `empresas`, `profiles` y `access_log`, el trigger que arma tu perfil al
registrarte y las reglas de seguridad (RLS). Ya deja a **lautaroronchi97@gmail.com** como
admin aprobado.

> ✅ **Ya aplicada** (16/07/2026, en la sesión de la Etapa 2, vía el MCP de Supabase). Las
> tablas `empresas`, `profiles`, `access_log` y las RPC del panel ya existen en la base. Si
> alguna vez recreás el proyecto desde cero, aplicá las dos migraciones de auth con una de estas:
- **SQL Editor de Supabase (más simple):** entrá a Supabase → tu proyecto → *SQL Editor* →
  pegá el contenido del archivo `.sql` → *Run*. (Se puede correr más de una vez sin romper nada.)
- **Supabase CLI:** `supabase db push` desde la raíz del repo (si tenés la CLI configurada).

### 2. Cargar las variables de entorno en Vercel

Vercel → tu proyecto → *Settings* → *Environment Variables*. Agregá (scope **Production**
y **Preview**):

| Variable | Valor | Nota |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gbpfgfeksqmzmsxnxiwg.supabase.co` | Misma URL de Supabase que ya usás |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu clave **publishable/anon** | La misma que `SUPABASE_ANON_KEY`; es pública por diseño |
| `NEXT_PUBLIC_SITE_URL` | `https://rfagro-research-web.vercel.app` | Para los enlaces de los emails y el callback |
| `AUTH_ENFORCED` | `false` | **Dejalo en false por ahora.** Se prende en la Etapa 3 |

> Estas son las mismas credenciales que ya tenés, solo con el nombre `NEXT_PUBLIC_`
> (el login corre también en el navegador y necesita ese prefijo). La clave anon es
> pública: las tablas están protegidas por RLS.
> En local, copiá `.env.local.example` a `.env.local` y completá esos valores.

### 3. Configurar el login con Google (OAuth)

Para el botón "Continuar con Google". Si por ahora solo querés probar con email + contraseña,
podés saltear esto y hacerlo después.

**a) Crear las credenciales en Google Cloud Console** (https://console.cloud.google.com):
1. Creá (o elegí) un proyecto.
2. *APIs & Services* → *Credentials* → *Create Credentials* → *OAuth client ID*.
3. Si te lo pide, configurá la *OAuth consent screen* (tipo External; con tu email de soporte).
4. Tipo de aplicación: **Web application**.
5. En **Authorized redirect URIs**, agregá exactamente esta (es el callback de Supabase):
   ```
   https://gbpfgfeksqmzmsxnxiwg.supabase.co/auth/v1/callback
   ```
6. Guardá y copiá el **Client ID** y el **Client Secret**.

**b) Cargarlas en Supabase:**
1. Supabase → tu proyecto → *Authentication* → *Providers* → **Google** → activá *Enable*.
2. Pegá el **Client ID** y el **Client Secret** → *Save*.

**c) URLs de redirección permitidas en Supabase** (*Authentication* → *URL Configuration*):
- **Site URL:** `https://rfagro-research-web.vercel.app`
- En **Redirect URLs**, agregá:
  ```
  https://rfagro-research-web.vercel.app/auth/callback
  http://localhost:3000/auth/callback
  ```
  (La de localhost es para probar en tu compu.)

### 4. (Recomendado) Confirmación de email

Supabase → *Authentication* → *Providers* → *Email*: dejá activado *Confirm email* para que
quien se registra con contraseña tenga que confirmar su dirección. Los mails de Supabase salen
solos (en la Etapa 2 sumamos los avisos a los admins vía Resend).

### 5. Probar

1. Entrá a `/registro` en la web (o en tu Preview). Registrate con un email de prueba
   (o con Google). Vas a caer en la pantalla **"Cuenta pendiente de aprobación"**.
2. Registrate con **tu** Gmail (`lautaroronchi97@gmail.com`): al ser admin sembrado, tu
   cuenta queda **aprobada** automáticamente (el panel para aprobar a los demás llega en la Etapa 2).
3. Mientras `AUTH_ENFORCED=false`, la web sigue abierta: para ver las pantallas de login entrá
   directo a `/ingresar` o `/registro`.

**El encendido del login (`AUTH_ENFORCED=true`) se hace en la Etapa 3**, después de tener el
panel admin (Etapa 2) para poder aprobar clientes. No lo prendas antes.

---

## Etapa 2 — panel admin + emails de aviso (Resend)

La Etapa 2 agregó el **panel de administración** en `/admin` (aprobar cuentas, empresas,
permisos por sección, actividad) y los **emails de aviso**. Nada de esto cierra la web:
`/admin` está protegido y solo lo ve un admin logueado; el resto sigue igual que hoy hasta
que prendas `AUTH_ENFORCED` (Etapa 3).

### 1. Migración de la Etapa 2 — ✅ ya aplicada

`supabase/migrations/20260716180000_auth_admin_panel.sql` (funciones de lectura del panel +
el registro de visitas por sección). **Ya aplicada** el 16/07 junto con la de la Etapa 1. No
hay que hacer nada; queda versionada por si recreás el proyecto.

### 2. Entrar al panel

Con las env vars de la Etapa 1 cargadas y tu cuenta ya registrada (admin sembrado), entrá a
**`/admin`**. Vas a ver 5 pestañas (la 5ª, **Datos**, se sumó el 20/07 con el uploader de compras):
- **Pendientes:** las cuentas nuevas. Aprobás eligiendo una empresa (existente o nueva) o rechazás.
- **Usuarios:** todos, con estado/empresa/rol/último ingreso. Bloquear, cambiar de empresa,
  **promover a admin** (así habilitás a Mauro cuando se registre) y permisos individuales.
- **Empresas:** crear/renombrar y tildar qué secciones ve cada empresa (sus usuarios las heredan).
- **Actividad:** quién entró, cuándo, qué secciones visitó, desde qué dispositivo e IP.

### 3. Emails de aviso (Resend) — opcional pero recomendado

Sin esto el login **no se rompe**: los avisos simplemente no se envían (quedan en el log del
servidor). Para que se manden:

**a) Crear la cuenta y la API key:**
1. Entrá a https://resend.com y creá una cuenta (el plan gratis alcanza de sobra: 3.000/mes).
2. *API Keys* → *Create API Key* → copiala (empieza con `re_`).

**b) Remitente (`RESEND_FROM`):** para mandar a cualquier casilla necesitás **verificar un
dominio propio** en Resend (*Domains* → agregás tu dominio y cargás los registros DNS que te
da). Después usás algo como `RF AGRO <research@tudominio.com>`. Si todavía no tenés dominio,
Resend te deja probar con `onboarding@resend.dev`, pero **solo te llega a vos mismo** (el email
de la cuenta de Resend) — sirve para probar, no para producción.

**c) Cargar las env vars** (Vercel → *Settings* → *Environment Variables*, scope Production+Preview;
y en `.env.local` para local):

| Variable | Valor | Nota |
|---|---|---|
| `RESEND_API_KEY` | tu clave `re_...` | Secreta. Sin ella, no se envían emails (no rompe nada) |
| `RESEND_FROM` | `RF AGRO <research@tudominio.com>` | Remitente. Requiere dominio verificado en Resend |
| `ADMIN_EMAILS` | `lautaroronchi97@gmail.com` | Quién recibe el aviso de "registro nuevo". Coma-separado si son varios |

**Qué manda:** cuando alguien se registra, te llega un email con sus datos y un link al panel.
Cuando aprobás una cuenta, al cliente le llega "tu acceso está activo".

## Etapa 3 — sesión única, marca de agua, landing y ENCENDIDO

La Etapa 3 sumó la **sesión única** (una sola sesión activa por usuario: al entrar en otro
dispositivo, el anterior se cierra), la **marca de agua** (tu email tenue sobre los datos), la
**landing pública mínima** en `/bienvenida` y dejó todo listo para **prender el login**. Nada
de esto cambia la web mientras `AUTH_ENFORCED` siga en `false`.

### 1. Migración de la Etapa 3 — ✅ ya aplicada

`supabase/migrations/20260717120000_auth_sesion_unica.sql` (tabla `sesiones_activas` + las
funciones `registrar_sesion` / `tocar_sesion` / `cerrar_mi_sesion` / `admin_cerrar_sesiones`,
todas con RLS). **Ya aplicada** el 17/07 vía el MCP de Supabase. Queda versionada por si recreás
el proyecto.

### 2. (Opcional) Reforzar con la config nativa de Supabase

La sesión única y el vencimiento a 7 días ya los maneja el código (es la fuente de verdad). Si
querés reforzarlo desde Supabase (según lo que permita el plan): *Authentication* → *Sessions*
→ *Time-box user sessions* y/o *Inactivity timeout* (poné 7 días). No es obligatorio.

### 3. Checklist de ENCENDIDO (cuando ya probaste todo)

Recién acá se cierra la web. Antes de prenderlo, asegurate de:

1. **Env vars cargadas** (Etapa 1 §2): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL`. (Emails opcionales: `RESEND_API_KEY`/`RESEND_FROM`/`ADMIN_EMAILS`.)
2. **Tu cuenta funciona:** entraste con `lautaroronchi97@gmail.com`, sos admin y ves `/admin`.
3. **Mauro:** que se registre y promovelo a admin desde *Usuarios* (decisión 10).
4. **Aprobá a los clientes** que vayan a entrar (o creá sus empresas con las secciones que
   correspondan), así no se topan con la pantalla de "pendiente" al prender el login.
5. **Prendé el flag:** Vercel → *Settings* → *Environment Variables* → cambiá **`AUTH_ENFORCED`
   a `true`** (scope Production; y Preview si querés probarlo ahí) → *Redeploy*.

**Qué cambia al prender `AUTH_ENFORCED=true`:**
- El visitante sin sesión que entra a la web ve la **landing** `/bienvenida` (marca + Ingresar/
  Registrarse). Todos los datos quedan detrás del login.
- Cada cliente solo ve las secciones que su empresa (o su override) tenga habilitadas.
- Una sola sesión por usuario: si entra en otro dispositivo, el anterior se cierra con el aviso
  "tu cuenta se abrió en otro dispositivo". A los 7 días sin usar, pide re-login.
- La marca de agua con el email aparece tenue sobre las páginas de datos.
- En `/admin` → *Usuarios* tenés el botón **"Cerrar sesión"** para desloguear a un usuario de
  todos sus dispositivos.

Para **apagarlo** de nuevo: poné `AUTH_ENFORCED=false` y redeploy → la web vuelve a ser pública.

### 4. Hosting — ✅ DECIDIDO (22/07/2026, auditoría E5)

Vercel Hobby es no-comercial. Decisión de Lautaro con la comparación de E5
([`auditoria/E5-infra.md`](auditoria/E5-infra.md) § hosting): **Vercel Pro, US$20/mes, 1
asiento, functions en gru1 (São Paulo) + spend limit** — y se contrata ANTES de invitar
clientes. Los pasos exactos están en la **Parte A de la guía definitiva** (arriba de todo).
