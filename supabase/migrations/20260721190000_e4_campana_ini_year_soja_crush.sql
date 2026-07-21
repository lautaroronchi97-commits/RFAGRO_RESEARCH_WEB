-- Auditoria E4, hallazgo #3: lineup/campanas.ts (TS) incluye SOJA_CRUSH en el grupo de
-- soja (mes 4) pero la funcion SQL no lo tenia (caia al else, anio calendario sin ajuste
-- estacional). Sin efecto hoy (SOJA_CRUSH es sintetico, solo TS, nunca se pasa como cod a
-- esta funcion) pero es la trampa exacta que produce un bug silencioso si una vista futura
-- lo usa. Se agrega para que los dos lados queden exhaustivamente iguales. Se re-fija
-- ademas el search_path (ya lo tenia por el fix de E1; CREATE OR REPLACE lo vuelve a dejar
-- explicito por las dudas).
create or replace function public.campana_ini_year(cod text, f date)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when cod in ('SBS','SBM','SBO','SHULLS','NSBO','LECITHIN','SOJA_CRUSH') then case when extract(month from f)>=4 then extract(year from f)::int else extract(year from f)::int-1 end
    when cod in ('MAIZE','SORGHUM','CORN GLTN')                then case when extract(month from f)>=3 then extract(year from f)::int else extract(year from f)::int-1 end
    when cod in ('WHEAT','BARLEY','MALT','WBP')                then case when extract(month from f)>=12 then extract(year from f)::int else extract(year from f)::int-1 end
    when cod in ('SFSEED','SFO','SFMP')                        then case when extract(month from f)>=2 then extract(year from f)::int else extract(year from f)::int-1 end
    else extract(year from f)::int end
$$;
