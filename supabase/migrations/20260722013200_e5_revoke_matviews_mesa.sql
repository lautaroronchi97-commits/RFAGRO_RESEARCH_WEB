-- E5 fase 2 (Duda #5, opción (a) aprobada): las 7 matviews de mesa dejan de ser legibles por
-- anon/authenticated vía la API — las páginas /comercio/* y /granos/view pasan a leer con la
-- service key server-side (src/lib/supabase.ts, env SUPABASE_SERVICE_KEY).
--
-- ⚠️ NO APLICADA TODAVÍA — se aplica como paso del ENCENDIDO (GUIA_LOGIN_SETUP.md §0.4):
-- producción tiene que estar ya deployada con SUPABASE_SERVICE_KEY en Vercel ANTES de correr
-- esto, si no las páginas de mesa quedan vacías. Copy-paste en el SQL Editor de Supabase o
-- pedir a una sesión de Claude que la aplique por MCP.
revoke select on public.lineup_visitas       from anon, authenticated;
revoke select on public.lineup_gap_hist      from anon, authenticated;
revoke select on public.lineup_densidad_hist from anon, authenticated;
revoke select on public.lineup_estacional    from anon, authenticated;
revoke select on public.compras_avance_hist  from anon, authenticated;
revoke select on public.djve_cobertura       from anon, authenticated;
revoke select on public.djve_embarques_mes   from anon, authenticated;
