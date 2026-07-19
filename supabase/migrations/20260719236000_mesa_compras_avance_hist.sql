-- Fase 4 — pata de OFERTA (farmer selling / C3) del índice de temperatura MESA.
--
-- Serie histórica del AVANCE DE VENTAS del productor por producto:
--     avance = compras_acumuladas(producto, semana)  ÷  producción_estimada(campaña)
-- comparado luego (en estacional.ts) contra la misma semana-de-campaña de años previos → percentil.
-- Menos avance del normal = más retención = más "calor" (mesa_calor.indice_calor lo invierte).
--
-- Decisión de negocio (Lautaro, "juntemos todo"): el numerador SUMA los dos sectores
-- (Exportador + Industria) — todo lo que el productor le vendió al comercio, sin separar.
--
-- Fuente numerador: tabla `compras` (serie semanal de Agrochat, fuente='AGROCHAT').
-- Fuente denominador: `estimaciones_produccion` — USDA Argentina (único organismo con las 8 campañas
--   19/20→26/27 completas para soja/maíz/trigo), último vintage por campaña, Mt → toneladas.
--
-- Limpieza defensiva del acumulado: la fuente MAGyP/SIO trae spikes puntuales que revierten (ej. un
-- trigo/Industria/19/20 marcó 49,9 Mt una semana y volvió a 4,99 Mt). Como el "Total Comprado" es
-- acumulado (no puede decrecer), se fuerza monótono no-decreciente con el MÍNIMO de derecha a izquierda
-- (min sobre la ventana [fila actual → fin]): cada spike queda clampeado al piso futuro. Conservador
-- (nunca sobreestima) y preserva los totales finales, que ya verificamos sensatos vs producción.

create materialized view public.compras_avance_hist as
with limpio as (
  -- acumulado monótono no-decreciente por (producto, sector, campaña)
  select
    codigo_interno as cod,
    sector,
    campana,
    fecha,
    min(toneladas) over (
      partition by codigo_interno, sector, campana
      order by fecha
      rows between current row and unbounded following
    ) as comprado_clean
  from public.compras
  where fuente = 'AGROCHAT' and toneladas is not null
),
sumado as (
  -- "juntemos todo": suma de sectores por (producto, campaña, fecha)
  select cod, campana, fecha, sum(comprado_clean) as comprado_tn
  from limpio
  group by cod, campana, fecha
),
prod as (
  -- producción USDA Argentina, último vintage por (grano, campaña), en toneladas
  select
    case grano when 'maiz' then 'MAIZE' when 'soja' then 'SBS' when 'trigo' then 'WHEAT' end as cod,
    campania as campana,
    valor * 1e6 as produccion_tn
  from (
    select grano, campania, valor,
           row_number() over (partition by grano, campania order by fecha_publicacion desc) rn
    from public.estimaciones_produccion
    where pais ilike '%argent%' and organismo = 'USDA' and variable ilike '%produc%'
      and grano in ('maiz', 'soja', 'trigo')
  ) z
  where rn = 1
)
select
  s.cod,
  s.fecha,
  s.campana,
  s.comprado_tn,
  p.produccion_tn,
  case when p.produccion_tn > 0 then s.comprado_tn / p.produccion_tn end as avance
from sumado s
left join prod p on p.cod = s.cod and p.campana = s.campana;

create index compras_avance_hist_cod_fecha_idx on public.compras_avance_hist (cod, fecha);

-- Frescura: se refresca en la misma cadena que las otras series MESA (corre a diario con la ingesta de
-- line-up). No depende de las matviews de line-up, así que el orden no importa.
create or replace function public.refresh_lineup_visitas()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  refresh materialized view public.lineup_visitas;
  refresh materialized view public.lineup_densidad_hist;
  refresh materialized view public.lineup_gap_hist;
  refresh materialized view public.compras_avance_hist;
$function$;

-- Lectura anón (RLS): las matviews no tienen RLS; el acceso lo da el grant al rol anon como el resto.
grant select on public.compras_avance_hist to anon;
