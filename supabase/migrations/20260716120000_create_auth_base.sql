-- RF AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- ETAPA 1 del login (ver docs/PLAN_LOGIN.md §3.2): base de autenticación.
-- Tablas: empresas · profiles (1:1 con auth.users) · access_log (auditoría).
-- Modelo: registro autoservicio + aprobación manual · permisos por sección a nivel
-- empresa (+ override individual) · rol cliente/admin · admin sembrado por email.
-- Todo con RLS. El enforcement por sección y el panel admin son de la Etapa 2.

-- ============================================================================
-- EMPRESAS
-- ============================================================================
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  secciones text[] not null default '{}',   -- claves de sección permitidas (granos, dolar, ...)
  created_at timestamptz not null default now()
);

-- ============================================================================
-- PROFILES (una fila por usuario de auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text not null default '',
  empresa_texto text not null default '',              -- empresa declarada en el registro (texto libre)
  telefono text not null default '',
  estado text not null default 'pendiente'
    check (estado in ('pendiente','aprobado','rechazado','bloqueado')),
  rol text not null default 'cliente' check (rol in ('cliente','admin')),
  empresa_id uuid references public.empresas (id) on delete set null,
  secciones_override text[],                            -- si no es null, pisa las de la empresa
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null
);

create index if not exists profiles_estado_idx on public.profiles (estado);
create index if not exists profiles_empresa_idx on public.profiles (empresa_id);

-- ============================================================================
-- ACCESS_LOG (historial de logins y actividad)
-- ============================================================================
create table if not exists public.access_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  ts timestamptz not null default now(),
  evento text not null check (evento in ('login','logout','seccion','kickeado')),
  seccion text,
  ip text,
  user_agent text
);

create index if not exists access_log_user_idx on public.access_log (user_id, ts desc);
create index if not exists access_log_ts_idx on public.access_log (ts desc);

-- ============================================================================
-- is_admin(): helper SECURITY DEFINER para las policies (evita recursión de RLS
-- al consultar profiles desde las propias policies de profiles).
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and rol = 'admin'
  );
$$;

-- ============================================================================
-- Trigger de alta: al crear un usuario en auth.users, crear su profile.
-- Si el email es un admin sembrado → rol admin + estado aprobado (no pasa por
-- aprobación). Los datos de contacto vienen del metadata del registro (email+pass)
-- o quedan vacíos para completar tras el OAuth de Google.
-- OJO: mantener el listado en sync con ADMIN_SEED_EMAILS de src/lib/auth/config.ts.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  es_admin boolean := new.email = any (array['lautaroronchi97@gmail.com']);
begin
  insert into public.profiles (id, email, nombre, empresa_texto, telefono, estado, rol, approved_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'empresa_texto', ''),
    coalesce(new.raw_user_meta_data->>'telefono', ''),
    case when es_admin then 'aprobado' else 'pendiente' end,
    case when es_admin then 'admin' else 'cliente' end,
    case when es_admin then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Guard anti escalada: un no-admin no puede cambiarse estado/rol/empresa/permisos.
-- Si intenta un UPDATE de esos campos, se restauran a los valores previos.
-- (Permite que el cliente edite solo sus datos de contacto: nombre/empresa_texto/telefono.)
-- ============================================================================
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.estado := old.estado;
    new.rol := old.rol;
    new.empresa_id := old.empresa_id;
    new.secciones_override := old.secciones_override;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields_trg on public.profiles;
create trigger protect_profile_fields_trg
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.empresas enable row level security;
alter table public.profiles enable row level security;
alter table public.access_log enable row level security;

-- PROFILES: el usuario lee y actualiza SOLO su fila (el guard de arriba impide
-- que toque campos sensibles). Los admins leen y editan todas.
drop policy if exists "self read profile" on public.profiles;
create policy "self read profile" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "self update profile" on public.profiles;
create policy "self update profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "admin all profiles" on public.profiles;
create policy "admin all profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- EMPRESAS: cualquier usuario autenticado puede leerlas (para ver su propia
-- empresa/permisos); solo admins escriben.
drop policy if exists "auth read empresas" on public.empresas;
create policy "auth read empresas" on public.empresas
  for select to authenticated using (true);

drop policy if exists "admin write empresas" on public.empresas;
create policy "admin write empresas" on public.empresas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ACCESS_LOG: el usuario inserta SOLO sus propios eventos; los admins leen todo.
-- (Así la web escribe el log con la sesión del usuario, sin service key.)
drop policy if exists "self insert log" on public.access_log;
create policy "self insert log" on public.access_log
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "admin read log" on public.access_log;
create policy "admin read log" on public.access_log
  for select to authenticated using (public.is_admin());
