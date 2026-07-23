-- C5 (cont. 2) — pivot final de arquitectura (23/07/2026, decisión de Lautoro): CERO dependencia
-- de SAGyP/MAGyP. Williams Entregas (vía export manual de Agrochat) tiene apertura por PRODUCTO
-- además de por zona (confirmado con 3 CSV reales: maíz, soja, trigo — mismo formato de 4 columnas
-- que el total sin filtrar). Ya no hace falta la ingesta automática: TODO es carga manual desde
-- /admin/datos. Se recrea la tabla (seguía en 0 filas) con un esquema más simple: cada fila es
-- (fecha, zona, producto, fuente) → cantidad. `producto='TOTAL'` es el archivo sin filtrar; el
-- total nacional de un grano = sumar sus 4 filas de zona (no hace falta una fila aparte "producto"
-- ni "total" como en el diseño anterior — se computa en el lib de lectura).
--
-- Nota: `fuente` conserva 'magyp' en el check por si algún día conviene retomar una ingesta
-- automática complementaria (src/lib/camiones/sagyp.ts queda escrito y testeado, sin wireear) —
-- hoy solo se usa 'williams'.

drop table if exists public.camiones cascade;
drop function if exists public.admin_upsert_camiones_zona(jsonb);

create table public.camiones (
  fecha      date not null,
  zona       text not null check (zona in ('ROSARIO_ALEDANOS', 'DARSENA_BSAS_ER', 'NECOCHEA', 'BAHIA_BLANCA')),
  producto   text not null default 'TOTAL'
             check (producto in ('TOTAL', 'SBS', 'MAIZE', 'WHEAT', 'BARLEY', 'SORGHUM', 'SFSEED')),
  fuente     text not null default 'williams' check (fuente in ('williams', 'magyp')),
  cantidad   numeric not null,
  creado_en  timestamptz not null default now(),
  primary key (fecha, zona, producto, fuente)
);

comment on table public.camiones is
  'Entrada diaria de camiones por zona portuaria — Williams Entregas vía export manual de Agrochat '
  '(/admin/datos), TODAS las dimensiones (zona Y producto) por carga manual. producto=TOTAL es el '
  'archivo sin filtrar por grano; el nacional de un grano = suma de sus 4 filas de zona. '
  'cantidad = CANTIDAD DE CAMIONES, no toneladas. fuente=magyp reservado sin usar (ver sagyp.ts).';

alter table public.camiones enable row level security;
create policy "anon_select_camiones" on public.camiones for select to anon using (true);
grant select on public.camiones to anon, authenticated;
create index camiones_fecha_idx on public.camiones (fecha);
create index camiones_producto_idx on public.camiones (producto, fecha);

-- RPC de carga manual (patrón admin_upsert_compras, 20260720120000): SECURITY DEFINER + guard
-- is_admin(), así /admin/datos escribe sin service key en la web. `producto` es un parámetro
-- ESCALAR (todo un archivo subido es siempre UN solo grano o el total) — no viaja fila a fila.
-- `fuente` se fija a 'williams' adentro de la función.
create or replace function public.admin_upsert_camiones(filas jsonb, p_producto text)
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
  if p_producto not in ('TOTAL', 'SBS', 'MAIZE', 'WHEAT', 'BARLEY', 'SORGHUM', 'SFSEED') then
    raise exception 'producto inválido: %', p_producto;
  end if;

  with entrada as (
    select * from jsonb_to_recordset(filas) as r(fecha date, zona text, cantidad numeric)
  ),
  ins as (
    insert into public.camiones (fecha, zona, producto, fuente, cantidad)
    select e.fecha, e.zona, p_producto, 'williams', e.cantidad
    from entrada e
    where e.fecha is not null and e.zona is not null and e.cantidad is not null
    on conflict (fecha, zona, producto, fuente) do update set
      cantidad = excluded.cantidad
    returning 1
  )
  select count(*) into n from ins;

  return n;
end;
$$;

revoke all on function public.admin_upsert_camiones(jsonb, text) from public, anon;
grant execute on function public.admin_upsert_camiones(jsonb, text) to authenticated;
