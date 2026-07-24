-- ROFO AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- MP3 (PLAN_INFORMES.md): view de mercado por grano — research direccional semanal.
--
-- La sesión semanal de research (Routine de Claude Code) escribe UNA fila por grano y
-- fecha con la service key (bypasa RLS). Lautaro lo lee en /granos/view (página
-- requireAdmin que consulta con SU sesión de admin → policy is_admin()) y deja
-- feedback vía RPC con guard (mismo patrón que admin_upsert_compras en
-- 20260720120000). INTERNO MESA: anon no ve nada.

-- ============================================================================
-- 1. Tabla views_mercado
--    `argumentos` (jsonb) lleva la parte estructurada del view:
--      { "a_favor":  [{"titulo": text, "dato": text}],   -- 3-5, cada uno CON su número
--        "en_contra":[{"titulo": text, "dato": text}],   -- factores que juegan en contra
--        "accion":   text }                              -- 2 líneas en idioma mesa
--    La tesis desarrollada va en tesis_md; "qué me haría cambiar de opinión" en invalidacion.
-- ============================================================================
create table if not exists public.views_mercado (
  id               uuid primary key default gen_random_uuid(),
  grano            text not null check (grano in ('soja', 'maiz', 'trigo')),
  fecha            date not null,
  direccion        text not null check (direccion in ('alcista', 'bajista', 'neutral')),
  confianza        smallint not null check (confianza between 1 and 5),
  horizonte        text not null,
  tesis_md         text not null,
  argumentos       jsonb not null default '{}'::jsonb,
  invalidacion     text not null,
  feedback_lautaro text,
  creado_en        timestamptz not null default now(),
  unique (grano, fecha)
);

comment on table public.views_mercado is
  'View direccional semanal por grano (MP3 de PLAN_INFORMES.md). Escribe la sesión de research (service_role); lee solo la mesa (is_admin).';

-- ============================================================================
-- 2. RLS: SELECT solo admin logueado; sin policies de escritura (solo service_role,
--    que bypasa RLS). Interno mesa: anon queda afuera.
-- ============================================================================
alter table public.views_mercado enable row level security;

drop policy if exists views_mercado_select_admin on public.views_mercado;
create policy views_mercado_select_admin on public.views_mercado
  for select to authenticated using (public.is_admin());

revoke all on public.views_mercado from public, anon;
grant select on public.views_mercado to authenticated;

-- ============================================================================
-- 3. admin_feedback_view(p_id, p_feedback) → boolean
--    Lautaro califica cada view desde /granos/view (server action con su sesión).
--    p_feedback vacío/blanco limpia el feedback (vuelve a null).
-- ============================================================================
create or replace function public.admin_feedback_view(p_id uuid, p_feedback text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'solo admin';
  end if;

  update public.views_mercado
     set feedback_lautaro = nullif(btrim(coalesce(p_feedback, '')), '')
   where id = p_id;

  return found;
end;
$$;

revoke all on function public.admin_feedback_view(uuid, text) from public, anon;
grant execute on function public.admin_feedback_view(uuid, text) to authenticated;
