-- Fase 3 Comercio exterior — mesa de embarque (programa DJVE por mes × producto).
-- Aplicada al proyecto `lineup-argentina` por execute_sql el 18-19/07/2026 (el canal de
-- apply_migration del MCP estuvo caído); este archivo queda como registro versionado.
--
-- Contexto de diseño: docs/negocio/05_djve_marco_y_circuito.md (research verificado).
-- En el mismo trabajo se corrió el BACKFILL histórico de la tabla `djve` (2011-2025,
-- 326.580 filas desde los XLS oficiales de la SSMA — antes solo había 2026), vía una
-- tabla staging efímera ya eliminada. La columna `cosecha` guarda la campaña declarada
-- de la era ROE (2011-jun2018), cuando la DJVE no traía ventana de embarque.

alter table public.djve add column if not exists cosecha text;
comment on column public.djve.cosecha is
  'Campaña declarada ("10/11") de la era ROE (2011-jun2018), cuando la DJVE no traía ventana de embarque. Null desde el régimen de período de embarque (Res. 51/2018 → 128/2019). Poblada por el backfill 2011-2025 (jul-2026).';

-- 1) Declarado DJVE por mes de embarque × producto × opción × campaña.
--    Solo ventanas ≤45 días: por Res. 128/2019 el granel declara período de embarque de
--    30 días corridos (el "mes declarado" es dato preciso); las ventanas de ~90 días son
--    carga no-granel/contenedores (0,3% del tonelaje) y son ruido para la mesa. El
--    tonelaje se reparte por días entre los (≤2) meses que toca la ventana. La campaña
--    se atribuye por el MES del tramo (etiqueta, no cosecha física).
create or replace view public.djve_embarques_mes
with (security_invoker = true) as
with base as (
  select
    case when d.codigo_interno = 'SHULLS' then 'SBM' else d.codigo_interno end as cod,
    d.opcion, d.fecha_inicio_embarque as ini, d.fecha_fin_embarque as fin,
    d.toneladas::numeric as tn
  from public.djve d
  where d.codigo_interno is not null and d.toneladas > 0
    and d.fecha_inicio_embarque is not null and d.fecha_fin_embarque is not null
    and d.fecha_fin_embarque >= d.fecha_inicio_embarque
    and (d.fecha_fin_embarque - d.fecha_inicio_embarque) <= 45
),
tramos as (
  select b.cod, b.opcion,
    date_trunc('month', gs)::date as mes,
    public.campana_ini_year(b.cod, date_trunc('month', gs)::date) as camp_ini,
    b.tn * ((least(b.fin, (date_trunc('month', gs) + interval '1 month - 1 day')::date)
             - greatest(b.ini, date_trunc('month', gs)::date) + 1)::numeric
            / (b.fin - b.ini + 1)) as tn_mes
  from base b
  cross join lateral generate_series(date_trunc('month', b.ini), date_trunc('month', b.fin), interval '1 month') gs
)
select cod, opcion, camp_ini, mes,
  round(sum(tn_mes))::numeric as declarado_tn,
  count(*) as n_tramos
from tramos
group by 1, 2, 3, 4;
comment on view public.djve_embarques_mes is
  'Mesa de embarque: declarado DJVE por mes de embarque (reparto por días, solo ventanas granel ≤45d) × cod × opción × campaña. Lectura anon.';
grant select on public.djve_embarques_mes to anon;

-- 2) Dedup de "visita física" MATERIALIZADO: el DISTINCT ON sobre ~500k filas de
--    `lineup` tarda ~6s por consulta (sort externo que el planner no evita) → se
--    precalcula acá y se refresca después de cada ingesta (RPC de abajo, la llama
--    scripts/ingest-lineup.mjs con la service key). Sin RLS (las matviews no la
--    soportan), pero su contenido es un subconjunto de lo que anon ya lee de `lineup`.
create materialized view if not exists public.lineup_visitas as
select distinct on (l.vessel, l.cargo, l.shipper, l.dest_orig, l.port, l.berth)
  l.shipper as shipper_raw,
  case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end as cod,
  l.etb, l.quantity
from public.lineup l
where l.ops = 'LOAD' and l.es_agro and l.etb is not null
  and not (l.shipper ~* '\yPY\y|PARAGUAY|\yUY\y|URUGUAY')
  and (case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end)
      in ('SBS','SBM','SBO','MAIZE','WHEAT','BARLEY','SORGHUM','SFSEED','SFMP','SFO')
order by l.vessel, l.cargo, l.shipper, l.dest_orig, l.port, l.berth, l.fecha_consulta desc;
comment on materialized view public.lineup_visitas is
  'Última foto de cada visita física del line-up (dedup barco+cargo+empresa+destino+puerto+muelle), AR-only, productos prioritarios, ops=LOAD con ETB. Refrescada post-ingesta por refresh_lineup_visitas().';
grant select on public.lineup_visitas to anon;

create or replace function public.refresh_lineup_visitas()
returns void language sql security definer set search_path = public as
$$ refresh materialized view public.lineup_visitas; $$;
revoke execute on function public.refresh_lineup_visitas() from public, anon, authenticated;
grant execute on function public.refresh_lineup_visitas() to service_role;

-- 3) Line-up embarcado/programado por mes de ETB × producto × campaña (sobre la matview).
create or replace view public.lineup_embarcado_mes
with (security_invoker = true) as
select v.cod,
  date_trunc('month', v.etb)::date as mes,
  public.campana_ini_year(v.cod, v.etb) as camp_ini,
  round(sum(v.quantity))::numeric as embarcado_tn,
  count(*) as buques
from public.lineup_visitas v
where v.etb >= date '2023-01-01'
group by 1, 2, 3;
comment on view public.lineup_embarcado_mes is
  'Mesa de embarque: line-up embarcado/programado por mes de ETB × cod × campaña (dedup visita física, AR-only). Lectura anon.';
grant select on public.lineup_embarcado_mes to anon;

-- 4) `lineup_originado_campana` (Fase 2) recreada sobre la matview: misma salida,
--    de ~6s a ~decenas de ms (era el mismo DISTINCT ON). Verificado 1:1 (maíz 27 Mt).
create or replace view public.lineup_originado_campana
with (security_invoker = true) as
with ref as (select max(fecha_consulta) as f from public.lineup)
select v.shipper_raw, v.cod,
  public.campana_ini_year(v.cod, v.etb) as camp_ini,
  round(sum(v.quantity))::numeric as originado_tn,
  count(*) as n_visitas
from public.lineup_visitas v, ref
where public.campana_ini_year(v.cod, v.etb) >= extract(year from ref.f)::int - 2
  and v.etb <= ref.f
group by 1, 2, 3;
