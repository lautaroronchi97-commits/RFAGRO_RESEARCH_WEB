-- ROFO AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- C13 (docs/auditoria/E7-sintesis.md §4 / PROMPT P9 de PLAN_BACKLOG.md): sintéticos LECAP + dólar
-- futuro con TIR. El precio diario de cada letra ya lo trae data912 (src/lib/market/lecaps.ts); lo
-- que faltaba es el "pago final" (importe a pagar al vencimiento), que se fija en la emisión de la
-- letra y NO cambia día a día — solo cuando el Tesoro emite letras nuevas (cada 1-2 meses).
--
-- Fuente: BYMA es la fuente última (verificado: los "Pago Final" del Excel de Lautaro coinciden 1:1
-- con lo que publica BYMA — S31L6 117,677 / S14G6 108,03 / S31G6 127,064). Pero BYMA no expone un
-- endpoint público parseable con ese importe, e IAMC (informeslecap) es un PDF diario frágil. Como el
-- dato casi no cambia, se carga SEMI-MANUAL por /admin/datos (mismo patrón que DEA-SAGyP y
-- camiones/Williams). Tabla chica, sin cron.
--
-- Pública (SELECT anon), igual que compras_bcra/camiones/djve: es dato de emisión de deuda soberana,
-- sin nada sensible de mesa. Se lee server-side desde el panel Sintéticos de /dolar.

create table if not exists public.lecap_pago_final (
  ticker            text primary key,
  pago_final        numeric not null check (pago_final > 0),
  fecha_vencimiento date,
  actualizado_en    timestamptz not null default now()
);

comment on table public.lecap_pago_final is
  'Pago final (importe al vencimiento, VN 100) por letra del Tesoro (LECAP/BONCAP). Fuente última BYMA; carga semi-manual en /admin/datos (C13, casi estático). Alimenta el panel Sintéticos de /dolar.';

alter table public.lecap_pago_final enable row level security;

drop policy if exists "anon_select_lecap_pago_final" on public.lecap_pago_final;
create policy "anon_select_lecap_pago_final" on public.lecap_pago_final
  for select to anon using (true);

grant select on public.lecap_pago_final to anon, authenticated;

-- Escritura por RPC con guard is_admin() (sin service key en la web), mismo patrón que
-- admin_upsert_estimaciones (20260722180000): upsert por lote de filas ya parseadas en el server action.
create or replace function public.admin_upsert_lecap_pago_final(filas jsonb)
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
    insert into public.lecap_pago_final (ticker, pago_final, fecha_vencimiento, actualizado_en)
    select
      upper(f->>'ticker'),
      (f->>'pago_final')::numeric,
      nullif(f->>'fecha_vencimiento', '')::date,
      now()
    from jsonb_array_elements(filas) as f
    where coalesce(f->>'ticker', '') <> '' and (f->>'pago_final')::numeric > 0
    on conflict (ticker) do update
      set pago_final = excluded.pago_final,
          fecha_vencimiento = coalesce(excluded.fecha_vencimiento, public.lecap_pago_final.fecha_vencimiento),
          actualizado_en = now()
    returning 1
  )
  select count(*) into n from ins;

  return n;
end;
$$;

revoke all on function public.admin_upsert_lecap_pago_final(jsonb) from public, anon;
grant execute on function public.admin_upsert_lecap_pago_final(jsonb) to authenticated;

-- Seed: SOLO los valores verificados contra el Excel de Lautaro (no se siembra nada de terceros).
-- El resto los carga él por /admin/datos. Deja el panel funcionando de entrada (JUL26 + AGO26).
insert into public.lecap_pago_final (ticker, pago_final, fecha_vencimiento) values
  ('S31L6', 117.677, '2026-07-31'),
  ('S14G6', 108.030, '2026-08-14'),
  ('S31G6', 127.064, '2026-08-31')
on conflict (ticker) do nothing;
