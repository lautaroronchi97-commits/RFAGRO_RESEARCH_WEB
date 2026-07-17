-- RF AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- ETAPA 3 del login (ver docs/PLAN_LOGIN.md §3.4 y §5.3): hardening.
--
-- Agrega la SESIÓN ÚNICA por usuario (anti-préstamo, decisión 2) + duración de 7
-- días renovables (decisión 8). Una fila por usuario en `sesiones_activas` con el
-- `session_id` del JWT vigente: la última que se registra (último login) pisa a la
-- anterior. En cada request el proxy llama `tocar_sesion()`; si el session_id del
-- cookie no coincide con el registrado → 'kicked' (otro dispositivo tomó la cuenta).
--
-- Todo por RPC SECURITY DEFINER acotadas a auth.uid() (o is_admin() para el panel):
-- la web NUNCA necesita la service key para esto.

-- ============================================================================
-- SESIONES_ACTIVAS (una fila por usuario = su sesión vigente)
-- ============================================================================
create table if not exists public.sesiones_activas (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_id text not null,          -- claim session_id del JWT de Supabase (auth.sessions)
  device text,                       -- SO · navegador parseado del user-agent (informativo)
  ip text,
  created_at timestamptz not null default now(),  -- cuándo se tomó esta sesión (último login)
  last_seen timestamptz not null default now()    -- última actividad (para el timeout de 7 días)
);

alter table public.sesiones_activas enable row level security;

-- El usuario lee SOLO su propia fila; los admins leen todas (panel). Las ESCRITURAS
-- van siempre por las RPC de abajo (SECURITY DEFINER), nunca directas desde el cliente.
drop policy if exists "self read sesion" on public.sesiones_activas;
create policy "self read sesion" on public.sesiones_activas
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "admin read sesiones" on public.sesiones_activas;
create policy "admin read sesiones" on public.sesiones_activas
  for select to authenticated using (public.is_admin());

-- ============================================================================
-- registrar_sesion(): al LOGIN, fija la sesión de este dispositivo como la vigente
-- (pisa cualquier anterior → el segundo dispositivo desplaza al primero).
-- ============================================================================
create or replace function public.registrar_sesion(
  p_session_id text,
  p_device text default null,
  p_ip text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or coalesce(p_session_id, '') = '' then return; end if;
  insert into public.sesiones_activas (user_id, session_id, device, ip, created_at, last_seen)
  values (uid, p_session_id, nullif(p_device, ''), nullif(p_ip, ''), now(), now())
  on conflict (user_id) do update
    set session_id = excluded.session_id,
        device = excluded.device,
        ip = excluded.ip,
        created_at = now(),
        last_seen = now();
end;
$$;

revoke all on function public.registrar_sesion(text, text, text) from public;
grant execute on function public.registrar_sesion(text, text, text) to authenticated;

-- ============================================================================
-- tocar_sesion(): chequeo por request (lo llama el proxy). Devuelve:
--   'ok'      → esta sesión es la vigente (y refresca last_seen con throttle 5 min)
--   'kicked'  → otra sesión (otro dispositivo) tomó la cuenta → cerrar esta
--   'expired' → 7 días sin actividad → re-login
-- Si no hay fila (sesión previa a esta feature) la ADOPTA como vigente (no patea).
-- ============================================================================
create or replace function public.tocar_sesion(
  p_session_id text,
  p_device text default null,
  p_ip text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  reg public.sesiones_activas%rowtype;
begin
  if uid is null or coalesce(p_session_id, '') = '' then return 'ok'; end if;

  select * into reg from public.sesiones_activas where user_id = uid;

  -- Sin fila: adoptar la sesión actual como vigente (arranca el enforcement sin patear).
  if not found then
    insert into public.sesiones_activas (user_id, session_id, device, ip, created_at, last_seen)
    values (uid, p_session_id, nullif(p_device, ''), nullif(p_ip, ''), now(), now())
    on conflict (user_id) do nothing;
    return 'ok';
  end if;

  -- Otro dispositivo tomó la cuenta (o un admin revocó): esta sesión ya no vale.
  if reg.session_id is distinct from p_session_id then
    return 'kicked';
  end if;

  -- 7 días de inactividad → sesión expirada.
  if reg.last_seen < now() - interval '7 days' then
    return 'expired';
  end if;

  -- Es la vigente: refrescar last_seen como mucho cada 5 min (evita un write por request).
  if reg.last_seen < now() - interval '5 minutes' then
    update public.sesiones_activas
      set last_seen = now(), ip = coalesce(nullif(p_ip, ''), ip)
      where user_id = uid;
  end if;

  return 'ok';
end;
$$;

revoke all on function public.tocar_sesion(text, text, text) from public;
grant execute on function public.tocar_sesion(text, text, text) to authenticated;

-- ============================================================================
-- cerrar_mi_sesion(): al LOGOUT, libera la fila del usuario (deja el slot limpio).
-- ============================================================================
create or replace function public.cerrar_mi_sesion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  delete from public.sesiones_activas where user_id = uid;
end;
$$;

revoke all on function public.cerrar_mi_sesion() from public;
grant execute on function public.cerrar_mi_sesion() to authenticated;

-- ============================================================================
-- admin_cerrar_sesiones(): botón del panel "cerrar sesiones de este usuario".
-- Escribe un session_id centinela imposible de igualar → en el próximo request del
-- usuario, tocar_sesion devuelve 'kicked' y lo obliga a volver a loguearse.
-- ============================================================================
create or replace function public.admin_cerrar_sesiones(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return; end if;
  if p_user is null then return; end if;
  insert into public.sesiones_activas (user_id, session_id, device, ip, created_at, last_seen)
  values (p_user, 'revocada:' || gen_random_uuid()::text, 'admin', null, now(), now())
  on conflict (user_id) do update
    set session_id = 'revocada:' || gen_random_uuid()::text,
        last_seen = now();
end;
$$;

revoke all on function public.admin_cerrar_sesiones(uuid) from public;
grant execute on function public.admin_cerrar_sesiones(uuid) to authenticated;
