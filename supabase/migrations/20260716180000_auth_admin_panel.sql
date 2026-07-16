-- RF AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- ETAPA 2 del login (ver docs/PLAN_LOGIN.md §5.2): soporte del panel de administración.
--
-- No cambia el esquema de tablas (todo lo cubrió la Etapa 1). Agrega:
--   1) registrar_visita_seccion(): registra el evento 'seccion' con throttle server-side
--      (máx. 1 por usuario+sección cada 10 min), SIN service key (SECURITY DEFINER acotado
--      a auth.uid()).
--   2) Lecturas del panel (admin_usuarios / admin_empresas / admin_actividad /
--      admin_actividad_count): SECURITY DEFINER con guard `where is_admin()` — un no-admin
--      recibe 0 filas. Son solo LECTURA; las escrituras del panel (aprobar, bloquear,
--      promover, empresas, permisos) van por PostgREST con las policies de admin de la Etapa 1.

-- ============================================================================
-- 1. Registro de visita por sección (beacon del cliente → route handler → esta RPC).
--    Throttle de 10 min server-side para no inflar el log. Nunca escribe para otro
--    usuario: usa siempre auth.uid().
-- ============================================================================
create or replace function public.registrar_visita_seccion(
  p_seccion text,
  p_ip text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  if coalesce(p_seccion, '') = '' then return; end if;
  -- throttle: si ya hubo una visita a esta sección en los últimos 10 min, no repetir.
  if exists (
    select 1 from public.access_log
    where user_id = uid and evento = 'seccion' and seccion = p_seccion
      and ts > now() - interval '10 minutes'
  ) then
    return;
  end if;
  insert into public.access_log (user_id, evento, seccion, ip, user_agent)
  values (uid, 'seccion', p_seccion, nullif(p_ip, ''), nullif(p_user_agent, ''));
end;
$$;

revoke all on function public.registrar_visita_seccion(text, text, text) from public;
grant execute on function public.registrar_visita_seccion(text, text, text) to authenticated;

-- ============================================================================
-- 2a. admin_usuarios(): todos los usuarios con empresa y último login.
-- ============================================================================
create or replace function public.admin_usuarios()
returns table (
  id uuid, email text, nombre text, empresa_texto text, telefono text,
  estado text, rol text, empresa_id uuid, empresa_nombre text,
  empresa_secciones text[], secciones_override text[],
  created_at timestamptz, approved_at timestamptz, ultimo_login timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id, p.email, p.nombre, p.empresa_texto, p.telefono,
    p.estado, p.rol, p.empresa_id, e.nombre, e.secciones, p.secciones_override,
    p.created_at, p.approved_at,
    (select max(a.ts) from public.access_log a where a.user_id = p.id and a.evento = 'login')
  from public.profiles p
  left join public.empresas e on e.id = p.empresa_id
  where public.is_admin()
  order by p.created_at desc;
$$;

revoke all on function public.admin_usuarios() from public;
grant execute on function public.admin_usuarios() to authenticated;

-- ============================================================================
-- 2b. admin_empresas(): empresas con cantidad de usuarios.
-- ============================================================================
create or replace function public.admin_empresas()
returns table (id uuid, nombre text, secciones text[], created_at timestamptz, n_usuarios bigint)
language sql
security definer
stable
set search_path = public
as $$
  select e.id, e.nombre, e.secciones, e.created_at,
         (select count(*) from public.profiles p where p.empresa_id = e.id)
  from public.empresas e
  where public.is_admin()
  order by e.nombre;
$$;

revoke all on function public.admin_empresas() from public;
grant execute on function public.admin_empresas() to authenticated;

-- ============================================================================
-- 2c. admin_actividad(): historial de access_log con filtros + paginación.
--     limit acotado a [1, 200]; offset ≥ 0.
-- ============================================================================
create or replace function public.admin_actividad(
  p_user uuid default null,
  p_empresa uuid default null,
  p_desde timestamptz default null,
  p_hasta timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id bigint, ts timestamptz, evento text, seccion text, ip text, user_agent text,
  user_id uuid, nombre text, email text, empresa_id uuid, empresa_nombre text
)
language sql
security definer
stable
set search_path = public
as $$
  select a.id, a.ts, a.evento, a.seccion, a.ip, a.user_agent,
         a.user_id, p.nombre, p.email, p.empresa_id, e.nombre
  from public.access_log a
  join public.profiles p on p.id = a.user_id
  left join public.empresas e on e.id = p.empresa_id
  where public.is_admin()
    and (p_user is null or a.user_id = p_user)
    and (p_empresa is null or p.empresa_id = p_empresa)
    and (p_desde is null or a.ts >= p_desde)
    and (p_hasta is null or a.ts < p_hasta)
  order by a.ts desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.admin_actividad(uuid, uuid, timestamptz, timestamptz, int, int) from public;
grant execute on function public.admin_actividad(uuid, uuid, timestamptz, timestamptz, int, int) to authenticated;

-- ============================================================================
-- 2d. admin_actividad_count(): total de filas para la paginación.
-- ============================================================================
create or replace function public.admin_actividad_count(
  p_user uuid default null,
  p_empresa uuid default null,
  p_desde timestamptz default null,
  p_hasta timestamptz default null
)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from public.access_log a
  join public.profiles p on p.id = a.user_id
  where public.is_admin()
    and (p_user is null or a.user_id = p_user)
    and (p_empresa is null or p.empresa_id = p_empresa)
    and (p_desde is null or a.ts >= p_desde)
    and (p_hasta is null or a.ts < p_hasta);
$$;

revoke all on function public.admin_actividad_count(uuid, uuid, timestamptz, timestamptz) from public;
grant execute on function public.admin_actividad_count(uuid, uuid, timestamptz, timestamptz) to authenticated;
