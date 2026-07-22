-- RF AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- MP1 (docs/PLAN_INFORMES.md): informe diario (placa PNG para WhatsApp).
--
-- Dos tablas nuevas + un bucket privado de Storage:
--  - mesa_color: el "color de la rueda" que Lautaro carga a mano en /admin/datos
--    (texto libre, una fila por día). Solo la mesa la lee/escribe.
--  - informes_generados: registro de cada placa/PDF generado por la Routine (escribe
--    con la service key, que bypasa RLS). Anon SOLO ve las filas ya enviadas (estado
--    'enviado') — así /informes puede listar el histórico sin exponer borradores.
--  - bucket `informes` (privado): las placas PNG / PDFs. Las URLs firmadas las genera
--    el server con la service key (mismo patrón que el resto de "mesa lee con service
--    key" de la auditoría E5) — no hace falta policy de storage para anon.

-- ============================================================================
-- 1. mesa_color — "color de la rueda" de Lautaro (una fila por fecha)
-- ============================================================================
create table if not exists public.mesa_color (
  fecha       date primary key,
  texto       text not null,
  actualizado timestamptz not null default now()
);

comment on table public.mesa_color is
  'Color de la rueda que Lautaro carga a mano en /admin/datos (MP1 de PLAN_INFORMES.md). Solo mesa.';

alter table public.mesa_color enable row level security;

drop policy if exists mesa_color_select_admin on public.mesa_color;
create policy mesa_color_select_admin on public.mesa_color
  for select to authenticated using (public.is_admin());

revoke all on public.mesa_color from public, anon;
grant select on public.mesa_color to authenticated;

-- admin_upsert_mesa_color(p_fecha, p_texto) — guard is_admin() adentro, mismo patrón
-- que admin_upsert_compras (20260720120000) y admin_feedback_view (20260721150000).
create or replace function public.admin_upsert_mesa_color(p_fecha date, p_texto text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'solo admin';
  end if;

  insert into public.mesa_color (fecha, texto, actualizado)
  values (p_fecha, btrim(coalesce(p_texto, '')), now())
  on conflict (fecha) do update
    set texto = excluded.texto,
        actualizado = now();

  return true;
end;
$$;

revoke all on function public.admin_upsert_mesa_color(date, text) from public, anon;
grant execute on function public.admin_upsert_mesa_color(date, text) to authenticated;

-- ============================================================================
-- 2. informes_generados — registro de cada informe (diario/semanal) generado
-- ============================================================================
create table if not exists public.informes_generados (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null check (tipo in ('diario', 'semanal')),
  fecha      date not null,
  path_png   text,
  path_pdf   text,
  titulo     text,
  prosa      jsonb not null default '{}'::jsonb,
  estado     text not null default 'borrador' check (estado in ('borrador', 'enviado')),
  creado_en  timestamptz not null default now(),
  unique (tipo, fecha)
);

comment on table public.informes_generados is
  'Registro de informes diarios/semanales generados (MP1/MP2 de PLAN_INFORMES.md). Escribe la Routine (service_role); anon solo ve estado=enviado.';

alter table public.informes_generados enable row level security;

drop policy if exists informes_generados_select_enviado on public.informes_generados;
create policy informes_generados_select_enviado on public.informes_generados
  for select to anon, authenticated using (estado = 'enviado');

drop policy if exists informes_generados_select_admin on public.informes_generados;
create policy informes_generados_select_admin on public.informes_generados
  for select to authenticated using (public.is_admin());

revoke all on public.informes_generados from public, anon;
grant select on public.informes_generados to anon, authenticated;

-- ============================================================================
-- 3. Bucket privado de Storage `informes` (placas PNG / PDFs)
--    Sin policies de storage.objects: solo la service key (Routine) sube/firma.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('informes', 'informes', false)
on conflict (id) do nothing;
