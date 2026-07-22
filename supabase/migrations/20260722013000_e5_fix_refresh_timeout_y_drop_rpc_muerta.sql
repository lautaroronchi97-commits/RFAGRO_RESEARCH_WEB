-- E5 fase 2 (hallazgos #3 y #4 de docs/auditoria/E5-infra.md).
-- APLICADA a la base viva el 22/07/2026 vía MCP apply_migration (version real puede diferir del
-- nombre de archivo — ver auditoría E6 hallazgo #8).

-- #3: la RPC creció a 6 matviews (E2 sumó djve_cobertura; E3 sumó djve_embarques_mes y
-- lineup_estacional) y el statement_timeout=8s del rol authenticator (por el que pasa TODO
-- PostgREST, incluso con service key) la cancelaba (57014) → ingest-lineup rojo 6/6.
-- El SET por-función rige durante la ejecución y pisa el del rol. Refresh medido: ~29 s.
alter function public.refresh_lineup_visitas() set statement_timeout = '300s';

-- #4: SECURITY DEFINER con INSERT+HTTP saliente, ejecutable por anon vía el grant implícito a
-- PUBLIC (el revoke de E1 a anon/authenticated no alcanzaba — lección: revocar también PUBLIC)
-- y además rota por dentro (extensions.http_get no existe). Nadie la usa: el cron de cierres
-- upsertea directo por PostgREST.
drop function if exists public.ingest_cierres_cem(text, date, date);
