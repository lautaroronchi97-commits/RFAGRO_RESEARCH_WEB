-- ROFO AGRO · proyecto Supabase lineup-argentina (gbpfgfeksqmzmsxnxiwg)
-- C4 (docs/auditoria/E7-sintesis.md §4 / PROMPT P3 de PLAN_BACKLOG.md): compras netas del BCRA
-- en el MULC, ahora con ingesta automática (API v4 var 78) + el panel cambiario público en /dolar.
--
-- `compras_bcra` se creó en 20260722120000 (MP1) SOLO-ADMIN, porque en ese momento su único
-- consumo era el insumo del informe diario interno (carga manual del "color de la rueda"). El
-- research de P3 (decisión de Lautaro, 22/07) definió que el dato final SÍ se muestra en el panel
-- cambiario público (/dolar, gateado por sección "dolar", NO por requireAdmin — a diferencia de
-- /comercio/*): es estadística oficial del BCRA, sin nada sensible de mesa (a diferencia de
-- `mesa_color`, que sigue admin-only). Mismo criterio ya aplicado a `camiones` (C5, 23/07): dato
-- oficial/de fuente pública → SELECT abierto a anon, igual que la DJVE.

drop policy if exists "anon_select_compras_bcra" on public.compras_bcra;
create policy "anon_select_compras_bcra" on public.compras_bcra
  for select to anon using (true);

grant select on public.compras_bcra to anon;

comment on table public.compras_bcra is
  'Compras netas de divisas del BCRA por día (M USD). Automático (BCRA API v4 var 78, fuente=api, ~3-4 días hábiles de rezago) + carga manual del día en /admin/datos (fuente=manual, se pisa sola cuando llega la oficial). Público desde C4 (panel cambiario en /dolar) — SELECT abierto a anon.';
