-- Vista de las últimas dos ruedas del line-up para la web RF AGRO (panel Puertos).
-- Devuelve TODAS las filas de las dos fechas de consulta más recientes, con un
-- `rueda_rank` (1 = la más reciente, 2 = la anterior) para armar la foto operativa
-- y el "qué cambió vs la rueda anterior". Como cada snapshot tiene ~500 filas, dos
-- ruedas ≈ 1.000 → la web la lee con sbSelectAll (paginado).
--
-- security_invoker = true → respeta el RLS de `lineup` (SELECT anon ya habilitado),
-- sin exponer nada de más. grant select ... to anon → lectura con la clave pública.
-- (El panel además está gateado a admin/mesa en la app; esto es solo la capa de datos.)

create or replace view public.lineup_ultimas_ruedas
with (security_invoker = true) as
with fechas as (
  select distinct fecha_consulta
  from public.lineup
  order by fecha_consulta desc
  limit 2
)
select
  l.fecha_consulta, l.port, l.berth, l.vessel, l.ops, l.cat, l.cargo, l.quantity,
  l.dest_orig, l.area, l.shipper, l.eta, l.etb, l.ets, l.es_agro,
  dense_rank() over (order by l.fecha_consulta desc) as rueda_rank
from public.lineup l
where l.fecha_consulta in (select fecha_consulta from fechas);

comment on view public.lineup_ultimas_ruedas is
  'Últimas 2 ruedas del line-up de ISA (rueda_rank 1=última, 2=anterior) para el panel Puertos de RF AGRO. security_invoker respeta el RLS de lineup; lectura anon.';

grant select on public.lineup_ultimas_ruedas to anon;
