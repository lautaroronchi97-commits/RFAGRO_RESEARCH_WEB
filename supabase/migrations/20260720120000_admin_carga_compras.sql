-- ROFO AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- Uploader admin de la serie de comercialización (tabla `compras`) + fix de seguridad.
--
-- Nota (auditoría E6, 21/07/2026): se aplicó por `execute_sql` (workaround del canal de aprobación
-- del MCP caído) con version real `20260720144443` — distinto al timestamp de este nombre de archivo.
--
-- Contexto: la serie semanal de compras (SIO Granos, export de Agrochat) se cargó una vez por
-- `scripts/cargar-compras.mjs` con la service key desde GitHub Actions. Para que Lautaro pueda
-- actualizarla él mismo desde /admin/datos SIN meter la service key en la web, la escritura va por
-- RPC SECURITY DEFINER con guard `is_admin()` (mismo patrón que las RPCs del panel admin en
-- 20260716180000_auth_admin_panel.sql): el cliente SSR anon con sesión de admin puede ejecutarlas;
-- cualquier otro recibe una excepción.

-- ============================================================================
-- 1. admin_upsert_compras(filas jsonb) → integer
--    Upsert por la clave lógica UNIQUE (campana, codigo_interno, sector, fecha).
--    `djve_tn` solo se pisa si viene no-null (el export de Agrochat no trae DJVE;
--    no hay que borrar lo que cargó el scraper de MAGyP).
-- ============================================================================
create or replace function public.admin_upsert_compras(filas jsonb)
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

  with entrada as (
    select * from jsonb_to_recordset(filas) as r(
      fecha date,
      grano_raw text,
      codigo_interno text,
      campana text,
      sector text,
      toneladas numeric,
      toneladas_a_fijar numeric,
      semanal_tn numeric,
      precio_hecho_tn numeric,
      fijado_tn numeric,
      saldo_a_fijar_tn numeric,
      djve_tn numeric,
      fuente text
    )
  ),
  ins as (
    insert into public.compras (
      fecha, grano_raw, codigo_interno, campana, sector,
      toneladas, toneladas_a_fijar, semanal_tn, precio_hecho_tn,
      fijado_tn, saldo_a_fijar_tn, djve_tn, fuente
    )
    select
      e.fecha, e.grano_raw, e.codigo_interno, e.campana, e.sector,
      e.toneladas, e.toneladas_a_fijar, e.semanal_tn, e.precio_hecho_tn,
      e.fijado_tn, e.saldo_a_fijar_tn, e.djve_tn, coalesce(e.fuente, 'AGROCHAT')
    from entrada e
    where e.fecha is not null and e.codigo_interno is not null
      and e.campana is not null and e.sector is not null
    on conflict (campana, codigo_interno, sector, fecha) do update set
      grano_raw = excluded.grano_raw,
      toneladas = excluded.toneladas,
      toneladas_a_fijar = excluded.toneladas_a_fijar,
      semanal_tn = excluded.semanal_tn,
      precio_hecho_tn = excluded.precio_hecho_tn,
      fijado_tn = excluded.fijado_tn,
      saldo_a_fijar_tn = excluded.saldo_a_fijar_tn,
      -- el export de Agrochat no trae DJVE → no pisar lo que cargó el scraper MAGyP
      djve_tn = coalesce(excluded.djve_tn, compras.djve_tn),
      fuente = excluded.fuente
    returning 1
  )
  select count(*) into n from ins;

  return n;
end;
$$;

revoke all on function public.admin_upsert_compras(jsonb) from public, anon;
grant execute on function public.admin_upsert_compras(jsonb) to authenticated;

-- ============================================================================
-- 2. admin_refresh_compras_avance() → void
--    Igual que refresh_compras_avance() (20260719238000) pero ejecutable por un
--    admin logueado (aquella tiene grant solo a service_role, para los scripts).
-- ============================================================================
create or replace function public.admin_refresh_compras_avance()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'solo admin';
  end if;
  refresh materialized view public.compras_avance_hist;
end;
$$;

revoke all on function public.admin_refresh_compras_avance() from public, anon;
grant execute on function public.admin_refresh_compras_avance() to authenticated;

-- ============================================================================
-- 3. Fix de seguridad: cerrar la escritura pública de `compras`.
--    Las policies de INSERT/UPDATE públicas venían heredadas de LineUps_Code
--    (cuando la tabla se escribía directo desde scripts con la anon key) y son
--    superficie de ataque: cualquiera con la anon key podía escribir. Hoy TODOS
--    los escritores usan la service key (ingest-compras.mjs, cargar-compras.mjs
--    — service_role saltea RLS) o las RPC de arriba, así que se dropean y se
--    revocan los privilegios de escritura. La lectura pública queda intacta
--    (la web lee con anon vía la policy de SELECT).
-- ============================================================================
drop policy if exists "compras escritura publica insert" on public.compras;
drop policy if exists "compras escritura publica update" on public.compras;
revoke insert, update, delete, truncate on public.compras from anon, authenticated;
