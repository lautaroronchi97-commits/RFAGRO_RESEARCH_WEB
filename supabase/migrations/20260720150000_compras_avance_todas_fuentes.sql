-- Farmer selling (C3) v3: la matview de avance incluye TODAS las fuentes SIO Granos.
--
-- Bug de diseño encontrado el 20/07/2026 al sanear la base: el cron vivo de MAGyP
-- (ingest-compras.mjs) upserteó la última semana (27/05 y 08/07, 30 filas) por la MISMA clave
-- UNIQUE (campana, codigo_interno, sector, fecha) que las filas cargadas del export de Agrochat,
-- cambiándoles `fuente` de 'AGROCHAT' a 'MAGYP'. Como esta matview filtraba `fuente = 'AGROCHAT'`,
-- al refrescarla la última semana quedaba PARCIAL: los avances de WHEAT y SBS desaparecían de la
-- última fecha y MAIZE caía a 0,03 (vs ~0,50) → rompía el pctlFarmer del índice MESA. Y se repetía
-- en cada corrida del cron sobre la semana más reciente.
--
-- Que el cron pise exactamente las mismas claves confirma que MAGyP y Agrochat usan la MISMA fecha
-- de corte semanal: son la misma serie (base SIO Granos; cross-check trigo 25/26 Exportación
-- 16.238.900 tn = 1:1). Por eso el filtro pasa de `fuente = 'AGROCHAT'` a
-- `fuente is distinct from 'LEGACY'` (las filas LEGACY viejas —semántica incompatible— quedan
-- excluidas por si algún día reaparecen). Único cambio vs la v2 (20260719238000): el resto
-- (limpieza monótona, CTEs, índice, grants) es idéntico. Las RPCs de refresh
-- (refresh_compras_avance / admin_refresh_compras_avance) refrescan por nombre y siguen válidas:
-- no se tocan.

drop materialized view if exists public.compras_avance_hist cascade;

create materialized view public.compras_avance_hist as
with limpio as (
  -- acumulado monótono no-decreciente por (producto, sector, campaña) — descarta spikes de la fuente
  select codigo_interno as cod, sector, campana, fecha,
    min(toneladas) over (partition by codigo_interno, sector, campana
      order by fecha rows between current row and unbounded following) as comprado_clean,
    semanal_tn
  from public.compras
  where fuente is distinct from 'LEGACY' and toneladas is not null
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
