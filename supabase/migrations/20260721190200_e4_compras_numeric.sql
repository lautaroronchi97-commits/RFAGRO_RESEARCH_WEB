-- Auditoria E4, hallazgo #7 (marcado "Para E4" por la auditoria E1): compras.* guardaba
-- montos en double precision (float) mientras futuros_cierres/pizarra_historico/cbot_cierres/
-- djve usan numeric. El float fue la causa raiz de los parseos rotos (64099.99999999999 ->
-- 6.4e15) del 20/07. Migra los 9 campos de monto a numeric; no cambia ningun valor, solo el
-- tipo de columna. La matview compras_avance_hist depende de `toneladas` -> hay que
-- dropearla y recrearla idéntica (misma definicion, indice y grants) alrededor del ALTER.

drop materialized view public.compras_avance_hist;

alter table public.compras
  alter column toneladas type numeric using toneladas::numeric,
  alter column toneladas_a_fijar type numeric using toneladas_a_fijar::numeric,
  alter column precio_promedio_usd type numeric using precio_promedio_usd::numeric,
  alter column porcentaje_cosecha type numeric using porcentaje_cosecha::numeric,
  alter column semanal_tn type numeric using semanal_tn::numeric,
  alter column precio_hecho_tn type numeric using precio_hecho_tn::numeric,
  alter column fijado_tn type numeric using fijado_tn::numeric,
  alter column saldo_a_fijar_tn type numeric using saldo_a_fijar_tn::numeric,
  alter column djve_tn type numeric using djve_tn::numeric;

create materialized view public.compras_avance_hist as
WITH limpio AS (
         SELECT compras.codigo_interno AS cod,
            compras.sector,
            compras.campana,
            compras.fecha,
            min(compras.toneladas) OVER (PARTITION BY compras.codigo_interno, compras.sector, compras.campana ORDER BY compras.fecha ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING) AS comprado_clean,
            compras.semanal_tn
           FROM compras
          WHERE ((compras.fuente IS DISTINCT FROM 'LEGACY'::text) AND (compras.toneladas IS NOT NULL))
        ), sumado AS (
         SELECT limpio.cod,
            limpio.campana,
            limpio.fecha,
            sum(limpio.comprado_clean) AS comprado_tn,
            sum(limpio.semanal_tn) AS semanal_tn
           FROM limpio
          GROUP BY limpio.cod, limpio.campana, limpio.fecha
        ), prod AS (
         SELECT
                CASE z.grano
                    WHEN 'maiz'::text THEN 'MAIZE'::text
                    WHEN 'soja'::text THEN 'SBS'::text
                    WHEN 'trigo'::text THEN 'WHEAT'::text
                    ELSE NULL::text
                END AS cod,
            z.campania AS campana,
            (z.valor * '1000000'::numeric) AS produccion_tn
           FROM ( SELECT estimaciones_produccion.grano,
                    estimaciones_produccion.campania,
                    estimaciones_produccion.valor,
                    row_number() OVER (PARTITION BY estimaciones_produccion.grano, estimaciones_produccion.campania ORDER BY estimaciones_produccion.fecha_publicacion DESC) AS rn
                   FROM estimaciones_produccion
                  WHERE ((estimaciones_produccion.pais ~~* '%argent%'::text) AND (estimaciones_produccion.organismo = 'USDA'::text) AND (estimaciones_produccion.variable ~~* '%produc%'::text) AND (estimaciones_produccion.grano = ANY (ARRAY['maiz'::text, 'soja'::text, 'trigo'::text])))) z
          WHERE (z.rn = 1)
        )
 SELECT s.cod,
    s.fecha,
    s.campana,
    s.comprado_tn,
    s.semanal_tn,
    p.produccion_tn,
        CASE
            WHEN (p.produccion_tn > (0)::numeric) THEN (s.comprado_tn / (p.produccion_tn)::double precision)
            ELSE NULL::double precision
        END AS avance
   FROM (sumado s
     LEFT JOIN prod p ON (((p.cod = s.cod) AND (p.campana = s.campana))));

create index compras_avance_hist_cod_fecha_idx on public.compras_avance_hist using btree (cod, fecha);

-- Mismos grants que tenia antes del drop (anon/authenticated leen todo por diseño hoy —
-- decision de visibilidad diferida a E5, ver docs/auditoria/E1-datos.md hallazgo #2).
grant all on public.compras_avance_hist to anon;
grant all on public.compras_avance_hist to authenticated;
grant all on public.compras_avance_hist to service_role;
