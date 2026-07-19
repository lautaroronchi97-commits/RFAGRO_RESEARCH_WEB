-- Fase 4 — mantener frescas las series del índice MESA tras cada ingesta de line-up.
--
-- Extiende refresh_lineup_visitas() (la RPC que ya llama scripts/ingest-lineup.mjs al final de cada
-- ingesta) para refrescar también las 2 matviews de demanda, EN ORDEN DE DEPENDENCIA:
--   1. lineup_visitas       (dedup de visitas físicas — Fases 2-3)
--   2. lineup_densidad_hist (C2, depende de lineup)
--   3. lineup_gap_hist      (C1, depende de lineup + lineup_densidad_hist en el full join)
--
-- No hace falta tocar ingest-lineup.mjs: sigue llamando refresh_lineup_visitas. La frescura de la DJVE
-- entra en el gap en la próxima ingesta de line-up (ambas se actualizan a diario).

create or replace function public.refresh_lineup_visitas()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  refresh materialized view public.lineup_visitas;
  refresh materialized view public.lineup_densidad_hist;
  refresh materialized view public.lineup_gap_hist;
$function$;
