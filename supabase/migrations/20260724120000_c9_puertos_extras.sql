-- C9 (backlog maestro E7-sintesis §4): extras de spec de puertos que quedaron fuera
-- de las Fases 1-4 de PLAN_PUERTOS.md. Alcance acordado con Lautaro (24/07/2026):
--   (a) matriz mes×zona en /comercio/embarques — SOLO en la fila de embarcado (línea
--       física), porque `djve` (declarado) no tiene puerto/muelle: la zona (Up River
--       Norte/Sur/Bahía) recién existe en el line-up físico. Alcance = el mismo que ya
--       tiene el cruce físico hoy (mes en curso + borde del próximo, embarque.ts i<=1).
--   (b) "qué cambió" ampliado en /comercio/puertos — buques que SALIERON del line-up
--       (no solo los nuevos) y una comparación contra una rueda de referencia más
--       vieja (~1 semana), no solo la rueda inmediata anterior.
--
-- Ambas vistas son ADITIVAS (no tocan lineup_visitas ni sus dependientes — evita el
-- riesgo de un DROP/CREATE en cascada sobre una matview con 6+ vistas/RPCs encima).

-- (a) Visitas físicas recientes CON port/berth (para computar zona en TS con
-- zonaCarga(), mismo patrón que foto.ts/empresas.ts — no se reinterpreta la zona en
-- SQL). Mismo dedup por visita física que `lineup_visitas` (Fase 3), pero acotado a
-- ETB del mes en curso en adelante: es toda la ventana que embarque.ts usa (i<=1),
-- así que el filtro de fecha lo mantiene liviano sin tocar la matview existente.
create or replace view public.lineup_visitas_recientes
with (security_invoker = true) as
with base as (
  select l.*
  from public.lineup l
  where l.ops = 'LOAD' and l.es_agro and l.etb is not null
    and l.etb >= date_trunc('month', current_date)::date
    and not (l.shipper ~* '\yPY\y|PARAGUAY|\yUY\y|URUGUAY')
    and (case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end)
        in ('SBS','SBM','SBO','MAIZE','WHEAT','BARLEY','SORGHUM','SFSEED','SFMP','SFO')
)
select distinct on (vessel, cargo, shipper, dest_orig, port, berth)
  case when cargo = 'SHULLS' then 'SBM' else cargo end as cod,
  etb, quantity, port, berth
from base
order by vessel, cargo, shipper, dest_orig, port, berth, fecha_consulta desc;

comment on view public.lineup_visitas_recientes is
  'Visitas físicas del line-up desde el mes en curso (dedup igual a lineup_visitas, Fase 3), CON port/berth para que la web compute la zona (zonaCarga) en TS. Alimenta la matriz mes×zona de /comercio/embarques (C9). Lectura anon.';

grant select on public.lineup_visitas_recientes to anon;

-- (b) Fechas de consulta disponibles del line-up (para elegir, en TS, la rueda de
-- referencia más cercana a "hace ~7 días" — el "qué cambió ampliado" de /comercio/
-- puertos). Acotada a los últimos ~90 días: alcanza de sobra para una referencia
-- semanal y mantiene la vista liviana (usa el índice idx_lineup_fecha).
create or replace view public.lineup_fechas_recientes
with (security_invoker = true) as
select distinct fecha_consulta
from public.lineup
where fecha_consulta >= (current_date - interval '90 days')
order by fecha_consulta desc;

comment on view public.lineup_fechas_recientes is
  'Fechas de consulta del line-up con datos en los últimos ~90 días, para que la web ubique la rueda de referencia más cercana a una fecha objetivo (ej. "hace 1 semana") en el panel Puertos (C9). Lectura anon.';

grant select on public.lineup_fechas_recientes to anon;
