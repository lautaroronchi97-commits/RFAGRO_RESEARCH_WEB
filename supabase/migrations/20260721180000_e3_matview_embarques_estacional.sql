-- E3 fase 2 (hallazgos H1 y H6, decisión de Lautaro 21/07/2026): djve_embarques_mes y
-- lineup_estacional pasan de VISTA a MATVIEW.
--
-- Ambas agregaban sobre las tablas grandes (`djve` ~334k, `lineup` ~510k) en CADA request →
-- statement timeout / HTTP 500 bajo la concurrencia del prerender (auditoría E3: 12/12 y 10/10
-- fallos con 10-12 requests en paralelo). Efecto en pantalla: /comercio/embarques renderizaba
-- VACÍA ("Sin programa de embarques disponible") y la columna RITMO de /comercio/empresas quedaba
-- toda en "—". Mismo remedio que E2 (djve_cobertura) y la Fase 3 (lineup_visitas).
--
-- El refresh viaja en refresh_lineup_visitas(), que scripts/ingest-lineup.mjs ya llama tras cada
-- ingesta (2/día) — no hay que tocar ningún script. Las dos leen su ventana de max(lineup.fecha_
-- consulta), así que refrescar post line-up mantiene la referencia alineada; la DJVE nueva del día
-- entra en el próximo refresh (mismo trade-off ya aceptado para djve_cobertura).

-- ── djve_embarques_mes ────────────────────────────────────────────────────────────────────────
drop view if exists public.djve_embarques_mes;

create materialized view public.djve_embarques_mes as
with base as (
  select
    case when d.codigo_interno = 'SHULLS' then 'SBM' else d.codigo_interno end as cod,
    d.opcion,
    d.fecha_inicio_embarque as ini,
    d.fecha_fin_embarque as fin,
    d.toneladas as tn
  from public.djve d
  where d.codigo_interno is not null
    and d.toneladas > 0::numeric
    and d.fecha_inicio_embarque is not null
    and d.fecha_fin_embarque is not null
    and d.fecha_fin_embarque >= d.fecha_inicio_embarque
    and (d.fecha_fin_embarque - d.fecha_inicio_embarque) <= 45
), tramos as (
  select b.cod,
    b.opcion,
    date_trunc('month', gs.gs)::date as mes,
    public.campana_ini_year(b.cod, date_trunc('month', gs.gs)::date) as camp_ini,
    b.tn * ((least(b.fin, (date_trunc('month', gs.gs) + '1 mon -1 days'::interval)::date)
           - greatest(b.ini, date_trunc('month', gs.gs)::date) + 1)::numeric
           / (b.fin - b.ini + 1)::numeric) as tn_mes
  from base b
    cross join lateral generate_series(
      date_trunc('month', b.ini::timestamptz),
      date_trunc('month', b.fin::timestamptz),
      '1 mon'::interval) gs(gs)
)
select cod, opcion, camp_ini, mes,
  round(sum(tn_mes)) as declarado_tn,
  count(*) as n_tramos
from tramos
group by cod, opcion, camp_ini, mes;

comment on materialized view public.djve_embarques_mes is
  'Programa DJVE declarado por (cod, opcion, campaña, mes), tramos repartidos por días (embarque.ts). Era vista; materializada en E3 por HTTP 500 bajo concurrencia (334k filas base). Refrescada post-ingesta por refresh_lineup_visitas().';
grant select on public.djve_embarques_mes to anon;
create index djve_embarques_mes_cod_mes_idx on public.djve_embarques_mes (cod, mes);

-- ── lineup_estacional ─────────────────────────────────────────────────────────────────────────
drop view if exists public.lineup_estacional;

create materialized view public.lineup_estacional as
with ref as (select max(lineup.fecha_consulta) as f from public.lineup),
snaps as (
  select l.fecha_consulta,
    l.shipper as shipper_raw,
    case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end as cod,
    k.k,
    sum(l.quantity) as tn,
    count(distinct l.vessel) as buques
  from public.lineup l
    cross join ref
    cross join generate_series(0, 5) k(k)
  where l.ops = 'LOAD' and l.es_agro
    and not l.shipper ~* '\yPY\y|PARAGUAY|\yUY\y|URUGUAY'
    and (case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end
         = any (array['SBS','SBM','SBO','MAIZE','WHEAT','BARLEY','SORGHUM','SFSEED','SFMP','SFO']))
    and l.fecha_consulta >= ((ref.f - make_interval(years => k.k))::date - 13)
    and l.fecha_consulta <= ((ref.f - make_interval(years => k.k))::date + 13)
  group by l.fecha_consulta, l.shipper,
    (case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end), k.k
)
select shipper_raw, cod, k,
  round(avg(tn)) as standing_tn,
  round(avg(buques)) as standing_buques,
  count(distinct fecha_consulta) as n_snaps
from snaps
group by shipper_raw, cod, k;

comment on materialized view public.lineup_estacional is
  'Standing estacional por (empresa, cod, k=años atrás): ritmo de line-up en la misma época (empresas.ts). Era vista; materializada en E3 por HTTP 500 bajo concurrencia (510k filas base). Refrescada post-ingesta por refresh_lineup_visitas().';
grant select on public.lineup_estacional to anon;
create index lineup_estacional_cod_idx on public.lineup_estacional (cod);

-- ── refresh en orden de dependencia (todas leen max(lineup.fecha_consulta)) ─────────────────────
create or replace function public.refresh_lineup_visitas()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  refresh materialized view public.lineup_visitas;
  refresh materialized view public.lineup_densidad_hist;
  refresh materialized view public.lineup_gap_hist;
  refresh materialized view public.djve_cobertura;
  refresh materialized view public.djve_embarques_mes;
  refresh materialized view public.lineup_estacional;
$function$;
