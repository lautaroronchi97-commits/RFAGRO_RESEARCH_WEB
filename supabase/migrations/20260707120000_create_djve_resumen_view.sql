-- Vista de resumen de DJVE por producto para la web RF AGRO.
-- Aplicada al proyecto Supabase `lineup-argentina` (gbpfgfeksqmzmsxnxiwg).
--
-- security_invoker = true → la vista respeta el RLS de la tabla base `djve`
-- (que ya tiene policy de SELECT para el rol anónimo), sin exponer nada de más.
-- grant select ... to anon → la web la lee con la clave publishable (solo lectura).

create or replace view public.djve_resumen
with (security_invoker = true) as
select
  producto,
  max(anio)                                                                   as ult_anio,
  round(sum(toneladas) filter (where anio = date_part('year', current_date))) as ton_anio,
  round(sum(toneladas) filter (where fecha_registro >= current_date - 30))    as ton_30d,
  round(sum(toneladas) filter (where fecha_registro >= current_date - 7))     as ton_7d,
  count(*) filter (where fecha_registro >= current_date - 7)                  as n_7d,
  max(fecha_registro)                                                         as ult_registro,
  max(actualizado_en)                                                         as actualizado_en
from public.djve
where producto is not null
group by producto;

comment on view public.djve_resumen is
  'Resumen DJVE por producto para la web RF AGRO: acumulado del anio en curso + ventanas 7/30 dias. security_invoker respeta el RLS de djve; lectura anon.';

grant select on public.djve_resumen to anon;
