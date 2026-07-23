-- C5 (cont.) — ajuste de arquitectura confirmado por Lautaro el 23/07/2026 tras research de
-- Williams Entregas (williamsagroservicios.com.ar/entregas/): es un servicio B2B PAGO sin API ni
-- dashboard público — Agrochat lo tiene contratado, Lautaro exporta desde ahí. La dimensión ZONA
-- (Williams, "la fuente de camiones por excelencia") es SIEMPRE carga MANUAL — no un parche
-- temporal. La dimensión PRODUCTO (nacional: trigo/maíz/soja/…) sigue AUTOMÁTICA desde el HTML
-- diario de SAGyP/MAGyP. Ambas conviven en `camiones` con la columna `fuente` que ya faltaba en
-- 20260723120000 (la tabla estaba vacía — 0 filas — así que se recrea limpio en vez de ALTER).
--
-- Prioridad de lectura (documentada acá y en src/lib/camiones/camiones.ts): para tipo='zona', el
-- panel usa SIEMPRE fuente='williams' cuando ese día está cargado, con fallback a fuente='magyp'
-- (la propia lectura de zona que trae el HTML de SAGyP, guardada como referencia/comparación) si
-- Williams no cargó ese día. tipo='producto'/'total'/'vagones_playa' son SIEMPRE fuente='magyp'
-- (SAGyP es la única fuente con esa apertura).

drop table if exists public.camiones cascade;

create table public.camiones (
  fecha      date not null,
  tipo       text not null check (tipo in ('zona', 'producto', 'total', 'vagones_playa')),
  clave      text not null default '',
  fuente     text not null check (fuente in ('williams', 'magyp')),
  cantidad   numeric not null,
  creado_en  timestamptz not null default now(),
  primary key (fecha, tipo, clave, fuente),
  constraint camiones_clave_valida check (
    (tipo = 'zona' and clave in ('ROSARIO_ALEDANOS', 'DARSENA_BSAS_ER', 'NECOCHEA', 'BAHIA_BLANCA'))
    or (tipo = 'producto' and clave in ('WHEAT', 'MAIZE', 'SORGHUM', 'BARLEY', 'SBS', 'SFSEED') and fuente = 'magyp')
    or (tipo in ('total', 'vagones_playa') and clave = '' and fuente = 'magyp')
  )
);

comment on table public.camiones is
  'Entrada diaria de camiones a puertos/fábricas/molinos. zona: fuente=williams (carga MANUAL desde /admin/datos, '
  'export de Agrochat — prioridad de lectura) o fuente=magyp (HTML diario SAGyP, referencia/fallback). '
  'producto/total/vagones_playa: siempre fuente=magyp (automático). cantidad = CANTIDAD DE CAMIONES, no toneladas.';

alter table public.camiones enable row level security;
create policy "anon_select_camiones" on public.camiones for select to anon using (true);
grant select on public.camiones to anon, authenticated;
create index camiones_fecha_idx on public.camiones (fecha);

-- RPC de carga manual (patrón admin_upsert_compras, 20260720120000): SECURITY DEFINER + guard
-- is_admin(), así /admin/datos escribe sin service key en la web. `fuente` se FIJA a 'williams'
-- adentro de la función (no viaja en el jsonb) — este RPC es exclusivo del uploader de Williams/
-- Agrochat, nunca lo usa la ingesta automática de SAGyP (esa upsertea directo con la service key
-- desde el workflow, fuente='magyp').
create or replace function public.admin_upsert_camiones_zona(filas jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  n integer;
begin
  if not public.is_admin() then
    raise exception 'solo admin';
  end if;

  with entrada as (
    select * from jsonb_to_recordset(filas) as r(fecha date, clave text, cantidad numeric)
  ),
  ins as (
    insert into public.camiones (fecha, tipo, clave, fuente, cantidad)
    select e.fecha, 'zona', e.clave, 'williams', e.cantidad
    from entrada e
    where e.fecha is not null and e.clave is not null and e.cantidad is not null
    on conflict (fecha, tipo, clave, fuente) do update set
      cantidad = excluded.cantidad
    returning 1
  )
  select count(*) into n from ins;

  return n;
end;
$$;

revoke all on function public.admin_upsert_camiones_zona(jsonb) from public, anon;
grant execute on function public.admin_upsert_camiones_zona(jsonb) to authenticated;
