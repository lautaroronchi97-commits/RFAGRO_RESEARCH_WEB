-- RF AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- MP4 (docs/PLAN_INFORMES.md): interpretación automática de informes de organismos (ítem 21).
--
-- Cuando la skill informe-diario detecta un informe de organismo (USDA/CONAB/BCR-GEA/DEA-SAGyP)
-- publicado ese día en `estimaciones_produccion`, genera un BORRADOR de lectura con la voz de
-- Lautaro y lo guarda acá (service_role, bypasa RLS — mismo patrón que `informes_generados`).
-- Lautaro lo edita/publica desde /admin/interpretaciones (RPCs con guard is_admin(), sin service
-- key en la web). Recién publicado lo ve /produccion (anon/authenticated vía RLS) y lo cita
-- /api/informes/datos (ya consulta esta tabla de forma "adelantada" desde MP1, ver
-- src/app/api/informes/datos/route.ts).

create table if not exists public.interpretaciones (
  id                uuid primary key default gen_random_uuid(),
  organismo         text not null,
  informe           text not null,
  fecha_publicacion date not null,
  granos            text[] not null default '{}'::text[],
  borrador_md       text not null,
  publicado_md      text,
  estado            text not null default 'borrador' check (estado in ('borrador', 'publicado', 'descartado')),
  editado_en        timestamptz not null default now(),
  creado_en         timestamptz not null default now(),
  unique (organismo, informe, fecha_publicacion)
);

comment on table public.interpretaciones is
  'Interpretación en lenguaje llano de un informe de organismo (MP4 de PLAN_INFORMES.md). Genera el borrador la skill informe-diario (service_role); Lautaro edita/publica en /admin/interpretaciones. Anon solo ve estado=publicado.';

alter table public.interpretaciones enable row level security;

drop policy if exists interpretaciones_select_publicado on public.interpretaciones;
create policy interpretaciones_select_publicado on public.interpretaciones
  for select to anon, authenticated using (estado = 'publicado');

drop policy if exists interpretaciones_select_admin on public.interpretaciones;
create policy interpretaciones_select_admin on public.interpretaciones
  for select to authenticated using (public.is_admin());

revoke all on public.interpretaciones from public, anon;
grant select on public.interpretaciones to anon, authenticated;

-- admin_actualizar_interpretacion(p_id, p_borrador_md) — guardar el texto editado (borrador,
-- inclusive con una publicada: permite corregir después sin republicar sola).
create or replace function public.admin_actualizar_interpretacion(p_id uuid, p_borrador_md text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'solo admin';
  end if;

  update public.interpretaciones
     set borrador_md = p_borrador_md,
         editado_en = now()
   where id = p_id;

  return found;
end;
$$;

revoke all on function public.admin_actualizar_interpretacion(uuid, text) from public, anon;
grant execute on function public.admin_actualizar_interpretacion(uuid, text) to authenticated;

-- admin_publicar_interpretacion(p_id, p_borrador_md) — si viene texto, lo guarda primero
-- (así "Publicar" siempre saca el último texto del textarea, aunque no se haya apretado
-- "Guardar borrador" antes); después copia borrador_md → publicado_md, estado='publicado'.
-- Su firma nunca sale sin su OK (decisión cerrada, PLAN_INFORMES.md).
create or replace function public.admin_publicar_interpretacion(p_id uuid, p_borrador_md text default null)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'solo admin';
  end if;

  update public.interpretaciones
     set borrador_md = coalesce(nullif(btrim(p_borrador_md), ''), borrador_md),
         publicado_md = coalesce(nullif(btrim(p_borrador_md), ''), borrador_md),
         estado = 'publicado',
         editado_en = now()
   where id = p_id;

  return found;
end;
$$;

revoke all on function public.admin_publicar_interpretacion(uuid, text) from public, anon;
grant execute on function public.admin_publicar_interpretacion(uuid, text) to authenticated;

-- admin_descartar_interpretacion(p_id) — no se publica (informe irrelevante, borrador flojo, etc.).
create or replace function public.admin_descartar_interpretacion(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'solo admin';
  end if;

  update public.interpretaciones
     set estado = 'descartado',
         editado_en = now()
   where id = p_id;

  return found;
end;
$$;

revoke all on function public.admin_descartar_interpretacion(uuid) from public, anon;
grant execute on function public.admin_descartar_interpretacion(uuid) to authenticated;
