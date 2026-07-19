-- Fase 4 — farmer selling (C3) v2: campaña activa + refresh liviano.
--
-- Dos correcciones sobre 20260719236000:
--  1) La matview ahora también expone `semanal_tn` (venta de la semana, suma de sectores) para que la
--     orquestación (temperatura.ts) elija, por fecha, la CAMPAÑA ACTIVA = la de mayor venta semanal (la
--     que el productor está comercializando), en vez de mezclar todas las campañas vivas de esa fecha
--     (en una misma semana conviven la vieja casi liquidada, la actual y la nueva que recién arranca).
--  2) El refresh de compras_avance_hist se saca de refresh_lineup_visitas (refrescar las 4 matviews por
--     PostgREST excede el statement timeout → hizo fallar el primer run del cargador) y pasa a una RPC
--     liviana propia refresh_compras_avance() que refresca SOLO esta matview. La llaman el cargador
--     (cargar-compras.mjs) y el scraper vivo (ingest-compras.mjs).

drop materialized view if exists public.compras_avance_hist cascade;

create materialized view public.compras_avance_hist as
with limpio as (
  -- acumulado monótono no-decreciente por (producto, sector, campaña) — descarta spikes de la fuente
  select codigo_interno as cod, sector, campana, fecha,
    min(toneladas) over (partition by codigo_interno, sector, campana
      order by fecha rows between current row and unbounded following) as comprado_clean,
    semanal_tn
  from public.compras
  where fuente = 'AGROCHAT' and toneladas is not null
),
sumado as (
  -- "juntemos todo": suma de sectores por (producto, campaña, fecha)
  select cod, campana, fecha, sum(comprado_clean) as comprado_tn, sum(semanal_tn) as semanal_tn
  from limpio group by cod, campana, fecha
),
prod as (
  -- producción USDA Argentina, último vintage por (grano, campaña), en toneladas
  select case grano when 'maiz' then 'MAIZE' when 'soja' then 'SBS' when 'trigo' then 'WHEAT' end as cod,
         campania as campana, valor * 1e6 as produccion_tn
  from (select grano, campania, valor,
               row_number() over (partition by grano, campania order by fecha_publicacion desc) rn
        from public.estimaciones_produccion
        where pais ilike '%argent%' and organismo = 'USDA' and variable ilike '%produc%'
          and grano in ('maiz', 'soja', 'trigo')) z
  where rn = 1
)
select s.cod, s.fecha, s.campana, s.comprado_tn, s.semanal_tn, p.produccion_tn,
       case when p.produccion_tn > 0 then s.comprado_tn / p.produccion_tn end as avance
from sumado s
left join prod p on p.cod = s.cod and p.campana = s.campana;

create index compras_avance_hist_cod_fecha_idx on public.compras_avance_hist (cod, fecha);
grant select on public.compras_avance_hist to anon;

-- RPC liviana: refresca SOLO esta matview (rápida; evita el timeout del refresh de las 4 juntas).
create or replace function public.refresh_compras_avance()
returns void language sql security definer set search_path to 'public'
as $function$ refresh materialized view public.compras_avance_hist; $function$;
grant execute on function public.refresh_compras_avance() to service_role;

-- Revertir la cadena de line-up a sus 3 matviews (compras_avance se refresca por su cuenta).
create or replace function public.refresh_lineup_visitas()
returns void language sql security definer set search_path to 'public'
as $function$
  refresh materialized view public.lineup_visitas;
  refresh materialized view public.lineup_densidad_hist;
  refresh materialized view public.lineup_gap_hist;
$function$;
