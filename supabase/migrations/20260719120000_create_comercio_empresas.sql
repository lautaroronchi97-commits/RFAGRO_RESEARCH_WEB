-- Fase 2 Comercio exterior — panel de empresas + semáforo físico→precio.
-- Objetos de lectura (anon, security_invoker) sobre `lineup` + `djve` para la web ROFO AGRO.
-- Lógica portada de LineUps_Code (cobertura.py / campanas.py). El gate de mesa (requireAdmin)
-- vive en la app; esto es solo la capa de datos (respeta el RLS de las tablas base).
--
-- Aplicada al proyecto Supabase `lineup-argentina` (gbpfgfeksqmzmsxnxiwg).

-- Año de inicio de campaña por código de producto (espejo de src/lib/lineup/campanas.ts:CAMPANA_CONFIG).
-- Soja abr · maíz/sorgo mar · trigo/cebada dic · girasol feb · resto ene. IMMUTABLE → indexable/inlineable.
create or replace function public.campana_ini_year(cod text, f date)
returns int language sql immutable as $$
  select case
    when cod in ('SBS','SBM','SBO','SHULLS','NSBO','LECITHIN') then case when extract(month from f)>=4 then extract(year from f)::int else extract(year from f)::int-1 end
    when cod in ('MAIZE','SORGHUM','CORN GLTN')                then case when extract(month from f)>=3 then extract(year from f)::int else extract(year from f)::int-1 end
    when cod in ('WHEAT','BARLEY','MALT','WBP')                then case when extract(month from f)>=12 then extract(year from f)::int else extract(year from f)::int-1 end
    when cod in ('SFSEED','SFO','SFMP')                        then case when extract(month from f)>=2 then extract(year from f)::int else extract(year from f)::int-1 end
    else extract(year from f)::int end
$$;

-- 1) DJVE agregada: declarado por (empresa cruda, cod, opcion, campaña) — total y ventana 60d.
--    opcion 30 = disponible / 360 = forward (plazo de embarque). El colapso SHULLS→SBM no aplica
--    a DJVE (no trae SHULLS) pero se deja por consistencia. Ventana 60d = default de cobertura.py,
--    relativa a la última rueda del line-up (ref).
create or replace view public.djve_cobertura
with (security_invoker = true) as
with ref as (select max(fecha_consulta) as f from public.lineup)
select
  d.razon_social as shipper_raw,
  case when d.codigo_interno = 'SHULLS' then 'SBM' else d.codigo_interno end as cod,
  d.opcion,
  public.campana_ini_year(
    case when d.codigo_interno = 'SHULLS' then 'SBM' else d.codigo_interno end,
    coalesce(d.fecha_inicio_embarque, d.fecha_fin_embarque, d.fecha_registro)
  ) as camp_ini,
  round(sum(d.toneladas))::numeric as declarado_tn,
  count(*) as n_djve,
  round(sum(d.toneladas) filter (
    where coalesce(d.fecha_inicio_embarque, d.fecha_fin_embarque) <= (select f from ref) + 60
      and coalesce(d.fecha_fin_embarque, d.fecha_inicio_embarque) >= (select f from ref)
  ))::numeric as declarado_60d_tn,
  count(*) filter (
    where coalesce(d.fecha_inicio_embarque, d.fecha_fin_embarque) <= (select f from ref) + 60
      and coalesce(d.fecha_fin_embarque, d.fecha_inicio_embarque) >= (select f from ref)
  ) as n_djve_60d
from public.djve d
where d.codigo_interno is not null
group by 1, 2, 3, 4;

comment on view public.djve_cobertura is
  'DJVE agregada por (empresa, cod, opcion, campaña): declarado total + ventana 60d (cobertura.py). Lectura anon.';
grant select on public.djve_cobertura to anon;

-- 2) Originado acumulado de campaña (proxy line-up): por (empresa cruda, cod, campaña).
--    Dedup de visita física estable (barco+cargo+empresa+destino+puerto+muelle) tomando el último
--    snapshot → evita el sobreconteo por ETA/ETB revisado entre ruedas. AR-only (excluye tránsito
--    PY/UY, que no tiene DJVE argentina). etb <= última rueda → "embarcado hasta hoy". Es un
--    ESTIMADO sobre line-up (no permisos de embarque de aduana).
create or replace view public.lineup_originado_campana
with (security_invoker = true) as
with ref as (select max(fecha_consulta) as f from public.lineup),
visitas as (
  select distinct on (l.vessel, l.cargo, l.shipper, l.dest_orig, l.port, l.berth)
    l.shipper as shipper_raw,
    case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end as cod,
    l.etb, l.quantity
  from public.lineup l
  where l.ops = 'LOAD' and l.es_agro and l.etb is not null
    and not (l.shipper ~* '\yPY\y|PARAGUAY|\yUY\y|URUGUAY')
    and (case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end)
        in ('SBS','SBM','SBO','MAIZE','WHEAT','BARLEY','SORGHUM','SFSEED','SFMP','SFO')
  order by l.vessel, l.cargo, l.shipper, l.dest_orig, l.port, l.berth, l.fecha_consulta desc
)
select v.shipper_raw, v.cod,
  public.campana_ini_year(v.cod, v.etb) as camp_ini,
  round(sum(v.quantity))::numeric as originado_tn,
  count(*) as n_visitas
from visitas v, ref
where public.campana_ini_year(v.cod, v.etb) >= extract(year from ref.f)::int - 2
  and v.etb <= ref.f
group by 1, 2, 3;

comment on view public.lineup_originado_campana is
  'Originado acumulado de campaña (proxy line-up, dedup visita física, AR-only) por empresa/cod/campaña. Lectura anon.';
grant select on public.lineup_originado_campana to anon;

-- 3) Estacional (ritmo = "line-up parado vs lo normal"): standing promedio por (empresa, cod, k)
--    en ventana ±13 días alrededor de (última rueda − k años), k=0..5. AR-only. Se promedia el
--    standing POR snapshot (sin acumular entre snapshots → sin sobreconteo). k=0 = ahora,
--    k=1..5 = misma época de las 5 campañas previas.
create or replace view public.lineup_estacional
with (security_invoker = true) as
with ref as (select max(fecha_consulta) as f from public.lineup),
snaps as (
  select l.fecha_consulta, l.shipper as shipper_raw,
    case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end as cod, k.k,
    sum(l.quantity) as tn, count(distinct l.vessel) as buques
  from public.lineup l
  cross join ref
  cross join generate_series(0, 5) as k(k)
  where l.ops = 'LOAD' and l.es_agro
    and not (l.shipper ~* '\yPY\y|PARAGUAY|\yUY\y|URUGUAY')
    and (case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end)
        in ('SBS','SBM','SBO','MAIZE','WHEAT','BARLEY','SORGHUM','SFSEED','SFMP','SFO')
    and l.fecha_consulta between (ref.f - make_interval(years => k.k))::date - 13
                             and (ref.f - make_interval(years => k.k))::date + 13
  group by l.fecha_consulta, 2, 3, k.k
)
select shipper_raw, cod, k,
  round(avg(tn))::numeric as standing_tn,
  round(avg(buques))::numeric as standing_buques,
  count(distinct fecha_consulta) as n_snaps
from snaps
group by shipper_raw, cod, k;

comment on view public.lineup_estacional is
  'Ritmo estacional: standing promedio del line-up por empresa/cod y k años atras (k=0..5, ventana ±13d). AR-only. Lectura anon.';
grant select on public.lineup_estacional to anon;
