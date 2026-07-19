-- Fase 4 (índice de temperatura MESA) — pata de DEMANDA #2: densidad histórica del line-up.
--
-- Serie histórica del tonelaje de line-up con ETB en la ventana [fecha, fecha+30] por producto,
-- as-of cada snapshot diario del line-up. Es la métrica C2 del índice de calor (mesa_calor.py):
-- el motor de percentil estacional (estacional.py) compara la densidad de HOY contra la misma
-- semana-de-campaña de las campañas previas.
--
-- Fidelidad 1:1 con cobertura._filtrar_lineup_por_ventana + tonelaje_lineup de LineUps_Code:
--   ops=LOAD · es_agro · etb no nulo · etb ∈ [fecha_consulta, fecha_consulta+30] · Σ quantity por
--   cargo (colapsando SHULLS→SBM, igual que lineup_visitas). Sin exclusión PY/UY (la densidad usa
--   todo el line-up de carga, como en el dashboard).
--
-- MATVIEW porque recorre las ~495k filas de `lineup` (1288 snapshots 2020→2026); se refresca tras
-- cada ingesta (misma RPC que lineup_visitas). Lectura anon para el frontend.

drop materialized view if exists public.lineup_densidad_hist cascade;

create materialized view public.lineup_densidad_hist as
select
  l.fecha_consulta                                        as fecha,
  case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end as cod,
  sum(l.quantity)::double precision                        as densidad_tn,
  count(*)::int                                            as n_buques
from public.lineup l
where l.ops = 'LOAD'
  and l.es_agro
  and l.etb is not null
  and l.etb >= l.fecha_consulta
  and l.etb <= l.fecha_consulta + 30
  and (case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end)
      = any (array['SBS','SBM','SBO','MAIZE','WHEAT','BARLEY','SORGHUM','SFSEED','SFMP','SFO'])
group by l.fecha_consulta,
         case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end;

create unique index if not exists lineup_densidad_hist_pk
  on public.lineup_densidad_hist (cod, fecha);

grant select on public.lineup_densidad_hist to anon, authenticated;
