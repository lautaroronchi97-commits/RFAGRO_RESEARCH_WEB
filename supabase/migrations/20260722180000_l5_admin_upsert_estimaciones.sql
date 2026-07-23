-- RF AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- Lote L5 (docs/auditoria/E7-sintesis.md §6): DEA-SAGyP destrabar la fuente.
--
-- `datosestimaciones.magyp.gob.ar` bloquea las IPs de datacenter (GitHub Actions, la Edge
-- Function `dea-fetch` en São Paulo y un sandbox de Claude Code — 3 proveedores distintos,
-- mismo bloqueo TLS). La copia CKAN (`datos.magyp.gob.ar`) está un año entera atrás (sin la
-- campaña vigente) — no sirve de reemplazo. Decisión de Lautaro: carga SEMI-MANUAL — él baja
-- el CSV oficial desde su navegador (su IP no está bloqueada) y lo sube por `/admin/datos`.
--
-- Esta RPC es la vía de escritura de esa carga (mismo patrón que `admin_upsert_compras` de
-- 20260720120000): guard is_admin() adentro, upsert por lote de filas ya parseadas en el
-- server action (que reusa `src/lib/parse-dea.ts`, el mismo parser del cron).

create or replace function public.admin_upsert_estimaciones(filas jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  n integer;
begin
  if not public.is_admin() then
    raise exception 'solo admin';
  end if;

  with ins as (
    insert into public.estimaciones_produccion
      (organismo, pais, grano, campania, variable, valor, unidad, fecha_publicacion, informe, url, actualizado_en)
    select
      f->>'organismo',
      f->>'pais',
      f->>'grano',
      f->>'campania',
      f->>'variable',
      (f->>'valor')::numeric,
      f->>'unidad',
      (f->>'fecha_publicacion')::date,
      f->>'informe',
      f->>'url',
      now()
    from jsonb_array_elements(filas) as f
    on conflict (organismo, pais, grano, campania, variable, fecha_publicacion) do update
      set valor = excluded.valor,
          unidad = excluded.unidad,
          informe = excluded.informe,
          url = excluded.url,
          actualizado_en = now()
    returning 1
  )
  select count(*) into n from ins;

  return n;
end;
$$;

revoke all on function public.admin_upsert_estimaciones(jsonb) from public, anon;
grant execute on function public.admin_upsert_estimaciones(jsonb) to authenticated;
