-- C5 del backlog maestro (docs/auditoria/E7-sintesis.md §4) — P4 "camiones en puerto", con el
-- bloque nuevo "barcos vs camiones" (research docs/negocio/09_camiones_vs_lineup_senal.md).
--
-- 1) Tabla `camiones`: entrada diaria de camiones (SAGyP, diario, rezago 1 día hábil) + backfill
--    2018-2026 de Williams Entregas (data/camiones/*.csv). Diseño NORMALIZADO: zona y producto son
--    DOS APERTURAS DEL MISMO TOTAL (no una matriz cruzada, confirmado en negocio/09) → una fila por
--    (fecha, tipo, clave). `cantidad` = cantidad de CAMIONES (o de vagones para tipo=vagones_playa),
--    NO toneladas — el reporte de SAGyP cuenta vehículos, no peso (la equivalencia ~28-30 tn/camión
--    es solo para display, no se persiste). Dato público (decisión de Lautaro 22/07, como la DJVE):
--    RLS con SELECT abierto a anon, sin policy de escritura (solo service_role, que bypassea RLS).
create table if not exists public.camiones (
  fecha      date not null,
  tipo       text not null check (tipo in ('zona', 'producto', 'total', 'vagones_playa')),
  clave      text not null default '',
  cantidad   numeric not null,
  fuente     text not null default 'SAGYP',
  creado_en  timestamptz not null default now(),
  primary key (fecha, tipo, clave),
  constraint camiones_clave_valida check (
    (tipo = 'zona' and clave in ('ROSARIO_ALEDANOS', 'DARSENA_BSAS_ER', 'NECOCHEA', 'BAHIA_BLANCA'))
    or (tipo = 'producto' and clave in ('WHEAT', 'MAIZE', 'SORGHUM', 'BARLEY', 'SBS', 'SFSEED'))
    or (tipo in ('total', 'vagones_playa') and clave = '')
  )
);

comment on table public.camiones is
  'Entrada diaria de camiones a puertos/fábricas/molinos — SAGyP (diario) + backfill Williams Entregas 2018-2026. '
  'zona/producto son dos aperturas del mismo total (sin matriz cruzada); total/vagones_playa tienen clave=''''. '
  'cantidad = CANTIDAD DE CAMIONES (o de vagones), no toneladas.';

alter table public.camiones enable row level security;

create policy "anon_select_camiones" on public.camiones for select to anon using (true);
grant select on public.camiones to anon, authenticated;
-- Sin policy de insert/update para anon/authenticated: solo escribe la service key (bypassa RLS
-- por rol, mismo patrón que djve/pizarra_historico/cbot_cierres).

create index if not exists camiones_fecha_idx on public.camiones (fecha);

-- 2) Matviews de la pata "line-up" de la señal barcos-vs-camiones (negocio/09 FASE 2). NO son
--    lectura anon (a diferencia de camiones): la señal es research de mesa (decisión de Lautaro
--    22/07 vía negocio/09 pregunta 1 — datos crudos públicos, lectura direccional solo mesa). La
--    página gatea con requireAdmin(); src/lib/supabase.ts ya prefiere la service key server-side
--    cuando está configurada (patrón temperatura.ts), así que no hace falta grant a anon/authenticated.

-- 2a) Densidad NACIONAL solo puertos argentinos (excluye NUEVA PALMIRA/MONTEVIDEO, transbordo
--     PY/UY — lineup_densidad_hist NO los excluye, ~6% del tonelaje según negocio/09). Misma
--     definición que lineup_densidad_hist (ETB en ventana [fecha, fecha+30], ops=LOAD, es_agro),
--     solo se agrega el filtro de puerto.
drop materialized view if exists public.lineup_densidad_ar_hist cascade;
create materialized view public.lineup_densidad_ar_hist as
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
  and l.port not in ('NUEVA PALMIRA', 'MONTEVIDEO')
  and (case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end)
      = any (array['SBS','SBM','SBO','MAIZE','WHEAT','BARLEY','SORGHUM','SFSEED','SFMP','SFO'])
group by l.fecha_consulta,
         case when l.cargo = 'SHULLS' then 'SBM' else l.cargo end;

create unique index if not exists lineup_densidad_ar_hist_pk on public.lineup_densidad_ar_hist (cod, fecha);
grant select on public.lineup_densidad_ar_hist to service_role;

-- 2b) Densidad por ZONA (todos los productos juntos — el reporte de camiones no abre por zona×
--     producto, así que del lado line-up tampoco tiene sentido abrir por producto acá). Solo las 2
--     zonas de v1 (negocio/09 FASE 3: Gran Rosario = SAN LORENZO+ROSARIO combinados — camiones no
--     distingue Norte/Sur — y Bahía Blanca directo; Dársena y Necochea quedan fuera, frontera
--     ambigua / fuera de alcance v1).
drop materialized view if exists public.lineup_densidad_zona_hist cascade;
create materialized view public.lineup_densidad_zona_hist as
select
  l.fecha_consulta as fecha,
  case
    when l.port in ('SAN LORENZO', 'ROSARIO') then 'GRAN_ROSARIO'
    when l.port = 'BAHIA BLANCA' then 'BAHIA_BLANCA'
  end as zona,
  sum(l.quantity)::double precision as densidad_tn,
  count(*)::int as n_buques
from public.lineup l
where l.ops = 'LOAD'
  and l.es_agro
  and l.etb is not null
  and l.etb >= l.fecha_consulta
  and l.etb <= l.fecha_consulta + 30
  and l.port in ('SAN LORENZO', 'ROSARIO', 'BAHIA BLANCA')
group by l.fecha_consulta, 2;

create unique index if not exists lineup_densidad_zona_hist_pk on public.lineup_densidad_zona_hist (zona, fecha);
grant select on public.lineup_densidad_zona_hist to service_role;

-- 3) Extender refresh_lineup_visitas() (la RPC que scripts/ingest-lineup.mjs llama al final de cada
--    ingesta) para mantener frescas las 2 matviews nuevas. Redefinición COMPLETA a partir de
--    pg_get_functiondef de la versión viva (E5 fase 2, 6 matviews) + los 2 refresh nuevos — repetir
--    el SET search_path/statement_timeout explícito, CREATE OR REPLACE no hereda lo que se seteó
--    con ALTER FUNCTION por fuera del cuerpo.
create or replace function public.refresh_lineup_visitas()
returns void
language sql
security definer
set search_path to 'public'
set statement_timeout to '300s'
as $function$
  refresh materialized view public.lineup_visitas;
  refresh materialized view public.lineup_densidad_hist;
  refresh materialized view public.lineup_densidad_ar_hist;
  refresh materialized view public.lineup_densidad_zona_hist;
  refresh materialized view public.lineup_gap_hist;
  refresh materialized view public.djve_cobertura;
  refresh materialized view public.djve_embarques_mes;
  refresh materialized view public.lineup_estacional;
$function$;
