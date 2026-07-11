-- Catálogo de series graficables para el panel de gráficos de spreads (/graficos).
-- Una fila por serie que se puede elegir como "pata": futuros A3 (solo Rosario),
-- futuros CBOT y pizarra CAC (5 granos). El panel lee esta vista para poblar el
-- constructor (fuente → grano → posición → campañas) sin listas fijas.
-- Proyecto Supabase: lineup-argentina (gbpfgfeksqmzmsxnxiwg).
--
-- Decisiones de Lautaro (11/07): solo plaza `.ROS` en A3 (P21); grano normalizado
-- a minúscula (soja/maiz/trigo/girasol/sorgo). Vencimiento: real de `vencimientos`
-- si existe (posiciones vivas), si no MAX(fecha) como proxy (venc_estimado=true).

create or replace view public.series_catalogo
with (security_invoker = true) as
with a3 as (
  select
    'a3'::text                                   as fuente,
    fc.symbol                                    as serie_id,
    split_part(fc.symbol, '/', 1)                as raiz,
    case fc.underlying
      when 'SOJ' then 'soja' when 'MAI' then 'maiz' when 'TRI' then 'trigo'
      else lower(coalesce(fc.underlying, ''))
    end                                          as grano,
    fc.posicion                                  as posicion,
    min(fc.fecha)                                as desde,
    max(fc.fecha)                                as hasta,
    count(*)::int                                as ruedas,
    coalesce(sum(fc.volume), 0)::bigint          as vol_total
  from public.futuros_cierres fc
  where split_part(fc.symbol, '/', 1) like '%.ROS'   -- solo Rosario (excluye TRI.BA, ROSM, QQ…)
    and substring(fc.posicion from 1 for 3) in
        ('ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC') -- excluye DIS/DISPO
  group by fc.symbol, fc.underlying, fc.posicion
),
cbot as (
  select
    'cbot'::text                                 as fuente,
    symbol                                       as serie_id,
    root                                         as raiz,
    grano                                        as grano,      -- ya viene maiz/soja/trigo
    posicion                                     as posicion,
    min(fecha)                                   as desde,
    max(fecha)                                   as hasta,
    count(*)::int                                as ruedas,
    coalesce(sum(volume), 0)::bigint             as vol_total,
    max(vencimiento)                             as venc_real
  from public.cbot_cierres
  group by symbol, root, grano, posicion
),
piz as (
  select
    'pizarra'::text                              as fuente,
    'pizarra:' || grano                          as serie_id,
    null::text                                   as raiz,
    grano                                        as grano,
    null::text                                   as posicion,
    min(fecha)                                   as desde,
    max(fecha)                                   as hasta,
    count(*)::int                                as ruedas,
    null::bigint                                 as vol_total
  from public.pizarra_historico
  group by grano
)
select
  a3.fuente, a3.serie_id, a3.raiz, a3.grano, a3.posicion,
  a3.desde, a3.hasta, a3.ruedas, a3.vol_total,
  coalesce(v.vencimiento, a3.hasta)              as vencimiento,
  (v.vencimiento is null)                        as venc_estimado
from a3
left join public.vencimientos v on v.symbol = a3.serie_id
union all
select
  cbot.fuente, cbot.serie_id, cbot.raiz, cbot.grano, cbot.posicion,
  cbot.desde, cbot.hasta, cbot.ruedas, cbot.vol_total,
  coalesce(cbot.venc_real, cbot.hasta)           as vencimiento,
  (cbot.venc_real is null)                       as venc_estimado
from cbot
union all
select
  piz.fuente, piz.serie_id, piz.raiz, piz.grano, piz.posicion,
  piz.desde, piz.hasta, piz.ruedas, piz.vol_total,
  null::date                                     as vencimiento,
  false                                          as venc_estimado
from piz;

grant select on public.series_catalogo to anon;
