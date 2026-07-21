-- E2 fase 2 (hallazgo #1, decisión de Lautaro 21/07/2026): djve_cobertura pasa de VISTA a MATVIEW.
--
-- La vista agregaba los ~334k de `djve` (backfill 2011-2025 de la Fase 3) en CADA request → statement
-- timeout 57014 vía PostgREST anon → /comercio/empresas y /comercio/senal degradaban a "fuente no
-- disponible" (auditoría E2, hallazgo #1). Mismo remedio que ya usó la Fase 3 para lineup_visitas.
--
-- El refresh viaja en refresh_lineup_visitas(), que scripts/ingest-lineup.mjs ya llama tras cada
-- ingesta (2/día) — no hay que tocar ningún script. La ventana 60d usa max(lineup.fecha_consulta),
-- así que refrescar post line-up mantiene la referencia alineada; la DJVE nueva del día entra en el
-- próximo refresh (mismo trade-off ya aceptado en 20260719230000_mesa_refresh_series.sql).

drop view if exists public.djve_cobertura;

create materialized view public.djve_cobertura as
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

comment on materialized view public.djve_cobertura is
  'DJVE agregada por (empresa, cod, opcion, campaña): declarado total + ventana 60d (cobertura.py). Era vista; materializada en E2 por timeout 57014 (334k filas base). Refrescada post-ingesta por refresh_lineup_visitas().';
grant select on public.djve_cobertura to anon;
create index djve_cobertura_cod_idx on public.djve_cobertura (cod);

-- Refresh en orden de dependencia; djve_cobertura al final (su ventana 60d lee max(lineup.fecha_consulta)).
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
$function$;
