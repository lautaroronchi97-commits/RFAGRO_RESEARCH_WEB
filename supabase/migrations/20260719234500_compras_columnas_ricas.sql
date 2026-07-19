-- Compras (farmer selling) — columnas ricas para el snapshot semanal completo.
--
-- La tabla `compras` guardaba sólo `toneladas` (Total Comprado acumulado) y `toneladas_a_fijar`,
-- pero la fuente primaria MAGyP "Compras y DJVE de Granos" —y el export de Agrochat/BCBA, que sale de
-- la MISMA base SIO-Granos— publican, por grano × sector × campaña × semana, la foto completa de
-- comercialización:
--     Semanal · Total Comprado · Precio Hecho · A Fijar · Fijado · Saldo a Fijar · DJVE.
--
-- Estas columnas habilitan:
--   (a) la pata de FARMER SELLING (C3) del índice de temperatura MESA
--       (avance = Total Comprado acumulado / producción estimada → percentil estacional);
--   (b) el ítem 8 del backlog (total negociado / priceado: precio hecho / a fijar / fijado).
--
-- Todas nullable y aditivas: no rompen las 715 filas viejas ni el upsert del scraper actual
-- (clave única sigue siendo campana, codigo_interno, sector, fecha).

alter table public.compras
  add column if not exists semanal_tn       double precision,  -- compras de la semana (flujo)
  add column if not exists precio_hecho_tn  double precision,  -- comprado con precio hecho (acumulado)
  add column if not exists fijado_tn        double precision,  -- toneladas fijadas (acumulado)
  add column if not exists saldo_a_fijar_tn double precision,  -- saldo pendiente de fijar (acumulado)
  add column if not exists djve_tn          double precision,  -- DJVE del mismo informe (contexto)
  add column if not exists fuente           text;              -- 'MAGYP' | 'AGROCHAT' | 'LEGACY'

comment on column public.compras.toneladas         is 'Total Comprado acumulado de la campaña (tn).';
comment on column public.compras.toneladas_a_fijar is 'Total a Fijar acumulado (tn).';
comment on column public.compras.semanal_tn        is 'Compras de la semana (flujo, tn).';
comment on column public.compras.precio_hecho_tn   is 'Total con Precio Hecho acumulado (tn).';
comment on column public.compras.fijado_tn         is 'Total Fijado acumulado (tn).';
comment on column public.compras.saldo_a_fijar_tn  is 'Saldo a Fijar (tn).';
comment on column public.compras.djve_tn           is 'DJVE del informe (tn, contexto).';
comment on column public.compras.fuente            is 'Origen del snapshot: MAGYP (scraper) / AGROCHAT (carga manual) / LEGACY (dato viejo, semántica diaria a reemplazar).';

-- Marca las filas viejas (flujo diario del scraper muerto) para poder reemplazarlas sin ambigüedad
-- cuando entre la serie semanal buena.
update public.compras set fuente = 'LEGACY' where fuente is null;
