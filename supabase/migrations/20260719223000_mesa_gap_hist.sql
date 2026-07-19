-- Fase 4 (índice de temperatura MESA) — pata de DEMANDA #1: gap de cobertura histórico.
--
-- Serie histórica del gap declarado−originado por producto, as-of cada snapshot del line-up. Es la
-- métrica C1 del índice de calor (mesa_calor.gap_cobertura → cobertura.balance_por_producto):
--   declarado_tn = Σ DJVE cuya ventana de embarque solapa [fecha, fecha+30] y ya estaba registrada
--                  a esa fecha (as-of: fecha_registro ≤ fecha).
--   originado_tn = tonelaje de line-up con ETB en [fecha, fecha+30]  (= la misma métrica C2,
--                  reutilizada de lineup_densidad_hist).
--   gap_tn       = declarado_tn − originado_tn  (= falta_cubrir_tn; >0 = corto/alcista FAS).
--
-- Fidelidad 1:1 con cobertura._filtrar_djve_por_ventana + balance_por_producto de LineUps_Code:
--   solapamiento de intervalos ini≤fecha+30 AND fin≥fecha (con ini/fin coalesced), solo productos
--   cruzables con el line-up. El as-of (fecha_registro ≤ fecha) es el añadido para la reconstrucción
--   histórica que pide la especificación (ESPECIFICACION_MESA_CALOR §4.2 C1).
--
-- Por producto crudo (SBS/SBM/SBO/… sin colapsar el complejo): mesa_calor.ts agrega SBM+SBO a
-- "soja crush" (equivalente poroto) del lado TS, igual que sobre el originado.
--
-- MATVIEW (join por rango sobre ~334k DJVE × ~1288 fechas); se refresca tras cada ingesta.

drop materialized view if exists public.lineup_gap_hist cascade;

create materialized view public.lineup_gap_hist as
with fechas as (
  select distinct fecha_consulta as fecha from public.lineup
),
declarado as (
  select
    f.fecha,
    d.codigo_interno                     as cod,
    sum(d.toneladas)::double precision    as declarado_tn,
    count(*)::int                         as n_djve
  from fechas f
  join public.djve d
    on d.codigo_interno = any (array['SBS','SBM','SBO','MAIZE','WHEAT','BARLEY','SORGHUM','SFSEED','SFMP','SFO'])
   and d.fecha_registro <= f.fecha
   and coalesce(d.fecha_inicio_embarque, d.fecha_fin_embarque) <= f.fecha + 30
   and coalesce(d.fecha_fin_embarque, d.fecha_inicio_embarque) >= f.fecha
  group by f.fecha, d.codigo_interno
)
select
  coalesce(de.fecha, den.fecha)                             as fecha,
  coalesce(de.cod, den.cod)                                 as cod,
  coalesce(de.declarado_tn, 0)                              as declarado_tn,
  coalesce(den.densidad_tn, 0)                              as originado_tn,
  coalesce(de.declarado_tn, 0) - coalesce(den.densidad_tn, 0) as gap_tn,
  coalesce(de.n_djve, 0)                                    as n_djve
from declarado de
full join public.lineup_densidad_hist den
  on den.fecha = de.fecha and den.cod = de.cod;

create unique index if not exists lineup_gap_hist_pk
  on public.lineup_gap_hist (cod, fecha);

grant select on public.lineup_gap_hist to anon, authenticated;
