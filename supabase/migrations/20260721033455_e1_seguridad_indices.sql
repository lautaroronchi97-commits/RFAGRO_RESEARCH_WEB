-- E1 fase 2 (auditoría de datos): seguridad + índices + search_path.
-- Aplicada a la base viva el 21/07/2026 vía MCP (apply_migration). Ver docs/auditoria/E1-datos.md.

-- #1: ingest_cierres_cem hace INSERT en futuros_cierres + HTTP saliente (extensions.http_get) y era
-- ejecutable por anon/authenticated vía /rest/v1/rpc. El cron la usa con service_role (conserva EXECUTE).
revoke execute on function public.ingest_cierres_cem(text, date, date) from anon, authenticated;

-- #6: fijar search_path de campana_ini_year (era la única función del proyecto sin él).
alter function public.campana_ini_year(text, date) set search_path = public;

-- #7: FK profiles.approved_by sin índice de cobertura.
create index if not exists profiles_approved_by_idx on public.profiles (approved_by);

-- #7: índice nunca usado sobre lineup (~509k filas), sin lecturas registradas.
drop index if exists public.idx_lineup_port;
